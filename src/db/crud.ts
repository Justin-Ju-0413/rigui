import { db } from './schema'
import { DEFAULT_TASK_ID } from './types'
import type { CalendarEvent, Goal, GoalTask } from './types'

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

/** v1.5 兼容：旧目标（无 tasks 字段）合成默认任务，参数取旧字段，保证旧数据可排期可统计 */
export function normalizeGoal(goal: Goal): Goal {
  if (goal.tasks && goal.tasks.length > 0) return goal
  return {
    ...goal,
    tasks: [{
      id: DEFAULT_TASK_ID,
      name: goal.name,
      weeklyFrequency: goal.weeklyFrequency ?? 1,
      durationMinutes: goal.durationMinutes ?? 60,
    }],
  }
}

export async function addGoal(input: GoalInput): Promise<number> {
  return db.goals.add({ ...input, createdAt: new Date().toISOString() })
}

export async function updateGoal(id: number, patch: Partial<Goal>): Promise<void> {
  await db.goals.update(id, patch)
}

export async function getAllGoals(): Promise<Goal[]> {
  const goals = await db.goals.toArray()
  return goals.map(normalizeGoal)
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

// ---- 目标任务拆解（v1.5） ----

async function updateTasks(goalId: number, apply: (tasks: GoalTask[]) => GoalTask[]): Promise<void> {
  const goal = await db.goals.get(goalId)
  if (!goal) return
  await db.goals.update(goalId, { tasks: apply(normalizeGoal(goal).tasks) })
}

export async function addTask(goalId: number, task: GoalTask): Promise<void> {
  await updateTasks(goalId, tasks => [...tasks, task])
}

export async function updateTask(goalId: number, task: GoalTask): Promise<void> {
  await updateTasks(goalId, tasks => tasks.map(t => (t.id === task.id ? task : t)))
}

/** 移除任务并级联删除其关联事件，返回删除的事件数 */
export async function removeTaskCascade(goalId: number, taskId: string): Promise<number> {
  const goal = await db.goals.get(goalId)
  if (!goal) return 0
  const tasks = normalizeGoal(goal).tasks.filter(t => t.id !== taskId)
  const toDelete = await db.events.filter(e => e.relatedGoalId === goalId && e.relatedTaskId === taskId).primaryKeys()
  await db.events.bulkDelete(toDelete)
  await db.goals.update(goalId, { tasks })
  return toDelete.length
}
