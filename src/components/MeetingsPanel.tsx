import { useEffect, useMemo, useState, type FormEvent } from 'react';
import {
  BellRing,
  CalendarClock,
  Clock,
  ExternalLink,
  Link2,
  Radio,
  Trash2,
  Users,
  Video,
  X,
} from 'lucide-react';
import { formatDateTime } from '../utils/driveLinks';

export interface MeetingRecord {
  id: string;
  title: string;
  description: string;
  meetingUrl: string;
  scheduledAt: string;
  durationMinutes: number;
  targetType: 'all' | 'employee' | 'department';
  targetEmployeeIds: string[];
  targetLabels: string[];
  targetDepartment: string;
  createdBy: string;
  createdAt: string;
  reminderNotifiedAt: string | null;
  startNotifiedAt: string | null;
  status: 'scheduled' | 'live' | 'completed';
}

interface SimpleEmployeeOption {
  id: string;
  employeeCode: string;
  fullName: string;
  department: string;
  role: string;
}

function getMeetingTimingState(
  meeting: MeetingRecord,
  nowMs: number
): { label: string; tone: 'live' | 'soon' | 'upcoming' | 'ended' } {
  const startMs = new Date(meeting.scheduledAt).getTime();
  const endMs = startMs + meeting.durationMinutes * 60_000;

  if (nowMs >= startMs && nowMs <= endMs) {
    const minsLeft = Math.max(1, Math.ceil((endMs - nowMs) / 60_000));
    return { label: `LIVE NOW · ${minsLeft}m left`, tone: 'live' };
  }
  if (nowMs > endMs) {
    return { label: 'Completed', tone: 'ended' };
  }
  const diffMin = Math.ceil((startMs - nowMs) / 60_000);
  if (diffMin <= 15) {
    return { label: `Starts in ${diffMin} min`, tone: 'soon' };
  }
  if (diffMin < 60) {
    return { label: `In ${diffMin} min`, tone: 'upcoming' };
  }
  const diffHrs = Math.floor(diffMin / 60);
  if (diffHrs < 24) {
    return { label: `In ${diffHrs}h ${diffMin % 60}m`, tone: 'upcoming' };
  }
  const days = Math.floor(diffHrs / 24);
  return { label: `In ${days} day${days > 1 ? 's' : ''}`, tone: 'upcoming' };
}

