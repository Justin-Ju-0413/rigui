import { useEffect, useRef, useState } from 'react'
import { addEvent, deleteEvent, getEventsByRange, toggleEventCompleted, updateEvent } from '../db/crud'
import type { CalendarEvent } from '../db/types'

export interface UseEventsOptions {
  rangeStart?: string
  rangeEnd?: string
}

export function useEvents({ rangeStart, rangeEnd }: UseEventsOptions = {}) {
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [reloadTick, setReloadTick] = useState(0)
  const firstRender = useRef(true)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      const rows = rangeStart && rangeEnd
        ? await getEventsByRange(rangeStart, rangeEnd)
        : await getEventsByRange('2000-01-01T00:00:00', '2100-12-31T23:59:59')
      if (!cancelled) setEvents(rows)
    }
    if (firstRender.current || reloadTick > 0) void load()
    firstRender.current = false
    return () => { cancelled = true }
  }, [rangeStart, rangeEnd, reloadTick])

  const refresh = () => setReloadTick(t => t + 1)

  const save = async (input: Omit<CalendarEvent, 'id' | 'createdAt' | 'completed'>) => {
    const id = await addEvent(input)
    refresh()
    return id
  }

  const update = async (id: number, patch: Partial<CalendarEvent>) => {
    await updateEvent(id, patch)
    refresh()
  }

  const remove = async (id: number) => {
    await deleteEvent(id)
    refresh()
  }

  const toggle = async (id: number) => {
    await toggleEventCompleted(id)
    refresh()
  }

  return { events, save, update, remove, toggle, refresh }
}
