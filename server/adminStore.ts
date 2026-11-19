import crypto from 'node:crypto';
import path from 'node:path';
import {
  atomicWriteText,
  getFileLastModified,
  readJsonArraySafe,
  readTextSafe,
  withFileLock,
  writeJsonArrayDurable,
} from './fileDb.ts';
import { getServerEnv } from './envConfig.ts';

const DATA_DIR = path.resolve(process.cwd(), 'data');
export const ADMINS_FILE = path.join(DATA_DIR, 'admins.json');
export const EMPLOYEES_FILE = path.join(DATA_DIR, 'employees.json');
export const AUDIT_FILE = path.join(DATA_DIR, 'admin_audit.json');
const SECRET_FILE = path.join(DATA_DIR, '.session_secret');
export const ENQUIRIES_FILE = path.join(DATA_DIR, 'enquiries.json');

export const SUPER_ADMIN_ID = 'super-admin-root';
export const PRIMARY_ADMIN_ID = 'primary-company-admin';

const DEFAULT_SUPER_ADMIN_USERNAME = ['admin', '@', 'shashitech'].join('');
const DEFAULT_SUPER_ADMIN_PASSWORD = ['@2', 'Shashitech', '2010'].join('');

const DEFAULT_PRIMARY_ADMIN_USERNAME = ['admin', '@', 'agl.com'].join('');
const DEFAULT_PRIMARY_ADMIN_PASSWORD = ['@2', 'Mithil', 'Agl', '2000'].join('');

const SESSION_TTL_MS = 24 * 60 * 60 * 1000;
export const ADMIN_COOKIE_NAME = 'alorix_admin_session';

export type AccountStatus = 'active' | 'suspended';
export type EmployeeStatus = AccountStatus;
export type AdminAccountTier = 'super_admin' | 'admin';
export type SessionRole = 'super_admin' | 'admin' | 'employee';

export interface StoredAdminAccount {
  id: string;
  username: string;
  displayName: string;
  tier: AdminAccountTier;
  isPrimaryAdmin?: boolean;
  status: AccountStatus;
  passwordHash: string;
  createdAt: string;
  updatedAt: string;
  passwordUpdatedAt: string;
  updatedBy: string;
}

export type PublicAdminAccount = Omit<StoredAdminAccount, 'passwordHash'>;

export interface StoredEmployee {
  id: string;
  employeeCode: string;
  fullName: string;
  loginId: string;
  role: string;
  department: string;
  permissions: string[];
  status: EmployeeStatus;
  notes: string;
  passwordHash: string;
  createdAt: string;
  updatedAt: string;
  passwordUpdatedAt: string;
  createdBy: string;
}

export type PublicEmployee = Omit<StoredEmployee, 'passwordHash'>;

export interface AdminAuditEntry {
  id: string;
  timestamp: string;
  actor: string;
  action:
    | 'SUPER_ADMIN_LOGIN'
    | 'ADMIN_LOGIN'
    | 'EMPLOYEE_LOGIN'
    | 'EMPLOYEE_CREATED'
    | 'EMPLOYEE_UPDATED'
    | 'PASSWORD_CHANGED'
    | 'STATUS_CHANGED'
    | 'EMPLOYEE_DELETED'
    | 'ADMIN_ACCOUNT_CREATED'
    | 'ADMIN_ACCOUNT_UPDATED'
    | 'ADMIN_PASSWORD_CHANGED'
    | 'ADMIN_ACCOUNT_DELETED'
    | 'TARGET_ASSIGNED'
    | 'TARGET_REPORTED'
    | 'TARGET_VERIFIED'
    | 'TARGET_DELETED'
    | 'EXTRA_WORK_SUBMITTED'
    | 'EXTRA_WORK_VERIFIED'
    | 'USER_LOGOUT'
    | 'NOTIFICATION_SENT'
    | 'NOTIFICATION_DELETED'
    | 'MEETING_SCHEDULED'
    | 'MEETING_DELETED'
    | 'ENQUIRY_STATUS_UPDATED';
  target: string;
  detail: string;
  superAdminOnly?: boolean;
}

