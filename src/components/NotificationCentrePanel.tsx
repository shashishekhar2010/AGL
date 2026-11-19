import { useMemo, useState, type FormEvent } from 'react';
import {
  AlertCircle,
  Bell,
  CheckCheck,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Megaphone,
  Send,
  Trash2,
  Users,
} from 'lucide-react';
import { formatDateTime } from '../utils/driveLinks';

export interface NotificationReadReceiptRecord {
  employeeId: string;
  employeeCode: string;
  employeeName: string;
  readAt: string;
}

export interface AdminNotificationRecord {
  id: string;
  title: string;
  message: string;
  priority: 'normal' | 'important' | 'urgent';
  targetType: 'all' | 'employee' | 'department';
  targetEmployeeIds: string[];
  targetLabels: string[];
  targetDepartment: string;
  createdBy: string;
  createdByRole: 'super_admin' | 'admin';
  createdAt: string;
  readBy: NotificationReadReceiptRecord[];
  totalRecipients: number;
  readCount: number;
}

export interface EmployeeNotificationRecord {
  id: string;
  title: string;
  message: string;
  priority: 'normal' | 'important' | 'urgent';
  targetType: 'all' | 'employee' | 'department';
  targetDepartment: string;
  createdBy: string;
  createdAt: string;
  isRead: boolean;
  readAt: string | null;
}

interface SimpleEmployeeOption {
  id: string;
  employeeCode: string;
  fullName: string;
  department: string;
  role: string;
  status: 'active' | 'suspended';
}

