<template>
  <Teleport to="body">
    <div v-if="props.open" class="fixed inset-0 z-[160] pointer-events-none">
      <!-- Captures pointer events so page UI under the tour is not clickable; same data attr as panel for click-outside checks. -->
      <div
        class="fixed inset-0 z-0 cursor-default bg-transparent pointer-events-auto"
        data-tickets-onboarding-tour="true"
        aria-hidden="true"
      />
      <!-- Full dim only while spotlight rect is not ready (dim+cutout uses the spotlight layer below). -->
      <div
        v-if="effectiveActiveStep.selector && !spotlightRect"
        class="fixed inset-0 bg-slate-900/45 pointer-events-none"
        aria-hidden="true"
      />
      <div
        v-if="effectiveActiveStep.selector && spotlightRect"
        class="pointer-events-none fixed z-[1] rounded-lg border-2 border-brand-accent/90 shadow-[0_0_0_9999px_rgba(15,23,42,0.5)]"
        :style="spotlightStyle"
        aria-hidden="true"
      />

      <section
        ref="panelRef"
        data-tickets-onboarding-tour="true"
        class="fixed z-[2] w-[min(92vw,22rem)] rounded-xl border border-border bg-card text-card-foreground shadow-xl pointer-events-auto transition-none"
        :class="{ 'opacity-0 pointer-events-none': panelConcealed }"
        :style="panelStyle"
        role="dialog"
        aria-modal="false"
        aria-label="Tickets onboarding"
      >
        <div class="relative">
          <div class="border-b border-border px-4 py-3">
            <p class="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {{ panelEyebrow }}
            </p>
            <h2 class="mt-1 text-base font-semibold text-foreground">{{ displayTitle }}</h2>
          </div>
          <div class="px-4 py-3">
            <p
              v-if="displayDescriptionHtml"
              class="text-sm leading-5 text-muted-foreground [&_strong]:font-semibold [&_strong]:text-foreground"
              v-html="displayDescriptionHtml"
            />
            <p v-else class="text-sm leading-5 text-muted-foreground">
              {{ displayDescription }}
            </p>
          </div>
          <div class="border-t border-border px-4 py-3">
            <div v-if="useBranchFinalLayout" class="flex flex-col gap-2">
              <div class="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
                <span class="text-xs tabular-nums text-muted-foreground shrink-0">
                  {{ stepIndex + 1 }} / {{ steps.length }}
                </span>
                <button
                  ref="nextButtonRef"
                  type="button"
                  class="rounded-md bg-brand-ink px-3 py-1.5 text-sm font-semibold text-white shadow-sm hover:bg-slate-800 disabled:opacity-50"
                  :disabled="nextDisabled"
                  @click="onNext"
                >
                  {{ primaryButtonLabel }}
                </button>
              </div>
              <div class="flex flex-wrap items-center justify-end gap-2">
                <button
                  type="button"
                  class="rounded-md px-2.5 py-1.5 text-sm font-medium text-muted-foreground hover:bg-muted"
                  @click="onSkip"
                >
                  Skip
                </button>
                <button
                  type="button"
                  class="rounded-md px-2.5 py-1.5 text-sm font-medium text-muted-foreground hover:bg-muted disabled:pointer-events-none disabled:opacity-50"
                  :disabled="stepIndex === 0"
                  @click="onBack"
                >
                  Back
                </button>
                <button
                  v-for="a in secondaryActions"
                  :key="a.actionId"
                  type="button"
                  class="rounded-md bg-brand-accent px-3 py-1.5 text-sm font-semibold text-brand-accent-foreground shadow-sm hover:opacity-90 disabled:opacity-50"
                  :disabled="a.disabled"
                  @click="emit('secondary-action', a.actionId)"
                >
                  {{ a.label }}
                </button>
              </div>
            </div>
            <div
              v-else
              class="flex flex-wrap items-center justify-between gap-x-3 gap-y-2"
            >
              <span class="text-xs tabular-nums text-muted-foreground shrink-0">
                {{ stepIndex + 1 }} / {{ steps.length }}
              </span>
              <div class="flex min-w-0 flex-1 flex-wrap items-center justify-end gap-2 sm:flex-nowrap">
                <button
                  type="button"
                  class="rounded-md px-2.5 py-1.5 text-sm font-medium text-muted-foreground hover:bg-muted"
                  @click="onSkip"
                >
                  Skip
                </button>
                <button
                  type="button"
                  class="rounded-md px-2.5 py-1.5 text-sm font-medium text-muted-foreground hover:bg-muted disabled:pointer-events-none disabled:opacity-50"
                  :disabled="stepIndex === 0"
                  @click="onBack"
                >
                  Back
                </button>
                <button
                  ref="nextButtonRef"
                  type="button"
                  :class="primaryNavButtonClass"
                  :disabled="nextDisabled"
                  @click="onNext"
                >
                  {{ primaryButtonLabel }}
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, nextTick, onUnmounted, ref, shallowRef, watch } from 'vue'
import type { TicketOnboardingStep } from '@/lib/tickets-onboarding-step-defs'

