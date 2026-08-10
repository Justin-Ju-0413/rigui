import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import App from './App'

describe('App shell', () => {
  it('渲染侧边栏与底部导航各四项', () => {
    render(<MemoryRouter><App /></MemoryRouter>)
    expect(screen.getAllByRole('navigation')).toHaveLength(2)
    for (const label of ['日程', '目标', '列表', '设置']) {
      expect(screen.getAllByText(label)).toHaveLength(2)
    }
  })

  it('默认落在月视图', () => {
    render(<MemoryRouter initialEntries={['/']}><App /></MemoryRouter>)
    expect(screen.getByTestId('month-view')).toBeInTheDocument()
  })

  it('点击设置导航到设置页', async () => {
    const user = (await import('@testing-library/user-event')).default
    render(<MemoryRouter><App /></MemoryRouter>)
    await user.click(screen.getAllByRole('link', { name: '设置' })[0])
    expect(screen.getByTestId('settings-view')).toBeInTheDocument()
  })
})
