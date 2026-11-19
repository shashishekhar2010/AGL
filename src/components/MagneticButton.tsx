import { useRef, type ButtonHTMLAttributes, type ReactNode } from 'react';

interface MagneticButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  strength?: number;
}

export default function MagneticButton({
  children,
  className = '',
  strength = 0.24,
  onPointerMove,
  onPointerLeave,
  ...rest
}: MagneticButtonProps) {
  const btnRef = useRef<HTMLButtonElement | null>(null);

  const handleMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (
      e.pointerType === 'mouse' &&
      btnRef.current &&
      !window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      const rect = btnRef.current.getBoundingClientRect();
      const dx = (e.clientX - (rect.left + rect.width / 2)) * strength;
      const dy = (e.clientY - (rect.top + rect.height / 2)) * strength;
      const clampedX = Math.max(-8, Math.min(8, dx));
      const clampedY = Math.max(-6, Math.min(6, dy));
      btnRef.current.style.transform = `translate3d(${clampedX.toFixed(1)}px, ${clampedY.toFixed(1)}px, 0)`;
    }
    onPointerMove?.(e);
  };

  const handleLeave = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (btnRef.current) {
      btnRef.current.style.transform = 'translate3d(0, 0, 0)';
    }
    onPointerLeave?.(e);
  };

  return (
    <button
      ref={btnRef}
      onPointerMove={handleMove}
      onPointerLeave={handleLeave}
      className={`transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] will-change-transform ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}
