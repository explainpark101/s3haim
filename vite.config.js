import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  base: process.env.VITE_BASE_PATH || '/',
  plugins: [react(), tailwindcss(),
    VitePWA({
      injectRegister: 'auto',
      registerType: 'autoUpdate',
      includeAssets: ['vite.svg'],
      manifest: {
        name: 'S3 Haim - Markdown Notes',
        short_name: 'S3 Haim',
        description: 'S3에 저장하는 마크다운 메모 앱',
        theme_color: '#0f172a',
        background_color: '#0f172a',
        display: 'standalone',
        start_url: (process.env.VITE_BASE_PATH || '/').replace(/\/?$/, '/'),
        scope: (process.env.VITE_BASE_PATH || '/').replace(/\/?$/, '/'),
        icons: [
          {
            src: '/vite.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,png,svg,ico,json}'],
        maximumFileSizeToCacheInBytes: 8 * 1024 * 1024, // 8MB
        navigateFallback: (process.env.VITE_BASE_PATH || '/').replace(/\/?$/, '') + '/index.html',
      }
    })
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    }
  }
})