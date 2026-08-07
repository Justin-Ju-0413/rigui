import { useState } from 'react'
import dayjs from 'dayjs'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { startOfDay, endOfDay } from '../utils/date'
import { useEvents } from '../hooks/useEvents'
import EventForm from '../components/EventForm'
import EventItem from '../components/EventItem'

const HOURS = Array.from({ length: 24 }, (_, h) => h)

export default function DayView() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const date = params.get('date') ?? dayjs().format('YYYY-MM-DD')
  const dayStart = startOfDay(date)
  const dayEnd = endOfDay(date)
  const { events, toggle, remove, refresh } = useEvents({ rangeStart: dayStart, rangeEnd: dayEnd })
  const [editing, setEditing] = useState<number | null>(null)
  const [creating, setCreating] = useState(false)

  return (
    <div className="p-4 md:mx-auto md:max-w-3xl md:p-6" data-testid="day-view">
      <header className="mb-3 flex items-center justify-between pt-2 md:pt-0">
        <h1 className="text-xl font-semibold tracking-tight md:text-2xl">{dayjs(date).format('YYYY年M月D日')}</h1>
        <div className="flex gap-2">
          <button aria-label="周视图" onClick={() => navigate(`/week?date=${date}`)} className="glass-btn">周</button>
          <button aria-label="新建" onClick={() => setCreating(true)} className="glass-btn glass-btn-primary h-9 w-9 rounded-full text-lg leading-none">+</button>
        </div>
      </header>
      {creating && (
        <div className="glass mb-3 rounded-3xl">
          <EventForm defaultStart={dayjs(`${date}T09:00:00`).format('YYYY-MM-DDTHH:mm')}
            onSaved={() => { setCreating(false); void refresh() }} onCancel={() => setCreating(false)} />
        </div>
      )}
      {editing !== null && (() => {
        const ev = events.find(e => e.id === editing)
        if (!ev) return null
        return (
          <div className="glass mb-3 rounded-3xl">
            <EventForm initial={ev} onSaved={() => { setEditing(null); void refresh() }} onCancel={() => setEditing(null)} />
          </div>
        )
      })()}
      <div data-testid="timeline" className="space-y-1">
        {HOURS.map(h => {
          const hourKey = dayjs(`${date}T${String(h).padStart(2, '0')}:00:00`).format('YYYY-MM-DDTHH:mm:ss')
          const hourEvents = events.filter(e => !e.allDay && dayjs(e.startTime).hour() === h)
          return (
            <div key={hourKey} className="flex gap-2 border-b border-white/40 py-1 dark:border-white/10 md:gap-3">
              <span className="w-10 pt-2 text-right text-xs tabular-nums text-[var(--text-tertiary)] md:w-14 md:text-sm">{String(h).padStart(2, '0')}:00</span>
              <div className="flex-1 space-y-1">
                {hourEvents.map(ev => (
                  <EventItem key={ev.id} event={ev} onEdit={id => setEditing(id)} onToggle={toggle} />
                ))}
              </div>
            </div>
          )
        })}
        {events.filter(e => e.allDay).map(ev => (
          <EventItem key={ev.id} event={ev} onEdit={id => setEditing(id)} onToggle={toggle} />
        ))}
      </div>
      {editing !== null && (
        <button aria-label="删除" onClick={() => { void remove(editing); setEditing(null) }} className="glass-btn glass-btn-danger mt-3 w-full">删除当前编辑</button>
      )}
    </div>
  )
}
