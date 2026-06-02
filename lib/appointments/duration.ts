export interface DurationParts {
  hours: number
  minutes: number
}

function toWholeNumber(value: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.floor(value)
}

export function sanitizeDurationHours(value: number): number {
  return Math.max(0, toWholeNumber(value))
}

export function sanitizeDurationMinutes(value: number): number {
  const next = toWholeNumber(value)
  if (next < 0) return 0
  if (next > 59) return 59
  return next
}

export function toDurationParts(totalMinutes: number): DurationParts {
  const safeTotal = Math.max(0, toWholeNumber(totalMinutes))
  return {
    hours: Math.floor(safeTotal / 60),
    minutes: safeTotal % 60,
  }
}

export function toTotalMinutes(hours: number, minutes: number): number {
  const safeHours = sanitizeDurationHours(hours)
  const safeMinutes = sanitizeDurationMinutes(minutes)
  return safeHours * 60 + safeMinutes
}

export function normalizeDuration(totalMinutes: number, minimumMinutes = 15): number {
  const safeTotal = Math.max(0, toWholeNumber(totalMinutes))
  return Math.max(minimumMinutes, safeTotal)
}

export function formatDurationHoursMinutes(totalMinutes: number): string {
  const { hours, minutes } = toDurationParts(totalMinutes)
  if (hours === 0) {
    return `${minutes}m`
  }
  return `${hours}h ${minutes}m`
}
