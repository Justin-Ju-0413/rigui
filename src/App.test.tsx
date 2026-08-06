import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import App from './App'

describe('App shell', () => {
  it('渲染底部导航四项', () => {
    render(<MemoryRouter><App /></MemoryRouter>)
    expect(screen.getByRole('navigation')).toBeInTheDocument()
    for (const label of ['日程', '目标', '列表', '设置']) {
      expect(screen.getByText(label)).toBeInTheDocument()
    }
  })

  it('默认落在月视图', () => {
    render(<MemoryRouter initialEntries={['/']}><App /></MemoryRouter>)
    expect(screen.getByTestId('month-view')).toBeInTheDocument()
  })

  it('点击设置导航到设置页', async () => {
    const user = (await import('@testing-library/user-event')).default
    render(<MemoryRouter><App /></MemoryRouter>)
    await user.click(screen.getByText('设置'))
    expect(screen.getByTestId('settings-view')).toBeInTheDocument()
  })
})
