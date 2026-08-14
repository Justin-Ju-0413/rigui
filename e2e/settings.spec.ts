import { expect, test } from '@playwright/test'

async function clearDb(page: import('@playwright/test').Page) {
  await page.goto('/')
  await page.evaluate(() => indexedDB.deleteDatabase('rigui'))
  await page.reload()
}

test('设置页：周报推送默认开启，修改时间并保存后回填', async ({ page }) => {
  await clearDb(page)
  await page.goto('/settings')
  const checkbox = page.getByLabel('启用周报推送')
  await expect(checkbox).toBeChecked()
  await expect(page.getByLabel('周报推送时间')).toHaveValue('20:00')
  await page.getByLabel('周报推送时间').fill('21:30')
  await page.getByRole('button', { name: '保存周报设置' }).click()
  await expect(page.getByTestId('report-msg')).toHaveText('周报设置已保存')
  await page.reload()
  await expect(page.getByLabel('周报推送时间')).toHaveValue('21:30')
})

test('设置页：可关闭周报推送并持久化', async ({ page }) => {
  await clearDb(page)
  await page.goto('/settings')
  await page.getByLabel('启用周报推送').uncheck()
  await page.getByRole('button', { name: '保存周报设置' }).click()
  await expect(page.getByTestId('report-msg')).toHaveText('周报设置已保存')
  await page.reload()
  await expect(page.getByLabel('启用周报推送')).not.toBeChecked()
})
