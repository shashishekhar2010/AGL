export interface DrivePhotoAttachment {
  id: string;
  label: string;
  url: string;
  addedAt: string;
}

export function isValidGoogleDriveUrl(raw: string): boolean {
  try {
    const parsed = new URL(raw.trim());
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return false;
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

/**
 * Extracts a Google Drive file ID from common shareable link formats:
 * - https://drive.google.com/file/d/<ID>/view?usp=sharing
 * - https://drive.google.com/open?id=<ID>
 * - https://drive.google.com/uc?id=<ID>&export=view
 * - https://drive.google.com/thumbnail?id=<ID>
 */
export function extractGoogleDriveFileId(rawUrl: string): string | null {
  try {
    const url = new URL(rawUrl.trim());
    const fileMatch = url.pathname.match(/\/file\/d\/([a-zA-Z0-9_-]{10,})/);
    if (fileMatch && fileMatch[1]) {
      return fileMatch[1];
    }
    const idParam = url.searchParams.get('id');
    if (idParam && /^[a-zA-Z0-9_-]{10,}$/.test(idParam)) {
      return idParam;
    }
    return null;
  } catch {
    return null;
  }
}

export function getDriveThumbnailUrl(rawUrl: string): string | null {
  const trimmed = rawUrl.trim();
  try {
    const parsed = new URL(trimmed);
    if (parsed.hostname.toLowerCase() === 'lh3.googleusercontent.com') {
      return trimmed;
    }
  } catch {
    return null;
  }
  const fileId = extractGoogleDriveFileId(trimmed);
  if (!fileId) return null;
  return `https://drive.google.com/thumbnail?id=${fileId}&sz=w900`;
}

export function getCurrentWeekRange(): { weekStart: string; weekEnd: string } {
  const now = new Date();
  const day = now.getDay(); // 0 = Sun, 1 = Mon, ...
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const monday = new Date(now);
  monday.setDate(now.getDate() + diffToMonday);

  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  const toIsoDate = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${dd}`;
  };

  return {
    weekStart: toIsoDate(monday),
    weekEnd: toIsoDate(sunday),
  };
}

export function formatShortDate(isoDate: string): string {
  if (!isoDate) return '';
  try {
    const date = isoDate.length === 10 ? new Date(`${isoDate}T00:00:00`) : new Date(isoDate);
    return new Intl.DateTimeFormat('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(date);
  } catch {
    return isoDate;
  }
}

export function formatDateTime(iso: string): string {
  if (!iso) return '';
  try {
    return new Intl.DateTimeFormat('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}