function PriorityBadge({
  priority,
}: {
  priority: 'normal' | 'important' | 'urgent';
}) {
  if (priority === 'urgent') {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-mono-tech uppercase tracking-[0.12em] px-2 py-0.5 rounded bg-[#e0231c]/20 text-[#ff7b76] border border-[#e0231c]/45">
        <AlertCircle className="w-3 h-3" />
        Urgent
      </span>
    );
  }
  if (priority === 'important') {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-mono-tech uppercase tracking-[0.12em] px-2 py-0.5 rounded bg-[#e8ad26]/16 text-[#e8ad26] border border-[#e8ad26]/40">
        <Bell className="w-3 h-3" />
        Important
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-mono-tech uppercase tracking-[0.12em] px-2 py-0.5 rounded bg-white/[0.04] text-[#9aa5a0] border border-[#dfe7e0]/14">
      Normal
    </span>
  );
}

// ============================================================================
// ADMIN NOTIFICATION CENTRE (Compose, Broadcast, Read Receipts)
// ============================================================================

export function AdminNotificationsView({
  notifications,
  employees,
  authFetch,
  onReload,
  showToast,
}: {
  notifications: AdminNotificationRecord[];
  employees: SimpleEmployeeOption[];
  authFetch: (url: string, init?: RequestInit) => Promise<Response>;
  onReload: () => void;
  showToast: (msg: string) => void;
}) {
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [priority, setPriority] = useState<'normal' | 'important' | 'urgent'>(
    'normal'
  );
  const [targetType, setTargetType] = useState<
    'all' | 'employee' | 'department'
  >('all');
  const [selectedEmpIds, setSelectedEmpIds] = useState<string[]>([]);
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedReceiptId, setExpandedReceiptId] = useState<string | null>(
    null
  );
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const departments = useMemo(() => {
    const set = new Set<string>();
    employees.forEach((e) => {
      if (e.department.trim()) set.add(e.department.trim());
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [employees]);

  const toggleEmployeeSelection = (id: string) => {
    setSelectedEmpIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSend = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (title.trim().length < 2) {
      setError('Please enter a notification title.');
      return;
    }
    if (message.trim().length < 3) {
      setError('Please enter the notification message.');
      return;
    }
    if (targetType === 'employee' && selectedEmpIds.length === 0) {
      setError('Please select at least one employee recipient.');
      return;
    }
    if (targetType === 'department' && !selectedDepartment.trim()) {
      setError('Please choose or enter a department.');
      return;
    }

    setSending(true);
    try {
      const res = await authFetch('/api/admin/notifications', {
        method: 'POST',
        body: JSON.stringify({
          title: title.trim(),
          message: message.trim(),
          priority,
          targetType,
          targetEmployeeIds: targetType === 'employee' ? selectedEmpIds : [],
          targetDepartment:
            targetType === 'department' ? selectedDepartment.trim() : '',
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(data.error || 'Unable to send notification.');
        return;
      }

      setTitle('');
      setMessage('');
      setPriority('normal');
      setSelectedEmpIds([]);
      showToast('Notification dispatched and saved online.');
      onReload();
    } catch {
      setError('Network error while sending notification.');
    } finally {
      setSending(false);
    }
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      const res = await authFetch(`/api/admin/notifications/${id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        showToast('Notification removed.');
        onReload();
      }
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <p className="font-mono-tech text-[11px] uppercase tracking-[0.16em] text-[#e8ad26]">
          Instant Staff Broadcasts
        </p>
        <h1 className="font-display font-normal text-2xl text-[#dfe7e0]">
          Notification Centre
        </h1>
        <p className="text-xs text-[#9aa5a0]">
          Send announcements, target reminders, or urgent alerts to all
          employees, a department, or selected staff members. All sent notices
          and read receipts are saved permanently.
        </p>
      </div>

      {/* Compose Notification Form */}
      <section className="rounded-xl bg-[#0a0e14] border border-[#dfe7e0]/14 p-5 sm:p-6 space-y-5">
        <div className="flex items-center gap-2.5">
          <Megaphone className="w-4 h-4 text-[#e8ad26]" />
          <h2 className="font-display font-normal text-base text-[#dfe7e0]">
            Send New Notification
          </h2>
        </div>

        <form onSubmit={handleSend} className="space-y-4" noValidate>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2 space-y-1.5">
              <label
                htmlFor="ntf-title"
                className="text-xs font-medium text-[#b4bfb7]"
              >
                Notification Title *
              </label>
              <input
                id="ntf-title"
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Weekly Target Submission Deadline — Friday 6 PM"
                className="w-full px-3 py-2 text-xs text-[#dfe7e0] bg-[#05070a] border border-[#dfe7e0]/15 rounded-md focus:outline-none focus:border-[#e0231c]"
              />
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="ntf-priority"
                className="text-xs font-medium text-[#b4bfb7]"
              >
                Priority Level
              </label>
              <select
                id="ntf-priority"
                value={priority}
                onChange={(e) =>
                  setPriority(
                    e.target.value as 'normal' | 'important' | 'urgent'
                  )
                }
                className="w-full px-3 py-2 text-xs text-[#dfe7e0] bg-[#05070a] border border-[#dfe7e0]/15 rounded-md focus:outline-none focus:border-[#e0231c]"
              >
                <option value="normal">Normal Announcement</option>
                <option value="important">Important Notice</option>
                <option value="urgent">Urgent Alert</option>
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="ntf-message"
              className="text-xs font-medium text-[#b4bfb7]"
            >
              Message *
            </label>
            <textarea
              id="ntf-message"
              rows={3}
              required
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Write the full instructions or announcement that employees will receive immediately in their portal..."
              className="w-full px-3 py-2 text-xs text-[#dfe7e0] bg-[#05070a] border border-[#dfe7e0]/15 rounded-md focus:outline-none focus:border-[#e0231c]"
            />
          </div>

          {/* Recipient Targeting */}
          <div className="space-y-3 pt-1">
            <p className="text-xs font-medium text-[#b4bfb7]">Send To</p>
            <div className="flex flex-wrap gap-2">
              {(
                [
                  ['all', `All Employees (${employees.length})`],
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
              <div className="rounded-lg bg-[#05070a] border border-[#dfe7e0]/12 p-3 space-y-2">
                {employees.length === 0 ? (
                  <p className="text-xs text-[#8a968f]">
                    No employee accounts created yet.
                  </p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-44 overflow-y-auto">
                    {employees.map((emp) => {
                      const checked = selectedEmpIds.includes(emp.id);
                      return (
                        <label
                          key={emp.id}
                          className={`flex items-center gap-2 px-3 py-2 rounded-md border text-xs cursor-pointer transition-colors ${
                            checked
                              ? 'bg-[#e0231c]/14 border-[#e0231c]/45 text-[#dfe7e0]'
                              : 'bg-[#0a0e14] border-[#dfe7e0]/10 text-[#9aa5a0]'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleEmployeeSelection(emp.id)}
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
                )}
              </div>
            )}

            {targetType === 'department' && (
              <div className="max-w-sm">
                <input
                  type="text"
                  list="alorix-dept-list"
                  value={selectedDepartment}
                  onChange={(e) => setSelectedDepartment(e.target.value)}
                  placeholder="Select or type department name..."
                  className="w-full px-3 py-2 text-xs text-[#dfe7e0] bg-[#05070a] border border-[#dfe7e0]/15 rounded-md focus:outline-none focus:border-[#e0231c]"
                />
                <datalist id="alorix-dept-list">
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
              disabled={sending}
              className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-medium uppercase tracking-[0.08em] text-white bg-[#e0231c] hover:bg-[#c81e17] disabled:opacity-60 rounded-md whitespace-nowrap"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{sending ? 'Sending...' : 'Send Notification'}</span>
            </button>
          </div>
        </form>
      </section>

      {/* Sent Notification History */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-display font-normal text-lg text-[#dfe7e0]">
            Sent Notifications ({notifications.length})
          </h2>
        </div>

        {notifications.length === 0 ? (
          <div className="rounded-xl bg-[#0a0e14] border border-[#dfe7e0]/12 p-10 text-center space-y-2">
            <Bell className="w-6 h-6 text-[#66726c] mx-auto" />
            <p className="text-xs text-[#8a968f]">
              No notifications dispatched yet. Use the form above to send your
              first announcement.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {notifications.map((item) => {
              const expanded = expandedReceiptId === item.id;
              return (
                <article
                  key={item.id}
                  className="rounded-xl bg-[#0a0e14] border border-[#dfe7e0]/12 p-5 space-y-3"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div className="space-y-1.5 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <PriorityBadge priority={item.priority} />
                        <span className="font-mono-tech text-[11px] text-[#8a968f]">
                          {item.id}
                        </span>
                        <span className="text-[11px] text-[#8a968f]">
                          · {formatDateTime(item.createdAt)}
                        </span>
                      </div>
                      <h3 className="text-sm font-medium text-[#dfe7e0]">
                        {item.title}
                      </h3>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() =>
                          setExpandedReceiptId(expanded ? null : item.id)
                        }
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-mono-tech text-[#e8ad26] bg-[#e8ad26]/10 border border-[#e8ad26]/30 rounded-md"
                      >
                        <CheckCheck className="w-3.5 h-3.5" />
                        <span>
                          Read: {item.readCount} / {item.totalRecipients}
                        </span>
                        {expanded ? (
                          <ChevronUp className="w-3 h-3" />
                        ) : (
                          <ChevronDown className="w-3 h-3" />
                        )}
                      </button>

                      <button
                        type="button"
                        disabled={deletingId === item.id}
                        onClick={() => handleDelete(item.id)}
                        aria-label="Delete notification"
                        className="w-8 h-8 rounded-md border border-[#e0231c]/30 bg-[#e0231c]/10 hover:bg-[#e0231c] text-[#ff6b66] hover:text-white flex items-center justify-center transition-colors disabled:opacity-50"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <p className="text-xs text-[#c7d1ca] whitespace-pre-line leading-relaxed bg-[#05070a] border border-[#dfe7e0]/8 rounded-md p-3">
                    {item.message}
                  </p>

                  <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-[#8a968f]">
                    <span className="inline-flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-[#e8ad26]" />
                      <span>Recipients: {item.targetLabels.join(', ')}</span>
                    </span>
                    <span>Sent by {item.createdBy}</span>
                  </div>

                  {expanded && (
                    <div className="pt-3 border-t border-[#dfe7e0]/10 space-y-2">
                      <p className="text-[11px] font-mono-tech uppercase tracking-[0.12em] text-[#8a968f]">
                        Read Receipts
                      </p>
                      {item.readBy.length === 0 ? (
                        <p className="text-xs text-[#7a8680]">
                          No employees have marked this notification as read yet.
                        </p>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {item.readBy.map((r) => (
                            <div
                              key={r.employeeId}
                              className="flex items-center justify-between gap-2 px-3 py-2 rounded-md bg-[#05070a] border border-emerald-500/20 text-xs"
                            >
                              <span className="text-[#dfe7e0] truncate">
                                <span className="font-mono-tech text-emerald-300">
                                  {r.employeeCode}
                                </span>{' '}
                                · {r.employeeName}
                              </span>
                              <span className="font-mono-tech text-[10px] text-[#8a968f] shrink-0">
                                {formatDateTime(r.readAt)}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
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
// EMPLOYEE NOTIFICATION INBOX
// ============================================================================

export function EmployeeNotificationsView({
  notifications,
  unreadCount,
  authFetch,
  onReload,
  showToast,
}: {
  notifications: EmployeeNotificationRecord[];
  unreadCount: number;
  authFetch: (url: string, init?: RequestInit) => Promise<Response>;
  onReload: () => void;
  showToast: (msg: string) => void;
}) {
  const [filter, setFilter] = useState<'all' | 'unread' | 'read'>('all');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [markingAll, setMarkingAll] = useState(false);

  const filtered = useMemo(() => {
    if (filter === 'unread') return notifications.filter((n) => !n.isRead);
    if (filter === 'read') return notifications.filter((n) => n.isRead);
    return notifications;
  }, [notifications, filter]);

  const handleMarkRead = async (id: string) => {
    setBusyId(id);
    try {
      const res = await authFetch(`/api/employee/notifications/${id}/read`, {
        method: 'POST',
      });
      if (res.ok) {
        onReload();
      }
    } finally {
      setBusyId(null);
    }
  };

  const handleMarkAllRead = async () => {
    setMarkingAll(true);
    try {
      const res = await authFetch('/api/employee/notifications/read-all', {
        method: 'POST',
      });
      if (res.ok) {
        showToast('All notifications marked as read.');
        onReload();
      }
    } finally {
      setMarkingAll(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <p className="font-mono-tech text-[11px] uppercase tracking-[0.16em] text-[#e8ad26]">
            Company Announcements &amp; Alerts
          </p>
          <h1 className="font-display font-normal text-2xl text-[#dfe7e0]">
            Notification Centre
          </h1>
          <p className="text-xs text-[#9aa5a0]">
            Live announcements and instructions from Alorix Administration.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-md bg-[#0a0e14] border border-[#dfe7e0]/12 p-0.5 text-[11px]">
            {(
              [
                ['all', `All (${notifications.length})`],
                ['unread', `Unread (${unreadCount})`],
                ['read', `Read (${notifications.length - unreadCount})`],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setFilter(key)}
                className={`px-2.5 py-1.5 rounded font-medium transition-colors whitespace-nowrap ${
                  filter === key
                    ? 'bg-[#e0231c] text-white'
                    : 'text-[#9aa5a0] hover:text-[#dfe7e0]'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {unreadCount > 0 && (
            <button
              type="button"
              disabled={markingAll}
              onClick={handleMarkAllRead}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#e8ad26] bg-[#e8ad26]/10 border border-[#e8ad26]/35 rounded-md whitespace-nowrap disabled:opacity-60"
            >
              <CheckCheck className="w-3.5 h-3.5" />
              <span>{markingAll ? 'Updating...' : 'Mark All Read'}</span>
            </button>
          )}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-xl bg-[#0a0e14] border border-[#dfe7e0]/12 p-10 text-center space-y-2">
          <Bell className="w-7 h-7 text-[#66726c] mx-auto" />
          <p className="text-sm text-[#dfe7e0]">
            {filter === 'unread'
              ? 'You are all caught up — no unread notifications.'
              : 'No notifications received yet.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((item) => (
            <article
              key={item.id}
              className={`rounded-xl border p-5 space-y-3 transition-colors ${
                item.isRead
                  ? 'bg-[#0a0e14] border-[#dfe7e0]/10'
                  : 'bg-[#0d121a] border-[#e8ad26]/45'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                <div className="space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    {!item.isRead && (
                      <span className="inline-block w-2 h-2 rounded-full bg-[#e0231c]" />
                    )}
                    <PriorityBadge priority={item.priority} />
                    <span className="text-[11px] font-mono-tech text-[#8a968f]">
                      {formatDateTime(item.createdAt)}
                    </span>
                  </div>
                  <h3 className="text-sm font-medium text-[#dfe7e0]">
                    {item.title}
                  </h3>
                </div>

                {!item.isRead ? (
                  <button
                    type="button"
                    disabled={busyId === item.id}
                    onClick={() => handleMarkRead(item.id)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-[#e0231c] hover:bg-[#c81e17] disabled:opacity-60 rounded-md whitespace-nowrap shrink-0"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Mark as Read</span>
                  </button>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[11px] text-emerald-300 shrink-0">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>
                      Read {item.readAt ? formatDateTime(item.readAt) : ''}
                    </span>
                  </span>
                )}
              </div>

              <p className="text-xs text-[#c7d1ca] whitespace-pre-line leading-relaxed bg-[#05070a] border border-[#dfe7e0]/8 rounded-md p-3">
                {item.message}
              </p>

              <p className="text-[11px] text-[#8a968f]">
                From: {item.createdBy}
              </p>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
