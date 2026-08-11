import dayjs from 'dayjs'
import weekOfYear from 'dayjs/plugin/weekOfYear'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useEvents } from '../hooks/useEvents'

dayjs.extend(weekOfYear)

export default function WeekView() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const anchor = params.get('date') ?? dayjs().format('YYYY-MM-DD')
  const monday = dayjs(anchor).startOf('week').add(1, 'day')
  const days = Array.from({ length: 7 }, (_, i) => monday.add(i, 'day'))
  const rangeStart = days[0].format('YYYY-MM-DDTHH:mm:ss')
  const rangeEnd = days[6].endOf('day').format('YYYY-MM-DDTHH:mm:ss')
  const { events } = useEvents({ rangeStart, rangeEnd })

  return (
    <div className="p-4 md:p-6" data-testid="week-view">
      <header className="mb-3 flex items-center justify-between pt-2 md:pt-0">
        <h1 className="text-xl font-semibold tracking-tight md:text-2xl">{dayjs(anchor).format('YYYY年M月')} 第{dayjs(anchor).week()}周</h1>
        <button aria-label="月视图" onClick={() => navigate('/')} className="btn">月</button>
      </header>
      <div data-testid="week-grid" className="grid grid-cols-7 gap-1.5 md:gap-2">
        {days.map(day => {
          const key = day.format('YYYY-MM-DD')
          const dayEvents = events.filter(e => dayjs(e.startTime).format('YYYY-MM-DD') === key)
          const isToday = key === dayjs().format('YYYY-MM-DD')
          return (
            <div key={key} className={`card flex min-h-28 flex-col rounded-lg p-1 md:min-h-44 md:p-1.5 lg:min-h-56 ${isToday ? 'card !border-[var(--accent)]' : ''}`}>
              <div className="text-center text-xs font-medium tabular-nums text-[var(--text-tertiary)] md:text-sm">{day.format('MM-DD')}</div>
              <div className="mt-1 space-y-0.5 md:space-y-1">
                {dayEvents.map(ev => (
                  <div key={ev.id} className={`truncate rounded-lg px-1 py-0.5 text-[10px] md:text-xs ${ev.completed ? 'line-through opacity-50' : ''}`}
                    style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}>{ev.title}</div>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
