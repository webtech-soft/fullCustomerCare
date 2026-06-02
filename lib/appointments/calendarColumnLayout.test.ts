import { describe, expect, it } from 'vitest'
import { blockTopHeightPx, dayColumnHeightPx, minutesFromGridTop, nowLineTopFromGridStart } from './calendarColumnLayout'
import type { AppointmentRecord } from '@/types/appointment'

const record = (time: string, duration: number): AppointmentRecord =>
  ({
    id: '1',
    requestedDate: '2026-01-01',
    requestedTime: time,
    requestedDuration: duration,
    recordType: 'confirmed',
  }) as AppointmentRecord

describe('calendarColumnLayout', () => {
  it('dayColumnHeightPx matches 24 slots at 56px', () => {
    expect(dayColumnHeightPx()).toBe(24 * 56)
  })

  it('minutesFromGridTop respects grid start', () => {
    expect(minutesFromGridTop(record('07:00', 60))).toBe(7 * 60)
  })

  it('blockTopHeightPx stacks from column top', () => {
    const { top, height } = blockTopHeightPx(record('08:30', 120))
    expect(top).toBeGreaterThan(0)
    expect(height).toBeGreaterThan(40)
  })

  it('nowLineTopFromGridStart returns null outside grid', () => {
    expect(nowLineTopFromGridStart(24 * 60)).toBe(null)
  })
})
