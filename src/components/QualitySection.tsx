import { useState } from 'react';
import { FileCheck2, Gauge } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import {
  PORTFOLIO_IMAGES,
  QUALITY_BENCHMARKS,
  QUALITY_PILLARS,
} from '../data/alorixContent';
import {
  handleSpotlightLeave,
  handleSpotlightMove,
} from '../utils/spotlightSurface';
import { handleTiltLeave, handleTiltMove } from '../utils/tiltSurface';
import SectionParallaxBackdrop from './SectionParallaxBackdrop';

const EXPORT_DOC_WORKFLOW = [
  {
    id: 'coa',
    label: 'Certificate of Analysis (COA)',
    stage: 'Batch Quality Review',
    summary:
      'Batch-specific analytical parameter verification—covering iodine value, mechanical hardness, ash content, sieve mesh sizing, and chemical assay—prior to dispatch.',
    note: 'Issued alongside retention sampling on activated carbon, filtration media, and mineral lots.',
  },
  {
    id: 'sds',
    label: 'Safety Data Sheet (SDS)',
    stage: 'Hazard & Handling Alignment',
    summary:
      'Standardized chemical safety, dry storage, moisture protection, and emergency handling guidance aligned to international transport and plant receiving protocols.',
    note: 'Supplied in accordance with buyer destination port and industrial plant regulations.',
  },
  {
    id: 'origin',
    label: 'Origin & Packing Records',
    stage: 'Customs & Export Readiness',
    summary:
      'Coordinated commercial invoice, packing list, container seal logs, and origin certificates structured for smooth international customs clearance.',
    note: 'Tailored per destination port customs and shipping documentation protocols.',
  },
  {
    id: 'inspection',
    label: 'Pre-Shipment Verification',
    stage: 'Loading & Container Check',
    summary:
      'Structured confirmation of moisture-barrier woven bags, airtight steel drums, FIBC jumbo sacks, and labeling compliance prior to maritime handoff.',
    note: 'Third-party inspection and buyer sample approval available upon commercial agreement.',
  },
];

