import { db } from './schema'
import type { CalendarEvent, Goal } from './types'

export { db } from './schema'

export async function addEvent(input: Omit<CalendarEvent, 'id' | 'createdAt' | 'completed'>): Promise<number> {
  return db.events.add({ ...input, completed: false, createdAt: new Date().toISOString() })
}

export async function updateEvent(id: number, patch: Partial<CalendarEvent>): Promise<void> {
  await db.events.update(id, patch)
}

export async function deleteEvent(id: number): Promise<void> {
  await db.events.delete(id)
}

export async function getEventsByRange(start: string, end: string): Promise<CalendarEvent[]> {
  return db.events.where('startTime').between(start, end, true, true).toArray()
}

export async function getAllEvents(): Promise<CalendarEvent[]> {
  return db.events.toArray()
}

export async function toggleEventCompleted(id: number): Promise<void> {
  const ev = await db.events.get(id)
  if (ev) await db.events.update(id, { completed: !ev.completed })
}

export type GoalInput = Omit<Goal, 'id' | 'createdAt'>

export async function addGoal(input: GoalInput): Promise<number> {
  return db.goals.add({ ...input, createdAt: new Date().toISOString() })
}

export async function updateGoal(id: number, patch: Partial<Goal>): Promise<void> {
  await db.goals.update(id, patch)
}

export async function getAllGoals(): Promise<Goal[]> {
  return db.goals.toArray()
}

export async function getEventsByGoal(goalId: number): Promise<CalendarEvent[]> {
  return db.events.filter(e => e.relatedGoalId === goalId).toArray()
}

export async function deleteGoalCascade(goalId: number): Promise<number> {
  const toDelete = await db.events.filter(e => e.relatedGoalId === goalId).primaryKeys()
  await db.events.bulkDelete(toDelete)
  await db.goals.delete(goalId)
  return toDelete.length
}
