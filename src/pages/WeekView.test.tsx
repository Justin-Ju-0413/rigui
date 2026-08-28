import { render, screen } from '@testing-library/react'
import { describe, expect, it, beforeEach } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import WeekView from './WeekView'
import MonthView from './MonthView'
import { db } from '../db/schema'
import { addEvent } from '../db/crud'

describe('WeekView', () => {
  beforeEach(async () => { await db.delete(); await db.open() })

  it('渲染当周 7 天列', async () => {
    render(<MemoryRouter initialEntries={['/week?date=2026-08-06']}>
      <Routes>
        <Route path="/month" element={<MonthView />} />
        <Route path="/week" element={<WeekView />} />
      </Routes>
    </MemoryRouter>)
    expect(await screen.findByTestId('week-grid')).toBeInTheDocument()
    for (const d of ['08-03', '08-04', '08-05', '08-06', '08-07', '08-08', '08-09']) {
      expect(screen.getByText(d)).toBeInTheDocument()
    }
  })

  it('显示周内事件标题', async () => {
    await addEvent({ title: '站会', startTime: '2026-08-04T09:00:00', endTime: '2026-08-04T09:30:00', allDay: false, reminderOffsets: [], repeat: 'none' })
    render(<MemoryRouter initialEntries={['/week?date=2026-08-06']}>
      <Routes><Route path="/week" element={<WeekView />} /></Routes>
    </MemoryRouter>)
    expect(await screen.findByText('站会')).toBeInTheDocument()
  })

  it('点月视图按钮返回月视图', async () => {
    const user = (await import('@testing-library/user-event')).default
    render(<MemoryRouter initialEntries={['/week?date=2026-08-06']}>
      <Routes>
        <Route path="/month" element={<MonthView />} />
        <Route path="/week" element={<WeekView />} />
      </Routes>
    </MemoryRouter>)
    await user.click(await screen.findByRole('button', { name: '月视图' }))
    expect(await screen.findByTestId('month-view')).toBeInTheDocument()
  })
})