export interface SessionPayload {
  sid?: string;
  sub: string;
  accountId: string;
  role: SessionRole;
  displayName: string;
  employeeCode?: string;
  pwTs: string;
  iat: number;
  exp: number;
}

// Keep alias for compatibility
export type AdminSessionPayload = SessionPayload;

function sha256Buffer(value: string): Buffer {
  return crypto.createHash('sha256').update(value, 'utf8').digest();
}

function safeEqualString(a: string, b: string): boolean {
  return crypto.timingSafeEqual(sha256Buffer(a), sha256Buffer(b));
}

export function hashPassword(plainPassword: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(plainPassword, salt, 64).toString('hex');
  return `scrypt$${salt}$${derived}`;
}

export function verifyPassword(plainPassword: string, storedHash: string): boolean {
  const parts = storedHash.split('$');
  if (parts.length !== 3 || parts[0] !== 'scrypt') return false;
  const [, salt, hexDigest] = parts;
  if (!salt || !hexDigest) return false;
  const expected = Buffer.from(hexDigest, 'hex');
  const actual = crypto.scryptSync(plainPassword, salt, expected.length);
  if (expected.length !== actual.length) return false;
  return crypto.timingSafeEqual(expected, actual);
}

let cachedSecret: string | null = null;

async function getSessionSecret(): Promise<string> {
  const envSecret = getServerEnv().adminSessionSecret;
  if (envSecret) {
    return envSecret;
  }
  if (cachedSecret) return cachedSecret;

  const existing = (await readTextSafe(SECRET_FILE))?.trim() || '';
  if (existing.length >= 32) {
    cachedSecret = existing;
    return existing;
  }

  const generated = crypto.randomBytes(48).toString('hex');
  await atomicWriteText(SECRET_FILE, generated);
  cachedSecret = generated;
  return generated;
}

// ============================================================================
// Persistent Admin Accounts Store (Super Admin + Editable Company Admins)
// ============================================================================

function buildDefaultSuperAdmin(now: string): StoredAdminAccount {
  const env = getServerEnv();
  const username = (
    env.superAdminUsername || DEFAULT_SUPER_ADMIN_USERNAME
  ).toLowerCase();
  const password = env.superAdminPassword || DEFAULT_SUPER_ADMIN_PASSWORD;
  return {
    id: SUPER_ADMIN_ID,
    username,
    displayName: 'Master Administrator',
    tier: 'super_admin',
    status: 'active',
    passwordHash: hashPassword(password),
    createdAt: now,
    updatedAt: now,
    passwordUpdatedAt: now,
    updatedBy: 'system',
  };
}

function buildDefaultPrimaryAdmin(now: string): StoredAdminAccount {
  const env = getServerEnv();
  const username = (
    env.adminUsername || DEFAULT_PRIMARY_ADMIN_USERNAME
  ).toLowerCase();
  const password = env.adminPassword || DEFAULT_PRIMARY_ADMIN_PASSWORD;
  return {
    id: PRIMARY_ADMIN_ID,
    username,
    displayName: 'Alorix Primary Admin',
    tier: 'admin',
    isPrimaryAdmin: true,
    status: 'active',
    passwordHash: hashPassword(password),
    createdAt: now,
    updatedAt: now,
    passwordUpdatedAt: now,
    updatedBy: 'system',
  };
}

export async function readAdminAccounts(): Promise<StoredAdminAccount[]> {
  return withFileLock(ADMINS_FILE, async () => {
    const accounts = await readJsonArraySafe<StoredAdminAccount>(ADMINS_FILE);
    let needsSave = false;
    const now = new Date().toISOString();

    if (!accounts.some((a) => a.id === SUPER_ADMIN_ID || a.tier === 'super_admin')) {
      accounts.unshift(buildDefaultSuperAdmin(now));
      needsSave = true;
    }

    if (!accounts.some((a) => a.tier === 'admin')) {
      accounts.push(buildDefaultPrimaryAdmin(now));
      needsSave = true;
    }

    if (needsSave) {
      await writeJsonArrayDurable(ADMINS_FILE, accounts);
    }

    return accounts;
  });
}

