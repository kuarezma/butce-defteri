import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

// GitHub Pages proje sayfası köke değil /butce-defteri/ altına deploy eder.
// Yerel geliştirmede (`npm run dev`) kök yolda kalması için ortam değişkeniyle koşullu.
const base = process.env.GITHUB_PAGES ? '/butce-defteri/' : '/';

export default defineConfig({
  base,
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/favicon-16.png', 'icons/favicon-32.png'],
      manifest: {
        name: 'Bütçe Defteri',
        short_name: 'Bütçe',
        description: 'Aylık gelir gider takibi: kategori kırılımı, tekrarlayan işlemler, bütçe limitleri.',
        lang: 'tr',
        start_url: base,
        scope: base,
        display: 'standalone',
        background_color: '#0a0b0f',
        theme_color: '#0a0b0f',
        icons: [
          { src: `${base}icons/icon-192.png`, sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: `${base}icons/icon-512.png`, sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: `${base}icons/icon-512-maskable.png`, sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico}'],
      },
    }),
  ],
});
