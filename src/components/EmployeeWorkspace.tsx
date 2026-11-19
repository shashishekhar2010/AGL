import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Activity,
  Bell,
  Briefcase,
  CheckCircle2,
  Inbox,
  Lock,
  LogOut,
  Menu,
  MessageSquare,
  Package,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  Target,
  User,
  Video,
  X,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { CHEMICAL_CATEGORIES, COMPANY_LOGO_URL } from '../data/alorixContent';
import type { WeeklyTargetRecord } from './AdminWeeklyTargetsPanel';
import type { ExtraWorkRecord } from './AdminExtraWorkPanel';
import {
  EmployeeExtraWorkView,
  EmployeeWeeklyTargetsView,
} from './EmployeeTargetsPanel';
import TeamChatPanel, { type ChatMessageRecord } from './TeamChatPanel';
import EnquiriesInboxPanel, {
  type EnquiryRecord,
} from './EnquiriesInboxPanel';
import {
  EmployeeMeetingsView,
  MeetingLiveAlertBanner,
  type MeetingRecord,
} from './MeetingsPanel';
import BrowserNotificationBanner from './BrowserNotificationBanner';
import {
  EmployeeNotificationsView,
  type EmployeeNotificationRecord,
} from './NotificationCentrePanel';
import {
  EmployeeSessionHistoryView,
  type SessionLogRecord,
} from './SessionActivityPanel';
import {
  showBrowserNotification,
  type BrowserNotifPermission,
} from '../utils/browserNotifications';
import {
  usePortalRealtime,
  type PortalRealtimeMessage,
} from '../utils/usePortalRealtime';

