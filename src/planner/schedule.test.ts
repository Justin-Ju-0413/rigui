import { describe, expect, it } from 'vitest'
import type { CalendarEvent, Goal } from '../db/types'
import { scheduleTasks } from './schedule'

const goal = (over: Partial<Goal> = {}): Goal => ({
  id: 1,
  name: '学英语',
  startDate: '2026-08-10',
  weeklyFrequency: 2,
  durationMinutes: 60,
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

describe('scheduleTasks', () => {
  it('空日历按频次排满，跳过周末（周六日无槽）', () => {
    const slots = scheduleTasks([], goal({ weeklyFrequency: 4 }), windowStart, windowEnd, now)
    expect(slots).toHaveLength(4)
    expect(slots[0].title).toBe('学英语 · 第 1 次')
    expect(slots[1].title).toBe('学英语 · 第 2 次')
    expect(slots.map(s => s.startTime)).toEqual([
      '2026-08-10T08:00:00',
      '2026-08-11T08:00:00',
      '2026-08-12T08:00:00',
      '2026-08-13T08:00:00',
    ])
  })

  it('同日不重复：频次 2 落到两个不同工作日', () => {
    const slots = scheduleTasks([], goal({ weeklyFrequency: 2 }), windowStart, windowEnd, now)
    expect(slots.map(s => s.startTime)).toEqual(['2026-08-10T08:00:00', '2026-08-11T08:00:00'])
  })

  it('与已有事件重叠的时段跳过', () => {
    const events = [ev('2026-08-11T08:00:00', '2026-08-11T09:00:00')]
    const slots = scheduleTasks(events, goal({ weeklyFrequency: 2 }), windowStart, windowEnd, now)
    expect(slots).toHaveLength(2)
    expect(slots[0].startTime).toBe('2026-08-10T08:00:00')
    expect(slots[1].startTime).toBe('2026-08-11T09:00:00')
  })

  it('与已有事件的部分重叠（跨时段）也跳过', () => {
    // 事件占周一 08:00–08:45：08:00 与 08:30 候选都被半开区间相交，09:00 起空闲
    const events = [ev('2026-08-10T08:00:00', '2026-08-10T08:45:00')]
    const slots = scheduleTasks(events, goal({ weeklyFrequency: 1 }), windowStart, windowEnd, now)
    expect(slots).toHaveLength(1)
    expect(slots[0].startTime).toBe('2026-08-10T09:00:00')
  })

  it('半开区间边界：候选开始时间等于已有事件结束时间不算冲突', () => {
    // 事件占用 [08:00, 09:00)；09:00 起的候选不被视为冲突
    const events = [ev('2026-08-10T08:00:00', '2026-08-10T09:00:00')]
    const slots = scheduleTasks(events, goal({ weeklyFrequency: 1 }), windowStart, windowEnd, new Date('2026-08-10T08:00:00'))
    expect(slots).toHaveLength(1)
    expect(slots[0].startTime).toBe('2026-08-10T09:00:00')
  })

  it('已有目标任务占用时段不重复排（去重）', () => {
    const events = [ev('2026-08-10T08:00:00', '2026-08-10T09:00:00', { title: '学英语 · 第 1 次', relatedGoalId: 1 })]
    const slots = scheduleTasks(events, goal({ weeklyFrequency: 2 }), windowStart, windowEnd, now)
    // 周一已有任务 → 同日不再排；无空余时段 → 排周二、周三
    expect(slots).toHaveLength(2)
    expect(slots.map(s => s.startTime)).toEqual(['2026-08-11T08:00:00', '2026-08-12T08:00:00'])
  })

  it('已排槽位标题序号递增到 existingCount 之后', () => {
    const events = [ev('2026-08-10T08:00:00', '2026-08-10T09:00:00', { title: '学英语 · 第 1 次', relatedGoalId: 1 })]
    const slots = scheduleTasks(events, goal({ weeklyFrequency: 2 }), windowStart, windowEnd, now)
    expect(slots.map(s => s.title)).toEqual(['学英语 · 第 2 次', '学英语 · 第 3 次'])
  })

  it('startTime 不早于 now（候选 09:30 与 now 相同时可用；已是过去的 08:30 跳过）', () => {
    const slots = scheduleTasks([], goal({ weeklyFrequency: 1 }), windowStart, windowEnd, new Date('2026-08-10T09:30:00'))
    expect(slots[0].startTime).toBe('2026-08-10T09:30:00')
  })

  it('窗口不足只返回可用数量（部分成功）', () => {
    // 周一~周三整天被占，仅剩周四、周五两个可用日 → 频次 4 只能放 2
    const events = [
      ev('2026-08-10T08:00:00', '2026-08-10T22:00:00'),
      ev('2026-08-11T08:00:00', '2026-08-11T22:00:00'),
      ev('2026-08-12T08:00:00', '2026-08-12T22:00:00'),
    ]
    const slots = scheduleTasks(events, goal({ weeklyFrequency: 4 }), windowStart, windowEnd, now)
    expect(slots).toHaveLength(2)
    expect(slots.map(s => s.startTime)).toEqual([
      '2026-08-13T08:00:00',
      '2026-08-14T08:00:00',
    ])
  })

  it('无可用空档返回空数组', () => {
    const slots = scheduleTasks([ev('2026-08-10T00:00:00', '2026-08-17T00:00:00')], goal({ weeklyFrequency: 1 }), windowStart, windowEnd, now)
    expect(slots).toHaveLength(0)
  })
})
