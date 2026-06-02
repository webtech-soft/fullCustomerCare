import type { AppointmentRecord } from '@/types/appointment'

const PROD_ID = '-//AndreoliAndAssociates//CustomerCare//EN'

function pad(value: number): string {
  return String(value).padStart(2, '0')
}

function formatUtcTimestamp(date: Date): string {
  return [
    date.getUTCFullYear(),
    pad(date.getUTCMonth() + 1),
    pad(date.getUTCDate()),
    'T',
    pad(date.getUTCHours()),
    pad(date.getUTCMinutes()),
    pad(date.getUTCSeconds()),
    'Z',
  ].join('')
}

function formatLocalTimestamp(date: Date): string {
  return [
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate()),
    'T',
    pad(date.getHours()),
    pad(date.getMinutes()),
    '00',
  ].join('')
}

function parseLocalDateTime(requestedDate: string, requestedTime: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(requestedDate) || !/^\d{2}:\d{2}$/.test(requestedTime)) {
    return null
  }
  const [year, month, day] = requestedDate.split('-').map(Number)
  const [hour, minute] = requestedTime.split(':').map(Number)
  const parsed = new Date(year, month - 1, day, hour, minute, 0, 0)
  if (Number.isNaN(parsed.getTime())) {
    return null
  }
  return parsed
}

function escapeIcalText(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/\r\n/g, '\n')
    .replace(/\n/g, '\\n')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
}

function buildSummary(record: AppointmentRecord): string {
  if (record.customerName.trim()) {
    return `${record.customerName.trim()} - Appointment`
  }
  return 'Appointment'
}

function buildDescription(record: AppointmentRecord): string {
  const parts = [
    record.note ? `Notes: ${record.note}` : '',
    record.vehicle?.licensePlate ? `Plate: ${record.vehicle.licensePlate}` : '',
    record.vehicle?.year || record.vehicle?.make || record.vehicle?.model
      ? `Vehicle: ${[record.vehicle?.year, record.vehicle?.make, record.vehicle?.model].filter(Boolean).join(' ')}`
      : '',
    record.bayName ? `Bay: ${record.bayName}` : '',
  ].filter(Boolean)
  return parts.join('\n')
}

export function isIcalEligibleRecord(record: AppointmentRecord): boolean {
  return record.recordType === 'booked_unconfirmed' || record.recordType === 'confirmed'
}

export function buildIcalCalendar(records: AppointmentRecord[], options?: { storeId?: string }): string {
  const filtered = records.filter((record) => {
    if (!isIcalEligibleRecord(record)) return false
    if (options?.storeId && record.storeId !== options.storeId) return false
    return true
  })

  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    `PRODID:${PROD_ID}`,
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
  ]

  for (const record of filtered) {
    const start = parseLocalDateTime(record.requestedDate, record.requestedTime)
    if (!start) continue

    const durationMinutes = Number.isFinite(record.requestedDuration) && record.requestedDuration > 0 ? record.requestedDuration : 60
    const end = new Date(start.getTime() + durationMinutes * 60_000)
    const updatedAt = new Date(record.updatedAt || Date.now())
    const uid = `${record.id}@customer-care-appointments`
    const description = buildDescription(record)

    lines.push('BEGIN:VEVENT')
    lines.push(`UID:${escapeIcalText(uid)}`)
    lines.push(`DTSTAMP:${formatUtcTimestamp(updatedAt)}`)
    lines.push(`DTSTART:${formatLocalTimestamp(start)}`)
    lines.push(`DTEND:${formatLocalTimestamp(end)}`)
    lines.push(`SUMMARY:${escapeIcalText(buildSummary(record))}`)
    if (description) {
      lines.push(`DESCRIPTION:${escapeIcalText(description)}`)
    }
    lines.push(`STATUS:${record.status === 'confirmed' ? 'CONFIRMED' : 'TENTATIVE'}`)
    lines.push('END:VEVENT')
  }

  lines.push('END:VCALENDAR')
  return `${lines.join('\r\n')}\r\n`
}