type TourStep = TicketOnboardingStep

export type TourSecondaryAction = {
  actionId: string
  label: string
  disabled?: boolean
}

/** Merges over the active step for spotlight and panel anchor (e.g. presets closed vs open). */
export type TicketsTourSpotlightPatch = {
  selector?: string | null
  spotlightUnionSelectors?: string[] | null
  panelAnchorSelector?: string | null
  panelPlacement?: 'default' | 'leftOfTarget' | 'rightOfTarget' | null
  panelCornerPin?: TicketOnboardingStep['panelCornerPin'] | null
}

const props = withDefaults(
  defineProps<{
    open: boolean
    steps: TourStep[]
    /** Replaces the active step title when set (e.g. styles sub-phase). */
    titleOverride?: string | null
    /** Replaces the active step description when set. */
    descriptionOverride?: string | null
    secondaryActions?: TourSecondaryAction[]
    /** When true, the primary Next/Done control is disabled. */
    nextDisabled?: boolean
    panelEyebrow?: string
    /**
     * Resolve DOM for a step selector when document.querySelector is unreliable
     * (e.g. Vue Teleport / layout timing). Return null to fall back to querySelector.
     */
    getTargetElement?: (selector: string) => HTMLElement | null | undefined
    spotlightPatch?: TicketsTourSpotlightPatch | null
  }>(),
  {
    titleOverride: null,
    descriptionOverride: null,
    secondaryActions: () => [],
    nextDisabled: false,
    panelEyebrow: 'Tickets quick tour',
    getTargetElement: undefined,
    spotlightPatch: null,
  },
)

const emit = defineEmits<{
  'update:open': [value: boolean]
  skip: []
  complete: []
  'step-change': [stepId: string]
  'secondary-action': [actionId: string]
}>()

const stepIndex = ref(0)
const panelRef = ref<HTMLElement | null>(null)
const nextButtonRef = ref<HTMLButtonElement | null>(null)
/** Avoid deep-reactive Proxy around DOMRectReadOnly (breaks spotlight / style updates in some engines). */
const spotlightRect = shallowRef<DOMRect | null>(null)
const panelStyle = ref<Record<string, string>>({
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
})
/** Hide panel until the new step’s anchor is measured (avoids centered “flash” before final position). */
const panelConcealed = ref(false)
/** When true, missing anchor must not snap panel to center; keep prior coords until measure succeeds or fallback. */
const suppressCenterUntilAnchor = ref(false)
const lastFocusedEl = ref<HTMLElement | null>(null)
let rafId: number | null = null
/** Batch scroll/resize so we do not schedule endless reposition storms. */
let scrollResizeReflowRaf: number | null = null
/** Ignore scroll/resize repositions briefly after open/step change so the first measure can finish. */
let suppressScrollResizeRepositionUntil = 0
/** Bumps on each flush so stale measurement timeouts from prior passes no-op. */
let measureLayoutPassId = 0
/** Last `(index):(id)` emitted via step-change — repositions must not re-emit (avoids scroll/tour parent loops). */
let lastEmittedStepKey = ''

const steps = computed(() => props.steps)
const activeStep = computed(() => steps.value[stepIndex.value] ?? steps.value[0])
const isLastStep = computed(() => stepIndex.value >= steps.value.length - 1)

function getEffectiveStep(base: TourStep): TourStep {
  const patch = props.spotlightPatch
  if (!patch) return base
  return {
    ...base,
    selector:
      patch.selector !== undefined && patch.selector !== null ? patch.selector : base.selector,
    spotlightUnionSelectors:
      patch.spotlightUnionSelectors !== undefined
        ? (patch.spotlightUnionSelectors ?? [])
        : base.spotlightUnionSelectors,
    panelAnchorSelector:
      patch.panelAnchorSelector !== undefined && patch.panelAnchorSelector !== null
        ? patch.panelAnchorSelector
        : base.panelAnchorSelector,
    panelPlacement:
      patch.panelPlacement !== undefined && patch.panelPlacement !== null
        ? patch.panelPlacement
        : base.panelPlacement,
    panelCornerPin:
      patch.panelCornerPin !== undefined && patch.panelCornerPin !== null
        ? patch.panelCornerPin
        : base.panelCornerPin,
  }
}

