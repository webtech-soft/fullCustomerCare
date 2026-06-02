import { describe, expect, it } from 'vitest'
import { buildIcalCalendar, isIcalEligibleRecord } from '@/lib/appointments/ical'
import type { AppointmentRecord } from '@/types/appointment'

function createRecord(overrides: Partial<AppointmentRecord> = {}): AppointmentRecord {
  return {
    id: 'appt-1',
    accountId: 'default',
    storeId: '3',
    customerName: 'Jane Doe',
    sendText: true,
    sendEmail: true,
    recordType: 'confirmed',
    status: 'confirmed',
    requestedDate: '2026-05-12',
    requestedTime: '09:30',
    requestedDuration: 60,
    bayId: 'bay-1',
    bayName: 'Bay 1',
    note: 'Oil change; include filter, please',
    createdBy: 'Staff',
    createdAt: '2026-05-08T14:00:00.000Z',
    updatedAt: '2026-05-08T14:30:00.000Z',
    posFlag: false,
    apiSubmitted: false,
    ...overrides,
  }
}

describe('ical utility', () => {
  it('marks only appointment records as eligible', () => {
    expect(isIcalEligibleRecord(createRecord({ recordType: 'confirmed' }))).toBe(true)
    expect(isIcalEligibleRecord(createRecord({ recordType: 'booked_unconfirmed' }))).toBe(true)
    expect(isIcalEligibleRecord(createRecord({ recordType: 'quick_note' }))).toBe(false)
    expect(isIcalEligibleRecord(createRecord({ recordType: 'schedule_note' }))).toBe(false)
  })

  it('builds required VCALENDAR and VEVENT fields', () => {
    const ics = buildIcalCalendar([createRecord()])
    expect(ics).toContain('BEGIN:VCALENDAR')
    expect(ics).toContain('VERSION:2.0')
    expect(ics).toContain('BEGIN:VEVENT')
    expect(ics).toContain('UID:appt-1@customer-care-appointments')
    expect(ics).toContain('SUMMARY:Jane Doe - Appointment')
    expect(ics).toContain('DTSTART:20260512T093000')
    expect(ics).toContain('DTEND:20260512T103000')
    expect(ics).toContain('END:VCALENDAR')
  })

  it('escapes text and skips invalid datetime records', () => {
    const valid = createRecord({ note: 'Line1\nLine2; comma, slash\\test' })
    const invalid = createRecord({ id: 'appt-2', requestedTime: 'am-dropoff' })
    const ics = buildIcalCalendar([valid, invalid])
    expect(ics).toContain('DESCRIPTION:Notes: Line1\\nLine2\\; comma\\, slash\\\\test')
    expect(ics).not.toContain('UID:appt-2@customer-care-appointments')
  })
})
