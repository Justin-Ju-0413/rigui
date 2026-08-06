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

  it('显示当天有事件的日子', async () => {
    await addEvent({ title: '开会', startTime: '2026-08-06T09:00:00', endTime: '2026-08-06T10:00:00', allDay: false, reminderOffsets: [], repeat: 'none' })
    render(<MemoryRouter><MonthView /></MemoryRouter>)
    const cell = await screen.findByTestId('month-cell-2026-08-06')
    await waitFor(() => expect(cell).toHaveTextContent('开会'))
  })
})
