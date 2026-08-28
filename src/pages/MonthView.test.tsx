import { render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, beforeEach } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import MonthView from './MonthView'
import { db } from '../db/schema'
import { addEvent } from '../db/crud'
import dayjs from 'dayjs'

describe('MonthView', () => {
  beforeEach(async () => {
    await db.delete()
    await db.open()
  })

  it('渲染当月标题与网格', async () => {
    render(<MemoryRouter><MonthView /></MemoryRouter>)
    const title = dayjs().format('YYYY年M月')
    expect(await screen.findByText(title)).toBeInTheDocument()
    expect(screen.getByTestId('month-grid')).toBeInTheDocument()
  })

  it('显示锚定月份内有事件的日子', async () => {
    await addEvent({ title: '开会', startTime: '2026-08-06T09:00:00', endTime: '2026-08-06T10:00:00', allDay: false, reminderOffsets: [], repeat: 'none' })
    render(<MemoryRouter><MonthView initialAnchor="2026-08-01T00:00:00" /></MemoryRouter>)
    const cell = await screen.findByTestId('month-cell-2026-08-06')
    await waitFor(() => expect(cell).toHaveTextContent('开会'))
  })

  it('非当月时显示「今天」按钮，点击回到当月并隐藏按钮', async () => {
    const prevMonth = dayjs().subtract(1, 'month').startOf('month')
    const user = (await import('@testing-library/user-event')).default
    render(<MemoryRouter><MonthView initialAnchor={prevMonth.format('YYYY-MM-DDTHH:mm:ss')} /></MemoryRouter>)
    expect(await screen.findByRole('button', { name: '今天' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '今天' }))
    expect(await screen.findByText(dayjs().format('YYYY年M月'))).toBeInTheDocument()
    await waitFor(() => {
      expect(screen.queryByRole('button', { name: '今天' })).not.toBeInTheDocument()
    })
  })

  it('当月时不显示「今天」按钮', async () => {
    render(<MemoryRouter><MonthView /></MemoryRouter>)
    await screen.findByTestId('month-grid')
    expect(screen.queryByRole('button', { name: '今天' })).not.toBeInTheDocument()
  })
})