const effectiveActiveStep = computed(() => getEffectiveStep(activeStep.value))

const secondaryActions = computed(() => props.secondaryActions ?? [])
/** Last step with a branch CTA (e.g. Advanced tour, How to build a preset): Done ink on top row; Skip/Back + green branch on second row. */
const useBranchFinalLayout = computed(
  () => isLastStep.value && secondaryActions.value.length > 0,
)
/** Single-row footer: green Next until the final step; ink Done when closing without a branch row. */
const primaryNavButtonClass = computed(() =>
  isLastStep.value
    ? 'rounded-md bg-brand-ink px-3 py-1.5 text-sm font-semibold text-white shadow-sm hover:bg-slate-800 disabled:opacity-50'
    : 'rounded-md bg-brand-accent px-3 py-1.5 text-sm font-semibold text-brand-accent-foreground shadow-sm hover:opacity-90 disabled:opacity-50',
)
const displayTitle = computed(() => props.titleOverride ?? activeStep.value.title)
const displayDescription = computed(
  () => props.descriptionOverride ?? activeStep.value.description,
)
/** Static HTML from step defs only; skipped when parent passes description-override. */
const displayDescriptionHtml = computed(() => {
  if (props.descriptionOverride != null) return null
  return activeStep.value.descriptionHtml ?? null
})
const nextDisabled = computed(() => props.nextDisabled)
const primaryButtonLabel = computed(() => {
  const override = activeStep.value.primaryButtonLabel?.trim()
  if (isLastStep.value) {
    if (override) return override
    return 'Done'
  }
  if (override) return override
  return 'Next'
})

const spotlightStyle = computed(() => {
  const rect = spotlightRect.value
  if (!rect) return {}
  return {
    top: `${rect.top - 6}px`,
    left: `${rect.left - 6}px`,
    width: `${Math.max(0, rect.width + 12)}px`,
    height: `${Math.max(0, rect.height + 12)}px`,
  }
})

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

/**
 * First paint / Teleport timing can yield 0×0 before the panel has a layout box. Using that in math
 * shifts `leftOfTarget` too far right (overlap with the anchor). `??` does not fall back when width is 0.
 */
function effectivePanelSize(widthGuess: number, heightGuess: number): { w: number; h: number } {
  const el = panelRef.value
  const ow = el?.offsetWidth ?? 0
  const oh = el?.offsetHeight ?? 0
  return {
    w: ow >= 1 ? ow : widthGuess,
    h: oh >= 1 ? oh : heightGuess,
  }
}

function rectIsMeasurable(r: DOMRect): boolean {
  return r.width >= 1 && r.height >= 1
}

function readElementRect(el: HTMLElement): DOMRect | null {
  const style = window.getComputedStyle(el)
  // Only skip true non-display; `visibility` can be overly conservative cross-browser for Teleport/layout.
  if (style.display === 'none') return null
  const r = el.getBoundingClientRect()
  if (rectIsMeasurable(r)) return r
  const cw = el.clientWidth
  const ch = el.clientHeight
  if (cw >= 1 && ch >= 1) return new DOMRect(r.left, r.top, cw, ch)
  const ow = el.offsetWidth
  const oh = el.offsetHeight
  if (ow >= 1 && oh >= 1) return new DOMRect(r.left, r.top, ow, oh)
  // First frame after Teleport / layout can report 0×0 while the element is already placed — still anchor for panel pin.
  if (Number.isFinite(r.left) && Number.isFinite(r.top)) {
    return new DOMRect(
      r.left,
      r.top,
      Math.max(r.width, cw, ow, 1),
      Math.max(r.height, ch, oh, 1),
    )
  }
  return null
}

/** Layout box for anchoring when `readTargetRect` needs a DOM node even if sizing is not yet measurable. */
function anchorRectFromElement(el: HTMLElement): DOMRect | null {
  const style = window.getComputedStyle(el)
  if (style.display === 'none') return null
  const boxed = readElementRect(el)
  if (boxed) return boxed
  const raw = el.getBoundingClientRect()
  if (!Number.isFinite(raw.left) || !Number.isFinite(raw.top)) return null
  return new DOMRect(
    raw.left,
    raw.top,
    Math.max(raw.width, el.clientWidth, el.offsetWidth, 1),
    Math.max(raw.height, el.clientHeight, el.offsetHeight, 1),
  )
}

