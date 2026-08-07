import dayjs from 'dayjs'
import type { CalendarEvent } from '../db/types'
import { expandRecurring } from '../planner/conflicts'

function escapeIcs(text: string): string {
  return text.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n')
}

function formatDt(dt: string): string {
  return dayjs(dt).format('YYYYMMDDTHHmmss')
}

function buildEvent(ev: CalendarEvent, uid: string, dtstamp: string): string {
  const lines = [
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${dtstamp}`,
    `DTSTART:${formatDt(ev.startTime)}`,
    `DTEND:${formatDt(ev.endTime)}`,
    `SUMMARY:${escapeIcs(ev.title)}`,
  ]
  if (ev.location) lines.push(`LOCATION:${escapeIcs(ev.location)}`)
  for (const offset of ev.reminderOffsets) {
    lines.push(
      'BEGIN:VALARM',
      'ACTION:DISPLAY',
      `TRIGGER:-PT${offset}M`,
      `DESCRIPTION:${escapeIcs(ev.title)}`,
      'END:VALARM',
    )
  }
  lines.push('END:VEVENT')
  return lines.join('\r\n')
}

export function generateIcs(events: CalendarEvent[], rangeStart?: string, rangeEnd?: string): string {
  const dtstamp = dayjs().format('YYYYMMDDTHHmmss')
  const start = rangeStart ?? '2000-01-01T00:00:00'
  const end = rangeEnd ?? '2100-12-31T23:59:59'
  const blocks = events.flatMap((ev, i) =>
    expandRecurring(ev, start, end).map((instance, j) => buildEvent(instance, `${ev.id ?? i}-${j}@rigui`, dtstamp)),
  )
  return ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//rigui//AI Calendar//CN', 'CALSCALE:GREGORIAN', ...blocks, 'END:VCALENDAR'].join('\r\n')
}
