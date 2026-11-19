import 'dotenv/config';
import crypto from 'node:crypto';
import http from 'node:http';
import express, { type Request, type Response, type NextFunction } from 'express';
import { WebSocketServer, WebSocket } from 'ws';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getServerEnv } from './server/envConfig.ts';
import {
  ADMIN_COOKIE_NAME,
  SUPER_ADMIN_ID,
  appendAuditLog,
  appendStoredEnquiry,
  computeNextEmployeeCode,
  createSessionToken,
  extractTokenFromRequest,
  getCoreStorageTimestamps,
  hashPassword,
  readAdminAccounts,
  readAuditLogs,
  readEmployees,
  readStoredEnquiries,
  sanitizeAdminAccount,
  sanitizeEmployee,
  updateStoredEnquiryById,
  verifyPassword,
  verifySessionToken,
  writeAdminAccounts,
  writeAuditLogs,
  writeEmployees,
  writeStoredEnquiries,
  type AccountStatus,
  type AdminAuditEntry,
  type EmployeeStatus,
  type SessionPayload,
  type StoredAdminAccount,
  type StoredEmployee,
} from './server/adminStore.ts';
import {
  getTargetsStorageTimestamps,
  normalizeDriveLinks,
  readExtraWork,
  readWeeklyTargets,
  writeExtraWork,
  writeWeeklyTargets,
  type EmployeeCompletionStatus,
  type ExtraWorkVerificationStatus,
  type StoredExtraWork,
  type StoredWeeklyTarget,
  type TargetPriority,
  type TargetVerificationStatus,
} from './server/targetStore.ts';
import {
  createNotification,
  deleteNotificationById,
  getActivityStorageTimestamps,
  isNotificationTargetedToEmployee,
  markAllNotificationsReadForEmployee,
  markNotificationReadForEmployee,
  readNotifications,
  readSessionLogs,
  recordLoginSession,
  recordLogoutSession,
  writeNotifications,
  writeSessionLogs,
  type NotificationPriority,
  type NotificationTargetType,
  type StoredNotification,
  type StoredSessionLog,
} from './server/activityStore.ts';
import {
  COMPANY_GROUP_CHANNEL_ID,
  appendChatMessage,
  buildDmChannelId,
  createMeeting,
  deleteMeetingById,
  getCommunicationStorageTimestamps,
  isMeetingTargetedToEmployee,
  markChannelMessagesRead,
  parseDmParticipants,
  readChatMessages,
  readMeetings,
  updateMeetingById,
  writeChatMessages,
  writeMeetings,
  type MeetingTargetType,
  type StoredChatMessage,
  type StoredMeeting,
} from './server/communicationStore.ts';

const currentFilePath =
  typeof import.meta?.url === 'string' && import.meta.url
    ? fileURLToPath(import.meta.url)
    : '';
const currentDirPath = currentFilePath
  ? path.dirname(currentFilePath)
  : process.cwd();

const PORT = Number(process.env.PORT || 3000);

interface AuthenticatedRequest extends Request {
  session?: SessionPayload;
  adminAccount?: StoredAdminAccount;
  employeeAccount?: StoredEmployee;
}

interface EnquiryPayload {
  fullName?: string;
  companyName?: string;
  businessEmail?: string;
  phone?: string;
  country?: string;
  chemicalInterest?: string;
  packagingFormat?: string;
  incoterm?: string;
  message?: string;
}

