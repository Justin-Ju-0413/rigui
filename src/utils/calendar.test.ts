import { describe, expect, it } from 'vitest'
import { buildMonthGrid } from './calendar'

describe('buildMonthGrid', () => {
  it('2026-08 网格共 42 格且 8 月 1 日周六落在正确列', () => {
    const grid = buildMonthGrid('2026-08-06T00:00:00')
    expect(grid.flat()).toHaveLength(42)
    const firstRow = grid[0].map(c => c.key)
    expect(firstRow[5]).toBe('2026-08-01')
  })
  it('网格包含前后月补齐日期', () => {
    const grid = buildMonthGrid('2026-08-06T00:00:00')
    const keys = grid.flat().map(c => c.key)
    expect(keys[0]).toBe('2026-07-27')
    expect(keys.at(-1)).toBe('2026-09-06')
  })
  it('2 月平年 28 天', () => {
    const grid = buildMonthGrid('2026-02-10T00:00:00')
    expect(grid.flat().filter(c => c.key.startsWith('2026-02-'))).toHaveLength(28)
  })
})
