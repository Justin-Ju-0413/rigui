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
    <div className="p-4" data-testid="week-view">
      <header className="mb-2 flex items-center justify-between">
        <h1 className="text-lg font-semibold">{dayjs(anchor).format('YYYY年M月')} 第{dayjs(anchor).week()}周</h1>
        <button aria-label="月视图" onClick={() => navigate('/')} className="rounded-lg border px-2 py-1 text-sm">月</button>
      </header>
      <div data-testid="week-grid" className="grid grid-cols-7 gap-1">
        {days.map(day => {
          const key = day.format('YYYY-MM-DD')
          const dayEvents = events.filter(e => dayjs(e.startTime).format('YYYY-MM-DD') === key)
          return (
            <div key={key} className="min-h-24 rounded-lg border p-1">
              <div className="text-center text-xs text-gray-500">{day.format('MM-DD')}</div>
              <div className="space-y-0.5">
                {dayEvents.map(ev => (
                  <div key={ev.id} className="truncate rounded bg-indigo-100 px-1 text-[10px] text-indigo-800">{ev.title}</div>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
