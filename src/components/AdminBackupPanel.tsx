import { useCallback, useEffect, useRef, useState, type ChangeEvent } from 'react';
import {
  CheckCircle2,
  Database,
  Download,
  HardDrive,
  RefreshCw,
  Upload,
} from 'lucide-react';
import { formatDateTime } from '../utils/driveLinks';

interface StorageCollectionStat {
  count: number;
  updatedAt: string | null;
}

interface StorageSummary {
  employees: StorageCollectionStat;
  weeklyTargets: StorageCollectionStat;
  extraWork: StorageCollectionStat;
  notifications: StorageCollectionStat;
  meetings: StorageCollectionStat;
  chatMessages: StorageCollectionStat;
  sessionLogs: StorageCollectionStat;
  enquiries: StorageCollectionStat;
  auditLogs: StorageCollectionStat;
  companyAdmins?: StorageCollectionStat;
}

export default function AdminBackupPanel({
  authFetch,
  onReloadAll,
  showToast,
}: {
  authFetch: (url: string, init?: RequestInit) => Promise<Response>;
  onReloadAll: () => void;
  showToast: (msg: string) => void;
}) {
  const [summary, setSummary] = useState<StorageSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [restoreMessage, setRestoreMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const loadSummary = useCallback(async () => {
    setLoading(true);
    try {
      const res = await authFetch('/api/admin/backup/summary');
      if (res.ok) {
        const data = await res.json();
        if (data.ok && data.summary) {
          setSummary(data.summary);
        }
      }
    } finally {
      setLoading(false);
    }
  }, [authFetch]);

  useEffect(() => {
    loadSummary();
  }, [loadSummary]);

  const handleExport = async () => {
    setExporting(true);
    setRestoreMessage(null);
    try {
      const res = await authFetch('/api/admin/backup/export');
      if (!res.ok) {
        setRestoreMessage({
          type: 'error',
          text: 'Unable to export backup snapshot.',
        });
        return;
      }
      const text = await res.text();
      const blob = new Blob([text], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `alorix-backup-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      showToast('Full Alorix data backup downloaded.');
    } catch {
      setRestoreMessage({
        type: 'error',
        text: 'Network error while downloading backup.',
      });
    } finally {
      setExporting(false);
    }
  };

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setRestoring(true);
    setRestoreMessage(null);
    try {
      const raw = await file.text();
      const parsed = JSON.parse(raw);

      const res = await authFetch('/api/admin/backup/import', {
        method: 'POST',
        body: JSON.stringify(parsed),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setRestoreMessage({
          type: 'error',
          text: data.error || 'Invalid backup file.',
        });
        return;
      }

      const restoredSummary = Object.entries(data.restored || {})
        .map(([k, v]) => `${k}: ${v}`)
        .join(', ');
      setRestoreMessage({
        type: 'success',
        text: `Backup restored and saved to server (${restoredSummary}).`,
      });
      showToast('Backup restored successfully.');
      await loadSummary();
      onReloadAll();
    } catch {
      setRestoreMessage({
        type: 'error',
        text: 'Could not read backup JSON file. Make sure it is an Alorix backup file.',
      });
    } finally {
      setRestoring(false);
    }
  };

  const rows: { label: string; desc: string; stat?: StorageCollectionStat }[] = [
    {
      label: 'Employee Accounts',
      desc: 'Employee IDs, login IDs, roles, permissions, notes & hashed passwords',
      stat: summary?.employees,
    },
    {
      label: 'Weekly Targets & Reports',
      desc: 'Assigned weekly goals, employee progress reports, reasons, Drive links & verifications',
      stat: summary?.weeklyTargets,
    },
    {
      label: 'Extra Work Logs',
      desc: 'Additional employee tasks, descriptions, Drive screenshots & admin verifications',
      stat: summary?.extraWork,
    },
    {
      label: 'Notification Centre',
      desc: 'All dispatched staff announcements, priority notices & employee read receipts',
      stat: summary?.notifications,
    },
    {
      label: 'Scheduled Meetings',
      desc: 'Meeting titles, scheduled times, meeting URLs & automatic alert logs',
      stat: summary?.meetings,
    },
    {
      label: 'Team & Group Chat Messages',
      desc: 'Company Group Chat and private 1-on-1 direct conversation history',
      stat: summary?.chatMessages,
    },
    {
      label: 'Login & Logout Activity Logs',
      desc: 'Recorded login timestamps, logout timestamps & session durations across staff and admins',
      stat: summary?.sessionLogs,
    },
    {
      label: 'Website Enquiries',
      desc: 'All customer quote and sourcing requests submitted via the public site',
      stat: summary?.enquiries,
    },
    {
      label: 'Security Audit Log',
      desc: 'Recorded login, creation, modification, password & verification history',
      stat: summary?.auditLogs,
    },
    ...(summary?.companyAdmins
      ? [
          {
            label: 'Company Admin Accounts',
            desc: 'Managed admin login IDs, display names, statuses & hashed passwords',
            stat: summary.companyAdmins,
          },
        ]
      : []),
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <p className="font-mono-tech text-[11px] uppercase tracking-[0.16em] text-[#e8ad26]">
            Durable Persistence &amp; Portability
          </p>
          <h1 className="font-display font-normal text-2xl text-[#dfe7e0]">
            Saved Data &amp; Backup Vault
          </h1>
          <p className="text-xs text-[#9aa5a0]">
            Every employee account, weekly target, progress report, Google Drive
            screenshot link, extra work entry, enquiry, and admin credential change
            is atomically written and synced to server storage with automatic
            crash-recovery backups.
          </p>
        </div>

        <button
          type="button"
          onClick={loadSummary}
          disabled={loading}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-[#b4bfb7] hover:text-white bg-[#0a0e14] border border-[#dfe7e0]/15 rounded-md whitespace-nowrap shrink-0"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Verify Counts</span>
        </button>
      </div>

      {/* Live Saved Collections Table */}
      <section className="rounded-xl bg-[#0a0e14] border border-[#dfe7e0]/14 overflow-hidden">
        <div className="px-5 py-4 border-b border-[#dfe7e0]/10 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-xs font-medium text-[#dfe7e0]">
            <HardDrive className="w-4 h-4 text-[#e8ad26]" />
            <span>Live Server Storage Collections</span>
          </div>
          <span className="inline-flex items-center gap-1 text-[11px] text-emerald-300">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Atomic Sync Active
          </span>
        </div>

        <div className="divide-y divide-[#dfe7e0]/8">
          {rows.map((row) => (
            <div
              key={row.label}
              className="px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
            >
              <div className="space-y-0.5">
                <p className="text-xs font-medium text-[#dfe7e0]">{row.label}</p>
                <p className="text-[11px] text-[#8a968f]">{row.desc}</p>
              </div>
              <div className="flex items-center gap-4 shrink-0">
                <div className="text-right">
                  <p className="font-mono-tech text-sm tabular-nums text-[#e8ad26]">
                    {row.stat ? row.stat.count : '—'} saved
                  </p>
                  <p className="text-[10px] font-mono-tech text-[#8a968f]">
                    {row.stat?.updatedAt
                      ? `Updated ${formatDateTime(row.stat.updatedAt)}`
                      : 'Ready'}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Export / Restore Backup Actions */}
      <section className="rounded-xl bg-[#0a0e14] border border-[#dfe7e0]/14 p-6 space-y-4">
        <div className="flex items-start gap-3">
          <Database className="w-5 h-5 text-[#e8ad26] shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h2 className="font-display font-normal text-lg text-[#dfe7e0]">
              Portable Snapshot Backup &amp; Restore
            </h2>
            <p className="text-xs text-[#9aa5a0] leading-relaxed">
              Download a complete JSON snapshot of all saved records for offline
              archiving, or restore a previous backup file anytime.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 pt-1">
          <button
            type="button"
            onClick={handleExport}
            disabled={exporting}
            className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-medium uppercase tracking-[0.08em] text-white bg-[#e0231c] hover:bg-[#c81e17] disabled:opacity-60 rounded-md transition-colors whitespace-nowrap"
          >
            <Download className="w-4 h-4" />
            <span>{exporting ? 'Exporting...' : 'Download Full Backup (.json)'}</span>
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept="application/json,.json"
            onChange={handleFileChange}
            className="hidden"
          />

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={restoring}
            className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-medium text-[#dfe7e0] bg-[#05070a] hover:bg-[#121822] border border-[#dfe7e0]/20 hover:border-[#e8ad26]/50 disabled:opacity-60 rounded-md transition-colors whitespace-nowrap"
          >
            <Upload className="w-4 h-4 text-[#e8ad26]" />
            <span>{restoring ? 'Restoring...' : 'Restore from Backup (.json)'}</span>
          </button>
        </div>

        {restoreMessage && (
          <p
            className={`text-xs rounded-md px-3.5 py-2.5 border ${
              restoreMessage.type === 'success'
                ? 'bg-emerald-500/12 border-emerald-500/35 text-emerald-300'
                : 'bg-[#e0231c]/12 border-[#e0231c]/35 text-[#ff6b66]'
            }`}
          >
            {restoreMessage.text}
          </p>
        )}
      </section>
    </div>
  );
}
