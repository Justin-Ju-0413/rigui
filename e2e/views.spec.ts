import { expect, test } from '@playwright/test'

async function clearDb(page: import('@playwright/test').Page) {
  await page.goto('/')
  await page.evaluate(() => indexedDB.deleteDatabase('rigui'))
  await page.reload()
}

test('底部导航在四个视图间切换', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByTestId('month-view')).toBeVisible()
  await page.locator('nav.fixed').getByText('列表').click()
  await expect(page.getByTestId('list-view')).toBeVisible()
  await page.locator('nav.fixed').getByText('设置').click()
  await expect(page.getByTestId('settings-view')).toBeVisible()
})

test('手动创建事件后在日视图与列表可见', async ({ page }) => {
  await clearDb(page)
  await page.goto('/day?date=2026-08-06')
  await page.getByRole('button', { name: '新建' }).click()
  await page.getByLabel('标题').fill('手动事件')
  await page.getByRole('button', { name: '保存' }).click()
  await expect(page.getByText('手动事件')).toBeVisible()
  await page.goto('/list')
  await expect(page.getByText('手动事件')).toBeVisible()
})

test('冲突事件在表单中提示', async ({ page }) => {
  await clearDb(page)
  await page.goto('/day?date=2026-08-06')
  await page.getByRole('button', { name: '新建' }).click()
  await page.getByLabel('标题').fill('第一个')
  await page.getByRole('button', { name: '保存' }).click()
  await page.getByRole('button', { name: '新建' }).click()
  await page.getByLabel('标题').fill('第二个')
  await page.getByRole('button', { name: '保存' }).click()
  await expect(page.getByTestId('conflict-list')).toBeVisible()
})
