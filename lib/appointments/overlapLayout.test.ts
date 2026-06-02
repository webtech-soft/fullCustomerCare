import { describe, expect, it } from 'vitest'
import { computeLaneLayout, intervalsOverlap } from './overlapLayout'

describe('intervalsOverlap', () => {
  it('returns false for touching endpoints', () => {
    expect(intervalsOverlap({ id: 'a', start: 0, end: 60 }, { id: 'b', start: 60, end: 120 })).toBe(false)
  })

  it('returns true for partial overlap', () => {
    expect(intervalsOverlap({ id: 'a', start: 0, end: 90 }, { id: 'b', start: 60, end: 120 })).toBe(true)
  })
})

describe('computeLaneLayout', () => {
  it('assigns full width for a single interval', () => {
    const m = computeLaneLayout([{ id: 'a', start: 100, end: 200 }])
    expect(m.get('a')).toEqual({ laneIndex: 0, laneCount: 1 })
  })

  it('stacks two simultaneous intervals side by side', () => {
    const m = computeLaneLayout([
      { id: 'a', start: 100, end: 200 },
      { id: 'b', start: 120, end: 180 },
    ])
    expect(m.get('a')?.laneCount).toBe(2)
    expect(m.get('b')?.laneCount).toBe(2)
    expect(m.get('a')?.laneIndex).not.toBe(m.get('b')?.laneIndex)
  })

  it('chains A-B-C transitive overlap share one component with max 2 columns', () => {
    const m = computeLaneLayout([
      { id: 'a', start: 540, end: 600 },
      { id: 'b', start: 570, end: 630 },
      { id: 'c', start: 600, end: 660 },
    ])
    expect(m.get('a')?.laneCount).toBe(2)
    expect(m.get('b')?.laneCount).toBe(2)
    expect(m.get('c')?.laneCount).toBe(2)
  })

  it('keeps disjoint intervals in separate groups at full width', () => {
    const m = computeLaneLayout([
      { id: 'a', start: 0, end: 60 },
      { id: 'b', start: 120, end: 180 },
    ])
    expect(m.get('a')).toEqual({ laneIndex: 0, laneCount: 1 })
    expect(m.get('b')).toEqual({ laneIndex: 0, laneCount: 1 })
  })

  it('handles identical starts with stable id tie-break', () => {
    const m = computeLaneLayout([
      { id: 'z', start: 100, end: 150 },
      { id: 'a', start: 100, end: 150 },
    ])
    expect(m.get('a')?.laneCount).toBe(2)
    expect(m.get('z')?.laneCount).toBe(2)
  })

  it('handles three-way overlap', () => {
    const m = computeLaneLayout([
      { id: 'a', start: 0, end: 120 },
      { id: 'b', start: 0, end: 120 },
      { id: 'c', start: 0, end: 120 },
    ])
    expect(m.get('a')?.laneCount).toBe(3)
    expect(m.get('b')?.laneCount).toBe(3)
    expect(m.get('c')?.laneCount).toBe(3)
  })
})
