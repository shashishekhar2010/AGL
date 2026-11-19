import crypto from 'node:crypto';
import path from 'node:path';
import {
  getFileLastModified,
  readJsonArraySafe,
  withFileLock,
  writeJsonArrayDurable,
} from './fileDb.ts';
import type { SessionRole } from './adminStore.ts';

const DATA_DIR = path.resolve(process.cwd(), 'data');
export const NOTIFICATIONS_FILE = path.join(DATA_DIR, 'notifications.json');
export const SESSION_LOGS_FILE = path.join(DATA_DIR, 'session_logs.json');

export type NotificationPriority = 'normal' | 'important' | 'urgent';
export type NotificationTargetType = 'all' | 'employee' | 'department';

export interface NotificationReadReceipt {
  employeeId: string;
  employeeCode: string;
  employeeName: string;
  readAt: string;
}

export interface StoredNotification {
  id: string;
  title: string;
  message: string;
  priority: NotificationPriority;
  targetType: NotificationTargetType;
  targetEmployeeIds: string[];
  targetLabels: string[];
  targetDepartment: string;
  createdBy: string;
  createdByRole: 'super_admin' | 'admin';
  createdAt: string;
  readBy: NotificationReadReceipt[];
}

export type SessionLogStatus = 'active' | 'logged_out';

export interface StoredSessionLog {
  id: string;
  sessionId: string;
  accountId: string;
  username: string;
  employeeCode?: string;
  displayName: string;
  role: SessionRole;
  department?: string;
  loginAt: string;
  logoutAt: string | null;
  durationSeconds: number | null;
  status: SessionLogStatus;
  userAgent?: string;
}

// ============================================================================
// Notifications Store
// ============================================================================

export async function readNotifications(): Promise<StoredNotification[]> {
  return readJsonArraySafe<StoredNotification>(NOTIFICATIONS_FILE);
}

export async function writeNotifications(
  items: StoredNotification[]
): Promise<void> {
  await withFileLock(NOTIFICATIONS_FILE, () =>
    writeJsonArrayDurable(NOTIFICATIONS_FILE, items)
  );
}

export async function createNotification(
  input: Omit<StoredNotification, 'id' | 'createdAt' | 'readBy'>
): Promise<StoredNotification> {
  return withFileLock(NOTIFICATIONS_FILE, async () => {
    const existing = await readJsonArraySafe<StoredNotification>(
      NOTIFICATIONS_FILE
    );
    const created: StoredNotification = {
      ...input,
      id: `NTF-${Date.now().toString(36).toUpperCase()}-${crypto
        .randomBytes(2)
        .toString('hex')
        .toUpperCase()}`,
      createdAt: new Date().toISOString(),
      readBy: [],
    };
    existing.unshift(created);
    await writeJsonArrayDurable(NOTIFICATIONS_FILE, existing);
    return created;
  });
}

export async function markNotificationReadForEmployee(
  notificationId: string,
  employee: { id: string; employeeCode: string; fullName: string }
): Promise<StoredNotification | null> {
  return withFileLock(NOTIFICATIONS_FILE, async () => {
    const items = await readJsonArraySafe<StoredNotification>(
      NOTIFICATIONS_FILE
    );
    const idx = items.findIndex((n) => n.id === notificationId);
    if (idx === -1) return null;

    const target = items[idx];
    const alreadyRead = target.readBy.some(
      (r) => r.employeeId === employee.id
    );
    if (!alreadyRead) {
      target.readBy = [
        ...target.readBy,
        {
          employeeId: employee.id,
          employeeCode: employee.employeeCode,
          employeeName: employee.fullName,
          readAt: new Date().toISOString(),
        },
      ];
      items[idx] = target;
      await writeJsonArrayDurable(NOTIFICATIONS_FILE, items);
    }
    return target;
  });
}

export async function markAllNotificationsReadForEmployee(employee: {
  id: string;
  employeeCode: string;
  fullName: string;
  department: string;
}): Promise<number> {
  return withFileLock(NOTIFICATIONS_FILE, async () => {
    const items = await readJsonArraySafe<StoredNotification>(
      NOTIFICATIONS_FILE
    );
    const now = new Date().toISOString();
    let updatedCount = 0;

    for (let i = 0; i < items.length; i += 1) {
      const n = items[i];
      if (!isNotificationTargetedToEmployee(n, employee)) continue;
      if (n.readBy.some((r) => r.employeeId === employee.id)) continue;

      items[i] = {
        ...n,
        readBy: [
          ...n.readBy,
          {
            employeeId: employee.id,
            employeeCode: employee.employeeCode,
            employeeName: employee.fullName,
            readAt: now,
          },
        ],
      };
      updatedCount += 1;
    }

    if (updatedCount > 0) {
      await writeJsonArrayDurable(NOTIFICATIONS_FILE, items);
    }
    return updatedCount;
  });
}

