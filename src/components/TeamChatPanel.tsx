import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
} from 'react';
import {
  ArrowLeft,
  Hash,
  MessageSquare,
  Search,
  Send,
  Users,
} from 'lucide-react';
import { formatDateTime } from '../utils/driveLinks';
import { detectRealtimeMode } from '../utils/usePortalRealtime';

export const COMPANY_GROUP_CHANNEL_ID = 'company-group';

export interface ChatMessageRecord {
  id: string;
  channelId: string;
  channelType: 'group' | 'dm';
  senderId: string;
  senderName: string;
  senderRole: 'super_admin' | 'admin' | 'employee';
  senderCode?: string;
  recipientId?: string;
  text: string;
  createdAt: string;
  readBy: string[];
}

export interface ChatDirectoryMember {
  accountId: string;
  displayName: string;
  username: string;
  role: 'super_admin' | 'admin' | 'employee';
  roleTitle: string;
  department: string;
  employeeCode?: string;
  online: boolean;
  channelId: string;
  unreadCount: number;
  lastMessageText: string;
  lastMessageAt: string | null;
}

export interface ChatGroupMeta {
  channelId: string;
  name: string;
  memberCount: number;
  onlineCount: number;
  unreadCount: number;
  lastMessageText: string;
  lastMessageAt: string | null;
}

