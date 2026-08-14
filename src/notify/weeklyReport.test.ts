import { describe, expect, it, beforeEach, vi } from 'vitest'
import { db } from '../db/schema'
import { addEvent, addGoal, toggleEventCompleted, getAllEvents, getAllGoals } from '../db/crud'
import { setSetting } from '../db/settings'
import dayjs from 'dayjs'
import { maybeSendWeeklyReport, REPORT_SENT_KEY } from './weeklyReport'
import type { CalendarEvent } from '../db/types'

const memStorage = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: (k: string) => store[k] ?? null,
    setItem: (k: string, v: string) => { store[k] = String(v) },
    clear: () => { store = {} },
  }
})()

// 2026-08-09 是周日
const sunday2000 = new Date('2026-08-09T20:00:00')

const ev = (over: Partial<CalendarEvent> & { startTime: string }): CalendarEvent => ({
  title: '事件',
  endTime: dayjs(over.startTime).add(1, 'hour').format('YYYY-MM-DDTHH:mm:ss'),
  allDay: false,
  reminderOffsets: [],
  repeat: 'none',
  completed: false,
  createdAt: '2026-08-01T00:00:00',
  ...over,
} as CalendarEvent)

describe('maybeSendWeeklyReport', () => {
  beforeEach(async () => {
    await db.delete()
    await db.open()
    memStorage.clear()
  })

  it('周日到点且有事件：推送本周简报并记录去重', async () => {
    const e1 = await addEvent(ev({ startTime: '2026-08-03T09:00:00', title: '开会' }))
    await toggleEventCompleted(e1)
    await addEvent(ev({ startTime: '2026-08-04T09:00:00', title: '健身' }))
    const gid = await addGoal({ name: '学英语', startDate: '2026-08-03', tasks: [{ id: 't1', name: '背单词', weeklyFrequency: 2, durationMinutes: 60 }] })
    const e3 = await addEvent(ev({ startTime: '2026-08-05T09:00:00', title: '背单词', relatedGoalId: gid, relatedTaskId: 't1' }))
    await toggleEventCompleted(e3)
    await addEvent(ev({ startTime: '2026-08-10T09:00:00', title: '下周一会' }))
    const notify = vi.fn()
    const result = await maybeSendWeeklyReport(sunday2000, await getAllEvents(), await getAllGoals(), { notify, storage: memStorage })
    expect(result).toEqual({ sent: true })
    expect(notify).toHaveBeenCalledTimes(1)
    const [title, body] = notify.mock.calls[0] as [string, string]
    expect(title).toBe('本周简报')
    expect(body).toContain('完成 2/3 项')
    expect(body).toContain('学英语 1/1')
    expect(body).toContain('下周已排 1 项')
    expect(memStorage.getItem(REPORT_SENT_KEY)).toBe('2026-08-03')
  })

  it('同周第二次调用跳过（already-sent）', async () => {
    await addEvent(ev({ startTime: '2026-08-03T09:00:00' }))
    const notify = vi.fn()
    const opts = { notify, storage: memStorage }
    expect(await maybeSendWeeklyReport(sunday2000, await getAllEvents(), [], opts)).toEqual({ sent: true })
    expect(await maybeSendWeeklyReport(new Date('2026-08-09T21:00:00'), await getAllEvents(), [], opts)).toEqual({ sent: false, reason: 'already-sent' })
    expect(notify).toHaveBeenCalledTimes(1)
  })

  it('周一到周六即使过了配置时间也不推送（not-time）', async () => {
    await addEvent(ev({ startTime: '2026-08-03T09:00:00' }))
    const notify = vi.fn()
    const result = await maybeSendWeeklyReport(new Date('2026-08-07T21:00:00'), await getAllEvents(), [], { notify, storage: memStorage })
    expect(result).toEqual({ sent: false, reason: 'not-time' })
    expect(notify).not.toHaveBeenCalled()
  })

  it('周日未到配置时间不推送（not-time）', async () => {
    await addEvent(ev({ startTime: '2026-08-03T09:00:00' }))
    const notify = vi.fn()
    const result = await maybeSendWeeklyReport(new Date('2026-08-09T19:59:00'), await getAllEvents(), [], { notify, storage: memStorage })
    expect(result).toEqual({ sent: false, reason: 'not-time' })
    expect(notify).not.toHaveBeenCalled()
  })

  it('自定义推送时间生效', async () => {
    await setSetting('weekly_report_time', '21:30')
    await addEvent(ev({ startTime: '2026-08-03T09:00:00' }))
    const notify = vi.fn()
    expect(await maybeSendWeeklyReport(new Date('2026-08-09T21:00:00'), await getAllEvents(), [], { notify, storage: memStorage })).toEqual({ sent: false, reason: 'not-time' })
    expect(await maybeSendWeeklyReport(new Date('2026-08-09T21:30:00'), await getAllEvents(), [], { notify, storage: memStorage })).toEqual({ sent: true })
  })

  it('开关关闭不推送（disabled）', async () => {
    await setSetting('weekly_report_enabled', '0')
    await addEvent(ev({ startTime: '2026-08-03T09:00:00' }))
    const notify = vi.fn()
    const result = await maybeSendWeeklyReport(sunday2000, await getAllEvents(), [], { notify, storage: memStorage })
    expect(result).toEqual({ sent: false, reason: 'disabled' })
    expect(notify).not.toHaveBeenCalled()
  })

  it('本周无事件不推送（empty-week）', async () => {
    const notify = vi.fn()
    const result = await maybeSendWeeklyReport(sunday2000, [], [], { notify, storage: memStorage })
    expect(result).toEqual({ sent: false, reason: 'empty-week' })
    expect(notify).not.toHaveBeenCalled()
  })

  it('notify 抛错：调用 onError 且不记录去重（下轮重试）', async () => {
    await addEvent(ev({ startTime: '2026-08-03T09:00:00' }))
    const onError = vi.fn()
    const notify = vi.fn(() => { throw new Error('boom') })
    const events = await getAllEvents()
    const result = await maybeSendWeeklyReport(sunday2000, events, [], { notify, onError, storage: memStorage })
    expect(result).toEqual({ sent: false, reason: 'no-notify' })
    expect(onError).toHaveBeenCalledTimes(1)
    expect(memStorage.getItem(REPORT_SENT_KEY)).toBeNull()
  })
})