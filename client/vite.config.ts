import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'path';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'mask-icon.svg'],
      manifest: {
        name: 'Aurelius - Stoic Journal',
        short_name: 'Aurelius',
        description: 'Personal Stoic journaling app with AI-powered reflection',
        theme_color: '#1A1A2E',
        background_color: '#1A1A2E',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',
        start_url: '/',
        icons: [
          {
            src: '/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: '/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: '/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        // Don't precache index.html - always fetch fresh from network
        globPatterns: ['**/*.{js,css,ico,png,svg,woff2}'],
        // Take control immediately when new SW is available
        skipWaiting: true,
        clientsClaim: true,
        // Use network-first for navigation (HTML) requests
        navigateFallback: null,
        runtimeCaching: [
          {
            // Cache API responses with network-first strategy
            urlPattern: /\/api\//i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60, // 1 hour
              },
              networkTimeoutSeconds: 10,
            },
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
      '/audio': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
});
