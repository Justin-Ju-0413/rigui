import { expect, test } from '@playwright/test'

const LLM_OK = {
  choices: [{ message: { content: JSON.stringify({ title: '和老王开会', startTime: '2026-08-11T15:00:00', endTime: '2026-08-11T16:00:00', location: '会议室A' }) } }],
}

async function mockLlm(page: import('@playwright/test').Page) {
  await page.route('**/chat/completions', route =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(LLM_OK) }))
}

async function seedConfig(page: import('@playwright/test').Page) {
  await page.goto('/settings')
  await page.getByLabel('API 地址').fill('https://mock.local/v1')
  await page.getByLabel('API Key').fill('sk-test')
  await page.getByLabel('模型').fill('test-model')
  await page.getByRole('button', { name: '保存' }).click()
}

test('自然语言创建日程全流程：输入→预览→确认→月视图可见', async ({ page }) => {
  await mockLlm(page)
  await seedConfig(page)
  await page.goto('/')
  await page.getByRole('button', { name: 'AI 输入' }).click()
  await page.getByLabel('描述你的日程').fill('下周二下午3点和老王开会')
  await page.getByRole('button', { name: '解析' }).click()
  await expect(page.getByTestId('preview-card')).toBeVisible()
  await expect(page.getByTestId('preview-card').getByText('和老王开会')).toBeVisible()
  await page.getByRole('button', { name: '确认创建' }).click()
  await expect(page.getByTestId('ai-panel')).toBeHidden()
  await expect(page.getByTestId('month-cell-2026-08-11')).toContainText('和老王开会')
})

test('AI 解析失败展示错误且不创建', async ({ page }) => {
  await page.route('**/chat/completions', route => route.abort())
  await seedConfig(page)
  await page.goto('/')
  await page.getByRole('button', { name: 'AI 输入' }).click()
  await page.getByLabel('描述你的日程').fill('开会')
  await page.getByRole('button', { name: '解析' }).click()
  await expect(page.getByTestId('parse-error')).toBeVisible()
})

test('未配置 LLM 时提示', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'AI 输入' }).click()
  await expect(page.getByText(/请先在设置/)).toBeVisible()
})
