import { useMemo, useState } from 'react'
import dayjs from 'dayjs'
import { useNavigate } from 'react-router-dom'
import { buildMonthGrid } from '../utils/calendar'
import { useEvents } from '../hooks/useEvents'

interface MonthViewProps {
  initialAnchor?: string
}

export default function MonthView({ initialAnchor }: MonthViewProps = {}) {
  const today = dayjs().startOf('day')
  const [anchor, setAnchor] = useState(initialAnchor ?? today.format('YYYY-MM-DDTHH:mm:ss'))
  const base = dayjs(anchor).startOf('month')
  const rangeStart = base.subtract((base.day() + 6) % 7, 'day').format('YYYY-MM-DDTHH:mm:ss')
  const rangeEnd = dayjs(anchor).endOf('month').endOf('week').add(1, 'day').format('YYYY-MM-DDTHH:mm:ss')
  const { events } = useEvents({ rangeStart, rangeEnd })
  const grid = useMemo(() => buildMonthGrid(anchor), [anchor])
  const navigate = useNavigate()

  const byDay = new Map<string, typeof events>()
  for (const ev of events) {
    const key = dayjs(ev.startTime).format('YYYY-MM-DD')
    byDay.set(key, [...(byDay.get(key) ?? []), ev])
  }

  return (
    <div className="p-4 md:p-6" data-testid="month-view">
      <header className="mb-4 flex items-center justify-between pt-2 md:pt-0">
        <button aria-label="上个月" onClick={() => setAnchor(dayjs(anchor).subtract(1, 'month').format('YYYY-MM-DDTHH:mm:ss'))}
          className="glass-btn flex h-9 w-9 items-center justify-center rounded-full">‹</button>
        <h1 className="text-xl font-semibold tracking-tight md:text-2xl">{dayjs(anchor).format('YYYY年M月')}</h1>
        <button aria-label="下个月" onClick={() => setAnchor(dayjs(anchor).add(1, 'month').format('YYYY-MM-DDTHH:mm:ss'))}
          className="glass-btn flex h-9 w-9 items-center justify-center rounded-full">›</button>
      </header>
      <div className="mb-1.5 grid grid-cols-7 text-center text-xs font-medium text-[var(--text-tertiary)] md:text-sm">
        {['一', '二', '三', '四', '五', '六', '日'].map(d => <div key={d}>{d}</div>)}
      </div>
      <div data-testid="month-grid" className="grid grid-cols-7 gap-1.5 md:gap-2">
        {grid.flat().map(cell => {
          const dayEvents = byDay.get(cell.key) ?? []
          const isToday = cell.key === today.format('YYYY-MM-DD')
          return (
            <button key={cell.key} data-testid={`month-cell-${cell.key}`}
              onClick={() => navigate(`/day?date=${cell.key}`)}
              className={`flex min-h-14 flex-col rounded-2xl p-1 text-left transition-transform active:scale-95 md:min-h-24 md:p-1.5 lg:min-h-32 ${cell.inMonth ? 'glass' : 'border border-transparent text-[var(--text-tertiary)] opacity-40'} ${isToday ? 'glass-strong !border-[var(--accent)]' : ''}`}>
              <span className={`px-1 text-xs md:text-sm ${isToday ? 'flex h-5 w-5 items-center justify-center rounded-full bg-[var(--accent)] text-white md:h-6 md:w-6' : ''}`}>{Number(cell.key.slice(8))}</span>
              <div className="mt-0.5 flex flex-col gap-0.5">
                {dayEvents.slice(0, 2).map(ev => (
                  <span key={ev.id} className={`truncate rounded-md px-1 text-[10px] md:text-xs ${ev.completed ? 'line-through opacity-50' : ''} text-[var(--accent)]`}>{ev.title}</span>
                ))}
                {dayEvents.length > 2 && <span className="px-1 text-[10px] text-[var(--text-tertiary)] md:text-xs">+{dayEvents.length - 2}</span>}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
