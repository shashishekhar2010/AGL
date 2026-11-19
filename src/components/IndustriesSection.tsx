import { useState } from 'react';
import { Factory } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { INDUSTRY_SECTORS, PORTFOLIO_IMAGES } from '../data/alorixContent';
import {
  handleSpotlightLeave,
  handleSpotlightMove,
} from '../utils/spotlightSurface';
import { handleTiltLeave, handleTiltMove } from '../utils/tiltSurface';
import MagneticButton from './MagneticButton';
import SectionParallaxBackdrop from './SectionParallaxBackdrop';

interface IndustriesSectionProps {
  onEnquireSector: (sectorTitle: string) => void;
}

export default function IndustriesSection({
  onEnquireSector,
}: IndustriesSectionProps) {
  const [activeId, setActiveId] = useState(INDUSTRY_SECTORS[0].id);
  const activeSector =
    INDUSTRY_SECTORS.find((s) => s.id === activeId) || INDUSTRY_SECTORS[0];

  return (
    <section
      id="industries"
      className="relative overflow-hidden py-24 sm:py-32 px-4 sm:px-6 lg:px-10 border-t border-[#dfe7e0]/12"
    >
      <SectionParallaxBackdrop
        imageSrc={PORTFOLIO_IMAGES.pharmaCleanroom}
        alt="Industrial chemical processing cleanroom environment"
        accent="amber"
        opacityClass="opacity-[0.23]"
      />

      <div className="relative z-10 max-w-7xl mx-auto space-y-12">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 gs-reveal">
          <div className="space-y-3 max-w-2xl">
            <p className="text-[11px] font-medium tracking-[0.22em] uppercase text-[#e8ad26]">
              Applications &amp; Industries Served
            </p>
            <h2
              className="font-display font-normal uppercase tracking-[-0.012em] text-[#dfe7e0] text-balance leading-[1.08]"
              style={{ fontSize: 'clamp(1.85rem, 3.2vw, 2.85rem)' }}
            >
              Water Treatment, Air Purification &amp; Industrial Sectors.
            </h2>
            <div
              data-rule-draw="true"
              className="h-[1px] w-24 bg-[#e8ad26]/75 origin-left"
            />
          </div>
          <p className="text-sm text-[#9aa5a0] max-w-md leading-relaxed">
            Core sectors served across drinking water plants, gas drying, gold
            recovery, steelmaking pigments, electrical grounding, and agriculture.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch gs-reveal">
          <div className="lg:col-span-5 flex flex-col justify-between gap-2">
            {INDUSTRY_SECTORS.map((sector, index) => {
              const isSelected = sector.id === activeSector.id;
              return (
                <button
                  key={sector.id}
                  type="button"
                  onClick={() => setActiveId(sector.id)}
                  className={`w-full text-left px-5 py-4 rounded-lg border transition-all duration-200 flex items-center justify-between gap-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e0231c] ${
                    isSelected
                      ? 'bg-[#0a0e14]/92 border-[#e0231c]/65 text-[#dfe7e0]'
                      : 'bg-[#070a0f]/74 border-[#dfe7e0]/10 text-[#b4bfb7] hover:border-[#dfe7e0]/28 hover:text-[#dfe7e0]'
                  }`}
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <span
                      className={`font-mono-tech text-xs shrink-0 ${
                        isSelected ? 'text-[#e0231c]' : 'text-[#8a968f]'
                      }`}
                    >
                      0{index + 1}
                    </span>
                    <span className="font-display font-normal text-base truncate">
                      {sector.title}
                    </span>
                  </div>
                  <span
                    className={`text-xs shrink-0 ${
                      isSelected ? 'text-[#e8ad26]' : 'text-[#8a968f]'
                    }`}
                  >
                    {isSelected ? 'Selected' : 'Explore'}
                  </span>
                </button>
              );
            })}
          </div>

          <div
            onPointerMove={(e) => {
              handleSpotlightMove(e);
              handleTiltMove(e, 2);
            }}
            onPointerLeave={(e) => {
              handleSpotlightLeave(e);
              handleTiltLeave(e);
            }}
            className="spotlight-card tilt-surface lg:col-span-7 flex flex-col rounded-xl surface-glass overflow-hidden"
          >
            <AnimatePresence mode="wait">
              <motion.div
                key={activeSector.id}
                initial={{ opacity: 0.45 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0.45 }}
                transition={{ duration: 0.25 }}
                className="flex flex-col h-full"
              >
                <div className="relative h-64 sm:h-80 lg:h-[360px] bg-[#05070a] overflow-hidden">
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-[#8a968f]">
                    <Factory className="w-10 h-10 text-[#e8ad26]/65 mb-2" />
                    <span className="text-sm">{activeSector.title}</span>
                  </div>
                  <div data-media-parallax="true" className="relative z-10 w-full h-full">
                    <img
                      src={activeSector.image}
                      alt={activeSector.imageAlt}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  </div>
                  <div className="pointer-events-none absolute inset-0 z-20 bg-gradient-to-t from-[#070a0f] via-[#070a0f]/30 to-transparent" />
                </div>

                <div className="p-6 sm:p-8 flex-1 flex flex-col justify-between gap-6">
                  <div className="space-y-3">
                    <p className="text-[11px] tracking-[0.18em] uppercase text-[#e8ad26]">
                      Industrial Application Focus
                    </p>
                    <h3 className="font-display font-normal text-2xl text-[#dfe7e0]">
                      {activeSector.title}
                    </h3>
                    <p className="text-sm sm:text-base text-[#b4bfb7] leading-relaxed">
                      {activeSector.summary}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-[#dfe7e0]/10">
                    <span className="text-xs text-[#8a968f]">
                      Discuss sector-specific supply requirements
                    </span>
                    <MagneticButton
                      type="button"
                      onClick={() => onEnquireSector(activeSector.title)}
                      className="px-4 py-2 text-xs font-medium tracking-[0.06em] uppercase text-white bg-[#e0231c] hover:bg-[#c81e17] rounded-md transition-colors whitespace-nowrap shrink-0"
                    >
                      Enquire for Sector
                    </MagneticButton>
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </section>
  );
}
