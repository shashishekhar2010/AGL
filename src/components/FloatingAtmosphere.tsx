import { useEffect, useRef, useState } from 'react';

interface FloatingAtmosphereProps {
  pointerOffsetRef: React.MutableRefObject<{ x: number; y: number }>;
  scrollProgress: number;
}

interface OrbConfig {
  id: string;
  baseX: string;
  baseY: string;
  size: number;
  depth: number;
  scrollFactor: number;
  driftAmpX: number;
  driftAmpY: number;
  freqX: number;
  freqY: number;
  phase: number;
  gradient: string;
}

const ATMOSPHERE_ORBS: OrbConfig[] = [
  {
    id: 'orb-vermilion-nw',
    baseX: '14%',
    baseY: '20%',
    size: 460,
    depth: 0.9,
    scrollFactor: -100,
    driftAmpX: 24,
    driftAmpY: 18,
    freqX: 0.22,
    freqY: 0.17,
    phase: 0.4,
    gradient:
      'radial-gradient(circle, rgba(224, 35, 28, 0.11) 0%, rgba(224, 35, 28, 0.035) 45%, transparent 72%)',
  },
  {
    id: 'orb-amber-ne',
    baseX: '82%',
    baseY: '24%',
    size: 500,
    depth: 0.65,
    scrollFactor: 80,
    driftAmpX: 28,
    driftAmpY: 22,
    freqX: 0.16,
    freqY: 0.21,
    phase: 1.7,
    gradient:
      'radial-gradient(circle, rgba(232, 173, 38, 0.1) 0%, rgba(232, 173, 38, 0.03) 45%, transparent 72%)',
  },
  {
    id: 'orb-bone-center',
    baseX: '52%',
    baseY: '50%',
    size: 380,
    depth: 0.45,
    scrollFactor: -60,
    driftAmpX: 18,
    driftAmpY: 16,
    freqX: 0.14,
    freqY: 0.19,
    phase: 2.9,
    gradient:
      'radial-gradient(circle, rgba(223, 231, 224, 0.06) 0%, rgba(223, 231, 224, 0.015) 50%, transparent 74%)',
  },
  {
    id: 'orb-amber-sw',
    baseX: '20%',
    baseY: '76%',
    size: 420,
    depth: 1.05,
    scrollFactor: 110,
    driftAmpX: 22,
    driftAmpY: 24,
    freqX: 0.2,
    freqY: 0.15,
    phase: 4.1,
    gradient:
      'radial-gradient(circle, rgba(232, 173, 38, 0.095) 0%, rgba(224, 35, 28, 0.025) 48%, transparent 72%)',
  },
  {
    id: 'orb-vermilion-se',
    baseX: '84%',
    baseY: '78%',
    size: 460,
    depth: 0.8,
    scrollFactor: -90,
    driftAmpX: 26,
    driftAmpY: 20,
    freqX: 0.18,
    freqY: 0.23,
    phase: 5.2,
    gradient:
      'radial-gradient(circle, rgba(224, 35, 28, 0.1) 0%, rgba(232, 173, 38, 0.03) 46%, transparent 72%)',
  },
];

export default function FloatingAtmosphere({
  pointerOffsetRef,
  scrollProgress,
}: FloatingAtmosphereProps) {
  const [reducedMotion, setReducedMotion] = useState(false);
  const orbRefs = useRef<(HTMLDivElement | null)[]>([]);
  const scrollProgressRef = useRef(scrollProgress);

  useEffect(() => {
    scrollProgressRef.current = scrollProgress;
  }, [scrollProgress]);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  useEffect(() => {
    if (reducedMotion) return;

    let smoothPointerX = 0;
    let smoothPointerY = 0;
    let smoothScroll = scrollProgressRef.current;
    let lastTime = performance.now();
    let rafId = 0;

    const tick = (now: number) => {
      const dt = Math.min((now - lastTime) / 1000, 0.05);
      lastTime = now;
      const elapsed = now * 0.001;

      const pointerLerp = 1 - Math.exp(-4.8 * dt);
      const scrollLerp = 1 - Math.exp(-6.5 * dt);

      smoothPointerX += (pointerOffsetRef.current.x - smoothPointerX) * pointerLerp;
      smoothPointerY += (pointerOffsetRef.current.y - smoothPointerY) * pointerLerp;
      smoothScroll += (scrollProgressRef.current - smoothScroll) * scrollLerp;

      for (let i = 0; i < ATMOSPHERE_ORBS.length; i++) {
        const el = orbRefs.current[i];
        if (!el) continue;

        const orb = ATMOSPHERE_ORBS[i];
        const driftX =
          Math.sin(elapsed * orb.freqX + orb.phase) * orb.driftAmpX;
        const driftY =
          Math.cos(elapsed * orb.freqY + orb.phase * 1.3) * orb.driftAmpY;

        const mouseX = smoothPointerX * -40 * orb.depth;
        const mouseY = smoothPointerY * -28 * orb.depth;
        const scrollY = (smoothScroll - 0.5) * orb.scrollFactor;
        const breathScale = 1 + Math.sin(elapsed * 0.32 + orb.phase) * 0.06;

        const totalX = driftX + mouseX;
        const totalY = driftY + mouseY + scrollY;

        el.style.transform = `translate3d(-50%, -50%, 0) translate3d(${totalX.toFixed(
          2
        )}px, ${totalY.toFixed(2)}px, 0) scale(${breathScale.toFixed(4)})`;
      }

      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [pointerOffsetRef, reducedMotion]);

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-[2] overflow-hidden"
    >
      {ATMOSPHERE_ORBS.map((orb, index) => (
        <div
          key={orb.id}
          ref={(el) => {
            orbRefs.current[index] = el;
          }}
          className="absolute rounded-full will-change-transform"
          style={{
            left: orb.baseX,
            top: orb.baseY,
            width: `${orb.size}px`,
            height: `${orb.size}px`,
            background: orb.gradient,
            transform: 'translate3d(-50%, -50%, 0)',
          }}
        />
      ))}
    </div>
  );
}
