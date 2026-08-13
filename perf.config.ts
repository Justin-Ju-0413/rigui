// 性能基准独立配置（与主 e2e 套件隔离，避免 FPS 断言影响功能测试）
import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './perf',
  fullyParallel: true,
  use: { baseURL: 'http://localhost:4173' },
  webServer: {
    command: 'npm run preview',
    port: 4173,
    reuseExistingServer: true,
  },
  projects: [{
    name: 'perf-chrome',
    use: {
      viewport: devices['Pixel 7'].viewport,
      deviceScaleFactor: devices['Pixel 7'].deviceScaleFactor,
    },
  }],
})
