import dayjs from 'dayjs'
import type { CalendarEvent, Goal } from '../db/types'
import { expandRecurring, hasOverlap } from '../planner/conflicts'

export interface ReportStats {
  weekStart: string
  weekEnd: string
  overview: { total: number; completed: number; completedRate: number; totalMinutes: number }
  goalProgress: Array<{ name: string; planned: number; completed: number; completedRate: number }>
  timeDistribution: Array<{ day: number; count: number; minutes: number }>
  dayParts: Array<{ part: 'morning' | 'afternoon' | 'evening'; count: number }>
  freeSlots: { totalMinutes: number; longestMinutes: number; perDay: Array<{ day: number; minutes: number }> }
  conflicts: Array<{ title: string; startTime: string; other: string }>
  nextWeek: { plannedCount: number; unfinishedGoals: string[] }
}

const ALL_DAY_MINUTES = 480
const DEFAULT_MINUTES = 60

/** 周一 00:00:00 ~ 周日 23:59:59（本地时区）。dayjs 的 startOf('week') 默认周日为周首，需对齐为周一。 */
export function weekRange(anchor: dayjs.Dayjs | string | Date): { start: string; end: string } {
  const a = dayjs(anchor)
  // 周日（day()=0）是本周最后一天，startOf('week') 返回当天，需回退 6 天到上周一
  const start = a.day() === 0 ? a.startOf('week').subtract(6, 'day') : a.startOf('week').add(1, 'day')
  return {
    start: start.format('YYYY-MM-DDT00:00:00'),
    end: start.add(6, 'day').format('YYYY-MM-DDT23:59:59'),
  }
}

/** 展开 repeat 并过滤出窗口内实例（含原事件）。 */
export function collectWeekEvents(events: CalendarEvent[], rangeStart: string, rangeEnd: string): CalendarEvent[] {
  const out: CalendarEvent[] = []
  for (const ev of events) {
    for (const instance of expandRecurring(ev, rangeStart, rangeEnd)) {
      const t = dayjs(instance.startTime)
      if (!t.isBefore(dayjs(rangeStart)) && !t.isAfter(dayjs(rangeEnd))) out.push(instance)
    }
  }
  return out.sort((a, b) => dayjs(a.startTime).valueOf() - dayjs(b.startTime).valueOf())
}

export function eventMinutes(ev: CalendarEvent): number {
  if (ev.allDay) return ALL_DAY_MINUTES
  const diff = dayjs(ev.endTime).diff(dayjs(ev.startTime), 'minute')
  return diff > 0 ? diff : DEFAULT_MINUTES
}

/** 0=周一 … 6=周日（dayjs day() 是 0=周日，转换）。 */
function weekDayIndex(t: dayjs.Dayjs): number {
  return (t.day() + 6) % 7
}

function partOf(hour: number): 'morning' | 'afternoon' | 'evening' {
  if (hour < 12) return 'morning'
  if (hour < 18) return 'afternoon'
  return 'evening'
}

/** 某工作日内 08:00–22:00 的空闲分钟（合并重叠忙碌区间后）。 */
function freeMinutesForDay(events: CalendarEvent[], day: dayjs.Dayjs): { total: number; longest: number } {
  const start = day.add(8, 'hour')
  const end = day.add(22, 'hour')
  const busy: Array<{ s: number; e: number }> = []
  for (const ev of events) {
    const s = Math.max(dayjs(ev.startTime).valueOf(), start.valueOf())
    const e = Math.min(dayjs(ev.endTime).valueOf(), end.valueOf())
    if (e > s) busy.push({ s, e })
  }
  busy.sort((a, b) => a.s - b.s)
  const merged: Array<{ s: number; e: number }> = []
  for (const b of busy) {
    const last = merged[merged.length - 1]
    if (last && b.s <= last.e) last.e = Math.max(last.e, b.e)
    else merged.push({ ...b })
  }
  let total = 0
  let cursor = start.valueOf()
  let longest = 0
  for (const m of merged) {
    if (m.s > cursor) {
      const gap = m.s - cursor
      total += gap
      longest = Math.max(longest, gap)
    }
    cursor = Math.max(cursor, m.e)
  }
  const tail = end.valueOf() - cursor
  if (tail > 0) {
    total += tail
    longest = Math.max(longest, tail)
  }
  return { total: total / 60000, longest: longest / 60000 }
}

