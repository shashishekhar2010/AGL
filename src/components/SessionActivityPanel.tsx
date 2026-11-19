import { useMemo, useState } from 'react';
import {
  Activity,
  Clock,
  LogIn,
  LogOut,
  Search,
  UserCheck,
} from 'lucide-react';
import { formatDateTime } from '../utils/driveLinks';

export interface SessionLogRecord {
  id: string;
  sessionId: string;
  accountId: string;
  username: string;
  employeeCode?: string;
  displayName: string;
  role: 'super_admin' | 'admin' | 'employee';
  department?: string;
  loginAt: string;
  logoutAt: string | null;
  durationSeconds: number | null;
  status: 'active' | 'logged_out';
  userAgent?: string;
}

function formatDuration(seconds: number | null, loginAt: string): string {
  let secs = seconds;
  if (secs === null) {
    const startMs = new Date(loginAt).getTime();
    secs = Number.isFinite(startMs)
      ? Math.max(0, Math.round((Date.now() - startMs) / 1000))
      : 0;
  }
  const hrs = Math.floor(secs / 3600);
  const mins = Math.floor((secs % 3600) / 60);
  const rem = secs % 60;
  if (hrs > 0) return `${hrs}h ${mins}m ${rem}s`;
  if (mins > 0) return `${mins}m ${rem}s`;
  return `${rem}s`;
}

function RoleBadge({ role }: { role: SessionLogRecord['role'] }) {
  if (role === 'super_admin') {
    return (
      <span className="text-[10px] font-mono-tech uppercase tracking-[0.1em] px-2 py-0.5 rounded bg-[#e8ad26]/16 text-[#e8ad26] border border-[#e8ad26]/40">
        Master Admin
      </span>
    );
  }
  if (role === 'admin') {
    return (
      <span className="text-[10px] font-mono-tech uppercase tracking-[0.1em] px-2 py-0.5 rounded bg-[#e0231c]/16 text-[#ff7b76] border border-[#e0231c]/40">
        Admin
      </span>
    );
  }
  return (
    <span className="text-[10px] font-mono-tech uppercase tracking-[0.1em] px-2 py-0.5 rounded bg-sky-500/14 text-sky-300 border border-sky-500/35">
      Employee
    </span>
  );
}

// ============================================================================
// ADMIN LOGIN & LOGOUT ACTIVITY TRACKER
// ============================================================================

