import { useCallback, useEffect, useState } from 'react'
import {
  addGoal,
  addTask as dbAddTask,
  deleteGoalCascade,
  getAllEvents,
  getAllGoals,
  removeTaskCascade as dbRemoveTaskCascade,
  updateGoal,
  updateTask as dbUpdateTask,
  type GoalInput,
} from '../db/crud'
import { subscribeEventsChanged } from '../events/eventBus'
import type { CalendarEvent, Goal, GoalTask } from '../db/types'

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

  const addTask = async (goalId: number, task: GoalTask) => {
    await dbAddTask(goalId, task)
    void refresh()
  }

  const updateTask = async (goalId: number, task: GoalTask) => {
    await dbUpdateTask(goalId, task)
    void refresh()
  }

  const removeTaskCascade = async (goalId: number, taskId: string) => {
    const n = await dbRemoveTaskCascade(goalId, taskId)
    void refresh()
    return n
  }

  return { goals, events, refresh, save, update, removeCascade, addTask, updateTask, removeTaskCascade }
}
