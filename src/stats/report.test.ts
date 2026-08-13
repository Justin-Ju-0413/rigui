import { describe, expect, it } from 'vitest'
import dayjs from 'dayjs'
import type { CalendarEvent, Goal } from '../db/types'
import { collectWeekEvents, computeReportStats, eventMinutes, weekRange } from './report'

const ev = (over: Partial<CalendarEvent> & { startTime: string }): CalendarEvent => ({
  title: '事件',
  endTime: dayjs(over.startTime).add(1, 'hour').format('YYYY-MM-DDTHH:mm:ss'),
  allDay: false,
  reminderOffsets: [],
  repeat: 'none',
  completed: false,
  createdAt: '2026-08-01T00:00:00',
  ...over,
})

const goal = (over: Partial<Goal> & { id: number; name: string }): Goal => ({
  startDate: '2026-08-10',
  createdAt: '2026-08-01T00:00:00',
  tasks: [],
  ...over,
})

describe('weekRange', () => {
  it('返回包含锚点的那一周（周一到周日）', () => {
    const { start, end } = weekRange('2026-08-12T15:00:00')
    expect(start).toBe('2026-08-10T00:00:00')
    expect(end).toBe('2026-08-16T23:59:59')
  })

  it('周日归属上一周', () => {
    const { start } = weekRange('2026-08-09T12:00:00')
    expect(start).toBe('2026-08-03T00:00:00')
  })
})

describe('collectWeekEvents', () => {
  it('过滤窗口外事件', () => {
    const events = [
      ev({ startTime: '2026-08-08T10:00:00', title: '上周' }),
      ev({ startTime: '2026-08-12T10:00:00', title: '本周' }),
      ev({ startTime: '2026-08-17T10:00:00', title: '下周' }),
    ]
    const got = collectWeekEvents(events, '2026-08-10T00:00:00', '2026-08-16T23:59:59')
    expect(got.map(e => e.title)).toEqual(['本周'])
  })

  it('展开周重复事件，仅保留窗口内实例', () => {
    const events = [ev({ startTime: '2026-08-10T10:00:00', repeat: 'weekly' })]
    const got = collectWeekEvents(events, '2026-08-10T00:00:00', '2026-08-16T23:59:59')
    expect(got).toHaveLength(1)
    expect(got[0].startTime).toBe('2026-08-10T10:00:00')
  })
})

describe('eventMinutes', () => {
  it('allDay 计 480 分钟', () => {
    expect(eventMinutes(ev({ startTime: '2026-08-10T09:00:00', allDay: true }))).toBe(480)
  })

  it('无有效 endTime 时按 60 分钟', () => {
    const e = ev({ startTime: '2026-08-10T09:00:00' })
    e.endTime = ''
    expect(eventMinutes(e)).toBe(60)
  })
})

