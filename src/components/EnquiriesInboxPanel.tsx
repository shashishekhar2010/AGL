import { useMemo, useState } from 'react';
import {
  Check,
  CheckCircle2,
  Clock,
  Inbox,
  MessageSquareText,
  RotateCcw,
  Search,
} from 'lucide-react';
import { formatDateTime } from '../utils/driveLinks';

export interface EnquiryRecord {
  id: string;
  submittedAt: string;
  fullName: string;
  companyName: string;
  businessEmail: string;
  phone: string;
  country: string;
  chemicalInterest: string;
  packagingFormat: string;
  incoterm: string;
  message: string;
  solved?: boolean;
  solvedAt?: string | null;
  solvedBy?: string | null;
  solvedNote?: string;
}

export default function EnquiriesInboxPanel({
  title,
  subtitle,
  enquiries,
  authFetch,
  onEnquiryUpdated,
  showToast,
}: {
  title: string;
  subtitle: string;
  enquiries: EnquiryRecord[];
  authFetch: (url: string, init?: RequestInit) => Promise<Response>;
  onEnquiryUpdated: (updated: EnquiryRecord) => void;
  showToast: (msg: string) => void;
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'solved'>(
    'all'
  );
  const [busyId, setBusyId] = useState<string | null>(null);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [noteDraft, setNoteDraft] = useState('');

  const counts = useMemo(() => {
    const solved = enquiries.filter((e) => Boolean(e.solved)).length;
    return {
      total: enquiries.length,
      solved,
      pending: enquiries.length - solved,
    };
  }, [enquiries]);

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return enquiries.filter((enq) => {
      const isSolved = Boolean(enq.solved);
      if (statusFilter === 'pending' && isSolved) return false;
      if (statusFilter === 'solved' && !isSolved) return false;
      if (!q) return true;
      return [
        enq.id,
        enq.fullName,
        enq.companyName,
        enq.businessEmail,
        enq.phone,
        enq.country,
        enq.chemicalInterest,
        enq.message,
        enq.solvedBy || '',
        enq.solvedNote || '',
      ]
        .join(' ')
        .toLowerCase()
        .includes(q);
    });
  }, [enquiries, searchQuery, statusFilter]);

  const handleToggleSolved = async (
    enq: EnquiryRecord,
    nextSolved: boolean,
    customNote?: string
  ) => {
    setBusyId(enq.id);
    try {
      const res = await authFetch(
        `/api/enquiries/${encodeURIComponent(enq.id)}/solve`,
        {
          method: 'PATCH',
          body: JSON.stringify({
            solved: nextSolved,
            ...(customNote !== undefined ? { solvedNote: customNote } : {}),
          }),
        }
      );
      const data = await res.json();
      if (!res.ok || !data.ok || !data.enquiry) {
        showToast(data.error || 'Unable to update enquiry status.');
        return;
      }
      onEnquiryUpdated(data.enquiry as EnquiryRecord);
      setEditingNoteId(null);
      setNoteDraft('');
      showToast(
        nextSolved
          ? `Enquiry ${enq.id} marked as solved and saved.`
          : `Enquiry ${enq.id} reopened as pending.`
      );
    } catch {
      showToast('Network error while saving enquiry status.');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-5">
      {/* Header + Summary Counters */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="font-display font-normal text-xl text-[#dfe7e0]">
            {title}
          </h2>
          <p className="text-xs text-[#9aa5a0] mt-0.5">{subtitle}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="px-2.5 py-1 rounded-md bg-[#0a0e14] border border-[#dfe7e0]/12 text-[#b4bfb7] font-mono-tech tabular-nums">
            Total: {counts.total}
          </span>
          <span className="px-2.5 py-1 rounded-md bg-[#e8ad26]/12 border border-[#e8ad26]/35 text-[#e8ad26] font-mono-tech tabular-nums">
            Pending: {counts.pending}
          </span>
          <span className="px-2.5 py-1 rounded-md bg-emerald-500/12 border border-emerald-500/35 text-emerald-300 font-mono-tech tabular-nums">
            Solved: {counts.solved}
          </span>
        </div>
      </div>

      {/* Filter Tabs + Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="inline-flex rounded-md bg-[#080c12] border border-[#dfe7e0]/12 p-1 self-start">
          {(
            [
              { id: 'all', label: `All (${counts.total})` },
              { id: 'pending', label: `Pending (${counts.pending})` },
              { id: 'solved', label: `Solved (${counts.solved})` },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3 py-1.5 rounded text-xs font-medium transition-colors whitespace-nowrap ${
                statusFilter === tab.id
                  ? 'bg-[#e0231c]/20 text-[#dfe7e0] border border-[#e0231c]/45'
                  : 'text-[#8a968f] hover:text-[#dfe7e0] border border-transparent'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-[#8a968f] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search company, country, product..."
            className="w-full pl-9 pr-3 py-2 text-xs bg-[#0a0e14] border border-[#dfe7e0]/15 rounded-md text-[#dfe7e0] placeholder:text-[#66726c] focus:outline-none focus:border-[#e0231c]"
          />
        </div>
      </div>

      {/* Enquiries List */}
      {filtered.length === 0 ? (
        <div className="rounded-xl bg-[#080c12] border border-[#dfe7e0]/12 p-10 text-center space-y-2">
          <Inbox className="w-6 h-6 text-[#66726c] mx-auto" />
          <p className="text-xs text-[#9aa5a0]">
            {enquiries.length === 0
              ? 'No website enquiries submitted yet.'
              : 'No enquiries match the selected filter.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((enq) => {
            const isSolved = Boolean(enq.solved);
            const isBusy = busyId === enq.id;
            const isEditingNote = editingNoteId === enq.id;

            return (
              <article
                key={enq.id}
                className={`rounded-xl border p-5 space-y-3 transition-colors ${
                  isSolved
                    ? 'bg-[#07110e] border-emerald-500/35'
                    : 'bg-[#080c12] border-[#dfe7e0]/12'
                }`}
              >
                {/* Top Row: Tick Checkbox + Metadata + Solve Action */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#dfe7e0]/10 pb-3">
                  <div className="flex items-start sm:items-center gap-3 min-w-0">
                    {/* Prominent Tick Mark Button */}
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => handleToggleSolved(enq, !isSolved)}
                      aria-label={
                        isSolved
                          ? `Mark enquiry ${enq.id} as pending`
                          : `Mark enquiry ${enq.id} as solved`
                      }
                      aria-pressed={isSolved}
                      title={
                        isSolved
                          ? 'Solved — click to reopen as pending'
                          : 'Click to tick as Solved'
                      }
                      className={`w-7 h-7 rounded-md border flex items-center justify-center shrink-0 transition-all cursor-pointer disabled:opacity-50 ${
                        isSolved
                          ? 'bg-emerald-500 border-emerald-400 text-[#04140d] shadow-[0_0_12px_rgba(16,185,129,0.35)]'
                          : 'bg-[#05070a] border-[#dfe7e0]/30 text-transparent hover:border-emerald-400 hover:text-emerald-400/70'
                      }`}
                    >
                      <Check className="w-4 h-4 stroke-[3]" />
                    </button>

                    <div className="flex flex-wrap items-center gap-2 text-xs min-w-0">
                      <span className="font-mono-tech text-[#e8ad26]">
                        {enq.id}
                      </span>
                      <span aria-hidden="true" className="text-[#8a968f]">
                        ·
                      </span>
                      <span className="font-medium text-[#dfe7e0]">
                        {enq.companyName}
                      </span>
                      <span aria-hidden="true" className="text-[#8a968f]">
                        ·
                      </span>
                      <span className="text-[#9aa5a0]">{enq.country}</span>
                      {isSolved ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-mono-tech uppercase tracking-[0.1em] px-2 py-0.5 rounded bg-emerald-500/18 text-emerald-300 border border-emerald-500/40">
                          <CheckCircle2 className="w-3 h-3" />
                          Solved
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] font-mono-tech uppercase tracking-[0.1em] px-2 py-0.5 rounded bg-[#e8ad26]/15 text-[#e8ad26] border border-[#e8ad26]/35">
                          <Clock className="w-3 h-3" />
                          Pending
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <span className="font-mono-tech tabular-nums text-[11px] text-[#8a968f]">
                      {formatDateTime(enq.submittedAt)}
                    </span>

                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => handleToggleSolved(enq, !isSolved)}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap disabled:opacity-50 ${
                        isSolved
                          ? 'bg-[#05070a] text-[#b4bfb7] hover:text-white border border-[#dfe7e0]/15'
                          : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                      }`}
                    >
                      {isSolved ? (
                        <>
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>{isBusy ? 'Saving...' : 'Reopen'}</span>
                        </>
                      ) : (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          <span>{isBusy ? 'Saving...' : 'Mark Solved'}</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Details Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div>
                    <span className="text-[#8a968f]">Contact: </span>
                    <span className="text-[#dfe7e0]">
                      {enq.fullName} ({enq.businessEmail})
                    </span>
                    {enq.phone && enq.phone !== 'Not provided' && (
                      <p className="text-[11px] font-mono-tech text-[#9aa5a0] mt-0.5">
                        {enq.phone}
                      </p>
                    )}
                  </div>
                  <div>
                    <span className="text-[#8a968f]">Interest: </span>
                    <span className="text-[#dfe7e0]">
                      {enq.chemicalInterest}
                    </span>
                  </div>
                  <div>
                    <span className="text-[#8a968f]">Terms: </span>
                    <span className="text-[#dfe7e0]">
                      {enq.packagingFormat} · {enq.incoterm}
                    </span>
                  </div>
                </div>

                {/* Message */}
                <p className="text-xs text-[#c7d1ca] bg-[#05070a] border border-[#dfe7e0]/8 rounded-md p-3 leading-relaxed">
                  {enq.message}
                </p>

                {/* Solved Metadata + Optional Resolution Note */}
                {isSolved && (
                  <div className="rounded-md bg-emerald-500/10 border border-emerald-500/25 px-3.5 py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                    <div className="space-y-0.5">
                      <p className="text-emerald-200 flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <span>
                          Solved by{' '}
                          <strong className="font-medium text-white">
                            {enq.solvedBy || 'Administrator'}
                          </strong>
                          {enq.solvedAt ? ` · ${formatDateTime(enq.solvedAt)}` : ''}
                        </span>
                      </p>
                      {enq.solvedNote && !isEditingNote && (
                        <p className="text-[11px] text-[#c7d1ca] pl-5">
                          Resolution Note: {enq.solvedNote}
                        </p>
                      )}
                    </div>

                    {!isEditingNote && (
                      <button
                        type="button"
                        onClick={() => {
                          setEditingNoteId(enq.id);
                          setNoteDraft(enq.solvedNote || '');
                        }}
                        className="inline-flex items-center gap-1 text-[11px] text-emerald-300 hover:text-white whitespace-nowrap self-start sm:self-center"
                      >
                        <MessageSquareText className="w-3.5 h-3.5" />
                        <span>
                          {enq.solvedNote ? 'Edit Note' : 'Add Resolution Note'}
                        </span>
                      </button>
                    )}
                  </div>
                )}

                {isEditingNote && (
                  <div className="flex flex-col sm:flex-row gap-2 pt-1">
                    <input
                      type="text"
                      value={noteDraft}
                      onChange={(e) => setNoteDraft(e.target.value)}
                      placeholder="e.g. Sent CIF quotation & COA via WhatsApp/email"
                      className="flex-1 px-3 py-2 text-xs bg-[#05070a] border border-[#dfe7e0]/20 rounded-md text-[#dfe7e0] placeholder:text-[#66726c] focus:outline-none focus:border-emerald-400"
                    />
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => handleToggleSolved(enq, true, noteDraft)}
                        className="px-3.5 py-2 text-xs font-medium text-white bg-emerald-600 hover:bg-emerald-500 rounded-md whitespace-nowrap"
                      >
                        Save Note
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingNoteId(null);
                          setNoteDraft('');
                        }}
                        className="px-3 py-2 text-xs text-[#9aa5a0] hover:text-white border border-[#dfe7e0]/15 rounded-md whitespace-nowrap"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
