import { useEffect, useMemo, useRef, useState } from 'react';
import {
  geoArea,
  geoCentroid,
  geoGraticule10,
  geoInterpolate,
  geoNaturalEarth1,
  geoPath,
} from 'd3-geo';
import { feature, mesh } from 'topojson-client';
import type { Topology, GeometryCollection } from 'topojson-specification';
import type { Feature, Geometry, MultiPolygon, Polygon } from 'geojson';
import worldAtlas from 'world-atlas/countries-110m.json';
import {
  GLOBAL_ORIGIN_HUB,
  type GlobalRegionNode,
} from '../data/alorixContent';

export interface DeliverableCountry {
  id: string;
  name: string;
  lon: number;
  lat: number;
}

interface CountryProps {
  name?: string;
}

interface WorldTradeMap2DProps {
  regions: GlobalRegionNode[];
  selectedCountryId: string | null;
  focusedRegionId: string | null;
  onSelectCountry: (country: DeliverableCountry) => void;
  onSelectRegion: (regionId: string) => void;
}

const EXCLUDED_POLAR_IDS = new Set(['010', '260']);

function getMainlandCentroid(
  feat: Feature<Geometry, CountryProps>
): [number, number] {
  const geom = feat.geometry;
  if (geom && geom.type === 'MultiPolygon') {
    const multi = geom as MultiPolygon;
    let bestRingCoords = multi.coordinates[0];
    let maxArea = -1;
    for (const polyCoords of multi.coordinates) {
      const polyObj: Polygon = { type: 'Polygon', coordinates: polyCoords };
      const area = geoArea(polyObj);
      if (area > maxArea) {
        maxArea = area;
        bestRingCoords = polyCoords;
      }
    }
    if (bestRingCoords) {
      return geoCentroid({ type: 'Polygon', coordinates: bestRingCoords });
    }
  }
  return geoCentroid(feat);
}

function getFeatureStableId(
  feat: Feature<Geometry, CountryProps>,
  index: number
): string {
  if (
    feat.id !== undefined &&
    feat.id !== null &&
    String(feat.id).trim() !== ''
  ) {
    return String(feat.id);
  }
  const slug = (feat.properties?.name || 'region')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  return `geo-${index}-${slug}`;
}

let cachedCountries: DeliverableCountry[] | null = null;

export function getAllDeliverableCountries(): DeliverableCountry[] {
  if (cachedCountries) return cachedCountries;

  const topology = worldAtlas as unknown as Topology<{
    countries: GeometryCollection<CountryProps>;
    land: GeometryCollection;
  }>;
  const countriesGeo = feature(topology, topology.objects.countries);

  const list: DeliverableCountry[] = [];
  countriesGeo.features.forEach((feat, index) => {
    const id = getFeatureStableId(feat, index);
    const name = feat.properties?.name?.trim() || '';
    if (!name || EXCLUDED_POLAR_IDS.has(id)) return;
    const [lon, lat] = getMainlandCentroid(feat);
    if (Number.isFinite(lon) && Number.isFinite(lat)) {
      list.push({ id, name, lon, lat });
    }
  });

  list.sort((a, b) => a.name.localeCompare(b.name));
  cachedCountries = list;
  return list;
}