export interface EmployeeProfileRecord {
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

type EmployeeTab =
  | 'overview'
  | 'targets'
  | 'extra_work'
  | 'notifications'
  | 'chat'
  | 'meetings'
  | 'session_logs'
  | 'enquiries'
  | 'catalogue';

const ALL_MODULES = [
  'Orders',
  'Enquiries',
  'Product Catalogue',
  'Logistics',
  'Dispatch',
  'Inventory',
  'Reports',
];

function formatDateTime(iso: string): string {
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

interface EmployeeWorkspaceProps {
  initialEmployee: EmployeeProfileRecord;
  token: string;
  notifPermission: BrowserNotifPermission;
  onNotifPermissionChange: (next: BrowserNotifPermission) => void;
  authFetch: (url: string, init?: RequestInit) => Promise<Response>;
  onLogout: () => void;
}

export default function EmployeeWorkspace({
  initialEmployee,
  token,
  notifPermission,
  onNotifPermissionChange,
  authFetch,
  onLogout,
}: EmployeeWorkspaceProps) {
  const [employee, setEmployee] = useState<EmployeeProfileRecord>(initialEmployee);
  const [canViewEnquiries, setCanViewEnquiries] = useState(false);
  const [enquiries, setEnquiries] = useState<EnquiryRecord[]>([]);
  const [targets, setTargets] = useState<WeeklyTargetRecord[]>([]);
  const [extraWorkItems, setExtraWorkItems] = useState<ExtraWorkRecord[]>([]);
  const [notifications, setNotifications] = useState<EmployeeNotificationRecord[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [meetings, setMeetings] = useState<MeetingRecord[]>([]);
  const [chatUnreadCount, setChatUnreadCount] = useState(0);
  const [incomingChatMsg, setIncomingChatMsg] =
    useState<ChatMessageRecord | null>(null);
  const [liveMeetingAlert, setLiveMeetingAlert] = useState<{
    meeting: MeetingRecord;
    kind: 'reminder' | 'started';
  } | null>(null);
  const [sessionLogs, setSessionLogs] = useState<SessionLogRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<EmployeeTab>('targets');
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [catalogueSearch, setCatalogueSearch] = useState('');
  const [toast, setToast] = useState<string | null>(null);
  const prevUnreadRef = useRef<number | null>(null);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    window.setTimeout(() => {
      setToast((curr) => (curr === msg ? null : curr));
    }, 3400);
  }, []);

  const loadNotificationsOnly = useCallback(async () => {
    try {
      const res = await authFetch('/api/employee/notifications');
      if (res.ok) {
        const data = await res.json();
        const list: EmployeeNotificationRecord[] = Array.isArray(data.notifications)
          ? data.notifications
          : [];
        const nextUnread =
          typeof data.unreadCount === 'number'
            ? data.unreadCount
            : list.filter((n) => !n.isRead).length;

        if (
          prevUnreadRef.current !== null &&
          nextUnread > prevUnreadRef.current
        ) {
          showToast('New notification received from Alorix Administration.');
        }
        prevUnreadRef.current = nextUnread;
        setNotifications(list);
        setUnreadCount(nextUnread);
      }
    } catch {
      // Ignore background poll error
    }
  }, [authFetch, showToast]);

  const loadMeetingsOnly = useCallback(async () => {
    try {
      const res = await authFetch('/api/employee/meetings');
      if (res.ok) {
        const data = await res.json();
        setMeetings(Array.isArray(data.meetings) ? data.meetings : []);
      }
    } catch {
      // ignore transient error
    }
  }, [authFetch]);

  const loadWorkspace = useCallback(async () => {
    setLoading(true);
    try {
      const [
        wsRes,
        targetsRes,
        extraRes,
        notifRes,
        sessionRes,
        meetingsRes,
        chatDirRes,
      ] = await Promise.all([
        authFetch('/api/employee/workspace'),
        authFetch('/api/employee/targets'),
        authFetch('/api/employee/extra-work'),
        authFetch('/api/employee/notifications'),
        authFetch('/api/employee/session-logs'),
        authFetch('/api/employee/meetings'),
        authFetch('/api/chat/directory'),
      ]);

      if (wsRes.ok) {
        const data = await wsRes.json();
        if (data.employee) {
          setEmployee(data.employee);
        }
        setCanViewEnquiries(Boolean(data.canViewEnquiries));
        setEnquiries(Array.isArray(data.enquiries) ? data.enquiries : []);
      }
      if (targetsRes.ok) {
        const data = await targetsRes.json();
        setTargets(Array.isArray(data.targets) ? data.targets : []);
      }
      if (extraRes.ok) {
        const data = await extraRes.json();
        setExtraWorkItems(Array.isArray(data.items) ? data.items : []);
      }
      if (notifRes.ok) {
        const data = await notifRes.json();
        const list: EmployeeNotificationRecord[] = Array.isArray(data.notifications)
          ? data.notifications
          : [];
        const nextUnread =
          typeof data.unreadCount === 'number'
            ? data.unreadCount
            : list.filter((n) => !n.isRead).length;
        prevUnreadRef.current = nextUnread;
        setNotifications(list);
        setUnreadCount(nextUnread);
      }
      if (sessionRes.ok) {
        const data = await sessionRes.json();
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
    } finally {
      setLoading(false);
    }
  }, [authFetch]);

  useEffect(() => {
    loadWorkspace();
  }, [loadWorkspace]);

  const handleRealtimeEvent = useCallback(
    (msg: PortalRealtimeMessage) => {
      if (msg.event === 'notification:new') {
        const payload = msg.payload as {
          id?: string;
          title?: string;
          message?: string;
          priority?: string;
        };
        void loadNotificationsOnly();
        if (payload?.title && !payload.title.startsWith('Meeting Starting')) {
          showToast(payload.title);
          showBrowserNotification({
            title: payload.title,
            body: payload.message || 'New announcement from Alorix Administration.',
            tag: payload.id ? `notif-${payload.id}` : undefined,
            urgent: payload.priority === 'urgent',
            onClick: () => setActiveTab('notifications'),
          });
        }
        return;
      }

      if (msg.event === 'chat:message') {
        const chatMsg = msg.payload as ChatMessageRecord;
        if (chatMsg && chatMsg.id) {
          setIncomingChatMsg(chatMsg);
          if (chatMsg.senderId !== employee.id) {
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
        void loadMeetingsOnly();
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
            body: 'Click to open Alorix Meetings & join the call.',
            tag: `meeting-${kind}-${payload.meeting.id}`,
            urgent: true,
            onClick: () => setActiveTab('meetings'),
          });
          void loadMeetingsOnly();
          void loadNotificationsOnly();
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

      if (msg.event === 'enquiry:created' && canViewEnquiries) {
        const created = msg.payload as EnquiryRecord;
        if (created && created.id) {
          setEnquiries((prev) =>
            prev.some((item) => item.id === created.id)
              ? prev
              : [created, ...prev]
          );
        }
      }
    },
    [
      activeTab,
      canViewEnquiries,
      employee.id,
      loadMeetingsOnly,
      loadNotificationsOnly,
      showToast,
    ]
  );

  const { onlineAccountIds } = usePortalRealtime({
    token,
    enabled: Boolean(token),
    onEvent: handleRealtimeEvent,
    onReconnect: loadWorkspace,
  });

  // Fallback background notification sync every 45 seconds
  useEffect(() => {
    const id = window.setInterval(() => {
      loadNotificationsOnly();
    }, 45_000);
    return () => window.clearInterval(id);
  }, [loadNotificationsOnly]);

  const canViewCatalogue = useMemo(() => {
    const lower = employee.permissions.map((p) => p.toLowerCase());
    return lower.some(
      (p) => p.includes('catalogue') || p.includes('inventory') || p.includes('order')
    );
  }, [employee.permissions]);

  const navItems = useMemo(() => {
    const items: {
      id: EmployeeTab;
      label: string;
      icon: typeof User;
      count?: number;
      highlightBadge?: boolean;
    }[] = [
      {
        id: 'targets',
        label: 'Weekly Targets',
        icon: Target,
        count: targets.length,
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
        count: unreadCount > 0 ? unreadCount : notifications.length,
        highlightBadge: unreadCount > 0,
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
      { id: 'overview', label: 'My Profile', icon: User },
    ];

    if (canViewEnquiries) {
      items.push({
        id: 'enquiries',
        label: 'Enquiries Desk',
        icon: Inbox,
        count: enquiries.length,
      });
    }
    if (canViewCatalogue) {
      items.push({
        id: 'catalogue',
        label: 'Product Catalogue',
        icon: Package,
        count: CHEMICAL_CATEGORIES.length,
      });
    }
    return items;
  }, [
    canViewEnquiries,
    canViewCatalogue,
    enquiries.length,
    targets.length,
    extraWorkItems.length,
    notifications.length,
    unreadCount,
    chatUnreadCount,
    meetings.length,
    sessionLogs.length,
  ]);

  const filteredCatalogue = useMemo(() => {
    const q = catalogueSearch.trim().toLowerCase();
    if (!q) return CHEMICAL_CATEGORIES;
    return CHEMICAL_CATEGORIES.filter((prod) =>
      [prod.index, prod.title, prod.familyLabel, prod.shortDescription]
        .join(' ')
        .toLowerCase()
        .includes(q)
    );
  }, [catalogueSearch]);

  const tabTitles: Record<EmployeeTab, string> = {
    targets: 'Weekly Targets & Progress Reporting',
    extra_work: 'Extra Work & Screenshots',
    notifications: 'Notification Centre',
    chat: 'Team & Company Group Chat',
    meetings: 'Scheduled Meetings',
    session_logs: 'My Login & Logout History',
    overview: 'Employee Profile & Permissions',
    enquiries: 'Client Enquiries Desk',
    catalogue: 'Product Catalogue Reference',
  };

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
                Alorix Staff Portal
              </p>
              <p className="text-[11px] text-[#8a968f]">
                {employee.department}
              </p>
            </div>
          </div>

          <nav aria-label="Employee navigation" className="space-y-1">
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
              {employee.employeeCode}
            </p>
            <p className="text-xs text-[#dfe7e0] font-medium truncate">
              {employee.fullName}
            </p>
            <p className="text-[11px] text-[#8a968f] truncate">{employee.role}</p>
          </div>
          <button
            type="button"
            onClick={onLogout}
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
                    Alorix Staff
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
                        {typeof item.count === 'number' && (
                          <span className="font-mono-tech tabular-nums text-[11px]">
                            {item.count}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </nav>
              </div>
              <button
                type="button"
                onClick={onLogout}
                className="w-full inline-flex items-center justify-center gap-2 px-3 py-2.5 text-xs font-medium text-[#b4bfb7] border border-[#dfe7e0]/15 rounded-md"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out</span>
              </button>
            </motion.aside>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <div className="flex-1 min-w-0 flex flex-col">
        <header className="h-16 px-4 sm:px-8 border-b border-[#dfe7e0]/12 bg-[#070a0f]/90 flex items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileNavOpen(true)}
              aria-label="Open menu"
              className="lg:hidden w-10 h-10 rounded-md border border-[#dfe7e0]/15 flex items-center justify-center text-[#dfe7e0]"
            >
              <Menu className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-2 text-xs text-[#8a968f] truncate">
              <span className="hidden sm:inline">Employee Portal</span>
              <span className="hidden sm:inline" aria-hidden="true">
                /
              </span>
              <span className="text-[#dfe7e0] font-medium truncate">
                {tabTitles[activeTab]}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setActiveTab('notifications')}
              aria-label="Open Notification Centre"
              className="relative inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-[#b4bfb7] hover:text-[#dfe7e0] bg-[#05070a] border border-[#dfe7e0]/15 rounded-md transition-colors whitespace-nowrap"
            >
              <Bell className="w-3.5 h-3.5 text-[#e8ad26]" />
              <span className="hidden sm:inline">Alerts</span>
              {unreadCount > 0 && (
                <span className="px-1.5 py-0.2 rounded bg-[#e0231c] text-white font-mono-tech text-[10px]">
                  {unreadCount}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={loadWorkspace}
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-[#b4bfb7] hover:text-[#dfe7e0] bg-[#05070a] border border-[#dfe7e0]/15 rounded-md transition-colors whitespace-nowrap shrink-0"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-8 max-w-6xl w-full mx-auto space-y-6">
          <BrowserNotificationBanner
            permission={notifPermission}
            onPermissionChange={onNotifPermissionChange}
          />
          {liveMeetingAlert && (
            <MeetingLiveAlertBanner
              meeting={liveMeetingAlert.meeting}
              kind={liveMeetingAlert.kind}
              onDismiss={() => setLiveMeetingAlert(null)}
            />
          )}

          {activeTab === 'targets' && (
            <EmployeeWeeklyTargetsView
              targets={targets}
              authFetch={authFetch}
              onReload={loadWorkspace}
              showToast={showToast}
            />
          )}

          {activeTab === 'extra_work' && (
            <EmployeeExtraWorkView
              items={extraWorkItems}
              authFetch={authFetch}
              onReload={loadWorkspace}
              showToast={showToast}
            />
          )}

          {activeTab === 'notifications' && (
            <EmployeeNotificationsView
              notifications={notifications}
              unreadCount={unreadCount}
              authFetch={authFetch}
              onReload={loadWorkspace}
              showToast={showToast}
            />
          )}

          {activeTab === 'chat' && (
            <TeamChatPanel
              authFetch={authFetch}
              currentAccountId={employee.id}
              onlineAccountIds={onlineAccountIds}
              incomingMessage={incomingChatMsg}
              onUnreadTotalChange={setChatUnreadCount}
            />
          )}

          {activeTab === 'meetings' && (
            <EmployeeMeetingsView meetings={meetings} />
          )}

          {activeTab === 'session_logs' && (
            <EmployeeSessionHistoryView logs={sessionLogs} />
          )}

          {activeTab === 'overview' && (
            <>
              <div className="rounded-xl bg-[#0a0e14] border border-[#dfe7e0]/14 p-6 sm:p-7 flex flex-col md:flex-row md:items-center md:justify-between gap-5">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <span className="font-mono-tech text-xs tracking-[0.12em] uppercase text-[#e8ad26]">
                      {employee.employeeCode}
                    </span>
                    <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded bg-emerald-500/12 text-emerald-300 border border-emerald-500/30">
                      <CheckCircle2 className="w-3 h-3" />
                      Active Account
                    </span>
                  </div>
                  <h1 className="font-display font-normal text-2xl sm:text-3xl text-[#dfe7e0]">
                    Welcome, {employee.fullName}
                  </h1>
                  <p className="text-xs sm:text-sm text-[#9aa5a0]">
                    {employee.role} · {employee.department}
                  </p>
                </div>

                <div className="rounded-lg bg-[#05070a] border border-[#dfe7e0]/12 px-4 py-3 text-xs space-y-1 shrink-0">
                  <p className="text-[#8a968f]">Signed in as</p>
                  <p className="font-mono-tech text-[#dfe7e0]">{employee.loginId}</p>
                </div>
              </div>

              {/* Account Details Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="rounded-lg bg-[#0a0e14] border border-[#dfe7e0]/12 p-5 space-y-1.5">
                  <div className="flex items-center gap-2 text-xs text-[#8a968f]">
                    <Briefcase className="w-3.5 h-3.5 text-[#e8ad26]" />
                    <span>Assigned Role</span>
                  </div>
                  <p className="text-base font-medium text-[#dfe7e0]">
                    {employee.role}
                  </p>
                  <p className="text-xs text-[#8a968f]">{employee.department}</p>
                </div>

                <div className="rounded-lg bg-[#0a0e14] border border-[#dfe7e0]/12 p-5 space-y-1.5">
                  <div className="flex items-center gap-2 text-xs text-[#8a968f]">
                    <ShieldCheck className="w-3.5 h-3.5 text-[#e8ad26]" />
                    <span>Granted Modules</span>
                  </div>
                  <p className="text-base font-medium font-mono-tech tabular-nums text-[#dfe7e0]">
                    {employee.permissions.length} / {ALL_MODULES.length}
                  </p>
                  <p className="text-xs text-[#8a968f]">Configured by Administrator</p>
                </div>

                <div className="rounded-lg bg-[#0a0e14] border border-[#dfe7e0]/12 p-5 space-y-1.5">
                  <div className="flex items-center gap-2 text-xs text-[#8a968f]">
                    <Lock className="w-3.5 h-3.5 text-[#e8ad26]" />
                    <span>Password Last Updated</span>
                  </div>
                  <p className="text-sm font-mono-tech text-[#dfe7e0]">
                    {formatDateTime(employee.passwordUpdatedAt)}
                  </p>
                  <p className="text-xs text-[#8a968f]">Managed by Admin only</p>
                </div>
              </div>

              {/* Module Permissions Matrix */}
              <section className="rounded-xl bg-[#0a0e14] border border-[#dfe7e0]/12 p-6 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div>
                    <h2 className="font-display font-normal text-lg text-[#dfe7e0]">
                      Assigned Access Permissions
                    </h2>
                    <p className="text-xs text-[#8a968f]">
                      Modules authorized for your employee ID by Alorix Administration.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {ALL_MODULES.map((mod) => {
                    const granted = employee.permissions.some(
                      (p) => p.toLowerCase() === mod.toLowerCase()
                    );
                    return (
                      <div
                        key={mod}
                        className={`rounded-lg px-4 py-3 border flex items-center justify-between gap-3 ${
                          granted
                            ? 'bg-[#0d141c] border-[#e8ad26]/35 text-[#dfe7e0]'
                            : 'bg-[#06080c] border-[#dfe7e0]/8 text-[#6c7872]'
                        }`}
                      >
                        <span className="text-xs font-medium">{mod}</span>
                        <span
                          className={`text-[10px] font-mono-tech uppercase tracking-[0.1em] px-2 py-0.5 rounded ${
                            granted
                              ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                              : 'bg-white/[0.03] text-[#6c7872] border border-[#dfe7e0]/10'
                          }`}
                        >
                          {granted ? 'Enabled' : 'Restricted'}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {employee.notes && (
                  <div className="pt-3 border-t border-[#dfe7e0]/10 space-y-1">
                    <p className="text-[11px] font-mono-tech uppercase tracking-[0.14em] text-[#8a968f]">
                      Administrator Notes
                    </p>
                    <p className="text-xs text-[#c7d1ca] leading-relaxed">
                      {employee.notes}
                    </p>
                  </div>
                )}
              </section>

              <div className="rounded-lg bg-[#080c12] border border-[#dfe7e0]/10 px-4 py-3.5 flex items-start gap-3 text-xs text-[#9aa5a0]">
                <Lock className="w-4 h-4 text-[#e8ad26] shrink-0 mt-0.5" />
                <p>
                  For security compliance, employee password changes, role updates,
                  and permission changes can only be performed by an Alorix
                  Administrator.
                </p>
              </div>
            </>
          )}

          {activeTab === 'enquiries' && canViewEnquiries && (
            <EnquiriesInboxPanel
              title="Client Enquiries Desk"
              subtitle="Business enquiries submitted via the Alorix website. Tick an enquiry once resolved — status updates are saved permanently and synced with Administration."
              enquiries={enquiries}
              authFetch={authFetch}
              onEnquiryUpdated={(updated) => {
                setEnquiries((prev) =>
                  prev.map((item) => (item.id === updated.id ? updated : item))
                );
              }}
              showToast={showToast}
            />
          )}

          {activeTab === 'catalogue' && canViewCatalogue && (
            <section className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h1 className="font-display font-normal text-2xl text-[#dfe7e0]">
                    Alorix Product Catalogue
                  </h1>
                  <p className="text-xs text-[#8a968f]">
                    Internal product specifications and export packaging reference.
                  </p>
                </div>
                <div className="relative w-full sm:w-72">
                  <Search className="w-4 h-4 text-[#8a968f] absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={catalogueSearch}
                    onChange={(e) => setCatalogueSearch(e.target.value)}
                    placeholder="Filter 17 products..."
                    className="w-full pl-9 pr-3 py-2 text-xs bg-[#0a0e14] border border-[#dfe7e0]/15 rounded-md text-[#dfe7e0] placeholder:text-[#66726c] focus:outline-none focus:border-[#e0231c]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredCatalogue.map((product) => (
                  <div
                    key={product.id}
                    className="rounded-xl bg-[#0a0e14] border border-[#dfe7e0]/12 p-5 space-y-2.5"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono-tech text-[11px] text-[#e8ad26]">
                        {product.index} · {product.familyLabel}
                      </span>
                    </div>
                    <h3 className="font-display font-normal text-base text-[#dfe7e0]">
                      {product.title}
                    </h3>
                    <p className="text-xs text-[#9aa5a0] leading-relaxed">
                      {product.shortDescription}
                    </p>
                    <div className="pt-2 border-t border-[#dfe7e0]/8 text-[11px] text-[#b4bfb7] space-y-1">
                      <p>
                        <span className="text-[#8a968f]">Packaging: </span>
                        {product.editableFields.packagingPlaceholder}
                      </p>
                      <p>
                        <span className="text-[#8a968f]">Scope: </span>
                        {product.editableFields.sourcingScope}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </main>
      </div>

      {/* Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            className="fixed bottom-5 right-5 z-50 px-4 py-2.5 rounded-lg bg-[#0d141d] border border-[#e8ad26]/40 text-xs text-[#dfe7e0] shadow-2xl"
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