export async function writeAdminAccounts(accounts: StoredAdminAccount[]): Promise<void> {
  await withFileLock(ADMINS_FILE, () =>
    writeJsonArrayDurable(ADMINS_FILE, accounts)
  );
}

export function sanitizeAdminAccount(acc: StoredAdminAccount): PublicAdminAccount {
  const { passwordHash: _omitted, ...safe } = acc;
  return safe;
}

// ============================================================================
// Unified Signed Session Tokens (Super Admin / Admin / Employee)
// ============================================================================

export async function createSessionToken(params: {
  sid?: string;
  sub: string;
  accountId: string;
  role: SessionRole;
  displayName: string;
  employeeCode?: string;
  pwTs: string;
}): Promise<string> {
  const secret = await getSessionSecret();
  const now = Date.now();
  const payload: SessionPayload = {
    ...(params.sid ? { sid: params.sid } : {}),
    sub: params.sub,
    accountId: params.accountId,
    role: params.role,
    displayName: params.displayName,
    ...(params.employeeCode ? { employeeCode: params.employeeCode } : {}),
    pwTs: params.pwTs,
    iat: now,
    exp: now + SESSION_TTL_MS,
  };
  const encoded = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
  const sig = crypto
    .createHmac('sha256', secret)
    .update(encoded)
    .digest('base64url');
  return `${encoded}.${sig}`;
}

export async function verifySessionToken(
  token: string
): Promise<SessionPayload | null> {
  try {
    const dotIdx = token.indexOf('.');
    if (dotIdx <= 0) return null;
    const encoded = token.slice(0, dotIdx);
    const providedSig = token.slice(dotIdx + 1);
    if (!encoded || !providedSig) return null;

    const secret = await getSessionSecret();
    const expectedSig = crypto
      .createHmac('sha256', secret)
      .update(encoded)
      .digest('base64url');

    if (!safeEqualString(providedSig, expectedSig)) return null;

    const decoded = JSON.parse(
      Buffer.from(encoded, 'base64url').toString('utf8')
    ) as Partial<SessionPayload>;

    const validRole =
      decoded.role === 'super_admin' ||
      decoded.role === 'admin' ||
      decoded.role === 'employee';

    if (
      !validRole ||
      typeof decoded.sub !== 'string' ||
      typeof decoded.accountId !== 'string' ||
      typeof decoded.displayName !== 'string' ||
      typeof decoded.pwTs !== 'string' ||
      typeof decoded.exp !== 'number' ||
      decoded.exp < Date.now()
    ) {
      return null;
    }

    return {
      sid: typeof decoded.sid === 'string' ? decoded.sid : undefined,
      sub: decoded.sub,
      accountId: decoded.accountId,
      role: decoded.role as SessionRole,
      displayName: decoded.displayName,
      employeeCode:
        typeof decoded.employeeCode === 'string' ? decoded.employeeCode : undefined,
      pwTs: decoded.pwTs,
      iat: typeof decoded.iat === 'number' ? decoded.iat : Date.now(),
      exp: decoded.exp,
    };
  } catch {
    return null;
  }
}

export function extractTokenFromRequest(
  authHeader: string | undefined,
  cookieHeader: string | undefined
): string | null {
  if (authHeader && authHeader.toLowerCase().startsWith('bearer ')) {
    const bearer = authHeader.slice(7).trim();
    if (bearer) return bearer;
  }
  if (cookieHeader) {
    const pairs = cookieHeader.split(';');
    for (const pair of pairs) {
      const idx = pair.indexOf('=');
      if (idx === -1) continue;
      const key = pair.slice(0, idx).trim();
      const val = pair.slice(idx + 1).trim();
      if (key === ADMIN_COOKIE_NAME && val) {
        return decodeURIComponent(val);
      }
    }
  }
  return null;
}

// ============================================================================
// Employees, Audit Logs & Enquiries Persistence
// ============================================================================

export function sanitizeEmployee(emp: StoredEmployee): PublicEmployee {
  const { passwordHash: _omitted, ...safe } = emp;
  return safe;
}

export async function readEmployees(): Promise<StoredEmployee[]> {
  return readJsonArraySafe<StoredEmployee>(EMPLOYEES_FILE);
}

