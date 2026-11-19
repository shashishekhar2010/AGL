import { useMemo, useState } from 'react';
import {
  ArrowUpRight,
  CheckCircle2,
  Globe2,
  RotateCcw,
  Search,
} from 'lucide-react';
import {
  GLOBAL_ORIGIN_HUB,
  GLOBAL_REGION_NODES,
  PORTFOLIO_IMAGES,
} from '../data/alorixContent';
import SectionParallaxBackdrop from './SectionParallaxBackdrop';
import WorldTradeMap2D, {
  getAllDeliverableCountries,
  type DeliverableCountry,
} from './WorldTradeMap2D';

interface GlobalReachSectionProps {
  onEnquireCountry?: (interestLabel: string) => void;
}

function computeGreatCircleKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const sinLat = Math.sin(dLat / 2);
  const sinLon = Math.sin(dLon / 2);
  const h =
    sinLat * sinLat +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * sinLon * sinLon;
  return Math.round(2 * R * Math.asin(Math.sqrt(h)));
}

export default function GlobalReachSection({
  onEnquireCountry,
}: GlobalReachSectionProps) {
  const allCountries = useMemo(() => getAllDeliverableCountries(), []);
  const [selectedCountry, setSelectedCountry] =
    useState<DeliverableCountry | null>(null);
  const [focusedRegionId, setFocusedRegionId] = useState<string | null>(null);
  const [countrySearch, setCountrySearch] = useState('');

  const filteredCountries = useMemo(() => {
    const q = countrySearch.trim().toLowerCase();
    if (!q) return allCountries;
    return allCountries.filter((c) => c.name.toLowerCase().includes(q));
  }, [allCountries, countrySearch]);

  const activeRegion = useMemo(
    () =>
      focusedRegionId
        ? GLOBAL_REGION_NODES.find((r) => r.id === focusedRegionId) || null
        : null,
    [focusedRegionId]
  );

  const routeDistanceKm = useMemo(() => {
    if (selectedCountry) {
      if (selectedCountry.id === '356') return 0;
      return computeGreatCircleKm(
        GLOBAL_ORIGIN_HUB.lat,
        GLOBAL_ORIGIN_HUB.lon,
        selectedCountry.lat,
        selectedCountry.lon
      );
    }
    if (activeRegion) {
      return computeGreatCircleKm(
        GLOBAL_ORIGIN_HUB.lat,
        GLOBAL_ORIGIN_HUB.lon,
        activeRegion.lat,
        activeRegion.lon
      );
    }
    return 0;
  }, [selectedCountry, activeRegion]);

  const handleSelectCountry = (country: DeliverableCountry) => {
    setSelectedCountry(country);
    setFocusedRegionId(null);
  };

  const handleSelectRegion = (regionId: string) => {
    setSelectedCountry(null);
    setFocusedRegionId((prev) => (prev === regionId ? null : regionId));
  };

  const handleResetAllWorld = () => {
    setSelectedCountry(null);
    setFocusedRegionId(null);
    setCountrySearch('');
  };

  return (
    <section
      id="global-reach"
      className="relative overflow-hidden py-24 sm:py-32 px-4 sm:px-6 lg:px-10 border-t border-[#dfe7e0]/12"
    >
      <SectionParallaxBackdrop
        imageSrc={PORTFOLIO_IMAGES.bgGlobalMaritime}
        alt="International maritime chemical shipping terminal backdrop"
        accent="vermilion"
        opacityClass="opacity-[0.28]"
      />

      <div className="relative z-10 max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
        <div className="lg:col-span-5 space-y-6 gs-reveal">
          <div className="space-y-4">
            <p className="text-[11px] font-medium tracking-[0.22em] uppercase text-[#e8ad26]">
              Worldwide Delivery Network · Every Country Covered
            </p>
            <h2
              className="font-display font-normal uppercase tracking-[-0.012em] text-[#dfe7e0] text-balance leading-[1.08]"
              style={{ fontSize: 'clamp(1.85rem, 3.2vw, 2.85rem)' }}
            >
              WE DELIVER TO EVERY COUNTRY WORLDWIDE.
            </h2>
            <div
              data-rule-draw="true"
              className="h-[1px] w-24 bg-[#e0231c]/75 origin-left"
            />
            <p className="text-sm sm:text-base text-[#b4bfb7] font-light leading-relaxed">
              Alorix Global International exports activated carbon, filtration
              media, specialty chemicals, and industrial systems to all
              countries across every inhabited continent via FCL/LCL sea freight
              and express air cargo.
            </p>
          </div>

          {/* Key Worldwide Coverage Metrics (Unboxed Typographic Bar) */}
          <div className="grid grid-cols-3 gap-4 py-3.5 border-y border-[#dfe7e0]/12">
            <div>
              <p className="font-display font-normal text-lg sm:text-xl text-[#e8ad26] tabular-nums">
                190+
              </p>
              <p className="text-[11px] text-[#9aa5a0]">Countries Served</p>
            </div>
            <div>
              <p className="font-display font-normal text-lg sm:text-xl text-[#dfe7e0] tabular-nums">
                6 / 6
              </p>
              <p className="text-[11px] text-[#9aa5a0]">Global Continents</p>
            </div>
            <div>
              <p className="font-display font-normal text-lg sm:text-xl text-[#dfe7e0]">
                Sea &amp; Air
              </p>
              <p className="text-[11px] text-[#9aa5a0]">FOB · CIF · DDP</p>
            </div>
          </div>

          {/* All 6 Continents Coverage List */}
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2 pb-1">
              <span className="text-[11px] font-medium tracking-[0.16em] uppercase text-[#8a968f]">
                Global Regions Covered
              </span>
              {(selectedCountry || focusedRegionId) && (
                <button
                  type="button"
                  onClick={handleResetAllWorld}
                  className="inline-flex items-center gap-1.5 text-[11px] font-medium text-[#e8ad26] hover:text-[#dfe7e0] transition-colors whitespace-nowrap shrink-0"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Show All Countries</span>
                </button>
              )}
            </div>

            {GLOBAL_REGION_NODES.map((region) => {
              const isSelected = !selectedCountry && focusedRegionId === region.id;
              return (
                <button
                  key={region.id}
                  type="button"
                  onClick={() => handleSelectRegion(region.id)}
                  className={`w-full text-left px-4 py-3 rounded-lg border transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e0231c] ${
                    isSelected
                      ? 'bg-[#0a0e14]/92 border-[#e0231c]/65 text-[#dfe7e0]'
                      : 'bg-[#070a0f]/76 border-[#dfe7e0]/12 text-[#b4bfb7] hover:border-[#e8ad26]/45 hover:text-[#dfe7e0]'
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-display font-normal text-sm flex items-center gap-2.5">
                      <Globe2
                        className={`w-4 h-4 shrink-0 ${
                          isSelected ? 'text-[#e8ad26]' : 'text-[#e8ad26]/70'
                        }`}
                      />
                      <span>{region.name}</span>
                    </span>
                    <span className="text-[11px] text-[#e8ad26]/85 shrink-0">
                      {region.label}
                    </span>
                  </div>
                  {isSelected && (
                    <p className="mt-2 text-xs text-[#b4bfb7] leading-relaxed pl-6">
                      {region.coverageNote}
                    </p>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <div className="lg:col-span-7 gs-reveal space-y-4">
          <div className="rounded-xl surface-glass p-3 sm:p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 px-2 text-xs text-[#8a968f]">
              <span className="text-[#dfe7e0] font-normal">
                {selectedCountry
                  ? `Selected Destination: ${selectedCountry.name}`
                  : activeRegion
                    ? `Focused Region: ${activeRegion.name} (All Countries Active)`
                    : 'Worldwide Delivery Map · All Countries Illuminated'}
              </span>
              <span className="font-mono-tech tabular-nums text-[#e8ad26]">
                {selectedCountry
                  ? `${Math.abs(selectedCountry.lat).toFixed(1)}° ${
                      selectedCountry.lat >= 0 ? 'N' : 'S'
                    } · ${Math.abs(selectedCountry.lon).toFixed(1)}° ${
                      selectedCountry.lon >= 0 ? 'E' : 'W'
                    }`
                  : '100% Global Coverage'}
              </span>
            </div>

            <WorldTradeMap2D
              regions={GLOBAL_REGION_NODES}
              selectedCountryId={selectedCountry?.id ?? null}
              focusedRegionId={focusedRegionId}
              onSelectCountry={handleSelectCountry}
              onSelectRegion={handleSelectRegion}
            />
          </div>

          {/* Interactive Worldwide Country Delivery Checker */}
          <div className="rounded-xl surface-panel p-4 sm:p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
              <span className="text-[11px] font-medium tracking-[0.16em] uppercase text-[#e8ad26]">
                Check Any Destination Country
              </span>
              <span className="font-mono-tech tabular-nums text-[#b4bfb7]">
                {selectedCountry
                  ? selectedCountry.id === '356'
                    ? 'Domestic & Pan-India Dispatch Ready'
                    : `Dispatch Span: ~${routeDistanceKm.toLocaleString()} km · Air & Sea Export Ready`
                  : activeRegion
                    ? `Corridor Span: ~${routeDistanceKm.toLocaleString()} km · All Ports Served`
                    : 'Click any country on the map or select below'}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-[#8a968f] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="search"
                  value={countrySearch}
                  onChange={(e) => setCountrySearch(e.target.value)}
                  aria-label="Filter destination countries"
                  placeholder="Type a country name..."
                  className="w-full pl-8 pr-3 py-2 text-xs text-[#dfe7e0] bg-[#05070a]/85 border border-[#dfe7e0]/15 rounded-md placeholder:text-[#8a968f] focus:outline-none focus:border-[#e0231c]"
                />
              </div>

              <select
                aria-label="Select any destination country worldwide"
                value={selectedCountry?.id ?? ''}
                onChange={(e) => {
                  const id = e.target.value;
                  if (!id) {
                    handleResetAllWorld();
                    return;
                  }
                  const found = allCountries.find((c) => c.id === id);
                  if (found) handleSelectCountry(found);
                }}
                className="w-full px-3 py-2 text-xs text-[#dfe7e0] bg-[#05070a]/85 border border-[#dfe7e0]/15 rounded-md focus:outline-none focus:border-[#e0231c]"
              >
                <option value="" className="bg-[#05070a]">
                  All Countries Worldwide ({filteredCountries.length} mapped)
                </option>
                {filteredCountries.map((country) => (
                  <option
                    key={country.id}
                    value={country.id}
                    className="bg-[#05070a]"
                  >
                    {country.name}
                  </option>
                ))}
              </select>
            </div>

            {selectedCountry && (
              <div className="pt-3 border-t border-[#dfe7e0]/10 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-xs text-[#dfe7e0]">
                  <CheckCircle2 className="w-4 h-4 text-[#e8ad26] shrink-0" />
                  <span>
                    We deliver directly to{' '}
                    <strong className="font-medium text-[#e8ad26]">
                      {selectedCountry.name}
                    </strong>{' '}
                    — full export documentation, COA &amp; customs clearance
                    supported.
                  </span>
                </div>

                {onEnquireCountry && (
                  <button
                    type="button"
                    onClick={() =>
                      onEnquireCountry(
                        `International Delivery — ${selectedCountry.name}`
                      )
                    }
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium uppercase tracking-[0.06em] text-white bg-[#e0231c] hover:bg-[#c81e17] rounded-md transition-colors whitespace-nowrap shrink-0"
                  >
                    <span>Request Quote for {selectedCountry.name}</span>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
