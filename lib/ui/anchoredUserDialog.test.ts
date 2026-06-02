import { describe, expect, it } from 'vitest'
import { clampAnchoredPosition } from '@/lib/ui/anchoredUserDialog'

describe('clampAnchoredPosition', () => {
  it('places below when there is room', () => {
    const p = clampAnchoredPosition({
      anchorTop: 100,
      anchorLeft: 50,
      anchorWidth: 80,
      anchorHeight: 24,
      panelWidth: 200,
      panelHeight: 100,
      viewportWidth: 400,
      viewportHeight: 600,
      margin: 8,
      gap: 8,
    })
    expect(p.placement).toBe('below')
    expect(p.top).toBe(100 + 24 + 8)
    expect(p.left).toBe(50)
  })

  it('shifts left when panel overflows right edge', () => {
    const p = clampAnchoredPosition({
      anchorTop: 10,
      anchorLeft: 350,
      anchorWidth: 40,
      anchorHeight: 20,
      panelWidth: 200,
      panelHeight: 80,
      viewportWidth: 400,
      viewportHeight: 300,
      margin: 8,
      gap: 8,
    })
    expect(p.left).toBeLessThanOrEqual(400 - 200 - 8)
    expect(p.left).toBeGreaterThanOrEqual(8)
  })

  it('clamps top when panel would exceed viewport height', () => {
    const p = clampAnchoredPosition({
      anchorTop: 500,
      anchorLeft: 20,
      anchorWidth: 100,
      anchorHeight: 30,
      panelWidth: 160,
      panelHeight: 400,
      viewportWidth: 360,
      viewportHeight: 600,
      margin: 8,
      gap: 8,
    })
    expect(p.top).toBeLessThanOrEqual(600 - 400 - 8)
  })
})
