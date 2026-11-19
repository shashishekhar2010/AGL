import { useState } from 'react';
import { ArrowRight, Check } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import {
  PORTFOLIO_IMAGES,
  SOURCING_WORKFLOW_STEPS,
} from '../data/alorixContent';
import {
  handleSpotlightLeave,
  handleSpotlightMove,
} from '../utils/spotlightSurface';
import { handleTiltLeave, handleTiltMove } from '../utils/tiltSurface';
import MagneticButton from './MagneticButton';
import SectionParallaxBackdrop from './SectionParallaxBackdrop';

interface SourcingWorkflowSectionProps {
  onEnquireWorkflow: (stageTitle: string) => void;
}

export default function SourcingWorkflowSection({
  onEnquireWorkflow,
}: SourcingWorkflowSectionProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const activeStep = SOURCING_WORKFLOW_STEPS[activeIndex] || SOURCING_WORKFLOW_STEPS[0];

  return (
    <section
      id="workflow"
      className="relative overflow-hidden py-24 sm:py-32 px-4 sm:px-6 lg:px-10 border-t border-[#dfe7e0]/12"
    >
      <SectionParallaxBackdrop
        imageSrc={PORTFOLIO_IMAGES.globalLogistics}
        alt="International maritime container terminal logistics backdrop"
        accent="neutral"
        opacityClass="opacity-[0.23]"
      />

      <div className="relative z-10 max-w-7xl mx-auto space-y-12">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 gs-reveal">
          <div className="space-y-3 max-w-2xl">
            <p className="text-[11px] font-medium tracking-[0.22em] uppercase text-[#e0231c]">
              Supply Execution Workflow
            </p>
            <h2
              className="font-display font-normal uppercase tracking-[-0.012em] text-[#dfe7e0] text-balance leading-[1.08]"
              style={{ fontSize: 'clamp(1.85rem, 3.2vw, 2.85rem)' }}
            >
              FROM SPECIFICATION TO PORT DELIVERY.
            </h2>
            <div
              data-rule-draw="true"
              className="h-[1px] w-24 bg-[#e0231c]/75 origin-left"
            />
          </div>
          <p className="text-sm text-[#9aa5a0] max-w-md leading-relaxed">
            Explore how each international chemical order progresses through structured
            producer matching, verification, documentation, and transit coordination.
          </p>
        </div>

        {/* Interactive 5-Step Selector Rail */}
        <div className="gs-reveal space-y-4">
          <div className="relative hidden lg:block h-[2px] w-full bg-[#dfe7e0]/10 overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-[#e0231c] to-[#e8ad26]"
              initial={false}
              animate={{
                width: `${((activeIndex + 1) / SOURCING_WORKFLOW_STEPS.length) * 100}%`,
              }}
              transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
            />
          </div>

          <div
            role="tablist"
            aria-label="Sourcing execution stages"
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3"
          >
            {SOURCING_WORKFLOW_STEPS.map((step, idx) => {
              const isSelected = idx === activeIndex;
              return (
                <button
                  key={step.id}
                  type="button"
                  role="tab"
                  aria-selected={isSelected}
                  onClick={() => setActiveIndex(idx)}
                  className={`text-left rounded-lg border p-4 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e0231c] ${
                    isSelected
                      ? 'bg-[#0a0e14]/95 border-[#e0231c]/70 text-[#dfe7e0]'
                      : 'bg-[#070a0f]/75 border-[#dfe7e0]/12 text-[#9aa5a0] hover:border-[#dfe7e0]/30 hover:text-[#dfe7e0]'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span
                      className={`font-mono-tech text-xs ${
                        isSelected ? 'text-[#e8ad26]' : 'text-[#8a968f]'
                      }`}
                    >
                      {step.stepNumber}
                    </span>
                    <span className="text-[10px] tracking-[0.16em] uppercase text-[#8a968f] truncate">
                      {step.phase}
                    </span>
                  </div>
                  <p className="font-display font-normal text-sm leading-snug text-current">
                    {step.title}
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Active Stage Detail Card */}
        <div
          onPointerMove={(e) => {
            handleSpotlightMove(e);
            handleTiltMove(e, 1.8);
          }}
          onPointerLeave={(e) => {
            handleSpotlightLeave(e);
            handleTiltLeave(e);
          }}
          className="spotlight-card tilt-surface gs-reveal rounded-xl surface-glass p-7 sm:p-10"
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={activeStep.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
              className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center"
            >
              <div className="lg:col-span-7 space-y-5">
                <div className="flex items-center gap-3 text-xs text-[#e8ad26]">
                  <span className="font-mono-tech">Stage {activeStep.stepNumber}</span>
                  <span aria-hidden="true">·</span>
                  <span className="tracking-[0.14em] uppercase">{activeStep.phase}</span>
                </div>

                <h3 className="font-display font-normal text-2xl sm:text-3xl text-[#dfe7e0] text-balance">
                  {activeStep.title}
                </h3>

                <p className="text-sm sm:text-base text-[#b4bfb7] leading-relaxed max-w-2xl">
                  {activeStep.summary}
                </p>

                <p className="text-xs text-[#8a968f] pt-2 border-t border-[#dfe7e0]/10">
                  {activeStep.handlingNote}
                </p>
              </div>

              <div className="lg:col-span-5 rounded-lg bg-[#05070a]/80 border border-[#dfe7e0]/12 p-6 space-y-5">
                <p className="text-[11px] font-medium tracking-[0.18em] uppercase text-[#b4bfb7]">
                  Stage Deliverables &amp; Checkpoints
                </p>
                <ul className="space-y-3">
                  {activeStep.deliverables.map((item) => (
                    <li
                      key={item}
                      className="flex items-start gap-3 text-sm text-[#dfe7e0]"
                    >
                      <Check className="w-4 h-4 text-[#e0231c] shrink-0 mt-0.5" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>

                <div className="pt-2 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        setActiveIndex((prev) =>
                          prev === 0 ? SOURCING_WORKFLOW_STEPS.length - 1 : prev - 1
                        )
                      }
                      className="px-3 py-2 text-xs text-[#b4bfb7] hover:text-[#dfe7e0] border border-[#dfe7e0]/15 rounded-md transition-colors whitespace-nowrap shrink-0"
                    >
                      Previous
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setActiveIndex((prev) =>
                          prev === SOURCING_WORKFLOW_STEPS.length - 1 ? 0 : prev + 1
                        )
                      }
                      className="px-3 py-2 text-xs text-[#b4bfb7] hover:text-[#dfe7e0] border border-[#dfe7e0]/15 rounded-md transition-colors whitespace-nowrap shrink-0"
                    >
                      Next Stage
                    </button>
                  </div>

                  <MagneticButton
                    type="button"
                    onClick={() => onEnquireWorkflow(activeStep.title)}
                    className="btn-kage-sheen inline-flex items-center gap-2 px-4 py-2.5 text-xs font-medium tracking-[0.06em] uppercase text-white bg-[#e0231c] hover:bg-[#c81e17] rounded-md transition-colors whitespace-nowrap shrink-0"
                  >
                    <span>Start Requirement Review</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </MagneticButton>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}