/** First matching element with a real layout box (skips display:none / 0×0 duplicates). */
function readTargetRect(selector: string | null): DOMRect | null {
  if (!selector) return null
  // Prefer getElementById for single-id selectors (Teleport timing + Firefox).
  const idMatch = /^#([\w-]+)$/.exec(selector)
  if (idMatch) {
    const el = document.getElementById(idMatch[1]!)
    if (el instanceof HTMLElement) {
      const r = readElementRect(el)
      if (r) return r
    }
  }
  const bridged = props.getTargetElement?.(selector)
  if (bridged instanceof HTMLElement) {
    const r = readElementRect(bridged)
    if (r) return r
    const raw = anchorRectFromElement(bridged)
    if (raw) return raw
  }
  try {
    const nodes = document.querySelectorAll(selector)
    for (let i = 0; i < nodes.length; i++) {
      const el = nodes[i]
      if (!(el instanceof HTMLElement)) continue
      const r = readElementRect(el)
      if (r && rectIsMeasurable(r)) return r
      const raw = anchorRectFromElement(el)
      if (raw) return raw
    }
  } catch {
    return null
  }
  return null
}

function unionDomRects(rects: DOMRect[]): DOMRect {
  let minL = rects[0].left
  let minT = rects[0].top
  let maxR = rects[0].right
  let maxB = rects[0].bottom
  for (let i = 1; i < rects.length; i++) {
    const r = rects[i]
    minL = Math.min(minL, r.left)
    minT = Math.min(minT, r.top)
    maxR = Math.max(maxR, r.right)
    maxB = Math.max(maxB, r.bottom)
  }
  return new DOMRect(minL, minT, maxR - minL, maxB - minT)
}

function readSpotlightRect(step: TourStep): DOMRect | null {
  let primary = step.selector ? readTargetRect(step.selector) : null
  if ((!primary || !rectIsMeasurable(primary)) && step.spotlightFallbackSelector) {
    primary = readTargetRect(step.spotlightFallbackSelector)
  }
  if (!step.spotlightUnionSelectors?.length) {
    return primary && rectIsMeasurable(primary) ? primary : null
  }
  const parts: DOMRect[] = []
  if (primary && rectIsMeasurable(primary)) parts.push(primary)
  for (const sel of step.spotlightUnionSelectors) {
    const r = readTargetRect(sel)
    if (r && rectIsMeasurable(r)) parts.push(r)
  }
  if (parts.length === 0) return null
  return parts.length === 1 ? parts[0]! : unionDomRects(parts)
}

function panelTopForVerticalAlign(
  anchor: DOMRect,
  panelH: number,
  align: TourStep['panelVerticalAlign'],
): number {
  const a = align ?? 'top'
  if (a === 'bottom') return anchor.bottom - panelH
  if (a === 'center') return anchor.top + anchor.height / 2 - panelH / 2
  return anchor.top
}

