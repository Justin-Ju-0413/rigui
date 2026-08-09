import { useCallback, useEffect, useState } from 'react'
import { addGoal, deleteGoalCascade, getAllEvents, getAllGoals, updateGoal, type GoalInput } from '../db/crud'
import { subscribeEventsChanged } from '../events/eventBus'
import type { CalendarEvent, Goal } from '../db/types'

export function useGoals() {
  const [goals, setGoals] = useState<Goal[]>([])
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [tick, setTick] = useState(0)

  const refresh = useCallback(() => {
    void Promise.all([getAllGoals(), getAllEvents()]).then(([gs, evs]) => {
      setGoals(gs)
      setEvents(evs)
    })
  }, [])

  useEffect(() => { void refresh() }, [refresh, tick])
  useEffect(() => subscribeEventsChanged(() => setTick(t => t + 1)), [])

  const save = async (input: GoalInput) => {
    const id = await addGoal(input)
    void refresh()
    return id
  }

  const update = async (id: number, patch: Partial<Goal>) => {
    await updateGoal(id, patch)
    void refresh()
  }

  const removeCascade = async (goalId: number) => {
    const n = await deleteGoalCascade(goalId)
    void refresh()
    return n
  }

  return { goals, events, refresh, save, update, removeCascade }
}
