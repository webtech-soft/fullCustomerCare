/** Margin from viewport edges for fixed popovers (matches 1rem page gutters). */
const POPOVER_MARGIN = 16

/** Dynamic viewport height; prefers Visual Viewport API on mobile. */
export function getVisualViewportHeight(): number {
  if (typeof window === 'undefined') return 600
  return window.visualViewport?.height ?? window.innerHeight
}

/** Clamp horizontal position so a panel of `panelWidth` stays inside the viewport. */
export function clampPopoverLeft(left: number, panelWidth: number, margin = POPOVER_MARGIN): number {
  const vw = window.innerWidth
  const maxLeft = vw - panelWidth - margin
  return Math.max(margin, Math.min(left, maxLeft))
}

/**
 * Effective width for anchored popovers: matches Tailwind `max-w-sm` (384px), capped to viewport.
 */
export function anchoredPopoverWidthPx(): number {
  const vw = window.innerWidth
  return Math.min(384, vw - 2 * POPOVER_MARGIN)
}

/**
 * Position for custom date range popovers: flip above anchor when needed; clamp vertically & horizontally.
 */
export function positionDateRangePopover(
  anchorRect: DOMRect,
  estimatedHeight = 220,
  padding = 8,
): { top: number; left: number } {
  const popoverWidth = anchoredPopoverWidthPx()
  const vh = getVisualViewportHeight()

  const spaceBelow = vh - anchorRect.bottom - padding
  const spaceAbove = anchorRect.top - padding
  const showAbove = spaceBelow < estimatedHeight && spaceAbove > spaceBelow

  let top: number
  if (showAbove) {
    top = anchorRect.top - estimatedHeight - padding
  } else {
    top = anchorRect.bottom + padding
  }

  if (top < padding) top = padding
  if (top + estimatedHeight > vh - padding) {
    top = Math.max(padding, vh - estimatedHeight - padding)
  }

  const left = clampPopoverLeft(anchorRect.left, popoverWidth, padding)
  return { top, left }
}
