import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['images/logo.png', 'images/android-chrome-192x192.png', 'images/android-chrome-512x512.png'],
      manifest: {
        name: 'SGP — Gestión de Proveedores DASAVENA',
        short_name: 'SGP DASAVENA',
        description: 'Sistema de Gestión de Proveedores para DASAVENA',
        theme_color: '#7C3AED',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'portrait-primary',
        scope: '/',
        start_url: '/',
        lang: 'es',
        icons: [
          {
            src: '/images/android-chrome-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any maskable',
          },
          {
            src: '/images/android-chrome-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',
          },
        ],
        shortcuts: [
          {
            name: 'Calendario de Citas',
            short_name: 'Citas',
            url: '/appointments',
            icons: [{ src: '/images/android-chrome-192x192.png', sizes: '192x192' }],
          },
          {
            name: 'Proveedores',
            short_name: 'Proveedores',
            url: '/providers',
            icons: [{ src: '/images/android-chrome-192x192.png', sizes: '192x192' }],
          },
        ],
      },
      workbox: {
        // Cachear assets estáticos
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        // Rutas que siempre van a la red (API)
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api/],
        runtimeCaching: [
          {
            // Cachear llamadas GET a la API por 5 minutos
            urlPattern: /^https?:\/\/.*\/api\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 5 * 60, // 5 minutos
              },
              networkTimeoutSeconds: 10,
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          {
            // Cachear imágenes
            urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp)$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'images-cache',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 30 * 24 * 60 * 60, // 30 días
              },
            },
          },
        ],
      },
      devOptions: {
        enabled: false, // Solo activo en producción
      },
    }),
  ],
})