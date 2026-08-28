import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  // 功能 e2e 一律绕过 Service Worker（navigation precache 的 skipWaiting+claim 会
  // 在 reload 时接管导航导致 ERR_ABORTED/超时 flake）；PWA 离线行为单测/静态验证覆盖
  use: { baseURL: 'http://localhost:4173', serviceWorkers: 'block' },
  webServer: {
    command: 'npm run preview',
    port: 4173,
    reuseExistingServer: true,
  },
  projects: [{
    // 移动宽度视口（Pixel 7 尺寸）。不用 isMobile/hasTouch：
    // Playwright 的 isMobile 模拟下 getContentQuads 坐标系与元素命中检测不一致，
    // 会导致「确认创建」等按钮点击被误判为拦截（见 feat/claude-style 分支的排查）。
    name: 'mobile-chrome',
    use: {
      viewport: devices['Pixel 7'].viewport,
      deviceScaleFactor: devices['Pixel 7'].deviceScaleFactor,
    },
  }],
})
