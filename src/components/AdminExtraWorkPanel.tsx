import { useMemo, useState, type FormEvent } from 'react';
import {
  Calendar,
  CheckCircle2,
  FileCheck2,
  Search,
  Sparkles,
  Trash2,
  X,
  XCircle,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { DrivePhotoGallery } from './DrivePhotoAttachments';
import {
  formatDateTime,
  formatShortDate,
  type DrivePhotoAttachment,
} from '../utils/driveLinks';

export interface ExtraWorkRecord {
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
    status: 'pending_review' | 'verified' | 'rejected';
    remarks: string;
    verifiedBy: string | null;
    verifiedAt: string | null;
  };
}

interface AdminExtraWorkPanelProps {
  items: ExtraWorkRecord[];
  authFetch: (url: string, init?: RequestInit) => Promise<Response>;
  onReload: () => void;
  showToast: (msg: string) => void;
}

const STATUS_BADGES: Record<
  ExtraWorkRecord['verification']['status'],
  { label: string; className: string }
> = {
  pending_review: {
    label: 'Pending Verification',
    className: 'bg-amber-500/14 text-amber-300 border-amber-500/35',
  },
  verified: {
    label: 'Verified by Admin',
    className: 'bg-emerald-500/14 text-emerald-300 border-emerald-500/35',
  },
  rejected: {
    label: 'Needs Clarification',
    className: 'bg-[#e0231c]/14 text-[#ff7b76] border-[#e0231c]/35',
  },
};

