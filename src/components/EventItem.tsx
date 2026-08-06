import type { CalendarEvent } from '../db/types'
import dayjs from 'dayjs'

interface Props {
  event: CalendarEvent
  onEdit: (id: number) => void
  onToggle: (id: number) => void
}

export default function EventItem({ event, onEdit, onToggle }: Props) {
  const timeText = event.allDay
    ? '全天'
    : `${dayjs(event.startTime).format('HH:mm')}–${dayjs(event.endTime).format('HH:mm')}`
  return (
    <button data-testid={`event-item-${event.id}`} onClick={() => onEdit(event.id!)}
      className={`flex w-full items-center gap-2 rounded-lg border p-2 text-left ${event.completed ? 'opacity-50 line-through' : ''}`}>
      <input type="checkbox" checked={event.completed} aria-label="完成" onClick={e => { e.stopPropagation(); onToggle(event.id!) }} />
      <span className="flex-1 truncate">{event.title}</span>
      <span className="text-xs text-gray-500">{timeText}</span>
    </button>
  )
}
