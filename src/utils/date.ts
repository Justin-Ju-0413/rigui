import dayjs from 'dayjs'

export const DATE_FORMAT = 'YYYY-MM-DDTHH:mm:ss'

export function parseLocal(dateStr: string): dayjs.Dayjs {
  return dayjs(dateStr)
}

export function sameDay(a: string, b: string): boolean {
  return dayjs(a).isSame(dayjs(b), 'day')
}

export function startOfDay(dateStr: string): string {
  return dayjs(dateStr).startOf('day').format(DATE_FORMAT)
}

export function endOfDay(dateStr: string): string {
  return dayjs(dateStr).endOf('day').format(DATE_FORMAT)
}