function formatShortTime(iso: string): string {
  try {
    return new Intl.DateTimeFormat('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(iso));
  } catch {
    return '';
  }
}

function SenderRoleTag({ role }: { role: ChatMessageRecord['senderRole'] }) {
  if (role === 'super_admin') {
    return (
      <span className="text-[9px] font-mono-tech uppercase tracking-[0.1em] px-1.5 py-0.5 rounded bg-[#e8ad26]/18 text-[#e8ad26] border border-[#e8ad26]/40">
        Master Admin
      </span>
    );
  }
  if (role === 'admin') {
    return (
      <span className="text-[9px] font-mono-tech uppercase tracking-[0.1em] px-1.5 py-0.5 rounded bg-[#e0231c]/18 text-[#ff8682] border border-[#e0231c]/40">
        Admin
      </span>
    );
  }
  return null;
}

export default function TeamChatPanel({
  authFetch,
  currentAccountId,
  onlineAccountIds,
  incomingMessage,
  onUnreadTotalChange,
}: {
  authFetch: (url: string, init?: RequestInit) => Promise<Response>;
  currentAccountId: string;
  onlineAccountIds: string[];
  incomingMessage: ChatMessageRecord | null;
  onUnreadTotalChange?: (total: number) => void;
}) {
  const [groupChannel, setGroupChannel] = useState<ChatGroupMeta>({
    channelId: COMPANY_GROUP_CHANNEL_ID,
    name: 'Alorix Company Group Chat',
    memberCount: 1,
    onlineCount: onlineAccountIds.length,
    unreadCount: 0,
    lastMessageText: '',
    lastMessageAt: null,
  });
  const [members, setMembers] = useState<ChatDirectoryMember[]>([]);
  const [activeChannelId, setActiveChannelId] = useState<string>(
    COMPANY_GROUP_CHANNEL_ID
  );
  const [mobileShowChat, setMobileShowChat] = useState(false);
  const [search, setSearch] = useState('');
  const [messages, setMessages] = useState<ChatMessageRecord[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [draftText, setDraftText] = useState('');
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const lastHandledMsgIdRef = useRef<string | null>(null);

  const loadDirectory = useCallback(async () => {
    try {
      const res = await authFetch('/api/chat/directory');
      if (!res.ok) return;
      const data = await res.json();
      if (data.ok) {
        if (data.groupChannel) setGroupChannel(data.groupChannel);
        if (Array.isArray(data.members)) setMembers(data.members);
        if (
          typeof data.totalUnread === 'number' &&
          onUnreadTotalChange
        ) {
          onUnreadTotalChange(data.totalUnread);
        }
      }
    } catch {
      // ignore transient error
    }
  }, [authFetch, onUnreadTotalChange]);

  const markChannelRead = useCallback(
    async (channelId: string) => {
      try {
        await authFetch('/api/chat/read', {
          method: 'POST',
          body: JSON.stringify({ channelId }),
        });
      } catch {
        // ignore
      }
    },
    [authFetch]
  );

  const loadMessages = useCallback(
    async (channelId: string) => {
      setLoadingMessages(true);
      setSendError(null);
      try {
        const res = await authFetch(
          `/api/chat/messages?channelId=${encodeURIComponent(channelId)}`
        );
        if (res.ok) {
          const data = await res.json();
          if (data.ok && Array.isArray(data.messages)) {
            setMessages(data.messages);
          }
        }
        await markChannelRead(channelId);
        await loadDirectory();
      } finally {
        setLoadingMessages(false);
      }
    },
    [authFetch, markChannelRead, loadDirectory]
  );

  useEffect(() => {
    loadDirectory();
  }, [loadDirectory]);

  useEffect(() => {
    loadMessages(activeChannelId);
  }, [activeChannelId, loadMessages]);

  // When running in HTTP polling fallback mode, silently sync active chat every 5s
  useEffect(() => {
    let active = true;
    let timer: number | null = null;
    void detectRealtimeMode().then((mode) => {
      if (!active || mode !== 'polling') return;
      timer = window.setInterval(async () => {
        if (document.visibilityState !== 'visible') return;
        try {
          const res = await authFetch(
            `/api/chat/messages?channelId=${encodeURIComponent(activeChannelId)}`
          );
          if (res.ok) {
            const data = await res.json();
            if (data.ok && Array.isArray(data.messages)) {
              setMessages(data.messages);
            }
          }
          await loadDirectory();
        } catch {
          // ignore transient poll error
        }
      }, 5_000);
    });
    return () => {
      active = false;
      if (timer) window.clearInterval(timer);
    };
  }, [activeChannelId, authFetch, loadDirectory]);

  // Apply live incoming WebSocket chat messages idempotently
  useEffect(() => {
    if (!incomingMessage) return;
    if (lastHandledMsgIdRef.current === incomingMessage.id) return;
    lastHandledMsgIdRef.current = incomingMessage.id;

    if (incomingMessage.channelId === activeChannelId) {
      setMessages((prev) => {
        if (prev.some((m) => m.id === incomingMessage.id)) return prev;
        return [...prev, incomingMessage];
      });
      if (incomingMessage.senderId !== currentAccountId) {
        void markChannelRead(activeChannelId).then(() => loadDirectory());
      } else {
        void loadDirectory();
      }
    } else {
      void loadDirectory();
    }
  }, [
    incomingMessage,
    activeChannelId,
    currentAccountId,
    markChannelRead,
    loadDirectory,
  ]);

  // Scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, activeChannelId]);

  const onlineSet = useMemo(
    () => new Set(onlineAccountIds),
    [onlineAccountIds]
  );

  const filteredMembers = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = members.map((m) => ({
      ...m,
      online: onlineSet.has(m.accountId) || m.online,
    }));
    list.sort((a, b) => {
      if (b.unreadCount !== a.unreadCount) return b.unreadCount - a.unreadCount;
      if (a.lastMessageAt && b.lastMessageAt) {
        return b.lastMessageAt.localeCompare(a.lastMessageAt);
      }
      if (a.lastMessageAt) return -1;
      if (b.lastMessageAt) return 1;
      return a.displayName.localeCompare(b.displayName);
    });
    if (!q) return list;
    return list.filter((m) =>
      [m.displayName, m.employeeCode || '', m.roleTitle, m.department, m.username]
        .join(' ')
        .toLowerCase()
        .includes(q)
    );
  }, [members, onlineSet, search]);

  const activeMember = useMemo(
    () =>
      activeChannelId === COMPANY_GROUP_CHANNEL_ID
        ? null
        : filteredMembers.find((m) => m.channelId === activeChannelId) ||
          members.find((m) => m.channelId === activeChannelId) ||
          null,
    [activeChannelId, filteredMembers, members]
  );

  const submitMessage = async () => {
    const trimmed = draftText.trim();
    if (!trimmed || sending) return;
    setSending(true);
    setSendError(null);
    try {
      const res = await authFetch('/api/chat/messages', {
        method: 'POST',
        body: JSON.stringify({
          channelId: activeChannelId,
          text: trimmed,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setSendError(data.error || 'Could not send message.');
        return;
      }
      setDraftText('');
      const created: ChatMessageRecord = data.message;
      setMessages((prev) =>
        prev.some((m) => m.id === created.id) ? prev : [...prev, created]
      );
      void loadDirectory();
    } catch {
      setSendError('Network error while sending message.');
    } finally {
      setSending(false);
    }
  };

  const handleFormSubmit = (e: FormEvent) => {
    e.preventDefault();
    void submitMessage();
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void submitMessage();
    }
  };

  const openChannel = (channelId: string) => {
    setActiveChannelId(channelId);
    setMobileShowChat(true);
  };

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <p className="font-mono-tech text-[11px] uppercase tracking-[0.16em] text-[#e8ad26]">
          Live Team Messaging
        </p>
        <h1 className="font-display font-normal text-2xl text-[#dfe7e0]">
          Company Group &amp; Direct Chat
        </h1>
        <p className="text-xs text-[#9aa5a0]">
          Talk with the entire Alorix team in the Company Group Chat or open a
          private 1-on-1 conversation with any employee or administrator. All
          messages save permanently online.
        </p>
      </div>

      <div className="rounded-xl bg-[#0a0e14] border border-[#dfe7e0]/14 overflow-hidden grid grid-cols-1 md:grid-cols-[290px_1fr] h-[calc(100vh-240px)] min-h-[520px] max-h-[760px]">
        {/* Left Rail: Group Channel + Direct Messages */}
        <aside
          className={`border-r border-[#dfe7e0]/12 bg-[#080b10] flex flex-col min-h-0 ${
            mobileShowChat ? 'hidden md:flex' : 'flex'
          }`}
        >
          <div className="p-3 border-b border-[#dfe7e0]/10">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-[#8a968f] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search team members..."
                className="w-full pl-8 pr-3 py-2 text-xs text-[#dfe7e0] bg-[#05070a] border border-[#dfe7e0]/12 rounded-md placeholder:text-[#66726c] focus:outline-none focus:border-[#e0231c]"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-[#dfe7e0]/8">
            {/* Pinned Company Group Chat */}
            <div className="p-2">
              <p className="px-2 py-1 text-[10px] font-mono-tech uppercase tracking-[0.14em] text-[#8a968f]">
                Company Room
              </p>
              <button
                type="button"
                onClick={() => openChannel(COMPANY_GROUP_CHANNEL_ID)}
                className={`w-full text-left px-3 py-2.5 rounded-lg transition-colors flex items-start justify-between gap-2 ${
                  activeChannelId === COMPANY_GROUP_CHANNEL_ID
                    ? 'bg-[#e0231c]/16 border border-[#e0231c]/45'
                    : 'hover:bg-white/[0.04] border border-transparent'
                }`}
              >
                <div className="flex items-start gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-md bg-[#e8ad26]/15 border border-[#e8ad26]/40 flex items-center justify-center shrink-0 mt-0.5">
                    <Hash className="w-4 h-4 text-[#e8ad26]" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-[#dfe7e0] truncate">
                      Company Group Chat
                    </p>
                    <p className="text-[11px] text-[#8a968f] truncate">
                      {groupChannel.lastMessageText ||
                        `All ${groupChannel.memberCount} team members`}
                    </p>
                  </div>
                </div>
                {groupChannel.unreadCount > 0 && (
                  <span className="px-1.5 py-0.5 rounded bg-[#e0231c] text-white font-mono-tech text-[10px] shrink-0">
                    {groupChannel.unreadCount}
                  </span>
                )}
              </button>
            </div>

            {/* Direct Messages List */}
            <div className="p-2 space-y-1">
              <p className="px-2 py-1 text-[10px] font-mono-tech uppercase tracking-[0.14em] text-[#8a968f]">
                Direct Messages ({filteredMembers.length})
              </p>
              {filteredMembers.length === 0 ? (
                <p className="px-2 py-4 text-[11px] text-[#7a8680] text-center">
                  No matching team members.
                </p>
              ) : (
                filteredMembers.map((member) => {
                  const isActive = activeChannelId === member.channelId;
                  return (
                    <button
                      key={member.accountId}
                      type="button"
                      onClick={() => openChannel(member.channelId)}
                      className={`w-full text-left px-3 py-2.5 rounded-lg transition-colors flex items-start justify-between gap-2 ${
                        isActive
                          ? 'bg-[#e0231c]/16 border border-[#e0231c]/45'
                          : 'hover:bg-white/[0.04] border border-transparent'
                      }`}
                    >
                      <div className="flex items-start gap-2.5 min-w-0">
                        <div className="relative w-8 h-8 rounded-md bg-[#111722] border border-[#dfe7e0]/14 flex items-center justify-center shrink-0 mt-0.5 text-xs font-medium text-[#dfe7e0]">
                          {member.displayName.slice(0, 1).toUpperCase()}
                          <span
                            className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-[#080b10] ${
                              member.online ? 'bg-emerald-400' : 'bg-[#4b5550]'
                            }`}
                          />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-medium text-[#dfe7e0] truncate">
                            {member.displayName}
                          </p>
                          <p className="text-[10px] font-mono-tech text-[#8a968f] truncate">
                            {member.employeeCode
                              ? `${member.employeeCode} · ${member.roleTitle}`
                              : member.roleTitle}
                          </p>
                          {member.lastMessageText && (
                            <p className="text-[11px] text-[#9aa5a0] truncate mt-0.5">
                              {member.lastMessageText}
                            </p>
                          )}
                        </div>
                      </div>
                      {member.unreadCount > 0 && (
                        <span className="px-1.5 py-0.5 rounded bg-[#e0231c] text-white font-mono-tech text-[10px] shrink-0">
                          {member.unreadCount}
                        </span>
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </aside>

        {/* Right Pane: Active Conversation */}
        <section
          className={`flex flex-col min-h-0 bg-[#05070a] ${
            mobileShowChat ? 'flex' : 'hidden md:flex'
          }`}
        >
          {/* Conversation Header */}
          <div className="px-4 py-3 border-b border-[#dfe7e0]/12 bg-[#0a0e14] flex items-center justify-between gap-3 shrink-0">
            <div className="flex items-center gap-2.5 min-w-0">
              <button
                type="button"
                onClick={() => setMobileShowChat(false)}
                aria-label="Back to chat list"
                className="md:hidden w-8 h-8 rounded-md border border-[#dfe7e0]/15 flex items-center justify-center text-[#b4bfb7]"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>

              {activeChannelId === COMPANY_GROUP_CHANNEL_ID ? (
                <>
                  <div className="w-8 h-8 rounded-md bg-[#e8ad26]/15 border border-[#e8ad26]/40 flex items-center justify-center shrink-0">
                    <Users className="w-4 h-4 text-[#e8ad26]" />
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-sm font-medium text-[#dfe7e0] truncate">
                      Alorix Company Group Chat
                    </h2>
                    <p className="text-[11px] text-[#8a968f]">
                      {groupChannel.memberCount} members ·{' '}
                      <span className="text-emerald-300">
                        {Math.max(1, onlineAccountIds.length)} online now
                      </span>
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <div className="w-8 h-8 rounded-md bg-[#111722] border border-[#dfe7e0]/14 flex items-center justify-center shrink-0 text-xs font-medium text-[#dfe7e0]">
                    {(activeMember?.displayName || '?')
                      .slice(0, 1)
                      .toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-sm font-medium text-[#dfe7e0] truncate">
                      {activeMember?.displayName || 'Direct Message'}
                    </h2>
                    <p className="text-[11px] text-[#8a968f] truncate">
                      {activeMember?.employeeCode
                        ? `${activeMember.employeeCode} · `
                        : ''}
                      {activeMember?.roleTitle || ''} ·{' '}
                      <span
                        className={
                          activeMember && onlineSet.has(activeMember.accountId)
                            ? 'text-emerald-300'
                            : 'text-[#7a8680]'
                        }
                      >
                        {activeMember && onlineSet.has(activeMember.accountId)
                          ? 'Online'
                          : 'Offline'}
                      </span>
                    </p>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Messages Scroll Area */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3">
            {loadingMessages ? (
              <div className="h-full flex items-center justify-center text-xs text-[#8a968f]">
                Loading conversation...
              </div>
            ) : messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center space-y-2 px-4">
                <MessageSquare className="w-7 h-7 text-[#5b6661]" />
                <p className="text-sm text-[#dfe7e0]">No messages yet</p>
                <p className="text-xs text-[#8a968f] max-w-xs">
                  {activeChannelId === COMPANY_GROUP_CHANNEL_ID
                    ? 'Start a message in the Company Group Chat so every team member can see it immediately.'
                    : `Send a direct message to ${activeMember?.displayName || 'this team member'}.`}
                </p>
              </div>
            ) : (
              messages.map((msg) => {
                const isMine = msg.senderId === currentAccountId;
                return (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${
                      isMine ? 'items-end' : 'items-start'
                    }`}
                  >
                    <div
                      className={`max-w-[85%] sm:max-w-[74%] rounded-xl px-3.5 py-2.5 space-y-1 border ${
                        isMine
                          ? 'bg-[#e0231c]/18 border-[#e0231c]/40 text-[#dfe7e0]'
                          : 'bg-[#0c1118] border-[#dfe7e0]/12 text-[#dfe7e0]'
                      }`}
                    >
                      {!isMine && (
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="text-[11px] font-medium text-[#e8ad26]">
                            {msg.senderName}
                          </span>
                          {msg.senderCode && (
                            <span className="font-mono-tech text-[10px] text-[#8a968f]">
                              {msg.senderCode}
                            </span>
                          )}
                          <SenderRoleTag role={msg.senderRole} />
                        </div>
                      )}
                      <p className="text-xs whitespace-pre-wrap break-words leading-relaxed">
                        {msg.text}
                      </p>
                      <p
                        title={formatDateTime(msg.createdAt)}
                        className="text-[10px] font-mono-tech text-[#8a968f] text-right"
                      >
                        {formatShortTime(msg.createdAt)}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Composer */}
          <form
            onSubmit={handleFormSubmit}
            className="p-3 sm:p-4 border-t border-[#dfe7e0]/12 bg-[#0a0e14] space-y-2 shrink-0"
          >
            {sendError && (
              <p className="text-[11px] text-[#ff6b66]">{sendError}</p>
            )}
            <div className="flex items-end gap-2">
              <textarea
                rows={1}
                value={draftText}
                onChange={(e) => setDraftText(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={
                  activeChannelId === COMPANY_GROUP_CHANNEL_ID
                    ? 'Message everyone in Alorix Company Group Chat...'
                    : `Message ${activeMember?.displayName || 'team member'}...`
                }
                className="flex-1 px-3.5 py-2.5 text-xs text-[#dfe7e0] bg-[#05070a] border border-[#dfe7e0]/15 rounded-lg placeholder:text-[#66726c] focus:outline-none focus:border-[#e0231c] resize-none max-h-28"
              />
              <button
                type="submit"
                disabled={sending || !draftText.trim()}
                className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 text-xs font-medium uppercase tracking-[0.08em] text-white bg-[#e0231c] hover:bg-[#c81e17] disabled:opacity-50 rounded-lg transition-colors whitespace-nowrap shrink-0"
              >
                <Send className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Send</span>
              </button>
            </div>
          </form>
        </section>
      </div>
    </div>
  );
}
