import dayjs, { type Dayjs } from 'dayjs'
import type { CalendarEvent, Goal } from '../db/types'

export interface ScheduledSlot {
  title: string
  startTime: string
  endTime: string
  allDay: false
  reminderOffsets: number[]
  relatedGoalId: number
}

const WORK_START_HOUR = 8
const WORK_END_HOUR = 22
const STEP_MINUTES = 30

function overlaps(aStart: Dayjs, aEnd: Dayjs, bStart: Dayjs, bEnd: Dayjs): boolean {
  return aStart.isBefore(bEnd) && bStart.isBefore(aEnd)
}

export function scheduleTasks(
  events: CalendarEvent[],
  goal: Pick<Goal, 'id' | 'name' | 'weeklyFrequency' | 'durationMinutes'>,
  windowStart: Date,
  windowEnd: Date,
  now: Date,
): ScheduledSlot[] {
  if (!goal.weeklyFrequency || goal.weeklyFrequency < 1 || !goal.durationMinutes || goal.durationMinutes < 1) {
    return []
  }
  const slots: ScheduledSlot[] = []
  const seq = events.filter(e => e.relatedGoalId === goal.id).length
  const start = dayjs(windowStart).startOf('day')
  const end = dayjs(windowEnd).startOf('day')
  const nowDay = dayjs(now)

  let day = start
  while (slots.length < goal.weeklyFrequency && (day.isBefore(end, 'day') || day.isSame(end, 'day'))) {
    const dow = day.day()
    const isWeekday = dow !== 0 && dow !== 6
    const existingThatDay = events.some(e => e.relatedGoalId === goal.id && dayjs(e.startTime).isSame(day, 'day'))
    const alreadyPlacedAtDay = slots.some(s => dayjs(s.startTime).isSame(day, 'day'))
    if (isWeekday && !existingThatDay && !alreadyPlacedAtDay) {
      const dayStart = day.add(WORK_START_HOUR, 'hour')
      const lastStart = day.add(WORK_END_HOUR, 'hour').subtract(goal.durationMinutes, 'minute')
      let t = dayStart
      let placed = false
      while (!placed && !t.isAfter(lastStart, 'minute')) {
        const slotEnd = t.add(goal.durationMinutes, 'minute')
        if (t.isBefore(nowDay) ) {
          t = t.add(STEP_MINUTES, 'minute')
          continue
        }
        const conflicts = events.some(e => overlaps(t, slotEnd, dayjs(e.startTime), dayjs(e.endTime)))
        if (!conflicts) {
          const n = seq + slots.length + 1
          slots.push({
            title: `${goal.name} · 第 ${n} 次`,
            startTime: t.format('YYYY-MM-DDTHH:mm:ss'),
            endTime: slotEnd.format('YYYY-MM-DDTHH:mm:ss'),
            allDay: false,
            reminderOffsets: [],
            relatedGoalId: goal.id as number,
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
