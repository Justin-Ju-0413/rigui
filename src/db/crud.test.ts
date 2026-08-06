import { describe, expect, it, beforeEach } from 'vitest'
import { addEvent, getEventsByRange, getAllEvents, updateEvent, deleteEvent, toggleEventCompleted } from './crud'
import { getSetting, setSetting } from './settings'
import { db } from './schema'
import type { CalendarEvent } from './types'

const base = (): Omit<CalendarEvent, 'id' | 'createdAt' | 'completed'> => ({
  title: '开会',
  startTime: '2026-08-06T09:00:00',
  endTime: '2026-08-06T10:00:00',
  allDay: false,
  reminderOffsets: [10],
  repeat: 'none',
})

describe('crud', () => {
  beforeEach(async () => {
    await db.delete()
    await db.open()
  })

  it('addEvent 写入并可按范围查询', async () => {
    const id = await addEvent(base())
    const events = await getEventsByRange('2026-08-06T00:00:00', '2026-08-06T23:59:59')
    expect(events).toHaveLength(1)
    expect(events[0].id).toBe(id)
    expect(events[0].title).toBe('开会')
    expect(events[0].completed).toBe(false)
  })

  it('updateEvent 局部更新', async () => {
    const id = await addEvent(base())
    await updateEvent(id, { location: '会议室A' })
    const [ev] = await getEventsByRange('2026-08-06T00:00:00', '2026-08-06T23:59:59')
    expect(ev.location).toBe('会议室A')
    expect(ev.title).toBe('开会')
  })

  it('deleteEvent 删除', async () => {
    const id = await addEvent(base())
    await deleteEvent(id)
    expect(await getAllEvents()).toHaveLength(0)
  })

  it('toggleEventCompleted 切换完成状态', async () => {
    const id = await addEvent(base())
    await toggleEventCompleted(id)
    const [ev] = await getEventsByRange('2026-08-06T00:00:00', '2026-08-06T23:59:59')
    expect(ev.completed).toBe(true)
  })

  it('getEventsByRange 只返回范围内事件', async () => {
    await addEvent(base())
    await addEvent({ ...base(), title: '明天的事', startTime: '2026-08-07T09:00:00', endTime: '2026-08-07T10:00:00' })
    const events = await getEventsByRange('2026-08-06T00:00:00', '2026-08-06T23:59:59')
    expect(events.map(e => e.title)).toEqual(['开会'])
  })

  it('settings 读写', async () => {
    expect(await getSetting('llm_model')).toBeUndefined()
    await setSetting('llm_model', 'deepseek-chat')
    expect(await getSetting('llm_model')).toBe('deepseek-chat')
  })
})
