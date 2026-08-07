import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, beforeEach } from 'vitest'
import AIInputPanel from './AIInputPanel'
import { LLMProvider } from '../context/LLMContext'
import { __setLLMTransport } from '../llm/client'
import { db } from '../db/schema'
import { setSetting } from '../db/settings'

const mount = () => render(<LLMProvider><AIInputPanel /></LLMProvider>)

describe('AIInputPanel', () => {
  beforeEach(async () => {
    await db.delete()
    await db.open()
    await setSetting('llm_base_url', 'https://api.example.com/v1')
    await setSetting('llm_api_key', 'sk-test')
    await setSetting('llm_model', 'test-model')
  })

  it('未配置 LLM 时提示先到设置页配置', async () => {
    await db.settings.clear()
    const user = userEvent.setup()
    mount()
    await user.click(screen.getByRole('button', { name: 'AI 输入' }))
    expect(await screen.findByText(/请先在设置/)).toBeInTheDocument()
  })

  it('输入自然语言→解析→预览卡片→确认入库', async () => {
    __setLLMTransport(async () => new Response(JSON.stringify({
      choices: [{ message: { content: '{"title":"开会","startTime":"2026-08-11T15:00:00","endTime":"2026-08-11T16:00:00"}' } }],
    }), { status: 200 }))
    const user = userEvent.setup()
    mount()
    await user.click(screen.getByRole('button', { name: 'AI 输入' }))
    await user.type(screen.getByLabelText('描述你的日程'), '下周二下午3点开会')
    await user.click(screen.getByRole('button', { name: '解析' }))
    expect(await screen.findByTestId('preview-card')).toBeInTheDocument()
    expect(screen.getByDisplayValue('开会')).toBeInTheDocument()
    expect(screen.getByLabelText('编辑开始时间')).toHaveValue('2026-08-11T15:00')
    expect(screen.getByLabelText('编辑结束时间')).toHaveValue('2026-08-11T16:00')
    await user.click(screen.getByRole('button', { name: '确认创建' }))
    await waitFor(async () => expect(await db.events.count()).toBe(1))
  })

  it('预览卡片可编辑标题，确认后入库编辑值', async () => {
    __setLLMTransport(async () => new Response(JSON.stringify({
      choices: [{ message: { content: '{"title":"开会","startTime":"2026-08-11T15:00:00","endTime":"2026-08-11T16:00:00"}' } }],
    }), { status: 200 }))
    const user = userEvent.setup()
    mount()
    await user.click(screen.getByRole('button', { name: 'AI 输入' }))
    await user.type(screen.getByLabelText('描述你的日程'), '下周二下午3点开会')
    await user.click(screen.getByRole('button', { name: '解析' }))
    const titleInput = await screen.findByLabelText('编辑标题')
    await user.clear(titleInput)
    await user.type(titleInput, '改过的会')
    await user.click(screen.getByRole('button', { name: '确认创建' }))
    await waitFor(async () => expect(await db.events.count()).toBe(1))
    const saved = await db.events.toArray()
    expect(saved[0].title).toBe('改过的会')
    expect(saved[0].startTime).toBe('2026-08-11T15:00:00')
  })

  it('解析失败展示错误信息', async () => {
    __setLLMTransport(async () => { throw new TypeError('Failed to fetch') })
    const user = userEvent.setup()
    mount()
    await user.click(screen.getByRole('button', { name: 'AI 输入' }))
    await user.type(screen.getByLabelText('描述你的日程'), '开会')
    await user.click(screen.getByRole('button', { name: '解析' }))
    expect(await screen.findByText(/解析失败/)).toBeInTheDocument()
  })
})
