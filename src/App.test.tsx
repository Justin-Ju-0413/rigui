import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import App from './App'

describe('App shell', () => {
  it('渲染侧边栏与底部导航各五项', () => {
    render(<MemoryRouter><App /></MemoryRouter>)
    expect(screen.getAllByRole('navigation')).toHaveLength(2)
    for (const label of ['日程', '目标', '列表', '设置']) {
      expect(screen.getAllByText(label)).toHaveLength(2)
    }
    expect(screen.getAllByText('对话')).toHaveLength(3) // 侧栏 + 底部导航 + 对话页标题
  })

  it('默认落在对话页', () => {
    render(<MemoryRouter initialEntries={['/']}><App /></MemoryRouter>)
    expect(screen.getByTestId('chat-view')).toBeInTheDocument()
  })

  it('日程 Tab 导航到月视图', async () => {
    const user = (await import('@testing-library/user-event')).default
    render(<MemoryRouter><App /></MemoryRouter>)
    await user.click(screen.getAllByRole('link', { name: '日程' })[0])
    expect(screen.getByTestId('month-view')).toBeInTheDocument()
  })

  it('点击设置导航到设置页', async () => {
    const user = (await import('@testing-library/user-event')).default
    render(<MemoryRouter><App /></MemoryRouter>)
    await user.click(screen.getAllByRole('link', { name: '设置' })[0])
    expect(screen.getByTestId('settings-view')).toBeInTheDocument()
  })
})