function applyLayoutForRect(
  step: TourStep,
  panelAnchorRect: DOMRect | null,
  spotlightRectValue: DOMRect | null,
  capturedStepIndex: number,
) {
  spotlightRect.value = spotlightRectValue
    ? new DOMRect(
        spotlightRectValue.x,
        spotlightRectValue.y,
        spotlightRectValue.width,
        spotlightRectValue.height,
      )
    : null

  if (!panelAnchorRect) {
    if (step.selector && suppressCenterUntilAnchor.value) {
      return
    }
    panelStyle.value = {
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
    }
    panelConcealed.value = false
    suppressCenterUntilAnchor.value = false
    return
  }

  panelConcealed.value = false
  suppressCenterUntilAnchor.value = false

  const placement = step.panelPlacement ?? 'default'
  const vAlign = step.panelVerticalAlign
  const panelWidthGuess = Math.min(window.innerWidth * 0.92, 352)
  const rawGuessH = panelRef.value?.offsetHeight ?? 0
  const panelHeightGuess = rawGuessH >= 1 ? rawGuessH : 200

  const pin = step.panelCornerPin
  if (pin?.corner === 'top-right') {
    const margin = 8
    const gap = pin.gapPx ?? 8
    let px = panelAnchorRect.left + pin.relX * panelAnchorRect.width
    let py = panelAnchorRect.top + pin.relY * panelAnchorRect.height
    const spotlightGutterSync =
      spotlightRectValue && rectIsMeasurable(spotlightRectValue)
        ? Math.max(gap + 8, 16)
        : 0
    const capLeftSync = (rawLeft: number, panelW: number, spot: DOMRect | null) => {
      if (!spot || !rectIsMeasurable(spot) || spotlightGutterSync <= 0) return rawLeft
      const maxLeft = spot.left - spotlightGutterSync - panelW
      return Math.min(rawLeft, maxLeft)
    }
    let left = capLeftSync(px - panelWidthGuess - gap, panelWidthGuess, spotlightRectValue)
    let top = py
    left = clamp(left, margin, window.innerWidth - panelWidthGuess - margin)
    top = clamp(top, margin, window.innerHeight - panelHeightGuess - margin)
    panelStyle.value = {
      top: `${top}px`,
      left: `${left}px`,
      transform: 'none',
    }
    rafId = requestAnimationFrame(() => {
      rafId = null
      if (!props.open || stepIndex.value !== capturedStepIndex) return

      const anchorSel = step.panelAnchorSelector ?? step.selector
      const freshA = anchorSel ? readTargetRect(anchorSel) : null
      const freshS = readSpotlightRect(step)
      if (freshS && rectIsMeasurable(freshS)) {
        spotlightRect.value = new DOMRect(freshS.x, freshS.y, freshS.width, freshS.height)
      }
      const pa = freshA && rectIsMeasurable(freshA) ? freshA : panelAnchorRect
      px = pa.left + pin.relX * pa.width
      py = pa.top + pin.relY * pa.height
      const spot = freshS && rectIsMeasurable(freshS) ? freshS : spotlightRectValue
      const gutter = spot && rectIsMeasurable(spot) ? Math.max(gap + 8, 16) : 0
      const capLeft = (rawLeft: number, panelW: number) => {
        if (!spot || !rectIsMeasurable(spot) || gutter <= 0) return rawLeft
        const maxLeft = spot.left - gutter - panelW
        return Math.min(rawLeft, maxLeft)
      }
      const { w: panelW, h: panelH } = effectivePanelSize(panelWidthGuess, panelHeightGuess)
      let left2 = capLeft(px - panelW - gap, panelW)
      let top2 = py
      left2 = clamp(left2, margin, window.innerWidth - panelW - margin)
      top2 = clamp(top2, margin, window.innerHeight - panelH - margin)
      panelStyle.value = {
        top: `${top2}px`,
        left: `${left2}px`,
        transform: 'none',
      }
    })
    return
  }

  if (placement === 'leftOfTarget') {
    const gapSide = 16
    const margin = 8
    let left = panelAnchorRect.left - panelWidthGuess - gapSide
    left = clamp(left, margin, window.innerWidth - panelWidthGuess - margin)
    let top = panelTopForVerticalAlign(panelAnchorRect, panelHeightGuess, vAlign)
    top = clamp(top, margin, window.innerHeight - panelHeightGuess - margin)
    panelStyle.value = {
      top: `${top}px`,
      left: `${left}px`,
      transform: 'none',
    }
    rafId = requestAnimationFrame(() => {
      rafId = null
      if (!props.open || stepIndex.value !== capturedStepIndex) return

      const anchorSel = step.panelAnchorSelector ?? step.selector
      const freshA = anchorSel ? readTargetRect(anchorSel) : null
      const freshS = readSpotlightRect(step)
      if (freshS && rectIsMeasurable(freshS)) {
        spotlightRect.value = new DOMRect(freshS.x, freshS.y, freshS.width, freshS.height)
      }
      const pa = freshA && rectIsMeasurable(freshA) ? freshA : panelAnchorRect
      const { w: panelW, h: panelH } = effectivePanelSize(panelWidthGuess, panelHeightGuess)
      let left2 = pa.left - panelW - gapSide
      left2 = clamp(left2, margin, window.innerWidth - panelW - margin)
      let top2 = panelTopForVerticalAlign(pa, panelH, vAlign)
      top2 = clamp(top2, margin, window.innerHeight - panelH - margin)
      panelStyle.value = {
        top: `${top2}px`,
        left: `${left2}px`,
        transform: 'none',
      }
    })
    return
  }

  if (placement === 'rightOfTarget') {
    const gapSide = 16
    const margin = 8
    let left = panelAnchorRect.right + gapSide
    left = clamp(left, margin, window.innerWidth - panelWidthGuess - margin)
    let top = panelTopForVerticalAlign(panelAnchorRect, panelHeightGuess, vAlign)
    top = clamp(top, margin, window.innerHeight - panelHeightGuess - margin)
    panelStyle.value = {
      top: `${top}px`,
      left: `${left}px`,
      transform: 'none',
    }
    rafId = requestAnimationFrame(() => {
      rafId = null
      if (!props.open || stepIndex.value !== capturedStepIndex) return

      const anchorSel = step.panelAnchorSelector ?? step.selector
      const freshA = anchorSel ? readTargetRect(anchorSel) : null
      const freshS = readSpotlightRect(step)
      if (freshS && rectIsMeasurable(freshS)) {
        spotlightRect.value = new DOMRect(freshS.x, freshS.y, freshS.width, freshS.height)
      }
      const pa = freshA && rectIsMeasurable(freshA) ? freshA : panelAnchorRect
      const { w: panelW, h: panelH } = effectivePanelSize(panelWidthGuess, panelHeightGuess)
      let left2 = pa.right + gapSide
      left2 = clamp(left2, margin, window.innerWidth - panelW - margin)
      let top2 = panelTopForVerticalAlign(pa, panelH, vAlign)
      top2 = clamp(top2, margin, window.innerHeight - panelH - margin)
      panelStyle.value = {
        top: `${top2}px`,
        left: `${left2}px`,
        transform: 'none',
      }
    })
    return
  }

  const gap = 12
  const fitsBelow = panelAnchorRect.bottom + gap + panelHeightGuess <= window.innerHeight - 8
  const fitsAbove = panelAnchorRect.top - gap - panelHeightGuess >= 8
  const top = fitsBelow
    ? panelAnchorRect.bottom + gap
    : fitsAbove
      ? panelAnchorRect.top - panelHeightGuess - gap
      : clamp(window.innerHeight - panelHeightGuess - 8, 8, window.innerHeight - panelHeightGuess - 8)
  const left = clamp(panelAnchorRect.left, 8, window.innerWidth - panelWidthGuess - 8)
  panelStyle.value = {
    top: `${top}px`,
    left: `${left}px`,
    transform: 'none',
  }
  rafId = requestAnimationFrame(() => {
    rafId = null
    if (!props.open || stepIndex.value !== capturedStepIndex) return

    const anchorSel = step.panelAnchorSelector ?? step.selector
    const freshA = anchorSel ? readTargetRect(anchorSel) : null
    const freshS = readSpotlightRect(step)
    if (freshS && rectIsMeasurable(freshS)) {
      spotlightRect.value = new DOMRect(freshS.x, freshS.y, freshS.width, freshS.height)
    }
    const pa = freshA && rectIsMeasurable(freshA) ? freshA : panelAnchorRect
    const { w: panelW, h: panelH } = effectivePanelSize(panelWidthGuess, panelHeightGuess)
    const fitsBelow2 = pa.bottom + gap + panelH <= window.innerHeight - 8
    const fitsAbove2 = pa.top - gap - panelH >= 8
    const top2 = fitsBelow2
      ? pa.bottom + gap
      : fitsAbove2
        ? pa.top - panelH - gap
        : clamp(
            window.innerHeight - panelH - 8,
            8,
            window.innerHeight - panelH - 8,
          )
    const left2 = clamp(pa.left, 8, window.innerWidth - panelW - 8)
    panelStyle.value = {
      top: `${top2}px`,
      left: `${left2}px`,
      transform: 'none',
    }
  })
}

