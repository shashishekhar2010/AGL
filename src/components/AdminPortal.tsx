import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import {
  Activity,
  Bell,
  Check,
  CheckCircle2,
  ClipboardList,
  Copy,
  Database,
  Eye,
  EyeOff,
  Inbox,
  KeyRound,
  Lock,
  LogOut,
  Menu,
  MessageSquare,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Target,
  Trash2,
  UserCheck,
  UserX,
  Users,
  Video,
  X,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { COMPANY_LOGO_URL } from '../data/alorixContent';
import EmployeeWorkspace, {
  type EmployeeProfileRecord,
} from './EmployeeWorkspace';
import SuperAdminAccountsPanel, {
  type ManagedAdminRecord,
} from './SuperAdminAccountsPanel';
import AdminWeeklyTargetsPanel, {
  type WeeklyTargetRecord,
} from './AdminWeeklyTargetsPanel';
import AdminExtraWorkPanel, {
  type ExtraWorkRecord,
} from './AdminExtraWorkPanel';
import AdminBackupPanel from './AdminBackupPanel';
import EnquiriesInboxPanel, {
  type EnquiryRecord,
} from './EnquiriesInboxPanel';
import TeamChatPanel, { type ChatMessageRecord } from './TeamChatPanel';
import {
  AdminMeetingsView,
  MeetingLiveAlertBanner,
  type MeetingRecord,
} from './MeetingsPanel';
import BrowserNotificationBanner from './BrowserNotificationBanner';
import {
  AdminNotificationsView,
  type AdminNotificationRecord,
} from './NotificationCentrePanel';
import {
  AdminSessionLogsView,
  type SessionLogRecord,
} from './SessionActivityPanel';
import {
  getBrowserNotificationPermission,
  requestBrowserNotificationPermission,
  showBrowserNotification,
  type BrowserNotifPermission,
} from '../utils/browserNotifications';
import {
  usePortalRealtime,
  type PortalRealtimeMessage,
} from '../utils/usePortalRealtime';
import { resolveApiUrl } from '../utils/apiBase';

interface AdminSessionInfo {
  accountId?: string;
  email: string;
  displayName?: string;
  role: 'super_admin' | 'admin' | 'employee';
  employee?: EmployeeProfileRecord;
}

interface EmployeeRecord {
  id: string;
  employeeCode: string;
  fullName: string;
  loginId: string;
  role: string;
  department: string;
  permissions: string[];
  status: 'active' | 'suspended';
  notes: string;
  createdAt: string;
  updatedAt: string;
  passwordUpdatedAt: string;
  createdBy: string;
}

interface AuditEntry {
  id: string;
  timestamp: string;
  actor: string;
  action: string;
  target: string;
  detail: string;
}

type AdminTab =
  | 'employees'
  | 'targets'
  | 'extra_work'
  | 'notifications'
  | 'chat'
  | 'meetings'
  | 'session_logs'
  | 'admins'
  | 'roles'
  | 'audit'
  | 'enquiries'
  | 'backup';

const SESSION_TOKEN_KEY = 'alorix_admin_token_v1';

const ROLE_PRESETS: {
  role: string;
  department: string;
  defaultPermissions: string[];
  description: string;
}[] = [
  {
    role: 'Operations Manager',
    department: 'International Trade',
    defaultPermissions: ['Orders', 'Enquiries', 'Logistics', 'Inventory', 'Reports'],
    description: 'Oversees international shipments, client orders, and operational reporting.',
  },
  {
    role: 'Sales Executive',
    department: 'Commercial & Sales',
    defaultPermissions: ['Orders', 'Enquiries', 'Product Catalogue'],
    description: 'Handles buyer quotations, WhatsApp orders, and client enquiries.',
  },
  {
    role: 'Logistics Coordinator',
    department: 'Export & Freight',
    defaultPermissions: ['Orders', 'Logistics', 'Dispatch'],
    description: 'Manages container bookings, customs paperwork, and international dispatch.',
  },
  {
    role: 'Quality Assurance',
    department: 'Lab & Compliance',
    defaultPermissions: ['Product Catalogue', 'Inventory', 'Reports'],
    description: 'Verifies sieve grades, batch COA certificates, and chemical purity.',
  },
  {
    role: 'Warehouse Supervisor',
    department: 'Inventory & Packing',
    defaultPermissions: ['Inventory', 'Dispatch'],
    description: 'Controls moisture-barrier sack packing, drums, and stock dispatch.',
  },
  {
    role: 'Accounts & Finance',
    department: 'Finance',
    defaultPermissions: ['Orders', 'Reports'],
    description: 'Coordinates proforma invoices, LC documentation, and trade settlements.',
  },
];

const ALL_PERMISSION_MODULES = [
  'Orders',
  'Enquiries',
  'Product Catalogue',
  'Logistics',
  'Dispatch',
  'Inventory',
  'Reports',
];

function generateStrongPassword(length = 12): string {
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const lower = 'abcdefghijkmnopqrstuvwxyz';
  const digits = '23456789';
  const symbols = '@#$%&*';
  const all = upper + lower + digits + symbols;

  const pick = (pool: string) =>
    pool[Math.floor(Math.random() * pool.length)];

  const chars = [pick(upper), pick(lower), pick(digits), pick(symbols)];
  for (let i = chars.length; i < length; i += 1) {
    chars.push(pick(all));
  }
  for (let i = chars.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join('');
}

function formatDateTime(iso: string): string {
  try {
    const d = new Date(iso);
    return new Intl.DateTimeFormat('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(d);
  } catch {
    return iso;
  }
}

export default function AdminPortal() {
  const [token, setToken] = useState<string>(() => {
    if (typeof window === 'undefined') return '';
    return (
      window.localStorage.getItem(SESSION_TOKEN_KEY) ||
      window.sessionStorage.getItem(SESSION_TOKEN_KEY) ||
      ''
    );
  });
  const [admin, setAdmin] = useState<AdminSessionInfo | null>(null);
  const [checkingSession, setCheckingSession] = useState(true);

  // Login Form State (strictly blank — zero hints or prefilled values)
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loginSubmitting, setLoginSubmitting] = useState(false);

  // Workspace State
  const [activeTab, setActiveTab] = useState<AdminTab>('employees');
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [employees, setEmployees] = useState<EmployeeRecord[]>([]);
  const [weeklyTargets, setWeeklyTargets] = useState<WeeklyTargetRecord[]>([]);
  const [extraWorkItems, setExtraWorkItems] = useState<ExtraWorkRecord[]>([]);
  const [notifications, setNotifications] = useState<AdminNotificationRecord[]>([]);
  const [meetings, setMeetings] = useState<MeetingRecord[]>([]);
  const [chatUnreadCount, setChatUnreadCount] = useState(0);
  const [incomingChatMsg, setIncomingChatMsg] =
    useState<ChatMessageRecord | null>(null);
  const [liveMeetingAlert, setLiveMeetingAlert] = useState<{
    meeting: MeetingRecord;
    kind: 'reminder' | 'started';
  } | null>(null);
  const [notifPermission, setNotifPermission] =
    useState<BrowserNotifPermission>(() => getBrowserNotificationPermission());
  const [sessionLogs, setSessionLogs] = useState<SessionLogRecord[]>([]);
  const [managedAdmins, setManagedAdmins] = useState<ManagedAdminRecord[]>([]);
  const [nextEmployeeCode, setNextEmployeeCode] = useState('AGL-EMP-001');
  const [auditLogs, setAuditLogs] = useState<AuditEntry[]>([]);
  const [enquiries, setEnquiries] = useState<EnquiryRecord[]>([]);
  const [loadingData, setLoadingData] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'suspended'>('all');
  const [roleFilter, setRoleFilter] = useState<string>('all');

  // Create Employee Modal State
  const [createOpen, setCreateOpen] = useState(false);
  const [cCode, setCCode] = useState('');
  const [cName, setCName] = useState('');
  const [cLoginId, setCLoginId] = useState('');
  const [cRoleMode, setCRoleMode] = useState<string>(ROLE_PRESETS[0].role);
  const [cCustomRole, setCCustomRole] = useState('');
  const [cDepartment, setCDepartment] = useState(ROLE_PRESETS[0].department);
  const [cPermissions, setCPermissions] = useState<string[]>(
    ROLE_PRESETS[0].defaultPermissions
  );
  const [cPassword, setCPassword] = useState('');
  const [cShowPassword, setCShowPassword] = useState(true);
  const [cNotes, setCNotes] = useState('');
  const [cError, setCError] = useState<string | null>(null);
  const [cSubmitting, setCSubmitting] = useState(false);

  // One-time Credential Summary Modal (shown right after create or password reset)
  const [credentialReceipt, setCredentialReceipt] = useState<{
    heading: string;
    employeeCode: string;
    fullName: string;
    loginId: string;
    role: string;
    password: string;
  } | null>(null);
  const [copiedReceipt, setCopiedReceipt] = useState(false);

  // Edit Employee Modal State
  const [editingEmployee, setEditingEmployee] = useState<EmployeeRecord | null>(null);
  const [eCode, setECode] = useState('');
  const [eName, setEName] = useState('');
  const [eLoginId, setELoginId] = useState('');
  const [eRole, setERole] = useState('');
  const [eDepartment, setEDepartment] = useState('');
  const [eStatus, setEStatus] = useState<'active' | 'suspended'>('active');
  const [ePermissions, setEPermissions] = useState<string[]>([]);
  const [eNotes, setENotes] = useState('');
  const [eError, setEError] = useState<string | null>(null);
  const [eSubmitting, setESubmitting] = useState(false);

  // Change Password Modal State (Admin-only)
  const [passwordTarget, setPasswordTarget] = useState<EmployeeRecord | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(true);
  const [pwError, setPwError] = useState<string | null>(null);
  const [pwSubmitting, setPwSubmitting] = useState(false);

  // Delete Confirmation Modal State
  const [deleteTarget, setDeleteTarget] = useState<EmployeeRecord | null>(null);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    window.setTimeout(() => {
      setToast((curr) => (curr === msg ? null : curr));
    }, 3400);
  }, []);

  const adminFetch = useCallback(
    async (url: string, init: RequestInit = {}) => {
      const headers = new Headers(init.headers);
      if (token) {
        headers.set('Authorization', `Bearer ${token}`);
      }
      if (init.body && !headers.has('Content-Type')) {
        headers.set('Content-Type', 'application/json');
      }
      const res = await fetch(resolveApiUrl(url), {
        ...init,
        headers,
        credentials: 'include',
      });
      if (res.status === 401) {
        setAdmin(null);
        setToken('');
        if (typeof window !== 'undefined') {
          window.localStorage.removeItem(SESSION_TOKEN_KEY);
          window.sessionStorage.removeItem(SESSION_TOKEN_KEY);
        }
      }
      return res;
    },
    [token]
  );

  const loadWorkspaceData = useCallback(async () => {
    if (!admin || admin.role === 'employee') return;
    setLoadingData(true);
    try {
      const requests: Promise<Response>[] = [
        adminFetch('/api/admin/employees'),
        adminFetch('/api/admin/audit'),
        adminFetch('/api/admin/enquiries'),
        adminFetch('/api/admin/targets'),
        adminFetch('/api/admin/extra-work'),
        adminFetch('/api/admin/notifications'),
        adminFetch('/api/admin/session-logs'),
        adminFetch('/api/admin/meetings'),
        adminFetch('/api/chat/directory'),
      ];
      if (admin.role === 'super_admin') {
        requests.push(adminFetch('/api/super-admin/admins'));
      }

      const [
        empRes,
        auditRes,
        enqRes,
        targetsRes,
        extraRes,
        notifRes,
        sessionsRes,
        meetingsRes,
        chatDirRes,
        adminsRes,
      ] = await Promise.all(requests);

      if (empRes.ok) {
        const data = await empRes.json();
        setEmployees(Array.isArray(data.employees) ? data.employees : []);
        if (typeof data.nextEmployeeCode === 'string') {
          setNextEmployeeCode(data.nextEmployeeCode);
        }
      }
      if (auditRes.ok) {
        const data = await auditRes.json();
        setAuditLogs(Array.isArray(data.logs) ? data.logs : []);
      }
      if (enqRes.ok) {
        const data = await enqRes.json();
        setEnquiries(Array.isArray(data.enquiries) ? data.enquiries : []);
      }
      if (targetsRes.ok) {
        const data = await targetsRes.json();
        setWeeklyTargets(Array.isArray(data.targets) ? data.targets : []);
      }
      if (extraRes.ok) {
        const data = await extraRes.json();
        setExtraWorkItems(Array.isArray(data.items) ? data.items : []);
      }
      if (notifRes.ok) {
        const data = await notifRes.json();
        setNotifications(
          Array.isArray(data.notifications) ? data.notifications : []
        );
      }
      if (sessionsRes.ok) {
        const data = await sessionsRes.json();
        setSessionLogs(Array.isArray(data.logs) ? data.logs : []);
      }
      if (meetingsRes.ok) {
        const data = await meetingsRes.json();
        setMeetings(Array.isArray(data.meetings) ? data.meetings : []);
      }
      if (chatDirRes.ok) {
        const data = await chatDirRes.json();
        if (typeof data.totalUnread === 'number') {
          setChatUnreadCount(data.totalUnread);
        }
      }
      if (adminsRes && adminsRes.ok) {
        const data = await adminsRes.json();
        setManagedAdmins(Array.isArray(data.admins) ? data.admins : []);
      }
    } finally {
      setLoadingData(false);
    }
  }, [admin, adminFetch]);

  // Verify existing session on mount
  useEffect(() => {
    let cancelled = false;
    async function verifySession() {
      try {
        const headers: Record<string, string> = {};
        if (token) {
          headers.Authorization = `Bearer ${token}`;
        }
        const res = await fetch(resolveApiUrl('/api/admin/me'), {
          headers,
          credentials: 'include',
        });
        if (!cancelled && res.ok) {
          const data = await res.json();
          if (data.ok && data.admin) {
            setAdmin(data.admin);
          }
        }
      } catch {
        // Unauthenticated
      } finally {
        if (!cancelled) setCheckingSession(false);
      }
    }
    verifySession();
    return () => {
      cancelled = true;
    };
  }, [token]);

  useEffect(() => {
    if (admin && admin.role !== 'employee') {
      loadWorkspaceData();
    }
  }, [admin, loadWorkspaceData]);

  const handleRealtimeEvent = useCallback(
    (msg: PortalRealtimeMessage) => {
      if (msg.event === 'chat:message') {
        const chatMsg = msg.payload as ChatMessageRecord;
        if (chatMsg && chatMsg.id) {
          setIncomingChatMsg(chatMsg);
          const myId = admin?.accountId || '';
          if (chatMsg.senderId !== myId) {
            if (activeTab !== 'chat') {
              setChatUnreadCount((c) => c + 1);
            }
            showBrowserNotification({
              title:
                chatMsg.channelType === 'group'
                  ? `Company Group · ${chatMsg.senderName}`
                  : `Message from ${chatMsg.senderName}`,
              body: chatMsg.text,
              tag: `chat-${chatMsg.id}`,
              onClick: () => setActiveTab('chat'),
            });
          }
        }
        return;
      }

      if (msg.event === 'meeting:created' || msg.event === 'meeting:deleted') {
        void loadWorkspaceData();
        return;
      }

      if (msg.event === 'meeting:reminder' || msg.event === 'meeting:started') {
        const payload = msg.payload as { meeting?: MeetingRecord };
        if (payload?.meeting) {
          const kind = msg.event === 'meeting:started' ? 'started' : 'reminder';
          setLiveMeetingAlert({ meeting: payload.meeting, kind });
          showToast(
            kind === 'started'
              ? `Meeting starting now: ${payload.meeting.title}`
              : `Meeting starts in 5 min: ${payload.meeting.title}`
          );
          showBrowserNotification({
            title:
              kind === 'started'
                ? `Meeting Starting Now: ${payload.meeting.title}`
                : `Meeting in 5 Minutes: ${payload.meeting.title}`,
            body: 'Click to view meeting link and join.',
            tag: `meeting-${kind}-${payload.meeting.id}`,
            urgent: true,
            onClick: () => setActiveTab('meetings'),
          });
          void loadWorkspaceData();
        }
        return;
      }

      if (msg.event === 'enquiry:updated') {
        const updated = msg.payload as EnquiryRecord;
        if (updated && updated.id) {
          setEnquiries((prev) =>
            prev.map((item) => (item.id === updated.id ? updated : item))
          );
        }
        return;
      }

      if (msg.event === 'enquiry:created') {
        const created = msg.payload as EnquiryRecord;
        if (created && created.id) {
          setEnquiries((prev) =>
            prev.some((item) => item.id === created.id)
              ? prev
              : [created, ...prev]
          );
          showToast(`New business enquiry from ${created.companyName}`);
        }
      }
    },
    [activeTab, admin?.accountId, loadWorkspaceData, showToast]
  );

  const { onlineAccountIds } = usePortalRealtime({
    token,
    enabled: Boolean(admin && admin.role !== 'employee'),
    onEvent: handleRealtimeEvent,
    onReconnect: loadWorkspaceData,
  });

  // Close open modals on Escape
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (credentialReceipt) setCredentialReceipt(null);
      else if (deleteTarget) setDeleteTarget(null);
      else if (passwordTarget) setPasswordTarget(null);
      else if (editingEmployee) setEditingEmployee(null);
      else if (createOpen) setCreateOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [credentialReceipt, deleteTarget, passwordTarget, editingEmployee, createOpen]);

  const handleLoginSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoginError(null);

    // Request browser/Chrome notification permission directly inside the login click gesture
    if (getBrowserNotificationPermission() === 'default') {
      void requestBrowserNotificationPermission().then((perm) => {
        setNotifPermission(perm);
      });
    }

    setLoginSubmitting(true);
    try {
      const res = await fetch(resolveApiUrl('/api/admin/login'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          username: loginUsername.trim(),
          password: loginPassword,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setLoginError(data.error || 'Invalid credentials.');
        return;
      }
      if (typeof data.token === 'string') {
        setToken(data.token);
        window.localStorage.setItem(SESSION_TOKEN_KEY, data.token);
        window.sessionStorage.removeItem(SESSION_TOKEN_KEY);
      }
      setAdmin(data.admin);
      setLoginPassword('');
    } catch {
      setLoginError('Unable to reach server. Please try again.');
    } finally {
      setLoginSubmitting(false);
    }
  };

  const handleLogout = async () => {
    try {
      await adminFetch('/api/admin/logout', { method: 'POST' });
    } catch {
      // ignore
    }
    setAdmin(null);
    setToken('');
    setEmployees([]);
    setWeeklyTargets([]);
    setExtraWorkItems([]);
    setNotifications([]);
    setMeetings([]);
    setChatUnreadCount(0);
    setIncomingChatMsg(null);
    setLiveMeetingAlert(null);
    setSessionLogs([]);
    setManagedAdmins([]);
    setAuditLogs([]);
    setEnquiries([]);
    setActiveTab('employees');
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(SESSION_TOKEN_KEY);
      window.sessionStorage.removeItem(SESSION_TOKEN_KEY);
    }
  };

  const openCreateModal = (presetRole?: string) => {
    const matchedPreset =
      ROLE_PRESETS.find((r) => r.role === presetRole) || ROLE_PRESETS[0];
    setCCode(nextEmployeeCode);
    setCName('');
    setCLoginId('');
    setCRoleMode(matchedPreset.role);
    setCCustomRole('');
    setCDepartment(matchedPreset.department);
    setCPermissions([...matchedPreset.defaultPermissions]);
    setCPassword('');
    setCShowPassword(true);
    setCNotes('');
    setCError(null);
    setCreateOpen(true);
  };

  const handleCreateRoleChange = (selected: string) => {
    setCRoleMode(selected);
    const preset = ROLE_PRESETS.find((r) => r.role === selected);
    if (preset) {
      setCDepartment(preset.department);
      setCPermissions([...preset.defaultPermissions]);
    }
  };

  const handleCreateEmployee = async (e: FormEvent) => {
    e.preventDefault();
    setCError(null);
    const resolvedRole =
      cRoleMode === '__custom__' ? cCustomRole.trim() : cRoleMode.trim();

    if (!cName.trim() || !cLoginId.trim() || !resolvedRole || cPassword.length < 6) {
      setCError(
        'Please complete Full Name, Login ID, Role, and a password of at least 6 characters.'
      );
      return;
    }

    setCSubmitting(true);
    try {
      const res = await adminFetch('/api/admin/employees', {
        method: 'POST',
        body: JSON.stringify({
          employeeCode: cCode.trim() || nextEmployeeCode,
          fullName: cName.trim(),
          loginId: cLoginId.trim().toLowerCase(),
          role: resolvedRole,
          department: cDepartment.trim() || 'Operations',
          permissions: cPermissions,
          password: cPassword,
          notes: cNotes.trim(),
          status: 'active',
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setCError(data.error || 'Could not create employee.');
        return;
      }

      const created: EmployeeRecord = data.employee;
      setEmployees((prev) => [created, ...prev]);
      if (typeof data.nextEmployeeCode === 'string') {
        setNextEmployeeCode(data.nextEmployeeCode);
      }
      setCreateOpen(false);
      setCredentialReceipt({
        heading: 'Employee Account Created',
        employeeCode: created.employeeCode,
        fullName: created.fullName,
        loginId: created.loginId,
        role: created.role,
        password: cPassword,
      });
      setCopiedReceipt(false);
      showToast(`Created employee ${created.employeeCode} (${created.fullName})`);
      loadWorkspaceData();
    } catch {
      setCError('Network error while saving employee.');
    } finally {
      setCSubmitting(false);
    }
  };

  const openEditModal = (emp: EmployeeRecord) => {
    setEditingEmployee(emp);
    setECode(emp.employeeCode);
    setEName(emp.fullName);
    setELoginId(emp.loginId);
    setERole(emp.role);
    setEDepartment(emp.department);
    setEStatus(emp.status);
    setEPermissions([...emp.permissions]);
    setENotes(emp.notes || '');
    setEError(null);
  };

  const handleSaveEdit = async (e: FormEvent) => {
    e.preventDefault();
    if (!editingEmployee) return;
    setEError(null);
    setESubmitting(true);
    try {
      const res = await adminFetch(`/api/admin/employees/${editingEmployee.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          employeeCode: eCode.trim(),
          fullName: eName.trim(),
          loginId: eLoginId.trim().toLowerCase(),
          role: eRole.trim(),
          department: eDepartment.trim(),
          status: eStatus,
          permissions: ePermissions,
          notes: eNotes.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setEError(data.error || 'Unable to update employee.');
        return;
      }
      setEmployees((prev) =>
        prev.map((item) => (item.id === editingEmployee.id ? data.employee : item))
      );
      setEditingEmployee(null);
      showToast(`Updated ${data.employee.employeeCode} (${data.employee.role})`);
      loadWorkspaceData();
    } catch {
      setEError('Network error while updating employee.');
    } finally {
      setESubmitting(false);
    }
  };

  const openPasswordModal = (emp: EmployeeRecord) => {
    setPasswordTarget(emp);
    setNewPassword('');
    setConfirmPassword('');
    setShowNewPassword(true);
    setPwError(null);
  };

  const handleSavePassword = async (e: FormEvent) => {
    e.preventDefault();
    if (!passwordTarget) return;
    setPwError(null);

    if (newPassword.length < 6) {
      setPwError('Password must be at least 6 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPwError('Passwords do not match.');
      return;
    }

    setPwSubmitting(true);
    try {
      const res = await adminFetch(
        `/api/admin/employees/${passwordTarget.id}/password`,
        {
          method: 'POST',
          body: JSON.stringify({ password: newPassword }),
        }
      );
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setPwError(data.error || 'Unable to change password.');
        return;
      }
      setEmployees((prev) =>
        prev.map((item) => (item.id === passwordTarget.id ? data.employee : item))
      );
      const savedEmp: EmployeeRecord = data.employee;
      setPasswordTarget(null);
      setCredentialReceipt({
        heading: 'Employee Password Updated',
        employeeCode: savedEmp.employeeCode,
        fullName: savedEmp.fullName,
        loginId: savedEmp.loginId,
        role: savedEmp.role,
        password: newPassword,
      });
      setCopiedReceipt(false);
      showToast(`Password updated for ${savedEmp.employeeCode}`);
      loadWorkspaceData();
    } catch {
      setPwError('Network error while updating password.');
    } finally {
      setPwSubmitting(false);
    }
  };

  const handleToggleStatus = async (emp: EmployeeRecord) => {
    const nextStatus = emp.status === 'active' ? 'suspended' : 'active';
    try {
      const res = await adminFetch(`/api/admin/employees/${emp.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: nextStatus }),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        setEmployees((prev) =>
          prev.map((item) => (item.id === emp.id ? data.employee : item))
        );
        showToast(
          `${emp.employeeCode} marked as ${
            nextStatus === 'active' ? 'Active' : 'Suspended'
          }`
        );
        loadWorkspaceData();
      }
    } catch {
      showToast('Failed to update employee status.');
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleteSubmitting(true);
    try {
      const res = await adminFetch(`/api/admin/employees/${deleteTarget.id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        setEmployees((prev) => prev.filter((item) => item.id !== deleteTarget.id));
        if (typeof data.nextEmployeeCode === 'string') {
          setNextEmployeeCode(data.nextEmployeeCode);
        }
        showToast(`Deleted employee ${deleteTarget.employeeCode}`);
        setDeleteTarget(null);
        loadWorkspaceData();
      }
    } finally {
      setDeleteSubmitting(false);
    }
  };

  const copyReceiptCredentials = async () => {
    if (!credentialReceipt) return;
    const text = [
      'ALORIX GLOBAL INTERNATIONAL — EMPLOYEE CREDENTIALS',
      `Employee ID: ${credentialReceipt.employeeCode}`,
      `Name: ${credentialReceipt.fullName}`,
      `Login ID: ${credentialReceipt.loginId}`,
      `Role: ${credentialReceipt.role}`,
      `Password: ${credentialReceipt.password}`,
    ].join('\n');
    try {
      await navigator.clipboard.writeText(text);
      setCopiedReceipt(true);
      window.setTimeout(() => setCopiedReceipt(false), 2200);
    } catch {
      setCopiedReceipt(false);
    }
  };

  const distinctRoles = useMemo(() => {
    const set = new Set<string>();
    employees.forEach((e) => set.add(e.role));
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [employees]);

  const filteredEmployees = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return employees.filter((emp) => {
      if (statusFilter !== 'all' && emp.status !== statusFilter) return false;
      if (roleFilter !== 'all' && emp.role !== roleFilter) return false;
      if (!q) return true;
      return (
        emp.employeeCode.toLowerCase().includes(q) ||
        emp.fullName.toLowerCase().includes(q) ||
        emp.loginId.toLowerCase().includes(q) ||
        emp.role.toLowerCase().includes(q) ||
        emp.department.toLowerCase().includes(q)
      );
    });
  }, [employees, searchQuery, statusFilter, roleFilter]);

  const stats = useMemo(() => {
    const active = employees.filter((e) => e.status === 'active').length;
    const suspended = employees.filter((e) => e.status === 'suspended').length;
    return {
      total: employees.length,
      active,
      suspended,
      roles: distinctRoles.length,
    };
  }, [employees, distinctRoles]);

  // Loading Session Check
  if (checkingSession) {
    return (
      <div className="min-h-screen bg-[#05070a] text-[#dfe7e0] flex items-center justify-center p-6">
        <div className="text-center space-y-3">
          <div className="w-8 h-8 mx-auto rounded-full border-2 border-[#dfe7e0]/15 border-t-[#e0231c] animate-spin" />
          <p className="text-xs font-mono-tech tracking-[0.16em] uppercase text-[#8a968f]">
            Verifying Session
          </p>
        </div>
      </div>
    );
  }

  // =========================================================================
  // Unauthenticated Admin Login Panel (/admin)
  // =========================================================================
  if (!admin) {
    return (
      <div className="min-h-screen bg-[#05070a] text-[#dfe7e0] flex items-center justify-center p-4 sm:p-6">
        <div className="w-full max-w-md rounded-xl bg-[#0a0e14] border border-[#dfe7e0]/14 p-7 sm:p-9 space-y-7 shadow-2xl">
          <div className="space-y-4">
            <div className="inline-flex items-center bg-[#FAFBFD] rounded-md px-3 py-1.5 border border-[#dfe7e0]/20">
              <img
                src={COMPANY_LOGO_URL}
                alt="Alorix Global International"
                referrerPolicy="no-referrer"
                className="h-9 w-auto object-contain"
              />
            </div>
            <div className="space-y-1">
              <p className="font-mono-tech text-[11px] tracking-[0.18em] uppercase text-[#e8ad26]">
                Restricted Console
              </p>
              <h1 className="font-display font-normal text-2xl text-[#dfe7e0]">
                Portal Sign In
              </h1>
              <p className="text-xs text-[#9aa5a0] leading-relaxed">
                Authorized personnel only. Sign in with your username or
                Employee ID and password.
              </p>
            </div>
          </div>

          <form onSubmit={handleLoginSubmit} className="space-y-4" noValidate>
            <div className="space-y-1.5">
              <label
                htmlFor="admin-username"
                className="text-xs font-medium text-[#b4bfb7]"
              >
                Username or Employee ID
              </label>
              <input
                id="admin-username"
                type="text"
                required
                autoComplete="username"
                value={loginUsername}
                onChange={(e) => setLoginUsername(e.target.value)}
                placeholder="Enter username or Employee ID"
                className="w-full px-3.5 py-2.5 text-sm text-[#dfe7e0] bg-[#05070a] border border-[#dfe7e0]/15 rounded-md placeholder:text-[#66726c] focus:outline-none focus:border-[#e0231c]"
              />
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="admin-password"
                className="text-xs font-medium text-[#b4bfb7]"
              >
                Password
              </label>
              <div className="relative">
                <input
                  id="admin-password"
                  type={showLoginPassword ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="Enter password"
                  className="w-full pl-3.5 pr-11 py-2.5 text-sm text-[#dfe7e0] bg-[#05070a] border border-[#dfe7e0]/15 rounded-md placeholder:text-[#66726c] focus:outline-none focus:border-[#e0231c]"
                />
                <button
                  type="button"
                  onClick={() => setShowLoginPassword((prev) => !prev)}
                  aria-label={
                    showLoginPassword ? 'Hide password' : 'Show password'
                  }
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center text-[#8a968f] hover:text-[#dfe7e0] transition-colors"
                >
                  {showLoginPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {loginError && (
              <p
                role="alert"
                className="text-xs text-[#ff6b66] bg-[#e0231c]/12 border border-[#e0231c]/35 rounded-md px-3.5 py-2.5"
              >
                {loginError}
              </p>
            )}

            <button
              type="submit"
              disabled={loginSubmitting}
              className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 text-xs font-medium tracking-[0.12em] uppercase text-white bg-[#e0231c] hover:bg-[#c81e17] disabled:opacity-60 rounded-md transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e8ad26]"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>{loginSubmitting ? 'Verifying...' : 'Sign In'}</span>
            </button>
          </form>
        </div>
      </div>
    );
  }

  // =========================================================================
  // Authenticated Employee Portal (/admin logged in as Employee)
  // =========================================================================
  if (admin.role === 'employee' && admin.employee) {
    return (
      <EmployeeWorkspace
        initialEmployee={admin.employee}
        token={token}
        notifPermission={notifPermission}
        onNotifPermissionChange={setNotifPermission}
        authFetch={adminFetch}
        onLogout={handleLogout}
      />
    );
  }

  // =========================================================================
  // Authenticated Admin / Master Admin Console Workspace
  // =========================================================================
  const isSuperAdmin = admin.role === 'super_admin';

  const tabTitles: Record<AdminTab, string> = {
    employees: 'Employee Directory',
    targets: 'Weekly Targets & Verification',
    extra_work: 'Extra Work & Screenshots',
    notifications: 'Notification Centre',
    chat: 'Team & Company Group Chat',
    meetings: 'Scheduled Meetings',
    session_logs: 'Login & Logout Activity Log',
    admins: 'Company Admin Accounts',
    roles: 'Roles & Access Templates',
    audit: 'Security Audit Log',
    enquiries: 'Website Enquiries',
    backup: 'Saved Data & Backup Vault',
  };

  const navItems: {
    id: AdminTab;
    label: string;
    icon: typeof Users;
    count?: number;
    highlightBadge?: boolean;
  }[] = [
    { id: 'employees', label: 'Employees', icon: Users, count: employees.length },
    {
      id: 'targets',
      label: 'Weekly Targets',
      icon: Target,
      count: weeklyTargets.length,
    },
    {
      id: 'extra_work',
      label: 'Extra Work Log',
      icon: Sparkles,
      count: extraWorkItems.length,
    },
    {
      id: 'notifications',
      label: 'Notifications',
      icon: Bell,
      count: notifications.length,
    },
    {
      id: 'chat',
      label: 'Team Chat',
      icon: MessageSquare,
      count: chatUnreadCount > 0 ? chatUnreadCount : undefined,
      highlightBadge: chatUnreadCount > 0,
    },
    {
      id: 'meetings',
      label: 'Meetings',
      icon: Video,
      count: meetings.length,
    },
    {
      id: 'session_logs',
      label: 'Login / Logout Log',
      icon: Activity,
      count: sessionLogs.length,
    },
    ...(isSuperAdmin
      ? [
          {
            id: 'admins' as AdminTab,
            label: 'Admin Accounts',
            icon: ShieldCheck,
            count: managedAdmins.length,
          },
        ]
      : []),
    { id: 'roles', label: 'Roles & Access', icon: Shield, count: ROLE_PRESETS.length },
    { id: 'audit', label: 'Audit Log', icon: ClipboardList, count: auditLogs.length },
    { id: 'enquiries', label: 'Enquiries', icon: Inbox, count: enquiries.length },
    { id: 'backup', label: 'Data & Backup', icon: Database },
  ];

  return (
    <div className="min-h-screen bg-[#05070a] text-[#dfe7e0] flex">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex w-64 shrink-0 bg-[#080b10] border-r border-[#dfe7e0]/12 flex-col justify-between">
        <div className="p-5 space-y-7">
          <div className="space-y-3">
            <div className="inline-flex items-center bg-[#FAFBFD] rounded-md px-2.5 py-1.5 border border-[#dfe7e0]/20">
              <img
                src={COMPANY_LOGO_URL}
                alt="Alorix Global International"
                referrerPolicy="no-referrer"
                className="h-8 w-auto object-contain"
              />
            </div>
            <div>
              <p className="font-display font-normal text-sm text-[#dfe7e0]">
                Alorix Admin Console
              </p>
              <p className="text-[11px] text-[#8a968f]">
                Employee &amp; Access Control
              </p>
            </div>
          </div>

          <nav aria-label="Admin navigation" className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${
                    isActive
                      ? 'bg-[#e0231c]/15 text-[#dfe7e0] border border-[#e0231c]/40'
                      : 'text-[#9aa5a0] hover:text-[#dfe7e0] hover:bg-white/[0.04] border border-transparent'
                  }`}
                >
                  <span className="flex items-center gap-2.5">
                    <Icon
                      className={`w-4 h-4 ${
                        isActive ? 'text-[#e8ad26]' : 'text-[#8a968f]'
                      }`}
                    />
                    <span>{item.label}</span>
                  </span>
                  {typeof item.count === 'number' && (
                    <span
                      className={`font-mono-tech tabular-nums text-[11px] ${
                        item.highlightBadge
                          ? 'px-1.5 py-0.5 rounded bg-[#e0231c] text-white font-semibold'
                          : 'text-[#8a968f]'
                      }`}
                    >
                      {item.count}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        <div className="p-5 border-t border-[#dfe7e0]/12 space-y-3">
          <div className="space-y-0.5">
            <p className="text-[11px] font-mono-tech uppercase tracking-[0.14em] text-[#e8ad26]">
              {isSuperAdmin ? 'Master Admin' : 'Administrator'}
            </p>
            <p className="text-xs text-[#dfe7e0] truncate">{admin.email}</p>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium text-[#b4bfb7] hover:text-white bg-[#05070a] hover:bg-[#e0231c]/20 border border-[#dfe7e0]/15 hover:border-[#e0231c]/50 rounded-md transition-colors whitespace-nowrap"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Mobile Sidebar Drawer */}
      <AnimatePresence>
        {mobileNavOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-[#020305]/80 lg:hidden flex"
            onClick={() => setMobileNavOpen(false)}
          >
            <motion.aside
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              onClick={(e) => e.stopPropagation()}
              className="w-64 h-full bg-[#080b10] border-r border-[#dfe7e0]/12 flex flex-col justify-between p-5"
            >
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <span className="font-display text-sm text-[#dfe7e0]">
                    Alorix Admin
                  </span>
                  <button
                    type="button"
                    onClick={() => setMobileNavOpen(false)}
                    aria-label="Close sidebar"
                    className="w-9 h-9 rounded-md border border-[#dfe7e0]/15 flex items-center justify-center text-[#b4bfb7]"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <nav className="space-y-1">
                  {navItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = activeTab === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          setActiveTab(item.id);
                          setMobileNavOpen(false);
                        }}
                        className={`w-full flex items-center justify-between px-3 py-2.5 rounded-md text-xs font-medium ${
                          isActive
                            ? 'bg-[#e0231c]/15 text-[#dfe7e0] border border-[#e0231c]/40'
                            : 'text-[#9aa5a0]'
                        }`}
                      >
                        <span className="flex items-center gap-2.5">
                          <Icon className="w-4 h-4" />
                          <span>{item.label}</span>
                        </span>
                        <span className="font-mono-tech tabular-nums text-[11px]">
                          {item.count}
                        </span>
                      </button>
                    );
                  })}
                </nav>
              </div>
              <button
                type="button"
                onClick={handleLogout}
                className="w-full inline-flex items-center justify-center gap-2 px-3 py-2.5 text-xs font-medium text-[#b4bfb7] border border-[#dfe7e0]/15 rounded-md"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out</span>
              </button>
            </motion.aside>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content Canvas */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Top Workspace Header */}
        <header className="h-16 px-4 sm:px-8 border-b border-[#dfe7e0]/12 bg-[#070a0f]/90 flex items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileNavOpen(true)}
              aria-label="Open admin menu"
              className="lg:hidden w-10 h-10 rounded-md border border-[#dfe7e0]/15 flex items-center justify-center text-[#dfe7e0]"
            >
              <Menu className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-2 text-xs text-[#8a968f] truncate">
              <span className="hidden sm:inline">Admin Console</span>
              <span className="hidden sm:inline" aria-hidden="true">
                /
              </span>
              <span className="text-[#dfe7e0] font-medium truncate">
                {tabTitles[activeTab]}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={loadWorkspaceData}
              disabled={loadingData}
              aria-label="Refresh workspace data"
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-[#b4bfb7] hover:text-[#dfe7e0] bg-[#05070a] border border-[#dfe7e0]/15 rounded-md transition-colors whitespace-nowrap shrink-0"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 ${loadingData ? 'animate-spin' : ''}`}
              />
              <span className="hidden sm:inline">Refresh</span>
            </button>

            <button
              type="button"
              onClick={() => openCreateModal()}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium uppercase tracking-[0.08em] text-white bg-[#e0231c] hover:bg-[#c81e17] rounded-md transition-colors whitespace-nowrap shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create Employee</span>
            </button>
          </div>
        </header>

        {/* Main Scroll Area */}
        <main className="flex-1 p-4 sm:p-8 max-w-6xl w-full mx-auto space-y-6">
          <BrowserNotificationBanner
            permission={notifPermission}
            onPermissionChange={setNotifPermission}
          />
          {liveMeetingAlert && (
            <MeetingLiveAlertBanner
              meeting={liveMeetingAlert.meeting}
              kind={liveMeetingAlert.kind}
              onDismiss={() => setLiveMeetingAlert(null)}
            />
          )}

          {/* ============================================================== */}
          {/* TAB 1: EMPLOYEE DIRECTORY                                      */}
          {/* ============================================================== */}
          {activeTab === 'employees' && (
            <>
              {/* Clean Unboxed KPI Summary Strip */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 py-4 px-5 rounded-lg bg-[#080c12] border border-[#dfe7e0]/12">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.14em] text-[#8a968f]">
                    Total Employees
                  </p>
                  <p className="font-mono-tech tabular-nums text-2xl text-[#dfe7e0] mt-1">
                    {stats.total}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-[0.14em] text-[#8a968f]">
                    Active Accounts
                  </p>
                  <p className="font-mono-tech tabular-nums text-2xl text-[#22c55e] mt-1">
                    {stats.active}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-[0.14em] text-[#8a968f]">
                    Suspended
                  </p>
                  <p className="font-mono-tech tabular-nums text-2xl text-[#e8ad26] mt-1">
                    {stats.suspended}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-[0.14em] text-[#8a968f]">
                    Assigned Roles
                  </p>
                  <p className="font-mono-tech tabular-nums text-2xl text-[#dfe7e0] mt-1">
                    {stats.roles}
                  </p>
                </div>
              </div>

              {/* Filter & Search Toolbar */}
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="relative flex-1 min-w-[220px] max-w-md">
                  <Search className="w-3.5 h-3.5 text-[#8a968f] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="search"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search Employee ID, name, login ID, role..."
                    aria-label="Search employees"
                    className="w-full pl-9 pr-3 py-2 text-xs text-[#dfe7e0] bg-[#080c12] border border-[#dfe7e0]/15 rounded-md placeholder:text-[#6f7b75] focus:outline-none focus:border-[#e0231c]"
                  />
                </div>

                <div className="flex flex-wrap items-center gap-2.5">
                  <div
                    role="group"
                    aria-label="Filter by account status"
                    className="inline-flex items-center gap-1 p-1 rounded-md bg-[#080c12] border border-[#dfe7e0]/12"
                  >
                    {(['all', 'active', 'suspended'] as const).map((st) => (
                      <button
                        key={st}
                        type="button"
                        onClick={() => setStatusFilter(st)}
                        className={`px-2.5 py-1 text-xs capitalize rounded transition-colors whitespace-nowrap shrink-0 ${
                          statusFilter === st
                            ? 'bg-[#e0231c] text-white'
                            : 'text-[#9aa5a0] hover:text-[#dfe7e0]'
                        }`}
                      >
                        {st}
                      </button>
                    ))}
                  </div>

                  <select
                    aria-label="Filter by role"
                    value={roleFilter}
                    onChange={(e) => setRoleFilter(e.target.value)}
                    className="px-3 py-2 text-xs text-[#dfe7e0] bg-[#080c12] border border-[#dfe7e0]/15 rounded-md focus:outline-none focus:border-[#e0231c]"
                  >
                    <option value="all">All Roles</option>
                    {distinctRoles.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Employee Table / Empty State */}
              {loadingData && employees.length === 0 ? (
                <div className="rounded-lg bg-[#080c12] border border-[#dfe7e0]/12 p-6 space-y-3">
                  {[0, 1, 2].map((i) => (
                    <div
                      key={i}
                      className="h-11 rounded bg-[#dfe7e0]/[0.04] animate-pulse"
                    />
                  ))}
                </div>
              ) : employees.length === 0 ? (
                <div className="rounded-lg bg-[#080c12] border border-[#dfe7e0]/12 p-12 text-center space-y-4">
                  <div className="w-12 h-12 mx-auto rounded-full bg-[#0e141d] border border-[#dfe7e0]/12 flex items-center justify-center text-[#e8ad26]">
                    <Users className="w-5 h-5" />
                  </div>
                  <div className="space-y-1 max-w-md mx-auto">
                    <h2 className="font-display font-normal text-lg text-[#dfe7e0]">
                      No Employee Accounts Created Yet
                    </h2>
                    <p className="text-xs text-[#9aa5a0] leading-relaxed">
                      Create employee IDs, assign initial passwords, and define
                      roles and module permissions. Only the Administrator can
                      create or change employee passwords.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => openCreateModal()}
                    className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-medium uppercase tracking-[0.08em] text-white bg-[#e0231c] hover:bg-[#c81e17] rounded-md transition-colors whitespace-nowrap"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Create First Employee</span>
                  </button>
                </div>
              ) : filteredEmployees.length === 0 ? (
                <div className="rounded-lg bg-[#080c12] border border-[#dfe7e0]/12 p-10 text-center space-y-3">
                  <p className="text-sm text-[#b4bfb7]">
                    No employees match the current search or filter criteria.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery('');
                      setStatusFilter('all');
                      setRoleFilter('all');
                    }}
                    className="px-4 py-2 text-xs text-white bg-[#e0231c] rounded-md"
                  >
                    Reset Filters
                  </button>
                </div>
              ) : (
                <div className="rounded-lg bg-[#080c12] border border-[#dfe7e0]/12 overflow-x-auto">
                  <table className="w-full text-left border-collapse min-w-[820px]">
                    <thead>
                      <tr className="border-b border-[#dfe7e0]/12 text-[11px] font-medium tracking-[0.14em] uppercase text-[#8a968f]">
                        <th className="py-3.5 px-4">Employee ID</th>
                        <th className="py-3.5 px-4">Name &amp; Login ID</th>
                        <th className="py-3.5 px-4">Role &amp; Department</th>
                        <th className="py-3.5 px-4">Status</th>
                        <th className="py-3.5 px-4">Password Updated</th>
                        <th className="py-3.5 px-4 text-right">Admin Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#dfe7e0]/10 text-xs sm:text-sm">
                      {filteredEmployees.map((emp) => (
                        <tr
                          key={emp.id}
                          className="hover:bg-white/[0.025] transition-colors"
                        >
                          <td className="py-3.5 px-4 font-mono-tech tabular-nums text-xs text-[#e8ad26] whitespace-nowrap">
                            {emp.employeeCode}
                          </td>
                          <td className="py-3.5 px-4">
                            <p className="font-medium text-[#dfe7e0]">
                              {emp.fullName}
                            </p>
                            <p className="font-mono-tech text-[11px] text-[#8a968f]">
                              {emp.loginId}
                            </p>
                          </td>
                          <td className="py-3.5 px-4">
                            <p className="text-[#dfe7e0]">
                              {emp.role}{' '}
                              <span className="text-[#8a968f]" aria-hidden="true">
                                ·
                              </span>{' '}
                              <span className="text-[#9aa5a0]">
                                {emp.department}
                              </span>
                            </p>
                            {emp.permissions.length > 0 && (
                              <p className="text-[11px] text-[#8a968f] mt-0.5">
                                {emp.permissions.join(' · ')}
                              </p>
                            )}
                          </td>
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            {emp.status === 'active' ? (
                              <span className="inline-flex items-center gap-1.5 text-xs text-[#22c55e]">
                                <UserCheck className="w-3.5 h-3.5" />
                                <span>Active</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 text-xs text-[#e8ad26]">
                                <UserX className="w-3.5 h-3.5" />
                                <span>Suspended</span>
                              </span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 font-mono-tech tabular-nums text-[11px] text-[#9aa5a0] whitespace-nowrap">
                            {formatDateTime(emp.passwordUpdatedAt)}
                          </td>
                          <td className="py-3.5 px-4 text-right whitespace-nowrap">
                            <div className="inline-flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => openEditModal(emp)}
                                title="Edit role and details"
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs text-[#dfe7e0] bg-[#05070a] hover:border-[#e8ad26]/60 border border-[#dfe7e0]/15 rounded transition-colors whitespace-nowrap"
                              >
                                <Pencil className="w-3 h-3" />
                                <span>Edit</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => openPasswordModal(emp)}
                                title="Admin-only password change"
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs text-[#e8ad26] bg-[#e8ad26]/10 hover:bg-[#e8ad26]/20 border border-[#e8ad26]/40 rounded transition-colors whitespace-nowrap"
                              >
                                <KeyRound className="w-3 h-3" />
                                <span>Password</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleToggleStatus(emp)}
                                title={
                                  emp.status === 'active'
                                    ? 'Suspend account'
                                    : 'Reactivate account'
                                }
                                className="px-2.5 py-1.5 text-xs text-[#b4bfb7] hover:text-[#dfe7e0] bg-[#05070a] border border-[#dfe7e0]/15 rounded transition-colors whitespace-nowrap"
                              >
                                {emp.status === 'active' ? 'Suspend' : 'Activate'}
                              </button>
                              <button
                                type="button"
                                onClick={() => setDeleteTarget(emp)}
                                aria-label={`Delete ${emp.fullName}`}
                                className="p-1.5 text-[#8a968f] hover:text-[#e0231c] bg-[#05070a] border border-[#dfe7e0]/12 hover:border-[#e0231c]/45 rounded transition-colors"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <p className="text-xs text-[#8a968f]">
                Security Policy: Employee passwords are encrypted with salted
                scrypt hashes on the backend. Only the Administrator can create
                accounts, assign roles, or change passwords.
              </p>
            </>
          )}

          {/* ============================================================== */}
          {/* TAB 2: ROLES & ACCESS TEMPLATES                                */}
          {/* ============================================================== */}
          {activeTab === 'roles' && (
            <div className="space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="font-display font-normal text-lg text-[#dfe7e0]">
                    Role Definitions &amp; Module Permissions
                  </h2>
                  <p className="text-xs text-[#9aa5a0] mt-0.5">
                    Select any standard role below to immediately provision a
                    new employee account with pre-configured module access, or
                    assign a custom role during creation.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {ROLE_PRESETS.map((preset) => {
                  const count = employees.filter(
                    (e) => e.role.toLowerCase() === preset.role.toLowerCase()
                  ).length;
                  return (
                    <div
                      key={preset.role}
                      className="rounded-lg bg-[#080c12] border border-[#dfe7e0]/12 p-5 flex flex-col justify-between gap-4"
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <h3 className="font-display font-normal text-base text-[#dfe7e0]">
                            {preset.role}
                          </h3>
                          <span className="font-mono-tech tabular-nums text-xs text-[#e8ad26]">
                            {count} {count === 1 ? 'member' : 'members'}
                          </span>
                        </div>
                        <p className="text-[11px] uppercase tracking-[0.14em] text-[#8a968f]">
                          {preset.department}
                        </p>
                        <p className="text-xs text-[#9aa5a0] leading-relaxed">
                          {preset.description}
                        </p>
                        <p className="text-[11px] font-mono-tech text-[#b4bfb7] pt-1">
                          Access: {preset.defaultPermissions.join(' · ')}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => openCreateModal(preset.role)}
                        className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium text-[#dfe7e0] bg-[#05070a] hover:bg-[#e0231c] border border-[#dfe7e0]/15 hover:border-[#e0231c] rounded-md transition-colors whitespace-nowrap"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add {preset.role}</span>
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* TAB 3: AUDIT LOG                                               */}
          {/* ============================================================== */}
          {activeTab === 'audit' && (
            <div className="space-y-4">
              <div>
                <h2 className="font-display font-normal text-lg text-[#dfe7e0]">
                  Administrative Activity Log
                </h2>
                <p className="text-xs text-[#9aa5a0] mt-0.5">
                  Persistent audit trail of sign-ins, employee creations, role
                  modifications, and password changes.
                </p>
              </div>

              {auditLogs.length === 0 ? (
                <div className="rounded-lg bg-[#080c12] border border-[#dfe7e0]/12 p-10 text-center text-xs text-[#9aa5a0]">
                  No administrative activity recorded yet.
                </div>
              ) : (
                <div className="rounded-lg bg-[#080c12] border border-[#dfe7e0]/12 overflow-x-auto">
                  <table className="w-full text-left border-collapse min-w-[700px]">
                    <thead>
                      <tr className="border-b border-[#dfe7e0]/12 text-[11px] font-medium tracking-[0.14em] uppercase text-[#8a968f]">
                        <th className="py-3.5 px-4">Timestamp</th>
                        <th className="py-3.5 px-4">Event</th>
                        <th className="py-3.5 px-4">Target</th>
                        <th className="py-3.5 px-4">Details</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#dfe7e0]/10 text-xs">
                      {auditLogs.map((log) => (
                        <tr key={log.id} className="hover:bg-white/[0.02]">
                          <td className="py-3 px-4 font-mono-tech tabular-nums text-[#8a968f] whitespace-nowrap">
                            {formatDateTime(log.timestamp)}
                          </td>
                          <td className="py-3 px-4 font-mono-tech text-[#e8ad26] whitespace-nowrap">
                            {log.action.replace(/_/g, ' ')}
                          </td>
                          <td className="py-3 px-4 text-[#dfe7e0] whitespace-nowrap">
                            {log.target}
                          </td>
                          <td className="py-3 px-4 text-[#9aa5a0]">
                            {log.detail}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ============================================================== */}
          {/* TAB 4: WEBSITE ENQUIRIES INBOX                                 */}
          {/* ============================================================== */}
          {activeTab === 'enquiries' && (
            <EnquiriesInboxPanel
              title="Saved Website Business Enquiries"
              subtitle="All quote and chemical sourcing requests submitted through the public Business Enquiry desk. Tick any enquiry once solved — all records and status updates are saved permanently."
              enquiries={enquiries}
              authFetch={adminFetch}
              onEnquiryUpdated={(updated) => {
                setEnquiries((prev) =>
                  prev.map((item) => (item.id === updated.id ? updated : item))
                );
              }}
              showToast={showToast}
            />
          )}

          {/* ============================================================== */}
          {/* TAB 5: WEEKLY TARGETS & ADMIN VERIFICATION                     */}
          {/* ============================================================== */}
          {activeTab === 'targets' && (
            <AdminWeeklyTargetsPanel
              targets={weeklyTargets}
              employees={employees}
              authFetch={adminFetch}
              onReload={loadWorkspaceData}
              showToast={showToast}
            />
          )}

          {/* ============================================================== */}
          {/* TAB 6: EMPLOYEE EXTRA WORK & GOOGLE DRIVE SCREENSHOTS          */}
          {/* ============================================================== */}
          {activeTab === 'extra_work' && (
            <AdminExtraWorkPanel
              items={extraWorkItems}
              authFetch={adminFetch}
              onReload={loadWorkspaceData}
              showToast={showToast}
            />
          )}

          {/* ============================================================== */}
          {/* TAB 6B: NOTIFICATION CENTRE                                    */}
          {/* ============================================================== */}
          {activeTab === 'notifications' && (
            <AdminNotificationsView
              notifications={notifications}
              employees={employees}
              authFetch={adminFetch}
              onReload={loadWorkspaceData}
              showToast={showToast}
            />
          )}

          {/* ============================================================== */}
          {/* TAB 6C: TEAM & COMPANY GROUP CHAT                              */}
          {/* ============================================================== */}
          {activeTab === 'chat' && (
            <TeamChatPanel
              authFetch={adminFetch}
              currentAccountId={admin.accountId || admin.email}
              onlineAccountIds={onlineAccountIds}
              incomingMessage={incomingChatMsg}
              onUnreadTotalChange={setChatUnreadCount}
            />
          )}

          {/* ============================================================== */}
          {/* TAB 6D: SCHEDULED MEETINGS                                     */}
          {/* ============================================================== */}
          {activeTab === 'meetings' && (
            <AdminMeetingsView
              meetings={meetings}
              employees={employees}
              authFetch={adminFetch}
              onReload={loadWorkspaceData}
              showToast={showToast}
            />
          )}

          {/* ============================================================== */}
          {/* TAB 6D: LOGIN & LOGOUT ACTIVITY LOG                            */}
          {/* ============================================================== */}
          {activeTab === 'session_logs' && (
            <AdminSessionLogsView logs={sessionLogs} />
          )}

          {/* ============================================================== */}
          {/* TAB 7: MASTER ADMIN — COMPANY ADMIN ACCOUNTS MANAGEMENT        */}
          {/* ============================================================== */}
          {activeTab === 'admins' && isSuperAdmin && (
            <SuperAdminAccountsPanel
              admins={managedAdmins}
              authFetch={adminFetch}
              onReload={loadWorkspaceData}
              showToast={showToast}
            />
          )}

          {/* ============================================================== */}
          {/* TAB 8: SAVED DATA & PORTABLE BACKUP VAULT                      */}
          {/* ============================================================== */}
          {activeTab === 'backup' && (
            <AdminBackupPanel
              authFetch={adminFetch}
              onReloadAll={loadWorkspaceData}
              showToast={showToast}
            />
          )}
        </main>
      </div>

      {/* =================================================================== */}
      {/* MODAL: CREATE NEW EMPLOYEE (ADMIN ONLY)                             */}
      {/* =================================================================== */}
      <AnimatePresence>
        {createOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-[#020305]/88 flex items-center justify-center p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="create-emp-title"
            onClick={() => setCreateOpen(false)}
          >
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 12 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-xl rounded-xl bg-[#0a0e14] border border-[#dfe7e0]/15 overflow-hidden max-h-[90vh] flex flex-col shadow-2xl"
            >
              <div className="px-6 py-4 border-b border-[#dfe7e0]/12 flex items-center justify-between">
                <div>
                  <h2
                    id="create-emp-title"
                    className="font-display font-normal text-lg text-[#dfe7e0]"
                  >
                    Create Employee Account
                  </h2>
                  <p className="text-xs text-[#8a968f]">
                    Assign Employee ID, login username, role, and initial password.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setCreateOpen(false)}
                  aria-label="Close modal"
                  className="w-9 h-9 rounded-md border border-[#dfe7e0]/15 flex items-center justify-center text-[#9aa5a0] hover:text-[#dfe7e0]"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form
                onSubmit={handleCreateEmployee}
                className="p-6 space-y-4 overflow-y-auto"
                noValidate
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label
                      htmlFor="c-emp-code"
                      className="text-xs font-medium text-[#b4bfb7]"
                    >
                      Employee ID *
                    </label>
                    <input
                      id="c-emp-code"
                      type="text"
                      required
                      value={cCode}
                      onChange={(e) => setCCode(e.target.value)}
                      placeholder="AGL-EMP-001"
                      className="w-full px-3 py-2 text-xs font-mono-tech text-[#dfe7e0] bg-[#05070a] border border-[#dfe7e0]/15 rounded-md focus:outline-none focus:border-[#e0231c]"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label
                      htmlFor="c-full-name"
                      className="text-xs font-medium text-[#b4bfb7]"
                    >
                      Full Name *
                    </label>
                    <input
                      id="c-full-name"
                      type="text"
                      required
                      value={cName}
                      onChange={(e) => setCName(e.target.value)}
                      placeholder="e.g., Rahul Sharma"
                      className="w-full px-3 py-2 text-xs text-[#dfe7e0] bg-[#05070a] border border-[#dfe7e0]/15 rounded-md focus:outline-none focus:border-[#e0231c]"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label
                    htmlFor="c-login-id"
                    className="text-xs font-medium text-[#b4bfb7]"
                  >
                    Employee Login ID / Email *
                  </label>
                  <input
                    id="c-login-id"
                    type="text"
                    required
                    value={cLoginId}
                    onChange={(e) => setCLoginId(e.target.value)}
                    placeholder="e.g., rahul@agl.com or rahul.sales"
                    className="w-full px-3 py-2 text-xs font-mono-tech text-[#dfe7e0] bg-[#05070a] border border-[#dfe7e0]/15 rounded-md focus:outline-none focus:border-[#e0231c]"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label
                      htmlFor="c-role"
                      className="text-xs font-medium text-[#b4bfb7]"
                    >
                      Assigned Role *
                    </label>
                    <select
                      id="c-role"
                      value={cRoleMode}
                      onChange={(e) => handleCreateRoleChange(e.target.value)}
                      className="w-full px-3 py-2 text-xs text-[#dfe7e0] bg-[#05070a] border border-[#dfe7e0]/15 rounded-md focus:outline-none focus:border-[#e0231c]"
                    >
                      {ROLE_PRESETS.map((r) => (
                        <option key={r.role} value={r.role}>
                          {r.role}
                        </option>
                      ))}
                      <option value="__custom__">Custom Role...</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label
                      htmlFor="c-dept"
                      className="text-xs font-medium text-[#b4bfb7]"
                    >
                      Department
                    </label>
                    <input
                      id="c-dept"
                      type="text"
                      value={cDepartment}
                      onChange={(e) => setCDepartment(e.target.value)}
                      placeholder="e.g., Export Operations"
                      className="w-full px-3 py-2 text-xs text-[#dfe7e0] bg-[#05070a] border border-[#dfe7e0]/15 rounded-md focus:outline-none focus:border-[#e0231c]"
                    />
                  </div>
                </div>

                {cRoleMode === '__custom__' && (
                  <div className="space-y-1.5">
                    <label
                      htmlFor="c-custom-role"
                      className="text-xs font-medium text-[#b4bfb7]"
                    >
                      Custom Role Title *
                    </label>
                    <input
                      id="c-custom-role"
                      type="text"
                      required
                      value={cCustomRole}
                      onChange={(e) => setCCustomRole(e.target.value)}
                      placeholder="e.g., Regional Procurement Head"
                      className="w-full px-3 py-2 text-xs text-[#dfe7e0] bg-[#05070a] border border-[#dfe7e0]/15 rounded-md focus:outline-none focus:border-[#e0231c]"
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <span className="text-xs font-medium text-[#b4bfb7]">
                    Module Access Permissions
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {ALL_PERMISSION_MODULES.map((mod) => {
                      const checked = cPermissions.includes(mod);
                      return (
                        <label
                          key={mod}
                          className={`flex items-center gap-2 px-3 py-2 rounded-md border text-xs cursor-pointer transition-colors ${
                            checked
                              ? 'bg-[#e8ad26]/12 border-[#e8ad26]/50 text-[#dfe7e0]'
                              : 'bg-[#05070a] border-[#dfe7e0]/12 text-[#9aa5a0]'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() =>
                              setCPermissions((prev) =>
                                prev.includes(mod)
                                  ? prev.filter((p) => p !== mod)
                                  : [...prev, mod]
                              )
                            }
                            className="accent-[#e0231c]"
                          />
                          <span>{mod}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <label
                      htmlFor="c-password"
                      className="text-xs font-medium text-[#b4bfb7]"
                    >
                      Initial Password (Admin-Created Only) *
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setCPassword(generateStrongPassword());
                        setCShowPassword(true);
                      }}
                      className="text-[11px] font-medium text-[#e8ad26] hover:text-[#dfe7e0]"
                    >
                      Generate Strong Password
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      id="c-password"
                      type={cShowPassword ? 'text' : 'password'}
                      required
                      value={cPassword}
                      onChange={(e) => setCPassword(e.target.value)}
                      placeholder="Minimum 6 characters"
                      className="w-full pl-3 pr-10 py-2 text-xs font-mono-tech text-[#dfe7e0] bg-[#05070a] border border-[#dfe7e0]/15 rounded-md focus:outline-none focus:border-[#e0231c]"
                    />
                    <button
                      type="button"
                      onClick={() => setCShowPassword((p) => !p)}
                      aria-label={cShowPassword ? 'Hide password' : 'Show password'}
                      className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 flex items-center justify-center text-[#8a968f] hover:text-[#dfe7e0]"
                    >
                      {cShowPassword ? (
                        <EyeOff className="w-3.5 h-3.5" />
                      ) : (
                        <Eye className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label
                    htmlFor="c-notes"
                    className="text-xs font-medium text-[#b4bfb7]"
                  >
                    Internal Notes (Optional)
                  </label>
                  <input
                    id="c-notes"
                    type="text"
                    value={cNotes}
                    onChange={(e) => setCNotes(e.target.value)}
                    placeholder="Branch, shift, or territory notes"
                    className="w-full px-3 py-2 text-xs text-[#dfe7e0] bg-[#05070a] border border-[#dfe7e0]/15 rounded-md focus:outline-none focus:border-[#e0231c]"
                  />
                </div>

                {cError && (
                  <p
                    role="alert"
                    className="text-xs text-[#ff6b66] bg-[#e0231c]/12 border border-[#e0231c]/35 rounded-md px-3 py-2"
                  >
                    {cError}
                  </p>
                )}

                <div className="pt-2 flex items-center justify-end gap-3 border-t border-[#dfe7e0]/10">
                  <button
                    type="button"
                    onClick={() => setCreateOpen(false)}
                    className="px-4 py-2 text-xs text-[#b4bfb7] hover:text-[#dfe7e0] border border-[#dfe7e0]/15 rounded-md"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={cSubmitting}
                    className="px-5 py-2 text-xs font-medium uppercase tracking-[0.08em] text-white bg-[#e0231c] hover:bg-[#c81e17] disabled:opacity-60 rounded-md whitespace-nowrap"
                  >
                    {cSubmitting ? 'Saving...' : 'Save Employee Account'}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* =================================================================== */}
      {/* MODAL: EDIT EMPLOYEE ROLE & DETAILS                                 */}
      {/* =================================================================== */}
      <AnimatePresence>
        {editingEmployee && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-[#020305]/88 flex items-center justify-center p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-emp-title"
            onClick={() => setEditingEmployee(null)}
          >
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 12 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-xl rounded-xl bg-[#0a0e14] border border-[#dfe7e0]/15 overflow-hidden max-h-[90vh] flex flex-col shadow-2xl"
            >
              <div className="px-6 py-4 border-b border-[#dfe7e0]/12 flex items-center justify-between">
                <div>
                  <h2
                    id="edit-emp-title"
                    className="font-display font-normal text-lg text-[#dfe7e0]"
                  >
                    Edit Role &amp; Account — {editingEmployee.employeeCode}
                  </h2>
                  <p className="text-xs text-[#8a968f]">
                    Modify assigned role, department, module permissions, or status.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setEditingEmployee(null)}
                  aria-label="Close modal"
                  className="w-9 h-9 rounded-md border border-[#dfe7e0]/15 flex items-center justify-center text-[#9aa5a0]"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form
                onSubmit={handleSaveEdit}
                className="p-6 space-y-4 overflow-y-auto"
                noValidate
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label
                      htmlFor="e-code"
                      className="text-xs font-medium text-[#b4bfb7]"
                    >
                      Employee ID *
                    </label>
                    <input
                      id="e-code"
                      type="text"
                      required
                      value={eCode}
                      onChange={(e) => setECode(e.target.value)}
                      className="w-full px-3 py-2 text-xs font-mono-tech text-[#dfe7e0] bg-[#05070a] border border-[#dfe7e0]/15 rounded-md focus:outline-none focus:border-[#e0231c]"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label
                      htmlFor="e-name"
                      className="text-xs font-medium text-[#b4bfb7]"
                    >
                      Full Name *
                    </label>
                    <input
                      id="e-name"
                      type="text"
                      required
                      value={eName}
                      onChange={(e) => setEName(e.target.value)}
                      className="w-full px-3 py-2 text-xs text-[#dfe7e0] bg-[#05070a] border border-[#dfe7e0]/15 rounded-md focus:outline-none focus:border-[#e0231c]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label
                      htmlFor="e-login"
                      className="text-xs font-medium text-[#b4bfb7]"
                    >
                      Login ID / Email *
                    </label>
                    <input
                      id="e-login"
                      type="text"
                      required
                      value={eLoginId}
                      onChange={(e) => setELoginId(e.target.value)}
                      className="w-full px-3 py-2 text-xs font-mono-tech text-[#dfe7e0] bg-[#05070a] border border-[#dfe7e0]/15 rounded-md focus:outline-none focus:border-[#e0231c]"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label
                      htmlFor="e-status"
                      className="text-xs font-medium text-[#b4bfb7]"
                    >
                      Account Status
                    </label>
                    <select
                      id="e-status"
                      value={eStatus}
                      onChange={(e) =>
                        setEStatus(e.target.value as 'active' | 'suspended')
                      }
                      className="w-full px-3 py-2 text-xs text-[#dfe7e0] bg-[#05070a] border border-[#dfe7e0]/15 rounded-md focus:outline-none focus:border-[#e0231c]"
                    >
                      <option value="active">Active</option>
                      <option value="suspended">Suspended</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label
                      htmlFor="e-role"
                      className="text-xs font-medium text-[#b4bfb7]"
                    >
                      Role Title *
                    </label>
                    <input
                      id="e-role"
                      type="text"
                      required
                      value={eRole}
                      onChange={(e) => setERole(e.target.value)}
                      list="role-preset-suggestions"
                      className="w-full px-3 py-2 text-xs text-[#dfe7e0] bg-[#05070a] border border-[#dfe7e0]/15 rounded-md focus:outline-none focus:border-[#e0231c]"
                    />
                    <datalist id="role-preset-suggestions">
                      {ROLE_PRESETS.map((r) => (
                        <option key={r.role} value={r.role} />
                      ))}
                    </datalist>
                  </div>
                  <div className="space-y-1.5">
                    <label
                      htmlFor="e-dept"
                      className="text-xs font-medium text-[#b4bfb7]"
                    >
                      Department
                    </label>
                    <input
                      id="e-dept"
                      type="text"
                      value={eDepartment}
                      onChange={(e) => setEDepartment(e.target.value)}
                      className="w-full px-3 py-2 text-xs text-[#dfe7e0] bg-[#05070a] border border-[#dfe7e0]/15 rounded-md focus:outline-none focus:border-[#e0231c]"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <span className="text-xs font-medium text-[#b4bfb7]">
                    Module Access Permissions
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {ALL_PERMISSION_MODULES.map((mod) => {
                      const checked = ePermissions.includes(mod);
                      return (
                        <label
                          key={mod}
                          className={`flex items-center gap-2 px-3 py-2 rounded-md border text-xs cursor-pointer ${
                            checked
                              ? 'bg-[#e8ad26]/12 border-[#e8ad26]/50 text-[#dfe7e0]'
                              : 'bg-[#05070a] border-[#dfe7e0]/12 text-[#9aa5a0]'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() =>
                              setEPermissions((prev) =>
                                prev.includes(mod)
                                  ? prev.filter((p) => p !== mod)
                                  : [...prev, mod]
                              )
                            }
                            className="accent-[#e0231c]"
                          />
                          <span>{mod}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label
                    htmlFor="e-notes"
                    className="text-xs font-medium text-[#b4bfb7]"
                  >
                    Internal Notes
                  </label>
                  <input
                    id="e-notes"
                    type="text"
                    value={eNotes}
                    onChange={(e) => setENotes(e.target.value)}
                    className="w-full px-3 py-2 text-xs text-[#dfe7e0] bg-[#05070a] border border-[#dfe7e0]/15 rounded-md focus:outline-none focus:border-[#e0231c]"
                  />
                </div>

                {eError && (
                  <p
                    role="alert"
                    className="text-xs text-[#ff6b66] bg-[#e0231c]/12 border border-[#e0231c]/35 rounded-md px-3 py-2"
                  >
                    {eError}
                  </p>
                )}

                <div className="pt-2 flex items-center justify-end gap-3 border-t border-[#dfe7e0]/10">
                  <button
                    type="button"
                    onClick={() => setEditingEmployee(null)}
                    className="px-4 py-2 text-xs text-[#b4bfb7] border border-[#dfe7e0]/15 rounded-md"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={eSubmitting}
                    className="px-5 py-2 text-xs font-medium uppercase tracking-[0.08em] text-white bg-[#e0231c] hover:bg-[#c81e17] disabled:opacity-60 rounded-md whitespace-nowrap"
                  >
                    {eSubmitting ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* =================================================================== */}
      {/* MODAL: ADMIN-ONLY CHANGE EMPLOYEE PASSWORD                          */}
      {/* =================================================================== */}
      <AnimatePresence>
        {passwordTarget && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-[#020305]/88 flex items-center justify-center p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="change-pw-title"
            onClick={() => setPasswordTarget(null)}
          >
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 12 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md rounded-xl bg-[#0a0e14] border border-[#dfe7e0]/15 overflow-hidden shadow-2xl"
            >
              <div className="px-6 py-4 border-b border-[#dfe7e0]/12 flex items-center justify-between">
                <div>
                  <h2
                    id="change-pw-title"
                    className="font-display font-normal text-lg text-[#dfe7e0]"
                  >
                    Change Employee Password
                  </h2>
                  <p className="text-xs font-mono-tech text-[#e8ad26]">
                    {passwordTarget.employeeCode} · {passwordTarget.fullName}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setPasswordTarget(null)}
                  aria-label="Close modal"
                  className="w-9 h-9 rounded-md border border-[#dfe7e0]/15 flex items-center justify-center text-[#9aa5a0]"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSavePassword} className="p-6 space-y-4" noValidate>
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label
                      htmlFor="pw-new"
                      className="text-xs font-medium text-[#b4bfb7]"
                    >
                      New Password *
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        const gen = generateStrongPassword();
                        setNewPassword(gen);
                        setConfirmPassword(gen);
                        setShowNewPassword(true);
                      }}
                      className="text-[11px] font-medium text-[#e8ad26] hover:text-[#dfe7e0]"
                    >
                      Generate Strong Password
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      id="pw-new"
                      type={showNewPassword ? 'text' : 'password'}
                      required
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Minimum 6 characters"
                      className="w-full pl-3 pr-10 py-2 text-xs font-mono-tech text-[#dfe7e0] bg-[#05070a] border border-[#dfe7e0]/15 rounded-md focus:outline-none focus:border-[#e0231c]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword((p) => !p)}
                      aria-label={showNewPassword ? 'Hide password' : 'Show password'}
                      className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 flex items-center justify-center text-[#8a968f]"
                    >
                      {showNewPassword ? (
                        <EyeOff className="w-3.5 h-3.5" />
                      ) : (
                        <Eye className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label
                    htmlFor="pw-confirm"
                    className="text-xs font-medium text-[#b4bfb7]"
                  >
                    Confirm New Password *
                  </label>
                  <input
                    id="pw-confirm"
                    type={showNewPassword ? 'text' : 'password'}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter new password"
                    className="w-full px-3 py-2 text-xs font-mono-tech text-[#dfe7e0] bg-[#05070a] border border-[#dfe7e0]/15 rounded-md focus:outline-none focus:border-[#e0231c]"
                  />
                </div>

                {pwError && (
                  <p
                    role="alert"
                    className="text-xs text-[#ff6b66] bg-[#e0231c]/12 border border-[#e0231c]/35 rounded-md px-3 py-2"
                  >
                    {pwError}
                  </p>
                )}

                <div className="pt-2 flex items-center justify-end gap-3 border-t border-[#dfe7e0]/10">
                  <button
                    type="button"
                    onClick={() => setPasswordTarget(null)}
                    className="px-4 py-2 text-xs text-[#b4bfb7] border border-[#dfe7e0]/15 rounded-md"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={pwSubmitting}
                    className="px-5 py-2 text-xs font-medium uppercase tracking-[0.08em] text-white bg-[#e0231c] hover:bg-[#c81e17] disabled:opacity-60 rounded-md whitespace-nowrap"
                  >
                    {pwSubmitting ? 'Updating...' : 'Update Password'}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* =================================================================== */}
      {/* MODAL: ONE-TIME CREDENTIAL RECEIPT                                  */}
      {/* =================================================================== */}
      <AnimatePresence>
        {credentialReceipt && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-[#020305]/88 flex items-center justify-center p-4"
            role="dialog"
            aria-modal="true"
            onClick={() => setCredentialReceipt(null)}
          >
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 12 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md rounded-xl bg-[#0a0e14] border border-[#e8ad26]/45 p-6 space-y-5 shadow-2xl"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <p className="text-[11px] font-mono-tech uppercase tracking-[0.16em] text-[#e8ad26]">
                    Saved to Server
                  </p>
                  <h2 className="font-display font-normal text-lg text-[#dfe7e0]">
                    {credentialReceipt.heading}
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => setCredentialReceipt(null)}
                  aria-label="Close receipt"
                  className="w-8 h-8 rounded-md border border-[#dfe7e0]/15 flex items-center justify-center text-[#9aa5a0]"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="rounded-lg bg-[#05070a] border border-[#dfe7e0]/12 p-4 space-y-2 text-xs font-mono-tech">
                <div className="flex justify-between gap-2">
                  <span className="text-[#8a968f]">Employee ID:</span>
                  <span className="text-[#e8ad26]">
                    {credentialReceipt.employeeCode}
                  </span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-[#8a968f]">Name:</span>
                  <span className="text-[#dfe7e0]">
                    {credentialReceipt.fullName}
                  </span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-[#8a968f]">Login ID:</span>
                  <span className="text-[#dfe7e0]">
                    {credentialReceipt.loginId}
                  </span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-[#8a968f]">Role:</span>
                  <span className="text-[#dfe7e0]">{credentialReceipt.role}</span>
                </div>
                <div className="flex justify-between gap-2 pt-2 border-t border-[#dfe7e0]/10">
                  <span className="text-[#8a968f]">Password:</span>
                  <span className="text-[#22c55e]">
                    {credentialReceipt.password}
                  </span>
                </div>
              </div>

              <p className="text-[11px] text-[#9aa5a0] leading-relaxed">
                Copy these credentials now if you need to share them with the
                employee. Passwords are stored encrypted and can only be changed
                by the Administrator.
              </p>

              <div className="flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={copyReceiptCredentials}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-[#e8ad26] bg-[#e8ad26]/12 border border-[#e8ad26]/45 rounded-md whitespace-nowrap"
                >
                  {copiedReceipt ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy Credentials</span>
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setCredentialReceipt(null)}
                  className="px-4 py-2 text-xs font-medium text-white bg-[#e0231c] hover:bg-[#c81e17] rounded-md"
                >
                  Done
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* =================================================================== */}
      {/* MODAL: DELETE CONFIRMATION                                          */}
      {/* =================================================================== */}
      <AnimatePresence>
        {deleteTarget && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-[#020305]/88 flex items-center justify-center p-4"
            role="dialog"
            aria-modal="true"
            onClick={() => setDeleteTarget(null)}
          >
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 12 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md rounded-xl bg-[#0a0e14] border border-[#e0231c]/40 p-6 space-y-4 shadow-2xl"
            >
              <div className="flex items-center gap-3">
                <ShieldAlert className="w-5 h-5 text-[#e0231c] shrink-0" />
                <h2 className="font-display font-normal text-lg text-[#dfe7e0]">
                  Delete Employee Account?
                </h2>
              </div>
              <p className="text-xs text-[#b4bfb7] leading-relaxed">
                Permanently remove{' '}
                <strong className="text-[#dfe7e0]">
                  {deleteTarget.fullName}
                </strong>{' '}
                ({deleteTarget.employeeCode} · {deleteTarget.loginId})? This
                action removes their credentials from the backend database.
              </p>
              <div className="flex items-center justify-end gap-3 pt-2">
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
                  onClick={handleConfirmDelete}
                  className="px-4 py-2 text-xs font-medium text-white bg-[#e0231c] hover:bg-[#c81e17] disabled:opacity-60 rounded-md"
                >
                  {deleteSubmitting ? 'Deleting...' : 'Delete Permanently'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Non-intrusive Feedback Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            role="status"
            className="fixed bottom-5 right-5 z-50 rounded-lg bg-[#0a0e14] border border-[#e8ad26]/45 px-4 py-3 flex items-center gap-2.5 shadow-2xl max-w-sm"
          >
            <CheckCircle2 className="w-4 h-4 text-[#e8ad26] shrink-0" />
            <span className="text-xs text-[#dfe7e0]">{toast}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
