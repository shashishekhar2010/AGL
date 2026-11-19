import { useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  FlaskConical,
  Terminal,
  User,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import {
  COMPANY_VISION_MISSION_ITEMS,
  FOUNDER_IMAGE_URL,
  FOUNDER_PROFILE,
  PORTFOLIO_IMAGES,
  TECH_TEAM_IMAGE_URL,
  TECH_TEAM_PROFILE,
} from '../data/alorixContent';
import {
  handleSpotlightLeave,
  handleSpotlightMove,
} from '../utils/spotlightSurface';
import { handleTiltLeave, handleTiltMove } from '../utils/tiltSurface';
import MagneticButton from './MagneticButton';
import SectionParallaxBackdrop from './SectionParallaxBackdrop';

interface AboutPageProps {
  onNavigateHomeSection: (sectionId: string) => void;
}

const ABOUT_PILLARS = [
  {
    index: '01',
    title: 'Activated Carbon & Filtration Engineering',
    text: 'Supplying coal-based and coconut-shell activated carbon, GAC 1240 Norit, anthracite coal, and MnO2 media engineered for optimal bed depth and adsorption kinetics.',
  },
  {
    index: '02',
    title: 'Specialty Chemicals, RO & Infrastructure',
    text: 'Coordinating 4A molecular sieves, ~99.9% red oxide, tannic acid, carbon black, Dow/Hydronautics membranes, solar WTP skids, and low-resistance earthing kits.',
  },
  {
    index: '03',
    title: 'Multi-Origin Supply & Batch Consistency',
    text: 'Enforcing disciplined sieve grading, moisture-sealed export packaging, and pre-shipment analytical verification across international corridors.',
  },
];

export default function AboutPage({ onNavigateHomeSection }: AboutPageProps) {
  const [activeTabId, setActiveTabId] = useState(
    COMPANY_VISION_MISSION_ITEMS[0].id
  );
  const activeItem =
    COMPANY_VISION_MISSION_ITEMS.find((item) => item.id === activeTabId) ||
    COMPANY_VISION_MISSION_ITEMS[0];

  return (
    <div className="relative pt-24 sm:pt-28">
      {/* Page 2 Hero: About the Founder */}
      <section className="relative overflow-hidden py-14 sm:py-20 px-4 sm:px-6 lg:px-10">
        <SectionParallaxBackdrop
          imageSrc={PORTFOLIO_IMAGES.bgAboutGlass}
          alt="Precision borosilicate chemical laboratory glassware in obsidian atmosphere"
          accent="amber"
          opacityClass="opacity-[0.26]"
        />

        <div className="relative z-10 max-w-7xl mx-auto space-y-10">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#dfe7e0]/12 pb-5">
            <button
              type="button"
              onClick={() => onNavigateHomeSection('home')}
              className="inline-flex items-center gap-2 text-xs font-medium tracking-[0.14em] uppercase text-[#b4bfb7] hover:text-[#e8ad26] transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e0231c] rounded py-1"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Main Showcase</span>
            </button>

            <span className="font-mono-tech text-[11px] tracking-[0.18em] uppercase text-[#8a968f]">
              Alorix Global International · Leadership, Tech &amp; Company Profile
            </span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-stretch">
            {/* Founder Portrait */}
            <motion.div
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
              className="lg:col-span-5 flex items-stretch"
            >
              <div
                onPointerMove={(e) => {
                  handleSpotlightMove(e);
                  handleTiltMove(e, 2.2);
                }}
                onPointerLeave={(e) => {
                  handleSpotlightLeave(e);
                  handleTiltLeave(e);
                }}
                className="spotlight-card tilt-surface relative w-full min-h-[420px] sm:min-h-[480px] lg:h-full rounded-xl overflow-hidden surface-glass group"
              >
                <div className="absolute inset-0 bg-[#070a0f] flex flex-col items-center justify-center text-[#8a968f]">
                  <User className="w-12 h-12 text-[#e8ad26]/70 mb-2" />
                  <span className="text-sm">{FOUNDER_PROFILE.name}</span>
                </div>
                <img
                  src={FOUNDER_IMAGE_URL}
                  alt={`${FOUNDER_PROFILE.name}, ${FOUNDER_PROFILE.role} of Alorix Global International`}
                  referrerPolicy="no-referrer"
                  className="relative z-10 w-full h-full object-cover object-top transition-transform duration-700 group-hover:scale-[1.02]"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
                <div className="pointer-events-none absolute inset-x-0 bottom-0 h-36 z-20 bg-gradient-to-t from-[#05070a]/95 via-[#05070a]/55 to-transparent" />
                <div className="absolute bottom-0 inset-x-0 z-30 p-6 sm:p-7 space-y-1">
                  <p className="font-mono-tech text-[11px] tracking-[0.18em] uppercase text-[#e8ad26]">
                    {FOUNDER_PROFILE.role} · Alorix Global International
                  </p>
                  <p className="font-display font-normal text-xl sm:text-2xl text-[#dfe7e0]">
                    {FOUNDER_PROFILE.name}
                  </p>
                </div>
              </div>
            </motion.div>

            {/* Founder Bio & Vision */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.75, delay: 0.08, ease: [0.16, 1, 0.3, 1] }}
              className="lg:col-span-7 flex flex-col justify-center space-y-7"
            >
              <div className="space-y-4">
                <p className="text-[11px] font-medium tracking-[0.22em] uppercase text-[#e0231c]">
                  {FOUNDER_PROFILE.sectionLabel}
                </p>
                <div className="space-y-1.5">
                  <h1
                    className="font-display font-normal uppercase tracking-[-0.012em] text-[#dfe7e0] text-balance leading-[1.06]"
                    style={{ fontSize: 'clamp(2.1rem, 3.8vw, 3.25rem)' }}
                  >
                    {FOUNDER_PROFILE.name}
                  </h1>
                  <p className="text-sm sm:text-base font-medium tracking-[0.14em] uppercase text-[#e8ad26]">
                    {FOUNDER_PROFILE.role}
                  </p>
                </div>
                <div
                  data-rule-draw="true"
                  className="h-[1px] w-24 bg-[#e0231c]/80 origin-left"
                />
              </div>

              <div className="space-y-5 text-base sm:text-[17px] text-[#b4bfb7] font-light leading-[1.78]">
                {FOUNDER_PROFILE.paragraphs.map((paragraph, index) => (
                  <p
                    key={index}
                    className={index === 0 ? 'text-[#dfe7e0]/95 font-normal' : ''}
                  >
                    {paragraph}
                  </p>
                ))}
              </div>

              <div className="flex flex-wrap items-center gap-4 pt-2 border-t border-[#dfe7e0]/12">
                <MagneticButton
                  type="button"
                  onClick={() => onNavigateHomeSection('products')}
                  className="btn-kage-sheen inline-flex items-center gap-2.5 px-6 py-3.5 text-xs sm:text-sm font-medium tracking-[0.06em] uppercase text-white bg-[#e0231c] hover:bg-[#c81e17] rounded-md transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e8ad26]"
                >
                  <span>Explore Product Catalogue</span>
                  <ArrowRight className="w-4 h-4" />
                </MagneticButton>

                <MagneticButton
                  type="button"
                  onClick={() => onNavigateHomeSection('contact')}
                  className="inline-flex items-center gap-2 px-6 py-3.5 text-xs sm:text-sm font-medium tracking-[0.06em] uppercase text-[#dfe7e0] bg-[#0a0e14]/85 hover:bg-[#141b26] border border-[#dfe7e0]/22 hover:border-[#e8ad26]/65 rounded-md transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e0231c]"
                >
                  <span>Open Business Enquiry Desk</span>
                </MagneticButton>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Tech Team: Shashi Tech */}
      <section className="relative overflow-hidden py-20 sm:py-28 px-4 sm:px-6 lg:px-10 border-t border-[#dfe7e0]/12">
        <SectionParallaxBackdrop
          imageSrc={PORTFOLIO_IMAGES.bgGlobalMaritime}
          alt="Global digital infrastructure and connected network corridors"
          accent="vermilion"
          opacityClass="opacity-[0.2]"
        />

        <div className="relative z-10 max-w-7xl mx-auto space-y-12">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-stretch">
            {/* Tech Team Copy & Capabilities */}
            <div className="lg:col-span-7 lg:order-1 flex flex-col justify-center space-y-7 gs-reveal">
              <div className="space-y-4">
                <p className="text-[11px] font-medium tracking-[0.22em] uppercase text-[#e8ad26]">
                  {TECH_TEAM_PROFILE.sectionLabel}
                </p>
                <div className="space-y-1.5">
                  <h2
                    className="font-display font-normal uppercase tracking-[-0.012em] text-[#dfe7e0] text-balance leading-[1.06]"
                    style={{ fontSize: 'clamp(1.95rem, 3.5vw, 3rem)' }}
                  >
                    {TECH_TEAM_PROFILE.brandName}
                  </h2>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs sm:text-sm font-medium tracking-[0.12em] uppercase text-[#b4bfb7]">
                    <span className="text-[#e0231c]">{TECH_TEAM_PROFILE.tagline}</span>
                    <span aria-hidden="true" className="text-[#dfe7e0]/30">
                      ·
                    </span>
                    <span>Led by {TECH_TEAM_PROFILE.leadName}</span>
                    <span aria-hidden="true" className="text-[#dfe7e0]/30">
                      ·
                    </span>
                    <span>{TECH_TEAM_PROFILE.leadRole}</span>
                  </div>
                </div>
                <div
                  data-rule-draw="true"
                  className="h-[1px] w-24 bg-[#e8ad26]/80 origin-left"
                />
              </div>

              <div className="space-y-4 text-base text-[#b4bfb7] font-light leading-[1.76]">
                {TECH_TEAM_PROFILE.paragraphs.map((paragraph, index) => (
                  <p
                    key={index}
                    className={index === 0 ? 'text-[#dfe7e0]/95 font-normal' : ''}
                  >
                    {paragraph}
                  </p>
                ))}
              </div>

              {/* 4 Core Technical Disciplines */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-[#dfe7e0]/12">
                {TECH_TEAM_PROFILE.capabilities.map((cap) => (
                  <div
                    key={cap.index}
                    className="rounded-lg bg-[#070a0f]/75 border border-[#dfe7e0]/10 p-4 space-y-1.5"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-mono-tech text-xs text-[#e0231c]">
                        {cap.index}.
                      </span>
                      <h3 className="font-display font-normal text-sm sm:text-base text-[#dfe7e0]">
                        {cap.title}
                      </h3>
                    </div>
                    <p className="text-xs sm:text-[13px] text-[#9aa5a0] leading-relaxed">
                      {cap.description}
                    </p>
                  </div>
                ))}
              </div>

              {/* Official Shashi Tech Ecosystem Links */}
              <div className="flex flex-wrap items-center gap-3 pt-1">
                {TECH_TEAM_PROFILE.initiatives.map((item, idx) => (
                  <a
                    key={item.url}
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`inline-flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium tracking-[0.08em] uppercase rounded-md transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e8ad26] ${
                      idx === 0
                        ? 'bg-[#e0231c] hover:bg-[#c81e17] text-white'
                        : 'bg-[#0a0e14]/85 hover:bg-[#141b26] text-[#dfe7e0] border border-[#dfe7e0]/20 hover:border-[#e8ad26]/60'
                    }`}
                  >
                    <span>{item.label}</span>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </a>
                ))}
              </div>
            </div>

            {/* Shashi Tech Portrait */}
            <div className="lg:col-span-5 lg:order-2 flex items-stretch gs-reveal">
              <div
                onPointerMove={(e) => {
                  handleSpotlightMove(e);
                  handleTiltMove(e, 2.2);
                }}
                onPointerLeave={(e) => {
                  handleSpotlightLeave(e);
                  handleTiltLeave(e);
                }}
                className="spotlight-card tilt-surface relative w-full min-h-[420px] sm:min-h-[480px] lg:h-full rounded-xl overflow-hidden surface-glass group"
              >
                <div className="absolute inset-0 bg-[#070a0f] flex flex-col items-center justify-center text-[#8a968f]">
                  <Terminal className="w-12 h-12 text-[#e8ad26]/70 mb-2" />
                  <span className="text-sm">{TECH_TEAM_PROFILE.brandName}</span>
                </div>
                <img
                  src={TECH_TEAM_IMAGE_URL}
                  alt={`${TECH_TEAM_PROFILE.leadName}, founder of ${TECH_TEAM_PROFILE.brandName}`}
                  referrerPolicy="no-referrer"
                  className="relative z-10 w-full h-full object-cover object-top transition-transform duration-700 group-hover:scale-[1.02]"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
                <div className="pointer-events-none absolute inset-x-0 bottom-0 h-40 z-20 bg-gradient-to-t from-[#05070a]/95 via-[#05070a]/60 to-transparent" />
                <div className="absolute bottom-0 inset-x-0 z-30 p-6 sm:p-7 space-y-1">
                  <p className="font-mono-tech text-[11px] tracking-[0.18em] uppercase text-[#e8ad26]">
                    {TECH_TEAM_PROFILE.brandName} · {TECH_TEAM_PROFILE.location}
                  </p>
                  <p className="font-display font-normal text-xl sm:text-2xl text-[#dfe7e0]">
                    {TECH_TEAM_PROFILE.leadName}
                  </p>
                  <p className="text-xs text-[#b4bfb7]">
                    {TECH_TEAM_PROFILE.roleSummary}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Company Overview, Vision, Mission & Infrastructure */}
      <section className="relative overflow-hidden py-20 sm:py-28 px-4 sm:px-6 lg:px-10 border-t border-[#dfe7e0]/12">
        <SectionParallaxBackdrop
          imageSrc={PORTFOLIO_IMAGES.bgPortfolioMist}
          alt="Industrial chemical processing infrastructure at dusk"
          accent="amber"
          opacityClass="opacity-[0.22]"
        />

        <div className="relative z-10 max-w-7xl mx-auto space-y-12">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-stretch">
            <div className="lg:col-span-6 lg:order-1 flex items-stretch gs-reveal">
              <div
                onPointerMove={(e) => {
                  handleSpotlightMove(e);
                  handleTiltMove(e, 2.5);
                }}
                onPointerLeave={(e) => {
                  handleSpotlightLeave(e);
                  handleTiltLeave(e);
                }}
                className="spotlight-card tilt-surface relative w-full min-h-[340px] lg:h-full rounded-xl overflow-hidden surface-glass group"
              >
                <div className="absolute inset-0 bg-[#070a0f] flex flex-col items-center justify-center text-[#8a968f]">
                  <FlaskConical className="w-10 h-10 text-[#e8ad26]/70 mb-2" />
                  <span className="text-sm">Analytical Chemical Operations</span>
                </div>
                <img
                  src={PORTFOLIO_IMAGES.aboutLab}
                  alt="Modern analytical chemical research and testing laboratory with precision instrumentation"
                  referrerPolicy="no-referrer"
                  className="relative z-10 w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.03]"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
                <div className="pointer-events-none absolute inset-0 z-20 bg-gradient-to-t from-[#05070a]/92 via-[#05070a]/25 to-transparent" />
                <div className="absolute bottom-0 inset-x-0 z-30 p-6 sm:p-7">
                  <p className="text-[11px] tracking-[0.18em] uppercase text-[#e8ad26]">
                    Filtration, Adsorbents &amp; Trade Execution
                  </p>
                  <p className="text-sm text-[#dfe7e0] mt-1 max-w-md">
                    Bridging certified processing lines with municipal utilities and
                    industrial plants worldwide.
                  </p>
                </div>
              </div>
            </div>

            <div className="lg:col-span-6 lg:order-2 flex flex-col justify-center space-y-7 gs-reveal">
              <div className="space-y-4">
                <p className="text-[11px] font-medium tracking-[0.22em] uppercase text-[#e8ad26]">
                  About Alorix Global International
                </p>
                <h2
                  className="font-display font-normal uppercase tracking-[-0.012em] text-[#dfe7e0] text-balance leading-[1.08]"
                  style={{ fontSize: 'clamp(1.85rem, 3.2vw, 2.75rem)' }}
                >
                  PURIFICATION MEDIA, INDUSTRIAL CHEMICALS &amp; GLOBAL SUPPLY.
                </h2>
                <div
                  data-rule-draw="true"
                  className="h-[1px] w-24 bg-[#e8ad26]/75 origin-left"
                />
                <p className="text-base sm:text-lg text-[#b4bfb7] font-light leading-[1.72] max-w-xl">
                  Connecting municipal water plants and industrial processors with
                  precision-graded activated carbon, mineral filtration media,
                  adsorbents, and commercial supply coordination.
                </p>
              </div>

              <div className="divide-y divide-[#dfe7e0]/12 border-y border-[#dfe7e0]/12">
                {ABOUT_PILLARS.map((pillar) => (
                  <div
                    key={pillar.index}
                    className="py-4 flex items-start gap-4 transition-colors"
                  >
                    <span className="font-mono-tech text-xs text-[#e0231c] pt-1 shrink-0">
                      {pillar.index}.
                    </span>
                    <div className="space-y-1">
                      <h3 className="font-display font-normal text-base text-[#dfe7e0]">
                        {pillar.title}
                      </h3>
                      <p className="text-sm text-[#9aa5a0] leading-relaxed">
                        {pillar.text}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="rounded-xl surface-panel p-6 sm:p-8 space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#dfe7e0]/10 pb-5">
              <div>
                <p className="text-[11px] font-medium tracking-[0.18em] uppercase text-[#e8ad26]">
                  Corporate Foundation
                </p>
                <h3 className="font-display font-normal text-lg sm:text-xl text-[#dfe7e0] mt-1">
                  Vision, Mission &amp; Operational Infrastructure
                </h3>
              </div>

              <div
                role="tablist"
                aria-label="Company vision, mission, and infrastructure"
                className="flex flex-wrap gap-2"
              >
                {COMPANY_VISION_MISSION_ITEMS.map((item) => {
                  const isSelected = item.id === activeItem.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      role="tab"
                      aria-selected={isSelected}
                      onClick={() => setActiveTabId(item.id)}
                      className={`px-3.5 py-1.5 text-xs font-medium rounded-md border transition-colors whitespace-nowrap shrink-0 ${
                        isSelected
                          ? 'bg-[#e0231c] border-[#e0231c] text-white'
                          : 'bg-[#05070a]/80 border-[#dfe7e0]/12 text-[#b4bfb7] hover:border-[#dfe7e0]/30 hover:text-[#dfe7e0]'
                      }`}
                    >
                      {item.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <AnimatePresence mode="wait">
              <motion.div
                key={activeItem.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center"
              >
                <div className="lg:col-span-4">
                  <p className="font-display font-normal text-lg text-[#e8ad26]">
                    {activeItem.title}
                  </p>
                </div>
                <div className="lg:col-span-8">
                  <p className="text-sm sm:text-base text-[#b4bfb7] leading-relaxed">
                    {activeItem.summary}
                  </p>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </section>
    </div>
  );
}
