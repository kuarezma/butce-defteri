import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/favicon-16.png', 'icons/favicon-32.png'],
      manifest: {
        name: 'Bütçe Defteri',
        short_name: 'Bütçe',
        description: 'Aylık gelir gider takibi: kategori kırılımı, tekrarlayan işlemler, bütçe limitleri.',
        lang: 'tr',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        background_color: '#0a0b0f',
        theme_color: '#0a0b0f',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: '/icons/icon-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico}'],
      },
    }),
  ],
});
