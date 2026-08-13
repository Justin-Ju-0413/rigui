// 性能基准：液态玻璃分层预算 + 帧率（npm run perf）
// 独立于主 e2e 套件（playwright.config testDir 为 e2e/），headless 无 GPU 故阈值留余量
import { test, expect } from '@playwright/test'
import type { Page } from '@playwright/test'

const THRESHOLD_FPS = 45

async function measureFps(page: Page, durationMs: number): Promise<number> {
  return page.evaluate((duration) => new Promise<number>((resolve) => {
    let frames = 0
    const start = performance.now()
    function tick() {
      frames++
      if (performance.now() - start < duration) requestAnimationFrame(tick)
      else resolve(frames / (duration / 1000))
    }
    requestAnimationFrame(tick)
  }), durationMs)
}

async function seedEvents(page: Page, count = 40) {
  await page.goto('/')
  await page.evaluate(async (n) => {
    const now = new Date()
    const ym = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
    await new Promise<void>((resolve) => {
      const req = indexedDB.open('rigui')
      req.onerror = () => resolve()
      req.onsuccess = () => {
        const db = req.result
        const tx = db.transaction('events', 'readwrite')
        const store = tx.objectStore('events')
        for (let i = 0; i < n; i++) {
          const d = String(1 + (i % 28)).padStart(2, '0')
          const h = String(8 + (i % 10)).padStart(2, '0')
          store.add({
            title: `性能事件${i}`,
            startTime: `${ym}-${d}T${h}:00:00`,
            endTime: `${ym}-${d}T${h}:30:00`,
            allDay: false,
            reminderOffsets: [],
            repeat: 'none',
            completed: false,
            createdAt: new Date().toISOString(),
          })
        }
        tx.oncomplete = () => resolve()
      }
    })
  }, count)
  await page.reload()
}

test('液态玻璃层预算（结构性）：blur 悬浮层 ≤3 + 背景唯一', async ({ page }) => {
  await page.goto('/')
  const counts = await page.evaluate(() => ({
    aurora: document.querySelectorAll('.aurora-bg').length,
    glass: document.querySelectorAll('.card-glass').length,
    frosted: document.querySelectorAll('.frosted').length,
  }))
  expect(counts.aurora).toBe(1)
  expect(counts.glass + counts.frosted).toBeLessThanOrEqual(3)
})

test('月视图渲染 + 极光动画 FPS', async ({ page }) => {
  await seedEvents(page)
  await page.goto('/')
  const fps = await measureFps(page, 2000)
  console.log(`[perf] month-view fps=${fps.toFixed(1)}`)
  expect(fps).toBeGreaterThanOrEqual(THRESHOLD_FPS)
})

test('列表滚动 FPS + longtask', async ({ page }) => {
  await seedEvents(page)
  await page.goto('/list')
  const result = await page.evaluate((duration) => new Promise<{ fps: number; longTasks: number }>((resolve) => {
    let frames = 0
    let longTasks = 0
    const start = performance.now()
    const obs = new PerformanceObserver((list) => { longTasks += list.getEntries().length })
    obs.observe({ entryTypes: ['longtask'] })
    function tick() {
      frames++
      if (performance.now() - start < duration) {
        window.scrollBy(0, 120)
        requestAnimationFrame(tick)
      } else {
        obs.disconnect()
        resolve({ fps: frames / (duration / 1000), longTasks })
      }
    }
    requestAnimationFrame(tick)
  }), 2000)
  console.log(`[perf] list-scroll fps=${result.fps.toFixed(1)} longtasks=${result.longTasks}`)
  expect(result.fps).toBeGreaterThanOrEqual(THRESHOLD_FPS)
  expect(result.longTasks).toBe(0)
})
