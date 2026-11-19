import type { PointerEvent } from 'react';

export function handleSpotlightMove(e: PointerEvent<HTMLElement>) {
  if (e.pointerType !== 'mouse') return;
  const el = e.currentTarget;
  const rect = el.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  el.style.setProperty('--mx', `${x.toFixed(0)}px`);
  el.style.setProperty('--my', `${y.toFixed(0)}px`);
  el.style.setProperty('--spot-opacity', '1');
}

export function handleSpotlightLeave(e: PointerEvent<HTMLElement>) {
  e.currentTarget.style.setProperty('--spot-opacity', '0');
}
