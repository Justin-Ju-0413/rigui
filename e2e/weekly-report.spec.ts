import { expect, test } from '@playwright/test'

async function clearDb(page: import('@playwright/test').Page) {
  await page.goto('/')
  // open + 清空所有表（避免 deleteDatabase 与 Dexie 打开连接竞争被 blocked）
  await page.evaluate(() => new Promise<void>((resolve, reject) => {
    const req = indexedDB.open('rigui')
    req.onerror = () => reject(req.error)
    req.onsuccess = () => {
      const d = req.result
      const names = [...d.objectStoreNames]
      const tx = d.transaction(names, 'readwrite')
      for (const n of names) tx.objectStore(n).clear()
      tx.oncomplete = () => { d.close(); resolve() }
      tx.onerror = () => reject(tx.error)
    }
  }))
  await page.reload()
}

async function seedConfig(page: import('@playwright/test').Page) {
  await page.goto('/settings')
  await page.getByLabel('API 地址').fill('https://mock.local/v1')
  await page.getByLabel('API Key').fill('sk-test')
  await page.getByLabel('模型').fill('test-model')
  await page.getByRole('button', { name: '保存', exact: true }).click()
  // 等待写入落库（async 保存，直接导航会丢写）
  await expect(page.getByTestId('status')).toContainText('已保存')
}

test('周报卡片：统计渲染 + 完成率 + AI 分析全流程', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-08-10T08:00:00') })
  await clearDb(page)

  // 手动创建两个事件（不同时段，避免冲突拦截），勾选一个完成
  await page.goto('/day?date=2026-08-10')
  const seeds: Array<[string, string]> = [['周会', '2026-08-10T09:00'], ['健身', '2026-08-10T10:00']]
  for (const [title, start] of seeds) {
    await page.getByRole('button', { name: '新建' }).click()
    await page.getByLabel('标题').fill(title)
    await page.getByLabel('开始时间').fill(start)
    await page.getByRole('button', { name: '保存', exact: true }).click()
  }
  // 勾选完成：等待写入落库再导航（click 后立即 goto 会中断未完成的 IndexedDB 事务）
  const weeklyItem = page.locator('[data-testid^="event-item-"]').filter({ hasText: '周会' })
  await weeklyItem.getByLabel('完成').click()
  await expect(weeklyItem.getByLabel('完成')).toBeChecked()

  // 月视图：简报卡统计
  await page.goto('/month')
  const card = page.getByTestId('weekly-report')
  await expect(card).toBeVisible()
  await expect(page.getByTestId('weekly-report-overview')).toContainText('共 2 项')
  await expect(page.getByTestId('weekly-report-overview')).toContainText('完成 1')

  // AI 分析（mock LLM）
  await seedConfig(page)
  await page.route('**/chat/completions', route =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({
      choices: [{ message: { content: '本周共 2 项日程，完成率 50%，建议为下周预留更多空闲。' } }],
    }) }))
  await page.goto('/month')
  await page.getByTestId('weekly-report-ai').click()
  await expect(page.getByTestId('weekly-report-ai-text')).toContainText('完成率 50%')
})

test('周报卡片：空周空态 + 未配置 LLM 提示', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-08-10T08:00:00') })
  await clearDb(page)
  await page.goto('/month')
  await expect(page.getByTestId('weekly-report-empty')).toBeVisible()
  await expect(page.getByTestId('weekly-report-ai')).toBeDisabled()
})