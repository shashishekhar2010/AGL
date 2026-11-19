import { useState, type FormEvent } from 'react';
import {
  Check,
  CheckCircle2,
  Copy,
  Eye,
  EyeOff,
  KeyRound,
  Pencil,
  Plus,
  RefreshCw,
  ShieldCheck,
  Trash2,
  UserCheck,
  UserX,
  X,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';

export interface ManagedAdminRecord {
  id: string;
  username: string;
  displayName: string;
  tier: 'admin';
  isPrimaryAdmin?: boolean;
  status: 'active' | 'suspended';
  createdAt: string;
  updatedAt: string;
  passwordUpdatedAt: string;
  updatedBy: string;
}

interface SuperAdminAccountsPanelProps {
  admins: ManagedAdminRecord[];
  authFetch: (url: string, init?: RequestInit) => Promise<Response>;
  onReload: () => void;
  showToast: (msg: string) => void;
}

function generateStrongPassword(length = 12): string {
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const lower = 'abcdefghijkmnopqrstuvwxyz';
  const digits = '23456789';
  const symbols = '@#$%&*';
  const all = upper + lower + digits + symbols;
  const pick = (pool: string) => pool[Math.floor(Math.random() * pool.length)];
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

export default function SuperAdminAccountsPanel({
  admins,
  authFetch,
  onReload,
  showToast,
}: SuperAdminAccountsPanelProps) {
  // Create Admin Modal
  const [createOpen, setCreateOpen] = useState(false);
  const [cUsername, setCUsername] = useState('');
  const [cDisplayName, setCDisplayName] = useState('');
  const [cPassword, setCPassword] = useState('');
  const [cShowPassword, setCShowPassword] = useState(true);
  const [cError, setCError] = useState<string | null>(null);
  const [cSubmitting, setCSubmitting] = useState(false);

  // Edit Admin ID & Optional Password Modal
  const [editingAdmin, setEditingAdmin] = useState<ManagedAdminRecord | null>(null);
  const [eUsername, setEUsername] = useState('');
  const [eDisplayName, setEDisplayName] = useState('');
  const [eStatus, setEStatus] = useState<'active' | 'suspended'>('active');
  const [eNewPassword, setENewPassword] = useState('');
  const [eConfirmPassword, setEConfirmPassword] = useState('');
  const [eShowPassword, setEShowPassword] = useState(true);
  const [eError, setEError] = useState<string | null>(null);
  const [eSubmitting, setESubmitting] = useState(false);

  // Dedicated Change Admin Password Modal
  const [pwTarget, setPwTarget] = useState<ManagedAdminRecord | null>(null);
  const [pwValue, setPwValue] = useState('');
  const [pwConfirm, setPwConfirm] = useState('');
  const [pwShow, setPwShow] = useState(true);
  const [pwError, setPwError] = useState<string | null>(null);
  const [pwSubmitting, setPwSubmitting] = useState(false);

  // Delete Confirmation Modal
  const [deleteTarget, setDeleteTarget] = useState<ManagedAdminRecord | null>(null);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);

  // One-time Credential Receipt Modal
  const [receipt, setReceipt] = useState<{
    heading: string;
    displayName: string;
    username: string;
    password?: string;
  } | null>(null);
  const [copiedReceipt, setCopiedReceipt] = useState(false);

  const primaryAdmin = admins.find((a) => a.isPrimaryAdmin) || admins[0] || null;

  const openCreateModal = () => {
    setCUsername('');
    setCDisplayName('');
    setCPassword(generateStrongPassword(12));
    setCShowPassword(true);
    setCError(null);
    setCreateOpen(true);
  };

  const openEditModal = (acc: ManagedAdminRecord) => {
    setEditingAdmin(acc);
    setEUsername(acc.username);
    setEDisplayName(acc.displayName);
    setEStatus(acc.status);
    setENewPassword('');
    setEConfirmPassword('');
    setEShowPassword(true);
    setEError(null);
  };

  const openPasswordModal = (acc: ManagedAdminRecord) => {
    setPwTarget(acc);
    setPwValue('');
    setPwConfirm('');
    setPwShow(true);
    setPwError(null);
  };

  const handleCreateAdmin = async (e: FormEvent) => {
    e.preventDefault();
    setCError(null);
    setCSubmitting(true);
    try {
      const res = await authFetch('/api/super-admin/admins', {
        method: 'POST',
        body: JSON.stringify({
          username: cUsername.trim(),
          displayName: cDisplayName.trim(),
          password: cPassword,
          status: 'active',
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setCError(data.error || 'Unable to create admin account.');
        return;
      }
      setCreateOpen(false);
      setReceipt({
        heading: 'Admin Account Created',
        displayName: data.adminAccount.displayName,
        username: data.adminAccount.username,
        password: cPassword,
      });
      setCopiedReceipt(false);
      showToast(`Created admin account ${data.adminAccount.username}`);
      onReload();
    } catch {
      setCError('Network error while creating admin account.');
    } finally {
      setCSubmitting(false);
    }
  };

  const handleSaveEdit = async (e: FormEvent) => {
    e.preventDefault();
    if (!editingAdmin) return;
    setEError(null);

    if (eNewPassword && eNewPassword.length < 6) {
      setEError('New password must be at least 6 characters long.');
      return;
    }
    if (eNewPassword && eNewPassword !== eConfirmPassword) {
      setEError('New passwords do not match.');
      return;
    }

    setESubmitting(true);
    try {
      const payload: Record<string, string> = {
        username: eUsername.trim(),
        displayName: eDisplayName.trim(),
        status: eStatus,
      };
      if (eNewPassword) {
        payload.password = eNewPassword;
      }

      const res = await authFetch(`/api/super-admin/admins/${editingAdmin.id}`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setEError(data.error || 'Unable to update admin account.');
        return;
      }

      const updated: ManagedAdminRecord = data.adminAccount;
      const changedIdOrPw =
        updated.username !== editingAdmin.username || Boolean(eNewPassword);
      setEditingAdmin(null);

      if (changedIdOrPw) {
        setReceipt({
          heading: 'Admin Credentials Updated',
          displayName: updated.displayName,
          username: updated.username,
          password: eNewPassword || undefined,
        });
        setCopiedReceipt(false);
      }

      showToast(`Updated admin credentials for ${updated.username}`);
      onReload();
    } catch {
      setEError('Network error while saving admin account.');
    } finally {
      setESubmitting(false);
    }
  };

  const handleSavePassword = async (e: FormEvent) => {
    e.preventDefault();
    if (!pwTarget) return;
    setPwError(null);

    if (pwValue.length < 6) {
      setPwError('Password must be at least 6 characters long.');
      return;
    }
    if (pwValue !== pwConfirm) {
      setPwError('Passwords do not match.');
      return;
    }

    setPwSubmitting(true);
    try {
      const res = await authFetch(`/api/super-admin/admins/${pwTarget.id}/password`, {
        method: 'POST',
        body: JSON.stringify({ password: pwValue }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setPwError(data.error || 'Unable to change admin password.');
        return;
      }
      const updated: ManagedAdminRecord = data.adminAccount;
      setPwTarget(null);
      setReceipt({
        heading: 'Admin Password Rotated',
        displayName: updated.displayName,
        username: updated.username,
        password: pwValue,
      });
      setCopiedReceipt(false);
      showToast(`Password updated for ${updated.username}`);
      onReload();
    } catch {
      setPwError('Network error while updating admin password.');
    } finally {
      setPwSubmitting(false);
    }
  };

  const handleToggleStatus = async (acc: ManagedAdminRecord) => {
    const nextStatus = acc.status === 'active' ? 'suspended' : 'active';
    try {
      const res = await authFetch(`/api/super-admin/admins/${acc.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: nextStatus }),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        showToast(
          `${acc.username} marked as ${nextStatus === 'active' ? 'Active' : 'Suspended'}`
        );
        onReload();
      }
    } catch {
      showToast('Failed to update admin status.');
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleteSubmitting(true);
    try {
      const res = await authFetch(`/api/super-admin/admins/${deleteTarget.id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        showToast(`Deleted admin account ${deleteTarget.username}`);
        setDeleteTarget(null);
        onReload();
      } else {
        showToast(data.error || 'Unable to delete admin account.');
      }
    } finally {
      setDeleteSubmitting(false);
    }
  };

  const handleCopyReceipt = async () => {
    if (!receipt) return;
    const lines = [
      `Alorix Global International — Admin Credentials`,
      `Account: ${receipt.displayName}`,
      `Admin Login ID: ${receipt.username}`,
      ...(receipt.password ? [`Password: ${receipt.password}`] : []),
    ];
    try {
      await navigator.clipboard.writeText(lines.join('\n'));
      setCopiedReceipt(true);
    } catch {
      // clipboard blocked
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <p className="font-mono-tech text-[11px] uppercase tracking-[0.16em] text-[#e8ad26]">
            Master Admin Control
          </p>
          <h1 className="font-display font-normal text-2xl text-[#dfe7e0]">
            Company Admin Accounts
          </h1>
          <p className="text-xs text-[#9aa5a0]">
            Change the Primary Admin login ID and password, rotate credentials, or
            provision additional company admin accounts. All changes take effect
            immediately and persist on the server.
          </p>
        </div>

        <button
          type="button"
          onClick={openCreateModal}
          className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 text-xs font-medium uppercase tracking-[0.08em] text-white bg-[#e0231c] hover:bg-[#c81e17] rounded-md transition-colors whitespace-nowrap shrink-0"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add Admin Account</span>
        </button>
      </div>

      {/* Primary Company Admin Spotlight Card */}
      {primaryAdmin && (
        <section className="rounded-xl bg-[#0a0e14] border border-[#e8ad26]/35 p-6 space-y-5">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2.5 flex-wrap">
                <span className="inline-flex items-center gap-1.5 text-[11px] font-mono-tech uppercase tracking-[0.14em] text-[#e8ad26]">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Primary Company Admin
                </span>
                <span
                  className={`text-[10px] font-mono-tech uppercase tracking-[0.1em] px-2 py-0.5 rounded border ${
                    primaryAdmin.status === 'active'
                      ? 'bg-emerald-500/12 text-emerald-300 border-emerald-500/30'
                      : 'bg-amber-500/12 text-amber-300 border-amber-500/30'
                  }`}
                >
                  {primaryAdmin.status}
                </span>
              </div>
              <h2 className="font-display font-normal text-xl text-[#dfe7e0]">
                {primaryAdmin.displayName}
              </h2>
              <p className="text-xs text-[#9aa5a0]">
                Current Login ID:{' '}
                <span className="font-mono-tech text-[#dfe7e0] bg-[#05070a] px-2 py-0.5 rounded border border-[#dfe7e0]/12">
                  {primaryAdmin.username}
                </span>
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                onClick={() => openEditModal(primaryAdmin)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-white bg-[#e0231c] hover:bg-[#c81e17] rounded-md transition-colors whitespace-nowrap"
              >
                <Pencil className="w-3.5 h-3.5" />
                <span>Change Admin ID &amp; Password</span>
              </button>
              <button
                type="button"
                onClick={() => openPasswordModal(primaryAdmin)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-[#e8ad26] bg-[#e8ad26]/10 hover:bg-[#e8ad26]/20 border border-[#e8ad26]/35 rounded-md transition-colors whitespace-nowrap"
              >
                <KeyRound className="w-3.5 h-3.5" />
                <span>Reset Password Only</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-4 border-t border-[#dfe7e0]/10 text-xs">
            <div>
              <p className="text-[#8a968f]">Password Last Rotated</p>
              <p className="font-mono-tech text-[#dfe7e0] mt-0.5">
                {formatDateTime(primaryAdmin.passwordUpdatedAt)}
              </p>
            </div>
            <div>
              <p className="text-[#8a968f]">Profile Last Updated</p>
              <p className="font-mono-tech text-[#dfe7e0] mt-0.5">
                {formatDateTime(primaryAdmin.updatedAt)}
              </p>
            </div>
            <div>
              <p className="text-[#8a968f]">Last Modified By</p>
              <p className="font-mono-tech text-[#dfe7e0] mt-0.5">
                {primaryAdmin.updatedBy}
              </p>
            </div>
          </div>
        </section>
      )}

      {/* All Company Admin Accounts Table */}
      <section className="rounded-xl bg-[#0a0e14] border border-[#dfe7e0]/12 overflow-hidden">
        <div className="px-5 py-4 border-b border-[#dfe7e0]/10 flex items-center justify-between">
          <h3 className="text-sm font-medium text-[#dfe7e0]">
            Managed Admin Accounts ({admins.length})
          </h3>
          <span className="text-[11px] text-[#8a968f]">
            Updating an ID or password immediately invalidates previous sessions
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#dfe7e0]/10 text-[11px] font-mono-tech uppercase tracking-[0.1em] text-[#8a968f] bg-[#070a0f]">
                <th className="py-3 px-4 font-medium">Admin Login ID</th>
                <th className="py-3 px-4 font-medium">Display Name</th>
                <th className="py-3 px-4 font-medium">Status</th>
                <th className="py-3 px-4 font-medium">Password Updated</th>
                <th className="py-3 px-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#dfe7e0]/8 text-xs">
              {admins.map((acc) => (
                <tr key={acc.id} className="hover:bg-white/[0.02]">
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-2">
                      <span className="font-mono-tech text-[#dfe7e0]">
                        {acc.username}
                      </span>
                      {acc.isPrimaryAdmin && (
                        <span className="text-[10px] font-mono-tech uppercase px-1.5 py-0.5 rounded bg-[#e8ad26]/12 text-[#e8ad26] border border-[#e8ad26]/30">
                          Primary
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="py-3.5 px-4 text-[#c7d1ca]">{acc.displayName}</td>
                  <td className="py-3.5 px-4">
                    <span
                      className={`inline-flex items-center text-[11px] font-medium px-2 py-0.5 rounded border ${
                        acc.status === 'active'
                          ? 'bg-emerald-500/12 text-emerald-300 border-emerald-500/30'
                          : 'bg-amber-500/12 text-amber-300 border-amber-500/30'
                      }`}
                    >
                      {acc.status === 'active' ? 'Active' : 'Suspended'}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 font-mono-tech text-[#8a968f]">
                    {formatDateTime(acc.passwordUpdatedAt)}
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        type="button"
                        onClick={() => openEditModal(acc)}
                        title="Edit Admin ID, Name, or Password"
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded border border-[#dfe7e0]/15 text-[#dfe7e0] hover:border-[#e8ad26]/50 hover:text-[#e8ad26] transition-colors whitespace-nowrap"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                        <span>Edit ID</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => openPasswordModal(acc)}
                        title="Change Password"
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded border border-[#e8ad26]/30 text-[#e8ad26] hover:bg-[#e8ad26]/10 transition-colors whitespace-nowrap"
                      >
                        <KeyRound className="w-3.5 h-3.5" />
                        <span>Password</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleToggleStatus(acc)}
                        title={
                          acc.status === 'active'
                            ? 'Suspend admin account'
                            : 'Activate admin account'
                        }
                        className="w-8 h-8 rounded border border-[#dfe7e0]/15 flex items-center justify-center text-[#9aa5a0] hover:text-[#dfe7e0] transition-colors"
                      >
                        {acc.status === 'active' ? (
                          <UserX className="w-3.5 h-3.5" />
                        ) : (
                          <UserCheck className="w-3.5 h-3.5" />
                        )}
                      </button>
                      {!acc.isPrimaryAdmin && (
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(acc)}
                          title="Delete admin account"
                          className="w-8 h-8 rounded border border-[#e0231c]/30 flex items-center justify-center text-[#ff6b66] hover:bg-[#e0231c]/15 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* ================================================================= */}
      {/* Create Admin Account Modal                                        */}
      {/* ================================================================= */}
      <AnimatePresence>
        {createOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-[#020305]/80 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setCreateOpen(false)}
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
                    Add Company Admin Account
                  </h2>
                  <p className="text-xs text-[#8a968f]">
                    New admin will be able to sign in at /admin and manage employees.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setCreateOpen(false)}
                  aria-label="Close modal"
                  className="w-8 h-8 rounded-md border border-[#dfe7e0]/15 flex items-center justify-center text-[#9aa5a0] hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleCreateAdmin} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-[#b4bfb7]">
                    Display Name
                  </label>
                  <input
                    type="text"
                    required
                    value={cDisplayName}
                    onChange={(e) => setCDisplayName(e.target.value)}
                    placeholder="e.g. Operations Admin"
                    className="w-full px-3 py-2 text-xs bg-[#05070a] border border-[#dfe7e0]/15 rounded-md text-[#dfe7e0] focus:outline-none focus:border-[#e0231c]"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-[#b4bfb7]">
                    Admin Login ID / Username
                  </label>
                  <input
                    type="text"
                    required
                    value={cUsername}
                    onChange={(e) => setCUsername(e.target.value)}
                    placeholder="e.g. ops.admin@agl.com"
                    className="w-full px-3 py-2 text-xs font-mono-tech bg-[#05070a] border border-[#dfe7e0]/15 rounded-md text-[#dfe7e0] focus:outline-none focus:border-[#e0231c]"
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-medium text-[#b4bfb7]">
                      Initial Password
                    </label>
                    <button
                      type="button"
                      onClick={() => setCPassword(generateStrongPassword(12))}
                      className="inline-flex items-center gap-1 text-[11px] text-[#e8ad26] hover:underline"
                    >
                      <RefreshCw className="w-3 h-3" />
                      Generate
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      type={cShowPassword ? 'text' : 'password'}
                      required
                      minLength={6}
                      value={cPassword}
                      onChange={(e) => setCPassword(e.target.value)}
                      className="w-full pl-3 pr-10 py-2 text-xs font-mono-tech bg-[#05070a] border border-[#dfe7e0]/15 rounded-md text-[#dfe7e0] focus:outline-none focus:border-[#e0231c]"
                    />
                    <button
                      type="button"
                      onClick={() => setCShowPassword((v) => !v)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-[#8a968f] hover:text-white"
                    >
                      {cShowPassword ? (
                        <EyeOff className="w-3.5 h-3.5" />
                      ) : (
                        <Eye className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                </div>

                {cError && (
                  <p className="text-xs text-[#ff6b66] bg-[#e0231c]/12 border border-[#e0231c]/35 rounded-md px-3 py-2">
                    {cError}
                  </p>
                )}

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setCreateOpen(false)}
                    className="px-4 py-2 text-xs text-[#b4bfb7] border border-[#dfe7e0]/15 rounded-md hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={cSubmitting}
                    className="px-4 py-2 text-xs font-medium text-white bg-[#e0231c] hover:bg-[#c81e17] disabled:opacity-60 rounded-md"
                  >
                    {cSubmitting ? 'Creating...' : 'Create Admin'}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ================================================================= */}
      {/* Edit Admin ID, Name, Status & Optional New Password Modal         */}
      {/* ================================================================= */}
      <AnimatePresence>
        {editingAdmin && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-[#020305]/80 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setEditingAdmin(null)}
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
                    Edit Admin Credentials
                  </h2>
                  <p className="text-xs text-[#8a968f]">
                    Update login ID, display name, status, or set a new password.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setEditingAdmin(null)}
                  aria-label="Close modal"
                  className="w-8 h-8 rounded-md border border-[#dfe7e0]/15 flex items-center justify-center text-[#9aa5a0] hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSaveEdit} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-[#b4bfb7]">
                    Admin Login ID / Username
                  </label>
                  <input
                    type="text"
                    required
                    value={eUsername}
                    onChange={(e) => setEUsername(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-mono-tech bg-[#05070a] border border-[#dfe7e0]/15 rounded-md text-[#dfe7e0] focus:outline-none focus:border-[#e0231c]"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-[#b4bfb7]">
                    Display Name
                  </label>
                  <input
                    type="text"
                    required
                    value={eDisplayName}
                    onChange={(e) => setEDisplayName(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-[#05070a] border border-[#dfe7e0]/15 rounded-md text-[#dfe7e0] focus:outline-none focus:border-[#e0231c]"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-[#b4bfb7]">Status</label>
                  <select
                    value={eStatus}
                    onChange={(e) =>
                      setEStatus(e.target.value as 'active' | 'suspended')
                    }
                    className="w-full px-3 py-2 text-xs bg-[#05070a] border border-[#dfe7e0]/15 rounded-md text-[#dfe7e0] focus:outline-none focus:border-[#e0231c]"
                  >
                    <option value="active">Active</option>
                    <option value="suspended">Suspended</option>
                  </select>
                </div>

                <div className="pt-3 border-t border-[#dfe7e0]/10 space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-medium text-[#e8ad26]">
                      New Password (optional — leave blank to keep current)
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        const pw = generateStrongPassword(12);
                        setENewPassword(pw);
                        setEConfirmPassword(pw);
                      }}
                      className="inline-flex items-center gap-1 text-[11px] text-[#e8ad26] hover:underline"
                    >
                      <RefreshCw className="w-3 h-3" />
                      Generate
                    </button>
                  </div>

                  <div className="relative">
                    <input
                      type={eShowPassword ? 'text' : 'password'}
                      value={eNewPassword}
                      onChange={(e) => setENewPassword(e.target.value)}
                      placeholder="Enter new password to rotate"
                      className="w-full pl-3 pr-10 py-2 text-xs font-mono-tech bg-[#05070a] border border-[#dfe7e0]/15 rounded-md text-[#dfe7e0] placeholder:text-[#66726c] focus:outline-none focus:border-[#e0231c]"
                    />
                    <button
                      type="button"
                      onClick={() => setEShowPassword((v) => !v)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-[#8a968f] hover:text-white"
                    >
                      {eShowPassword ? (
                        <EyeOff className="w-3.5 h-3.5" />
                      ) : (
                        <Eye className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>

                  {eNewPassword && (
                    <input
                      type={eShowPassword ? 'text' : 'password'}
                      value={eConfirmPassword}
                      onChange={(e) => setEConfirmPassword(e.target.value)}
                      placeholder="Confirm new password"
                      className="w-full px-3 py-2 text-xs font-mono-tech bg-[#05070a] border border-[#dfe7e0]/15 rounded-md text-[#dfe7e0] placeholder:text-[#66726c] focus:outline-none focus:border-[#e0231c]"
                    />
                  )}
                </div>

                {eError && (
                  <p className="text-xs text-[#ff6b66] bg-[#e0231c]/12 border border-[#e0231c]/35 rounded-md px-3 py-2">
                    {eError}
                  </p>
                )}

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setEditingAdmin(null)}
                    className="px-4 py-2 text-xs text-[#b4bfb7] border border-[#dfe7e0]/15 rounded-md hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={eSubmitting}
                    className="px-4 py-2 text-xs font-medium text-white bg-[#e0231c] hover:bg-[#c81e17] disabled:opacity-60 rounded-md"
                  >
                    {eSubmitting ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ================================================================= */}
      {/* Dedicated Change Admin Password Modal                             */}
      {/* ================================================================= */}
      <AnimatePresence>
        {pwTarget && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-[#020305]/80 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setPwTarget(null)}
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
                    Reset Admin Password
                  </h2>
                  <p className="text-xs text-[#8a968f]">
                    Account:{' '}
                    <span className="font-mono-tech text-[#e8ad26]">
                      {pwTarget.username}
                    </span>
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setPwTarget(null)}
                  aria-label="Close modal"
                  className="w-8 h-8 rounded-md border border-[#dfe7e0]/15 flex items-center justify-center text-[#9aa5a0] hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSavePassword} className="space-y-4">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-medium text-[#b4bfb7]">
                      New Password
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        const pw = generateStrongPassword(12);
                        setPwValue(pw);
                        setPwConfirm(pw);
                      }}
                      className="inline-flex items-center gap-1 text-[11px] text-[#e8ad26] hover:underline"
                    >
                      <RefreshCw className="w-3 h-3" />
                      Generate Strong
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      type={pwShow ? 'text' : 'password'}
                      required
                      minLength={6}
                      value={pwValue}
                      onChange={(e) => setPwValue(e.target.value)}
                      placeholder="Minimum 6 characters"
                      className="w-full pl-3 pr-10 py-2 text-xs font-mono-tech bg-[#05070a] border border-[#dfe7e0]/15 rounded-md text-[#dfe7e0] focus:outline-none focus:border-[#e0231c]"
                    />
                    <button
                      type="button"
                      onClick={() => setPwShow((v) => !v)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-[#8a968f] hover:text-white"
                    >
                      {pwShow ? (
                        <EyeOff className="w-3.5 h-3.5" />
                      ) : (
                        <Eye className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-[#b4bfb7]">
                    Confirm New Password
                  </label>
                  <input
                    type={pwShow ? 'text' : 'password'}
                    required
                    minLength={6}
                    value={pwConfirm}
                    onChange={(e) => setPwConfirm(e.target.value)}
                    placeholder="Re-enter password"
                    className="w-full px-3 py-2 text-xs font-mono-tech bg-[#05070a] border border-[#dfe7e0]/15 rounded-md text-[#dfe7e0] focus:outline-none focus:border-[#e0231c]"
                  />
                </div>

                {pwError && (
                  <p className="text-xs text-[#ff6b66] bg-[#e0231c]/12 border border-[#e0231c]/35 rounded-md px-3 py-2">
                    {pwError}
                  </p>
                )}

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setPwTarget(null)}
                    className="px-4 py-2 text-xs text-[#b4bfb7] border border-[#dfe7e0]/15 rounded-md hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={pwSubmitting}
                    className="px-4 py-2 text-xs font-medium text-white bg-[#e0231c] hover:bg-[#c81e17] disabled:opacity-60 rounded-md"
                  >
                    {pwSubmitting ? 'Updating...' : 'Update Password'}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ================================================================= */}
      {/* Delete Additional Admin Confirmation Modal                        */}
      {/* ================================================================= */}
      <AnimatePresence>
        {deleteTarget && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-[#020305]/80 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setDeleteTarget(null)}
          >
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 12 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm rounded-xl bg-[#0a0e14] border border-[#e0231c]/40 p-6 space-y-4 shadow-2xl"
            >
              <h2 className="font-display font-normal text-lg text-[#dfe7e0]">
                Remove Admin Account?
              </h2>
              <p className="text-xs text-[#9aa5a0] leading-relaxed">
                This will permanently revoke admin portal access for{' '}
                <span className="font-mono-tech text-[#dfe7e0]">
                  {deleteTarget.username}
                </span>{' '}
                ({deleteTarget.displayName}).
              </p>
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setDeleteTarget(null)}
                  className="px-4 py-2 text-xs text-[#b4bfb7] border border-[#dfe7e0]/15 rounded-md hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={deleteSubmitting}
                  onClick={handleConfirmDelete}
                  className="px-4 py-2 text-xs font-medium text-white bg-[#e0231c] hover:bg-[#c81e17] disabled:opacity-60 rounded-md"
                >
                  {deleteSubmitting ? 'Deleting...' : 'Delete Admin'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ================================================================= */}
      {/* One-Time Updated Admin Credential Receipt                         */}
      {/* ================================================================= */}
      <AnimatePresence>
        {receipt && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-[#020305]/80 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setReceipt(null)}
          >
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 12 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md rounded-xl bg-[#0a0e14] border border-emerald-500/35 p-6 space-y-5 shadow-2xl"
            >
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <h2 className="font-display font-normal text-lg text-[#dfe7e0]">
                    {receipt.heading}
                  </h2>
                  <p className="text-xs text-[#9aa5a0]">
                    Copy and securely share these credentials now. Passwords are stored
                    hashed and cannot be viewed again.
                  </p>
                </div>
              </div>

              <div className="rounded-lg bg-[#05070a] border border-[#dfe7e0]/12 p-4 space-y-2.5 text-xs">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[#8a968f]">Account</span>
                  <span className="text-[#dfe7e0] font-medium">
                    {receipt.displayName}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[#8a968f]">Admin Login ID</span>
                  <span className="font-mono-tech text-[#e8ad26]">
                    {receipt.username}
                  </span>
                </div>
                {receipt.password && (
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[#8a968f]">Password</span>
                    <span className="font-mono-tech text-emerald-300">
                      {receipt.password}
                    </span>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={handleCopyReceipt}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-[#dfe7e0] bg-[#05070a] border border-[#dfe7e0]/20 hover:border-[#e8ad26]/50 rounded-md"
                >
                  {copiedReceipt ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
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
                  onClick={() => setReceipt(null)}
                  className="px-4 py-2 text-xs font-medium text-white bg-[#e0231c] hover:bg-[#c81e17] rounded-md"
                >
                  Done
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
