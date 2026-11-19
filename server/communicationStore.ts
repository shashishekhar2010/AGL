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
export const CHAT_MESSAGES_FILE = path.join(DATA_DIR, 'chat_messages.json');
export const MEETINGS_FILE = path.join(DATA_DIR, 'meetings.json');

export const COMPANY_GROUP_CHANNEL_ID = 'company-group';

export type ChatChannelType = 'group' | 'dm';

export interface StoredChatMessage {
  id: string;
  channelId: string;
  channelType: ChatChannelType;
  senderId: string;
  senderName: string;
  senderRole: SessionRole;
  senderCode?: string;
  recipientId?: string;
  text: string;
  createdAt: string;
  readBy: string[];
}

export type MeetingTargetType = 'all' | 'employee' | 'department';
export type MeetingStatus = 'scheduled' | 'live' | 'completed';

export interface StoredMeeting {
  id: string;
  title: string;
  description: string;
  meetingUrl: string;
  scheduledAt: string; // ISO timestamp
  durationMinutes: number;
  targetType: MeetingTargetType;
  targetEmployeeIds: string[];
  targetLabels: string[];
  targetDepartment: string;
  createdBy: string;
  createdAt: string;
  reminderNotifiedAt: string | null;
  startNotifiedAt: string | null;
  status: MeetingStatus;
}

export function buildDmChannelId(accountIdA: string, accountIdB: string): string {
  const sorted = [accountIdA, accountIdB].sort((a, b) => a.localeCompare(b));
  return `dm:${sorted[0]}:${sorted[1]}`;
}

export function parseDmParticipants(channelId: string): [string, string] | null {
  if (!channelId.startsWith('dm:')) return null;
  const rest = channelId.slice(3);
  const parts = rest.split(':');
  if (parts.length !== 2 || !parts[0] || !parts[1]) return null;
  return [parts[0], parts[1]];
}

// ============================================================================
// Persistent Chat Messages Store (Group Chat + 1-on-1 Direct Messages)
// ============================================================================

export async function readChatMessages(): Promise<StoredChatMessage[]> {
  return readJsonArraySafe<StoredChatMessage>(CHAT_MESSAGES_FILE);
}

export async function writeChatMessages(
  messages: StoredChatMessage[]
): Promise<void> {
  await withFileLock(CHAT_MESSAGES_FILE, () =>
    writeJsonArrayDurable(CHAT_MESSAGES_FILE, messages)
  );
}

export async function appendChatMessage(
  input: Omit<StoredChatMessage, 'id' | 'createdAt' | 'readBy'>
): Promise<StoredChatMessage> {
  return withFileLock(CHAT_MESSAGES_FILE, async () => {
    const existing = await readJsonArraySafe<StoredChatMessage>(
      CHAT_MESSAGES_FILE
    );
    const created: StoredChatMessage = {
      ...input,
      id: `MSG-${Date.now().toString(36).toUpperCase()}-${crypto
        .randomBytes(3)
        .toString('hex')
        .toUpperCase()}`,
      createdAt: new Date().toISOString(),
      readBy: [input.senderId],
    };
    existing.push(created);
    await writeJsonArrayDurable(CHAT_MESSAGES_FILE, existing);
    return created;
  });
}

export async function markChannelMessagesRead(
  channelId: string,
  readerAccountId: string
): Promise<number> {
  return withFileLock(CHAT_MESSAGES_FILE, async () => {
    const existing = await readJsonArraySafe<StoredChatMessage>(
      CHAT_MESSAGES_FILE
    );
    let updated = 0;
    for (let i = 0; i < existing.length; i += 1) {
      const m = existing[i];
      if (m.channelId !== channelId) continue;
      if (m.readBy.includes(readerAccountId)) continue;
      existing[i] = {
        ...m,
        readBy: [...m.readBy, readerAccountId],
      };
      updated += 1;
    }
    if (updated > 0) {
      await writeJsonArrayDurable(CHAT_MESSAGES_FILE, existing);
    }
    return updated;
  });
}

// ============================================================================
// Persistent Meetings Store
// ============================================================================

export async function readMeetings(): Promise<StoredMeeting[]> {
  return readJsonArraySafe<StoredMeeting>(MEETINGS_FILE);
}

export async function writeMeetings(meetings: StoredMeeting[]): Promise<void> {
  await withFileLock(MEETINGS_FILE, () =>
    writeJsonArrayDurable(MEETINGS_FILE, meetings)
  );
}

export async function createMeeting(
  input: Omit<
    StoredMeeting,
    'id' | 'createdAt' | 'reminderNotifiedAt' | 'startNotifiedAt' | 'status'
  >
): Promise<StoredMeeting> {
  return withFileLock(MEETINGS_FILE, async () => {
    const existing = await readJsonArraySafe<StoredMeeting>(MEETINGS_FILE);
    const created: StoredMeeting = {
      ...input,
      id: `MTG-${Date.now().toString(36).toUpperCase()}-${crypto
        .randomBytes(2)
        .toString('hex')
        .toUpperCase()}`,
      createdAt: new Date().toISOString(),
      reminderNotifiedAt: null,
      startNotifiedAt: null,
      status: 'scheduled',
    };
    existing.unshift(created);
    await writeJsonArrayDurable(MEETINGS_FILE, existing);
    return created;
  });
}

export async function updateMeetingById(
  id: string,
  updater: (current: StoredMeeting) => StoredMeeting
): Promise<StoredMeeting | null> {
  return withFileLock(MEETINGS_FILE, async () => {
    const existing = await readJsonArraySafe<StoredMeeting>(MEETINGS_FILE);
    const idx = existing.findIndex((m) => m.id === id);
    if (idx === -1) return null;
    const updated = updater(existing[idx]);
    existing[idx] = updated;
    await writeJsonArrayDurable(MEETINGS_FILE, existing);
    return updated;
  });
}

export async function deleteMeetingById(id: string): Promise<StoredMeeting | null> {
  return withFileLock(MEETINGS_FILE, async () => {
    const existing = await readJsonArraySafe<StoredMeeting>(MEETINGS_FILE);
    const idx = existing.findIndex((m) => m.id === id);
    if (idx === -1) return null;
    const [removed] = existing.splice(idx, 1);
    await writeJsonArrayDurable(MEETINGS_FILE, existing);
    return removed;
  });
}

export function isMeetingTargetedToEmployee(
  meeting: StoredMeeting,
  employee: { id: string; department: string }
): boolean {
  if (meeting.targetType === 'all') return true;
  if (meeting.targetType === 'employee') {
    return meeting.targetEmployeeIds.includes(employee.id);
  }
  if (meeting.targetType === 'department') {
    return (
      meeting.targetDepartment.trim().toLowerCase() ===
      employee.department.trim().toLowerCase()
    );
  }
  return false;
}

export async function getCommunicationStorageTimestamps(): Promise<{
  chatUpdatedAt: string | null;
  meetingsUpdatedAt: string | null;
}> {
  const [chatUpdatedAt, meetingsUpdatedAt] = await Promise.all([
    getFileLastModified(CHAT_MESSAGES_FILE),
    getFileLastModified(MEETINGS_FILE),
  ]);
  return { chatUpdatedAt, meetingsUpdatedAt };
}
