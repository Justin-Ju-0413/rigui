import { defineConfig, configDefaults } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    exclude: [...configDefaults.exclude, 'e2e/**', 'perf/**'],
    // flaky 根因（2026-08 调查）：交互重用例（userEvent + 页面级渲染 + fake-indexeddb）
    // 在机器被并发抢占时偶发超过默认 5s testTimeout（单独/正常跑均 ~6s 全绿）。
    // 提高超时容错，使偶发负载不再把套件打死；hookTimeout 同步放宽。
    testTimeout: 15000,
    hookTimeout: 30000,
  },
})