interface StoredEnquiry {
  id: string;
  submittedAt: string;
  fullName: string;
  companyName: string;
  businessEmail: string;
  phone: string;
  country: string;
  chemicalInterest: string;
  packagingFormat: string;
  incoterm: string;
  message: string;
  deliveryChannel: string;
  solved?: boolean;
  solvedAt?: string | null;
  solvedBy?: string | null;
  solvedNote?: string;
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

async function persistEnquiry(entry: StoredEnquiry): Promise<void> {
  await appendStoredEnquiry(entry);
}

async function forwardExternalIfConfigured(entry: StoredEnquiry): Promise<string> {
  const env = getServerEnv();
  const webhookUrl = env.enquiryWebhookUrl;
  const resendKey = env.resendApiKey;
  const resendTo = env.enquiryToEmail;

  if (resendKey && resendTo) {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Alorix Global International <onboarding@resend.dev>',
        to: [resendTo],
        subject: `Business Enquiry [${entry.id}] — ${entry.companyName}`,
        text: [
          `Reference: ${entry.id}`,
          `Submitted: ${entry.submittedAt}`,
          `Name: ${entry.fullName}`,
          `Company: ${entry.companyName}`,
          `Email: ${entry.businessEmail}`,
          `Phone: ${entry.phone}`,
          `Country: ${entry.country}`,
          `Interest: ${entry.chemicalInterest}`,
          `Packaging Format: ${entry.packagingFormat}`,
          `Incoterm Preference: ${entry.incoterm}`,
          ``,
          `Message:`,
          entry.message,
        ].join('\n'),
      }),
    });
    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Email dispatch failed (${res.status}): ${errText}`);
    }
    return 'email_and_archive';
  }

  if (webhookUrl) {
    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(entry),
    });
    if (!res.ok) {
      throw new Error(`Webhook forwarding failed (${res.status})`);
    }
    return 'webhook_and_archive';
  }

  return 'server_archive';
}

// ============================================================================
// Live Session Verification & RBAC Middleware
// ============================================================================

async function resolveActiveSession(req: AuthenticatedRequest): Promise<boolean> {
  const token = extractTokenFromRequest(
    req.headers.authorization,
    req.headers.cookie
  );
  if (!token) return false;

  const payload = await verifySessionToken(token);
  if (!payload) return false;

  if (payload.role === 'super_admin' || payload.role === 'admin') {
    const admins = await readAdminAccounts();
    const account = admins.find((a) => a.id === payload.accountId);
    if (
      !account ||
      account.status !== 'active' ||
      account.tier !== payload.role ||
      account.username.toLowerCase() !== payload.sub.toLowerCase() ||
      account.passwordUpdatedAt !== payload.pwTs
    ) {
      return false;
    }
    req.session = {
      ...payload,
      sub: account.username,
      displayName: account.displayName,
    };
    req.adminAccount = account;
    return true;
  }

  if (payload.role === 'employee') {
    const employees = await readEmployees();
    const emp = employees.find((e) => e.id === payload.accountId);
    if (
      !emp ||
      emp.status !== 'active' ||
      emp.passwordUpdatedAt !== payload.pwTs
    ) {
      return false;
    }
    req.session = {
      ...payload,
      sub: emp.loginId,
      displayName: emp.fullName,
      employeeCode: emp.employeeCode,
    };
    req.employeeAccount = emp;
    return true;
  }

  return false;
}

async function requireAnyAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const ok = await resolveActiveSession(req);
  if (!ok || !req.session) {
    res.status(401).json({
      ok: false,
      error: 'Session expired or invalid. Please sign in again.',
    });
    return;
  }
  next();
}

async function requireAdmin(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const ok = await resolveActiveSession(req);
  if (!ok || !req.session) {
    res.status(401).json({
      ok: false,
      error: 'Administrator authentication required.',
    });
    return;
  }
  if (req.session.role !== 'admin' && req.session.role !== 'super_admin') {
    res.status(403).json({
      ok: false,
      error: 'Administrator privileges are required for this action.',
    });
    return;
  }
  next();
}

async function requireSuperAdmin(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const ok = await resolveActiveSession(req);
  if (!ok || !req.session) {
    res.status(401).json({
      ok: false,
      error: 'Master administrator authentication required.',
    });
    return;
  }
  if (req.session.role !== 'super_admin') {
    res.status(403).json({
      ok: false,
      error: 'Master administrator privileges are required for this action.',
    });
    return;
  }
  next();
}

function normalizePermissions(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const unique = new Set<string>();
  for (const item of raw) {
    const val = String(item || '').trim();
    if (val && val.length <= 48) {
      unique.add(val);
    }
  }
  return Array.from(unique).slice(0, 12);
}

function employeeCanViewEnquiries(emp: StoredEmployee): boolean {
  const lower = emp.permissions.map((p) => p.toLowerCase());
  return lower.some((p) => p.includes('enquir') || p.includes('order'));
}

export interface ConnectedPortalClient {
  ws: WebSocket;
  accountId: string;
  role: 'super_admin' | 'admin' | 'employee';
  displayName: string;
  department?: string;
  employeeCode?: string;
}

export function createPortalExpressApp() {
  const app = express();
  app.use(express.json({ limit: '512kb' }));

  // Support CORS when the static frontend is hosted on GitHub Pages
  // and connects to this Node backend via VITE_API_BASE_URL + CORS_ORIGIN
  const allowedOrigins = getServerEnv()
    .corsOrigin.split(',')
    .map((o) => o.trim())
    .filter(Boolean);

  if (allowedOrigins.length > 0) {
    app.use((req, res, next) => {
      const origin = req.headers.origin;
      if (
        origin &&
        (allowedOrigins.includes('*') || allowedOrigins.includes(origin))
      ) {
        res.setHeader('Access-Control-Allow-Origin', origin);
        res.setHeader('Vary', 'Origin');
        res.setHeader('Access-Control-Allow-Credentials', 'true');
        res.setHeader(
          'Access-Control-Allow-Headers',
          'Content-Type, Authorization'
        );
        res.setHeader(
          'Access-Control-Allow-Methods',
          'GET, POST, PUT, PATCH, DELETE, OPTIONS'
        );
      }
      if (req.method === 'OPTIONS') {
        res.status(204).end();
        return;
      }
      next();
    });
  }

  // Ensure default admin accounts are seeded once on boot
  let adminSeedPromise: Promise<unknown> | null = null;
  app.use(async (_req, _res, next) => {
    try {
      if (!adminSeedPromise) {
        adminSeedPromise = readAdminAccounts().catch((err) => {
          adminSeedPromise = null;
          throw err;
        });
      }
      await adminSeedPromise;
    } catch {
      // Allow downstream routes to report storage errors gracefully
    }
    next();
  });

  // =========================================================================
  // Real-Time WebSocket Client Registry & Event Broadcaster
  // =========================================================================
  const connectedClients = new Set<ConnectedPortalClient>();

  function getOnlineAccountIds(): string[] {
    const ids = new Set<string>();
    for (const c of connectedClients) {
      if (c.ws.readyState === WebSocket.OPEN) {
        ids.add(c.accountId);
      }
    }
    return Array.from(ids);
  }

  function broadcastPortalEvent(
    event: string,
    payload: unknown,
    filter?: (client: ConnectedPortalClient) => boolean
  ): void {
    const wire = JSON.stringify({ event, payload });
    for (const client of connectedClients) {
      if (client.ws.readyState !== WebSocket.OPEN) continue;
      if (filter && !filter(client)) continue;
      try {
        client.ws.send(wire);
      } catch {
        // Ignore broken socket
      }
    }
  }

  function broadcastPresence(): void {
    broadcastPortalEvent('presence:update', {
      onlineAccountIds: getOnlineAccountIds(),
    });
  }

  function clientMatchesTarget(
    client: ConnectedPortalClient,
    target: {
      targetType: 'all' | 'employee' | 'department';
      targetEmployeeIds: string[];
      targetDepartment: string;
    },
    includeAdmins = false
  ): boolean {
    if (client.role === 'super_admin' || client.role === 'admin') {
      return includeAdmins;
    }
    if (target.targetType === 'all') return true;
    if (target.targetType === 'employee') {
      return target.targetEmployeeIds.includes(client.accountId);
    }
    if (target.targetType === 'department') {
      return (
        (client.department || '').trim().toLowerCase() ===
        target.targetDepartment.trim().toLowerCase()
      );
    }
    return false;
  }

  app.get('/api/health', (_req, res) => {
    const env = getServerEnv();
    res.json({
      status: 'ok',
      service: 'alorix-global-international',
      realtimeMode: 'websocket',
      storageBackend: 'local-disk',
      apiKeyConfigured: Boolean(env.apiKey),
      forwardingConfigured: Boolean(
        (env.resendApiKey && env.enquiryToEmail) || env.enquiryWebhookUrl
      ),
    });
  });

  // =========================================================================
  // Unified Portal Authentication (/admin supports Super Admin, Admin, Employee)
  // =========================================================================

  app.post('/api/admin/login', async (req, res) => {
    try {
      const identifierRaw = String(req.body?.username || '').trim();
      const password = String(req.body?.password || '');

      if (!identifierRaw || !password) {
        res.status(400).json({
          ok: false,
          error: 'Please enter both username / employee ID and password.',
        });
        return;
      }

      const identifier = identifierRaw.toLowerCase();

      // 1. Check Admin & Master Admin accounts
      const admins = await readAdminAccounts();
      const matchedAdmin = admins.find(
        (a) => a.username.toLowerCase() === identifier
      );

      if (matchedAdmin) {
        const validPw = verifyPassword(password, matchedAdmin.passwordHash);
        if (!validPw) {
          res.status(401).json({
            ok: false,
            error: 'Invalid username or password.',
          });
          return;
        }
        if (matchedAdmin.status === 'suspended') {
          res.status(403).json({
            ok: false,
            error: 'This administrator account is currently suspended.',
          });
          return;
        }

        const sessionId = crypto.randomUUID();
        const token = await createSessionToken({
          sid: sessionId,
          sub: matchedAdmin.username,
          accountId: matchedAdmin.id,
          role: matchedAdmin.tier,
          displayName: matchedAdmin.displayName,
          pwTs: matchedAdmin.passwordUpdatedAt,
        });

        res.setHeader(
          'Set-Cookie',
          `${ADMIN_COOKIE_NAME}=${encodeURIComponent(
            token
          )}; HttpOnly; Path=/; SameSite=Lax; Max-Age=86400`
        );

        await recordLoginSession({
          sessionId,
          accountId: matchedAdmin.id,
          username: matchedAdmin.username,
          displayName: matchedAdmin.displayName,
          role: matchedAdmin.tier,
          department:
            matchedAdmin.tier === 'super_admin'
              ? 'Master Administration'
              : 'Company Administration',
          userAgent: String(req.headers['user-agent'] || ''),
        });

        await appendAuditLog({
          actor: matchedAdmin.username,
          action:
            matchedAdmin.tier === 'super_admin'
              ? 'SUPER_ADMIN_LOGIN'
              : 'ADMIN_LOGIN',
          target: matchedAdmin.username,
          detail:
            matchedAdmin.tier === 'super_admin'
              ? 'Signed into master administrative console.'
              : 'Signed into administrative console.',
          superAdminOnly: matchedAdmin.tier === 'super_admin',
        });

        const sessionInfo = {
          accountId: matchedAdmin.id,
          email: matchedAdmin.username,
          displayName: matchedAdmin.displayName,
          role: matchedAdmin.tier,
        };

        res.json({
          ok: true,
          token,
          admin: sessionInfo,
          session: sessionInfo,
        });
        return;
      }

      // 2. Check Employee accounts (matches Login ID OR Employee Code)
      const employees = await readEmployees();
      const matchedEmp = employees.find(
        (e) =>
          e.loginId.toLowerCase() === identifier ||
          e.employeeCode.toLowerCase() === identifier
      );

      if (matchedEmp) {
        const validPw = verifyPassword(password, matchedEmp.passwordHash);
        if (!validPw) {
          res.status(401).json({
            ok: false,
            error: 'Invalid username / employee ID or password.',
          });
          return;
        }
        if (matchedEmp.status === 'suspended') {
          res.status(403).json({
            ok: false,
            error:
              'Your employee account is currently suspended. Please contact your administrator.',
          });
          return;
        }

        const sessionId = crypto.randomUUID();
        const token = await createSessionToken({
          sid: sessionId,
          sub: matchedEmp.loginId,
          accountId: matchedEmp.id,
          role: 'employee',
          displayName: matchedEmp.fullName,
          employeeCode: matchedEmp.employeeCode,
          pwTs: matchedEmp.passwordUpdatedAt,
        });

        res.setHeader(
          'Set-Cookie',
          `${ADMIN_COOKIE_NAME}=${encodeURIComponent(
            token
          )}; HttpOnly; Path=/; SameSite=Lax; Max-Age=86400`
        );

        await recordLoginSession({
          sessionId,
          accountId: matchedEmp.id,
          username: matchedEmp.loginId,
          employeeCode: matchedEmp.employeeCode,
          displayName: matchedEmp.fullName,
          role: 'employee',
          department: `${matchedEmp.role} · ${matchedEmp.department}`,
          userAgent: String(req.headers['user-agent'] || ''),
        });

        await appendAuditLog({
          actor: `${matchedEmp.employeeCode} (${matchedEmp.loginId})`,
          action: 'EMPLOYEE_LOGIN',
          target: `${matchedEmp.employeeCode} (${matchedEmp.fullName})`,
          detail: `Employee signed in with role "${matchedEmp.role}" (${matchedEmp.department}).`,
        });

        const safeEmp = sanitizeEmployee(matchedEmp);
        const sessionInfo = {
          accountId: matchedEmp.id,
          email: matchedEmp.loginId,
          displayName: matchedEmp.fullName,
          role: 'employee' as const,
          employee: safeEmp,
        };

        res.json({
          ok: true,
          token,
          admin: sessionInfo,
          session: sessionInfo,
        });
        return;
      }

      res.status(401).json({
        ok: false,
        error: 'Invalid username / employee ID or password.',
      });
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : 'Unable to sign in.';
      res.status(500).json({ ok: false, error: errMsg });
    }
  });

  app.get('/api/admin/me', requireAnyAuth, (req: AuthenticatedRequest, res) => {
    const s = req.session!;
    const sessionInfo = {
      accountId: s.accountId,
      email: s.sub,
      displayName: s.displayName,
      role: s.role,
      ...(req.employeeAccount
        ? { employee: sanitizeEmployee(req.employeeAccount) }
        : {}),
    };
    res.json({
      ok: true,
      admin: sessionInfo,
      session: sessionInfo,
    });
  });

  app.post('/api/admin/logout', async (req: AuthenticatedRequest, res) => {
    try {
      const authenticated = await resolveActiveSession(req);
      if (authenticated && req.session) {
        const s = req.session;
        const closed = await recordLogoutSession({
          sessionId: s.sid,
          accountId: s.accountId,
          username: s.sub,
          employeeCode: s.employeeCode,
          displayName: s.displayName,
          role: s.role,
        });

        const actorLabel =
          s.role === 'employee' && s.employeeCode
            ? `${s.employeeCode} (${s.sub})`
            : s.sub;

        await appendAuditLog({
          actor: actorLabel,
          action: 'USER_LOGOUT',
          target:
            s.role === 'employee' && s.employeeCode
              ? `${s.employeeCode} (${s.displayName})`
              : `${s.sub} (${s.displayName})`,
          detail: `Signed out cleanly (session duration: ${closed.durationSeconds ?? 0}s). All saved records preserved.`,
          superAdminOnly: s.role === 'super_admin',
        });
      }
    } catch {
      // Never block sign-out on logging error
    }

    res.setHeader(
      'Set-Cookie',
      `${ADMIN_COOKIE_NAME}=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0`
    );
    res.json({ ok: true });
  });

  // =========================================================================
  // Employee Workspace Route (Read-Only Profile & Permission-Scoped Data)
  // =========================================================================

  app.get(
    '/api/employee/workspace',
    requireAnyAuth,
    async (req: AuthenticatedRequest, res) => {
      try {
        if (req.session!.role !== 'employee' || !req.employeeAccount) {
          res.status(403).json({
            ok: false,
            error: 'Employee session required.',
          });
          return;
        }

        const emp = req.employeeAccount;
        const canViewEnquiries = employeeCanViewEnquiries(emp);
        const enquiries = canViewEnquiries ? await readStoredEnquiries() : [];

        res.json({
          ok: true,
          employee: sanitizeEmployee(emp),
          canViewEnquiries,
          enquiries,
        });
      } catch (error) {
        const errMsg =
          error instanceof Error ? error.message : 'Unable to load workspace.';
        res.status(500).json({ ok: false, error: errMsg });
      }
    }
  );

  // =========================================================================
  // Employee Weekly Targets Reporting & Extra Work Routes (Scoped to Self)
  // =========================================================================

  app.get(
    '/api/employee/targets',
    requireAnyAuth,
    async (req: AuthenticatedRequest, res) => {
      try {
        if (req.session!.role !== 'employee' || !req.employeeAccount) {
          res.status(403).json({ ok: false, error: 'Employee session required.' });
          return;
        }
        const allTargets = await readWeeklyTargets();
        const mine = allTargets
          .filter((t) => t.employeeId === req.employeeAccount!.id)
          .sort((a, b) => b.weekStart.localeCompare(a.weekStart) || b.createdAt.localeCompare(a.createdAt));

        res.json({ ok: true, targets: mine });
      } catch (error) {
        const errMsg =
          error instanceof Error ? error.message : 'Unable to load weekly targets.';
        res.status(500).json({ ok: false, error: errMsg });
      }
    }
  );

  app.post(
    '/api/employee/targets/:id/report',
    requireAnyAuth,
    async (req: AuthenticatedRequest, res) => {
      try {
        if (req.session!.role !== 'employee' || !req.employeeAccount) {
          res.status(403).json({ ok: false, error: 'Employee session required.' });
          return;
        }

        const id = String(req.params.id || '');
        const targets = await readWeeklyTargets();
        const idx = targets.findIndex(
          (t) => t.id === id && t.employeeId === req.employeeAccount!.id
        );
        if (idx === -1) {
          res.status(404).json({ ok: false, error: 'Weekly target not found.' });
          return;
        }

        const existing = targets[idx];
        if (existing.verification.status === 'verified_completed') {
          res.status(400).json({
            ok: false,
            error:
              'This target has already been verified as completed by an administrator.',
          });
          return;
        }

        const rawStatus = String(req.body?.completionStatus || '').trim();
        const allowedStatuses: EmployeeCompletionStatus[] = [
          'in_progress',
          'completed',
          'not_completed',
        ];
        if (!allowedStatuses.includes(rawStatus as EmployeeCompletionStatus)) {
          res.status(400).json({
            ok: false,
            error: 'Please select a valid completion status.',
          });
          return;
        }
        const completionStatus = rawStatus as EmployeeCompletionStatus;

        const completedWork = String(req.body?.completedWork || '').trim().slice(0, 2000);
        const notCompletedReason = String(req.body?.notCompletedReason || '')
          .trim()
          .slice(0, 1500);
        const rawProgress = Number(req.body?.progressPercent);
        const progressPercent = Number.isFinite(rawProgress)
          ? Math.max(0, Math.min(100, Math.round(rawProgress)))
          : completionStatus === 'completed'
            ? 100
            : completionStatus === 'not_completed'
              ? 0
              : 50;

        if (completionStatus === 'completed' && completedWork.length < 5) {
          res.status(400).json({
            ok: false,
            error: 'Please describe what you completed for this target.',
          });
          return;
        }

        if (completionStatus === 'not_completed' && notCompletedReason.length < 5) {
          res.status(400).json({
            ok: false,
            error: 'Please explain why this target could not be completed.',
          });
          return;
        }

        if (
          completionStatus === 'in_progress' &&
          completedWork.length < 5 &&
          notCompletedReason.length < 5
        ) {
          res.status(400).json({
            ok: false,
            error: 'Please report your completed progress or current blockers.',
          });
          return;
        }

        const { links, error: linkError } = normalizeDriveLinks(req.body?.driveLinks);
        if (linkError) {
          res.status(400).json({ ok: false, error: linkError });
          return;
        }

        const now = new Date().toISOString();
        const updated: StoredWeeklyTarget = {
          ...existing,
          employeeCode: req.employeeAccount.employeeCode,
          employeeName: req.employeeAccount.fullName,
          employeeRole: req.employeeAccount.role,
          department: req.employeeAccount.department,
          updatedAt: now,
          report: {
            completionStatus,
            progressPercent: completionStatus === 'completed' ? 100 : progressPercent,
            completedWork,
            notCompletedReason,
            driveLinks: links,
            submittedAt: now,
          },
          verification: {
            ...existing.verification,
            status: 'pending_review',
          },
        };

        targets[idx] = updated;
        await writeWeeklyTargets(targets);

        await appendAuditLog({
          actor: `${req.employeeAccount.employeeCode} (${req.employeeAccount.loginId})`,
          action: 'TARGET_REPORTED',
          target: `${updated.title} (${updated.weekStart})`,
          detail: `Reported status "${completionStatus}" (${updated.report.progressPercent}%) with ${links.length} Google Drive photo link(s).`,
        });

        res.json({ ok: true, target: updated });
      } catch (error) {
        const errMsg =
          error instanceof Error ? error.message : 'Unable to submit target report.';
        res.status(500).json({ ok: false, error: errMsg });
      }
    }
  );

  app.get(
    '/api/employee/extra-work',
    requireAnyAuth,
    async (req: AuthenticatedRequest, res) => {
      try {
        if (req.session!.role !== 'employee' || !req.employeeAccount) {
          res.status(403).json({ ok: false, error: 'Employee session required.' });
          return;
        }
        const allItems = await readExtraWork();
        const mine = allItems
          .filter((item) => item.employeeId === req.employeeAccount!.id)
          .sort((a, b) => b.submittedAt.localeCompare(a.submittedAt));

        res.json({ ok: true, items: mine });
      } catch (error) {
        const errMsg =
          error instanceof Error ? error.message : 'Unable to load extra work log.';
        res.status(500).json({ ok: false, error: errMsg });
      }
    }
  );

  app.post(
    '/api/employee/extra-work',
    requireAnyAuth,
    async (req: AuthenticatedRequest, res) => {
      try {
        if (req.session!.role !== 'employee' || !req.employeeAccount) {
          res.status(403).json({ ok: false, error: 'Employee session required.' });
          return;
        }

        const title = String(req.body?.title || '').trim().slice(0, 140);
        const category =
          String(req.body?.category || '').trim().slice(0, 64) || 'Additional Task';
        const description = String(req.body?.description || '').trim().slice(0, 2000);
        const impact = String(req.body?.impact || '').trim().slice(0, 600);
        const datePerformed =
          String(req.body?.datePerformed || '').trim().slice(0, 10) ||
          new Date().toISOString().slice(0, 10);

        if (title.length < 3) {
          res.status(400).json({
            ok: false,
            error: 'Please enter a short title for the extra work performed.',
          });
          return;
        }
        if (description.length < 8) {
          res.status(400).json({
            ok: false,
            error: 'Please describe the extra work you completed.',
          });
          return;
        }

        const { links, error: linkError } = normalizeDriveLinks(req.body?.driveLinks);
        if (linkError) {
          res.status(400).json({ ok: false, error: linkError });
          return;
        }

        const now = new Date().toISOString();
        const emp = req.employeeAccount;

        const created: StoredExtraWork = {
          id: crypto.randomUUID(),
          employeeId: emp.id,
          employeeCode: emp.employeeCode,
          employeeName: emp.fullName,
          employeeRole: emp.role,
          department: emp.department,
          datePerformed,
          title,
          category,
          description,
          impact,
          driveLinks: links,
          submittedAt: now,
          updatedAt: now,
          verification: {
            status: 'pending_review',
            remarks: '',
            verifiedBy: null,
            verifiedAt: null,
          },
        };

        const allItems = await readExtraWork();
        allItems.unshift(created);
        await writeExtraWork(allItems);

        await appendAuditLog({
          actor: `${emp.employeeCode} (${emp.loginId})`,
          action: 'EXTRA_WORK_SUBMITTED',
          target: created.title,
          detail: `Logged extra work (${created.category}) with ${links.length} Google Drive photo link(s).`,
        });

        res.status(201).json({ ok: true, item: created });
      } catch (error) {
        const errMsg =
          error instanceof Error ? error.message : 'Unable to save extra work entry.';
        res.status(500).json({ ok: false, error: errMsg });
      }
    }
  );

  app.patch(
    '/api/employee/extra-work/:id',
    requireAnyAuth,
    async (req: AuthenticatedRequest, res) => {
      try {
        if (req.session!.role !== 'employee' || !req.employeeAccount) {
          res.status(403).json({ ok: false, error: 'Employee session required.' });
          return;
        }
        const id = String(req.params.id || '');
        const allItems = await readExtraWork();
        const idx = allItems.findIndex(
          (i) => i.id === id && i.employeeId === req.employeeAccount!.id
        );
        if (idx === -1) {
          res.status(404).json({ ok: false, error: 'Extra work entry not found.' });
          return;
        }
        const existing = allItems[idx];
        if (existing.verification.status === 'verified') {
          res.status(400).json({
            ok: false,
            error: 'Verified extra work entries cannot be edited.',
          });
          return;
        }

        const title =
          req.body?.title !== undefined
            ? String(req.body.title).trim().slice(0, 140)
            : existing.title;
        const category =
          req.body?.category !== undefined
            ? String(req.body.category).trim().slice(0, 64) || 'Additional Task'
            : existing.category;
        const description =
          req.body?.description !== undefined
            ? String(req.body.description).trim().slice(0, 2000)
            : existing.description;
        const impact =
          req.body?.impact !== undefined
            ? String(req.body.impact).trim().slice(0, 600)
            : existing.impact;
        const datePerformed =
          req.body?.datePerformed !== undefined
            ? String(req.body.datePerformed).trim().slice(0, 10) || existing.datePerformed
            : existing.datePerformed;

        if (title.length < 3) {
          res.status(400).json({
            ok: false,
            error: 'Please enter a short title for the extra work performed.',
          });
          return;
        }
        if (description.length < 8) {
          res.status(400).json({
            ok: false,
            error: 'Please describe the extra work you completed.',
          });
          return;
        }

        let links = existing.driveLinks;
        if (req.body?.driveLinks !== undefined) {
          const parsed = normalizeDriveLinks(req.body.driveLinks);
          if (parsed.error) {
            res.status(400).json({ ok: false, error: parsed.error });
            return;
          }
          links = parsed.links;
        }

        const now = new Date().toISOString();
        const updated: StoredExtraWork = {
          ...existing,
          title,
          category,
          description,
          impact,
          datePerformed,
          driveLinks: links,
          updatedAt: now,
          verification: {
            ...existing.verification,
            status: 'pending_review',
          },
        };

        allItems[idx] = updated;
        await writeExtraWork(allItems);

        res.json({ ok: true, item: updated });
      } catch (error) {
        const errMsg =
          error instanceof Error ? error.message : 'Unable to update extra work entry.';
        res.status(500).json({ ok: false, error: errMsg });
      }
    }
  );

  app.delete(
    '/api/employee/extra-work/:id',
    requireAnyAuth,
    async (req: AuthenticatedRequest, res) => {
      try {
        if (req.session!.role !== 'employee' || !req.employeeAccount) {
          res.status(403).json({ ok: false, error: 'Employee session required.' });
          return;
        }
        const id = String(req.params.id || '');
        const allItems = await readExtraWork();
        const idx = allItems.findIndex(
          (i) => i.id === id && i.employeeId === req.employeeAccount!.id
        );
        if (idx === -1) {
          res.status(404).json({ ok: false, error: 'Extra work entry not found.' });
          return;
        }
        if (allItems[idx].verification.status === 'verified') {
          res.status(400).json({
            ok: false,
            error: 'Verified extra work entries cannot be deleted.',
          });
          return;
        }
        allItems.splice(idx, 1);
        await writeExtraWork(allItems);
        res.json({ ok: true, removedId: id });
      } catch (error) {
        const errMsg =
          error instanceof Error ? error.message : 'Unable to delete extra work entry.';
        res.status(500).json({ ok: false, error: errMsg });
      }
    }
  );

  // =========================================================================
  // Employee Notification Centre & Personal Login/Logout History
  // =========================================================================

  app.get(
    '/api/employee/notifications',
    requireAnyAuth,
    async (req: AuthenticatedRequest, res) => {
      try {
        if (req.session!.role !== 'employee' || !req.employeeAccount) {
          res.status(403).json({ ok: false, error: 'Employee session required.' });
          return;
        }
        const emp = req.employeeAccount;
        const all = await readNotifications();
        const mine = all
          .filter((n) => isNotificationTargetedToEmployee(n, emp))
          .map((n) => {
            const receipt = n.readBy.find((r) => r.employeeId === emp.id);
            return {
              id: n.id,
              title: n.title,
              message: n.message,
              priority: n.priority,
              targetType: n.targetType,
              targetDepartment: n.targetDepartment,
              createdBy: n.createdBy,
              createdAt: n.createdAt,
              isRead: Boolean(receipt),
              readAt: receipt ? receipt.readAt : null,
            };
          });

        const unreadCount = mine.filter((n) => !n.isRead).length;
        res.json({ ok: true, notifications: mine, unreadCount });
      } catch (error) {
        const errMsg =
          error instanceof Error ? error.message : 'Unable to load notifications.';
        res.status(500).json({ ok: false, error: errMsg });
      }
    }
  );

  app.post(
    '/api/employee/notifications/:id/read',
    requireAnyAuth,
    async (req: AuthenticatedRequest, res) => {
      try {
        if (req.session!.role !== 'employee' || !req.employeeAccount) {
          res.status(403).json({ ok: false, error: 'Employee session required.' });
          return;
        }
        const id = String(req.params.id || '');
        const updated = await markNotificationReadForEmployee(id, {
          id: req.employeeAccount.id,
          employeeCode: req.employeeAccount.employeeCode,
          fullName: req.employeeAccount.fullName,
        });
        if (!updated) {
          res.status(404).json({ ok: false, error: 'Notification not found.' });
          return;
        }
        res.json({ ok: true, id });
      } catch (error) {
        const errMsg =
          error instanceof Error ? error.message : 'Unable to mark notification as read.';
        res.status(500).json({ ok: false, error: errMsg });
      }
    }
  );

  app.post(
    '/api/employee/notifications/read-all',
    requireAnyAuth,
    async (req: AuthenticatedRequest, res) => {
      try {
        if (req.session!.role !== 'employee' || !req.employeeAccount) {
          res.status(403).json({ ok: false, error: 'Employee session required.' });
          return;
        }
        const count = await markAllNotificationsReadForEmployee({
          id: req.employeeAccount.id,
          employeeCode: req.employeeAccount.employeeCode,
          fullName: req.employeeAccount.fullName,
          department: req.employeeAccount.department,
        });
        res.json({ ok: true, markedCount: count });
      } catch (error) {
        const errMsg =
          error instanceof Error ? error.message : 'Unable to update notifications.';
        res.status(500).json({ ok: false, error: errMsg });
      }
    }
  );

  app.get(
    '/api/employee/session-logs',
    requireAnyAuth,
    async (req: AuthenticatedRequest, res) => {
      try {
        if (req.session!.role !== 'employee' || !req.employeeAccount) {
          res.status(403).json({ ok: false, error: 'Employee session required.' });
          return;
        }
        const logs = await readSessionLogs();
        const mine = logs.filter((l) => l.accountId === req.employeeAccount!.id);
        res.json({ ok: true, logs: mine });
      } catch (error) {
        const errMsg =
          error instanceof Error ? error.message : 'Unable to load login history.';
        res.status(500).json({ ok: false, error: errMsg });
      }
    }
  );

  // =========================================================================
  // Master Admin Exclusive Routes (Manage Admin Account IDs & Passwords)
  // =========================================================================

  app.get(
    '/api/super-admin/admins',
    requireSuperAdmin,
    async (_req: AuthenticatedRequest, res) => {
      try {
        const allAdmins = await readAdminAccounts();
        const managed = allAdmins
          .filter((a) => a.tier === 'admin')
          .sort((a, b) => Number(Boolean(b.isPrimaryAdmin)) - Number(Boolean(a.isPrimaryAdmin)))
          .map(sanitizeAdminAccount);

        res.json({
          ok: true,
          admins: managed,
        });
      } catch (error) {
        const errMsg =
          error instanceof Error ? error.message : 'Failed to load admin accounts.';
        res.status(500).json({ ok: false, error: errMsg });
      }
    }
  );

  app.post(
    '/api/super-admin/admins',
    requireSuperAdmin,
    async (req: AuthenticatedRequest, res) => {
      try {
        const username = String(req.body?.username || '').trim().toLowerCase();
        const displayName = String(req.body?.displayName || '').trim();
        const password = String(req.body?.password || '');
        const status: AccountStatus =
          req.body?.status === 'suspended' ? 'suspended' : 'active';

        if (!username || username.length < 3 || username.length > 80 || /\s/.test(username)) {
          res.status(400).json({
            ok: false,
            error: 'Admin username / ID must be 3–80 characters with no spaces.',
          });
          return;
        }
        if (!displayName || displayName.length < 2 || displayName.length > 64) {
          res.status(400).json({
            ok: false,
            error: 'Display name must be between 2 and 64 characters.',
          });
          return;
        }
        if (password.length < 6 || password.length > 128) {
          res.status(400).json({
            ok: false,
            error: 'Password must be between 6 and 128 characters.',
          });
          return;
        }

        const admins = await readAdminAccounts();
        const employees = await readEmployees();

        if (
          admins.some((a) => a.username.toLowerCase() === username) ||
          employees.some(
            (e) =>
              e.loginId.toLowerCase() === username ||
              e.employeeCode.toLowerCase() === username
          )
        ) {
          res.status(409).json({
            ok: false,
            error: `Username "${username}" is already in use.`,
          });
          return;
        }

        const now = new Date().toISOString();
        const actor = req.session!.sub;

        const created: StoredAdminAccount = {
          id: crypto.randomUUID(),
          username,
          displayName,
          tier: 'admin',
          isPrimaryAdmin: false,
          status,
          passwordHash: hashPassword(password),
          createdAt: now,
          updatedAt: now,
          passwordUpdatedAt: now,
          updatedBy: actor,
        };

        admins.push(created);
        await writeAdminAccounts(admins);

        await appendAuditLog({
          actor,
          action: 'ADMIN_ACCOUNT_CREATED',
          target: `${created.username} (${created.displayName})`,
          detail: `Created new company admin account with status "${created.status}".`,
          superAdminOnly: true,
        });

        res.status(201).json({
          ok: true,
          adminAccount: sanitizeAdminAccount(created),
        });
      } catch (error) {
        const errMsg =
          error instanceof Error ? error.message : 'Unable to create admin account.';
        res.status(500).json({ ok: false, error: errMsg });
      }
    }
  );

  app.patch(
    '/api/super-admin/admins/:id',
    requireSuperAdmin,
    async (req: AuthenticatedRequest, res) => {
      try {
        const id = String(req.params.id || '');
        if (id === SUPER_ADMIN_ID) {
          res.status(403).json({
            ok: false,
            error: 'Master administrator account cannot be modified here.',
          });
          return;
        }

        const admins = await readAdminAccounts();
        const idx = admins.findIndex((a) => a.id === id && a.tier === 'admin');
        if (idx === -1) {
          res.status(404).json({ ok: false, error: 'Admin account not found.' });
          return;
        }

        const existing = admins[idx];
        const username =
          req.body?.username !== undefined
            ? String(req.body.username).trim().toLowerCase()
            : existing.username;
        const displayName =
          req.body?.displayName !== undefined
            ? String(req.body.displayName).trim()
            : existing.displayName;
        const status: AccountStatus =
          req.body?.status === 'active' || req.body?.status === 'suspended'
            ? req.body.status
            : existing.status;
        const optionalPassword =
          typeof req.body?.password === 'string' && req.body.password.length > 0
            ? req.body.password
            : null;

        if (!username || username.length < 3 || username.length > 80 || /\s/.test(username)) {
          res.status(400).json({
            ok: false,
            error: 'Admin username / ID must be 3–80 characters with no spaces.',
          });
          return;
        }
        if (!displayName || displayName.length < 2 || displayName.length > 64) {
          res.status(400).json({
            ok: false,
            error: 'Display name must be between 2 and 64 characters.',
          });
          return;
        }
        if (
          optionalPassword !== null &&
          (optionalPassword.length < 6 || optionalPassword.length > 128)
        ) {
          res.status(400).json({
            ok: false,
            error: 'New password must be between 6 and 128 characters.',
          });
          return;
        }

        const employees = await readEmployees();
        if (
          admins.some((a) => a.id !== id && a.username.toLowerCase() === username) ||
          employees.some(
            (e) =>
              e.loginId.toLowerCase() === username ||
              e.employeeCode.toLowerCase() === username
          )
        ) {
          res.status(409).json({
            ok: false,
            error: `Username "${username}" is already in use.`,
          });
          return;
        }

        const now = new Date().toISOString();
        const actor = req.session!.sub;
        const updated: StoredAdminAccount = {
          ...existing,
          username,
          displayName,
          status,
          ...(optionalPassword
            ? {
                passwordHash: hashPassword(optionalPassword),
                passwordUpdatedAt: now,
              }
            : {}),
          updatedAt: now,
          updatedBy: actor,
        };

        admins[idx] = updated;
        await writeAdminAccounts(admins);

        const changes: string[] = [];
        if (existing.username !== updated.username) {
          changes.push(`ID changed from "${existing.username}" to "${updated.username}"`);
        }
        if (existing.displayName !== updated.displayName) {
          changes.push(`Name set to "${updated.displayName}"`);
        }
        if (existing.status !== updated.status) {
          changes.push(`Status changed to ${updated.status}`);
        }
        if (optionalPassword) {
          changes.push('Password rotated');
        }

        await appendAuditLog({
          actor,
          action: optionalPassword ? 'ADMIN_PASSWORD_CHANGED' : 'ADMIN_ACCOUNT_UPDATED',
          target: `${updated.username} (${updated.displayName})`,
          detail:
            changes.length > 0
              ? `${changes.join('; ')}.`
              : 'Saved admin account record.',
          superAdminOnly: true,
        });

        res.json({
          ok: true,
          adminAccount: sanitizeAdminAccount(updated),
        });
      } catch (error) {
        const errMsg =
          error instanceof Error ? error.message : 'Unable to update admin account.';
        res.status(500).json({ ok: false, error: errMsg });
      }
    }
  );

  app.post(
    '/api/super-admin/admins/:id/password',
    requireSuperAdmin,
    async (req: AuthenticatedRequest, res) => {
      try {
        const id = String(req.params.id || '');
        if (id === SUPER_ADMIN_ID) {
          res.status(403).json({
            ok: false,
            error: 'Master administrator account cannot be modified here.',
          });
          return;
        }

        const newPassword = String(req.body?.password || '');
        if (newPassword.length < 6 || newPassword.length > 128) {
          res.status(400).json({
            ok: false,
            error: 'New password must be between 6 and 128 characters.',
          });
          return;
        }

        const admins = await readAdminAccounts();
        const idx = admins.findIndex((a) => a.id === id && a.tier === 'admin');
        if (idx === -1) {
          res.status(404).json({ ok: false, error: 'Admin account not found.' });
          return;
        }

        const now = new Date().toISOString();
        const actor = req.session!.sub;
        const updated: StoredAdminAccount = {
          ...admins[idx],
          passwordHash: hashPassword(newPassword),
          passwordUpdatedAt: now,
          updatedAt: now,
          updatedBy: actor,
        };

        admins[idx] = updated;
        await writeAdminAccounts(admins);

        await appendAuditLog({
          actor,
          action: 'ADMIN_PASSWORD_CHANGED',
          target: `${updated.username} (${updated.displayName})`,
          detail: 'Master administrator updated admin account password.',
          superAdminOnly: true,
        });

        res.json({
          ok: true,
          adminAccount: sanitizeAdminAccount(updated),
        });
      } catch (error) {
        const errMsg =
          error instanceof Error ? error.message : 'Unable to update admin password.';
        res.status(500).json({ ok: false, error: errMsg });
      }
    }
  );

  app.delete(
    '/api/super-admin/admins/:id',
    requireSuperAdmin,
    async (req: AuthenticatedRequest, res) => {
      try {
        const id = String(req.params.id || '');
        const admins = await readAdminAccounts();
        const idx = admins.findIndex((a) => a.id === id && a.tier === 'admin');
        if (idx === -1) {
          res.status(404).json({ ok: false, error: 'Admin account not found.' });
          return;
        }
        if (admins[idx].isPrimaryAdmin) {
          res.status(400).json({
            ok: false,
            error:
              'The primary company admin account cannot be deleted. You can change its ID, password, or suspend it instead.',
          });
          return;
        }

        const [removed] = admins.splice(idx, 1);
        await writeAdminAccounts(admins);

        await appendAuditLog({
          actor: req.session!.sub,
          action: 'ADMIN_ACCOUNT_DELETED',
          target: `${removed.username} (${removed.displayName})`,
          detail: 'Removed additional company admin account.',
          superAdminOnly: true,
        });

        res.json({ ok: true, removedId: removed.id });
      } catch (error) {
        const errMsg =
          error instanceof Error ? error.message : 'Unable to delete admin account.';
        res.status(500).json({ ok: false, error: errMsg });
      }
    }
  );

  // =========================================================================
  // Admin & Master Admin Employee Account, Role & Password Management Routes
  // =========================================================================

  app.get('/api/admin/employees', requireAdmin, async (_req, res) => {
    try {
      const employees = await readEmployees();
      res.json({
        ok: true,
        employees: employees.map(sanitizeEmployee),
        nextEmployeeCode: computeNextEmployeeCode(employees),
      });
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : 'Failed to load employees.';
      res.status(500).json({ ok: false, error: errMsg });
    }
  });

  app.post('/api/admin/employees', requireAdmin, async (req: AuthenticatedRequest, res) => {
    try {
      const employees = await readEmployees();
      const admins = await readAdminAccounts();
      const rawCode = String(req.body?.employeeCode || '').trim();
      const employeeCode = (rawCode || computeNextEmployeeCode(employees)).toUpperCase();
      const fullName = String(req.body?.fullName || '').trim();
      const loginId = String(req.body?.loginId || '').trim().toLowerCase();
      const role = String(req.body?.role || '').trim();
      const department = String(req.body?.department || '').trim();
      const password = String(req.body?.password || '');
      const notes = String(req.body?.notes || '').trim().slice(0, 500);
      const status: EmployeeStatus =
        req.body?.status === 'suspended' ? 'suspended' : 'active';
      const permissions = normalizePermissions(req.body?.permissions);

      if (!fullName || fullName.length < 2) {
        res.status(400).json({ ok: false, error: 'Employee full name is required.' });
        return;
      }
      if (!employeeCode || employeeCode.length < 3 || employeeCode.length > 32) {
        res.status(400).json({
          ok: false,
          error: 'Employee ID must be between 3 and 32 characters.',
        });
        return;
      }
      if (!loginId || loginId.length < 3 || loginId.length > 80 || /\s/.test(loginId)) {
        res.status(400).json({
          ok: false,
          error: 'Login username / email must be 3–80 characters with no spaces.',
        });
        return;
      }
      if (!role || role.length < 2 || role.length > 64) {
        res.status(400).json({ ok: false, error: 'Please assign a valid role.' });
        return;
      }
      if (password.length < 6 || password.length > 128) {
        res.status(400).json({
          ok: false,
          error: 'Password must be at least 6 characters long.',
        });
        return;
      }

      if (
        employees.some(
          (e) => e.employeeCode.toLowerCase() === employeeCode.toLowerCase()
        ) ||
        admins.some((a) => a.username.toLowerCase() === employeeCode.toLowerCase())
      ) {
        res.status(409).json({
          ok: false,
          error: `Employee ID "${employeeCode}" is already in use.`,
        });
        return;
      }

      if (
        employees.some((e) => e.loginId.toLowerCase() === loginId) ||
        admins.some((a) => a.username.toLowerCase() === loginId)
      ) {
        res.status(409).json({
          ok: false,
          error: `Login ID "${loginId}" is reserved or already assigned.`,
        });
        return;
      }

      const now = new Date().toISOString();
      const actor = req.session!.sub;

      const created: StoredEmployee = {
        id: crypto.randomUUID(),
        employeeCode,
        fullName,
        loginId,
        role,
        department: department || 'Operations',
        permissions,
        status,
        notes,
        passwordHash: hashPassword(password),
        createdAt: now,
        updatedAt: now,
        passwordUpdatedAt: now,
        createdBy: actor,
      };

      employees.unshift(created);
      await writeEmployees(employees);

      await appendAuditLog({
        actor,
        action: 'EMPLOYEE_CREATED',
        target: `${created.employeeCode} (${created.fullName})`,
        detail: `Created account with login "${created.loginId}", role "${created.role}", department "${created.department}".`,
      });

      res.status(201).json({
        ok: true,
        employee: sanitizeEmployee(created),
        nextEmployeeCode: computeNextEmployeeCode(employees),
      });
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : 'Unable to create employee.';
      res.status(500).json({ ok: false, error: errMsg });
    }
  });

  app.patch('/api/admin/employees/:id', requireAdmin, async (req: AuthenticatedRequest, res) => {
    try {
      const id = String(req.params.id || '');
      const employees = await readEmployees();
      const admins = await readAdminAccounts();
      const idx = employees.findIndex((e) => e.id === id);

      if (idx === -1) {
        res.status(404).json({ ok: false, error: 'Employee record not found.' });
        return;
      }

      const existing = employees[idx];
      const fullName =
        req.body?.fullName !== undefined
          ? String(req.body.fullName).trim()
          : existing.fullName;
      const employeeCode =
        req.body?.employeeCode !== undefined
          ? String(req.body.employeeCode).trim().toUpperCase()
          : existing.employeeCode;
      const loginId =
        req.body?.loginId !== undefined
          ? String(req.body.loginId).trim().toLowerCase()
          : existing.loginId;
      const role =
        req.body?.role !== undefined
          ? String(req.body.role).trim()
          : existing.role;
      const department =
        req.body?.department !== undefined
          ? String(req.body.department).trim()
          : existing.department;
      const notes =
        req.body?.notes !== undefined
          ? String(req.body.notes).trim().slice(0, 500)
          : existing.notes;
      const status: EmployeeStatus =
        req.body?.status === 'active' || req.body?.status === 'suspended'
          ? req.body.status
          : existing.status;
      const permissions =
        req.body?.permissions !== undefined
          ? normalizePermissions(req.body.permissions)
          : existing.permissions;

      if (!fullName || fullName.length < 2) {
        res.status(400).json({ ok: false, error: 'Employee full name is required.' });
        return;
      }
      if (!employeeCode || employeeCode.length < 3 || employeeCode.length > 32) {
        res.status(400).json({
          ok: false,
          error: 'Employee ID must be between 3 and 32 characters.',
        });
        return;
      }
      if (!loginId || loginId.length < 3 || loginId.length > 80 || /\s/.test(loginId)) {
        res.status(400).json({
          ok: false,
          error: 'Login username / email must be 3–80 characters with no spaces.',
        });
        return;
      }
      if (!role || role.length < 2 || role.length > 64) {
        res.status(400).json({ ok: false, error: 'Please assign a valid role.' });
        return;
      }

      if (
        employees.some(
          (e) =>
            e.id !== id &&
            e.employeeCode.toLowerCase() === employeeCode.toLowerCase()
        ) ||
        admins.some((a) => a.username.toLowerCase() === employeeCode.toLowerCase())
      ) {
        res.status(409).json({
          ok: false,
          error: `Employee ID "${employeeCode}" is already in use.`,
        });
        return;
      }

      if (
        employees.some(
          (e) => e.id !== id && e.loginId.toLowerCase() === loginId
        ) ||
        admins.some((a) => a.username.toLowerCase() === loginId)
      ) {
        res.status(409).json({
          ok: false,
          error: `Login ID "${loginId}" is reserved or already in use.`,
        });
        return;
      }

      const statusOnlyChange =
        existing.status !== status &&
        existing.fullName === fullName &&
        existing.role === role &&
        existing.department === department &&
        existing.employeeCode === employeeCode &&
        existing.loginId === loginId;

      const updated: StoredEmployee = {
        ...existing,
        employeeCode,
        fullName,
        loginId,
        role,
        department: department || 'Operations',
        permissions,
        status,
        notes,
        updatedAt: new Date().toISOString(),
      };

      employees[idx] = updated;
      await writeEmployees(employees);

      await appendAuditLog({
        actor: req.session!.sub,
        action: statusOnlyChange ? 'STATUS_CHANGED' : 'EMPLOYEE_UPDATED',
        target: `${updated.employeeCode} (${updated.fullName})`,
        detail: statusOnlyChange
          ? `Account status changed from ${existing.status} to ${updated.status}.`
          : `Updated profile — Role: "${updated.role}", Dept: "${updated.department}", Status: ${updated.status}.`,
      });

      res.json({
        ok: true,
        employee: sanitizeEmployee(updated),
      });
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : 'Unable to update employee.';
      res.status(500).json({ ok: false, error: errMsg });
    }
  });

  app.post(
    '/api/admin/employees/:id/password',
    requireAdmin,
    async (req: AuthenticatedRequest, res) => {
      try {
        const id = String(req.params.id || '');
        const newPassword = String(req.body?.password || '');

        if (newPassword.length < 6 || newPassword.length > 128) {
          res.status(400).json({
            ok: false,
            error: 'New password must be between 6 and 128 characters.',
          });
          return;
        }

        const employees = await readEmployees();
        const idx = employees.findIndex((e) => e.id === id);

        if (idx === -1) {
          res.status(404).json({ ok: false, error: 'Employee record not found.' });
          return;
        }

        const now = new Date().toISOString();
        const updated: StoredEmployee = {
          ...employees[idx],
          passwordHash: hashPassword(newPassword),
          passwordUpdatedAt: now,
          updatedAt: now,
        };

        employees[idx] = updated;
        await writeEmployees(employees);

        await appendAuditLog({
          actor: req.session!.sub,
          action: 'PASSWORD_CHANGED',
          target: `${updated.employeeCode} (${updated.fullName})`,
          detail: 'Administrator updated employee account password.',
        });

        res.json({
          ok: true,
          employee: sanitizeEmployee(updated),
        });
      } catch (error) {
        const errMsg =
          error instanceof Error ? error.message : 'Unable to update password.';
        res.status(500).json({ ok: false, error: errMsg });
      }
    }
  );

  app.delete('/api/admin/employees/:id', requireAdmin, async (req: AuthenticatedRequest, res) => {
    try {
      const id = String(req.params.id || '');
      const employees = await readEmployees();
      const idx = employees.findIndex((e) => e.id === id);

      if (idx === -1) {
        res.status(404).json({ ok: false, error: 'Employee record not found.' });
        return;
      }

      const [removed] = employees.splice(idx, 1);
      await writeEmployees(employees);

      await appendAuditLog({
        actor: req.session!.sub,
        action: 'EMPLOYEE_DELETED',
        target: `${removed.employeeCode} (${removed.fullName})`,
        detail: `Removed employee account (${removed.loginId}, role "${removed.role}").`,
      });

      res.json({
        ok: true,
        removedId: removed.id,
        nextEmployeeCode: computeNextEmployeeCode(employees),
      });
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : 'Unable to delete employee.';
      res.status(500).json({ ok: false, error: errMsg });
    }
  });

  app.get('/api/admin/audit', requireAdmin, async (req: AuthenticatedRequest, res) => {
    try {
      const logs = await readAuditLogs();
      const visibleLogs =
        req.session!.role === 'super_admin'
          ? logs
          : logs.filter((entry) => !entry.superAdminOnly);
      res.json({ ok: true, logs: visibleLogs });
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : 'Failed to load audit log.';
      res.status(500).json({ ok: false, error: errMsg });
    }
  });

  app.get('/api/admin/enquiries', requireAdmin, async (_req, res) => {
    try {
      const enquiries = await readStoredEnquiries<StoredEnquiry>();
      res.json({ ok: true, enquiries });
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : 'Failed to load enquiries.';
      res.status(500).json({ ok: false, error: errMsg });
    }
  });

  app.patch(
    '/api/enquiries/:id/solve',
    requireAnyAuth,
    async (req: AuthenticatedRequest, res) => {
      try {
        const s = req.session!;
        if (s.role === 'employee') {
          if (!req.employeeAccount || !employeeCanViewEnquiries(req.employeeAccount)) {
            res.status(403).json({
              ok: false,
              error: 'You do not have permission to update client enquiries.',
            });
            return;
          }
        }

        const enquiryId = String(req.params.id || '').trim();
        const body = (req.body || {}) as {
          solved?: boolean;
          solvedNote?: string;
        };

        if (typeof body.solved !== 'boolean') {
          res.status(400).json({
            ok: false,
            error: 'Please specify whether the enquiry is solved (true or false).',
          });
          return;
        }

        const solved = body.solved;
        const solvedNote =
          typeof body.solvedNote === 'string'
            ? body.solvedNote.trim().slice(0, 400)
            : undefined;
        const actorLabel =
          s.role === 'employee' && s.employeeCode
            ? `${s.displayName} (${s.employeeCode})`
            : `${s.displayName || s.sub} (${s.sub})`;
        const nowIso = new Date().toISOString();

        const updated = await updateStoredEnquiryById<StoredEnquiry>(
          enquiryId,
          (current) => ({
            ...current,
            solved,
            solvedAt: solved ? nowIso : null,
            solvedBy: solved ? actorLabel : null,
            solvedNote:
              solvedNote !== undefined
                ? solvedNote
                : solved
                ? current.solvedNote || ''
                : '',
          })
        );

        if (!updated) {
          res.status(404).json({ ok: false, error: 'Enquiry not found.' });
          return;
        }

        await appendAuditLog({
          actor: s.sub,
          action: 'ENQUIRY_STATUS_UPDATED',
          target: `${updated.id} (${updated.companyName})`,
          detail: solved
            ? `Marked enquiry as SOLVED${
                updated.solvedNote ? ` — Note: "${updated.solvedNote}"` : ''
              }.`
            : 'Reopened enquiry to Pending.',
        });

        broadcastPortalEvent('enquiry:updated', updated);

        res.json({ ok: true, enquiry: updated });
      } catch (error) {
        const errMsg =
          error instanceof Error
            ? error.message
            : 'Unable to update enquiry status.';
        res.status(500).json({ ok: false, error: errMsg });
      }
    }
  );

  // =========================================================================
  // Admin Weekly Target Assignment, Verification & Extra Work Review Routes
  // =========================================================================

  app.get('/api/admin/targets', requireAdmin, async (_req, res) => {
    try {
      const targets = await readWeeklyTargets();
      targets.sort(
        (a, b) =>
          b.weekStart.localeCompare(a.weekStart) ||
          b.updatedAt.localeCompare(a.updatedAt)
      );
      res.json({ ok: true, targets });
    } catch (error) {
      const errMsg =
        error instanceof Error ? error.message : 'Failed to load weekly targets.';
      res.status(500).json({ ok: false, error: errMsg });
    }
  });

  app.post(
    '/api/admin/targets',
    requireAdmin,
    async (req: AuthenticatedRequest, res) => {
      try {
        const employeeId = String(req.body?.employeeId || '').trim();
        const title = String(req.body?.title || '').trim().slice(0, 140);
        const description = String(req.body?.description || '').trim().slice(0, 2000);
        const targetMetric = String(req.body?.targetMetric || '').trim().slice(0, 140);
        const weekStart = String(req.body?.weekStart || '').trim().slice(0, 10);
        const weekEnd = String(req.body?.weekEnd || '').trim().slice(0, 10);
        const rawPriority = String(req.body?.priority || 'medium').trim().toLowerCase();
        const priority: TargetPriority =
          rawPriority === 'high' || rawPriority === 'low' ? rawPriority : 'medium';

        if (!employeeId) {
          res.status(400).json({ ok: false, error: 'Please select an employee.' });
          return;
        }
        if (title.length < 3) {
          res.status(400).json({
            ok: false,
            error: 'Target title must be at least 3 characters.',
          });
          return;
        }
        if (!weekStart || !weekEnd) {
          res.status(400).json({
            ok: false,
            error: 'Please select valid week start and end dates.',
          });
          return;
        }

        const employees = await readEmployees();
        const employee = employees.find((e) => e.id === employeeId);
        if (!employee) {
          res.status(404).json({ ok: false, error: 'Selected employee not found.' });
          return;
        }

        const now = new Date().toISOString();
        const actor = req.session!.sub;

        const created: StoredWeeklyTarget = {
          id: crypto.randomUUID(),
          employeeId: employee.id,
          employeeCode: employee.employeeCode,
          employeeName: employee.fullName,
          employeeRole: employee.role,
          department: employee.department,
          weekStart,
          weekEnd,
          title,
          description,
          targetMetric,
          priority,
          createdBy: actor,
          createdAt: now,
          updatedAt: now,
          report: {
            completionStatus: 'not_started',
            progressPercent: 0,
            completedWork: '',
            notCompletedReason: '',
            driveLinks: [],
            submittedAt: null,
          },
          verification: {
            status: 'pending_report',
            remarks: '',
            verifiedBy: null,
            verifiedAt: null,
          },
        };

        const targets = await readWeeklyTargets();
        targets.unshift(created);
        await writeWeeklyTargets(targets);

        await appendAuditLog({
          actor,
          action: 'TARGET_ASSIGNED',
          target: `${employee.employeeCode} (${employee.fullName})`,
          detail: `Assigned weekly target "${created.title}" (${weekStart} to ${weekEnd}).`,
        });

        res.status(201).json({ ok: true, target: created });
      } catch (error) {
        const errMsg =
          error instanceof Error ? error.message : 'Unable to assign weekly target.';
        res.status(500).json({ ok: false, error: errMsg });
      }
    }
  );

  app.post(
    '/api/admin/targets/:id/verify',
    requireAdmin,
    async (req: AuthenticatedRequest, res) => {
      try {
        const id = String(req.params.id || '');
        const rawStatus = String(req.body?.status || '').trim();
        const allowed: TargetVerificationStatus[] = [
          'verified_completed',
          'needs_revision',
          'marked_incomplete',
          'pending_review',
        ];
        if (!allowed.includes(rawStatus as TargetVerificationStatus)) {
          res.status(400).json({
            ok: false,
            error: 'Please select a valid verification decision.',
          });
          return;
        }

        const remarks = String(req.body?.remarks || '').trim().slice(0, 1200);
        const targets = await readWeeklyTargets();
        const idx = targets.findIndex((t) => t.id === id);
        if (idx === -1) {
          res.status(404).json({ ok: false, error: 'Weekly target not found.' });
          return;
        }

        const now = new Date().toISOString();
        const actor = req.session!.sub;
        const updated: StoredWeeklyTarget = {
          ...targets[idx],
          updatedAt: now,
          verification: {
            status: rawStatus as TargetVerificationStatus,
            remarks,
            verifiedBy: actor,
            verifiedAt: now,
          },
        };

        targets[idx] = updated;
        await writeWeeklyTargets(targets);

        await appendAuditLog({
          actor,
          action: 'TARGET_VERIFIED',
          target: `${updated.employeeCode} — ${updated.title}`,
          detail: `Verification set to "${rawStatus}"${remarks ? ` — Remarks: ${remarks}` : ''}.`,
        });

        res.json({ ok: true, target: updated });
      } catch (error) {
        const errMsg =
          error instanceof Error ? error.message : 'Unable to verify weekly target.';
        res.status(500).json({ ok: false, error: errMsg });
      }
    }
  );

  app.delete(
    '/api/admin/targets/:id',
    requireAdmin,
    async (req: AuthenticatedRequest, res) => {
      try {
        const id = String(req.params.id || '');
        const targets = await readWeeklyTargets();
        const idx = targets.findIndex((t) => t.id === id);
        if (idx === -1) {
          res.status(404).json({ ok: false, error: 'Weekly target not found.' });
          return;
        }
        const [removed] = targets.splice(idx, 1);
        await writeWeeklyTargets(targets);

        await appendAuditLog({
          actor: req.session!.sub,
          action: 'TARGET_DELETED',
          target: `${removed.employeeCode} — ${removed.title}`,
          detail: `Removed weekly target (${removed.weekStart} to ${removed.weekEnd}).`,
        });

        res.json({ ok: true, removedId: removed.id });
      } catch (error) {
        const errMsg =
          error instanceof Error ? error.message : 'Unable to delete weekly target.';
        res.status(500).json({ ok: false, error: errMsg });
      }
    }
  );

  app.get('/api/admin/extra-work', requireAdmin, async (_req, res) => {
    try {
      const items = await readExtraWork();
      items.sort((a, b) => b.submittedAt.localeCompare(a.submittedAt));
      res.json({ ok: true, items });
    } catch (error) {
      const errMsg =
        error instanceof Error ? error.message : 'Failed to load extra work log.';
      res.status(500).json({ ok: false, error: errMsg });
    }
  });

  app.post(
    '/api/admin/extra-work/:id/verify',
    requireAdmin,
    async (req: AuthenticatedRequest, res) => {
      try {
        const id = String(req.params.id || '');
        const rawStatus = String(req.body?.status || '').trim();
        const allowed: ExtraWorkVerificationStatus[] = [
          'verified',
          'rejected',
          'pending_review',
        ];
        if (!allowed.includes(rawStatus as ExtraWorkVerificationStatus)) {
          res.status(400).json({
            ok: false,
            error: 'Please select a valid verification decision.',
          });
          return;
        }
        const remarks = String(req.body?.remarks || '').trim().slice(0, 1200);
        const items = await readExtraWork();
        const idx = items.findIndex((i) => i.id === id);
        if (idx === -1) {
          res.status(404).json({ ok: false, error: 'Extra work entry not found.' });
          return;
        }

        const now = new Date().toISOString();
        const actor = req.session!.sub;
        const updated: StoredExtraWork = {
          ...items[idx],
          updatedAt: now,
          verification: {
            status: rawStatus as ExtraWorkVerificationStatus,
            remarks,
            verifiedBy: actor,
            verifiedAt: now,
          },
        };
        items[idx] = updated;
        await writeExtraWork(items);

        await appendAuditLog({
          actor,
          action: 'EXTRA_WORK_VERIFIED',
          target: `${updated.employeeCode} — ${updated.title}`,
          detail: `Extra work marked "${rawStatus}"${remarks ? ` — Remarks: ${remarks}` : ''}.`,
        });

        res.json({ ok: true, item: updated });
      } catch (error) {
        const errMsg =
          error instanceof Error ? error.message : 'Unable to verify extra work.';
        res.status(500).json({ ok: false, error: errMsg });
      }
    }
  );

  app.delete(
    '/api/admin/extra-work/:id',
    requireAdmin,
    async (req: AuthenticatedRequest, res) => {
      try {
        const id = String(req.params.id || '');
        const items = await readExtraWork();
        const idx = items.findIndex((i) => i.id === id);
        if (idx === -1) {
          res.status(404).json({ ok: false, error: 'Extra work entry not found.' });
          return;
        }
        const [removed] = items.splice(idx, 1);
        await writeExtraWork(items);
        res.json({ ok: true, removedId: removed.id });
      } catch (error) {
        const errMsg =
          error instanceof Error ? error.message : 'Unable to delete extra work entry.';
        res.status(500).json({ ok: false, error: errMsg });
      }
    }
  );

  // =========================================================================
  // Admin Notification Centre & Login/Logout Activity Tracker Routes
  // =========================================================================

  app.get(
    '/api/admin/notifications',
    requireAdmin,
    async (_req: AuthenticatedRequest, res) => {
      try {
        const [notifications, employees] = await Promise.all([
          readNotifications(),
          readEmployees(),
        ]);

        const enriched = notifications.map((n) => {
          const targetedEmployees = employees.filter((e) =>
            isNotificationTargetedToEmployee(n, e)
          );
          return {
            ...n,
            totalRecipients: targetedEmployees.length,
            readCount: n.readBy.length,
          };
        });

        res.json({ ok: true, notifications: enriched });
      } catch (error) {
        const errMsg =
          error instanceof Error ? error.message : 'Failed to load notifications.';
        res.status(500).json({ ok: false, error: errMsg });
      }
    }
  );

  app.post(
    '/api/admin/notifications',
    requireAdmin,
    async (req: AuthenticatedRequest, res) => {
      try {
        const title = String(req.body?.title || '').trim().slice(0, 140);
        const message = String(req.body?.message || '').trim().slice(0, 2000);
        const rawPriority = String(req.body?.priority || 'normal').trim().toLowerCase();
        const priority: NotificationPriority =
          rawPriority === 'urgent' || rawPriority === 'important'
            ? rawPriority
            : 'normal';

        const rawTargetType = String(req.body?.targetType || 'all').trim().toLowerCase();
        const targetType: NotificationTargetType =
          rawTargetType === 'employee' || rawTargetType === 'department'
            ? rawTargetType
            : 'all';

        if (title.length < 2) {
          res.status(400).json({
            ok: false,
            error: 'Please enter a notification title (at least 2 characters).',
          });
          return;
        }
        if (message.length < 3) {
          res.status(400).json({
            ok: false,
            error: 'Please enter a notification message.',
          });
          return;
        }

        const employees = await readEmployees();
        let targetEmployeeIds: string[] = [];
        let targetLabels: string[] = [];
        let targetDepartment = '';

        if (targetType === 'employee') {
          const requestedIds = Array.isArray(req.body?.targetEmployeeIds)
            ? req.body.targetEmployeeIds.map((x: unknown) => String(x || '').trim())
            : [];
          const matched = employees.filter((e) => requestedIds.includes(e.id));
          if (matched.length === 0) {
            res.status(400).json({
              ok: false,
              error: 'Please select at least one employee recipient.',
            });
            return;
          }
          targetEmployeeIds = matched.map((e) => e.id);
          targetLabels = matched.map((e) => `${e.employeeCode} (${e.fullName})`);
        } else if (targetType === 'department') {
          targetDepartment = String(req.body?.targetDepartment || '').trim().slice(0, 80);
          if (!targetDepartment) {
            res.status(400).json({
              ok: false,
              error: 'Please select or enter a target department.',
            });
            return;
          }
          targetLabels = [`Department: ${targetDepartment}`];
        } else {
          targetLabels = ['All Employees'];
        }

        const actor = req.session!.sub;
        const created = await createNotification({
          title,
          message,
          priority,
          targetType,
          targetEmployeeIds,
          targetLabels,
          targetDepartment,
          createdBy: `${req.session!.displayName} (${actor})`,
          createdByRole:
            req.session!.role === 'super_admin' ? 'super_admin' : 'admin',
        });

        await appendAuditLog({
          actor,
          action: 'NOTIFICATION_SENT',
          target: targetLabels.join(', '),
          detail: `Sent ${priority} notification "${title}".`,
        });

        const totalRecipients = employees.filter((e) =>
          isNotificationTargetedToEmployee(created, e)
        ).length;

        broadcastPortalEvent(
          'notification:new',
          {
            id: created.id,
            title: created.title,
            message: created.message,
            priority: created.priority,
            createdBy: created.createdBy,
            createdAt: created.createdAt,
          },
          (client) => clientMatchesTarget(client, created, false)
        );

        res.status(201).json({
          ok: true,
          notification: {
            ...created,
            totalRecipients,
            readCount: 0,
          },
        });
      } catch (error) {
        const errMsg =
          error instanceof Error ? error.message : 'Unable to send notification.';
        res.status(500).json({ ok: false, error: errMsg });
      }
    }
  );

  app.delete(
    '/api/admin/notifications/:id',
    requireAdmin,
    async (req: AuthenticatedRequest, res) => {
      try {
        const id = String(req.params.id || '');
        const deleted = await deleteNotificationById(id);
        if (!deleted) {
          res.status(404).json({ ok: false, error: 'Notification not found.' });
          return;
        }
        await appendAuditLog({
          actor: req.session!.sub,
          action: 'NOTIFICATION_DELETED',
          target: id,
          detail: 'Deleted notification from Notification Centre.',
        });
        res.json({ ok: true, removedId: id });
      } catch (error) {
        const errMsg =
          error instanceof Error ? error.message : 'Unable to delete notification.';
        res.status(500).json({ ok: false, error: errMsg });
      }
    }
  );

  app.get(
    '/api/admin/session-logs',
    requireAdmin,
    async (req: AuthenticatedRequest, res) => {
      try {
        const logs = await readSessionLogs();
        const visibleLogs =
          req.session!.role === 'super_admin'
            ? logs
            : logs.filter((entry) => entry.role !== 'super_admin');
        res.json({ ok: true, logs: visibleLogs });
      } catch (error) {
        const errMsg =
          error instanceof Error ? error.message : 'Failed to load login/logout logs.';
        res.status(500).json({ ok: false, error: errMsg });
      }
    }
  );

  // =========================================================================
  // Real-Time Team Chat (Company Group Chat + 1-on-1 Direct Messages)
  // =========================================================================

  app.get(
    '/api/chat/directory',
    requireAnyAuth,
    async (req: AuthenticatedRequest, res) => {
      try {
        const meId = req.session!.accountId;
        const [admins, employees, allMessages] = await Promise.all([
          readAdminAccounts(),
          readEmployees(),
          readChatMessages(),
        ]);
        const onlineSet = new Set(getOnlineAccountIds());

        const members: {
          accountId: string;
          displayName: string;
          username: string;
          role: 'super_admin' | 'admin' | 'employee';
          roleTitle: string;
          department: string;
          employeeCode?: string;
          online: boolean;
          channelId: string;
          unreadCount: number;
          lastMessageText: string;
          lastMessageAt: string | null;
        }[] = [];

        const getChannelMeta = (channelId: string) => {
          let unreadCount = 0;
          let last: StoredChatMessage | null = null;
          for (const msg of allMessages) {
            if (msg.channelId !== channelId) continue;
            last = msg;
            if (msg.senderId !== meId && !msg.readBy.includes(meId)) {
              unreadCount += 1;
            }
          }
          return {
            unreadCount,
            lastMessageText: last ? last.text : '',
            lastMessageAt: last ? last.createdAt : null,
          };
        };

        for (const a of admins) {
          if (a.status !== 'active' || a.id === meId) continue;
          const channelId = buildDmChannelId(meId, a.id);
          const meta = getChannelMeta(channelId);
          members.push({
            accountId: a.id,
            displayName: a.displayName,
            username: a.username,
            role: a.tier,
            roleTitle:
              a.tier === 'super_admin'
                ? 'Master Administrator'
                : 'Administrator',
            department: 'Administration',
            online: onlineSet.has(a.id),
            channelId,
            ...meta,
          });
        }

        for (const emp of employees) {
          if (emp.status !== 'active' || emp.id === meId) continue;
          const channelId = buildDmChannelId(meId, emp.id);
          const meta = getChannelMeta(channelId);
          members.push({
            accountId: emp.id,
            displayName: emp.fullName,
            username: emp.loginId,
            role: 'employee',
            roleTitle: emp.role,
            department: emp.department,
            employeeCode: emp.employeeCode,
            online: onlineSet.has(emp.id),
            channelId,
            ...meta,
          });
        }

        const groupMeta = getChannelMeta(COMPANY_GROUP_CHANNEL_ID);
        const totalUnread =
          groupMeta.unreadCount +
          members.reduce((sum, m) => sum + m.unreadCount, 0);

        res.json({
          ok: true,
          me: {
            accountId: meId,
            displayName: req.session!.displayName,
            role: req.session!.role,
            employeeCode: req.session!.employeeCode,
          },
          groupChannel: {
            channelId: COMPANY_GROUP_CHANNEL_ID,
            name: 'Alorix Company Group Chat',
            memberCount: members.length + 1,
            onlineCount: onlineSet.size,
            ...groupMeta,
          },
          members,
          totalUnread,
        });
      } catch (error) {
        const errMsg =
          error instanceof Error ? error.message : 'Unable to load chat directory.';
        res.status(500).json({ ok: false, error: errMsg });
      }
    }
  );

  app.get(
    '/api/chat/messages',
    requireAnyAuth,
    async (req: AuthenticatedRequest, res) => {
      try {
        const meId = req.session!.accountId;
        const channelId = String(
          req.query?.channelId || COMPANY_GROUP_CHANNEL_ID
        ).trim();

        if (channelId !== COMPANY_GROUP_CHANNEL_ID) {
          const participants = parseDmParticipants(channelId);
          if (!participants || !participants.includes(meId)) {
            res.status(403).json({
              ok: false,
              error: 'You do not have access to this direct conversation.',
            });
            return;
          }
        }

        const all = await readChatMessages();
        const messages = all
          .filter((m) => m.channelId === channelId)
          .slice(-250);

        res.json({ ok: true, channelId, messages });
      } catch (error) {
        const errMsg =
          error instanceof Error ? error.message : 'Unable to load chat messages.';
        res.status(500).json({ ok: false, error: errMsg });
      }
    }
  );

  app.post(
    '/api/chat/messages',
    requireAnyAuth,
    async (req: AuthenticatedRequest, res) => {
      try {
        const s = req.session!;
        const text = String(req.body?.text || '').trim().slice(0, 2000);
        const rawChannelId = String(
          req.body?.channelId || COMPANY_GROUP_CHANNEL_ID
        ).trim();

        if (!text) {
          res.status(400).json({
            ok: false,
            error: 'Please enter a message before sending.',
          });
          return;
        }

        let channelId = COMPANY_GROUP_CHANNEL_ID;
        let channelType: 'group' | 'dm' = 'group';
        let recipientId: string | undefined;

        if (rawChannelId !== COMPANY_GROUP_CHANNEL_ID) {
          const participants = parseDmParticipants(rawChannelId);
          if (!participants || !participants.includes(s.accountId)) {
            res.status(403).json({
              ok: false,
              error: 'Invalid or unauthorized direct message channel.',
            });
            return;
          }
          channelId = buildDmChannelId(participants[0], participants[1]);
          channelType = 'dm';
          recipientId =
            participants[0] === s.accountId ? participants[1] : participants[0];
        }

        const created = await appendChatMessage({
          channelId,
          channelType,
          senderId: s.accountId,
          senderName: s.displayName,
          senderRole: s.role,
          ...(s.employeeCode ? { senderCode: s.employeeCode } : {}),
          ...(recipientId ? { recipientId } : {}),
          text,
        });

        broadcastPortalEvent(
          'chat:message',
          created,
          channelType === 'group'
            ? undefined
            : (client) =>
                client.accountId === s.accountId ||
                client.accountId === recipientId
        );

        res.status(201).json({ ok: true, message: created });
      } catch (error) {
        const errMsg =
          error instanceof Error ? error.message : 'Unable to send message.';
        res.status(500).json({ ok: false, error: errMsg });
      }
    }
  );

  app.post(
    '/api/chat/read',
    requireAnyAuth,
    async (req: AuthenticatedRequest, res) => {
      try {
        const meId = req.session!.accountId;
        const channelId = String(req.body?.channelId || '').trim();
        if (!channelId) {
          res.status(400).json({ ok: false, error: 'Missing channelId.' });
          return;
        }
        if (channelId !== COMPANY_GROUP_CHANNEL_ID) {
          const participants = parseDmParticipants(channelId);
          if (!participants || !participants.includes(meId)) {
            res.status(403).json({ ok: false, error: 'Unauthorized channel.' });
            return;
          }
        }
        const markedCount = await markChannelMessagesRead(channelId, meId);
        res.json({ ok: true, markedCount });
      } catch (error) {
        const errMsg =
          error instanceof Error ? error.message : 'Unable to mark chat read.';
        res.status(500).json({ ok: false, error: errMsg });
      }
    }
  );

  // =========================================================================
  // Scheduled Meetings (Admin Upload Time & URL + Automatic Live Alerts)
  // =========================================================================

  function normalizeMeetingUrl(raw: string): string | null {
    const trimmed = raw.trim();
    if (!trimmed) return null;
    const withProto = /^https?:\/\//i.test(trimmed)
      ? trimmed
      : `https://${trimmed}`;
    try {
      const u = new URL(withProto);
      if (u.protocol !== 'https:' && u.protocol !== 'http:') return null;
      return u.toString();
    } catch {
      return null;
    }
  }

  app.get('/api/admin/meetings', requireAdmin, async (_req, res) => {
    try {
      const meetings = await readMeetings();
      meetings.sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt));
      res.json({ ok: true, meetings });
    } catch (error) {
      const errMsg =
        error instanceof Error ? error.message : 'Unable to load meetings.';
      res.status(500).json({ ok: false, error: errMsg });
    }
  });

  app.post(
    '/api/admin/meetings',
    requireAdmin,
    async (req: AuthenticatedRequest, res) => {
      try {
        const title = String(req.body?.title || '').trim().slice(0, 140);
        const description = String(req.body?.description || '')
          .trim()
          .slice(0, 1500);
        const meetingUrl = normalizeMeetingUrl(String(req.body?.meetingUrl || ''));
        const scheduledAtRaw = String(req.body?.scheduledAt || '').trim();
        const durationMinutes = Math.max(
          5,
          Math.min(480, Math.round(Number(req.body?.durationMinutes) || 30))
        );
        const rawTargetType = String(req.body?.targetType || 'all')
          .trim()
          .toLowerCase();
        const targetType: MeetingTargetType =
          rawTargetType === 'employee' || rawTargetType === 'department'
            ? rawTargetType
            : 'all';

        if (title.length < 2) {
          res.status(400).json({
            ok: false,
            error: 'Please enter a meeting title (at least 2 characters).',
          });
          return;
        }
        if (!meetingUrl) {
          res.status(400).json({
            ok: false,
            error:
              'Please enter a valid meeting link (e.g., Google Meet, Zoom, or Teams URL).',
          });
          return;
        }
        const parsedTime = new Date(scheduledAtRaw);
        if (!scheduledAtRaw || Number.isNaN(parsedTime.getTime())) {
          res.status(400).json({
            ok: false,
            error: 'Please select a valid meeting date and time.',
          });
          return;
        }

        const employees = await readEmployees();
        let targetEmployeeIds: string[] = [];
        let targetLabels: string[] = [];
        let targetDepartment = '';

        if (targetType === 'employee') {
          const requestedIds = Array.isArray(req.body?.targetEmployeeIds)
            ? req.body.targetEmployeeIds.map((x: unknown) =>
                String(x || '').trim()
              )
            : [];
          const matched = employees.filter((e) => requestedIds.includes(e.id));
          if (matched.length === 0) {
            res.status(400).json({
              ok: false,
              error: 'Please select at least one employee for this meeting.',
            });
            return;
          }
          targetEmployeeIds = matched.map((e) => e.id);
          targetLabels = matched.map(
            (e) => `${e.employeeCode} (${e.fullName})`
          );
        } else if (targetType === 'department') {
          targetDepartment = String(req.body?.targetDepartment || '')
            .trim()
            .slice(0, 80);
          if (!targetDepartment) {
            res.status(400).json({
              ok: false,
              error: 'Please select or type a target department.',
            });
            return;
          }
          targetLabels = [`Department: ${targetDepartment}`];
        } else {
          targetLabels = ['All Team Members'];
        }

        const actor = req.session!.sub;
        const created = await createMeeting({
          title,
          description,
          meetingUrl,
          scheduledAt: parsedTime.toISOString(),
          durationMinutes,
          targetType,
          targetEmployeeIds,
          targetLabels,
          targetDepartment,
          createdBy: `${req.session!.displayName} (${actor})`,
        });

        const formattedWhen = new Intl.DateTimeFormat('en-IN', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        }).format(parsedTime);

        // Also persist a Notification so everyone sees the scheduled meeting immediately
        const ntf = await createNotification({
          title: `Meeting Scheduled: ${created.title}`,
          message: `Scheduled for ${formattedWhen} (${durationMinutes} min).\nJoin Link: ${created.meetingUrl}${
            created.description ? `\nAgenda: ${created.description}` : ''
          }`,
          priority: 'important',
          targetType: created.targetType,
          targetEmployeeIds: created.targetEmployeeIds,
          targetLabels: created.targetLabels,
          targetDepartment: created.targetDepartment,
          createdBy: created.createdBy,
          createdByRole:
            req.session!.role === 'super_admin' ? 'super_admin' : 'admin',
        });

        await appendAuditLog({
          actor,
          action: 'MEETING_SCHEDULED',
          target: created.title,
          detail: `Scheduled meeting for ${formattedWhen} (${targetLabels.join(', ')}) — ${created.meetingUrl}`,
        });

        broadcastPortalEvent(
          'meeting:created',
          created,
          (client) => clientMatchesTarget(client, created, true)
        );
        broadcastPortalEvent(
          'notification:new',
          {
            id: ntf.id,
            title: ntf.title,
            message: ntf.message,
            priority: ntf.priority,
            createdBy: ntf.createdBy,
            createdAt: ntf.createdAt,
            meetingUrl: created.meetingUrl,
          },
          (client) => clientMatchesTarget(client, created, false)
        );

        res.status(201).json({ ok: true, meeting: created });
      } catch (error) {
        const errMsg =
          error instanceof Error ? error.message : 'Unable to schedule meeting.';
        res.status(500).json({ ok: false, error: errMsg });
      }
    }
  );

  app.post(
    '/api/admin/meetings/:id/notify',
    requireAdmin,
    async (req: AuthenticatedRequest, res) => {
      try {
        const id = String(req.params.id || '');
        const meetings = await readMeetings();
        const meeting = meetings.find((m) => m.id === id);
        if (!meeting) {
          res.status(404).json({ ok: false, error: 'Meeting not found.' });
          return;
        }

        const ntf = await createNotification({
          title: `Meeting Alert: ${meeting.title}`,
          message: `Please join the meeting now.\nJoin Link: ${meeting.meetingUrl}${
            meeting.description ? `\nAgenda: ${meeting.description}` : ''
          }`,
          priority: 'urgent',
          targetType: meeting.targetType,
          targetEmployeeIds: meeting.targetEmployeeIds,
          targetLabels: meeting.targetLabels,
          targetDepartment: meeting.targetDepartment,
          createdBy: `${req.session!.displayName} (${req.session!.sub})`,
          createdByRole:
            req.session!.role === 'super_admin' ? 'super_admin' : 'admin',
        });

        broadcastPortalEvent(
          'meeting:started',
          { meeting, manualPing: true },
          (client) => clientMatchesTarget(client, meeting, true)
        );
        broadcastPortalEvent(
          'notification:new',
          {
            id: ntf.id,
            title: ntf.title,
            message: ntf.message,
            priority: ntf.priority,
            createdBy: ntf.createdBy,
            createdAt: ntf.createdAt,
            meetingUrl: meeting.meetingUrl,
          },
          (client) => clientMatchesTarget(client, meeting, false)
        );

        res.json({ ok: true, meeting });
      } catch (error) {
        const errMsg =
          error instanceof Error ? error.message : 'Unable to send meeting alert.';
        res.status(500).json({ ok: false, error: errMsg });
      }
    }
  );

  app.delete(
    '/api/admin/meetings/:id',
    requireAdmin,
    async (req: AuthenticatedRequest, res) => {
      try {
        const id = String(req.params.id || '');
        const removed = await deleteMeetingById(id);
        if (!removed) {
          res.status(404).json({ ok: false, error: 'Meeting not found.' });
          return;
        }
        await appendAuditLog({
          actor: req.session!.sub,
          action: 'MEETING_DELETED',
          target: removed.title,
          detail: `Removed scheduled meeting (${removed.scheduledAt}).`,
        });
        broadcastPortalEvent('meeting:deleted', { id: removed.id });
        res.json({ ok: true, removedId: removed.id });
      } catch (error) {
        const errMsg =
          error instanceof Error ? error.message : 'Unable to delete meeting.';
        res.status(500).json({ ok: false, error: errMsg });
      }
    }
  );

  app.get(
    '/api/employee/meetings',
    requireAnyAuth,
    async (req: AuthenticatedRequest, res) => {
      try {
        if (req.session!.role !== 'employee' || !req.employeeAccount) {
          res.status(403).json({ ok: false, error: 'Employee session required.' });
          return;
        }
        const all = await readMeetings();
        const mine = all
          .filter((m) => isMeetingTargetedToEmployee(m, req.employeeAccount!))
          .sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt));
        res.json({ ok: true, meetings: mine });
      } catch (error) {
        const errMsg =
          error instanceof Error ? error.message : 'Unable to load meetings.';
        res.status(500).json({ ok: false, error: errMsg });
      }
    }
  );

  // Automatic Background Meeting Notifier (fires 5-min reminder & exact start-time alert)
  async function checkScheduledMeetings(): Promise<void> {
    try {
      const meetings = await readMeetings();
      const nowMs = Date.now();
      const nowIso = new Date(nowMs).toISOString();

      for (const m of meetings) {
        const startMs = new Date(m.scheduledAt).getTime();
        if (!Number.isFinite(startMs)) continue;
        const endMs = startMs + m.durationMinutes * 60_000;
        const diffMs = startMs - nowMs;

        // 1. 5-minute heads-up reminder
        if (diffMs > 0 && diffMs <= 5 * 60_000 && !m.reminderNotifiedAt) {
          const updated = await updateMeetingById(m.id, (curr) => ({
            ...curr,
            reminderNotifiedAt: nowIso,
          }));
          if (updated) {
            const ntf = await createNotification({
              title: `Meeting in 5 Minutes: ${updated.title}`,
              message: `Starting soon! Join Link: ${updated.meetingUrl}${
                updated.description ? `\nAgenda: ${updated.description}` : ''
              }`,
              priority: 'important',
              targetType: updated.targetType,
              targetEmployeeIds: updated.targetEmployeeIds,
              targetLabels: updated.targetLabels,
              targetDepartment: updated.targetDepartment,
              createdBy: 'Alorix Meeting Scheduler',
              createdByRole: 'admin',
            });
            broadcastPortalEvent(
              'meeting:reminder',
              { meeting: updated },
              (client) => clientMatchesTarget(client, updated, true)
            );
            broadcastPortalEvent(
              'notification:new',
              {
                id: ntf.id,
                title: ntf.title,
                message: ntf.message,
                priority: ntf.priority,
                createdBy: ntf.createdBy,
                createdAt: ntf.createdAt,
                meetingUrl: updated.meetingUrl,
              },
              (client) => clientMatchesTarget(client, updated, false)
            );
          }
        }

        // 2. Exact meeting start time alert
        if (diffMs <= 0 && nowMs <= endMs && !m.startNotifiedAt) {
          const updated = await updateMeetingById(m.id, (curr) => ({
            ...curr,
            status: 'live',
            startNotifiedAt: nowIso,
          }));
          if (updated) {
            const ntf = await createNotification({
              title: `Meeting LIVE NOW: ${updated.title}`,
              message: `Your scheduled meeting is starting right now.\nJoin Link: ${updated.meetingUrl}${
                updated.description ? `\nAgenda: ${updated.description}` : ''
              }`,
              priority: 'urgent',
              targetType: updated.targetType,
              targetEmployeeIds: updated.targetEmployeeIds,
              targetLabels: updated.targetLabels,
              targetDepartment: updated.targetDepartment,
              createdBy: 'Alorix Meeting Scheduler',
              createdByRole: 'admin',
            });
            broadcastPortalEvent(
              'meeting:started',
              { meeting: updated },
              (client) => clientMatchesTarget(client, updated, true)
            );
            broadcastPortalEvent(
              'notification:new',
              {
                id: ntf.id,
                title: ntf.title,
                message: ntf.message,
                priority: ntf.priority,
                createdBy: ntf.createdBy,
                createdAt: ntf.createdAt,
                meetingUrl: updated.meetingUrl,
              },
              (client) => clientMatchesTarget(client, updated, false)
            );
          }
        }

        // 3. Transition finished meetings to completed
        if (nowMs > endMs && m.status !== 'completed') {
          await updateMeetingById(m.id, (curr) => ({
            ...curr,
            status: 'completed',
          }));
        }
      }
    } catch {
      // Never crash scheduler on transient file error
    }
  }

  setInterval(() => {
    void checkScheduledMeetings();
  }, 15_000);
  void checkScheduledMeetings();

  // =========================================================================
  // Admin Durable Storage Status, Full Snapshot Export & Restore Routes
  // =========================================================================

  app.get(
    '/api/admin/backup/summary',
    requireAdmin,
    async (req: AuthenticatedRequest, res) => {
      try {
        const [
          admins,
          employees,
          targets,
          extraWork,
          enquiries,
          auditLogs,
          notifications,
          sessionLogs,
          chatMessages,
          meetings,
          coreTs,
          targetTs,
          activityTs,
          commTs,
        ] = await Promise.all([
          readAdminAccounts(),
          readEmployees(),
          readWeeklyTargets(),
          readExtraWork(),
          readStoredEnquiries(),
          readAuditLogs(),
          readNotifications(),
          readSessionLogs(),
          readChatMessages(),
          readMeetings(),
          getCoreStorageTimestamps(),
          getTargetsStorageTimestamps(),
          getActivityStorageTimestamps(),
          getCommunicationStorageTimestamps(),
        ]);

        const isSuper = req.session!.role === 'super_admin';
        const visibleAuditCount = isSuper
          ? auditLogs.length
          : auditLogs.filter((l) => !l.superAdminOnly).length;
        const visibleSessionCount = isSuper
          ? sessionLogs.length
          : sessionLogs.filter((l) => l.role !== 'super_admin').length;

        res.json({
          ok: true,
          summary: {
            employees: {
              count: employees.length,
              updatedAt: coreTs.employeesUpdatedAt,
            },
            weeklyTargets: {
              count: targets.length,
              updatedAt: targetTs.targetsUpdatedAt,
            },
            extraWork: {
              count: extraWork.length,
              updatedAt: targetTs.extraWorkUpdatedAt,
            },
            notifications: {
              count: notifications.length,
              updatedAt: activityTs.notificationsUpdatedAt,
            },
            meetings: {
              count: meetings.length,
              updatedAt: commTs.meetingsUpdatedAt,
            },
            chatMessages: {
              count: chatMessages.length,
              updatedAt: commTs.chatUpdatedAt,
            },
            sessionLogs: {
              count: visibleSessionCount,
              updatedAt: activityTs.sessionLogsUpdatedAt,
            },
            enquiries: {
              count: enquiries.length,
              updatedAt: coreTs.enquiriesUpdatedAt,
            },
            auditLogs: {
              count: visibleAuditCount,
              updatedAt: coreTs.auditUpdatedAt,
            },
            ...(isSuper
              ? {
                  companyAdmins: {
                    count: admins.filter((a) => a.tier === 'admin').length,
                    updatedAt: coreTs.adminsUpdatedAt,
                  },
                }
              : {}),
          },
        });
      } catch (error) {
        const errMsg =
          error instanceof Error ? error.message : 'Unable to read storage summary.';
        res.status(500).json({ ok: false, error: errMsg });
      }
    }
  );

  app.get(
    '/api/admin/backup/export',
    requireAdmin,
    async (req: AuthenticatedRequest, res) => {
      try {
        const [
          admins,
          employees,
          targets,
          extraWork,
          enquiries,
          auditLogs,
          notifications,
          sessionLogs,
          chatMessages,
          meetings,
        ] = await Promise.all([
          readAdminAccounts(),
          readEmployees(),
          readWeeklyTargets(),
          readExtraWork(),
          readStoredEnquiries(),
          readAuditLogs(),
          readNotifications(),
          readSessionLogs(),
          readChatMessages(),
          readMeetings(),
        ]);

        const isSuper = req.session!.role === 'super_admin';

        const snapshot = {
          schemaVersion: 3,
          service: 'alorix-global-international',
          exportedAt: new Date().toISOString(),
          exportedBy: req.session!.sub,
          collections: {
            employees,
            weeklyTargets: targets,
            extraWork,
            notifications,
            meetings,
            chatMessages,
            sessionLogs: isSuper
              ? sessionLogs
              : sessionLogs.filter((l) => l.role !== 'super_admin'),
            enquiries,
            auditLogs: isSuper
              ? auditLogs
              : auditLogs.filter((l) => !l.superAdminOnly),
            ...(isSuper
              ? {
                  companyAdmins: admins.filter((a) => a.tier === 'admin'),
                }
              : {}),
          },
        };

        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.setHeader(
          'Content-Disposition',
          `attachment; filename="alorix-backup-${new Date().toISOString().slice(0, 10)}.json"`
        );
        res.send(`${JSON.stringify(snapshot, null, 2)}\n`);
      } catch (error) {
        const errMsg =
          error instanceof Error ? error.message : 'Unable to export backup.';
        res.status(500).json({ ok: false, error: errMsg });
      }
    }
  );

  app.post(
    '/api/admin/backup/import',
    express.json({ limit: '5mb' }),
    requireAdmin,
    async (req: AuthenticatedRequest, res) => {
      try {
        const payload = req.body as {
          service?: string;
          collections?: {
            employees?: StoredEmployee[];
            weeklyTargets?: StoredWeeklyTarget[];
            extraWork?: StoredExtraWork[];
            notifications?: StoredNotification[];
            meetings?: StoredMeeting[];
            chatMessages?: StoredChatMessage[];
            sessionLogs?: StoredSessionLog[];
            enquiries?: StoredEnquiry[];
            auditLogs?: AdminAuditEntry[];
            companyAdmins?: StoredAdminAccount[];
          };
        };

        if (
          !payload ||
          payload.service !== 'alorix-global-international' ||
          !payload.collections ||
          typeof payload.collections !== 'object'
        ) {
          res.status(400).json({
            ok: false,
            error: 'Invalid Alorix backup file format.',
          });
          return;
        }

        const cols = payload.collections;
        const restored: Record<string, number> = {};

        if (Array.isArray(cols.employees)) {
          await writeEmployees(cols.employees);
          restored.employees = cols.employees.length;
        }
        if (Array.isArray(cols.weeklyTargets)) {
          await writeWeeklyTargets(cols.weeklyTargets);
          restored.weeklyTargets = cols.weeklyTargets.length;
        }
        if (Array.isArray(cols.extraWork)) {
          await writeExtraWork(cols.extraWork);
          restored.extraWork = cols.extraWork.length;
        }
        if (Array.isArray(cols.notifications)) {
          await writeNotifications(cols.notifications);
          restored.notifications = cols.notifications.length;
        }
        if (Array.isArray(cols.meetings)) {
          await writeMeetings(cols.meetings);
          restored.meetings = cols.meetings.length;
        }
        if (Array.isArray(cols.chatMessages)) {
          await writeChatMessages(cols.chatMessages);
          restored.chatMessages = cols.chatMessages.length;
        }
        if (Array.isArray(cols.sessionLogs)) {
          await writeSessionLogs(cols.sessionLogs);
          restored.sessionLogs = cols.sessionLogs.length;
        }
        if (Array.isArray(cols.enquiries)) {
          await writeStoredEnquiries(cols.enquiries);
          restored.enquiries = cols.enquiries.length;
        }
        if (Array.isArray(cols.auditLogs)) {
          await writeAuditLogs(cols.auditLogs);
          restored.auditLogs = cols.auditLogs.length;
        }
        if (
          req.session!.role === 'super_admin' &&
          Array.isArray(cols.companyAdmins) &&
          cols.companyAdmins.length > 0
        ) {
          const existingAdmins = await readAdminAccounts();
          const superAdmins = existingAdmins.filter(
            (a) => a.tier === 'super_admin' || a.id === SUPER_ADMIN_ID
          );
          const restoredAdmins = cols.companyAdmins.filter(
            (a) => a && a.tier === 'admin' && a.id !== SUPER_ADMIN_ID
          );
          await writeAdminAccounts([...superAdmins, ...restoredAdmins]);
          restored.companyAdmins = restoredAdmins.length;
        }

        res.json({ ok: true, restored });
      } catch (error) {
        const errMsg =
          error instanceof Error ? error.message : 'Unable to restore backup.';
        res.status(500).json({ ok: false, error: errMsg });
      }
    }
  );

  // =========================================================================
  // Public Business Enquiry Endpoint
  // =========================================================================

  app.post('/api/enquiry', async (req, res) => {
    try {
      const body = (req.body || {}) as EnquiryPayload;
      const fullName = String(body.fullName || '').trim();
      const companyName = String(body.companyName || '').trim();
      const businessEmail = String(body.businessEmail || '').trim();
      const phone = String(body.phone || '').trim();
      const country = String(body.country || '').trim();
      const chemicalInterest = String(body.chemicalInterest || '').trim();
      const packagingFormat = String(body.packagingFormat || '').trim();
      const incoterm = String(body.incoterm || '').trim();
      const message = String(body.message || '').trim();

      if (!fullName || !companyName || !businessEmail || !country || !chemicalInterest || !message) {
        res.status(400).json({
          ok: false,
          error: 'Please complete all required business enquiry fields.',
        });
        return;
      }

      if (!isValidEmail(businessEmail)) {
        res.status(400).json({
          ok: false,
          error: 'Please provide a valid business email address.',
        });
        return;
      }

      if (message.length < 10) {
        res.status(400).json({
          ok: false,
          error: 'Please include brief details about your chemical sourcing or supply requirements.',
        });
        return;
      }

      const id = `AGL-${Date.now().toString(36).toUpperCase()}-${Math.random()
        .toString(36)
        .slice(2, 6)
        .toUpperCase()}`;

      const entry: StoredEnquiry = {
        id,
        submittedAt: new Date().toISOString(),
        fullName,
        companyName,
        businessEmail,
        phone: phone || 'Not provided',
        country,
        chemicalInterest,
        packagingFormat: packagingFormat || 'To Be Discussed',
        incoterm: incoterm || 'To Be Confirmed',
        message,
        deliveryChannel: 'server_archive',
        solved: false,
        solvedAt: null,
        solvedBy: null,
        solvedNote: '',
      };

      const channel = await forwardExternalIfConfigured(entry);
      entry.deliveryChannel = channel;
      await persistEnquiry(entry);
      broadcastPortalEvent('enquiry:created', entry);

      res.status(201).json({
        ok: true,
        referenceId: entry.id,
        submittedAt: entry.submittedAt,
        deliveryChannel: channel,
      });
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : 'Unable to process enquiry.';
      res.status(500).json({
        ok: false,
        error: errMsg,
      });
    }
  });

  return {
    app,
    connectedClients,
    getOnlineAccountIds,
    broadcastPresence,
    checkScheduledMeetings,
  };
}

