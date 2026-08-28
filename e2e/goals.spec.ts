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

test('目标任务排期全流程：新建(拆任务) → 排期一周 → 预览确认 → 月视图可见任务', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-08-10T08:00:00') })
  await clearDb(page)
  await page.goto('/goals')
  await page.getByRole('button', { name: '新建目标' }).click()
  await page.getByLabel('目标名称').fill('学英语')
  await page.getByLabel('任务名 1').fill('背单词')
  await page.getByLabel('每周次数 1').fill('2')
  await page.getByLabel('单次时长 1').fill('60')
  await page.getByRole('button', { name: '保存' }).click()
  await expect(page.getByText('学英语')).toBeVisible()
  await page.getByTestId('task-schedule-btn').first().click()
  await expect(page.getByTestId('schedule-preview')).toBeVisible()
  await expect(page.getByTestId('schedule-item')).toHaveCount(2)
  await page.getByRole('button', { name: '全部确认' }).click()
  await expect(page.getByTestId('schedule-preview')).toBeHidden()
  await page.goto('/month')
  await expect(page.getByTestId('month-cell-2026-08-10')).toContainText('背单词')
  await expect(page.getByTestId('month-cell-2026-08-11')).toContainText('背单词')
})

test('目标删除级联：删除目标后任务不留在月视图', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-08-10T08:00:00') })
  await clearDb(page)
  await page.goto('/goals')
  await page.getByRole('button', { name: '新建目标' }).click()
  await page.getByLabel('目标名称').fill('健身')
  await page.getByLabel('任务名 1').fill('跑步')
  await page.getByRole('button', { name: '保存' }).click()
  await page.getByTestId('task-schedule-btn').first().click()
  await expect(page.getByTestId('schedule-item')).toHaveCount(1)
  await page.getByRole('button', { name: '全部确认' }).click()
  await page.getByRole('button', { name: '删除目标' }).click()
  await expect(page.getByTestId('goal-delete-confirm')).toBeVisible()
  await page.getByRole('button', { name: '确认删除' }).click()
  await expect(page.getByTestId('goal-delete-confirm')).toBeHidden()
  await expect(page.getByRole('heading', { name: '健身' })).toBeHidden()
  await page.goto('/month')
  await expect(page.getByTestId('month-cell-2026-08-10')).not.toContainText('跑步')
})

test('任务删除级联：删除任务后其事件消失、其他任务保留', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-08-10T08:00:00') })
  await clearDb(page)
  await page.goto('/goals')
  await page.getByRole('button', { name: '新建目标' }).click()
  await page.getByLabel('目标名称').fill('学英语')
  await page.getByLabel('任务名 1').fill('背单词')
  await page.getByRole('button', { name: '添加任务' }).click()
  await page.getByLabel('任务名 2').fill('听力')
  await page.getByRole('button', { name: '保存' }).click()
  await expect(page.getByText('学英语')).toBeVisible()
  // 两个任务各自排期一周
  await page.getByTestId('task-schedule-btn').first().click()
  await expect(page.getByTestId('schedule-item')).toHaveCount(1)
  await page.getByRole('button', { name: '全部确认' }).click()
  await page.getByTestId('task-schedule-btn').nth(1).click()
  await expect(page.getByTestId('schedule-item')).toHaveCount(1)
  await page.getByRole('button', { name: '全部确认' }).click()
  await expect(page.getByTestId('schedule-preview')).toBeHidden()
  // 删除「背单词」任务 → 级联确认
  await page.getByRole('button', { name: '删除任务 背单词' }).click()
  await expect(page.getByTestId('task-delete-confirm')).toContainText('将同时删除 1 条关联事件')
  await page.getByRole('button', { name: '确认删除任务' }).click()
  await expect(page.getByTestId('task-delete-confirm')).toBeHidden()
  await expect(page.locator('[data-testid^="task-row-"]', { hasText: '背单词' })).toHaveCount(0)
  await expect(page.locator('[data-testid^="task-row-"]', { hasText: '听力' })).toHaveCount(1)
  // 月视图：背单词事件消失，听力保留
  await page.goto('/month')
  await expect(page.getByTestId('month-cell-2026-08-10')).not.toContainText('背单词')
  await expect(page.getByTestId('month-cell-2026-08-10')).toContainText('听力')
})