function measureAndApplyStep(capturedStepIndex: number, step: TourStep, layoutPassId: number) {
  if (!props.open || stepIndex.value !== capturedStepIndex || layoutPassId !== measureLayoutPassId) return
  const anchorSel = step.panelAnchorSelector ?? step.selector
  const placement = step.panelPlacement ?? 'default'
  const directAnchor = readTargetRect(anchorSel)
  const spotlight = readSpotlightRect(step)
  let panelAnchor: DOMRect | null = directAnchor
  if (!panelAnchor && step.panelCornerPin) {
    const primaryOnly = readTargetRect(step.selector)
    if (primaryOnly && rectIsMeasurable(primaryOnly)) panelAnchor = primaryOnly
  }
  if (
    !panelAnchor &&
    !step.panelCornerPin &&
    spotlight &&
    rectIsMeasurable(spotlight) &&
    (placement === 'leftOfTarget' || placement === 'rightOfTarget')
  ) {
    panelAnchor = spotlight
  }
  if (
    !panelAnchor &&
    step.panelCornerPin &&
    spotlight &&
    rectIsMeasurable(spotlight) &&
    (step.spotlightUnionSelectors?.length ?? 0) > 0
  ) {
    const el = props.getTargetElement?.(step.panelAnchorSelector ?? step.selector ?? '')
    if (el instanceof HTMLElement) {
      const ar = anchorRectFromElement(el)
      if (ar && rectIsMeasurable(ar)) panelAnchor = ar
    }
  }
  applyLayoutForRect(step, panelAnchor, spotlight, capturedStepIndex)
  const missingDirectAnchor = !!anchorSel && !directAnchor
  const missingSpotlight = !!step.selector && !spotlight
  if (missingDirectAnchor || missingSpotlight) {
    for (const delay of [50, 120, 260, 420, 700]) {
      window.setTimeout(() => {
        if (
          !props.open ||
          stepIndex.value !== capturedStepIndex ||
          layoutPassId !== measureLayoutPassId
        ) {
          return
        }
        const da = readTargetRect(anchorSel)
        const sp = readSpotlightRect(step)
        let pa: DOMRect | null = da
        if (!pa && step.panelCornerPin) {
          const primaryOnly = readTargetRect(step.selector)
          if (primaryOnly && rectIsMeasurable(primaryOnly)) pa = primaryOnly
        }
        if (
          !pa &&
          !step.panelCornerPin &&
          sp &&
          rectIsMeasurable(sp) &&
          (placement === 'leftOfTarget' || placement === 'rightOfTarget')
        ) {
          pa = sp
        }
        if (
          !pa &&
          step.panelCornerPin &&
          sp &&
          rectIsMeasurable(sp) &&
          (step.spotlightUnionSelectors?.length ?? 0) > 0
        ) {
          const el = props.getTargetElement?.(step.panelAnchorSelector ?? step.selector ?? '')
          if (el instanceof HTMLElement) {
            const ar = anchorRectFromElement(el)
            if (ar && rectIsMeasurable(ar)) pa = ar
          }
        }
        applyLayoutForRect(step, pa, sp, capturedStepIndex)
      }, delay)
    }
    window.setTimeout(() => {
      if (
        !props.open ||
        stepIndex.value !== capturedStepIndex ||
        layoutPassId !== measureLayoutPassId
      ) {
        return
      }
      if (!panelConcealed.value) return
      suppressCenterUntilAnchor.value = false
      const stepNow = getEffectiveStep(steps.value[capturedStepIndex] ?? steps.value[0]!)
      const anchorSelNow = stepNow.panelAnchorSelector ?? stepNow.selector
      const da = readTargetRect(anchorSelNow)
      const sp = readSpotlightRect(stepNow)
      let pa: DOMRect | null = da
      if (!pa && stepNow.panelCornerPin) {
        const primaryOnly = readTargetRect(stepNow.selector)
        if (primaryOnly && rectIsMeasurable(primaryOnly)) pa = primaryOnly
      }
      if (
        !pa &&
        !stepNow.panelCornerPin &&
        sp &&
        rectIsMeasurable(sp) &&
        ((stepNow.panelPlacement ?? 'default') === 'leftOfTarget' ||
          (stepNow.panelPlacement ?? 'default') === 'rightOfTarget')
      ) {
        pa = sp
      }
      applyLayoutForRect(stepNow, pa, sp, capturedStepIndex)
      panelConcealed.value = false
    }, 820)
  }
}

