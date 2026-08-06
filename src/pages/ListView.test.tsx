import { render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, beforeEach } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import ListView from './ListView'
import { db } from '../db/schema'
import { addEvent } from '../db/crud'
import dayjs from 'dayjs'

describe('ListView', () => {
  beforeEach(async () => { await db.delete(); await db.open() })

  const iso = (offsetDays: number, h = 9) =>
    dayjs().add(offsetDays, 'day').hour(h).minute(0).second(0).format('YYYY-MM-DDTHH:mm:ss')

  it('分组渲染 今天/明天/本周/以后', async () => {
    await addEvent({ title: '今天的会', startTime: iso(0), endTime: iso(0, 10), allDay: false, reminderOffsets: [], repeat: 'none' })
    await addEvent({ title: '明天的会', startTime: iso(1), endTime: iso(1, 10), allDay: false, reminderOffsets: [], repeat: 'none' })
    render(<MemoryRouter><ListView /></MemoryRouter>)
    expect(await screen.findByText('今天')).toBeInTheDocument()
    expect(screen.getByText('明天')).toBeInTheDocument()
    expect(screen.getByText('本周')).toBeInTheDocument()
    expect(screen.getByText('以后')).toBeInTheDocument()
    expect(await screen.findByText('今天的会')).toBeInTheDocument()
    expect(screen.getByText('明天的会')).toBeInTheDocument()
  })

  it('勾选切换完成状态', async () => {
    await addEvent({ title: '待办', startTime: iso(0), endTime: iso(0, 10), allDay: false, reminderOffsets: [], repeat: 'none' })
    const user = (await import('@testing-library/user-event')).default
    render(<MemoryRouter><ListView /></MemoryRouter>)
    const box = await screen.findByRole('checkbox')
    await user.click(box)
    await waitFor(() => expect(box).toBeChecked())
  })
})
