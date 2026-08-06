export type RepeatRule = 'none' | 'daily' | 'weekly' | 'monthly'

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
  relatedGoalId?: string
  createdAt: string
}

export interface Goal {
  id?: number
  name: string
  startDate: string
  endDate?: string
  weeklyFrequency?: number
  createdAt: string
}

export interface Settings {
  key: string
  value: string
}