export default function WorldTradeMap2D({
  regions,
  selectedCountryId,
  focusedRegionId,
  onSelectCountry,
  onSelectRegion,
}: WorldTradeMap2DProps) {
  const [hoveredCountry, setHoveredCountry] = useState<string | null>(null);
  const [hoveredRegionId, setHoveredRegionId] = useState<string | null>(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const pulseRef = useRef<SVGCircleElement | null>(null);
  const pulseHaloRef = useRef<SVGCircleElement | null>(null);

  const {
    spherePath,
    graticulePath,
    landPath,
    bordersPath,
    countryShapes,
    originPoint,
    projectedRegions,
    radialArcs,
    selectedCountryData,
    activeRoutePath,
    activeTargetLonLat,
    projection,
  } = useMemo(() => {
    const proj = geoNaturalEarth1().fitExtent(
      [
        [20, 16],
        [980, 484],
      ],
      { type: 'Sphere' }
    );
    const pathGen = geoPath(proj);

    const topology = worldAtlas as unknown as Topology<{
      countries: GeometryCollection<CountryProps>;
      land: GeometryCollection;
    }>;

    const landGeo = feature(topology, topology.objects.land);
    const countriesGeo = feature(topology, topology.objects.countries);
    const bordersGeo = mesh(
      topology,
      topology.objects.countries,
      (a, b) => a !== b
    );

    const sphereD = pathGen({ type: 'Sphere' }) || '';
    const graticuleD = pathGen(geoGraticule10()) || '';
    const landD = pathGen(landGeo) || '';
    const bordersD = pathGen(bordersGeo) || '';

    const originXY = proj([GLOBAL_ORIGIN_HUB.lon, GLOBAL_ORIGIN_HUB.lat]) || [
      680, 235,
    ];

    const shapes = countriesGeo.features.map((feat, index) => {
      const id = getFeatureStableId(feat, index);
      const name = feat.properties?.name?.trim() || '';
      const isPolar = EXCLUDED_POLAR_IDS.has(id);
      const [lon, lat] = getMainlandCentroid(feat);
      const xy = proj([lon, lat]);
      return {
        id,
        name,
        isPolar,
        lon,
        lat,
        x: xy ? xy[0] : 0,
        y: xy ? xy[1] : 0,
        d: pathGen(feat) || '',
      };
    });

    const regNodes = regions
      .map((r) => {
        const xy = proj([r.lon, r.lat]);
        if (!xy) return null;
        return { ...r, x: xy[0], y: xy[1] };
      })
      .filter((n): n is GlobalRegionNode & { x: number; y: number } =>
        Boolean(n)
      );

    // Radial global dispatch arcs fanning from India hub to every inhabited continent
    const radials = regNodes.map((node) => ({
      id: node.id,
      d:
        pathGen({
          type: 'LineString',
          coordinates: [
            [GLOBAL_ORIGIN_HUB.lon, GLOBAL_ORIGIN_HUB.lat],
            [node.lon, node.lat],
          ],
        }) || '',
    }));

    const selectedShape = selectedCountryId
      ? shapes.find((s) => s.id === selectedCountryId && !s.isPolar) || null
      : null;

    const focusedRegion =
      !selectedShape && focusedRegionId
        ? regNodes.find((r) => r.id === focusedRegionId) || null
        : null;

    let routeD = '';
    let targetLonLat: [number, number] | null = null;

    if (selectedShape && selectedShape.id !== '356') {
      targetLonLat = [selectedShape.lon, selectedShape.lat];
      routeD =
        pathGen({
          type: 'LineString',
          coordinates: [
            [GLOBAL_ORIGIN_HUB.lon, GLOBAL_ORIGIN_HUB.lat],
            targetLonLat,
          ],
        }) || '';
    } else if (focusedRegion) {
      targetLonLat = [focusedRegion.lon, focusedRegion.lat];
      routeD =
        pathGen({
          type: 'LineString',
          coordinates: [
            [GLOBAL_ORIGIN_HUB.lon, GLOBAL_ORIGIN_HUB.lat],
            targetLonLat,
          ],
        }) || '';
    }

    return {
      spherePath: sphereD,
      graticulePath: graticuleD,
      landPath: landD,
      bordersPath: bordersD,
      countryShapes: shapes,
      originPoint: { x: originXY[0], y: originXY[1] },
      projectedRegions: regNodes,
      radialArcs: radials,
      selectedCountryData: selectedShape,
      activeRoutePath: routeD,
      activeTargetLonLat: targetLonLat,
      projection: proj,
    };
  }, [regions, selectedCountryId, focusedRegionId]);

  // Animate geodesic transit pulse along active delivery route
  useEffect(() => {
    if (!activeTargetLonLat) return;
    const reduced =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) return;

    const interpolator = geoInterpolate(
      [GLOBAL_ORIGIN_HUB.lon, GLOBAL_ORIGIN_HUB.lat],
      activeTargetLonLat
    );
    let rafId = 0;

    const tick = (now: number) => {
      const t = (now * 0.00032) % 1;
      const geoPoint = interpolator(t);
      const xy = projection(geoPoint);
      if (xy && pulseRef.current && pulseHaloRef.current) {
        const cx = xy[0].toFixed(2);
        const cy = xy[1].toFixed(2);
        pulseRef.current.setAttribute('cx', cx);
        pulseRef.current.setAttribute('cy', cy);
        pulseHaloRef.current.setAttribute('cx', cx);
        pulseHaloRef.current.setAttribute('cy', cy);
      }
      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [projection, activeTargetLonLat]);

  const handleMapMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== 'mouse') return;
    const rect = e.currentTarget.getBoundingClientRect();
    const nx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const ny = ((e.clientY - rect.top) / rect.height) * 2 - 1;
    setTilt({ x: nx * -5, y: ny * -3.5 });
  };

  return (
    <div
      onPointerMove={handleMapMove}
      onPointerLeave={() => {
        setTilt({ x: 0, y: 0 });
        setHoveredCountry(null);
      }}
      className="relative w-full h-[360px] sm:h-[460px] rounded-xl overflow-hidden bg-[#04070c] border border-[#dfe7e0]/12"
    >
      {/* Subtle oceanic ambient glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(84% 72% at 52% 46%, rgba(16, 30, 48, 0.58) 0%, rgba(4, 7, 12, 0.97) 100%)',
        }}
      />

      <svg
        viewBox="0 0 1000 500"
        className="relative z-10 w-full h-full transition-transform duration-300 ease-out"
        style={{
          transform: `translate3d(${tilt.x.toFixed(1)}px, ${tilt.y.toFixed(
            1
          )}px, 0) scale(1.012)`,
        }}
        role="img"
        aria-label="Worldwide delivery coverage map covering every country on Earth"
      >
        <defs>
          <radialGradient id="oceanSphereGrad" cx="50%" cy="46%" r="58%">
            <stop offset="0%" stopColor="#0d1826" stopOpacity="0.96" />
            <stop offset="68%" stopColor="#070d16" stopOpacity="0.98" />
            <stop offset="100%" stopColor="#03060a" stopOpacity="1" />
          </radialGradient>

          <linearGradient id="worldLandGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#262015" stopOpacity="1" />
            <stop offset="50%" stopColor="#1c2229" stopOpacity="1" />
            <stop offset="100%" stopColor="#231c15" stopOpacity="1" />
          </linearGradient>

          <linearGradient id="tradeArcGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#e8ad26" stopOpacity="0.98" />
            <stop offset="52%" stopColor="#e0231c" stopOpacity="0.98" />
            <stop offset="100%" stopColor="#dfe7e0" stopOpacity="0.94" />
          </linearGradient>

          <radialGradient id="hubHaloGrad" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#e0231c" stopOpacity="0.45" />
            <stop offset="100%" stopColor="#e0231c" stopOpacity="0" />
          </radialGradient>

          <radialGradient id="originHaloGrad" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#e8ad26" stopOpacity="0.52" />
            <stop offset="100%" stopColor="#e8ad26" stopOpacity="0" />
          </radialGradient>

          <clipPath id="globeSphereClip">
            <path d={spherePath} />
          </clipPath>
        </defs>

        {/* Natural Earth Ocean Sphere */}
        <path
          d={spherePath}
          fill="url(#oceanSphereGrad)"
          stroke="rgba(223, 231, 224, 0.18)"
          strokeWidth="1.1"
        />

        <g clipPath="url(#globeSphereClip)">
          {/* Spherical Lat/Lon Graticules */}
          <path
            d={graticulePath}
            fill="none"
            stroke="rgba(223, 231, 224, 0.05)"
            strokeWidth="0.7"
          />

          {/* Base Landmass Silhouette */}
          <path
            d={landPath}
            fill="url(#worldLandGrad)"
            stroke="rgba(232, 173, 38, 0.36)"
            strokeWidth="0.75"
          />

          {/* Every Country Illuminated as Active Delivery Territory */}
          {countryShapes.map((c) => {
            if (c.isPolar) {
              return (
                <path
                  key={c.id}
                  d={c.d}
                  fill="rgba(12, 18, 28, 0.72)"
                  stroke="none"
                />
              );
            }

            const isSelected = selectedCountryId === c.id;
            const isHovered = Boolean(c.name && hoveredCountry === c.name);
            const isOriginIndia = c.id === '356';

            const fill = isSelected
              ? 'rgba(224, 35, 28, 0.56)'
              : isHovered
                ? 'rgba(232, 173, 38, 0.42)'
                : isOriginIndia
                  ? 'rgba(232, 173, 38, 0.30)'
                  : 'rgba(232, 173, 38, 0.14)';

            return (
              <path
                key={c.id}
                d={c.d}
                fill={fill}
                stroke={
                  isSelected
                    ? '#e8ad26'
                    : isHovered
                      ? 'rgba(232, 173, 38, 0.8)'
                      : 'none'
                }
                strokeWidth={isSelected ? '1.15' : isHovered ? '0.8' : '0'}
                className="cursor-pointer transition-colors duration-150"
                onMouseEnter={() => {
                  if (c.name) setHoveredCountry(c.name);
                }}
                onMouseLeave={() => setHoveredCountry(null)}
                onClick={() => {
                  if (c.name) {
                    onSelectCountry({
                      id: c.id,
                      name: c.name,
                      lon: c.lon,
                      lat: c.lat,
                    });
                  }
                }}
              />
            );
          })}

          {/* Crisp Illuminated Borders Across All Nations */}
          <path
            d={bordersPath}
            fill="none"
            stroke="rgba(232, 173, 38, 0.24)"
            strokeWidth="0.55"
            className="pointer-events-none"
          />

          {/* Worldwide Multi-Continent Delivery Arcs (Always Visible) */}
          {radialArcs.map((arc) => {
            const isFocused =
              !selectedCountryData &&
              (arc.id === focusedRegionId || arc.id === hoveredRegionId);
            const isAllWorldMode = !selectedCountryData && !focusedRegionId;

            return (
              <path
                key={arc.id}
                d={arc.d}
                fill="none"
                stroke={
                  isFocused
                    ? 'rgba(232, 173, 38, 0.78)'
                    : isAllWorldMode
                      ? 'rgba(232, 173, 38, 0.44)'
                      : 'rgba(223, 231, 224, 0.14)'
                }
                strokeWidth={
                  isFocused ? '1.6' : isAllWorldMode ? '1.15' : '0.8'
                }
                strokeDasharray="4 4"
                className={
                  isAllWorldMode || isFocused
                    ? 'trade-arc-flow pointer-events-none'
                    : 'pointer-events-none'
                }
              />
            );
          })}

          {/* Active Highlighted Geodesic Delivery Route to Selected Country or Region */}
          {activeRoutePath && (
            <g className="pointer-events-none">
              <path
                d={activeRoutePath}
                fill="none"
                stroke="rgba(224, 35, 28, 0.3)"
                strokeWidth="5.5"
                strokeLinecap="round"
              />
              <path
                d={activeRoutePath}
                fill="none"
                stroke="url(#tradeArcGrad)"
                strokeWidth="2.3"
                strokeDasharray="7 5"
                className="trade-arc-flow"
              />
              <circle
                ref={pulseHaloRef}
                r="10"
                fill="rgba(232, 173, 38, 0.28)"
              />
              <circle
                ref={pulseRef}
                r="3.4"
                fill="#e8ad26"
                stroke="#05070a"
                strokeWidth="1.2"
              />
            </g>
          )}

          {/* Global Export Origin Hub (India) */}
          <g className="pointer-events-none">
            <circle
              cx={originPoint.x}
              cy={originPoint.y}
              r="20"
              fill="url(#originHaloGrad)"
            />
            <circle
              cx={originPoint.x}
              cy={originPoint.y}
              r="11"
              fill="none"
              stroke="#e8ad26"
              strokeOpacity="0.72"
              strokeWidth="1"
            />
            <circle
              cx={originPoint.x}
              cy={originPoint.y}
              r="4.5"
              fill="#e8ad26"
              stroke="#05070a"
              strokeWidth="1.5"
            />
          </g>

          {/* Continental Waypoints (Subtle Interactive Anchors When Viewing Worldwide Network) */}
          {!selectedCountryData &&
            projectedRegions.map((node) => {
              const isFocused = node.id === focusedRegionId;
              const isHovered = node.id === hoveredRegionId;
              return (
                <g
                  key={node.id}
                  onClick={() => onSelectRegion(node.id)}
                  onMouseEnter={() => setHoveredRegionId(node.id)}
                  onMouseLeave={() => setHoveredRegionId(null)}
                  className="cursor-pointer"
                  data-interactive="true"
                >
                  {(isFocused || isHovered) && (
                    <circle
                      cx={node.x}
                      cy={node.y}
                      r="16"
                      fill="url(#hubHaloGrad)"
                    />
                  )}
                  <circle
                    cx={node.x}
                    cy={node.y}
                    r={isFocused || isHovered ? '4.8' : '3.2'}
                    fill={isFocused ? '#e0231c' : '#dfe7e0'}
                    stroke="#05070a"
                    strokeWidth="1.3"
                  />
                  <text
                    x={node.x}
                    y={node.y + 15}
                    textAnchor="middle"
                    fill={isFocused || isHovered ? '#dfe7e0' : '#c6d1c9'}
                    fontSize={isFocused || isHovered ? '10' : '9'}
                    fontWeight={isFocused ? '500' : '400'}
                    fontFamily="Onest, sans-serif"
                    style={{
                      paintOrder: 'stroke',
                      stroke: '#04070c',
                      strokeWidth: '3px',
                      strokeLinejoin: 'round',
                    }}
                  >
                    {node.name}
                  </text>
                </g>
              );
            })}

          {/* Selected Country Destination Pin */}
          {selectedCountryData && (
            <g className="pointer-events-none">
              <circle
                cx={selectedCountryData.x}
                cy={selectedCountryData.y}
                r="22"
                fill="url(#hubHaloGrad)"
              />
              <circle
                cx={selectedCountryData.x}
                cy={selectedCountryData.y}
                r="13"
                fill="none"
                stroke="#e0231c"
                strokeOpacity="0.82"
                strokeWidth="1.2"
              />
              <circle
                cx={selectedCountryData.x}
                cy={selectedCountryData.y}
                r="5.2"
                fill="#e0231c"
                stroke="#dfe7e0"
                strokeWidth="1.4"
              />
              <text
                x={selectedCountryData.x}
                y={selectedCountryData.y + 19}
                textAnchor="middle"
                fill="#dfe7e0"
                fontSize="11"
                fontWeight="500"
                fontFamily="Onest, sans-serif"
                style={{
                  paintOrder: 'stroke',
                  stroke: '#04070c',
                  strokeWidth: '3.5px',
                  strokeLinejoin: 'round',
                }}
              >
                {selectedCountryData.name}
              </text>
            </g>
          )}
        </g>
      </svg>

      {/* Bottom Cartographic Readout Bar */}
      <div className="pointer-events-none absolute bottom-3 inset-x-4 z-20 flex flex-wrap items-center justify-between gap-2 text-[11px] text-[#9aa5a0]">
        <span className="text-[#dfe7e0]">
          {hoveredCountry
            ? `Delivery Available · ${hoveredCountry} (Click to trace route)`
            : selectedCountryData
              ? `Delivery Route Active · ${selectedCountryData.name}`
              : 'Worldwide Delivery Active · Click any country to trace dispatch route'}
        </span>
        <span className="font-mono-tech tabular-nums text-[#e8ad26]">
          All Continents · Worldwide Export Coverage
        </span>
      </div>
    </div>
  );
}
