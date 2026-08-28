import dayjs from 'dayjs'
import { useMemo } from 'react'
import { useEvents } from '../hooks/useEvents'
import EventItem from '../components/EventItem'
import EmptyState from '../components/EmptyState'

type GroupKey = 'today' | 'tomorrow' | 'week' | 'later' | 'past'

const GROUP_LABEL: Record<GroupKey, string> = { today: '今天', tomorrow: '明天', week: '本周', later: '以后', past: '已过去' }

export default function ListView() {
  const { events, toggle } = useEvents()

  // 分组 + 组内排序只随事件集变化重算（避免每次 toggle 后全量重算分组）
  const groups = useMemo(() => {
    const now = dayjs().startOf('day')
    const tomorrow = now.add(1, 'day')
    const weekEnd = now.add(6, 'day')
    const grouped: Record<GroupKey, typeof events> = { today: [], tomorrow: [], week: [], later: [], past: [] }
    for (const ev of events) {
      const start = dayjs(ev.startTime)
      const key: GroupKey = start.isBefore(now) ? 'past' : start.isBefore(tomorrow) ? 'today' : start.isBefore(tomorrow.add(1, 'day')) ? 'tomorrow' : start.isBefore(weekEnd) ? 'week' : 'later'
      grouped[key].push(ev)
    }
    const sorted: Record<GroupKey, typeof events> = { today: [], tomorrow: [], week: [], later: [], past: [] }
    for (const key of Object.keys(grouped) as GroupKey[]) {
      sorted[key] = [...grouped[key]].sort((a, b) =>
        a.completed === b.completed ? dayjs(a.startTime).valueOf() - dayjs(b.startTime).valueOf() : a.completed ? 1 : -1,
      )
    }
    return sorted
  }, [events])

  return (
    <div className="p-4 md:mx-auto md:max-w-3xl md:p-6" data-testid="list-view">
      <h1 className="mb-3 pt-2 text-xl font-semibold tracking-tight md:pt-0 md:text-2xl">列表</h1>
      {events.length === 0 && (
        <EmptyState title="暂无日程" detail="通过对话或月视图新建第一个日程" />
      )}
      {(['today', 'tomorrow', 'week', 'later', 'past'] as GroupKey[]).map(key => (
        <section key={key} data-testid={`group-${key}`}>
          <h2 className="mb-1.5 mt-3 text-sm font-semibold text-[var(--text-secondary)] md:text-base">{GROUP_LABEL[key]}</h2>
          <div className="space-y-1.5">
            {groups[key].map(ev => (
              <EventItem key={ev.id} event={ev} onEdit={() => {}} onToggle={toggle} />
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}
