import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  base: '/travel/',
  optimizeDeps: {
    // Firebase 모듈이 별도 청크로 최적화되면 "Component X has not been
    // registered yet" 오류가 발생하므로 함께 묶어 전달한다.
    include: ['firebase/app', 'firebase/auth', 'firebase/firestore'],
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: '여행 일정',
        short_name: '여행 일정',
        description: '여행 스케줄 등록 및 확인 앱',
        theme_color: '#007aff',
        background_color: '#ffffff',
        display: 'standalone',
        start_url: '/travel/',
        scope: '/travel/',
        icons: [
          { src: 'pwa-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'pwa-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
    }),
  ],
})
