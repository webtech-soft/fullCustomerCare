import { describe, expect, it } from 'vitest'
import type { AppointmentRecord } from '@/types/appointment'
import {
  reconcileBayBlockersAgainstShopCloses,
  reconcileBayBlockersForDate,
} from '@/lib/appointments/shopClosePrecedence'

const iso = '2026-04-17'

function base(partial: Partial<AppointmentRecord> & Pick<AppointmentRecord, 'id' | 'recordType'>): AppointmentRecord {
  return {
    accountId: 'default',
    storeId: '1',
    customerName: 'Note',
    sendText: false,
    sendEmail: false,
    status: 'unconfirmed',
    requestedDate: iso,
    requestedTime: '09:00',
    requestedDuration: 60,
    bayId: 'bay-1',
    bayName: 'Bay 1',
    createdBy: 'Staff',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    posFlag: false,
    apiSubmitted: false,
    ...partial,
  }
}

describe('reconcileBayBlockersForDate', () => {
  it('trims bay blocker end when shop close overlaps tail (1–7 vs 3–7 → 1–3)', () => {
    const records: AppointmentRecord[] = [
      base({
        id: 'shop-1',
        recordType: 'schedule_note',
        scheduleBlockerType: 'shop_close',
        requestedTime: '03:00',
        requestedDuration: 240,
        bayId: 'NB',
        bayName: 'Shop',
      }),
      base({
        id: 'bay-1',
        recordType: 'schedule_note',
        scheduleBlockerType: 'bay_blocker',
        requestedTime: '01:00',
        requestedDuration: 360,
        bayId: 'bay-1',
        bayName: 'Bay 1',
      }),
    ]
    const out = reconcileBayBlockersForDate(records, iso)
    const blocker = out.find((r) => r.id === 'bay-1')
    expect(blocker).toBeDefined()
    expect(blocker?.requestedTime).toBe('01:00')
    expect(blocker?.requestedDuration).toBe(120)
    expect(out.filter((r) => r.recordType === 'schedule_note' && r.scheduleBlockerType === 'bay_blocker')).toHaveLength(1)
  })

  it('removes bay blocker fully covered by shop close (2–3 inside 1–7)', () => {
    const records: AppointmentRecord[] = [
      base({
        id: 'shop-1',
        recordType: 'schedule_note',
        scheduleBlockerType: 'shop_close',
        requestedTime: '01:00',
        requestedDuration: 360,
        bayId: 'NB',
        bayName: 'Shop',
      }),
      base({
        id: 'bay-1',
        recordType: 'schedule_note',
        scheduleBlockerType: 'bay_blocker',
        requestedTime: '02:00',
        requestedDuration: 60,
        bayId: 'bay-1',
        bayName: 'Bay 1',
      }),
    ]
    const out = reconcileBayBlockersForDate(records, iso)
    expect(out.find((r) => r.id === 'bay-1')).toBeUndefined()
    expect(out.some((r) => r.scheduleBlockerType === 'bay_blocker')).toBe(false)
  })

  it('splits bay blocker when shop close overlaps middle (1–7 vs 3–5 → 1–3 and 5–7)', () => {
    const records: AppointmentRecord[] = [
      base({
        id: 'shop-1',
        recordType: 'schedule_note',
        scheduleBlockerType: 'shop_close',
        requestedTime: '03:00',
        requestedDuration: 120,
        bayId: 'NB',
        bayName: 'Shop',
      }),
      base({
        id: 'bay-1',
        recordType: 'schedule_note',
        scheduleBlockerType: 'bay_blocker',
        requestedTime: '01:00',
        requestedDuration: 360,
        bayId: 'bay-1',
        bayName: 'Bay 1',
      }),
    ]
    const out = reconcileBayBlockersForDate(records, iso)
    const blockers = out.filter((r) => r.scheduleBlockerType === 'bay_blocker')
    expect(blockers).toHaveLength(2)
    const first = blockers.find((r) => r.id === 'bay-1')
    expect(first?.requestedTime).toBe('01:00')
    expect(first?.requestedDuration).toBe(120)
    const second = blockers.find((r) => r.id !== 'bay-1')
    expect(second?.requestedTime).toBe('05:00')
    expect(second?.requestedDuration).toBe(120)
  })

  it('leaves bay blocker unchanged when no overlap', () => {
    const records: AppointmentRecord[] = [
      base({
        id: 'shop-1',
        recordType: 'schedule_note',
        scheduleBlockerType: 'shop_close',
        requestedTime: '01:00',
        requestedDuration: 360,
        bayId: 'NB',
        bayName: 'Shop',
      }),
      base({
        id: 'bay-1',
        recordType: 'schedule_note',
        scheduleBlockerType: 'bay_blocker',
        requestedTime: '08:00',
        requestedDuration: 60,
        bayId: 'bay-1',
        bayName: 'Bay 1',
      }),
    ]
    const out = reconcileBayBlockersForDate(records, iso)
    const blocker = out.find((r) => r.id === 'bay-1')
    expect(blocker?.requestedTime).toBe('08:00')
    expect(blocker?.requestedDuration).toBe(60)
  })

  it('does not change bay blocker on another date', () => {
    const other = '2026-04-18'
    const records: AppointmentRecord[] = [
      base({
        id: 'shop-1',
        recordType: 'schedule_note',
        scheduleBlockerType: 'shop_close',
        requestedDate: iso,
        requestedTime: '01:00',
        requestedDuration: 480,
        bayId: 'NB',
        bayName: 'Shop',
      }),
      base({
        id: 'bay-1',
        recordType: 'schedule_note',
        scheduleBlockerType: 'bay_blocker',
        requestedDate: other,
        requestedTime: '01:00',
        requestedDuration: 360,
        bayId: 'bay-1',
        bayName: 'Bay 1',
      }),
    ]
    const out = reconcileBayBlockersAgainstShopCloses(records)
    const blocker = out.find((r) => r.id === 'bay-1')
    expect(blocker?.requestedDate).toBe(other)
    expect(blocker?.requestedTime).toBe('01:00')
    expect(blocker?.requestedDuration).toBe(360)
  })
})
