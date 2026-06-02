export function toMinutes(time: string): number {
  const [hourStr, minuteStr] = time.split(':')
  const hour = Number(hourStr)
  const minute = Number(minuteStr)

  if (Number.isNaN(hour) || Number.isNaN(minute)) {
    return 0
  }

  return hour * 60 + minute
}

export function minutesToTime(totalMinutes: number): string {
  const safeMinutes = Math.max(0, Math.min(totalMinutes, 23 * 60 + 59))
  const hour = Math.floor(safeMinutes / 60)
  const minute = safeMinutes % 60
  return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
}

export function addMinutes(time: string, minutes: number): string {
  return minutesToTime(toMinutes(time) + minutes)
}

export function formatTimeLabel(time: string): string {
  const [hourStr, minuteStr] = time.split(':')
  const hour = Number(hourStr)
  const minute = Number(minuteStr)
  const amPm = hour >= 12 ? 'PM' : 'AM'
  const displayHour = hour % 12 === 0 ? 12 : hour % 12
  return `${displayHour}:${minute.toString().padStart(2, '0')} ${amPm}`
}

export function dateAtTime(date: string, time: string): Date {
  return new Date(`${date}T${time}:00`)
}

export function isWithinRange(date: string, from?: string, to?: string): boolean {
  if (!from && !to) {
    return true
  }
  if (from && date < from) {
    return false
  }
  if (to && date > to) {
    return false
  }
  return true
}

export function getWeekStart(date: Date): Date {
  const start = new Date(date)
  start.setHours(0, 0, 0, 0)
  start.setDate(start.getDate() - start.getDay())
  return start
}

export function startOfMonthGrid(date: Date): Date {
  const d = new Date(date.getFullYear(), date.getMonth(), 1)
  d.setDate(d.getDate() - d.getDay())
  return d
}