async function flushRepositionLayout(options?: { concealUntilMeasured?: boolean }) {
  if (!props.open) return
  const capturedStepIndex = stepIndex.value
  const baseStep = steps.value[capturedStepIndex] ?? steps.value[0]
  if (!baseStep) return

  measureLayoutPassId += 1
  const layoutPassId = measureLayoutPassId

  if (options?.concealUntilMeasured) {
    panelConcealed.value = true
    suppressCenterUntilAnchor.value = true
  }

  await nextTick()
  await nextTick()
  // Macrotask: lets Teleport + controlled `open` on TicketAdvancedFilters commit dropdownRef / DOM ids.
  await new Promise<void>((r) => setTimeout(r, 0))
  await nextTick()

  if (!props.open || stepIndex.value !== capturedStepIndex) return

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      // Recompute after parent state / `spotlightPatch` has applied (real step changes emit `step-change` separately).
      const step = getEffectiveStep(baseStep)
      measureAndApplyStep(capturedStepIndex, step, layoutPassId)
    })
  })
}

function repositionPanel(options?: { concealUntilMeasured?: boolean }) {
  if (!props.open) return
  if (rafId != null) {
    cancelAnimationFrame(rafId)
    rafId = null
  }
  void flushRepositionLayout(options)
}

function onKeyDown(e: KeyboardEvent) {
  if (!props.open) return
  if (e.key === 'Escape') {
    e.preventDefault()
    onSkip()
    return
  }
  if (e.key === 'ArrowRight') {
    e.preventDefault()
    onNext()
    return
  }
  if (e.key === 'ArrowLeft') {
    e.preventDefault()
    onBack()
  }
}

