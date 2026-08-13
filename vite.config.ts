import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig(({ mode }) => ({
  // 相对路径：Electron 以 file:// 加载 dist 时需要；浏览器部署于子路径也兼容
  base: './',
  // e2e/性能基准（--mode test）从空目录加载 env，隔离 .env.local 的 LLM 默认值，保持环境无关
  envDir: mode === 'test' ? 'env-test' : '.',
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      strategies: 'injectManifest',
      srcDir: 'public',
      filename: 'sw.js',
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: '日规 rigui',
        short_name: '日规',
        description: 'AI 日程计划',
        display: 'standalone',
        start_url: '/',
        theme_color: '#4f46e5',
        background_color: '#ffffff',
        icons: [{ src: 'favicon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' }],
      },
    }),
  ],
  server: { host: true },
}))
