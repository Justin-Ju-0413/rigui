import Dexie, { type Table } from 'dexie'
import type { ChatMessage } from './chat'
import type { CalendarEvent, Goal, Settings } from './types'

export class RiguiDB extends Dexie {
  events!: Table<CalendarEvent, number>
  goals!: Table<Goal, number>
  settings!: Table<Settings, string>
  chatMessages!: Table<ChatMessage, number>

  constructor() {
    super('rigui')
    this.version(1).stores({
      events: '++id, startTime, completed',
      goals: '++id',
      settings: 'key',
    })
    this.version(2).stores({ goals: '++id' })
    this.version(3).stores({ chatMessages: '++id, createdAt' })
  }
}

export const db = new RiguiDB()