export async function deleteNotificationById(id: string): Promise<boolean> {
  return withFileLock(NOTIFICATIONS_FILE, async () => {
    const items = await readJsonArraySafe<StoredNotification>(
      NOTIFICATIONS_FILE
    );
    const idx = items.findIndex((n) => n.id === id);
    if (idx === -1) return false;
    items.splice(idx, 1);
    await writeJsonArrayDurable(NOTIFICATIONS_FILE, items);
    return true;
  });
}

export function isNotificationTargetedToEmployee(
  notification: StoredNotification,
  employee: { id: string; department: string }
): boolean {
  if (notification.targetType === 'all') return true;
  if (notification.targetType === 'employee') {
    return notification.targetEmployeeIds.includes(employee.id);
  }
  if (notification.targetType === 'department') {
    return (
      notification.targetDepartment.trim().toLowerCase() ===
      employee.department.trim().toLowerCase()
    );
  }
  return false;
}

// ============================================================================
// Login & Logout Session Activity Logs Store
// ============================================================================

export async function readSessionLogs(): Promise<StoredSessionLog[]> {
  return readJsonArraySafe<StoredSessionLog>(SESSION_LOGS_FILE);
}

export async function writeSessionLogs(
  logs: StoredSessionLog[]
): Promise<void> {
  await withFileLock(SESSION_LOGS_FILE, () =>
    writeJsonArrayDurable(SESSION_LOGS_FILE, logs)
  );
}

export async function recordLoginSession(entry: {
  sessionId: string;
  accountId: string;
  username: string;
  employeeCode?: string;
  displayName: string;
  role: SessionRole;
  department?: string;
  userAgent?: string;
}): Promise<StoredSessionLog> {
  return withFileLock(SESSION_LOGS_FILE, async () => {
    const logs = await readJsonArraySafe<StoredSessionLog>(SESSION_LOGS_FILE);
    const now = new Date().toISOString();
    const record: StoredSessionLog = {
      id: `SES-${Date.now().toString(36).toUpperCase()}-${crypto
        .randomBytes(2)
        .toString('hex')
        .toUpperCase()}`,
      sessionId: entry.sessionId,
      accountId: entry.accountId,
      username: entry.username,
      ...(entry.employeeCode ? { employeeCode: entry.employeeCode } : {}),
      displayName: entry.displayName,
      role: entry.role,
      ...(entry.department ? { department: entry.department } : {}),
      loginAt: now,
      logoutAt: null,
      durationSeconds: null,
      status: 'active',
      ...(entry.userAgent ? { userAgent: entry.userAgent.slice(0, 180) } : {}),
    };
    logs.unshift(record);
    await writeJsonArrayDurable(SESSION_LOGS_FILE, logs);
    return record;
  });
}

export async function recordLogoutSession(params: {
  sessionId?: string;
  accountId: string;
  username: string;
  employeeCode?: string;
  displayName: string;
  role: SessionRole;
}): Promise<StoredSessionLog> {
  return withFileLock(SESSION_LOGS_FILE, async () => {
    const logs = await readJsonArraySafe<StoredSessionLog>(SESSION_LOGS_FILE);
    const now = new Date().toISOString();
    const nowMs = Date.now();

    let idx = -1;
    if (params.sessionId) {
      idx = logs.findIndex((l) => l.sessionId === params.sessionId);
    }
    if (idx === -1) {
      idx = logs.findIndex(
        (l) => l.accountId === params.accountId && l.status === 'active'
      );
    }

    if (idx !== -1) {
      const existing = logs[idx];
      const loginMs = new Date(existing.loginAt).getTime();
      const durationSeconds = Number.isFinite(loginMs)
        ? Math.max(0, Math.round((nowMs - loginMs) / 1000))
        : 0;

      const updated: StoredSessionLog = {
        ...existing,
        logoutAt: now,
        durationSeconds,
        status: 'logged_out',
      };
      logs[idx] = updated;
      await writeJsonArrayDurable(SESSION_LOGS_FILE, logs);
      return updated;
    }

    // Fallback if session was created before session log tracking existed
    const fallback: StoredSessionLog = {
      id: `SES-${Date.now().toString(36).toUpperCase()}-${crypto
        .randomBytes(2)
        .toString('hex')
        .toUpperCase()}`,
      sessionId: params.sessionId || crypto.randomUUID(),
      accountId: params.accountId,
      username: params.username,
      ...(params.employeeCode ? { employeeCode: params.employeeCode } : {}),
      displayName: params.displayName,
      role: params.role,
      loginAt: now,
      logoutAt: now,
      durationSeconds: 0,
      status: 'logged_out',
    };
    logs.unshift(fallback);
    await writeJsonArrayDurable(SESSION_LOGS_FILE, logs);
    return fallback;
  });
}

export async function getActivityStorageTimestamps(): Promise<{
  notificationsUpdatedAt: string | null;
  sessionLogsUpdatedAt: string | null;
}> {
  const [notificationsUpdatedAt, sessionLogsUpdatedAt] = await Promise.all([
    getFileLastModified(NOTIFICATIONS_FILE),
    getFileLastModified(SESSION_LOGS_FILE),
  ]);
  return { notificationsUpdatedAt, sessionLogsUpdatedAt };
}
