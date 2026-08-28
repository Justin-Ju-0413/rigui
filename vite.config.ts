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
  server: {
    host: true,
    // 开发代理：浏览器跨域访问第三方 LLM 端点会被 CORS 拦截，
    // 配置 baseUrl 为 http://localhost:5175/llm/zen/v1 时经此代理转发（仅 dev 生效）
    proxy: {
      '/llm': {
        target: 'https://opencode.ai',
        changeOrigin: true,
        rewrite: p => p.replace(/^\/llm/, ''),
        configure: (proxy) => {
          // 部分 LLM 端点检测到 Origin 头即拒绝（防网页盗用），转发时剥离
          proxy.on('proxyReq', proxyReq => {
            proxyReq.removeHeader('origin')
          })
        },
      },
    },
  },
}))
