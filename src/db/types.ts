export type RepeatRule = 'none' | 'daily' | 'weekly' | 'monthly'

/** 旧目标（无 tasks 字段）合成默认任务的固定 id；旧事件（无 relatedTaskId）在统计中归入该任务 */
export const DEFAULT_TASK_ID = 'default'

export interface GoalTask {
  id: string
  name: string
  weeklyFrequency: number
  durationMinutes: number
}

export interface CalendarEvent {
  id?: number
  title: string
  startTime: string
  endTime: string
  allDay: boolean
  location?: string
  reminderOffsets: number[]
  repeat: RepeatRule
  completed: boolean
  relatedGoalId?: number
  /** 关联目标下的具体任务（v1.5 目标拆解；旧事件无此字段） */
  relatedTaskId?: string
  createdAt: string
}

export interface Goal {
  id?: number
  name: string
  startDate: string
  endDate?: string
  /** 目标拆解的任务列表（v1.5；旧目标读取时自动合成默认任务） */
  tasks: GoalTask[]
  /** @deprecated v1.5 起由 tasks 取代，旧数据兼容保留 */
  weeklyFrequency?: number
  /** @deprecated v1.5 起由 tasks 取代，旧数据兼容保留 */
  durationMinutes?: number
  createdAt: string
}

export interface Settings {
  key: string
  value: string
}
