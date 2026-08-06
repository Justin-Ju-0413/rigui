import { render, screen } from '@testing-library/react'
import { describe, expect, it, beforeEach } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import DayView from './DayView'
import { db } from '../db/schema'
import { addEvent } from '../db/crud'

const renderDay = (date: string) =>
  render(
    <MemoryRouter initialEntries={[`/day?date=${date}`]}>
      <Routes><Route path="/day" element={<DayView />} /></Routes>
    </MemoryRouter>,
  )

describe('DayView', () => {
  beforeEach(async () => { await db.delete(); await db.open() })

  it('渲染日期标题与 48 个半小时格', async () => {
    renderDay('2026-08-06')
    expect(await screen.findByText('2026年8月6日')).toBeInTheDocument()
    expect(screen.getByTestId('timeline')).toBeInTheDocument()
  })

  it('显示当天事件', async () => {
    await addEvent({ title: '开会', startTime: '2026-08-06T09:00:00', endTime: '2026-08-06T10:00:00', allDay: false, reminderOffsets: [], repeat: 'none' })
    renderDay('2026-08-06')
    expect(await screen.findByText('开会')).toBeInTheDocument()
  })

  it('点 + 打开新建表单', async () => {
    const user = (await import('@testing-library/user-event')).default
    renderDay('2026-08-06')
    await user.click(await screen.findByRole('button', { name: '新建' }))
    expect(screen.getByTestId('event-form')).toBeInTheDocument()
  })
})
