import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';
import {defineConfig} from 'vite';

function normalizeBasePath(raw?: string): string {
  if (!raw || raw.trim() === '') return '/';
  const trimmed = raw.trim();
  if (trimmed === './' || trimmed === '.') return './';
  const withLeading = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  return withLeading.endsWith('/') ? withLeading : `${withLeading}/`;
}

export default defineConfig(() => {
  const base = normalizeBasePath(process.env.VITE_BASE_PATH);

  return {
    base,
    plugins: [
      react(),
      tailwindcss(),
      // Copies src/assets into dist/ and generates GitHub Pages SPA helpers
      // (dist/404.html fallback for /about & /admin, plus dist/.nojekyll).
      {
        name: 'alorix-build-assets-and-gh-pages',
        apply: 'build',
        closeBundle(error?: Error): void {
          if (error) {
            return;
          }
          const distDir = path.resolve(__dirname, 'dist');
          const srcAssets = path.resolve(__dirname, 'src/assets');
          const distAssets = path.resolve(distDir, 'src/assets');
          if (fs.existsSync(distDir) && fs.existsSync(srcAssets)) {
            fs.cpSync(srcAssets, distAssets, {recursive: true, force: true});
          }

          // GitHub Pages SPA support: serve index.html on 404 routes (/about, /admin)
          const indexHtml = path.join(distDir, 'index.html');
          const fallback404 = path.join(distDir, '404.html');
          if (fs.existsSync(indexHtml)) {
            fs.copyFileSync(indexHtml, fallback404);
          }

          // Disable Jekyll processing on GitHub Pages so all static assets resolve cleanly
          const noJekyll = path.join(distDir, '.nojekyll');
          if (fs.existsSync(distDir)) {
            fs.writeFileSync(noJekyll, '');
          }
        },
      },
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