export function AdminSessionLogsView({
  logs,
}: {
  logs: SessionLogRecord[];
}) {
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'employee' | 'admin'>(
    'all'
  );
  const [statusFilter, setStatusFilter] = useState<
    'all' | 'active' | 'logged_out'
  >('all');

  const stats = useMemo(() => {
    const todayPrefix = new Date().toISOString().slice(0, 10);
    const active = logs.filter((l) => l.status === 'active').length;
    const loggedOut = logs.filter((l) => l.status === 'logged_out').length;
    const today = logs.filter((l) => l.loginAt.startsWith(todayPrefix)).length;
    return {
      total: logs.length,
      active,
      loggedOut,
      today,
    };
  }, [logs]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return logs.filter((item) => {
      if (roleFilter === 'employee' && item.role !== 'employee') return false;
      if (
        roleFilter === 'admin' &&
        item.role !== 'admin' &&
        item.role !== 'super_admin'
      ) {
        return false;
      }
      if (statusFilter !== 'all' && item.status !== statusFilter) return false;
      if (!q) return true;
      return [
        item.displayName,
        item.username,
        item.employeeCode || '',
        item.department || '',
        item.role,
      ]
        .join(' ')
        .toLowerCase()
        .includes(q);
    });
  }, [logs, search, roleFilter, statusFilter]);

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <p className="font-mono-tech text-[11px] uppercase tracking-[0.16em] text-[#e8ad26]">
          Live Attendance &amp; Access History
        </p>
        <h1 className="font-display font-normal text-2xl text-[#dfe7e0]">
          Login &amp; Logout Activity Log
        </h1>
        <p className="text-xs text-[#9aa5a0]">
          Every employee and administrator login and logout event is
          automatically recorded with exact timestamps and session duration.
          Logs are saved online and never erased on sign-out.
        </p>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 py-4 px-5 rounded-lg bg-[#080c12] border border-[#dfe7e0]/12">
        <div>
          <p className="text-[11px] uppercase tracking-[0.14em] text-[#8a968f]">
            Active / Online
          </p>
          <p className="font-mono-tech tabular-nums text-2xl text-[#22c55e] mt-1">
            {stats.active}
          </p>
        </div>
        <div>
          <p className="text-[11px] uppercase tracking-[0.14em] text-[#8a968f]">
            Total Logins
          </p>
          <p className="font-mono-tech tabular-nums text-2xl text-[#dfe7e0] mt-1">
            {stats.total}
          </p>
        </div>
        <div>
          <p className="text-[11px] uppercase tracking-[0.14em] text-[#8a968f]">
            Completed Logouts
          </p>
          <p className="font-mono-tech tabular-nums text-2xl text-[#e8ad26] mt-1">
            {stats.loggedOut}
          </p>
        </div>
        <div>
          <p className="text-[11px] uppercase tracking-[0.14em] text-[#8a968f]">
            Today&apos;s Sessions
          </p>
          <p className="font-mono-tech tabular-nums text-2xl text-[#dfe7e0] mt-1">
            {stats.today}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="relative flex-1 min-w-[220px] max-w-md">
          <Search className="w-3.5 h-3.5 text-[#8a968f] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, Employee ID, username, department..."
            className="w-full pl-9 pr-3 py-2 text-xs text-[#dfe7e0] bg-[#0a0e14] border border-[#dfe7e0]/15 rounded-md placeholder:text-[#66726c] focus:outline-none focus:border-[#e0231c]"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={roleFilter}
            onChange={(e) =>
              setRoleFilter(e.target.value as 'all' | 'employee' | 'admin')
            }
            aria-label="Filter by role"
            className="px-3 py-2 text-xs text-[#dfe7e0] bg-[#0a0e14] border border-[#dfe7e0]/15 rounded-md focus:outline-none focus:border-[#e0231c]"
          >
            <option value="all">All Roles</option>
            <option value="employee">Employees Only</option>
            <option value="admin">Admins Only</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) =>
              setStatusFilter(
                e.target.value as 'all' | 'active' | 'logged_out'
              )
            }
            aria-label="Filter by session status"
            className="px-3 py-2 text-xs text-[#dfe7e0] bg-[#0a0e14] border border-[#dfe7e0]/15 rounded-md focus:outline-none focus:border-[#e0231c]"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active / Online</option>
            <option value="logged_out">Logged Out</option>
          </select>
        </div>
      </div>

      {/* Session Logs Table */}
      <section className="rounded-xl bg-[#0a0e14] border border-[#dfe7e0]/12 overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-10 text-center space-y-2">
            <Activity className="w-6 h-6 text-[#66726c] mx-auto" />
            <p className="text-xs text-[#8a968f]">
              No login or logout records match your current filter.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-[#dfe7e0]/10 bg-[#0d121a] text-[10px] font-mono-tech uppercase tracking-[0.14em] text-[#8a968f]">
                  <th className="px-4 py-3 font-medium">Account / Staff</th>
                  <th className="px-4 py-3 font-medium">Role</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Logged In At</th>
                  <th className="px-4 py-3 font-medium">Logged Out At</th>
                  <th className="px-4 py-3 font-medium text-right">Duration</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#dfe7e0]/8">
                {filtered.map((row) => (
                  <tr
                    key={row.id}
                    className="hover:bg-white/[0.02] transition-colors"
                  >
                    <td className="px-4 py-3.5">
                      <div className="space-y-0.5">
                        <p className="font-medium text-[#dfe7e0]">
                          {row.displayName}
                          {row.employeeCode && (
                            <span className="ml-2 font-mono-tech text-[11px] text-[#e8ad26]">
                              {row.employeeCode}
                            </span>
                          )}
                        </p>
                        <p className="font-mono-tech text-[11px] text-[#8a968f]">
                          {row.username}
                          {row.department ? ` · ${row.department}` : ''}
                        </p>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <RoleBadge role={row.role} />
                    </td>
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      {row.status === 'active' ? (
                        <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-emerald-300">
                          <span className="w-2 h-2 rounded-full bg-emerald-400" />
                          Online / Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-[11px] text-[#9aa5a0]">
                          <LogOut className="w-3 h-3 text-[#8a968f]" />
                          Logged Out
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 whitespace-nowrap font-mono-tech text-[11px] text-[#dfe7e0]">
                      <span className="inline-flex items-center gap-1.5">
                        <LogIn className="w-3 h-3 text-emerald-400" />
                        {formatDateTime(row.loginAt)}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 whitespace-nowrap font-mono-tech text-[11px]">
                      {row.logoutAt ? (
                        <span className="text-[#c7d1ca]">
                          {formatDateTime(row.logoutAt)}
                        </span>
                      ) : (
                        <span className="text-emerald-300/80">Still signed in</span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 whitespace-nowrap text-right font-mono-tech text-[11px] tabular-nums text-[#e8ad26]">
                      <span className="inline-flex items-center gap-1 justify-end">
                        <Clock className="w-3 h-3" />
                        {formatDuration(row.durationSeconds, row.loginAt)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

// ============================================================================
// EMPLOYEE PERSONAL LOGIN & LOGOUT HISTORY
// ============================================================================

export function EmployeeSessionHistoryView({
  logs,
}: {
  logs: SessionLogRecord[];
}) {
  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <p className="font-mono-tech text-[11px] uppercase tracking-[0.16em] text-[#e8ad26]">
          My Attendance Record
        </p>
        <h1 className="font-display font-normal text-2xl text-[#dfe7e0]">
          My Login &amp; Logout History
        </h1>
        <p className="text-xs text-[#9aa5a0]">
          Every time you sign in or sign out of the Alorix Portal, your session
          timestamp and duration are automatically saved online.
        </p>
      </div>

      <section className="rounded-xl bg-[#0a0e14] border border-[#dfe7e0]/12 overflow-hidden">
        {logs.length === 0 ? (
          <div className="p-10 text-center space-y-2">
            <UserCheck className="w-6 h-6 text-[#66726c] mx-auto" />
            <p className="text-xs text-[#8a968f]">
              Your login and logout history will appear here.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-[#dfe7e0]/10 bg-[#0d121a] text-[10px] font-mono-tech uppercase tracking-[0.14em] text-[#8a968f]">
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Logged In At</th>
                  <th className="px-4 py-3 font-medium">Logged Out At</th>
                  <th className="px-4 py-3 font-medium text-right">Duration</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#dfe7e0]/8">
                {logs.map((row) => (
                  <tr key={row.id} className="hover:bg-white/[0.02]">
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      {row.status === 'active' ? (
                        <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-emerald-300">
                          <span className="w-2 h-2 rounded-full bg-emerald-400" />
                          Active Session
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-[11px] text-[#9aa5a0]">
                          <LogOut className="w-3 h-3 text-[#8a968f]" />
                          Logged Out
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 whitespace-nowrap font-mono-tech text-[11px] text-[#dfe7e0]">
                      {formatDateTime(row.loginAt)}
                    </td>
                    <td className="px-4 py-3.5 whitespace-nowrap font-mono-tech text-[11px] text-[#c7d1ca]">
                      {row.logoutAt ? formatDateTime(row.logoutAt) : 'Current session'}
                    </td>
                    <td className="px-4 py-3.5 whitespace-nowrap text-right font-mono-tech text-[11px] tabular-nums text-[#e8ad26]">
                      {formatDuration(row.durationSeconds, row.loginAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
