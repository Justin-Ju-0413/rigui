import Dexie, { type Table } from 'dexie'
import type { CalendarEvent, Goal, Settings } from './types'

export class RiguiDB extends Dexie {
  events!: Table<CalendarEvent, number>
  goals!: Table<Goal, number>
  settings!: Table<Settings, string>

  constructor() {
    super('rigui')
    this.version(1).stores({
      events: '++id, startTime, completed',
      goals: '++id',
      settings: 'key',
    })
    this.version(2).stores({ goals: '++id' })
  }
}

export const db = new RiguiDB()
