import { useEffect, useRef, useState } from 'react';

export default function CursorAmbientFollower() {
  const [enabled, setEnabled] = useState(false);
  const ringRef = useRef<HTMLDivElement | null>(null);
  const dotRef = useRef<HTMLDivElement | null>(null);
  const glowRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const finePointer = window.matchMedia('(pointer: fine)').matches;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!finePointer || reducedMotion) return;

    setEnabled(true);

    let targetX = window.innerWidth * 0.5;
    let targetY = window.innerHeight * 0.5;
    let ringX = targetX;
    let ringY = targetY;
    let glowX = targetX;
    let glowY = targetY;
    let hoveringInteractive = false;
    let pressing = false;
    let visible = false;
    let rafId = 0;

    const onMove = (e: PointerEvent) => {
      targetX = e.clientX;
      targetY = e.clientY;
      visible = true;

      const el = e.target as HTMLElement | null;
      hoveringInteractive = Boolean(
        el?.closest('a, button, input, textarea, [role="button"], [data-interactive]')
      );
    };

    const onDown = () => {
      pressing = true;
    };
    const onUp = () => {
      pressing = false;
    };
    const onLeave = () => {
      visible = false;
    };

    window.addEventListener('pointermove', onMove, { passive: true });
    window.addEventListener('pointerdown', onDown, { passive: true });
    window.addEventListener('pointerup', onUp, { passive: true });
    document.addEventListener('mouseleave', onLeave);

    let lastTime = performance.now();

    const tick = (now: number) => {
      const dt = Math.min((now - lastTime) / 1000, 0.05);
      lastTime = now;

      const ringLerp = 1 - Math.exp(-14 * dt);
      const glowLerp = 1 - Math.exp(-6.5 * dt);

      ringX += (targetX - ringX) * ringLerp;
      ringY += (targetY - ringY) * ringLerp;
      glowX += (targetX - glowX) * glowLerp;
      glowY += (targetY - glowY) * glowLerp;

      if (dotRef.current) {
        dotRef.current.style.opacity = visible ? '1' : '0';
        dotRef.current.style.transform = `translate3d(${targetX}px, ${targetY}px, 0) translate(-50%, -50%) scale(${
          pressing ? 0.75 : 1
        })`;
      }

      if (ringRef.current) {
        const scale = pressing ? 0.8 : hoveringInteractive ? 1.65 : 1;
        ringRef.current.style.opacity = visible ? '1' : '0';
        ringRef.current.style.borderColor = hoveringInteractive
          ? 'rgba(232, 173, 38, 0.78)'
          : 'rgba(223, 231, 224, 0.38)';
        ringRef.current.style.backgroundColor = hoveringInteractive
          ? 'rgba(224, 35, 28, 0.08)'
          : 'transparent';
        ringRef.current.style.transform = `translate3d(${ringX}px, ${ringY}px, 0) translate(-50%, -50%) scale(${scale})`;
      }

      if (glowRef.current) {
        glowRef.current.style.opacity = visible ? '1' : '0';
        glowRef.current.style.transform = `translate3d(${glowX}px, ${glowY}px, 0) translate(-50%, -50%)`;
      }

      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointerup', onUp);
      document.removeEventListener('mouseleave', onLeave);
    };
  }, []);

  if (!enabled) return null;

  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-50 overflow-hidden">
      {/* Soft ambient cursor spotlight */}
      <div
        ref={glowRef}
        className="fixed top-0 left-0 w-[440px] h-[440px] rounded-full opacity-0 transition-opacity duration-300"
        style={{
          background:
            'radial-gradient(circle, rgba(232, 173, 38, 0.09) 0%, rgba(224, 35, 28, 0.045) 38%, transparent 70%)',
        }}
      />

      {/* Damped outer reticle ring */}
      <div
        ref={ringRef}
        className="fixed top-0 left-0 w-8 h-8 rounded-full border opacity-0 transition-[opacity,border-color,background-color] duration-200"
      />

      {/* Crisp center reticle dot */}
      <div
        ref={dotRef}
        className="fixed top-0 left-0 w-1.5 h-1.5 rounded-full bg-[#e8ad26] opacity-0"
      />
    </div>
  );
}
