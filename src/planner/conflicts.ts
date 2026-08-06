import dayjs from 'dayjs'
import type { CalendarEvent } from '../db/types'

export function hasOverlap(
  a: { startTime: string; endTime: string },
  b: { startTime: string; endTime: string },
): boolean {
  return dayjs(a.startTime).isBefore(dayjs(b.endTime)) && dayjs(b.startTime).isBefore(dayjs(a.endTime))
}

export function expandRecurring(event: CalendarEvent, rangeStart: string, rangeEnd: string): CalendarEvent[] {
  if (event.repeat === 'none') return [event]
  const out: CalendarEvent[] = []
  let cursor = dayjs(event.startTime)
  const end = dayjs(rangeEnd)
  const unit: dayjs.ManipulateType = event.repeat === 'daily' ? 'day' : event.repeat === 'weekly' ? 'week' : 'month'
  while (cursor.isBefore(end)) {
    if (!cursor.isBefore(dayjs(rangeStart))) {
      const offset = cursor.diff(dayjs(event.startTime), 'minute')
      out.push({
        ...event,
        startTime: cursor.format('YYYY-MM-DDTHH:mm:ss'),
        endTime: dayjs(event.endTime).add(offset, 'minute').format('YYYY-MM-DDTHH:mm:ss'),
      })
    }
    cursor = cursor.add(1, unit)
  }
  return out
}

export function findConflicts(
  events: CalendarEvent[],
  candidate: CalendarEvent,
  rangeStart: string,
  rangeEnd: string,
): CalendarEvent[] {
  const conflicts: CalendarEvent[] = []
  for (const ev of events) {
    if (ev.id !== undefined && ev.id === candidate.id) continue
    for (const instance of expandRecurring(ev, rangeStart, rangeEnd)) {
      if (hasOverlap(instance, candidate)) conflicts.push(instance)
    }
  }
  return conflicts
}