async function startServer() {
  // Ensure admin store is seeded cleanly on boot
  await readAdminAccounts();

  const {
    app,
    connectedClients,
    getOnlineAccountIds,
    broadcastPresence,
  } = createPortalExpressApp();

  const isProd = process.env.NODE_ENV === 'production';
  if (!isProd) {
    const vitePkg = 'vite';
    const { createServer: createViteServer } = await import(
      /* @vite-ignore */ vitePkg
    );
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.join(currentDirPath, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  const server = http.createServer(app);
  const wss = new WebSocketServer({ noServer: true });

  server.on('upgrade', async (req, socket, head) => {
    try {
      const reqUrl = new URL(
        req.url || '/',
        `http://${req.headers.host || 'localhost'}`
      );
      if (reqUrl.pathname !== '/ws/portal') {
        return;
      }

      const queryToken = reqUrl.searchParams.get('token') || undefined;
      const token =
        queryToken ||
        extractTokenFromRequest(
          typeof req.headers.authorization === 'string'
            ? req.headers.authorization
            : undefined,
          typeof req.headers.cookie === 'string' ? req.headers.cookie : undefined
        );

      if (!token) {
        socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
        socket.destroy();
        return;
      }

      const payload = await verifySessionToken(token);
      if (!payload) {
        socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
        socket.destroy();
        return;
      }

      let department: string | undefined;
      if (payload.role === 'employee') {
        const employees = await readEmployees();
        const emp = employees.find((e) => e.id === payload.accountId);
        if (
          !emp ||
          emp.status !== 'active' ||
          emp.passwordUpdatedAt !== payload.pwTs
        ) {
          socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
          socket.destroy();
          return;
        }
        department = emp.department;
      } else {
        const admins = await readAdminAccounts();
        const acc = admins.find((a) => a.id === payload.accountId);
        if (
          !acc ||
          acc.status !== 'active' ||
          acc.passwordUpdatedAt !== payload.pwTs
        ) {
          socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
          socket.destroy();
          return;
        }
      }

      wss.handleUpgrade(req, socket, head, (ws) => {
        const client: ConnectedPortalClient = {
          ws,
          accountId: payload.accountId,
          role: payload.role,
          displayName: payload.displayName,
          department,
          employeeCode: payload.employeeCode,
        };
        connectedClients.add(client);

        ws.send(
          JSON.stringify({
            event: 'connected',
            payload: {
              accountId: payload.accountId,
              onlineAccountIds: getOnlineAccountIds(),
            },
          })
        );
        broadcastPresence();

        ws.on('message', (raw) => {
          try {
            const parsed = JSON.parse(String(raw));
            if (parsed && parsed.type === 'ping') {
              ws.send(
                JSON.stringify({ event: 'pong', payload: { ts: Date.now() } })
              );
            }
          } catch {
            // Ignore malformed client frames
          }
        });

        ws.on('close', () => {
          connectedClients.delete(client);
          broadcastPresence();
        });

        ws.on('error', () => {
          connectedClients.delete(client);
          broadcastPresence();
        });
      });
    } catch {
      socket.destroy();
    }
  });

  server.listen(PORT, '0.0.0.0', () => {
    console.log(
      `Alorix Global International server + WebSocket listening on http://0.0.0.0:${PORT}`
    );
  });
}

const isDirectEntry =
  Boolean(currentFilePath) &&
  Boolean(process.argv[1]) &&
  path.resolve(process.argv[1]) === currentFilePath;

if (isDirectEntry) {
  startServer();
}