function TimingBadge({
  timing,
}: {
  timing: { label: string; tone: 'live' | 'soon' | 'upcoming' | 'ended' };
}) {
  if (timing.tone === 'live') {
    return (
      <span className="inline-flex items-center gap-1.5 text-[10px] font-mono-tech uppercase tracking-[0.12em] px-2.5 py-1 rounded bg-[#e0231c]/22 text-[#ff7b76] border border-[#e0231c]/55">
        <Radio className="w-3 h-3 animate-pulse" />
        {timing.label}
      </span>
    );
  }
  if (timing.tone === 'soon') {
    return (
      <span className="inline-flex items-center gap-1.5 text-[10px] font-mono-tech uppercase tracking-[0.12em] px-2.5 py-1 rounded bg-[#e8ad26]/18 text-[#e8ad26] border border-[#e8ad26]/45">
        <Clock className="w-3 h-3" />
        {timing.label}
      </span>
    );
  }
  if (timing.tone === 'ended') {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-mono-tech uppercase tracking-[0.12em] px-2 py-0.5 rounded bg-white/[0.04] text-[#7a8680] border border-[#dfe7e0]/10">
        {timing.label}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-mono-tech uppercase tracking-[0.12em] px-2 py-0.5 rounded bg-emerald-500/12 text-emerald-300 border border-emerald-500/30">
      <CalendarClock className="w-3 h-3" />
      {timing.label}
    </span>
  );
}

function getDefaultLocalDateTime(): { date: string; time: string } {
  const d = new Date(Date.now() + 15 * 60_000);
  const date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
    2,
    '0'
  )}-${String(d.getDate()).padStart(2, '0')}`;
  const time = `${String(d.getHours()).padStart(2, '0')}:${String(
    d.getMinutes()
  ).padStart(2, '0')}`;
  return { date, time };
}

// ============================================================================
// GLOBAL LIVE MEETING ALERT BANNER (Shown when a meeting starts or is in 5m)
// ============================================================================

export function MeetingLiveAlertBanner({
  meeting,
  kind,
  onDismiss,
}: {
  meeting: MeetingRecord;
  kind: 'reminder' | 'started';
  onDismiss: () => void;
}) {
  return (
    <div
      role="alert"
      className="rounded-xl bg-[#1a0b0d] border border-[#e0231c]/60 px-4 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xl"
    >
      <div className="flex items-start gap-3 min-w-0">
        <div className="w-9 h-9 rounded-lg bg-[#e0231c]/20 border border-[#e0231c]/50 flex items-center justify-center shrink-0">
          <Video className="w-4 h-4 text-[#ff7b76]" />
        </div>
        <div className="min-w-0 space-y-0.5">
          <p className="font-mono-tech text-[10px] uppercase tracking-[0.14em] text-[#e8ad26]">
            {kind === 'started'
              ? 'Meeting Starting Now'
              : 'Meeting Starting in 5 Minutes'}
          </p>
          <p className="text-sm font-medium text-[#dfe7e0] truncate">
            {meeting.title}
          </p>
          <p className="text-[11px] text-[#b4bfb7] truncate">
            {formatDateTime(meeting.scheduledAt)} · {meeting.durationMinutes} min
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <a
          href={meeting.meetingUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium uppercase tracking-[0.08em] text-white bg-[#e0231c] hover:bg-[#c81e17] rounded-md whitespace-nowrap"
        >
          <ExternalLink className="w-3.5 h-3.5" />
          <span>Join Meeting</span>
        </a>
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss meeting alert"
          className="w-8 h-8 rounded-md border border-[#dfe7e0]/15 flex items-center justify-center text-[#9aa5a0] hover:text-white"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

// ============================================================================
// ADMIN MEETINGS SCHEDULER PANEL
// ============================================================================

export function AdminMeetingsView({
  meetings,
  employees,
  authFetch,
  onReload,
  showToast,
}: {
  meetings: MeetingRecord[];
  employees: SimpleEmployeeOption[];
  authFetch: (url: string, init?: RequestInit) => Promise<Response>;
  onReload: () => void;
  showToast: (msg: string) => void;
}) {
  const defaults = useMemo(getDefaultLocalDateTime, []);
  const [title, setTitle] = useState('');
  const [meetingUrl, setMeetingUrl] = useState('');
  const [meetingDate, setMeetingDate] = useState(defaults.date);
  const [meetingTime, setMeetingTime] = useState(defaults.time);
  const [durationMinutes, setDurationMinutes] = useState('30');
  const [description, setDescription] = useState('');
  const [targetType, setTargetType] = useState<
    'all' | 'employee' | 'department'
  >('all');
  const [selectedEmpIds, setSelectedEmpIds] = useState<string[]>([]);
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    const t = window.setInterval(() => setNowMs(Date.now()), 30_000);
    return () => window.clearInterval(t);
  }, []);

  const departments = useMemo(() => {
    const set = new Set<string>();
    employees.forEach((e) => {
      if (e.department.trim()) set.add(e.department.trim());
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [employees]);

  const toggleEmployee = (id: string) => {
    setSelectedEmpIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSchedule = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (title.trim().length < 2) {
      setError('Please enter a meeting title.');
      return;
    }
    if (!meetingUrl.trim()) {
      setError('Please enter the meeting URL (Google Meet, Zoom, Teams, etc.).');
      return;
    }
    if (!meetingDate || !meetingTime) {
      setError('Please pick both meeting date and time.');
      return;
    }
    const localDt = new Date(`${meetingDate}T${meetingTime}:00`);
    if (Number.isNaN(localDt.getTime())) {
      setError('Please select a valid date and time.');
      return;
    }
    if (targetType === 'employee' && selectedEmpIds.length === 0) {
      setError('Please select at least one employee.');
      return;
    }
    if (targetType === 'department' && !selectedDepartment.trim()) {
      setError('Please select or enter a department.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await authFetch('/api/admin/meetings', {
        method: 'POST',
        body: JSON.stringify({
          title: title.trim(),
          meetingUrl: meetingUrl.trim(),
          scheduledAt: localDt.toISOString(),
          durationMinutes: Number(durationMinutes) || 30,
          description: description.trim(),
          targetType,
          targetEmployeeIds: targetType === 'employee' ? selectedEmpIds : [],
          targetDepartment:
            targetType === 'department' ? selectedDepartment.trim() : '',
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(data.error || 'Could not schedule meeting.');
        return;
      }

      setTitle('');
      setMeetingUrl('');
      setDescription('');
      setSelectedEmpIds([]);
      showToast(
        'Meeting scheduled! Team has been notified and will be alerted automatically at meeting time.'
      );
      onReload();
    } catch {
      setError('Network error while saving meeting.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleNotifyNow = async (id: string) => {
    setBusyId(id);
    try {
      const res = await authFetch(`/api/admin/meetings/${id}/notify`, {
        method: 'POST',
      });
      if (res.ok) {
        showToast('Instant meeting alert sent to all invited members.');
        onReload();
      }
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (id: string) => {
    setBusyId(id);
    try {
      const res = await authFetch(`/api/admin/meetings/${id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        showToast('Scheduled meeting removed.');
        onReload();
      }
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <p className="font-mono-tech text-[11px] uppercase tracking-[0.16em] text-[#e8ad26]">
          Scheduled Calls &amp; Auto-Alerts
        </p>
        <h1 className="font-display font-normal text-2xl text-[#dfe7e0]">
          Team Meetings
        </h1>
        <p className="text-xs text-[#9aa5a0]">
          Upload meeting time and meeting URL (Google Meet, Zoom, Teams). The
          server automatically notifies all invited members 5 minutes before
          start and right when the meeting time arrives.
        </p>
      </div>

      {/* Upload / Schedule Meeting Form */}
      <section className="rounded-xl bg-[#0a0e14] border border-[#dfe7e0]/14 p-5 sm:p-6 space-y-5">
        <div className="flex items-center gap-2.5">
          <Video className="w-4 h-4 text-[#e8ad26]" />
          <h2 className="font-display font-normal text-base text-[#dfe7e0]">
            Upload Meeting Time &amp; Link
          </h2>
        </div>

        <form onSubmit={handleSchedule} className="space-y-4" noValidate>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label
                htmlFor="mtg-title"
                className="text-xs font-medium text-[#b4bfb7]"
              >
                Meeting Title *
              </label>
              <input
                id="mtg-title"
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Weekly Export Targets Review"
                className="w-full px-3 py-2 text-xs text-[#dfe7e0] bg-[#05070a] border border-[#dfe7e0]/15 rounded-md focus:outline-none focus:border-[#e0231c]"
              />
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="mtg-url"
                className="text-xs font-medium text-[#b4bfb7]"
              >
                Meeting URL (Meet / Zoom / Teams) *
              </label>
              <div className="relative">
                <Link2 className="w-3.5 h-3.5 text-[#8a968f] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  id="mtg-url"
                  type="url"
                  required
                  value={meetingUrl}
                  onChange={(e) => setMeetingUrl(e.target.value)}
                  placeholder="https://meet.google.com/abc-defg-hij"
                  className="w-full pl-8 pr-3 py-2 text-xs font-mono-tech text-[#dfe7e0] bg-[#05070a] border border-[#dfe7e0]/15 rounded-md focus:outline-none focus:border-[#e0231c]"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <label
                htmlFor="mtg-date"
                className="text-xs font-medium text-[#b4bfb7]"
              >
                Meeting Date *
              </label>
              <input
                id="mtg-date"
                type="date"
                required
                value={meetingDate}
                onChange={(e) => setMeetingDate(e.target.value)}
                className="w-full px-3 py-2 text-xs font-mono-tech text-[#dfe7e0] bg-[#05070a] border border-[#dfe7e0]/15 rounded-md focus:outline-none focus:border-[#e0231c]"
              />
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="mtg-time"
                className="text-xs font-medium text-[#b4bfb7]"
              >
                Meeting Time *
              </label>
              <input
                id="mtg-time"
                type="time"
                required
                value={meetingTime}
                onChange={(e) => setMeetingTime(e.target.value)}
                className="w-full px-3 py-2 text-xs font-mono-tech text-[#dfe7e0] bg-[#05070a] border border-[#dfe7e0]/15 rounded-md focus:outline-none focus:border-[#e0231c]"
              />
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="mtg-duration"
                className="text-xs font-medium text-[#b4bfb7]"
              >
                Duration (Minutes)
              </label>
              <select
                id="mtg-duration"
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(e.target.value)}
                className="w-full px-3 py-2 text-xs text-[#dfe7e0] bg-[#05070a] border border-[#dfe7e0]/15 rounded-md focus:outline-none focus:border-[#e0231c]"
              >
                <option value="15">15 Minutes</option>
                <option value="30">30 Minutes</option>
                <option value="45">45 Minutes</option>
                <option value="60">1 Hour</option>
                <option value="90">1.5 Hours</option>
                <option value="120">2 Hours</option>
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="mtg-desc"
              className="text-xs font-medium text-[#b4bfb7]"
            >
              Agenda / Notes (Optional)
            </label>
            <textarea
              id="mtg-desc"
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Topics to cover, required reports, or preparation notes..."
              className="w-full px-3 py-2 text-xs text-[#dfe7e0] bg-[#05070a] border border-[#dfe7e0]/15 rounded-md focus:outline-none focus:border-[#e0231c]"
            />
          </div>

          {/* Invite Audience */}
          <div className="space-y-3">
            <p className="text-xs font-medium text-[#b4bfb7]">Notify &amp; Invite</p>
            <div className="flex flex-wrap gap-2">
              {(
                [
                  ['all', `All Team Members (${employees.length})`],
                  ['employee', 'Selected Employee(s)'],
                  ['department', 'Specific Department'],
                ] as const
              ).map(([mode, label]) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setTargetType(mode)}
                  className={`px-3.5 py-2 rounded-md text-xs font-medium border transition-colors ${
                    targetType === mode
                      ? 'bg-[#e8ad26]/15 text-[#dfe7e0] border-[#e8ad26]/55'
                      : 'bg-[#05070a] text-[#9aa5a0] border-[#dfe7e0]/12 hover:text-[#dfe7e0]'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {targetType === 'employee' && (
              <div className="rounded-lg bg-[#05070a] border border-[#dfe7e0]/12 p-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-40 overflow-y-auto">
                  {employees.map((emp) => {
                    const checked = selectedEmpIds.includes(emp.id);
                    return (
                      <label
                        key={emp.id}
                        className={`flex items-center gap-2 px-3 py-2 rounded-md border text-xs cursor-pointer ${
                          checked
                            ? 'bg-[#e0231c]/14 border-[#e0231c]/45 text-[#dfe7e0]'
                            : 'bg-[#0a0e14] border-[#dfe7e0]/10 text-[#9aa5a0]'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleEmployee(emp.id)}
                          className="accent-[#e0231c]"
                        />
                        <span className="truncate">
                          <span className="font-mono-tech text-[#e8ad26]">
                            {emp.employeeCode}
                          </span>{' '}
                          · {emp.fullName}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}

            {targetType === 'department' && (
              <div className="max-w-sm">
                <input
                  type="text"
                  list="alorix-mtg-depts"
                  value={selectedDepartment}
                  onChange={(e) => setSelectedDepartment(e.target.value)}
                  placeholder="Select or enter department..."
                  className="w-full px-3 py-2 text-xs text-[#dfe7e0] bg-[#05070a] border border-[#dfe7e0]/15 rounded-md focus:outline-none focus:border-[#e0231c]"
                />
                <datalist id="alorix-mtg-depts">
                  {departments.map((d) => (
                    <option key={d} value={d} />
                  ))}
                </datalist>
              </div>
            )}
          </div>

          {error && (
            <p
              role="alert"
              className="text-xs text-[#ff6b66] bg-[#e0231c]/12 border border-[#e0231c]/35 rounded-md px-3 py-2"
            >
              {error}
            </p>
          )}

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-medium uppercase tracking-[0.08em] text-white bg-[#e0231c] hover:bg-[#c81e17] disabled:opacity-60 rounded-md whitespace-nowrap"
            >
              <Video className="w-3.5 h-3.5" />
              <span>{submitting ? 'Scheduling...' : 'Schedule & Notify Team'}</span>
            </button>
          </div>
        </form>
      </section>

      {/* Meetings List */}
      <section className="space-y-3">
        <h2 className="font-display font-normal text-lg text-[#dfe7e0]">
          Scheduled Meetings ({meetings.length})
        </h2>

        {meetings.length === 0 ? (
          <div className="rounded-xl bg-[#0a0e14] border border-[#dfe7e0]/12 p-10 text-center space-y-2">
            <Video className="w-6 h-6 text-[#66726c] mx-auto" />
            <p className="text-xs text-[#8a968f]">
              No meetings scheduled yet. Upload a meeting time and URL above.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {meetings.map((m) => {
              const timing = getMeetingTimingState(m, nowMs);
              return (
                <article
                  key={m.id}
                  className={`rounded-xl border p-5 space-y-3 ${
                    timing.tone === 'live'
                      ? 'bg-[#120b0e] border-[#e0231c]/55'
                      : 'bg-[#0a0e14] border-[#dfe7e0]/12'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div className="space-y-1.5 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <TimingBadge timing={timing} />
                        <span className="font-mono-tech text-[11px] text-[#e8ad26]">
                          {formatDateTime(m.scheduledAt)} ({m.durationMinutes}{' '}
                          min)
                        </span>
                      </div>
                      <h3 className="text-sm font-medium text-[#dfe7e0]">
                        {m.title}
                      </h3>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                      <a
                        href={m.meetingUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-[#e0231c] hover:bg-[#c81e17] rounded-md whitespace-nowrap"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>Join Link</span>
                      </a>

                      <button
                        type="button"
                        disabled={busyId === m.id}
                        onClick={() => handleNotifyNow(m.id)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#e8ad26] bg-[#e8ad26]/10 hover:bg-[#e8ad26]/20 border border-[#e8ad26]/35 rounded-md whitespace-nowrap disabled:opacity-50"
                      >
                        <BellRing className="w-3.5 h-3.5" />
                        <span>Notify Now</span>
                      </button>

                      <button
                        type="button"
                        disabled={busyId === m.id}
                        onClick={() => handleDelete(m.id)}
                        aria-label="Delete meeting"
                        className="w-8 h-8 rounded-md border border-[#e0231c]/30 bg-[#e0231c]/10 hover:bg-[#e0231c] text-[#ff6b66] hover:text-white flex items-center justify-center transition-colors disabled:opacity-50"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {m.description && (
                    <p className="text-xs text-[#c7d1ca] bg-[#05070a] border border-[#dfe7e0]/8 rounded-md p-3 whitespace-pre-line">
                      {m.description}
                    </p>
                  )}

                  <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-[#8a968f]">
                    <span className="inline-flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-[#e8ad26]" />
                      <span>Invited: {m.targetLabels.join(', ')}</span>
                    </span>
                    <span className="font-mono-tech text-[10px] truncate max-w-xs">
                      {m.meetingUrl}
                    </span>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

// ============================================================================
// EMPLOYEE MEETINGS VIEW
// ============================================================================

export function EmployeeMeetingsView({
  meetings,
}: {
  meetings: MeetingRecord[];
}) {
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    const t = window.setInterval(() => setNowMs(Date.now()), 30_000);
    return () => window.clearInterval(t);
  }, []);

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <p className="font-mono-tech text-[11px] uppercase tracking-[0.16em] text-[#e8ad26]">
          Live &amp; Upcoming Calls
        </p>
        <h1 className="font-display font-normal text-2xl text-[#dfe7e0]">
          Scheduled Meetings
        </h1>
        <p className="text-xs text-[#9aa5a0]">
          Meetings scheduled by Alorix Administration. You will automatically
          receive a notification 5 minutes before start and right when the
          meeting begins.
        </p>
      </div>

      {meetings.length === 0 ? (
        <div className="rounded-xl bg-[#0a0e14] border border-[#dfe7e0]/12 p-10 text-center space-y-2">
          <Video className="w-7 h-7 text-[#66726c] mx-auto" />
          <p className="text-sm text-[#dfe7e0]">No meetings scheduled right now.</p>
          <p className="text-xs text-[#8a968f]">
            When an administrator uploads a meeting time and URL, it will appear
            here automatically.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {meetings.map((m) => {
            const timing = getMeetingTimingState(m, nowMs);
            return (
              <article
                key={m.id}
                className={`rounded-xl border p-5 space-y-3 ${
                  timing.tone === 'live'
                    ? 'bg-[#120b0e] border-[#e0231c]/55'
                    : 'bg-[#0a0e14] border-[#dfe7e0]/12'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="space-y-1.5 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <TimingBadge timing={timing} />
                      <span className="font-mono-tech text-[11px] text-[#e8ad26]">
                        {formatDateTime(m.scheduledAt)} ({m.durationMinutes} min)
                      </span>
                    </div>
                    <h3 className="text-base font-medium text-[#dfe7e0]">
                      {m.title}
                    </h3>
                  </div>

                  <a
                    href={m.meetingUrl}
                    target="_blank"
                    rel="noreferrer"
                    className={`inline-flex items-center gap-2 px-4 py-2 text-xs font-medium uppercase tracking-[0.08em] rounded-md whitespace-nowrap shrink-0 ${
                      timing.tone === 'ended'
                        ? 'text-[#b4bfb7] bg-[#05070a] border border-[#dfe7e0]/15'
                        : 'text-white bg-[#e0231c] hover:bg-[#c81e17]'
                    }`}
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>
                      {timing.tone === 'live' ? 'Join Now' : 'Open Meeting Link'}
                    </span>
                  </a>
                </div>

                {m.description && (
                  <p className="text-xs text-[#c7d1ca] bg-[#05070a] border border-[#dfe7e0]/8 rounded-md p-3 whitespace-pre-line">
                    {m.description}
                  </p>
                )}

                <p className="text-[11px] text-[#8a968f]">
                  Scheduled by {m.createdBy}
                </p>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