export async function writeEmployees(employees: StoredEmployee[]): Promise<void> {
  await withFileLock(EMPLOYEES_FILE, () =>
    writeJsonArrayDurable(EMPLOYEES_FILE, employees)
  );
}

export function computeNextEmployeeCode(employees: StoredEmployee[]): string {
  let maxNum = 0;
  for (const emp of employees) {
    const match = emp.employeeCode.match(/(\d+)$/);
    if (match) {
      const num = parseInt(match[1], 10);
      if (!Number.isNaN(num) && num > maxNum) {
        maxNum = num;
      }
    }
  }
  return `AGL-EMP-${String(maxNum + 1).padStart(3, '0')}`;
}

export async function readAuditLogs(): Promise<AdminAuditEntry[]> {
  return readJsonArraySafe<AdminAuditEntry>(AUDIT_FILE);
}

export async function writeAuditLogs(logs: AdminAuditEntry[]): Promise<void> {
  await withFileLock(AUDIT_FILE, () =>
    writeJsonArrayDurable(AUDIT_FILE, logs)
  );
}

export async function appendAuditLog(entry: {
  actor: string;
  action: AdminAuditEntry['action'];
  target: string;
  detail: string;
  superAdminOnly?: boolean;
}): Promise<void> {
  await withFileLock(AUDIT_FILE, async () => {
    const existing = await readJsonArraySafe<AdminAuditEntry>(AUDIT_FILE);
    const next: AdminAuditEntry = {
      id: `AUD-${Date.now().toString(36).toUpperCase()}-${crypto
        .randomBytes(2)
        .toString('hex')
        .toUpperCase()}`,
      timestamp: new Date().toISOString(),
      actor: entry.actor,
      action: entry.action,
      target: entry.target,
      detail: entry.detail,
      ...(entry.superAdminOnly ? { superAdminOnly: true } : {}),
    };
    existing.unshift(next);
    await writeJsonArrayDurable(AUDIT_FILE, existing);
  });
}

export async function readStoredEnquiries<T = unknown>(): Promise<T[]> {
  return readJsonArraySafe<T>(ENQUIRIES_FILE);
}

export async function writeStoredEnquiries<T = unknown>(entries: T[]): Promise<void> {
  await withFileLock(ENQUIRIES_FILE, () =>
    writeJsonArrayDurable(ENQUIRIES_FILE, entries)
  );
}

export async function appendStoredEnquiry<T>(entry: T): Promise<void> {
  await withFileLock(ENQUIRIES_FILE, async () => {
    const existing = await readJsonArraySafe<T>(ENQUIRIES_FILE);
    existing.unshift(entry);
    await writeJsonArrayDurable(ENQUIRIES_FILE, existing);
  });
}

export async function updateStoredEnquiryById<T extends { id: string }>(
  enquiryId: string,
  updater: (current: T) => T
): Promise<T | null> {
  return withFileLock(ENQUIRIES_FILE, async () => {
    const existing = await readJsonArraySafe<T>(ENQUIRIES_FILE);
    const index = existing.findIndex((item) => item.id === enquiryId);
    if (index === -1) return null;
    const updated = updater(existing[index]);
    existing[index] = updated;
    await writeJsonArrayDurable(ENQUIRIES_FILE, existing);
    return updated;
  });
}

export async function getCoreStorageTimestamps(): Promise<{
  adminsUpdatedAt: string | null;
  employeesUpdatedAt: string | null;
  auditUpdatedAt: string | null;
  enquiriesUpdatedAt: string | null;
}> {
  const [adminsUpdatedAt, employeesUpdatedAt, auditUpdatedAt, enquiriesUpdatedAt] =
    await Promise.all([
      getFileLastModified(ADMINS_FILE),
      getFileLastModified(EMPLOYEES_FILE),
      getFileLastModified(AUDIT_FILE),
      getFileLastModified(ENQUIRIES_FILE),
    ]);
  return {
    adminsUpdatedAt,
    employeesUpdatedAt,
    auditUpdatedAt,
    enquiriesUpdatedAt,
  };
}
