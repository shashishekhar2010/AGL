import { useMemo, useState, type FormEvent } from 'react';
import {
  AlertTriangle,
  Calendar,
  CheckCircle2,
  Clock,
  FileCheck2,
  Plus,
  Search,
  Target,
  Trash2,
  X,
  XCircle,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { DrivePhotoGallery } from './DrivePhotoAttachments';
import {
  formatDateTime,
  formatShortDate,
  getCurrentWeekRange,
  type DrivePhotoAttachment,
} from '../utils/driveLinks';

export interface WeeklyTargetRecord {
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
  priority: 'high' | 'medium' | 'low';
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  report: {
    completionStatus: 'not_started' | 'in_progress' | 'completed' | 'not_completed';
    progressPercent: number;
    completedWork: string;
    notCompletedReason: string;
    driveLinks: DrivePhotoAttachment[];
    submittedAt: string | null;
  };
  verification: {
    status:
      | 'pending_report'
      | 'pending_review'
      | 'verified_completed'
      | 'needs_revision'
      | 'marked_incomplete';
    remarks: string;
    verifiedBy: string | null;
    verifiedAt: string | null;
  };
}

interface EmployeeOption {
  id: string;
  employeeCode: string;
  fullName: string;
  role: string;
  status: 'active' | 'suspended';
}

interface AdminWeeklyTargetsPanelProps {
  targets: WeeklyTargetRecord[];
  employees: EmployeeOption[];
  authFetch: (url: string, init?: RequestInit) => Promise<Response>;
  onReload: () => void;
  showToast: (msg: string) => void;
}

const VERIFICATION_BADGES: Record<
  WeeklyTargetRecord['verification']['status'],
  { label: string; className: string }
> = {
  pending_report: {
    label: 'Awaiting Employee Report',
    className: 'bg-white/[0.04] text-[#9aa5a0] border-[#dfe7e0]/15',
  },
  pending_review: {
    label: 'Pending Admin Verification',
    className: 'bg-amber-500/14 text-amber-300 border-amber-500/35',
  },
  verified_completed: {
    label: 'Verified Completed',
    className: 'bg-emerald-500/14 text-emerald-300 border-emerald-500/35',
  },
  needs_revision: {
    label: 'Revision Requested',
    className: 'bg-orange-500/14 text-orange-300 border-orange-500/35',
  },
  marked_incomplete: {
    label: 'Confirmed Incomplete',
    className: 'bg-[#e0231c]/14 text-[#ff7b76] border-[#e0231c]/35',
  },
};

const EMPLOYEE_REPORT_LABELS: Record<
  WeeklyTargetRecord['report']['completionStatus'],
  { label: string; className: string }
> = {
  not_started: { label: 'Not Reported Yet', className: 'text-[#8a968f]' },
  in_progress: { label: 'In Progress', className: 'text-amber-300' },
  completed: { label: 'Reported Completed', className: 'text-emerald-300' },
  not_completed: { label: 'Reported Not Completed', className: 'text-[#ff7b76]' },
};

export default function AdminWeeklyTargetsPanel({
  targets,
  employees,
  authFetch,
  onReload,
  showToast,
}: AdminWeeklyTargetsPanelProps) {
  const defaultWeek = useMemo(() => getCurrentWeekRange(), []);

  // Filters
  const [search, setSearch] = useState('');
  const [employeeFilter, setEmployeeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  // Assign Target Modal
  const [assignOpen, setAssignOpen] = useState(false);
  const [aEmployeeId, setAEmployeeId] = useState('');
  const [aTitle, setATitle] = useState('');
  const [aDescription, setADescription] = useState('');
  const [aMetric, setAMetric] = useState('');
  const [aWeekStart, setAWeekStart] = useState(defaultWeek.weekStart);
  const [aWeekEnd, setAWeekEnd] = useState(defaultWeek.weekEnd);
  const [aPriority, setAPriority] = useState<'high' | 'medium' | 'low'>('medium');
  const [aError, setAError] = useState<string | null>(null);
  const [aSubmitting, setASubmitting] = useState(false);

  // Verify Modal
  const [verifyTarget, setVerifyTarget] = useState<WeeklyTargetRecord | null>(null);
  const [vDecision, setVDecision] = useState<
    'verified_completed' | 'needs_revision' | 'marked_incomplete'
  >('verified_completed');
  const [vRemarks, setVRemarks] = useState('');
  const [vError, setVError] = useState<string | null>(null);
  const [vSubmitting, setVSubmitting] = useState(false);

  // Delete Confirm
  const [deleteTarget, setDeleteTarget] = useState<WeeklyTargetRecord | null>(null);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);

  const stats = useMemo(() => {
    const pendingReview = targets.filter(
      (t) => t.verification.status === 'pending_review'
    ).length;
    const verified = targets.filter(
      (t) => t.verification.status === 'verified_completed'
    ).length;
    const incomplete = targets.filter(
      (t) =>
        t.report.completionStatus === 'not_completed' ||
        t.verification.status === 'marked_incomplete'
    ).length;
    return {
      total: targets.length,
      pendingReview,
      verified,
      incomplete,
    };
  }, [targets]);

  const filteredTargets = useMemo(() => {
    const q = search.trim().toLowerCase();
    return targets.filter((t) => {
      if (employeeFilter !== 'all' && t.employeeId !== employeeFilter) return false;
      if (statusFilter !== 'all' && t.verification.status !== statusFilter) {
        return false;
      }
      if (!q) return true;
      return [
        t.title,
        t.description,
        t.targetMetric,
        t.employeeCode,
        t.employeeName,
        t.employeeRole,
        t.report.completedWork,
        t.report.notCompletedReason,
      ]
        .join(' ')
        .toLowerCase()
        .includes(q);
    });
  }, [targets, search, employeeFilter, statusFilter]);

  const openAssignModal = () => {
    const activeFirst = employees.find((e) => e.status === 'active') || employees[0];
    setAEmployeeId(activeFirst?.id || '');
    setATitle('');
    setADescription('');
    setAMetric('');
    setAWeekStart(defaultWeek.weekStart);
    setAWeekEnd(defaultWeek.weekEnd);
    setAPriority('medium');
    setAError(null);
    setAssignOpen(true);
  };

  const openVerifyModal = (target: WeeklyTargetRecord) => {
    setVerifyTarget(target);
    if (target.report.completionStatus === 'not_completed') {
      setVDecision('marked_incomplete');
    } else {
      setVDecision('verified_completed');
    }
    setVRemarks(target.verification.remarks || '');
    setVError(null);
  };

  const handleAssignSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setAError(null);
    setASubmitting(true);
    try {
      const res = await authFetch('/api/admin/targets', {
        method: 'POST',
        body: JSON.stringify({
          employeeId: aEmployeeId,
          title: aTitle.trim(),
          description: aDescription.trim(),
          targetMetric: aMetric.trim(),
          weekStart: aWeekStart,
          weekEnd: aWeekEnd,
          priority: aPriority,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setAError(data.error || 'Unable to assign weekly target.');
        return;
      }
      setAssignOpen(false);
      showToast(`Assigned weekly target to ${data.target.employeeCode}`);
      onReload();
    } catch {
      setAError('Network error while assigning target.');
    } finally {
      setASubmitting(false);
    }
  };

  const handleVerifySubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!verifyTarget) return;
    setVError(null);
    setVSubmitting(true);
    try {
      const res = await authFetch(`/api/admin/targets/${verifyTarget.id}/verify`, {
        method: 'POST',
        body: JSON.stringify({
          status: vDecision,
          remarks: vRemarks.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setVError(data.error || 'Unable to save verification.');
        return;
      }
      setVerifyTarget(null);
      showToast('Target verification saved.');
      onReload();
    } catch {
      setVError('Network error while verifying target.');
    } finally {
      setVSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleteSubmitting(true);
    try {
      const res = await authFetch(`/api/admin/targets/${deleteTarget.id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        showToast('Weekly target deleted.');
        setDeleteTarget(null);
        onReload();
      }
    } finally {
      setDeleteSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <p className="font-mono-tech text-[11px] uppercase tracking-[0.16em] text-[#e8ad26]">
            Performance &amp; Verification
          </p>
          <h1 className="font-display font-normal text-2xl text-[#dfe7e0]">
            Employee Weekly Targets
          </h1>
          <p className="text-xs text-[#9aa5a0]">
            Assign weekly goals to employees, review completion reports, reasons for
            unfinished items, Google Drive work screenshots, and verify completion.
          </p>
        </div>

        <button
          type="button"
          onClick={openAssignModal}
          disabled={employees.length === 0}
          className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 text-xs font-medium uppercase tracking-[0.08em] text-white bg-[#e0231c] hover:bg-[#c81e17] disabled:opacity-50 rounded-md transition-colors whitespace-nowrap shrink-0"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Assign Weekly Target</span>
        </button>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="rounded-lg bg-[#0a0e14] border border-[#dfe7e0]/12 p-4 space-y-1">
          <p className="text-[11px] font-mono-tech uppercase tracking-[0.12em] text-[#8a968f]">
            Total Targets
          </p>
          <p className="text-2xl font-mono-tech tabular-nums text-[#dfe7e0]">
            {stats.total}
          </p>
        </div>
        <div className="rounded-lg bg-[#0a0e14] border border-amber-500/25 p-4 space-y-1">
          <p className="text-[11px] font-mono-tech uppercase tracking-[0.12em] text-amber-300">
            Pending Verification
          </p>
          <p className="text-2xl font-mono-tech tabular-nums text-amber-300">
            {stats.pendingReview}
          </p>
        </div>
        <div className="rounded-lg bg-[#0a0e14] border border-emerald-500/25 p-4 space-y-1">
          <p className="text-[11px] font-mono-tech uppercase tracking-[0.12em] text-emerald-300">
            Verified Completed
          </p>
          <p className="text-2xl font-mono-tech tabular-nums text-emerald-300">
            {stats.verified}
          </p>
        </div>
        <div className="rounded-lg bg-[#0a0e14] border border-[#e0231c]/25 p-4 space-y-1">
          <p className="text-[11px] font-mono-tech uppercase tracking-[0.12em] text-[#ff7b76]">
            Reported Incomplete
          </p>
          <p className="text-2xl font-mono-tech tabular-nums text-[#ff7b76]">
            {stats.incomplete}
          </p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
        <div className="relative md:col-span-5">
          <Search className="w-4 h-4 text-[#8a968f] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search target, employee, progress, or reason..."
            className="w-full pl-9 pr-3 py-2 text-xs bg-[#0a0e14] border border-[#dfe7e0]/15 rounded-md text-[#dfe7e0] placeholder:text-[#66726c] focus:outline-none focus:border-[#e0231c]"
          />
        </div>
        <select
          value={employeeFilter}
          onChange={(e) => setEmployeeFilter(e.target.value)}
          className="md:col-span-4 px-3 py-2 text-xs bg-[#0a0e14] border border-[#dfe7e0]/15 rounded-md text-[#dfe7e0] focus:outline-none focus:border-[#e0231c]"
        >
          <option value="all">All Employees</option>
          {employees.map((emp) => (
            <option key={emp.id} value={emp.id}>
              {emp.employeeCode} — {emp.fullName}
            </option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="md:col-span-3 px-3 py-2 text-xs bg-[#0a0e14] border border-[#dfe7e0]/15 rounded-md text-[#dfe7e0] focus:outline-none focus:border-[#e0231c]"
        >
          <option value="all">All Verification States</option>
          <option value="pending_review">Pending Verification</option>
          <option value="pending_report">Awaiting Report</option>
          <option value="verified_completed">Verified Completed</option>
          <option value="needs_revision">Revision Requested</option>
          <option value="marked_incomplete">Confirmed Incomplete</option>
        </select>
      </div>

      {/* Targets Feed */}
      {employees.length === 0 ? (
        <div className="rounded-xl bg-[#0a0e14] border border-[#dfe7e0]/12 p-10 text-center space-y-2">
          <Target className="w-8 h-8 text-[#8a968f] mx-auto" />
          <p className="text-sm text-[#dfe7e0]">No employees created yet</p>
          <p className="text-xs text-[#8a968f]">
            Create an employee in the Employees tab first, then assign weekly targets.
          </p>
        </div>
      ) : filteredTargets.length === 0 ? (
        <div className="rounded-xl bg-[#0a0e14] border border-[#dfe7e0]/12 p-10 text-center space-y-2">
          <Target className="w-8 h-8 text-[#8a968f] mx-auto" />
          <p className="text-sm text-[#dfe7e0]">No weekly targets found</p>
          <p className="text-xs text-[#8a968f]">
            Click &ldquo;Assign Weekly Target&rdquo; to set a weekly deliverable for
            any employee.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredTargets.map((target) => {
            const vBadge = VERIFICATION_BADGES[target.verification.status];
            const rLabel = EMPLOYEE_REPORT_LABELS[target.report.completionStatus];

            return (
              <article
                key={target.id}
                className="rounded-xl bg-[#0a0e14] border border-[#dfe7e0]/14 p-5 sm:p-6 space-y-4"
              >
                {/* Top Header */}
                <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-3">
                  <div className="space-y-1.5 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono-tech text-[11px] text-[#e8ad26] bg-[#e8ad26]/10 border border-[#e8ad26]/25 px-2 py-0.5 rounded">
                        {target.employeeCode} · {target.employeeName}
                      </span>
                      <span className="inline-flex items-center gap-1 text-[11px] font-mono-tech text-[#9aa5a0]">
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
                        className={`text-[10px] font-mono-tech uppercase px-2 py-0.5 rounded border ${vBadge.className}`}
                      >
                        {vBadge.label}
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

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => openVerifyModal(target)}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-white bg-[#e0231c] hover:bg-[#c81e17] rounded-md transition-colors whitespace-nowrap"
                    >
                      <FileCheck2 className="w-3.5 h-3.5" />
                      <span>
                        {target.verification.status === 'verified_completed'
                          ? 'Update Verification'
                          : 'Verify Report'}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteTarget(target)}
                      aria-label="Delete target"
                      className="w-9 h-9 rounded-md border border-[#dfe7e0]/15 hover:border-[#e0231c]/50 flex items-center justify-center text-[#8a968f] hover:text-[#ff6b66] transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Employee Progress Report Section */}
                <div className="rounded-lg bg-[#06090e] border border-[#dfe7e0]/10 p-4 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2 text-xs">
                      <span className="font-mono-tech uppercase tracking-[0.12em] text-[#8a968f]">
                        Employee Report:
                      </span>
                      <span className={`font-medium ${rLabel.className}`}>
                        {rLabel.label} ({target.report.progressPercent}%)
                      </span>
                    </div>
                    {target.report.submittedAt && (
                      <span className="text-[11px] font-mono-tech text-[#8a968f]">
                        Submitted {formatDateTime(target.report.submittedAt)}
                      </span>
                    )}
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full h-1.5 bg-[#0e141d] rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-300 ${
                        target.report.completionStatus === 'not_completed'
                          ? 'bg-[#e0231c]'
                          : target.verification.status === 'verified_completed'
                            ? 'bg-emerald-400'
                            : 'bg-[#e8ad26]'
                      }`}
                      style={{ width: `${target.report.progressPercent}%` }}
                    />
                  </div>

                  {target.report.submittedAt ? (
                    <div className="space-y-3 pt-1">
                      {target.report.completedWork && (
                        <div className="space-y-1">
                          <p className="text-[11px] font-mono-tech uppercase tracking-[0.12em] text-emerald-300/90">
                            What Employee Completed
                          </p>
                          <p className="text-xs text-[#d1dad4] leading-relaxed whitespace-pre-wrap">
                            {target.report.completedWork}
                          </p>
                        </div>
                      )}

                      {target.report.notCompletedReason && (
                        <div className="rounded-md bg-[#e0231c]/8 border border-[#e0231c]/25 p-3 space-y-1">
                          <p className="text-[11px] font-mono-tech uppercase tracking-[0.12em] text-[#ff7b76] flex items-center gap-1.5">
                            <AlertTriangle className="w-3.5 h-3.5" />
                            Reason Stated Why Not Completed / Blockers
                          </p>
                          <p className="text-xs text-[#f0d0ce] leading-relaxed whitespace-pre-wrap">
                            {target.report.notCompletedReason}
                          </p>
                        </div>
                      )}

                      <div className="space-y-2 pt-1">
                        <p className="text-[11px] font-mono-tech uppercase tracking-[0.12em] text-[#8a968f]">
                          Work Screenshots (Google Drive Links ·{' '}
                          {target.report.driveLinks.length})
                        </p>
                        <DrivePhotoGallery
                          links={target.report.driveLinks}
                          emptyLabel="No Google Drive screenshots attached to this report."
                        />
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-[#7c8882]">
                      Employee has not submitted a progress report for this weekly
                      target yet.
                    </p>
                  )}
                </div>

                {/* Admin Verification Record */}
                {target.verification.verifiedAt && (
                  <div className="rounded-lg bg-[#080d14] border border-[#e8ad26]/20 px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                    <div className="space-y-0.5">
                      <p className="text-[#e8ad26] font-medium">
                        Admin Verification · {vBadge.label}
                      </p>
                      {target.verification.remarks && (
                        <p className="text-[#c7d1ca]">
                          Remarks: {target.verification.remarks}
                        </p>
                      )}
                    </div>
                    <span className="text-[11px] font-mono-tech text-[#8a968f] shrink-0">
                      {target.verification.verifiedBy} ·{' '}
                      {formatDateTime(target.verification.verifiedAt)}
                    </span>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}

      {/* ================================================================= */}
      {/* MODAL: ASSIGN NEW WEEKLY TARGET                                   */}
      {/* ================================================================= */}
      <AnimatePresence>
        {assignOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-[#020305]/82 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setAssignOpen(false)}
          >
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 12 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-lg rounded-xl bg-[#0a0e14] border border-[#dfe7e0]/16 p-6 space-y-5 shadow-2xl max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="font-display font-normal text-lg text-[#dfe7e0]">
                    Assign Weekly Target
                  </h2>
                  <p className="text-xs text-[#8a968f]">
                    This target will immediately appear in the employee&apos;s portal.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setAssignOpen(false)}
                  aria-label="Close modal"
                  className="w-8 h-8 rounded-md border border-[#dfe7e0]/15 flex items-center justify-center text-[#9aa5a0] hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleAssignSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-[#b4bfb7]">
                    Assign To Employee *
                  </label>
                  <select
                    required
                    value={aEmployeeId}
                    onChange={(e) => setAEmployeeId(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-[#05070a] border border-[#dfe7e0]/15 rounded-md text-[#dfe7e0] focus:outline-none focus:border-[#e0231c]"
                  >
                    {employees.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.employeeCode} — {emp.fullName} ({emp.role})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-[#b4bfb7]">
                      Week Start Date *
                    </label>
                    <input
                      type="date"
                      required
                      value={aWeekStart}
                      onChange={(e) => setAWeekStart(e.target.value)}
                      className="w-full px-3 py-2 text-xs font-mono-tech bg-[#05070a] border border-[#dfe7e0]/15 rounded-md text-[#dfe7e0] focus:outline-none focus:border-[#e0231c]"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-[#b4bfb7]">
                      Week End Date *
                    </label>
                    <input
                      type="date"
                      required
                      value={aWeekEnd}
                      onChange={(e) => setAWeekEnd(e.target.value)}
                      className="w-full px-3 py-2 text-xs font-mono-tech bg-[#05070a] border border-[#dfe7e0]/15 rounded-md text-[#dfe7e0] focus:outline-none focus:border-[#e0231c]"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-[#b4bfb7]">
                    Target Title *
                  </label>
                  <input
                    type="text"
                    required
                    value={aTitle}
                    onChange={(e) => setATitle(e.target.value)}
                    placeholder="e.g., Follow up on 20 Activated Carbon Buyer Leads"
                    className="w-full px-3 py-2 text-xs bg-[#05070a] border border-[#dfe7e0]/15 rounded-md text-[#dfe7e0] placeholder:text-[#66726c] focus:outline-none focus:border-[#e0231c]"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-[#b4bfb7]">
                      Measurable Goal / KPI
                    </label>
                    <input
                      type="text"
                      value={aMetric}
                      onChange={(e) => setAMetric(e.target.value)}
                      placeholder="e.g., 20 quotes / 2 confirmed orders"
                      className="w-full px-3 py-2 text-xs bg-[#05070a] border border-[#dfe7e0]/15 rounded-md text-[#dfe7e0] placeholder:text-[#66726c] focus:outline-none focus:border-[#e0231c]"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-[#b4bfb7]">
                      Priority
                    </label>
                    <select
                      value={aPriority}
                      onChange={(e) =>
                        setAPriority(e.target.value as 'high' | 'medium' | 'low')
                      }
                      className="w-full px-3 py-2 text-xs bg-[#05070a] border border-[#dfe7e0]/15 rounded-md text-[#dfe7e0] focus:outline-none focus:border-[#e0231c]"
                    >
                      <option value="high">High Priority</option>
                      <option value="medium">Medium Priority</option>
                      <option value="low">Low Priority</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-[#b4bfb7]">
                    Detailed Instructions &amp; Deliverables
                  </label>
                  <textarea
                    rows={3}
                    value={aDescription}
                    onChange={(e) => setADescription(e.target.value)}
                    placeholder="Specify exact deliverables, regions, or documentation expected this week..."
                    className="w-full px-3 py-2 text-xs bg-[#05070a] border border-[#dfe7e0]/15 rounded-md text-[#dfe7e0] placeholder:text-[#66726c] focus:outline-none focus:border-[#e0231c]"
                  />
                </div>

                {aError && (
                  <p className="text-xs text-[#ff6b66] bg-[#e0231c]/12 border border-[#e0231c]/35 rounded-md px-3 py-2">
                    {aError}
                  </p>
                )}

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setAssignOpen(false)}
                    className="px-4 py-2 text-xs text-[#b4bfb7] border border-[#dfe7e0]/15 rounded-md hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={aSubmitting}
                    className="px-4 py-2 text-xs font-medium text-white bg-[#e0231c] hover:bg-[#c81e17] disabled:opacity-60 rounded-md"
                  >
                    {aSubmitting ? 'Assigning...' : 'Assign Target'}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ================================================================= */}
      {/* MODAL: ADMIN VERIFY EMPLOYEE TARGET REPORT                        */}
      {/* ================================================================= */}
      <AnimatePresence>
        {verifyTarget && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-[#020305]/82 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setVerifyTarget(null)}
          >
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 12 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-lg rounded-xl bg-[#0a0e14] border border-[#dfe7e0]/16 p-6 space-y-5 shadow-2xl max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="font-display font-normal text-lg text-[#dfe7e0]">
                    Verify Weekly Target Report
                  </h2>
                  <p className="text-xs text-[#8a968f]">
                    {verifyTarget.employeeCode} ({verifyTarget.employeeName}) ·{' '}
                    {verifyTarget.title}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setVerifyTarget(null)}
                  aria-label="Close modal"
                  className="w-8 h-8 rounded-md border border-[#dfe7e0]/15 flex items-center justify-center text-[#9aa5a0] hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleVerifySubmit} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-medium text-[#b4bfb7]">
                    Admin Verification Decision
                  </label>
                  <div className="grid grid-cols-1 gap-2">
                    <button
                      type="button"
                      onClick={() => setVDecision('verified_completed')}
                      className={`text-left px-3.5 py-2.5 rounded-md border text-xs flex items-center gap-2.5 transition-colors ${
                        vDecision === 'verified_completed'
                          ? 'bg-emerald-500/15 border-emerald-500/45 text-emerald-200'
                          : 'bg-[#05070a] border-[#dfe7e0]/12 text-[#9aa5a0] hover:text-[#dfe7e0]'
                      }`}
                    >
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      <div>
                        <p className="font-medium">Verify as Completed</p>
                        <p className="text-[11px] opacity-80">
                          Confirm target deliverables and screenshot proof are complete.
                        </p>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setVDecision('needs_revision')}
                      className={`text-left px-3.5 py-2.5 rounded-md border text-xs flex items-center gap-2.5 transition-colors ${
                        vDecision === 'needs_revision'
                          ? 'bg-orange-500/15 border-orange-500/45 text-orange-200'
                          : 'bg-[#05070a] border-[#dfe7e0]/12 text-[#9aa5a0] hover:text-[#dfe7e0]'
                      }`}
                    >
                      <Clock className="w-4 h-4 text-orange-400 shrink-0" />
                      <div>
                        <p className="font-medium">Request Revision / More Proof</p>
                        <p className="text-[11px] opacity-80">
                          Send back to employee for updated work or screenshot links.
                        </p>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setVDecision('marked_incomplete')}
                      className={`text-left px-3.5 py-2.5 rounded-md border text-xs flex items-center gap-2.5 transition-colors ${
                        vDecision === 'marked_incomplete'
                          ? 'bg-[#e0231c]/15 border-[#e0231c]/45 text-[#ffb4b1]'
                          : 'bg-[#05070a] border-[#dfe7e0]/12 text-[#9aa5a0] hover:text-[#dfe7e0]'
                      }`}
                    >
                      <XCircle className="w-4 h-4 text-[#ff6b66] shrink-0" />
                      <div>
                        <p className="font-medium">Confirm Not Completed</p>
                        <p className="text-[11px] opacity-80">
                          Acknowledge target was not completed and record admin remarks.
                        </p>
                      </div>
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-[#b4bfb7]">
                    Admin Verification Remarks (Visible to Employee)
                  </label>
                  <textarea
                    rows={3}
                    value={vRemarks}
                    onChange={(e) => setVRemarks(e.target.value)}
                    placeholder="Add feedback, confirmation notes, or follow-up instructions..."
                    className="w-full px-3 py-2 text-xs bg-[#05070a] border border-[#dfe7e0]/15 rounded-md text-[#dfe7e0] placeholder:text-[#66726c] focus:outline-none focus:border-[#e0231c]"
                  />
                </div>

                {vError && (
                  <p className="text-xs text-[#ff6b66] bg-[#e0231c]/12 border border-[#e0231c]/35 rounded-md px-3 py-2">
                    {vError}
                  </p>
                )}

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setVerifyTarget(null)}
                    className="px-4 py-2 text-xs text-[#b4bfb7] border border-[#dfe7e0]/15 rounded-md hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={vSubmitting}
                    className="px-4 py-2 text-xs font-medium text-white bg-[#e0231c] hover:bg-[#c81e17] disabled:opacity-60 rounded-md"
                  >
                    {vSubmitting ? 'Saving...' : 'Save Verification'}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ================================================================= */}
      {/* MODAL: DELETE CONFIRM                                             */}
      {/* ================================================================= */}
      <AnimatePresence>
        {deleteTarget && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-[#020305]/80 flex items-center justify-center p-4"
            onClick={() => setDeleteTarget(null)}
          >
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm rounded-xl bg-[#0a0e14] border border-[#e0231c]/40 p-6 space-y-4 shadow-2xl"
            >
              <h2 className="font-display font-normal text-lg text-[#dfe7e0]">
                Delete Weekly Target?
              </h2>
              <p className="text-xs text-[#9aa5a0]">
                Remove &ldquo;{deleteTarget.title}&rdquo; assigned to{' '}
                {deleteTarget.employeeName}? This will also remove any attached report.
              </p>
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setDeleteTarget(null)}
                  className="px-4 py-2 text-xs text-[#b4bfb7] border border-[#dfe7e0]/15 rounded-md"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={deleteSubmitting}
                  onClick={handleDelete}
                  className="px-4 py-2 text-xs font-medium text-white bg-[#e0231c] hover:bg-[#c81e17] rounded-md"
                >
                  {deleteSubmitting ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
