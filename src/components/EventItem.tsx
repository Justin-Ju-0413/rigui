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
      className={`glass flex w-full items-center gap-2.5 rounded-2xl p-2.5 text-left transition-transform active:scale-[0.98] ${event.completed ? 'opacity-50 line-through' : ''}`}>
      <input type="checkbox" checked={event.completed} aria-label="完成" onClick={e => { e.stopPropagation(); onToggle(event.id!) }} />
      <span className="flex-1 truncate text-sm">{event.title}</span>
      <span className="text-xs tabular-nums text-[var(--text-secondary)]">{timeText}</span>
    </button>
  )
}
