import type { PointerEvent as ReactPointerEvent } from 'react';

const canTilt = () =>
  typeof window !== 'undefined' &&
  window.matchMedia('(pointer: fine)').matches &&
  !window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export function handleTiltMove(
  e: ReactPointerEvent<HTMLElement>,
  maxDegrees = 3
) {
  if (!canTilt()) return;
  const el = e.currentTarget;
  const rect = el.getBoundingClientRect();
  if (!rect.width || !rect.height) return;

  const nx = (e.clientX - rect.left) / rect.width - 0.5;
  const ny = (e.clientY - rect.top) / rect.height - 0.5;

  const rotateY = (nx * 2 * maxDegrees).toFixed(2);
  const rotateX = (-ny * 2 * maxDegrees).toFixed(2);

  el.style.setProperty('--rx', `${rotateX}deg`);
  el.style.setProperty('--ry', `${rotateY}deg`);
  el.style.setProperty('--tz', '1.012');
}

export function handleTiltLeave(e: ReactPointerEvent<HTMLElement>) {
  const el = e.currentTarget;
  el.style.setProperty('--rx', '0deg');
  el.style.setProperty('--ry', '0deg');
  el.style.setProperty('--tz', '1');
}
