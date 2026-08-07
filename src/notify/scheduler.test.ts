import { describe, expect, it } from 'vitest'
import { dueReminders } from './scheduler'
import type { CalendarEvent } from '../db/types'

const ev = (id: number, startTime: string, offsets: number[]): CalendarEvent => ({
  id, title: `事件${id}`, startTime, endTime: startTime.replace('09:00:00', '10:00:00'),
  allDay: false, reminderOffsets: offsets, repeat: 'none', completed: false, createdAt: '',
})

describe('dueReminders', () => {
  it('到达提醒时间返回该事件', () => {
    const event = ev(1, '2026-08-06T09:00:00', [10])
    const at = Date.parse('2026-08-06T08:50:00')  // 本地解析
    const due = dueReminders([event], at, new Set())
    expect(due).toHaveLength(1)
    expect(due[0].id).toBe('1-10-2026-08-06T09:00:00')
  })

  it('半开区间：08:50:00 触发、08:49:59 不触发', () => {
    const event = ev(1, '2026-08-06T09:00:00', [10])
    expect(dueReminders([event], Date.parse('2026-08-06T08:49:59'), new Set())).toHaveLength(0)
    expect(dueReminders([event], Date.parse('2026-08-06T08:50:00'), new Set())).toHaveLength(1)
  })

  it('已通知的事件不重复返回', () => {
    const event = ev(1, '2026-08-06T09:00:00', [10])
    const notified = new Set(['1-10-2026-08-06T09:00:00'])
    expect(dueReminders([event], Date.parse('2026-08-06T08:50:00'), notified)).toHaveLength(0)
  })

  it('事件开始后不再提醒', () => {
    const event = ev(1, '2026-08-06T09:00:00', [10])
    expect(dueReminders([event], Date.parse('2026-08-06T09:30:00'), new Set())).toHaveLength(0)
  })

  it('多个偏移各自触发且 id 不同', () => {
    const event = ev(1, '2026-08-06T09:00:00', [30, 10])
    const due = dueReminders([event], Date.parse('2026-08-06T08:50:00'), new Set())
    expect(due.map(d => d.id).sort()).toEqual(['1-10-2026-08-06T09:00:00', '1-30-2026-08-06T09:00:00'])
  })

  it('重复事件按实例触发', () => {
    const event: CalendarEvent = { ...ev(2, '2026-08-06T09:00:00', [10]), repeat: 'weekly' }
    const at = Date.parse('2026-08-13T08:50:00')
    const due = dueReminders([event], at, new Set())
    expect(due.map(d => d.id)).toEqual(['2-10-2026-08-13T09:00:00'])
  })

  it('已完成事件不提醒', () => {
    const event = { ...ev(1, '2026-08-06T09:00:00', [10]), completed: true }
    expect(dueReminders([event], Date.parse('2026-08-06T08:50:00'), new Set())).toHaveLength(0)
  })
})
