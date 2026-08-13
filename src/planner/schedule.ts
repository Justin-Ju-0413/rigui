import dayjs, { type Dayjs } from 'dayjs'
import { DEFAULT_TASK_ID } from '../db/types'
import type { CalendarEvent, Goal } from '../db/types'

export interface ScheduledSlot {
  title: string
  startTime: string
  endTime: string
  allDay: false
  reminderOffsets: number[]
  relatedGoalId: number
  relatedTaskId: string
}

const WORK_START_HOUR = 8
const WORK_END_HOUR = 22
const STEP_MINUTES = 30

function overlaps(aStart: Dayjs, aEnd: Dayjs, bStart: Dayjs, bEnd: Dayjs): boolean {
  return aStart.isBefore(bEnd) && bStart.isBefore(aEnd)
}

/** 事件是否属于目标下的指定任务（旧事件无 relatedTaskId 时归入 default 任务，保证旧目标去重/统计一致） */
function isSameTask(ev: CalendarEvent, goalId: number, taskId: string): boolean {
  if (ev.relatedGoalId !== goalId) return false
  if (taskId === DEFAULT_TASK_ID) return ev.relatedTaskId === undefined || ev.relatedTaskId === DEFAULT_TASK_ID
  return ev.relatedTaskId === taskId
}

/** 为目标的单个任务在窗口内排期：每天最多一次、仅工作日、不与任何已有事件冲突、不早于 now */
export function scheduleTasks(
  events: CalendarEvent[],
  goal: Pick<Goal, 'id' | 'name' | 'tasks'>,
  taskId: string,
  windowStart: Date,
  windowEnd: Date,
  now: Date,
): ScheduledSlot[] {
  const task = goal.tasks.find(t => t.id === taskId)
  if (!task || task.weeklyFrequency < 1 || task.durationMinutes < 1) return []

  const goalId = goal.id as number
  const slots: ScheduledSlot[] = []
  const start = dayjs(windowStart).startOf('day')
  const end = dayjs(windowEnd).startOf('day')
  const nowDay = dayjs(now)

  let day = start
  while (slots.length < task.weeklyFrequency && (day.isBefore(end, 'day') || day.isSame(end, 'day'))) {
    const dow = day.day()
    const isWeekday = dow !== 0 && dow !== 6
    const existingThatDay = events.some(e => isSameTask(e, goalId, taskId) && dayjs(e.startTime).isSame(day, 'day'))
    const alreadyPlacedAtDay = slots.some(s => dayjs(s.startTime).isSame(day, 'day'))
    if (isWeekday && !existingThatDay && !alreadyPlacedAtDay) {
      const dayStart = day.add(WORK_START_HOUR, 'hour')
      const lastStart = day.add(WORK_END_HOUR, 'hour').subtract(task.durationMinutes, 'minute')
      let t = dayStart
      let placed = false
      while (!placed && !t.isAfter(lastStart, 'minute')) {
        const slotEnd = t.add(task.durationMinutes, 'minute')
        if (t.isBefore(nowDay)) {
          t = t.add(STEP_MINUTES, 'minute')
          continue
        }
        const conflicts = events.some(e => overlaps(t, slotEnd, dayjs(e.startTime), dayjs(e.endTime)))
        if (!conflicts) {
          slots.push({
            title: task.name,
            startTime: t.format('YYYY-MM-DDTHH:mm:ss'),
            endTime: slotEnd.format('YYYY-MM-DDTHH:mm:ss'),
            allDay: false,
            reminderOffsets: [],
            relatedGoalId: goalId,
            relatedTaskId: taskId,
          })
          placed = true
        } else {
          t = t.add(STEP_MINUTES, 'minute')
        }
      }
    }
    day = day.add(1, 'day')
  }
  return slots
}