function scheduleScrollResizeReposition() {
  if (!props.open || scrollResizeReflowRaf != null) return
  if (typeof performance !== 'undefined' && performance.now() < suppressScrollResizeRepositionUntil) {
    return
  }
  scrollResizeReflowRaf = requestAnimationFrame(() => {
    scrollResizeReflowRaf = null
    if (props.open) repositionPanel()
  })
}

function bumpScrollResizeSuppress(ms: number) {
  if (typeof performance === 'undefined') return
  const until = performance.now() + ms
  suppressScrollResizeRepositionUntil = Math.max(suppressScrollResizeRepositionUntil, until)
}

function bindListeners() {
  window.addEventListener('resize', scheduleScrollResizeReposition, { passive: true })
  window.addEventListener('scroll', scheduleScrollResizeReposition, true)
  window.addEventListener('keydown', onKeyDown)
}

function unbindListeners() {
  window.removeEventListener('resize', scheduleScrollResizeReposition)
  window.removeEventListener('scroll', scheduleScrollResizeReposition, true)
  window.removeEventListener('keydown', onKeyDown)
  if (scrollResizeReflowRaf != null) {
    cancelAnimationFrame(scrollResizeReflowRaf)
    scrollResizeReflowRaf = null
  }
}

function onSkip() {
  emit('skip')
  emit('update:open', false)
}

function onNext() {
  if (isLastStep.value) {
    emit('complete')
    emit('update:open', false)
    return
  }
  stepIndex.value += 1
}

function onBack() {
  if (stepIndex.value === 0) return
  stepIndex.value -= 1
}

/** `step-change` is emitted here when reopening on step 0 (stepIndex watch does not fire for 0 → 0). */
const STEP_CHANGE_SCROLL_SUPPRESS_MS = 1000

watch(
  () => props.open,
  async (isOpen) => {
    if (isOpen) {
      const indexBeforeOpen = stepIndex.value
      lastEmittedStepKey = ''
      stepIndex.value = 0
      bumpScrollResizeSuppress(520)
      lastFocusedEl.value = document.activeElement instanceof HTMLElement ? document.activeElement : null
      bindListeners()
      if (indexBeforeOpen === 0) {
        const first = steps.value[0]
        if (first) {
          const key = `0:${first.id}`
          lastEmittedStepKey = key
          emit('step-change', first.id)
        }
      }
      await nextTick()
      if (indexBeforeOpen === 0) {
        repositionPanel({ concealUntilMeasured: true })
      }
      nextButtonRef.value?.focus()
      return
    }
    unbindListeners()
    lastEmittedStepKey = ''
    spotlightRect.value = null
    panelConcealed.value = false
    suppressCenterUntilAnchor.value = false
    if (rafId != null) {
      cancelAnimationFrame(rafId)
      rafId = null
    }
    lastFocusedEl.value?.focus()
  },
  { immediate: true },
)

watch(stepIndex, async () => {
  if (!props.open) return
  const step = steps.value[stepIndex.value] ?? steps.value[0]
  if (step) {
    const key = `${stepIndex.value}:${step.id}`
    if (key !== lastEmittedStepKey) {
      lastEmittedStepKey = key
      emit('step-change', step.id)
    }
  }
  bumpScrollResizeSuppress(STEP_CHANGE_SCROLL_SUPPRESS_MS)
  await nextTick()
  repositionPanel({ concealUntilMeasured: true })
  nextButtonRef.value?.focus()
})

watch(
  () => props.spotlightPatch,
  async () => {
    if (!props.open) return
    bumpScrollResizeSuppress(200)
    await nextTick()
    repositionPanel()
  },
  { deep: true },
)

onUnmounted(() => {
  unbindListeners()
  if (rafId != null) cancelAnimationFrame(rafId)
})

/** Re-measure targets (e.g. after preset list opens). */
function refreshLayout() {
  repositionPanel()
}

defineExpose({ refreshLayout })
</script>
