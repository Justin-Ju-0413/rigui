import { describe, expect, it, beforeEach } from 'vitest'
import { addEvent, getEventsByRange, getAllEvents, updateEvent, deleteEvent, toggleEventCompleted, addGoal, updateGoal, getAllGoals, getEventsByGoal, deleteGoalCascade } from './crud'
import { getSetting, setSetting } from './settings'
import { db } from './schema'
import type { CalendarEvent, Goal } from './types'

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

describe('goal CRUD', () => {
  beforeEach(async () => {
    await db.delete()
    await db.open()
  })

  const goalInput = (): Omit<Goal, 'id' | 'createdAt'> => ({
    name: '学英语',
    startDate: '2026-08-10',
    weeklyFrequency: 2,
    durationMinutes: 60,
  })

  it('addGoal 写入并可全量读取，durationMinutes 默认缺省 60', async () => {
    const id = await addGoal(goalInput())
    const goals = await getAllGoals()
    expect(goals).toHaveLength(1)
    expect(goals[0].durationMinutes).toBe(60)
    expect(goals[0].id).toBe(id)
  })

  it('updateGoal 局部更新', async () => {
    const id = await addGoal(goalInput())
    await updateGoal(id, { weeklyFrequency: 3 })
    const [g] = await getAllGoals()
    expect(g.weeklyFrequency).toBe(3)
    expect(g.name).toBe('学英语')
  })

  it('getEventsByGoal 返回该目标关联事件', async () => {
    const gid = await addGoal(goalInput())
    await addEvent({ ...base(), title: '学英语 · 第 1 次', relatedGoalId: gid })
    await addEvent({ ...base(), title: '开会' })
    const evs = await getEventsByGoal(gid)
    expect(evs).toHaveLength(1)
    expect(evs[0].title).toBe('学英语 · 第 1 次')
  })

  it('deleteGoalCascade 删除目标并级联删除关联事件、保留无关事件', async () => {
    const gid = await addGoal(goalInput())
    await addEvent({ ...base(), title: '学英语 · 第 1 次', relatedGoalId: gid })
    const otherId = await addEvent({ ...base(), title: '开会' })
    const deleted = await deleteGoalCascade(gid)
    expect(deleted).toBe(1)
    expect(await getAllGoals()).toHaveLength(0)
    const remaining = await getAllEvents()
    expect(remaining).toHaveLength(1)
    expect(remaining[0].id).toBe(otherId)
  })

  it('addGoal 接受 endDate 可选', async () => {
    await addGoal({ ...goalInput(), endDate: '2026-08-31' })
    expect((await getAllGoals())[0].endDate).toBe('2026-08-31')
  })
})
