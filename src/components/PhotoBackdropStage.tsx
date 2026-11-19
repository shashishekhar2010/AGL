import { useEffect, useRef, useState } from 'react';

interface PhotoBackdropStageProps {
  scrollProgress: number;
  pointerOffsetRef: React.MutableRefObject<{ x: number; y: number }>;
}

export default function PhotoBackdropStage({
  scrollProgress,
  pointerOffsetRef,
}: PhotoBackdropStageProps) {
  const [reducedMotion, setReducedMotion] = useState(false);
  const washRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(mq.matches);
    const handler = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  useEffect(() => {
    if (reducedMotion) return;

    let currentX = 0;
    let currentY = 0;
    let lastTime = performance.now();
    let rafId = 0;

    const tick = (now: number) => {
      const dt = Math.min((now - lastTime) / 1000, 0.05);
      lastTime = now;

      const lerp = 1 - Math.exp(-4.5 * dt);
      const targetX = pointerOffsetRef.current.x * -18;
      const targetY = pointerOffsetRef.current.y * -12;

      currentX += (targetX - currentX) * lerp;
      currentY += (targetY - currentY) * lerp;

      if (washRef.current) {
        washRef.current.style.transform = `translate3d(${currentX.toFixed(
          2
        )}px, ${currentY.toFixed(2)}px, 0)`;
      }

      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [pointerOffsetRef, reducedMotion]);

  const subtleAccentShift = Math.sin(scrollProgress * Math.PI);

  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 z-0 pointer-events-none overflow-hidden bg-[#05070a]"
    >
      {/* Subtle reactive dark slate atmospheric base — individual sections own their single photo parallax */}
      <div
        ref={washRef}
        className="absolute -inset-8 will-change-transform"
        style={{
          background: `radial-gradient(85% 65% at 50% ${(
            35 +
            subtleAccentShift * 18
          ).toFixed(1)}%, rgba(16, 24, 36, 0.45) 0%, rgba(5, 7, 10, 0) 75%)`,
        }}
      />

      {/* Edge vignette */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(125% 95% at 50% 45%, transparent 40%, rgba(2, 4, 6, 0.72) 100%)',
        }}
      />

      {/* Subtle architectural film grain */}
      <div
        className="absolute inset-0 opacity-[0.035] mix-blend-overlay"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 180 180' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
          backgroundRepeat: 'repeat',
          backgroundSize: '180px 180px',
        }}
      />
    </div>
  );
}
