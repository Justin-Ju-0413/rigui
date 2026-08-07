import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, beforeEach } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import SettingsView from './SettingsView'
import { db } from '../db/schema'
import { getSetting, setSetting } from '../db/settings'
import { subscribeEventsChanged } from '../events/eventBus'

describe('SettingsView', () => {
  beforeEach(async () => { await db.delete(); await db.open() })

  it('保存 LLM 配置写入本地', async () => {
    const user = userEvent.setup()
    render(<MemoryRouter><SettingsView /></MemoryRouter>)
    await user.type(screen.getByLabelText('API 地址'), 'https://api.example.com/v1')
    await user.type(screen.getByLabelText('API Key'), 'sk-test')
    await user.type(screen.getByLabelText('模型'), 'deepseek-chat')
    await user.click(screen.getByRole('button', { name: '保存' }))
    expect(await getSetting('llm_base_url')).toBe('https://api.example.com/v1')
    expect(await getSetting('llm_api_key')).toBe('sk-test')
    expect(await getSetting('llm_model')).toBe('deepseek-chat')
  })

  it('已有配置时输入框预填存储值', async () => {
    await setSetting('llm_base_url', 'https://api.example.com/v1')
    await setSetting('llm_api_key', 'sk-test')
    await setSetting('llm_model', 'deepseek-chat')
    render(<MemoryRouter><SettingsView /></MemoryRouter>)
    await waitFor(() => expect(screen.getByLabelText('API 地址')).toHaveValue('https://api.example.com/v1'))
    expect(screen.getByLabelText('API Key')).toHaveValue('sk-test')
    expect(screen.getByLabelText('模型')).toHaveValue('deepseek-chat')
  })

  it('三项全空时保存被拦截且不覆盖存储', async () => {
    await setSetting('llm_base_url', 'https://api.example.com/v1')
    await setSetting('llm_api_key', 'sk-test')
    await setSetting('llm_model', 'deepseek-chat')
    const user = userEvent.setup()
    render(<MemoryRouter><SettingsView /></MemoryRouter>)
    await waitFor(() => expect(screen.getByLabelText('API 地址')).toHaveValue('https://api.example.com/v1'))
    await user.clear(screen.getByLabelText('API 地址'))
    await user.clear(screen.getByLabelText('API Key'))
    await user.clear(screen.getByLabelText('模型'))
    await user.click(screen.getByRole('button', { name: '保存' }))
    expect(await screen.findByText('请先填写完整配置')).toBeInTheDocument()
    expect(await getSetting('llm_base_url')).toBe('https://api.example.com/v1')
  })

  it('导入 JSON 后广播事件变更', async () => {
    let notified = 0
    const unsub = subscribeEventsChanged(() => { notified += 1 })
    try {
      const user = userEvent.setup()
      const { container } = render(<MemoryRouter><SettingsView /></MemoryRouter>)
      const file = Object.assign(
        new File(['ignored'], 'backup.json', { type: 'application/json' }),
        { text: async () => JSON.stringify({ app: 'rigui', version: 1, events: [{ title: '导入的会', startTime: '2026-08-06T09:00:00', endTime: '2026-08-06T10:00:00', allDay: false, reminderOffsets: [], repeat: 'none' }] }) },
      )
      const input = container.querySelector('input[type="file"]') as HTMLInputElement
      await user.upload(input, file)
      expect(await screen.findByText('已导入 1 条')).toBeInTheDocument()
      expect(notified).toBe(1)
    } finally {
      unsub()
    }
  })
})
