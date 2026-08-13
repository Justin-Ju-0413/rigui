import { describe, expect, it } from 'vitest'
import { DEFAULT_TASK_ID } from '../db/types'
import type { CalendarEvent, Goal } from '../db/types'
import { scheduleTasks } from './schedule'

const goal = (over: Partial<Goal> = {}): Goal => ({
  id: 1,
  name: '学英语',
  startDate: '2026-08-10',
  tasks: [
    { id: 't1', name: '背单词', weeklyFrequency: 2, durationMinutes: 60 },
    { id: 't2', name: '听力', weeklyFrequency: 1, durationMinutes: 30 },
  ],
  createdAt: '2026-08-09T00:00:00',
  ...over,
})

const ev = (start: string, end: string, over: Partial<CalendarEvent> = {}): CalendarEvent => ({
  id: 99,
  title: '占用',
  startTime: start,
  endTime: end,
  allDay: false,
  reminderOffsets: [],
  repeat: 'none',
  ...over,
} as CalendarEvent)

// 窗口：2026-08-10（周一）00:00 → 2026-08-16（周日）23:59；now 定在周一 08:00
const windowStart = new Date('2026-08-10T00:00:00')
const windowEnd = new Date('2026-08-16T23:59:59')
const now = new Date('2026-08-10T08:00:00')

describe('scheduleTasks（按任务排期）', () => {
  it('空日历按任务频次排满，跳过周末，标题=任务名，slot 携带 taskId', () => {
    const slots = scheduleTasks([], goal(), 't1', windowStart, windowEnd, now)
    expect(slots).toHaveLength(2)
    expect(slots[0].title).toBe('背单词')
    expect(slots[1].title).toBe('背单词')
    expect(slots.every(s => s.relatedTaskId === 't1')).toBe(true)
    expect(slots.map(s => s.startTime)).toEqual([
      '2026-08-10T08:00:00',
      '2026-08-11T08:00:00',
    ])
  })

  it('不同任务使用各自的频次与时长', () => {
    const slots = scheduleTasks([], goal(), 't2', windowStart, windowEnd, now)
    expect(slots).toHaveLength(1)
    expect(slots[0].startTime).toBe('2026-08-10T08:00:00')
    expect(slots[0].endTime).toBe('2026-08-10T08:30:00')
  })

  it('同任务同日不重复', () => {
    const slots = scheduleTasks([], goal({ tasks: [{ id: 't1', name: '背单词', weeklyFrequency: 2, durationMinutes: 60 }] }), 't1', windowStart, windowEnd, now)
    expect(slots.map(s => s.startTime)).toEqual(['2026-08-10T08:00:00', '2026-08-11T08:00:00'])
  })

  it('与已有事件重叠的时段跳过', () => {
    const events = [ev('2026-08-11T08:00:00', '2026-08-11T09:00:00')]
    const slots = scheduleTasks(events, goal(), 't1', windowStart, windowEnd, now)
    expect(slots).toHaveLength(2)
    expect(slots[0].startTime).toBe('2026-08-10T08:00:00')
    expect(slots[1].startTime).toBe('2026-08-11T09:00:00')
  })

  it('半开区间边界：候选开始时间等于已有事件结束时间不算冲突', () => {
    const events = [ev('2026-08-10T08:00:00', '2026-08-10T09:00:00')]
    const slots = scheduleTasks(events, goal(), 't1', windowStart, windowEnd, new Date('2026-08-10T08:00:00'))
    expect(slots).toHaveLength(2)
    expect(slots[0].startTime).toBe('2026-08-10T09:00:00')
  })

  it('已有同任务事件占用时段不重复排（按 relatedTaskId 去重）', () => {
    const events = [ev('2026-08-10T08:00:00', '2026-08-10T09:00:00', { title: '背单词', relatedGoalId: 1, relatedTaskId: 't1' })]
    const slots = scheduleTasks(events, goal(), 't1', windowStart, windowEnd, now)
    expect(slots).toHaveLength(2)
    expect(slots.map(s => s.startTime)).toEqual(['2026-08-11T08:00:00', '2026-08-12T08:00:00'])
  })

  it('其他任务的已排事件只按冲突判断，不阻止同日排期', () => {
    // t2 已排周一 08:00–08:30 → t1 周一 08:00 冲突，08:30 起可用（同日可排不同任务）
    const events = [ev('2026-08-10T08:00:00', '2026-08-10T08:30:00', { title: '听力', relatedGoalId: 1, relatedTaskId: 't2' })]
    const slots = scheduleTasks(events, goal(), 't1', windowStart, windowEnd, now)
    expect(slots[0].startTime).toBe('2026-08-10T08:30:00')
    expect(slots[1].startTime).toBe('2026-08-11T08:00:00')
  })

  it('旧事件（无 relatedTaskId）对 default 任务去重生效', () => {
    const oldGoal = goal({ id: 2, name: '健身', tasks: [{ id: DEFAULT_TASK_ID, name: '健身', weeklyFrequency: 2, durationMinutes: 60 }] })
    const events = [ev('2026-08-10T08:00:00', '2026-08-10T09:00:00', { title: '健身', relatedGoalId: 2 })]
    const slots = scheduleTasks(events, oldGoal, DEFAULT_TASK_ID, windowStart, windowEnd, now)
    expect(slots.map(s => s.startTime)).toEqual(['2026-08-11T08:00:00', '2026-08-12T08:00:00'])
  })

  it('startTime 不早于 now', () => {
    const slots = scheduleTasks([], goal(), 't1', windowStart, windowEnd, new Date('2026-08-10T09:30:00'))
    expect(slots[0].startTime).toBe('2026-08-10T09:30:00')
  })

  it('窗口不足只返回可用数量（部分成功）', () => {
    const events = [
      ev('2026-08-10T08:00:00', '2026-08-10T22:00:00'),
      ev('2026-08-11T08:00:00', '2026-08-11T22:00:00'),
      ev('2026-08-12T08:00:00', '2026-08-12T22:00:00'),
    ]
    const slots = scheduleTasks(events, goal({ tasks: [{ id: 't1', name: '背单词', weeklyFrequency: 4, durationMinutes: 60 }] }), 't1', windowStart, windowEnd, now)
    expect(slots).toHaveLength(2)
    expect(slots.map(s => s.startTime)).toEqual(['2026-08-13T08:00:00', '2026-08-14T08:00:00'])
  })

  it('无可用空档返回空数组', () => {
    const slots = scheduleTasks([ev('2026-08-10T00:00:00', '2026-08-17T00:00:00')], goal(), 't1', windowStart, windowEnd, now)
    expect(slots).toHaveLength(0)
  })

  it('任务不存在或参数无效返回空数组', () => {
    expect(scheduleTasks([], goal(), 'nope', windowStart, windowEnd, now)).toHaveLength(0)
    const bad = goal({ tasks: [{ id: 't1', name: 'x', weeklyFrequency: 0, durationMinutes: 60 }] })
    expect(scheduleTasks([], bad, 't1', windowStart, windowEnd, now)).toHaveLength(0)
  })
})
