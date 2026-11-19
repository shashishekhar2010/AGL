import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowUpRight, Mail, X } from 'lucide-react';
import {
  COMPANY_LOGO_URL,
  INDUSTRY_SECTORS,
  SUPPORT_EMAIL,
} from '../data/alorixContent';

interface FooterProps {
  onNavigate: (sectionId: string) => void;
  onSelectCategoryEnquiry: (categoryTitle: string) => void;
}

const FOOTER_PRODUCT_FAMILIES = [
  'Coal-Based Activated Carbon',
  'Coconut Shell Activated Carbon',
  'GAC 1240 (Norit Grade)',
  'Anthracite Coal Filter Media',
  'Manganese Dioxide (MnO2) Media',
  '4A Molecular Sieve Beads',
  'Red Oxide (~99.9% Purity)',
  'Membrane Dow Hydronautics',
  'Pipe Earthing System',
  'Luxurious Flower Pots',
];

export default function Footer({
  onNavigate,
  onSelectCategoryEnquiry,
}: FooterProps) {
  const [legalModal, setLegalModal] = useState<'privacy' | 'terms' | null>(null);
  const currentYear = new Date().getFullYear();

  useEffect(() => {
    if (!legalModal) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setLegalModal(null);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [legalModal]);

  return (
    <footer className="relative border-t border-[#dfe7e0]/12 bg-[#040508]/95 overflow-hidden">
      <motion.div
        aria-hidden="true"
        animate={{ opacity: [0.35, 0.55, 0.35] }}
        transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
        className="pointer-events-none absolute inset-x-0 top-0 h-44 bg-gradient-to-b from-[#e0231c]/8 via-[#e8ad26]/5 to-transparent"
      />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 py-16 space-y-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-10">
          <div className="lg:col-span-4 space-y-4">
            <div className="inline-flex bg-[#FAFBFD] rounded-lg px-3 py-2 border border-[#dfe7e0]/20">
              <img
                src={COMPANY_LOGO_URL}
                alt="Alorix Global International official logo"
                referrerPolicy="no-referrer"
                className="h-11 w-auto object-contain"
              />
            </div>
            <p className="text-sm text-[#b4bfb7] leading-relaxed max-w-sm">
              Alorix Global International connects municipal and industrial buyers
              with activated carbon, filtration media, specialty chemicals, RO
              membranes, and earthing systems through structured international trade.
            </p>
          </div>

          <div className="lg:col-span-2 space-y-3">
            <h3 className="font-display font-normal text-sm tracking-[0.06em] uppercase text-[#dfe7e0]">
              Navigation
            </h3>
            <ul className="space-y-2 text-sm text-[#9aa5a0]">
              {[
                { id: 'home', label: 'Home' },
                { id: 'about', label: 'About Us' },
                { id: 'products', label: 'Products' },
                { id: 'industries', label: 'Industries' },
                { id: 'global-reach', label: 'Global Reach' },
                { id: 'workflow', label: 'Supply Execution' },
                { id: 'contact', label: 'Enquiry Desk' },
              ].map((item) => {
                const href =
                  item.id === 'about'
                    ? '/about'
                    : item.id === 'home'
                      ? '/'
                      : `/#${item.id}`;
                return (
                  <li key={item.id}>
                    <a
                      href={href}
                      onClick={(e) => {
                        e.preventDefault();
                        onNavigate(item.id);
                      }}
                      className="hover:text-[#e8ad26] transition-colors"
                    >
                      {item.label}
                    </a>
                  </li>
                );
              })}
            </ul>
          </div>

          <div className="lg:col-span-3 space-y-3">
            <h3 className="font-display font-normal text-sm tracking-[0.06em] uppercase text-[#dfe7e0]">
              Featured Products
            </h3>
            <ul className="space-y-1.5 text-xs sm:text-sm text-[#9aa5a0]">
              {FOOTER_PRODUCT_FAMILIES.map((prod) => (
                <li key={prod}>
                  <button
                    type="button"
                    onClick={() => onSelectCategoryEnquiry(prod)}
                    className="text-left hover:text-[#e0231c] transition-colors"
                  >
                    {prod}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <div className="lg:col-span-3 space-y-6">
            <div className="space-y-3">
              <h3 className="font-display font-normal text-sm tracking-[0.06em] uppercase text-[#dfe7e0]">
                Industries
              </h3>
              <p className="text-xs text-[#9aa5a0] leading-relaxed">
                {INDUSTRY_SECTORS.map((s) => s.title).join(' · ')}
              </p>
            </div>

            <div className="space-y-3 text-xs text-[#9aa5a0]">
              <h3 className="font-display font-normal text-sm tracking-[0.06em] uppercase text-[#dfe7e0]">
                Business Enquiries
              </h3>
              <p className="leading-relaxed">
                Reach our commercial &amp; technical support desk directly or
                submit product specifications and quote requests online.
              </p>
              <a
                href={`mailto:${SUPPORT_EMAIL}`}
                className="inline-flex items-center gap-2 text-xs font-mono-tech text-[#dfe7e0] hover:text-[#e8ad26] transition-colors break-all"
              >
                <Mail className="w-3.5 h-3.5 text-[#e8ad26] shrink-0" />
                <span>{SUPPORT_EMAIL}</span>
              </a>
              <button
                type="button"
                onClick={() => onNavigate('contact')}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-[#e8ad26] hover:text-[#dfe7e0] transition-colors"
              >
                <span>Open Business Enquiry Desk</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        <div className="pt-8 border-t border-[#dfe7e0]/12 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#8a968f]">
          <p>
            &copy; {currentYear} Alorix Global International. All rights reserved.
          </p>
          <div className="flex items-center gap-6">
            <button
              type="button"
              onClick={() => setLegalModal('privacy')}
              className="hover:text-[#dfe7e0] transition-colors"
            >
              Privacy Policy
            </button>
            <button
              type="button"
              onClick={() => setLegalModal('terms')}
              className="hover:text-[#dfe7e0] transition-colors"
            >
              Terms and Conditions
            </button>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {legalModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-[#020305]/90 flex items-center justify-center p-4"
            role="dialog"
            aria-modal="true"
            onClick={() => setLegalModal(null)}
          >
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 12 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-lg rounded-xl surface-glass p-6 sm:p-8 space-y-4"
            >
              <div className="flex items-center justify-between">
                <h3 className="font-display font-normal text-xl text-[#dfe7e0]">
                  {legalModal === 'privacy'
                    ? 'Privacy Policy (Placeholder)'
                    : 'Terms and Conditions (Placeholder)'}
                </h3>
                <button
                  type="button"
                  onClick={() => setLegalModal(null)}
                  aria-label="Close legal notice"
                  className="w-9 h-9 rounded-md border border-[#dfe7e0]/15 flex items-center justify-center text-[#b4bfb7] hover:text-[#dfe7e0]"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <p className="text-sm text-[#b4bfb7] leading-relaxed">
                {legalModal === 'privacy'
                  ? 'Business enquiry details submitted on this website are used solely to respond to commercial chemical, filtration media, and industrial sourcing requests.'
                  : 'All product specifications, mesh gradations, and trade terms presented on this site are subject to formal commercial quotation and batch COA verification.'}
              </p>
              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={() => setLegalModal(null)}
                  className="px-4 py-2 text-xs font-medium uppercase tracking-[0.08em] text-white bg-[#e0231c] rounded-md"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </footer>
  );
}
