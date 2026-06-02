import { ref, shallowRef } from 'vue'
import { isUserDialogSuppressed, setUserDialogSuppressed } from '@/lib/ui/userDialogPrefs'

export type DialogAnchor = MouseEvent | HTMLElement | null | undefined

export type AnchoredDialogVariant = 'danger' | 'default'

export interface ConfirmAnchoredOptions {
  message: string
  anchor?: DialogAnchor
  preferenceKey?: string
  variant?: AnchoredDialogVariant
  confirmLabel?: string
  cancelLabel?: string
}

export interface AlertAnchoredOptions {
  message: string
  anchor?: DialogAnchor
  preferenceKey?: string
  okLabel?: string
}

export interface AnchoredDialogPosition {
  top: number
  left: number
  placement: 'below' | 'above'
}

/** Pure placement helper (viewport + anchor + panel size). */
export function clampAnchoredPosition(args: {
  anchorTop: number
  anchorLeft: number
  anchorWidth: number
  anchorHeight: number
  panelWidth: number
  panelHeight: number
  viewportWidth: number
  viewportHeight: number
  margin: number
  gap: number
}): AnchoredDialogPosition {
  const {
    anchorTop,
    anchorLeft,
    anchorHeight,
    panelWidth,
    panelHeight,
    viewportWidth,
    viewportHeight,
    margin,
    gap,
  } = args

  const anchorBottom = anchorTop + anchorHeight
  const spaceBelow = viewportHeight - anchorBottom - margin
  const spaceAbove = anchorTop - margin
  const preferBelow = spaceBelow >= panelHeight + gap || spaceBelow >= spaceAbove
  const placement: 'below' | 'above' = preferBelow ? 'below' : 'above'

  let top =
    placement === 'below' ? anchorBottom + gap : anchorTop - gap - panelHeight

  let left = anchorLeft

  const maxLeft = Math.max(margin, viewportWidth - panelWidth - margin)
  left = Math.min(Math.max(margin, left), maxLeft)

  const maxTop = Math.max(margin, viewportHeight - panelHeight - margin)
  top = Math.min(Math.max(margin, top), maxTop)

  return { top, left, placement }
}

export type OpenUserDialogState =
  | {
      kind: 'confirm'
      message: string
      variant: AnchoredDialogVariant
      preferenceKey?: string
      showDontAskAgain: boolean
      confirmLabel: string
      cancelLabel: string
      anchorRect: { top: number; left: number; width: number; height: number }
    }
  | {
      kind: 'alert'
      message: string
      preferenceKey?: string
      showDontAskAgain: boolean
      okLabel: string
      anchorRect: { top: number; left: number; width: number; height: number }
    }

export const anchoredUserDialogOpen = ref(false)
export const anchoredUserDialogState = shallowRef<OpenUserDialogState | null>(null)

let lastPointer: { x: number; y: number } = { x: 0, y: 0 }
let hostMounted = false

export function setAnchoredUserDialogHostMounted(mounted: boolean) {
  hostMounted = mounted
}

export function recordLastPointer(clientX: number, clientY: number) {
  lastPointer = { x: clientX, y: clientY }
}

function rectFromAnchor(anchor?: DialogAnchor): { top: number; left: number; width: number; height: number } {
  if (typeof window === 'undefined') {
    return { top: 0, left: 0, width: 1, height: 1 }
  }
  if (anchor instanceof HTMLElement) {
    const r = anchor.getBoundingClientRect()
    return { top: r.top, left: r.left, width: Math.max(r.width, 1), height: Math.max(r.height, 1) }
  }
  if (anchor && typeof anchor === 'object' && 'clientX' in anchor) {
    const e = anchor as MouseEvent
    return { top: e.clientY, left: e.clientX, width: 1, height: 1 }
  }
  const ae = document.activeElement
  if (ae instanceof HTMLElement) {
    const r = ae.getBoundingClientRect()
    if (r.width > 0 && r.height > 0) {
      return { top: r.top, left: r.left, width: Math.max(r.width, 1), height: Math.max(r.height, 1) }
    }
  }
  return {
    top: lastPointer.y,
    left: lastPointer.x,
    width: 1,
    height: 1,
  }
}

type Resolver = (value: boolean | void) => void
let currentResolver: Resolver | null = null

let chain: Promise<void> = Promise.resolve()

function closeDialog(result: boolean | void) {
  anchoredUserDialogOpen.value = false
  anchoredUserDialogState.value = null
  const r = currentResolver
  currentResolver = null
  r?.(result)
}

/** Called by host: primary action */
export function resolveAnchoredUserDialogPrimary(dontAskAgain: boolean) {
  const state = anchoredUserDialogState.value
  if (!state) return
  if (dontAskAgain && state.preferenceKey) {
    setUserDialogSuppressed(state.preferenceKey, true)
  }
  if (state.kind === 'confirm') {
    closeDialog(true)
  } else {
    closeDialog()
  }
}

/** Called by host: cancel (confirm only) */
export function resolveAnchoredUserDialogCancel() {
  const state = anchoredUserDialogState.value
  if (!state || state.kind !== 'confirm') return
  closeDialog(false)
}

/** Escape / backdrop — treat as cancel for confirm, dismiss for alert */
export function resolveAnchoredUserDialogDismiss() {
  const state = anchoredUserDialogState.value
  if (!state) return
  if (state.kind === 'confirm') closeDialog(false)
  else closeDialog()
}

function openDialog(state: OpenUserDialogState): Promise<boolean | void> {
  return new Promise<boolean | void>((resolve) => {
    if (!hostMounted) {
      if (state.kind === 'confirm') resolve(false)
      else resolve()
      return
    }
    currentResolver = resolve
    anchoredUserDialogState.value = state
    anchoredUserDialogOpen.value = true
  })
}

export function confirmAnchored(options: ConfirmAnchoredOptions): Promise<boolean> {
  const {
    message,
    anchor,
    preferenceKey,
    variant = 'default',
    confirmLabel = 'OK',
    cancelLabel = 'Cancel',
  } = options

  return new Promise<boolean>((resolve) => {
    chain = chain.then(async () => {
      if (preferenceKey && isUserDialogSuppressed(preferenceKey)) {
        resolve(true)
        return
      }
      const anchorRect = rectFromAnchor(anchor)
      const result = await openDialog({
        kind: 'confirm',
        message,
        variant,
        preferenceKey,
        showDontAskAgain: !!preferenceKey,
        confirmLabel,
        cancelLabel,
        anchorRect,
      })
      resolve(!!result)
    })
  })
}

export function alertAnchored(options: AlertAnchoredOptions): Promise<void> {
  const { message, anchor, preferenceKey, okLabel = 'OK' } = options

  return new Promise<void>((resolve) => {
    chain = chain.then(async () => {
      if (preferenceKey && isUserDialogSuppressed(preferenceKey)) {
        resolve()
        return
      }
      const anchorRect = rectFromAnchor(anchor)
      await openDialog({
        kind: 'alert',
        message,
        preferenceKey,
        showDontAskAgain: !!preferenceKey,
        okLabel,
        anchorRect,
      })
      resolve()
    })
  })
}
