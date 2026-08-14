import { expect, test } from '@playwright/test'
import dayjs from 'dayjs'

const day = dayjs().add(1, 'day').format('YYYY-MM-DD')

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

/** 按轮次返回 mock 回复(超出轮次用最后一轮) */
async function mockChat(page: import('@playwright/test').Page, replies: string[], bodies?: string[]) {
  let i = 0
  await page.route('**/chat/completions', route => {
    if (bodies) bodies.push(JSON.stringify(route.request().postDataJSON()))
    const content = replies[Math.min(i, replies.length - 1)]
    i++
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ choices: [{ message: { content } }] }) })
  })
}

async function seedConfig(page: import('@playwright/test').Page) {
  await page.goto('/settings')
  await page.getByLabel('API 地址').fill('https://mock.local/v1')
  await page.getByLabel('API Key').fill('sk-test')
  await page.getByLabel('模型').fill('test-model')
  await page.getByRole('button', { name: '保存', exact: true }).click()
  // 等待异步保存落库后再离开页面（否则 goto 卸载中断 IndexedDB 写入）
  await page.evaluate(() => new Promise<void>((resolve, reject) => {
    const poll = () => {
      const req = indexedDB.open('rigui')
      req.onerror = () => reject(req.error)
      req.onsuccess = () => {
        const d = req.result
        const tx = d.transaction('settings', 'readonly')
        const get = tx.objectStore('settings').get('llm_base_url')
        get.onsuccess = () => { d.close(); resolve() }
        get.onerror = () => { d.close(); reject(get.error) }
      }
    }
    poll()
  }))
}

test('对话创建日程全流程：输入→预览→确认→月视图可见', async ({ page }) => {
  await clearDb(page)
  await mockChat(page, [JSON.stringify({
    reply: '已为你安排明天的会。',
    actions: [{
      type: 'create_event',
      payload: { title: '和老王开会', startTime: `${day}T15:00:00`, endTime: `${day}T16:00:00`, location: '会议室A' },
    }],
  })])
  await seedConfig(page)
  await page.goto('/')
  await page.getByTestId('chat-input').fill('明天下午3点和老王开会')
  await page.getByTestId('chat-send').click()
  await expect(page.getByTestId('preview-card')).toBeVisible()
  await expect(page.getByTestId('preview-card').getByLabel('编辑标题')).toHaveValue('和老王开会')
  await page.getByRole('button', { name: '确认创建' }).click()
  await expect(page.getByTestId('preview-card')).toBeHidden()
  await page.goto('/month')
  await expect(page.getByTestId(`month-cell-${day}`)).toContainText('和老王开会')
})

test('多轮查询：查询回填后第二轮请求携带日程数据', async ({ page }) => {
  await clearDb(page)
  const bodies: string[] = []
  await mockChat(page, [
    JSON.stringify({ reply: '让我查一下。', actions: [{ type: 'query_events', payload: { range: 'today' } }] }),
    JSON.stringify({ reply: '查到了，今天暂时没有安排。' }),
  ], bodies)
  await seedConfig(page)
  await page.goto('/')
  await page.getByTestId('chat-input').fill('今天有什么安排')
  await page.getByTestId('chat-send').click()
  await expect(page.getByText('让我查一下。')).toBeVisible()
  await page.getByTestId('chat-input').fill('那晚上有空吗')
  await page.getByTestId('chat-send').click()
  await expect(page.getByText('查到了，今天暂时没有安排。')).toBeVisible()
  expect(bodies[1]).toContain('【日程 today】')
})

test('AI 失败显示错误并可重试', async ({ page }) => {
  await clearDb(page)
  let calls = 0
  await page.route('**/chat/completions', route => {
    calls++
    if (calls === 1) return route.abort()
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ choices: [{ message: { content: '{"reply":"这次成功了"}' } }] }) })
  })
  await seedConfig(page)
  await page.goto('/')
  await page.getByTestId('chat-input').fill('明天有什么安排')
  await page.getByTestId('chat-send').click()
  await expect(page.getByTestId('chat-error')).toBeVisible()
  await page.getByTestId('chat-retry').click()
  await expect(page.getByText('这次成功了')).toBeVisible()
})

test('未配置 LLM 时提示先到设置页', async ({ page }) => {
  await clearDb(page)
  await page.goto('/')
  await page.getByTestId('chat-input').fill('开会')
  await page.getByTestId('chat-send').click()
  await expect(page.getByText(/请先在设置/)).toBeVisible()
})