describe('computeReportStats', () => {
  it('概览：总数/完成数/完成率/总时长', () => {
    const events = [
      ev({ startTime: '2026-08-10T09:00:00', title: '开会', completed: true }),
      ev({ startTime: '2026-08-11T09:00:00', title: '健身' }),
    ]
    const stats = computeReportStats(events, [], '2026-08-10')
    expect(stats.overview).toEqual({ total: 2, completed: 1, completedRate: 0.5, totalMinutes: 120 })
  })

  it('目标进度按任务聚合：目标汇总 + 任务明细', () => {
    const goals = [goal({ id: 1, name: '学英语', tasks: [
      { id: 't1', name: '背单词', weeklyFrequency: 2, durationMinutes: 60 },
      { id: 't2', name: '听力', weeklyFrequency: 1, durationMinutes: 30 },
    ] })]
    const events = [
      ev({ startTime: '2026-08-10T09:00:00', title: '背单词', relatedGoalId: 1, relatedTaskId: 't1', completed: true }),
      ev({ startTime: '2026-08-11T09:00:00', title: '背单词', relatedGoalId: 1, relatedTaskId: 't1' }),
      ev({ startTime: '2026-08-12T09:00:00', title: '听力', relatedGoalId: 1, relatedTaskId: 't2', completed: true }),
    ]
    const stats = computeReportStats(events, goals, '2026-08-10')
    expect(stats.goalProgress).toEqual([{
      name: '学英语', planned: 3, completed: 2, completedRate: 2 / 3,
      tasks: [
        { name: '背单词', planned: 2, completed: 1, completedRate: 0.5 },
        { name: '听力', planned: 1, completed: 1, completedRate: 1 },
      ],
    }])
    expect(stats.nextWeek.unfinishedGoals).toEqual(['学英语'])
  })

  it('旧数据兼容：目标无 tasks 时事件归入「未拆解」任务，名称回退目标名', () => {
    const goals = [goal({ id: 1, name: '学英语' })]
    const events = [
      ev({ startTime: '2026-08-10T09:00:00', title: '学英语 · 第 1 次', relatedGoalId: 1, completed: true }),
      ev({ startTime: '2026-08-11T09:00:00', title: '学英语 · 第 2 次', relatedGoalId: 1 }),
    ]
    const stats = computeReportStats(events, goals, '2026-08-10')
    expect(stats.goalProgress).toEqual([{
      name: '学英语', planned: 2, completed: 1, completedRate: 0.5,
      tasks: [{ name: '未拆解', planned: 2, completed: 1, completedRate: 0.5 }],
    }])
  })

  it('目标任务已删除但事件残留时任务名回退「任务 #id」', () => {
    const goals = [goal({ id: 1, name: '学英语', tasks: [] })]
    const events = [ev({ startTime: '2026-08-10T09:00:00', title: '背单词', relatedGoalId: 1, relatedTaskId: 'ghost' })]
    const stats = computeReportStats(events, goals, '2026-08-10')
    expect(stats.goalProgress[0].tasks).toEqual([{ name: '任务 #ghost', planned: 1, completed: 0, completedRate: 0 }])
  })

  it('时间分布与时段分布', () => {
    const events = [
      ev({ startTime: '2026-08-10T09:00:00', title: '早' }),      // 周一 上午
      ev({ startTime: '2026-08-11T14:00:00', title: '午' }),      // 周二 下午
      ev({ startTime: '2026-08-12T19:00:00', title: '晚' }),      // 周三 晚上
    ]
    const stats = computeReportStats(events, [], '2026-08-10')
    expect(stats.timeDistribution.map(d => d.count)).toEqual([1, 1, 1, 0, 0, 0, 0])
    expect(stats.dayParts).toEqual([
      { part: 'morning', count: 1 },
      { part: 'afternoon', count: 1 },
      { part: 'evening', count: 1 },
    ])
  })

  it('空闲：无事件工作日 14 小时，被事件占用后减少', () => {
    const events = [
      ev({ startTime: '2026-08-10T09:00:00', endTime: '2026-08-10T17:00:00', title: '整天班' }),
    ]
    const stats = computeReportStats(events, [], '2026-08-10')
    // 周一 08:00-09:00 (60) + 17:00-22:00 (300) = 360；其余 4 个工作日各 840
    expect(stats.freeSlots.totalMinutes).toBe(360 + 840 * 4)
    expect(stats.freeSlots.longestMinutes).toBe(840)
  })

  it('冲突：窗口内重叠对', () => {
    const events = [
      ev({ startTime: '2026-08-11T09:00:00', endTime: '2026-08-11T10:00:00', title: 'A' }),
      ev({ startTime: '2026-08-11T09:30:00', endTime: '2026-08-11T10:30:00', title: 'B' }),
    ]
    const stats = computeReportStats(events, [], '2026-08-10')
    expect(stats.conflicts).toEqual([{ title: 'A', startTime: '2026-08-11T09:00:00', other: 'B' }])
  })

  it('下周事件数预扫描', () => {
    const events = [ev({ startTime: '2026-08-17T10:00:00', title: '下周一会' })]
    const stats = computeReportStats(events, [], '2026-08-10')
    expect(stats.nextWeek.plannedCount).toBe(1)
  })

  it('无事件周：空统计', () => {
    const stats = computeReportStats([], [], '2026-08-10')
    expect(stats.overview).toEqual({ total: 0, completed: 0, completedRate: 0, totalMinutes: 0 })
    expect(stats.goalProgress).toEqual([])
    expect(stats.conflicts).toEqual([])
    expect(stats.nextWeek.unfinishedGoals).toEqual([])
  })
})