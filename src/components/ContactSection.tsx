import { useEffect, useState, type FormEvent } from 'react';
import {
  AlertCircle,
  Check,
  CheckCircle2,
  Copy,
  FileSpreadsheet,
  Mail,
  Send,
  ShieldCheck,
} from 'lucide-react';
import {
  CHEMICAL_CATEGORIES,
  ENQUIRY_DESK_NOTICE,
  PACKAGING_FORMATS,
  PORTFOLIO_IMAGES,
  SUPPORT_EMAIL,
  TRADE_INCOTERMS,
} from '../data/alorixContent';
import MagneticButton from './MagneticButton';
import SectionParallaxBackdrop from './SectionParallaxBackdrop';
import { resolveApiUrl } from '../utils/apiBase';

interface ContactSectionProps {
  prefilledInterest: string;
}

interface FormState {
  fullName: string;
  companyName: string;
  businessEmail: string;
  country: string;
  chemicalInterest: string;
  packagingFormat: string;
  incoterm: string;
  message: string;
}

const ENQUIRY_DRAFT_KEY = 'alorix_enquiry_draft_v1';

export default function ContactSection({
  prefilledInterest,
}: ContactSectionProps) {
  const [form, setForm] = useState<FormState>(() => {
    const fallback: FormState = {
      fullName: '',
      companyName: '',
      businessEmail: '',
      country: '',
      chemicalInterest: prefilledInterest || CHEMICAL_CATEGORIES[0].title,
      packagingFormat: PACKAGING_FORMATS[0],
      incoterm: TRADE_INCOTERMS[0],
      message: '',
    };
    if (typeof window === 'undefined') return fallback;
    try {
      const raw = window.localStorage.getItem(ENQUIRY_DRAFT_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<FormState>;
        return {
          ...fallback,
          ...parsed,
          chemicalInterest:
            prefilledInterest || parsed.chemicalInterest || fallback.chemicalInterest,
        };
      }
    } catch {
      // ignore
    }
    return fallback;
  });

  const [submitting, setSubmitting] = useState(false);
  const [copiedEmail, setCopiedEmail] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState<{
    referenceId: string;
    submittedAt: string;
    deliveryChannel: string;
  } | null>(null);

  const handleCopySupportEmail = async () => {
    try {
      await navigator.clipboard.writeText(SUPPORT_EMAIL);
      setCopiedEmail(true);
      window.setTimeout(() => setCopiedEmail(false), 2200);
    } catch {
      setCopiedEmail(false);
    }
  };

  useEffect(() => {
    try {
      window.localStorage.setItem(ENQUIRY_DRAFT_KEY, JSON.stringify(form));
    } catch {
      // ignore
    }
  }, [form]);

  useEffect(() => {
    if (prefilledInterest) {
      setForm((prev) => ({ ...prev, chemicalInterest: prefilledInterest }));
    }
  }, [prefilledInterest]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setConfirmation(null);

    if (
      !form.fullName.trim() ||
      !form.companyName.trim() ||
      !form.businessEmail.trim() ||
      !form.country.trim() ||
      !form.chemicalInterest.trim() ||
      !form.message.trim()
    ) {
      setErrorMsg('Please complete all required fields before submitting.');
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.businessEmail.trim())) {
      setErrorMsg('Please enter a valid business email address.');
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch(resolveApiUrl('/api/enquiry'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await response.json();

      if (!response.ok || !data.ok) {
        throw new Error(
          data.error ||
            'Submission failed. Please verify your details and try again.'
        );
      }

      setConfirmation({
        referenceId: data.referenceId,
        submittedAt: data.submittedAt,
        deliveryChannel: data.deliveryChannel,
      });
      try {
        window.localStorage.removeItem(ENQUIRY_DRAFT_KEY);
      } catch {
        // ignore
      }
      setForm({
        fullName: '',
        companyName: '',
        businessEmail: '',
        country: '',
        chemicalInterest: CHEMICAL_CATEGORIES[0].title,
        packagingFormat: PACKAGING_FORMATS[0],
        incoterm: TRADE_INCOTERMS[0],
        message: '',
      });
    } catch (err) {
      setErrorMsg(
        err instanceof Error
          ? err.message
          : 'Unable to reach enquiry service. Please try again later.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section
      id="contact"
      className="relative overflow-hidden py-24 sm:py-32 px-4 sm:px-6 lg:px-10 border-t border-[#dfe7e0]/12"
    >
      <SectionParallaxBackdrop
        imageSrc={PORTFOLIO_IMAGES.bgHeroSanctuary}
        alt="Industrial chemical terminal illuminated at night"
        accent="amber"
        opacityClass="opacity-[0.22]"
      />

      <div className="relative z-10 max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
        <div className="lg:col-span-5 space-y-8 gs-reveal">
          <div className="space-y-4">
            <p className="text-[11px] font-medium tracking-[0.22em] uppercase text-[#e8ad26]">
              Commercial &amp; Product Enquiry Desk
            </p>
            <h2
              className="font-display font-normal uppercase tracking-[-0.012em] text-[#dfe7e0] text-balance leading-[1.08]"
              style={{ fontSize: 'clamp(1.85rem, 3.2vw, 2.85rem)' }}
            >
              REQUEST PRODUCT QUOTES &amp; SPECIFICATIONS.
            </h2>
            <div
              data-rule-draw="true"
              className="h-[1px] w-24 bg-[#e8ad26]/75 origin-left"
            />
            <p className="text-sm sm:text-base text-[#b4bfb7] font-light leading-relaxed">
              Connect with Alorix Global International to specify activated carbon
              mesh grades, filtration media volumes, chemical purity requirements,
              or RO &amp; earthing equipment orders.
            </p>
          </div>

          <div className="rounded-xl surface-panel p-6 sm:p-7 space-y-5">
            <h3 className="font-display font-normal text-base text-[#dfe7e0]">
              {ENQUIRY_DESK_NOTICE.headline}
            </h3>

            <p className="text-sm text-[#b4bfb7] leading-relaxed">
              {ENQUIRY_DESK_NOTICE.summary}
            </p>

            <div className="rounded-lg bg-[#05070a]/75 border border-[#dfe7e0]/12 px-4 py-3.5 flex items-center justify-between gap-3">
              <a
                href={`mailto:${SUPPORT_EMAIL}`}
                className="inline-flex items-center gap-2.5 min-w-0 text-xs sm:text-sm text-[#dfe7e0] hover:text-[#e8ad26] transition-colors"
              >
                <Mail className="w-4 h-4 text-[#e8ad26] shrink-0" />
                <span className="font-mono-tech truncate">{SUPPORT_EMAIL}</span>
              </a>
              <button
                type="button"
                onClick={handleCopySupportEmail}
                aria-label="Copy official support email"
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] font-medium text-[#b4bfb7] hover:text-[#dfe7e0] bg-[#0a0e14] border border-[#dfe7e0]/14 rounded transition-colors shrink-0"
              >
                {copiedEmail ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-300">Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy</span>
                  </>
                )}
              </button>
            </div>

            <div className="space-y-3 pt-2 border-t border-[#dfe7e0]/10 text-xs text-[#9aa5a0]">
              <div className="flex items-start gap-3">
                <FileSpreadsheet className="w-4 h-4 text-[#e8ad26] mt-0.5 shrink-0" />
                <span>
                  Supports all {CHEMICAL_CATEGORIES.length} listed product lines,
                  custom mesh sizes, and multi-item sourcing briefs.
                </span>
              </div>
              <div className="flex items-start gap-3">
                <ShieldCheck className="w-4 h-4 text-[#e0231c] mt-0.5 shrink-0" />
                <span>{ENQUIRY_DESK_NOTICE.note}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-7 gs-reveal">
          <form
            onSubmit={handleSubmit}
            noValidate
            className="rounded-xl surface-glass p-6 sm:p-9 space-y-5"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div className="space-y-1.5">
                <label
                  htmlFor="enquiry-full-name"
                  className="block text-xs font-medium text-[#b4bfb7]"
                >
                  Full Name *
                </label>
                <input
                  id="enquiry-full-name"
                  type="text"
                  required
                  value={form.fullName}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, fullName: e.target.value }))
                  }
                  placeholder="Enter your full name"
                  className="w-full px-3.5 py-2.5 text-sm text-[#dfe7e0] bg-[#05070a]/85 border border-[#dfe7e0]/15 rounded-md placeholder:text-slate-500 focus:outline-none focus:border-[#e0231c]"
                />
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="enquiry-company"
                  className="block text-xs font-medium text-[#b4bfb7]"
                >
                  Company Name *
                </label>
                <input
                  id="enquiry-company"
                  type="text"
                  required
                  value={form.companyName}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      companyName: e.target.value,
                    }))
                  }
                  placeholder="Enter organization name"
                  className="w-full px-3.5 py-2.5 text-sm text-[#dfe7e0] bg-[#05070a]/85 border border-[#dfe7e0]/15 rounded-md placeholder:text-slate-500 focus:outline-none focus:border-[#e0231c]"
                />
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="enquiry-email"
                  className="block text-xs font-medium text-[#b4bfb7]"
                >
                  Your Business Email *
                </label>
                <input
                  id="enquiry-email"
                  type="email"
                  required
                  value={form.businessEmail}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      businessEmail: e.target.value,
                    }))
                  }
                  placeholder="name@company.com"
                  className="w-full px-3.5 py-2.5 text-sm text-[#dfe7e0] bg-[#05070a]/85 border border-[#dfe7e0]/15 rounded-md placeholder:text-slate-500 focus:outline-none focus:border-[#e0231c]"
                />
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="enquiry-country"
                  className="block text-xs font-medium text-[#b4bfb7]"
                >
                  Destination Country *
                </label>
                <input
                  id="enquiry-country"
                  type="text"
                  required
                  value={form.country}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, country: e.target.value }))
                  }
                  placeholder="Destination or operating country"
                  className="w-full px-3.5 py-2.5 text-sm text-[#dfe7e0] bg-[#05070a]/85 border border-[#dfe7e0]/15 rounded-md placeholder:text-slate-500 focus:outline-none focus:border-[#e0231c]"
                />
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <label
                  htmlFor="enquiry-interest"
                  className="block text-xs font-medium text-[#b4bfb7]"
                >
                  Product or Chemical Interest *
                </label>
                <input
                  id="enquiry-interest"
                  type="text"
                  required
                  list="chemical-interest-options"
                  value={form.chemicalInterest}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      chemicalInterest: e.target.value,
                    }))
                  }
                  placeholder="Select or type product line (e.g. Coconut Shell Activated Carbon, MnO2, 4A Molecular Sieve)"
                  className="w-full px-3.5 py-2.5 text-sm text-[#dfe7e0] bg-[#05070a]/85 border border-[#dfe7e0]/15 rounded-md placeholder:text-slate-500 focus:outline-none focus:border-[#e0231c]"
                />
                <datalist id="chemical-interest-options">
                  {CHEMICAL_CATEGORIES.map((c) => (
                    <option key={c.id} value={c.title} />
                  ))}
                </datalist>
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="enquiry-packaging"
                  className="block text-xs font-medium text-[#b4bfb7]"
                >
                  Preferred Packaging Format
                </label>
                <select
                  id="enquiry-packaging"
                  value={form.packagingFormat}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      packagingFormat: e.target.value,
                    }))
                  }
                  className="w-full px-3.5 py-2.5 text-sm text-[#dfe7e0] bg-[#05070a]/85 border border-[#dfe7e0]/15 rounded-md focus:outline-none focus:border-[#e0231c]"
                >
                  {PACKAGING_FORMATS.map((fmt) => (
                    <option key={fmt} value={fmt} className="bg-[#05070a]">
                      {fmt}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="enquiry-incoterm"
                  className="block text-xs font-medium text-[#b4bfb7]"
                >
                  Incoterm Preference
                </label>
                <div
                  role="group"
                  aria-label="Incoterm preference"
                  className="flex flex-wrap gap-1.5"
                >
                  {TRADE_INCOTERMS.map((term) => {
                    const active = form.incoterm === term;
                    return (
                      <button
                        key={term}
                        type="button"
                        onClick={() =>
                          setForm((prev) => ({ ...prev, incoterm: term }))
                        }
                        className={`px-2.5 py-2 text-xs font-mono-tech rounded border transition-colors whitespace-nowrap shrink-0 ${
                          active
                            ? 'bg-[#e0231c]/20 border-[#e0231c] text-[#dfe7e0]'
                            : 'bg-[#05070a]/80 border-[#dfe7e0]/15 text-[#9aa5a0] hover:border-[#dfe7e0]/35 hover:text-[#dfe7e0]'
                        }`}
                      >
                        {term}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="enquiry-message"
                className="block text-xs font-medium text-[#b4bfb7]"
              >
                Message &amp; Supply Requirements *
              </label>
              <textarea
                id="enquiry-message"
                rows={4}
                required
                value={form.message}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, message: e.target.value }))
                }
                placeholder="Outline required mesh size, iodine/purity targets, volume in MT/containers, destination port, or delivery schedule..."
                className="w-full px-3.5 py-2.5 text-sm text-[#dfe7e0] bg-[#05070a]/85 border border-[#dfe7e0]/15 rounded-md placeholder:text-slate-500 focus:outline-none focus:border-[#e0231c] resize-y"
              />
            </div>

            {errorMsg && (
              <div
                role="alert"
                className="flex items-start gap-2.5 rounded-lg bg-red-950/60 border border-[#e0231c]/45 px-4 py-3 text-xs sm:text-sm text-red-200"
              >
                <AlertCircle className="w-4 h-4 text-[#e0231c] shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            {confirmation && (
              <div
                role="status"
                className="flex items-start gap-2.5 rounded-lg bg-emerald-950/55 border border-emerald-400/35 px-4 py-3.5 text-xs sm:text-sm text-emerald-100"
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-medium">
                    Business enquiry recorded cleanly.
                  </p>
                  <p className="text-xs text-emerald-200/80 font-mono-tech">
                    Reference: {confirmation.referenceId} · Channel:{' '}
                    {confirmation.deliveryChannel}
                  </p>
                </div>
              </div>
            )}

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2">
              <p className="text-xs text-[#8a968f]">
                Validated backend submission via Express API.
              </p>
              <MagneticButton
                type="submit"
                disabled={submitting}
                className="btn-kage-sheen inline-flex items-center justify-center gap-2.5 px-6 py-3.5 text-xs sm:text-sm font-medium tracking-[0.08em] uppercase text-white bg-[#e0231c] hover:bg-[#c81e17] disabled:opacity-60 rounded-md transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e8ad26]"
              >
                <span>
                  {submitting ? 'Submitting Enquiry...' : 'SEND BUSINESS ENQUIRY'}
                </span>
                <Send className="w-4 h-4" />
              </MagneticButton>
            </div>
          </form>
        </div>
      </div>
    </section>
  );
}
