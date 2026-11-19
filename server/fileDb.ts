import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

const fileLocks = new Map<string, Promise<unknown>>();

/**
 * Serializes async operations targeting the same file path so concurrent
 * read-modify-write requests never clobber each other.
 */
export function withFileLock<T>(
  filePath: string,
  task: () => Promise<T>
): Promise<T> {
  const key = path.resolve(filePath);
  const previous = fileLocks.get(key) ?? Promise.resolve();
  const next = previous.catch(() => undefined).then(() => task());
  fileLocks.set(key, next);
  next.finally(() => {
    if (fileLocks.get(key) === next) {
      fileLocks.delete(key);
    }
  });
  return next;
}

/**
 * Safely reads UTF-8 text from local disk, falling back to the rolling .bak copy.
 */
export async function readTextSafe(filePath: string): Promise<string | null> {
  const candidates = [filePath, `${filePath}.bak`];
  for (const candidate of candidates) {
    try {
      const raw = await fs.readFile(candidate, 'utf8');
      if (raw.length > 0) return raw;
    } catch {
      // Try next candidate
    }
  }
  return null;
}

/**
 * Durably writes text content to disk via temp file + fsync + atomic rename,
 * keeping a rolling .bak copy of the previous valid file for crash recovery.
 */
export async function atomicWriteText(
  filePath: string,
  content: string
): Promise<void> {
  await fs.mkdir(path.dirname(filePath), { recursive: true });

  // Maintain rolling backup of existing non-empty file
  try {
    const stat = await fs.stat(filePath);
    if (stat.size > 0) {
      await fs.copyFile(filePath, `${filePath}.bak`);
    }
  } catch {
    // Primary file may not exist yet
  }

  const tmpPath = `${filePath}.${crypto.randomBytes(6).toString('hex')}.tmp`;
  const handle = await fs.open(tmpPath, 'w');
  try {
    await handle.writeFile(content, 'utf8');
    await handle.sync();
  } finally {
    await handle.close();
  }

  await fs.rename(tmpPath, filePath);
}

/**
 * Safely reads a JSON array from disk, automatically falling back to the
 * rolling .bak copy if the primary file is missing or corrupted.
 */
export async function readJsonArraySafe<T>(filePath: string): Promise<T[]> {
  const candidates = [filePath, `${filePath}.bak`];
  for (const candidate of candidates) {
    try {
      const raw = await fs.readFile(candidate, 'utf8');
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed as T[];
      }
    } catch {
      // Try next candidate
    }
  }
  return [];
}

export async function writeJsonArrayDurable<T>(
  filePath: string,
  records: T[]
): Promise<void> {
  await atomicWriteText(filePath, `${JSON.stringify(records, null, 2)}\n`);
}

export async function getFileLastModified(
  filePath: string
): Promise<string | null> {
  try {
    const stat = await fs.stat(filePath);
    return stat.mtime.toISOString();
  } catch {
    return null;
  }
}
