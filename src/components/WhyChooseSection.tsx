import { motion } from 'motion/react';
import { PORTFOLIO_IMAGES, WHY_CHOOSE_ITEMS } from '../data/alorixContent';
import {
  handleSpotlightLeave,
  handleSpotlightMove,
} from '../utils/spotlightSurface';
import { handleTiltLeave, handleTiltMove } from '../utils/tiltSurface';
import SectionParallaxBackdrop from './SectionParallaxBackdrop';

function KineticEmblem({ idx }: { idx: number }) {
  return (
    <div className="relative w-12 h-12 rounded-lg bg-[#05070a] border border-[#dfe7e0]/12 flex items-center justify-center shrink-0 overflow-hidden">
      <motion.svg
        viewBox="0 0 40 40"
        className="w-8 h-8"
        animate={{ rotate: idx % 2 === 0 ? 360 : -360 }}
        transition={{ duration: 24 + idx * 4, repeat: Infinity, ease: 'linear' }}
        aria-hidden="true"
      >
        <circle
          cx="20"
          cy="20"
          r="14"
          fill="none"
          stroke="#dfe7e0"
          strokeOpacity="0.35"
          strokeWidth="1.2"
          strokeDasharray="6 4"
        />
        <polygon
          points="20,7 31,26 9,26"
          fill="none"
          stroke={idx % 2 === 0 ? '#e0231c' : '#e8ad26'}
          strokeWidth="1.4"
        />
      </motion.svg>
    </div>
  );
}

export default function WhyChooseSection() {
  return (
    <section
      id="why-alorix"
      className="relative overflow-hidden py-24 sm:py-32 px-4 sm:px-6 lg:px-10 border-t border-[#dfe7e0]/12"
    >
      <SectionParallaxBackdrop
        imageSrc={PORTFOLIO_IMAGES.aboutLab}
        alt="Precision analytical chemistry instrumentation backdrop"
        accent="vermilion"
        opacityClass="opacity-[0.22]"
      />

      <div className="relative z-10 max-w-7xl mx-auto space-y-12">
        <div className="space-y-3 max-w-2xl gs-reveal">
          <p className="text-[11px] font-medium tracking-[0.22em] uppercase text-[#e0231c]">
            Why Choose Alorix
          </p>
          <h2
            className="font-display font-normal uppercase tracking-[-0.012em] text-[#dfe7e0] text-balance leading-[1.08]"
            style={{ fontSize: 'clamp(1.85rem, 3.2vw, 2.85rem)' }}
          >
            Designed for Commercial Precision and Long-Term Supply Confidence.
          </h2>
          <div
            data-rule-draw="true"
            className="h-[1px] w-24 bg-[#e0231c]/75 origin-left"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {WHY_CHOOSE_ITEMS.map((item, idx) => (
            <div
              key={item.id}
              onPointerMove={(e) => {
                handleSpotlightMove(e);
                handleTiltMove(e, 1.5);
              }}
              onPointerLeave={(e) => {
                handleSpotlightLeave(e);
                handleTiltLeave(e);
              }}
              className="spotlight-card tilt-surface gs-reveal rounded-xl surface-panel p-7 flex items-start gap-5 hover:border-[#e8ad26]/50 transition-colors duration-300"
            >
              <KineticEmblem idx={idx} />
              <div className="space-y-2">
                <h3 className="font-display font-normal text-lg sm:text-xl text-[#dfe7e0]">
                  {item.title}
                </h3>
                <p className="text-sm text-[#b4bfb7] leading-relaxed">
                  {item.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
