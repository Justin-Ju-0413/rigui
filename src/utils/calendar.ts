import dayjs from 'dayjs'

export interface CalendarCell { key: string; date: string; inMonth: boolean }

export function buildMonthGrid(anchor: string): CalendarCell[][] {
  const base = dayjs(anchor).startOf('month')
  const monday = base.subtract((base.day() + 6) % 7, 'day')
  const grid: CalendarCell[][] = []
  for (let row = 0; row < 6; row++) {
    const cells: CalendarCell[] = []
    for (let col = 0; col < 7; col++) {
      const d = monday.add(row * 7 + col, 'day')
      cells.push({ key: d.format('YYYY-MM-DD'), date: d.format('YYYY-MM-DDTHH:mm:ss'), inMonth: d.month() === base.month() })
    }
    grid.push(cells)
  }
  return grid
}
