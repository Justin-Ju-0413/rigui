import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, beforeEach } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import SettingsView from './SettingsView'
import { db } from '../db/schema'
import { getSetting } from '../db/settings'

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
})
