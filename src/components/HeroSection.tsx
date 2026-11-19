import { useRef, type PointerEvent as ReactPointerEvent } from 'react';
import { ArrowRight, ArrowUpRight } from 'lucide-react';
import { motion } from 'motion/react';
import {
  COMPANY_LOGO_URL,
  HERO_CAPABILITY_STRIP,
  PORTFOLIO_IMAGES,
} from '../data/alorixContent';
import {
  handleSpotlightLeave,
  handleSpotlightMove,
} from '../utils/spotlightSurface';
import { handleTiltLeave, handleTiltMove } from '../utils/tiltSurface';
import MagneticButton from './MagneticButton';
import SectionParallaxBackdrop from './SectionParallaxBackdrop';

interface HeroSectionProps {
  onExploreSolutions: () => void;
  onContactTeam: () => void;
  onScrollDown: () => void;
  onNavigateSection: (sectionId: string) => void;
}

export default function HeroSection({
  onExploreSolutions,
  onContactTeam,
  onScrollDown,
  onNavigateSection,
}: HeroSectionProps) {
  const glowRef = useRef<HTMLDivElement | null>(null);

  const handleHeroMove = (e: ReactPointerEvent<HTMLElement>) => {
    if (e.pointerType !== 'mouse' || !glowRef.current) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    glowRef.current.style.opacity = '1';
    glowRef.current.style.background = `radial-gradient(620px circle at ${x}px ${y}px, rgba(232, 173, 38, 0.12), rgba(224, 35, 28, 0.06) 40%, transparent 72%)`;
  };

  const handleHeroLeave = () => {
    if (glowRef.current) {
      glowRef.current.style.opacity = '0';
    }
  };

  return (
    <section
      id="home"
      onPointerMove={handleHeroMove}
      onPointerLeave={handleHeroLeave}
      className="relative overflow-hidden min-h-[100svh] flex flex-col justify-between pt-28 sm:pt-32 pb-10 px-4 sm:px-6 lg:px-10"
    >
      <SectionParallaxBackdrop
        imageSrc={PORTFOLIO_IMAGES.bgHeroSanctuary}
        alt="Nocturnal chemical synthesis towers and architectural lighting"
        accent="vermilion"
        opacityClass="opacity-[0.34]"
      />

      {/* Mouse-interactive volumetric aura */}
      <div
        ref={glowRef}
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-[1] opacity-0 transition-opacity duration-500"
      />

      <div
        data-hero-parallax="true"
        className="relative z-10 max-w-7xl mx-auto w-full my-auto space-y-8"
      >
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.75, ease: [0.16, 1, 0.3, 1] }}
          onPointerMove={(e) => handleTiltMove(e, 4)}
          onPointerLeave={handleTiltLeave}
          className="tilt-surface inline-flex items-center bg-[#FAFBFD] rounded-lg px-4 py-2.5 border border-[#dfe7e0]/25 shadow-[0_18px_48px_rgba(0,0,0,0.65)]"
        >
          <img
            src={COMPANY_LOGO_URL}
            alt="Alorix Global International official brand emblem"
            referrerPolicy="no-referrer"
            className="h-12 sm:h-14 w-auto object-contain"
          />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.08, ease: [0.16, 1, 0.3, 1] }}
          className="max-w-3xl space-y-5"
        >
          <div className="flex items-center gap-3 text-[11px] font-medium tracking-[0.22em] uppercase text-[#b4bfb7]">
            <span
              aria-hidden="true"
              className="inline-block w-2 h-2 rotate-45 bg-[#e0231c]"
            />
            <span>Alorix Global International · Chemical Trading &amp; Supply</span>
          </div>

          <h1
            className="font-display font-normal uppercase tracking-[-0.012em] text-[#dfe7e0] text-balance leading-[1.055]"
            style={{
              fontSize: 'clamp(2.25rem, 4.1vw, 3.75rem)',
              textShadow: '0 2px 34px rgba(3, 6, 8, 0.78)',
            }}
          >
            <span className="block overflow-hidden">
              <motion.span
                initial={{ y: '105%' }}
                animate={{ y: '0%' }}
                transition={{ duration: 0.85, delay: 0.14, ease: [0.16, 1, 0.3, 1] }}
                className="block"
              >
                POWERING INDUSTRIES.
              </motion.span>
            </span>
            <span className="block overflow-hidden">
              <motion.span
                initial={{ y: '105%' }}
                animate={{ y: '0%' }}
                transition={{ duration: 0.9, delay: 0.24, ease: [0.16, 1, 0.3, 1] }}
                className="block text-[#e8ad26]"
              >
                CONNECTING THE WORLD.
              </motion.span>
            </span>
          </h1>

          <p
            className="text-base sm:text-lg text-[#b4bfb7] font-light max-w-xl leading-[1.72]"
            style={{ textShadow: '0 1px 22px rgba(3, 6, 8, 0.92)' }}
          >
            Your trusted partner in chemical solutions, global sourcing, and
            international supply.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.26, ease: [0.16, 1, 0.3, 1] }}
          className="flex flex-wrap items-center gap-4 pt-1"
        >
          <MagneticButton
            type="button"
            onClick={onExploreSolutions}
            className="btn-kage-sheen inline-flex items-center gap-2.5 px-6 py-3.5 text-xs sm:text-sm font-medium tracking-[0.06em] uppercase text-white bg-[#e0231c] hover:bg-[#c81e17] rounded-md transition-colors duration-200 whitespace-nowrap shrink-0 shadow-[0_14px_34px_rgba(224,35,28,0.28)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e8ad26]"
          >
            <span>Explore Our Solutions</span>
            <ArrowRight className="w-4 h-4" />
          </MagneticButton>

          <MagneticButton
            type="button"
            onClick={onContactTeam}
            className="inline-flex items-center gap-2 px-6 py-3.5 text-xs sm:text-sm font-medium tracking-[0.06em] uppercase text-[#dfe7e0] bg-[#0a0e14]/80 hover:bg-[#141b26] border border-[#dfe7e0]/22 hover:border-[#e8ad26]/65 rounded-md transition-colors duration-200 whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e0231c]"
          >
            <span>Contact Our Team</span>
          </MagneticButton>
        </motion.div>

        {/* Full-Width 4-Column Capabilities Strip */}
        <motion.div
          initial={{ opacity: 0, y: 22 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.38, ease: [0.16, 1, 0.3, 1] }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-4"
        >
          {HERO_CAPABILITY_STRIP.map((item) => (
            <button
              key={item.index}
              type="button"
              onClick={() => onNavigateSection(item.targetSection)}
              onPointerMove={handleSpotlightMove}
              onPointerLeave={handleSpotlightLeave}
              className="spotlight-card group text-left rounded-lg bg-[#070a0f]/75 hover:bg-[#0c1118]/90 border border-[#dfe7e0]/12 hover:border-[#e8ad26]/50 px-4 py-3.5 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e0231c]"
            >
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="font-mono-tech text-[11px] text-[#e0231c]">
                  {item.index}
                </span>
                <ArrowUpRight className="w-3.5 h-3.5 text-[#8a968f] group-hover:text-[#e8ad26] group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
              </div>
              <p className="font-display font-normal text-sm text-[#dfe7e0] group-hover:text-[#e8ad26] transition-colors">
                {item.title}
              </p>
              <p className="text-xs text-[#9aa5a0] leading-snug mt-1">
                {item.detail}
              </p>
            </button>
          ))}
        </motion.div>
      </div>

      <div className="relative z-10 max-w-7xl mx-auto w-full flex items-center justify-between pt-8 mt-6 border-t border-[#dfe7e0]/12">
        <span className="text-[10px] tracking-[0.26em] uppercase text-[#8a968f]">
          Chapter 01 · Global Sourcing
        </span>

        <button
          type="button"
          onClick={onScrollDown}
          aria-label="Scroll down to explore Alorix Global International"
          className="inline-flex items-center gap-3 text-[10px] tracking-[0.28em] uppercase text-[#b4bfb7] hover:text-[#dfe7e0] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e0231c] rounded py-1"
        >
          <span>Scroll</span>
          <span className="relative w-14 h-[1px] bg-[#dfe7e0]/20 overflow-hidden">
            <span className="absolute inset-0 bg-[#dfe7e0] kage-cue-bar" />
          </span>
        </button>
      </div>
    </section>
  );
}
