import { useEffect, useMemo, useState, type FormEvent } from 'react';
import {
  AlertTriangle,
  Calendar,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  Pencil,
  Plus,
  Send,
  Sparkles,
  Target,
  Trash2,
  X,
  XCircle,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { DriveLinkEditor, DrivePhotoGallery } from './DrivePhotoAttachments';
import type { WeeklyTargetRecord } from './AdminWeeklyTargetsPanel';
import type { ExtraWorkRecord } from './AdminExtraWorkPanel';
import {
  formatDateTime,
  formatShortDate,
  type DrivePhotoAttachment,
} from '../utils/driveLinks';

const TARGET_BADGES: Record<
  WeeklyTargetRecord['verification']['status'],
  { label: string; className: string }
> = {
  pending_report: {
    label: 'Action Required · Submit Report',
    className: 'bg-[#e8ad26]/12 text-[#e8ad26] border-[#e8ad26]/35',
  },
  pending_review: {
    label: 'Submitted · Awaiting Admin Verification',
    className: 'bg-amber-500/14 text-amber-300 border-amber-500/35',
  },
  verified_completed: {
    label: 'Verified Completed by Admin',
    className: 'bg-emerald-500/14 text-emerald-300 border-emerald-500/35',
  },
  needs_revision: {
    label: 'Revision Requested by Admin',
    className: 'bg-orange-500/14 text-orange-300 border-orange-500/35',
  },
  marked_incomplete: {
    label: 'Confirmed Incomplete by Admin',
    className: 'bg-[#e0231c]/14 text-[#ff7b76] border-[#e0231c]/35',
  },
};

const EXTRA_WORK_CATEGORIES = [
  'Client Support',
  'Sales Outreach',
  'Export & Logistics',
  'Quality & Compliance',
  'Documentation & Admin',
  'Process Improvement',
  'Other Additional Work',
];

export function EmployeeWeeklyTargetsView({
  targets,
  authFetch,
  onReload,
  showToast,
}: {
  targets: WeeklyTargetRecord[];
  authFetch: (url: string, init?: RequestInit) => Promise<Response>;
  onReload: () => void;
  showToast: (msg: string) => void;
}) {
  const [reportingTarget, setReportingTarget] = useState<WeeklyTargetRecord | null>(
    null
  );
  const [completionStatus, setCompletionStatus] = useState<
    'in_progress' | 'completed' | 'not_completed'
  >('completed');
  const [progressPercent, setProgressPercent] = useState(100);
  const [completedWork, setCompletedWork] = useState('');
  const [notCompletedReason, setNotCompletedReason] = useState('');
  const [driveLinks, setDriveLinks] = useState<DrivePhotoAttachment[]>([]);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const summary = useMemo(() => {
    const verified = targets.filter(
      (t) => t.verification.status === 'verified_completed'
    ).length;
    const awaitingReview = targets.filter(
      (t) => t.verification.status === 'pending_review'
    ).length;
    const actionNeeded = targets.filter(
      (t) =>
        t.verification.status === 'pending_report' ||
        t.verification.status === 'needs_revision'
    ).length;
    return { total: targets.length, verified, awaitingReview, actionNeeded };
  }, [targets]);

  const openReportModal = (target: WeeklyTargetRecord) => {
    setReportingTarget(target);
    const draftKey = `alorix_draft_target_report_${target.id}`;
    let restoredDraft: {
      completionStatus?: 'in_progress' | 'completed' | 'not_completed';
      progressPercent?: number;
      completedWork?: string;
      notCompletedReason?: string;
      driveLinks?: DrivePhotoAttachment[];
    } | null = null;
    try {
      const raw = window.localStorage.getItem(draftKey);
      if (raw) restoredDraft = JSON.parse(raw);
    } catch {
      restoredDraft = null;
    }

    const initialStatus =
      restoredDraft?.completionStatus ||
      (target.report.completionStatus === 'not_started'
        ? 'completed'
        : target.report.completionStatus);
    setCompletionStatus(initialStatus);
    setProgressPercent(
      typeof restoredDraft?.progressPercent === 'number'
        ? restoredDraft.progressPercent
        : target.report.submittedAt
          ? target.report.progressPercent
          : initialStatus === 'completed'
            ? 100
            : 50
    );
    setCompletedWork(
      restoredDraft?.completedWork ?? target.report.completedWork ?? ''
    );
    setNotCompletedReason(
      restoredDraft?.notCompletedReason ?? target.report.notCompletedReason ?? ''
    );
    setDriveLinks(
      Array.isArray(restoredDraft?.driveLinks)
        ? restoredDraft.driveLinks
        : target.report.driveLinks || []
    );
    setFormError(null);
  };

  // Auto-save unsubmitted target report draft locally so typing is never lost
  useEffect(() => {
    if (!reportingTarget) return;
    try {
      window.localStorage.setItem(
        `alorix_draft_target_report_${reportingTarget.id}`,
        JSON.stringify({
          completionStatus,
          progressPercent,
          completedWork,
          notCompletedReason,
          driveLinks,
        })
      );
    } catch {
      // ignore quota errors
    }
  }, [
    reportingTarget,
    completionStatus,
    progressPercent,
    completedWork,
    notCompletedReason,
    driveLinks,
  ]);

  const handleStatusChange = (
    next: 'in_progress' | 'completed' | 'not_completed'
  ) => {
    setCompletionStatus(next);
    if (next === 'completed') setProgressPercent(100);
    else if (next === 'not_completed' && progressPercent === 100) {
      setProgressPercent(0);
    } else if (next === 'in_progress' && (progressPercent === 0 || progressPercent === 100)) {
      setProgressPercent(50);
    }
  };

  const handleSubmitReport = async (e: FormEvent) => {
    e.preventDefault();
    if (!reportingTarget) return;
    setFormError(null);
    setSubmitting(true);

    try {
      const res = await authFetch(
        `/api/employee/targets/${reportingTarget.id}/report`,
        {
          method: 'POST',
          body: JSON.stringify({
            completionStatus,
            progressPercent: completionStatus === 'completed' ? 100 : progressPercent,
            completedWork: completedWork.trim(),
            notCompletedReason: notCompletedReason.trim(),
            driveLinks,
          }),
        }
      );
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setFormError(data.error || 'Unable to submit target report.');
        return;
      }
      try {
        window.localStorage.removeItem(
          `alorix_draft_target_report_${reportingTarget.id}`
        );
      } catch {
        // ignore
      }
      setReportingTarget(null);
      showToast('Weekly target report saved and submitted for Admin verification.');
      onReload();
    } catch {
      setFormError('Network error while submitting report.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <p className="font-mono-tech text-[11px] uppercase tracking-[0.16em] text-[#e8ad26]">
          Assigned Weekly Deliverables
        </p>
        <h1 className="font-display font-normal text-2xl text-[#dfe7e0]">
          My Weekly Targets
        </h1>
        <p className="text-xs text-[#9aa5a0]">
          Report what you have completed, state reasons if anything could not be
          finished, and attach Google Drive work screenshot links for Admin
          verification.
        </p>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="rounded-lg bg-[#0a0e14] border border-[#dfe7e0]/12 p-4 space-y-1">
          <p className="text-[11px] font-mono-tech uppercase tracking-[0.12em] text-[#8a968f]">
            Assigned
          </p>
          <p className="text-2xl font-mono-tech tabular-nums text-[#dfe7e0]">
            {summary.total}
          </p>
        </div>
        <div className="rounded-lg bg-[#0a0e14] border border-[#e8ad26]/25 p-4 space-y-1">
          <p className="text-[11px] font-mono-tech uppercase tracking-[0.12em] text-[#e8ad26]">
            Action Needed
          </p>
          <p className="text-2xl font-mono-tech tabular-nums text-[#e8ad26]">
            {summary.actionNeeded}
          </p>
        </div>
        <div className="rounded-lg bg-[#0a0e14] border border-amber-500/25 p-4 space-y-1">
          <p className="text-[11px] font-mono-tech uppercase tracking-[0.12em] text-amber-300">
            Awaiting Review
          </p>
          <p className="text-2xl font-mono-tech tabular-nums text-amber-300">
            {summary.awaitingReview}
          </p>
        </div>
        <div className="rounded-lg bg-[#0a0e14] border border-emerald-500/25 p-4 space-y-1">
          <p className="text-[11px] font-mono-tech uppercase tracking-[0.12em] text-emerald-300">
            Verified Done
          </p>
          <p className="text-2xl font-mono-tech tabular-nums text-emerald-300">
            {summary.verified}
          </p>
        </div>
      </div>

      {targets.length === 0 ? (
        <div className="rounded-xl bg-[#0a0e14] border border-[#dfe7e0]/12 p-10 text-center space-y-2">
          <Target className="w-8 h-8 text-[#8a968f] mx-auto" />
          <p className="text-sm text-[#dfe7e0]">No weekly targets assigned yet</p>
          <p className="text-xs text-[#8a968f]">
            Weekly goals assigned by your Administrator will appear here automatically.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {targets.map((target) => {
            const badge = TARGET_BADGES[target.verification.status];
            const isVerified = target.verification.status === 'verified_completed';

            return (
              <article
                key={target.id}
                className="rounded-xl bg-[#0a0e14] border border-[#dfe7e0]/14 p-5 sm:p-6 space-y-4"
              >
                <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-3">
                  <div className="space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center gap-1 text-[11px] font-mono-tech text-[#e8ad26]">
                        <Calendar className="w-3 h-3" />
                        {formatShortDate(target.weekStart)} –{' '}
                        {formatShortDate(target.weekEnd)}
                      </span>
                      <span
                        className={`text-[10px] font-mono-tech uppercase px-2 py-0.5 rounded border ${
                          target.priority === 'high'
                            ? 'bg-[#e0231c]/12 text-[#ff7b76] border-[#e0231c]/30'
                            : target.priority === 'low'
                              ? 'bg-white/[0.04] text-[#9aa5a0] border-[#dfe7e0]/15'
                              : 'bg-amber-500/10 text-amber-300 border-amber-500/25'
                        }`}
                      >
                        {target.priority} priority
                      </span>
                      <span
                        className={`text-[10px] font-mono-tech uppercase px-2 py-0.5 rounded border ${badge.className}`}
                      >
                        {badge.label}
                      </span>
                    </div>

                    <h2 className="font-display font-normal text-lg text-[#dfe7e0]">
                      {target.title}
                    </h2>
                    {target.targetMetric && (
                      <p className="text-xs text-[#e8ad26]">
                        Target Goal: {target.targetMetric}
                      </p>
                    )}
                    {target.description && (
                      <p className="text-xs text-[#9aa5a0] leading-relaxed">
                        {target.description}
                      </p>
                    )}
                  </div>

                  {isVerified ? (
                    <span className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md bg-emerald-500/12 border border-emerald-500/35 text-xs font-medium text-emerald-300 shrink-0">
                      <CheckCircle2 className="w-4 h-4" />
                      Verified Completed
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => openReportModal(target)}
                      className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-[#e0231c] hover:bg-[#c81e17] rounded-md transition-colors whitespace-nowrap shrink-0"
                    >
                      <ClipboardCheck className="w-3.5 h-3.5" />
                      <span>
                        {target.report.submittedAt
                          ? 'Update Progress Report'
                          : 'Submit Progress Report'}
                      </span>
                    </button>
                  )}
                </div>

                {/* Progress Bar */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] font-mono-tech text-[#8a968f]">
                    <span>Reported Progress</span>
                    <span className="text-[#dfe7e0]">
                      {target.report.progressPercent}%
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-[#0e141d] rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all ${
                        isVerified
                          ? 'bg-emerald-400'
                          : target.report.completionStatus === 'not_completed'
                            ? 'bg-[#e0231c]'
                            : 'bg-[#e8ad26]'
                      }`}
                      style={{ width: `${target.report.progressPercent}%` }}
                    />
                  </div>
                </div>

                {/* Submitted Report Details */}
                {target.report.submittedAt && (
                  <div className="rounded-lg bg-[#06090e] border border-[#dfe7e0]/10 p-4 space-y-3">
                    <div className="flex items-center justify-between text-[11px] font-mono-tech text-[#8a968f]">
                      <span>Your Submitted Report</span>
                      <span>{formatDateTime(target.report.submittedAt)}</span>
                    </div>

                    {target.report.completedWork && (
                      <div className="space-y-1">
                        <p className="text-[11px] font-mono-tech uppercase tracking-[0.12em] text-emerald-300/90">
                          Completed Work
                        </p>
                        <p className="text-xs text-[#d1dad4] leading-relaxed whitespace-pre-wrap">
                          {target.report.completedWork}
                        </p>
                      </div>
                    )}

                    {target.report.notCompletedReason && (
                      <div className="rounded-md bg-[#e0231c]/8 border border-[#e0231c]/25 p-3 space-y-1">
                        <p className="text-[11px] font-mono-tech uppercase tracking-[0.12em] text-[#ff7b76]">
                          Reason Why Not Completed / Blockers
                        </p>
                        <p className="text-xs text-[#f0d0ce] leading-relaxed whitespace-pre-wrap">
                          {target.report.notCompletedReason}
                        </p>
                      </div>
                    )}

                    {target.report.driveLinks.length > 0 && (
                      <div className="space-y-2 pt-1">
                        <p className="text-[11px] font-mono-tech uppercase tracking-[0.12em] text-[#8a968f]">
                          Attached Work Screenshots ({target.report.driveLinks.length})
                        </p>
                        <DrivePhotoGallery links={target.report.driveLinks} />
                      </div>
                    )}
                  </div>
                )}

                {/* Admin Feedback */}
                {target.verification.verifiedAt && (
                  <div className="rounded-lg bg-[#080d14] border border-[#e8ad26]/25 px-4 py-3 text-xs space-y-1">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-medium text-[#e8ad26]">
                        Admin Verification Feedback
                      </span>
                      <span className="text-[11px] font-mono-tech text-[#8a968f]">
                        {formatDateTime(target.verification.verifiedAt)}
                      </span>
                    </div>
                    <p className="text-[#c7d1ca]">
                      {target.verification.remarks ||
                        'Status updated by Administrator.'}
                    </p>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}

      {/* ================================================================= */}
      {/* MODAL: EMPLOYEE SUBMIT PROGRESS REPORT + DRIVE SCREENSHOTS        */}
      {/* ================================================================= */}
      <AnimatePresence>
        {reportingTarget && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-[#020305]/84 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setReportingTarget(null)}
          >
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 12 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-xl rounded-xl bg-[#0a0e14] border border-[#dfe7e0]/16 p-6 space-y-5 shadow-2xl max-h-[92vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="font-display font-normal text-lg text-[#dfe7e0]">
                    Submit Weekly Target Report
                  </h2>
                  <p className="text-xs text-[#8a968f]">{reportingTarget.title}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setReportingTarget(null)}
                  aria-label="Close modal"
                  className="w-8 h-8 rounded-md border border-[#dfe7e0]/15 flex items-center justify-center text-[#9aa5a0] hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSubmitReport} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-medium text-[#b4bfb7]">
                    Completion Status *
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => handleStatusChange('completed')}
                      className={`px-3 py-2.5 rounded-md border text-xs flex items-center justify-center gap-1.5 transition-colors ${
                        completionStatus === 'completed'
                          ? 'bg-emerald-500/15 border-emerald-500/45 text-emerald-200'
                          : 'bg-[#05070a] border-[#dfe7e0]/12 text-[#9aa5a0]'
                      }`}
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Completed</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleStatusChange('in_progress')}
                      className={`px-3 py-2.5 rounded-md border text-xs flex items-center justify-center gap-1.5 transition-colors ${
                        completionStatus === 'in_progress'
                          ? 'bg-amber-500/15 border-amber-500/45 text-amber-200'
                          : 'bg-[#05070a] border-[#dfe7e0]/12 text-[#9aa5a0]'
                      }`}
                    >
                      <Clock className="w-3.5 h-3.5 text-amber-400" />
                      <span>In Progress</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleStatusChange('not_completed')}
                      className={`px-3 py-2.5 rounded-md border text-xs flex items-center justify-center gap-1.5 transition-colors ${
                        completionStatus === 'not_completed'
                          ? 'bg-[#e0231c]/15 border-[#e0231c]/45 text-[#ffb4b1]'
                          : 'bg-[#05070a] border-[#dfe7e0]/12 text-[#9aa5a0]'
                      }`}
                    >
                      <XCircle className="w-3.5 h-3.5 text-[#ff6b66]" />
                      <span>Not Completed</span>
                    </button>
                  </div>
                </div>

                {completionStatus !== 'completed' && (
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <label className="font-medium text-[#b4bfb7]">
                        Progress Achieved
                      </label>
                      <span className="font-mono-tech text-[#e8ad26]">
                        {progressPercent}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={95}
                      step={5}
                      value={progressPercent}
                      onChange={(e) => setProgressPercent(Number(e.target.value))}
                      className="w-full accent-[#e0231c]"
                    />
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-[#b4bfb7]">
                    What Have You Completed?{' '}
                    {completionStatus === 'completed' ? '*' : '(Optional)'}
                  </label>
                  <textarea
                    rows={3}
                    required={completionStatus === 'completed'}
                    value={completedWork}
                    onChange={(e) => setCompletedWork(e.target.value)}
                    placeholder="Clearly summarize the tasks, buyer calls, orders, or deliverables you completed..."
                    className="w-full px-3 py-2 text-xs bg-[#05070a] border border-[#dfe7e0]/15 rounded-md text-[#dfe7e0] placeholder:text-[#66726c] focus:outline-none focus:border-[#e0231c]"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-[#b4bfb7] flex items-center gap-1.5">
                    {completionStatus === 'not_completed' && (
                      <AlertTriangle className="w-3.5 h-3.5 text-[#ff7b76]" />
                    )}
                    <span>
                      {completionStatus === 'not_completed'
                        ? 'Why Could This Target Not Be Completed? *'
                        : 'Pending Reason / Blockers (If Anything Remains Incomplete)'}
                    </span>
                  </label>
                  <textarea
                    rows={3}
                    required={completionStatus === 'not_completed'}
                    value={notCompletedReason}
                    onChange={(e) => setNotCompletedReason(e.target.value)}
                    placeholder="Explain any delays, client bottlenecks, missing documents, or reasons why the target is unfinished..."
                    className="w-full px-3 py-2 text-xs bg-[#05070a] border border-[#dfe7e0]/15 rounded-md text-[#dfe7e0] placeholder:text-[#66726c] focus:outline-none focus:border-[#e0231c]"
                  />
                </div>

                <DriveLinkEditor links={driveLinks} onChange={setDriveLinks} />

                {formError && (
                  <p className="text-xs text-[#ff6b66] bg-[#e0231c]/12 border border-[#e0231c]/35 rounded-md px-3 py-2">
                    {formError}
                  </p>
                )}

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setReportingTarget(null)}
                    className="px-4 py-2 text-xs text-[#b4bfb7] border border-[#dfe7e0]/15 rounded-md hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-[#e0231c] hover:bg-[#c81e17] disabled:opacity-60 rounded-md"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>
                      {submitting ? 'Submitting...' : 'Submit for Admin Verification'}
                    </span>
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

export function EmployeeExtraWorkView({
  items,
  authFetch,
  onReload,
  showToast,
}: {
  items: ExtraWorkRecord[];
  authFetch: (url: string, init?: RequestInit) => Promise<Response>;
  onReload: () => void;
  showToast: (msg: string) => void;
}) {
  const EXTRA_WORK_DRAFT_KEY = 'alorix_draft_extra_work_new';
  const [addOpen, setAddOpen] = useState(false);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState(EXTRA_WORK_CATEGORIES[0]);
  const [datePerformed, setDatePerformed] = useState(() =>
    new Date().toISOString().slice(0, 10)
  );
  const [description, setDescription] = useState('');
  const [impact, setImpact] = useState('');
  const [driveLinks, setDriveLinks] = useState<DrivePhotoAttachment[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const openAddModal = () => {
    setEditingItemId(null);
    let draft: {
      title?: string;
      category?: string;
      datePerformed?: string;
      description?: string;
      impact?: string;
      driveLinks?: DrivePhotoAttachment[];
    } | null = null;
    try {
      const raw = window.localStorage.getItem(EXTRA_WORK_DRAFT_KEY);
      if (raw) draft = JSON.parse(raw);
    } catch {
      draft = null;
    }
    setTitle(draft?.title || '');
    setCategory(draft?.category || EXTRA_WORK_CATEGORIES[0]);
    setDatePerformed(draft?.datePerformed || new Date().toISOString().slice(0, 10));
    setDescription(draft?.description || '');
    setImpact(draft?.impact || '');
    setDriveLinks(Array.isArray(draft?.driveLinks) ? draft.driveLinks : []);
    setError(null);
    setAddOpen(true);
  };

  const openEditModal = (item: ExtraWorkRecord) => {
    setEditingItemId(item.id);
    setTitle(item.title);
    setCategory(item.category);
    setDatePerformed(item.datePerformed);
    setDescription(item.description);
    setImpact(item.impact || '');
    setDriveLinks(item.driveLinks || []);
    setError(null);
    setAddOpen(true);
  };

  // Auto-save new extra work draft locally while modal is open
  useEffect(() => {
    if (!addOpen || editingItemId) return;
    try {
      window.localStorage.setItem(
        EXTRA_WORK_DRAFT_KEY,
        JSON.stringify({
          title,
          category,
          datePerformed,
          description,
          impact,
          driveLinks,
        })
      );
    } catch {
      // ignore
    }
  }, [addOpen, editingItemId, title, category, datePerformed, description, impact, driveLinks]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const endpoint = editingItemId
        ? `/api/employee/extra-work/${editingItemId}`
        : '/api/employee/extra-work';
      const res = await authFetch(endpoint, {
        method: editingItemId ? 'PATCH' : 'POST',
        body: JSON.stringify({
          title: title.trim(),
          category,
          datePerformed,
          description: description.trim(),
          impact: impact.trim(),
          driveLinks,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(data.error || 'Unable to save extra work.');
        return;
      }
      if (!editingItemId) {
        try {
          window.localStorage.removeItem(EXTRA_WORK_DRAFT_KEY);
        } catch {
          // ignore
        }
      }
      setAddOpen(false);
      setEditingItemId(null);
      showToast(
        editingItemId
          ? 'Extra work entry updated and saved.'
          : 'Extra work saved and sent to Admin.'
      );
      onReload();
    } catch {
      setError('Network error while saving extra work.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    const res = await authFetch(`/api/employee/extra-work/${id}`, {
      method: 'DELETE',
    });
    if (res.ok) {
      showToast('Extra work entry removed.');
      onReload();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <p className="font-mono-tech text-[11px] uppercase tracking-[0.16em] text-[#e8ad26]">
            Additional Contributions
          </p>
          <h1 className="font-display font-normal text-2xl text-[#dfe7e0]">
            Extra Work &amp; Work Screenshots
          </h1>
          <p className="text-xs text-[#9aa5a0]">
            Log any extra tasks, initiatives, or assistance completed beyond your
            weekly targets and attach Google Drive screenshot links for Admin review.
          </p>
        </div>

        <button
          type="button"
          onClick={openAddModal}
          className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 text-xs font-medium uppercase tracking-[0.08em] text-white bg-[#e0231c] hover:bg-[#c81e17] rounded-md transition-colors whitespace-nowrap shrink-0"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Log Extra Work</span>
        </button>
      </div>

      {items.length === 0 ? (
        <div className="rounded-xl bg-[#0a0e14] border border-[#dfe7e0]/12 p-10 text-center space-y-2">
          <Sparkles className="w-8 h-8 text-[#8a968f] mx-auto" />
          <p className="text-sm text-[#dfe7e0]">No extra work logged yet</p>
          <p className="text-xs text-[#8a968f]">
            Click &ldquo;Log Extra Work&rdquo; to report additional tasks and share
            Google Drive work screenshot links with Admin.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {items.map((item) => {
            const isVerified = item.verification.status === 'verified';
            const badgeClass = isVerified
              ? 'bg-emerald-500/14 text-emerald-300 border-emerald-500/35'
              : item.verification.status === 'rejected'
                ? 'bg-[#e0231c]/14 text-[#ff7b76] border-[#e0231c]/35'
                : 'bg-amber-500/14 text-amber-300 border-amber-500/35';
            const badgeLabel = isVerified
              ? 'Verified by Admin'
              : item.verification.status === 'rejected'
                ? 'Needs Clarification'
                : 'Pending Admin Review';

            return (
              <article
                key={item.id}
                className="rounded-xl bg-[#0a0e14] border border-[#dfe7e0]/14 p-5 sm:p-6 space-y-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[11px] text-[#b4bfb7] bg-white/[0.04] border border-[#dfe7e0]/12 px-2 py-0.5 rounded">
                        {item.category}
                      </span>
                      <span className="inline-flex items-center gap-1 text-[11px] font-mono-tech text-[#9aa5a0]">
                        <Calendar className="w-3 h-3" />
                        {formatShortDate(item.datePerformed)}
                      </span>
                      <span
                        className={`text-[10px] font-mono-tech uppercase px-2 py-0.5 rounded border ${badgeClass}`}
                      >
                        {badgeLabel}
                      </span>
                    </div>
                    <h2 className="font-display font-normal text-lg text-[#dfe7e0]">
                      {item.title}
                    </h2>
                  </div>

                  {!isVerified && (
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => openEditModal(item)}
                        aria-label="Edit entry"
                        className="w-8 h-8 rounded-md border border-[#dfe7e0]/15 hover:border-[#e8ad26]/50 flex items-center justify-center text-[#8a968f] hover:text-[#e8ad26]"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(item.id)}
                        aria-label="Delete entry"
                        className="w-8 h-8 rounded-md border border-[#dfe7e0]/15 hover:border-[#e0231c]/50 flex items-center justify-center text-[#8a968f] hover:text-[#ff6b66]"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>

                <div className="rounded-lg bg-[#06090e] border border-[#dfe7e0]/10 p-4 space-y-3">
                  <p className="text-xs text-[#d1dad4] leading-relaxed whitespace-pre-wrap">
                    {item.description}
                  </p>
                  {item.impact && (
                    <p className="text-xs text-[#e8ad26]/90">
                      Impact / Outcome: {item.impact}
                    </p>
                  )}
                  {item.driveLinks.length > 0 && (
                    <div className="pt-2 space-y-2">
                      <p className="text-[11px] font-mono-tech uppercase tracking-[0.12em] text-[#8a968f]">
                        Attached Google Drive Work Screenshots ({item.driveLinks.length})
                      </p>
                      <DrivePhotoGallery links={item.driveLinks} />
                    </div>
                  )}
                </div>

                {item.verification.verifiedAt && (
                  <div className="rounded-lg bg-[#080d14] border border-[#e8ad26]/25 px-4 py-3 text-xs space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium text-[#e8ad26]">
                        Admin Remarks
                      </span>
                      <span className="text-[11px] font-mono-tech text-[#8a968f]">
                        {formatDateTime(item.verification.verifiedAt)}
                      </span>
                    </div>
                    <p className="text-[#c7d1ca]">
                      {item.verification.remarks || 'Reviewed by Administrator.'}
                    </p>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}

      {/* Modal: Log Extra Work */}
      <AnimatePresence>
        {addOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-[#020305]/84 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setAddOpen(false)}
          >
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 12 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-xl rounded-xl bg-[#0a0e14] border border-[#dfe7e0]/16 p-6 space-y-5 shadow-2xl max-h-[92vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="font-display font-normal text-lg text-[#dfe7e0]">
                    {editingItemId ? 'Edit Extra Work Entry' : 'Log Extra Work Done'}
                  </h2>
                  <p className="text-xs text-[#8a968f]">
                    Report additional work completed and attach Google Drive
                    screenshots for Admin visibility.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setAddOpen(false)}
                  aria-label="Close modal"
                  className="w-8 h-8 rounded-md border border-[#dfe7e0]/15 flex items-center justify-center text-[#9aa5a0] hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-[#b4bfb7]">
                    Extra Work Title *
                  </label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g., Prepared Urgent Export Packing List for Dubai Client"
                    className="w-full px-3 py-2 text-xs bg-[#05070a] border border-[#dfe7e0]/15 rounded-md text-[#dfe7e0] placeholder:text-[#66726c] focus:outline-none focus:border-[#e0231c]"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-[#b4bfb7]">
                      Category
                    </label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-[#05070a] border border-[#dfe7e0]/15 rounded-md text-[#dfe7e0] focus:outline-none focus:border-[#e0231c]"
                    >
                      {EXTRA_WORK_CATEGORIES.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-[#b4bfb7]">
                      Date Performed *
                    </label>
                    <input
                      type="date"
                      required
                      value={datePerformed}
                      onChange={(e) => setDatePerformed(e.target.value)}
                      className="w-full px-3 py-2 text-xs font-mono-tech bg-[#05070a] border border-[#dfe7e0]/15 rounded-md text-[#dfe7e0] focus:outline-none focus:border-[#e0231c]"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-[#b4bfb7]">
                    Detailed Description of Extra Work *
                  </label>
                  <textarea
                    rows={3}
                    required
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Describe everything you completed outside your assigned weekly target..."
                    className="w-full px-3 py-2 text-xs bg-[#05070a] border border-[#dfe7e0]/15 rounded-md text-[#dfe7e0] placeholder:text-[#66726c] focus:outline-none focus:border-[#e0231c]"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-[#b4bfb7]">
                    Outcome / Business Impact (Optional)
                  </label>
                  <input
                    type="text"
                    value={impact}
                    onChange={(e) => setImpact(e.target.value)}
                    placeholder="e.g., Prevented 2-day shipment delay"
                    className="w-full px-3 py-2 text-xs bg-[#05070a] border border-[#dfe7e0]/15 rounded-md text-[#dfe7e0] placeholder:text-[#66726c] focus:outline-none focus:border-[#e0231c]"
                  />
                </div>

                <DriveLinkEditor links={driveLinks} onChange={setDriveLinks} />

                {error && (
                  <p className="text-xs text-[#ff6b66] bg-[#e0231c]/12 border border-[#e0231c]/35 rounded-md px-3 py-2">
                    {error}
                  </p>
                )}

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setAddOpen(false)}
                    className="px-4 py-2 text-xs text-[#b4bfb7] border border-[#dfe7e0]/15 rounded-md hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-[#e0231c] hover:bg-[#c81e17] disabled:opacity-60 rounded-md"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{submitting ? 'Submitting...' : 'Submit Extra Work'}</span>
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