export default function AdminExtraWorkPanel({
  items,
  authFetch,
  onReload,
  showToast,
}: AdminExtraWorkPanelProps) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const [reviewItem, setReviewItem] = useState<ExtraWorkRecord | null>(null);
  const [decision, setDecision] = useState<'verified' | 'rejected'>('verified');
  const [remarks, setRemarks] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((item) => {
      if (statusFilter !== 'all' && item.verification.status !== statusFilter) {
        return false;
      }
      if (!q) return true;
      return [
        item.title,
        item.category,
        item.description,
        item.impact,
        item.employeeCode,
        item.employeeName,
      ]
        .join(' ')
        .toLowerCase()
        .includes(q);
    });
  }, [items, search, statusFilter]);

  const openReview = (item: ExtraWorkRecord) => {
    setReviewItem(item);
    setDecision(item.verification.status === 'rejected' ? 'rejected' : 'verified');
    setRemarks(item.verification.remarks || '');
  };

  const handleSaveReview = async (e: FormEvent) => {
    e.preventDefault();
    if (!reviewItem) return;
    setSubmitting(true);
    try {
      const res = await authFetch(`/api/admin/extra-work/${reviewItem.id}/verify`, {
        method: 'POST',
        body: JSON.stringify({
          status: decision,
          remarks: remarks.trim(),
        }),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        setReviewItem(null);
        showToast('Extra work review saved.');
        onReload();
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    const res = await authFetch(`/api/admin/extra-work/${id}`, {
      method: 'DELETE',
    });
    if (res.ok) {
      showToast('Extra work entry removed.');
      onReload();
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <p className="font-mono-tech text-[11px] uppercase tracking-[0.16em] text-[#e8ad26]">
          Beyond Assigned Targets
        </p>
        <h1 className="font-display font-normal text-2xl text-[#dfe7e0]">
          Employee Extra Work &amp; Contributions
        </h1>
        <p className="text-xs text-[#9aa5a0]">
          Review additional tasks, initiatives, and Google Drive work screenshots
          submitted by employees outside their assigned weekly targets.
        </p>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
        <div className="relative md:col-span-8">
          <Search className="w-4 h-4 text-[#8a968f] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search employee, extra task title, category, or impact..."
            className="w-full pl-9 pr-3 py-2 text-xs bg-[#0a0e14] border border-[#dfe7e0]/15 rounded-md text-[#dfe7e0] placeholder:text-[#66726c] focus:outline-none focus:border-[#e0231c]"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="md:col-span-4 px-3 py-2 text-xs bg-[#0a0e14] border border-[#dfe7e0]/15 rounded-md text-[#dfe7e0] focus:outline-none focus:border-[#e0231c]"
        >
          <option value="all">All Statuses</option>
          <option value="pending_review">Pending Verification</option>
          <option value="verified">Verified</option>
          <option value="rejected">Needs Clarification</option>
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-xl bg-[#0a0e14] border border-[#dfe7e0]/12 p-10 text-center space-y-2">
          <Sparkles className="w-8 h-8 text-[#8a968f] mx-auto" />
          <p className="text-sm text-[#dfe7e0]">No extra work submissions yet</p>
          <p className="text-xs text-[#8a968f]">
            When employees log additional tasks or upload Google Drive screenshots
            from their Extra Work panel, they will appear here for your verification.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((item) => {
            const badge = STATUS_BADGES[item.verification.status];
            return (
              <article
                key={item.id}
                className="rounded-xl bg-[#0a0e14] border border-[#dfe7e0]/14 p-5 sm:p-6 space-y-4"
              >
                <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-3">
                  <div className="space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono-tech text-[11px] text-[#e8ad26] bg-[#e8ad26]/10 border border-[#e8ad26]/25 px-2 py-0.5 rounded">
                        {item.employeeCode} · {item.employeeName}
                      </span>
                      <span className="text-[11px] text-[#b4bfb7] bg-white/[0.04] border border-[#dfe7e0]/12 px-2 py-0.5 rounded">
                        {item.category}
                      </span>
                      <span className="inline-flex items-center gap-1 text-[11px] font-mono-tech text-[#9aa5a0]">
                        <Calendar className="w-3 h-3" />
                        {formatShortDate(item.datePerformed)}
                      </span>
                      <span
                        className={`text-[10px] font-mono-tech uppercase px-2 py-0.5 rounded border ${badge.className}`}
                      >
                        {badge.label}
                      </span>
                    </div>

                    <h2 className="font-display font-normal text-lg text-[#dfe7e0]">
                      {item.title}
                    </h2>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => openReview(item)}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-white bg-[#e0231c] hover:bg-[#c81e17] rounded-md transition-colors whitespace-nowrap"
                    >
                      <FileCheck2 className="w-3.5 h-3.5" />
                      <span>Verify</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(item.id)}
                      aria-label="Delete extra work entry"
                      className="w-9 h-9 rounded-md border border-[#dfe7e0]/15 hover:border-[#e0231c]/50 flex items-center justify-center text-[#8a968f] hover:text-[#ff6b66] transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="rounded-lg bg-[#06090e] border border-[#dfe7e0]/10 p-4 space-y-3">
                  <p className="text-xs text-[#d1dad4] leading-relaxed whitespace-pre-wrap">
                    {item.description}
                  </p>
                  {item.impact && (
                    <p className="text-xs text-[#e8ad26]/90">
                      Outcome / Impact: {item.impact}
                    </p>
                  )}

                  <div className="pt-2 space-y-2">
                    <p className="text-[11px] font-mono-tech uppercase tracking-[0.12em] text-[#8a968f]">
                      Attached Work Screenshots (Google Drive Links ·{' '}
                      {item.driveLinks.length})
                    </p>
                    <DrivePhotoGallery
                      links={item.driveLinks}
                      emptyLabel="No Google Drive screenshots attached."
                    />
                  </div>
                </div>

                {item.verification.verifiedAt && (
                  <div className="rounded-lg bg-[#080d14] border border-[#e8ad26]/20 px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                    <div className="space-y-0.5">
                      <p className="text-[#e8ad26] font-medium">
                        Admin Review · {badge.label}
                      </p>
                      {item.verification.remarks && (
                        <p className="text-[#c7d1ca]">
                          Remarks: {item.verification.remarks}
                        </p>
                      )}
                    </div>
                    <span className="text-[11px] font-mono-tech text-[#8a968f]">
                      {item.verification.verifiedBy} ·{' '}
                      {formatDateTime(item.verification.verifiedAt)}
                    </span>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}

      {/* Verify Modal */}
      <AnimatePresence>
        {reviewItem && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-[#020305]/82 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setReviewItem(null)}
          >
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 12 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md rounded-xl bg-[#0a0e14] border border-[#dfe7e0]/16 p-6 space-y-5 shadow-2xl"
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="font-display font-normal text-lg text-[#dfe7e0]">
                    Verify Extra Work
                  </h2>
                  <p className="text-xs text-[#8a968f]">
                    {reviewItem.employeeCode} · {reviewItem.title}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setReviewItem(null)}
                  className="w-8 h-8 rounded-md border border-[#dfe7e0]/15 flex items-center justify-center text-[#9aa5a0] hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSaveReview} className="space-y-4">
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setDecision('verified')}
                    className={`px-3 py-2.5 rounded-md border text-xs flex items-center justify-center gap-1.5 ${
                      decision === 'verified'
                        ? 'bg-emerald-500/15 border-emerald-500/45 text-emerald-200'
                        : 'bg-[#05070a] border-[#dfe7e0]/12 text-[#9aa5a0]'
                    }`}
                  >
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>Verify Work</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setDecision('rejected')}
                    className={`px-3 py-2.5 rounded-md border text-xs flex items-center justify-center gap-1.5 ${
                      decision === 'rejected'
                        ? 'bg-[#e0231c]/15 border-[#e0231c]/45 text-[#ffb4b1]'
                        : 'bg-[#05070a] border-[#dfe7e0]/12 text-[#9aa5a0]'
                    }`}
                  >
                    <XCircle className="w-4 h-4 text-[#ff6b66]" />
                    <span>Needs Clarification</span>
                  </button>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-[#b4bfb7]">
                    Admin Remarks
                  </label>
                  <textarea
                    rows={3}
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                    placeholder="Add appreciation note or clarification request..."
                    className="w-full px-3 py-2 text-xs bg-[#05070a] border border-[#dfe7e0]/15 rounded-md text-[#dfe7e0] placeholder:text-[#66726c] focus:outline-none focus:border-[#e0231c]"
                  />
                </div>

                <div className="flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setReviewItem(null)}
                    className="px-4 py-2 text-xs text-[#b4bfb7] border border-[#dfe7e0]/15 rounded-md"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-4 py-2 text-xs font-medium text-white bg-[#e0231c] hover:bg-[#c81e17] rounded-md"
                  >
                    {submitting ? 'Saving...' : 'Save Review'}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
