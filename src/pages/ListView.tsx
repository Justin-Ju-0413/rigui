import dayjs from 'dayjs'
import { useEvents } from '../hooks/useEvents'
import EventItem from '../components/EventItem'

type GroupKey = 'today' | 'tomorrow' | 'week' | 'later'

const GROUP_LABEL: Record<GroupKey, string> = { today: '今天', tomorrow: '明天', week: '本周', later: '以后' }

export default function ListView() {
  const { events, toggle } = useEvents()

  const groups: Record<GroupKey, typeof events> = { today: [], tomorrow: [], week: [], later: [] }
  const now = dayjs().startOf('day')
  const tomorrow = now.add(1, 'day')
  const weekEnd = now.add(6, 'day')
  for (const ev of events) {
    const start = dayjs(ev.startTime)
    const key: GroupKey = start.isBefore(tomorrow) ? 'today' : start.isBefore(tomorrow.add(1, 'day')) ? 'tomorrow' : start.isBefore(weekEnd) ? 'week' : 'later'
    groups[key].push(ev)
  }
  const sortByStart = (list: typeof events) =>
    [...list].sort((a, b) => (a.completed === b.completed ? dayjs(a.startTime).valueOf() - dayjs(b.startTime).valueOf() : a.completed ? 1 : -1))

  return (
    <div className="p-4" data-testid="list-view">
      <h1 className="mb-2 text-lg font-semibold">列表</h1>
      {(['today', 'tomorrow', 'week', 'later'] as GroupKey[]).map(key => (
        <section key={key} data-testid={`group-${key}`}>
          <h2 className="mt-2 text-sm font-semibold text-gray-600">{GROUP_LABEL[key]}</h2>
          <div className="space-y-1">
            {sortByStart(groups[key]).map(ev => (
              <EventItem key={ev.id} event={ev} onEdit={() => {}} onToggle={toggle} />
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}