export function computeReportStats(events: CalendarEvent[], goals: Goal[], anchor: dayjs.Dayjs | string | Date): ReportStats {
  const { start, end } = weekRange(anchor)
  const weekEvents = collectWeekEvents(events, start, end)
  const nextStart = dayjs(end).add(1, 'second').format('YYYY-MM-DDT00:00:00')
  const nextEnd = dayjs(nextStart).add(6, 'day').format('YYYY-MM-DDT23:59:59')
  const nextWeekEvents = collectWeekEvents(events, nextStart, nextEnd)

  const completed = weekEvents.filter(e => e.completed).length
  const totalMinutes = weekEvents.reduce((sum, e) => sum + eventMinutes(e), 0)

  // 目标进度：relatedGoalId 分组
  const byGoal = new Map<number, { planned: number; completed: number }>()
  for (const ev of weekEvents) {
    if (ev.relatedGoalId === undefined) continue
    const g = byGoal.get(ev.relatedGoalId) ?? { planned: 0, completed: 0 }
    g.planned++
    if (ev.completed) g.completed++
    byGoal.set(ev.relatedGoalId, g)
  }
  const goalName = new Map(goals.filter(g => g.id !== undefined).map(g => [g.id!, g.name]))
  const goalProgress = [...byGoal.entries()]
    .map(([id, g]) => ({
      name: goalName.get(id) ?? `目标 #${id}`,
      planned: g.planned,
      completed: g.completed,
      completedRate: g.planned > 0 ? g.completed / g.planned : 0,
    }))
    .sort((a, b) => a.name.localeCompare(b.name))

  // 时间分布
  const timeDistribution = Array.from({ length: 7 }, (_, day) => ({ day, count: 0, minutes: 0 }))
  const dayParts: ReportStats['dayParts'] = [
    { part: 'morning', count: 0 },
    { part: 'afternoon', count: 0 },
    { part: 'evening', count: 0 },
  ]
  for (const ev of weekEvents) {
    const t = dayjs(ev.startTime)
    const day = weekDayIndex(t)
    timeDistribution[day].count++
    timeDistribution[day].minutes += eventMinutes(ev)
    const part = partOf(t.hour())
    dayParts.find(p => p.part === part)!.count++
  }

  // 空闲：仅工作日
  const perDay = Array.from({ length: 7 }, (_, day) => ({ day, minutes: 0 }))
  let freeTotal = 0
  let freeLongest = 0
  for (let d = 0; d < 5; d++) {
    const dayEvents = weekEvents.filter(e => weekDayIndex(dayjs(e.startTime)) === d)
    const dayStart = dayjs(start).add(d, 'day')
    const { total, longest } = freeMinutesForDay(dayEvents, dayStart)
    perDay[d].minutes = Math.round(total)
    freeTotal += total
    freeLongest = Math.max(freeLongest, longest)
  }

  // 冲突：窗口内展开实例两两重叠
  const conflicts: ReportStats['conflicts'] = []
  for (let i = 0; i < weekEvents.length; i++) {
    for (let j = i + 1; j < weekEvents.length; j++) {
      const a = weekEvents[i]
      const b = weekEvents[j]
      if (hasOverlap(a, b)) {
        conflicts.push({ title: a.title, startTime: a.startTime, other: b.title })
      }
    }
  }

  const unfinishedGoals = goalProgress.filter(g => g.completed < g.planned).map(g => g.name)

  return {
    weekStart: start,
    weekEnd: end,
    overview: {
      total: weekEvents.length,
      completed,
      completedRate: weekEvents.length > 0 ? completed / weekEvents.length : 0,
      totalMinutes,
    },
    goalProgress,
    timeDistribution,
    dayParts,
    freeSlots: {
      totalMinutes: Math.round(freeTotal),
      longestMinutes: Math.round(freeLongest),
      perDay,
    },
    conflicts,
    nextWeek: { plannedCount: nextWeekEvents.length, unfinishedGoals },
  }
}
