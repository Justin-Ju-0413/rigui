import dayjs from 'dayjs'
import type { CalendarEvent } from '../db/types'
import { expandRecurring } from '../planner/conflicts'

export interface DueReminder { event: CalendarEvent; id: string }

export function dueReminders(events: CalendarEvent[], nowMs: number, notifiedIds: Set<string>): DueReminder[] {
  const now = dayjs(nowMs)
  const out: DueReminder[] = []
  for (const event of events) {
    if (event.completed) continue
    for (const instance of expandRecurring(event, '2000-01-01T00:00:00', '2100-12-31T23:59:59')) {
      const start = dayjs(instance.startTime)
      if (now.isAfter(start)) continue
      for (const offset of event.reminderOffsets) {
        const dueAt = start.subtract(offset, 'minute')
        if (!now.isBefore(dueAt) && dueAt.isBefore(now.add(1, 'second'))) {
          const id = `${event.id}-${offset}-${dayjs(instance.startTime).format('YYYY-MM-DDTHH:mm:ss')}`
          if (!notifiedIds.has(id)) out.push({ event: instance, id })
        }
      }
    }
  }
  return out
}
