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
    <div className="p-4" data-testid="month-view">
      <header className="mb-2 flex items-center justify-between">
        <button aria-label="上个月" onClick={() => setAnchor(dayjs(anchor).subtract(1, 'month').format('YYYY-MM-DDTHH:mm:ss'))}>‹</button>
        <h1 className="text-lg font-semibold">{dayjs(anchor).format('YYYY年M月')}</h1>
        <button aria-label="下个月" onClick={() => setAnchor(dayjs(anchor).add(1, 'month').format('YYYY-MM-DDTHH:mm:ss'))}>›</button>
      </header>
      <div className="grid grid-cols-7 text-center text-xs text-gray-500">
        {['一', '二', '三', '四', '五', '六', '日'].map(d => <div key={d}>{d}</div>)}
      </div>
      <div data-testid="month-grid" className="grid grid-cols-7">
        {grid.flat().map(cell => {
          const dayEvents = byDay.get(cell.key) ?? []
          const isToday = cell.key === today.format('YYYY-MM-DD')
          return (
            <button key={cell.key} data-testid={`month-cell-${cell.key}`}
              onClick={() => navigate(`/day?date=${cell.key}`)}
              className={`flex min-h-14 flex-col border-b border-r p-0.5 text-left ${cell.inMonth ? '' : 'bg-gray-50 text-gray-400'} ${isToday ? 'bg-indigo-50' : ''}`}>
              <span className="text-xs">{Number(cell.key.slice(8))}</span>
              {dayEvents.slice(0, 2).map(ev => (
                <span key={ev.id} className="truncate text-[10px] text-indigo-700">{ev.title}</span>
              ))}
              {dayEvents.length > 2 && <span className="text-[10px] text-gray-400">+{dayEvents.length - 2}</span>}
            </button>
          )
        })}
      </div>
    </div>
  )
}
