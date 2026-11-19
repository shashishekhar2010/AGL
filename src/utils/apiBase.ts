/**
 * Resolves API and WebSocket URLs cleanly for both:
 * 1. Same-origin full-stack deployments (local Node server / AI Studio / Render / VPS)
 * 2. Static GitHub Pages deployments connecting to an external Node backend via VITE_API_BASE_URL
 */
const RAW_API_BASE = (import.meta.env.VITE_API_BASE_URL || '').trim().replace(/\/+$/, '');

export function getApiBaseUrl(): string {
  return RAW_API_BASE;
}

export function resolveApiUrl(path: string): string {
  if (/^https?:\/\//i.test(path)) {
    return path;
  }
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return RAW_API_BASE ? `${RAW_API_BASE}${normalizedPath}` : normalizedPath;
}

export function resolveWsUrl(path: string): string {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  if (RAW_API_BASE) {
    const wsBase = RAW_API_BASE.replace(/^http:\/\//i, 'ws://').replace(
      /^https:\/\//i,
      'wss://'
    );
    return `${wsBase}${normalizedPath}`;
  }
  if (typeof window === 'undefined') {
    return normalizedPath;
  }
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${protocol}//${window.location.host}${normalizedPath}`;
}

/**
 * Resolves a public/static asset relative to Vite's BASE_URL so assets load
 * cleanly both at "/" and under GitHub Pages project subpaths like "/repo-name/".
 */
export function resolveAssetUrl(relativePath: string): string {
  if (/^(https?:|data:|blob:)/i.test(relativePath)) {
    return relativePath;
  }
  const base = import.meta.env.BASE_URL || '/';
  const cleanedBase = base.endsWith('/') ? base : `${base}/`;
  const cleanedPath = relativePath.replace(/^\/+/, '');
  return `${cleanedBase}${cleanedPath}`;
}
