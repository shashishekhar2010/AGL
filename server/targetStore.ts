import crypto from 'node:crypto';
import path from 'node:path';
import {
  getFileLastModified,
  readJsonArraySafe,
  withFileLock,
  writeJsonArrayDurable,
} from './fileDb.ts';

const DATA_DIR = path.resolve(process.cwd(), 'data');
export const TARGETS_FILE = path.join(DATA_DIR, 'weekly_targets.json');
export const EXTRA_WORK_FILE = path.join(DATA_DIR, 'extra_work.json');

export type TargetPriority = 'high' | 'medium' | 'low';

export type EmployeeCompletionStatus =
  | 'not_started'
  | 'in_progress'
  | 'completed'
  | 'not_completed';

export type TargetVerificationStatus =
  | 'pending_report'
  | 'pending_review'
  | 'verified_completed'
  | 'needs_revision'
  | 'marked_incomplete';

export type ExtraWorkVerificationStatus =
  | 'pending_review'
  | 'verified'
  | 'rejected';

export interface DrivePhotoAttachment {
  id: string;
  label: string;
  url: string;
  addedAt: string;
}

export interface StoredWeeklyTarget {
  id: string;
  employeeId: string;
  employeeCode: string;
  employeeName: string;
  employeeRole: string;
  department: string;
  weekStart: string;
  weekEnd: string;
  title: string;
  description: string;
  targetMetric: string;
  priority: TargetPriority;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  report: {
    completionStatus: EmployeeCompletionStatus;
    progressPercent: number;
    completedWork: string;
    notCompletedReason: string;
    driveLinks: DrivePhotoAttachment[];
    submittedAt: string | null;
  };
  verification: {
    status: TargetVerificationStatus;
    remarks: string;
    verifiedBy: string | null;
    verifiedAt: string | null;
  };
}

export interface StoredExtraWork {
  id: string;
  employeeId: string;
  employeeCode: string;
  employeeName: string;
  employeeRole: string;
  department: string;
  datePerformed: string;
  title: string;
  category: string;
  description: string;
  impact: string;
  driveLinks: DrivePhotoAttachment[];
  submittedAt: string;
  updatedAt: string;
  verification: {
    status: ExtraWorkVerificationStatus;
    remarks: string;
    verifiedBy: string | null;
    verifiedAt: string | null;
  };
}

export function isValidDriveLinkUrl(rawUrl: string): boolean {
  try {
    const parsed = new URL(rawUrl.trim());
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
      return false;
    }
    const host = parsed.hostname.toLowerCase();
    return (
      host === 'drive.google.com' ||
      host.endsWith('.drive.google.com') ||
      host === 'docs.google.com' ||
      host === 'photos.google.com' ||
      host === 'lh3.googleusercontent.com' ||
      host === 'drive.usercontent.google.com'
    );
  } catch {
    return false;
  }
}

export function normalizeDriveLinks(raw: unknown): {
  links: DrivePhotoAttachment[];
  error?: string;
} {
  if (!Array.isArray(raw)) {
    return { links: [] };
  }
  const now = new Date().toISOString();
  const normalized: DrivePhotoAttachment[] = [];

  for (const item of raw.slice(0, 10)) {
    if (!item || typeof item !== 'object') continue;
    const obj = item as Record<string, unknown>;
    const url = String(obj.url || '').trim();
    if (!url) continue;

    if (!isValidDriveLinkUrl(url)) {
      return {
        links: [],
        error:
          'Please provide a valid Google Drive link (e.g., https://drive.google.com/...).',
      };
    }

    const label =
      String(obj.label || '').trim().slice(0, 100) ||
      `Work Screenshot ${normalized.length + 1}`;

    normalized.push({
      id:
        typeof obj.id === 'string' && obj.id.trim()
          ? obj.id.trim().slice(0, 64)
          : crypto.randomUUID(),
      label,
      url: url.slice(0, 600),
      addedAt:
        typeof obj.addedAt === 'string' && obj.addedAt.trim()
          ? obj.addedAt
          : now,
    });
  }

  return { links: normalized };
}

export async function readWeeklyTargets(): Promise<StoredWeeklyTarget[]> {
  return readJsonArraySafe<StoredWeeklyTarget>(TARGETS_FILE);
}

export async function writeWeeklyTargets(
  targets: StoredWeeklyTarget[]
): Promise<void> {
  await withFileLock(TARGETS_FILE, () =>
    writeJsonArrayDurable(TARGETS_FILE, targets)
  );
}

export async function mutateWeeklyTargets<T>(
  mutator: (targets: StoredWeeklyTarget[]) => Promise<T> | T
): Promise<T> {
  return withFileLock(TARGETS_FILE, async () => {
    const targets = await readJsonArraySafe<StoredWeeklyTarget>(TARGETS_FILE);
    const result = await mutator(targets);
    await writeJsonArrayDurable(TARGETS_FILE, targets);
    return result;
  });
}

export async function readExtraWork(): Promise<StoredExtraWork[]> {
  return readJsonArraySafe<StoredExtraWork>(EXTRA_WORK_FILE);
}

export async function writeExtraWork(items: StoredExtraWork[]): Promise<void> {
  await withFileLock(EXTRA_WORK_FILE, () =>
    writeJsonArrayDurable(EXTRA_WORK_FILE, items)
  );
}

export async function mutateExtraWork<T>(
  mutator: (items: StoredExtraWork[]) => Promise<T> | T
): Promise<T> {
  return withFileLock(EXTRA_WORK_FILE, async () => {
    const items = await readJsonArraySafe<StoredExtraWork>(EXTRA_WORK_FILE);
    const result = await mutator(items);
    await writeJsonArrayDurable(EXTRA_WORK_FILE, items);
    return result;
  });
}

export async function getTargetsStorageTimestamps(): Promise<{
  targetsUpdatedAt: string | null;
  extraWorkUpdatedAt: string | null;
}> {
  const [targetsUpdatedAt, extraWorkUpdatedAt] = await Promise.all([
    getFileLastModified(TARGETS_FILE),
    getFileLastModified(EXTRA_WORK_FILE),
  ]);
  return { targetsUpdatedAt, extraWorkUpdatedAt };
}