function PillarDiagram({ index }: { index: string }) {
  if (index === '01') {
    return (
      <svg viewBox="0 0 120 48" className="w-28 h-10 text-[#dfe7e0]" aria-hidden="true">
        <circle cx="20" cy="24" r="10" fill="none" stroke="currentColor" strokeOpacity="0.6" strokeWidth="1.4" />
        <circle cx="60" cy="24" r="14" fill="none" stroke="#e0231c" strokeWidth="1.5" />
        <circle cx="100" cy="24" r="10" fill="none" stroke="#e8ad26" strokeWidth="1.4" />
        <line x1="30" y1="24" x2="46" y2="24" stroke="currentColor" strokeOpacity="0.4" strokeWidth="1.2" strokeDasharray="3 2" />
        <line x1="74" y1="24" x2="90" y2="24" stroke="currentColor" strokeOpacity="0.4" strokeWidth="1.2" strokeDasharray="3 2" />
      </svg>
    );
  }
  if (index === '02') {
    return (
      <svg viewBox="0 0 120 48" className="w-28 h-10 text-[#dfe7e0]" aria-hidden="true">
        <polygon points="24,8 40,24 24,40 8,24" fill="none" stroke="currentColor" strokeOpacity="0.6" strokeWidth="1.4" />
        <polygon points="60,8 76,24 60,40 44,24" fill="none" stroke="#e8ad26" strokeWidth="1.5" />
        <polygon points="96,8 112,24 96,40 80,24" fill="none" stroke="#e0231c" strokeWidth="1.4" />
      </svg>
    );
  }
  if (index === '03') {
    return (
      <svg viewBox="0 0 120 48" className="w-28 h-10 text-[#dfe7e0]" aria-hidden="true">
        <path d="M12 34 C 34 10, 86 10, 108 34" fill="none" stroke="currentColor" strokeOpacity="0.6" strokeWidth="1.4" />
        <path d="M24 38 C 44 20, 76 20, 96 38" fill="none" stroke="#e8ad26" strokeWidth="1.4" />
        <circle cx="60" cy="18" r="4" fill="#e0231c" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 120 48" className="w-28 h-10 text-[#dfe7e0]" aria-hidden="true">
      <rect x="10" y="14" width="22" height="20" rx="3" fill="none" stroke="currentColor" strokeOpacity="0.6" strokeWidth="1.4" />
      <rect x="49" y="10" width="22" height="28" rx="3" fill="none" stroke="#e0231c" strokeWidth="1.5" />
      <rect x="88" y="14" width="22" height="20" rx="3" fill="none" stroke="#e8ad26" strokeWidth="1.4" />
      <line x1="32" y1="24" x2="49" y2="24" stroke="currentColor" strokeOpacity="0.4" strokeWidth="1.2" />
      <line x1="71" y1="24" x2="88" y2="24" stroke="currentColor" strokeOpacity="0.4" strokeWidth="1.2" />
    </svg>
  );
}

export default function QualitySection() {
  const [activeDocId, setActiveDocId] = useState(EXPORT_DOC_WORKFLOW[0].id);
  const activeDoc =
    EXPORT_DOC_WORKFLOW.find((d) => d.id === activeDocId) ||
    EXPORT_DOC_WORKFLOW[0];

  return (
    <section
      id="quality"
      className="relative overflow-hidden py-24 sm:py-32 px-4 sm:px-6 lg:px-10 border-t border-[#dfe7e0]/12"
    >
      <SectionParallaxBackdrop
        imageSrc={PORTFOLIO_IMAGES.specialtyReagents}
        alt="Precision analytical chemistry glassware and safety protocols"
        accent="amber"
        opacityClass="opacity-[0.22]"
      />

      <div className="relative z-10 max-w-7xl mx-auto space-y-12">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 gs-reveal">
          <div className="space-y-3 max-w-2xl">
            <p className="text-[11px] font-medium tracking-[0.22em] uppercase text-[#e8ad26]">
              Quality Policy &amp; Batch Verification
            </p>
            <h2
              className="font-display font-normal uppercase tracking-[-0.012em] text-[#dfe7e0] text-balance leading-[1.08]"
              style={{ fontSize: 'clamp(1.85rem, 3.2vw, 2.85rem)' }}
            >
              BUILT ON TRUST. DRIVEN BY QUALITY.
            </h2>
            <div
              data-rule-draw="true"
              className="h-[1px] w-24 bg-[#e8ad26]/75 origin-left"
            />
          </div>
          <p className="text-sm text-[#9aa5a0] max-w-md leading-relaxed">
            Strict raw material selection, batch testing, moisture-sealed export
            packaging, and full technical documentation across every lot.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {QUALITY_PILLARS.map((pillar) => (
            <div
              key={pillar.index}
              onPointerMove={(e) => {
                handleSpotlightMove(e);
                handleTiltMove(e, 1.5);
              }}
              onPointerLeave={(e) => {
                handleSpotlightLeave(e);
                handleTiltLeave(e);
              }}
              className="spotlight-card tilt-surface gs-reveal rounded-xl surface-glass p-7 sm:p-8 flex flex-col justify-between gap-6 hover:border-[#e0231c]/45 transition-colors duration-300"
            >
              <div className="flex items-start justify-between gap-4">
                <span className="font-mono-tech text-xs text-[#e0231c]">
                  {pillar.index}.
                </span>
                <PillarDiagram index={pillar.index} />
              </div>
              <div className="space-y-2.5">
                <h3 className="font-display font-normal text-xl text-[#dfe7e0]">
                  {pillar.title}
                </h3>
                <p className="text-sm sm:text-base text-[#b4bfb7] leading-relaxed">
                  {pillar.description}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Tested Material & Sieve Specification Benchmarks */}
        <div className="gs-reveal rounded-xl surface-panel p-6 sm:p-8 space-y-6">
          <div className="flex items-center gap-3 border-b border-[#dfe7e0]/10 pb-4">
            <Gauge className="w-5 h-5 text-[#e0231c] shrink-0" />
            <div>
              <h3 className="font-display font-normal text-lg text-[#dfe7e0]">
                Material &amp; Laboratory Quality Benchmarks
              </h3>
              <p className="text-xs text-[#8a968f]">
                Reference parameters verified across carbon, anthracite, oxide pigment, and charcoal supply lots.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {QUALITY_BENCHMARKS.map((item) => (
              <div
                key={item.label}
                className="rounded-lg bg-[#05070a]/80 border border-[#dfe7e0]/10 p-4 space-y-1.5"
              >
                <p className="font-mono-tech tabular-nums text-lg text-[#e8ad26]">
                  {item.metric}
                </p>
                <p className="font-display font-normal text-sm text-[#dfe7e0]">
                  {item.label}
                </p>
                <p className="text-xs text-[#9aa5a0] leading-relaxed">
                  {item.detail}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Interactive Export Documentation Previewer */}
        <div className="gs-reveal rounded-xl surface-panel p-6 sm:p-8 space-y-6">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-[#dfe7e0]/10 pb-5">
            <div className="flex items-center gap-3">
              <FileCheck2 className="w-5 h-5 text-[#e8ad26] shrink-0" />
              <div>
                <h3 className="font-display font-normal text-lg text-[#dfe7e0]">
                  Standard Export Documentation Workflow
                </h3>
                <p className="text-xs text-[#8a968f]">
                  Select a document group to review how commercial dispatch records are coordinated.
                </p>
              </div>
            </div>

            <div
              role="tablist"
              aria-label="Export documentation stages"
              className="flex flex-wrap gap-2"
            >
              {EXPORT_DOC_WORKFLOW.map((doc) => {
                const selected = doc.id === activeDoc.id;
                return (
                  <button
                    key={doc.id}
                    type="button"
                    role="tab"
                    aria-selected={selected}
                    onClick={() => setActiveDocId(doc.id)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md border transition-colors whitespace-nowrap shrink-0 ${
                      selected
                        ? 'bg-[#e0231c] border-[#e0231c] text-white'
                        : 'bg-[#05070a]/80 border-[#dfe7e0]/12 text-[#b4bfb7] hover:border-[#dfe7e0]/30 hover:text-[#dfe7e0]'
                    }`}
                  >
                    {doc.label}
                  </button>
                );
              })}
            </div>
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={activeDoc.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center"
            >
              <div className="lg:col-span-8 space-y-1.5">
                <p className="text-[11px] font-medium tracking-[0.16em] uppercase text-[#e8ad26]">
                  {activeDoc.stage}
                </p>
                <p className="text-sm sm:text-base text-[#dfe7e0] leading-relaxed">
                  {activeDoc.summary}
                </p>
              </div>
              <div className="lg:col-span-4 rounded-lg bg-[#05070a]/80 border border-[#dfe7e0]/10 px-4 py-3 text-xs text-[#9aa5a0] leading-relaxed">
                {activeDoc.note}
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}
