<template>
  <Teleport to="body">
    <div
      v-if="anchoredUserDialogOpen && state"
      class="pointer-events-none fixed inset-0 z-[220]"
      aria-live="polite"
    >
      <div
        class="pointer-events-auto fixed inset-0 bg-black/30"
        @click="onBackdrop"
      />
      <div
        ref="panelRef"
        role="dialog"
        aria-modal="true"
        :aria-labelledby="titleId"
        class="pointer-events-auto fixed z-[221] w-[min(22rem,calc(100vw-1rem)))] rounded-lg border border-slate-200 bg-background p-4 shadow-lg"
        :style="panelStyle"
      >
        <p :id="titleId" class="text-sm text-slate-900 whitespace-pre-wrap">
          {{ state.message }}
        </p>

        <div v-if="state.showDontAskAgain" class="mt-3 flex items-center gap-2">
          <Checkbox :checked="dontAskAgain" @update:checked="onDontAskChange" />
          <Label class="cursor-pointer text-xs font-normal text-slate-600" @click="toggleDontAsk">
            Don’t show this again
          </Label>
        </div>

        <div class="mt-4 flex flex-wrap justify-end gap-2">
          <template v-if="state.kind === 'confirm'">
            <button
              type="button"
              class="min-h-[40px] rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-800 shadow-sm hover:bg-slate-50"
              @click="onCancel"
            >
              {{ state.cancelLabel }}
            </button>
            <button
              ref="primaryBtnRef"
              type="button"
              data-primary-action
              class="min-h-[40px] rounded-md px-3 py-2 text-sm font-semibold text-white shadow-sm"
              :class="
                state.variant === 'danger'
                  ? 'bg-red-600 hover:bg-red-700'
                  : 'bg-slate-900 hover:bg-slate-800'
              "
              @click="onConfirm"
            >
              {{ state.confirmLabel }}
            </button>
          </template>
          <button
            v-else
            ref="primaryBtnRef"
            type="button"
            data-primary-action
            class="min-h-[40px] rounded-md bg-slate-900 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-slate-800"
            @click="onConfirm"
          >
            {{ state.okLabel }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import Checkbox from '@/components/ui/Checkbox.vue'
import Label from '@/components/ui/Label.vue'
import {
  anchoredUserDialogOpen,
  anchoredUserDialogState,
  clampAnchoredPosition,
  recordLastPointer,
  resolveAnchoredUserDialogCancel,
  resolveAnchoredUserDialogDismiss,
  resolveAnchoredUserDialogPrimary,
  setAnchoredUserDialogHostMounted,
} from '@/lib/ui/anchoredUserDialog'

const panelRef = ref<HTMLElement | null>(null)
const primaryBtnRef = ref<HTMLButtonElement | null>(null)
const panelStyle = ref<Record<string, string>>({ top: '8px', left: '8px' })
const dontAskAgain = ref(false)
const titleId = `anchored-user-dialog-${Math.random().toString(36).slice(2, 9)}`

const state = computed(() => anchoredUserDialogState.value)

function toggleDontAsk() {
  dontAskAgain.value = !dontAskAgain.value
}

function onDontAskChange(v: boolean) {
  dontAskAgain.value = v
}

function onBackdrop() {
  resolveAnchoredUserDialogDismiss()
}

function onCancel() {
  resolveAnchoredUserDialogCancel()
}

function onConfirm() {
  resolveAnchoredUserDialogPrimary(dontAskAgain.value)
}

function positionPanel() {
  const s = anchoredUserDialogState.value
  const el = panelRef.value
  if (!s || !el) return
  const vw = window.innerWidth
  const vh = window.innerHeight
  const rect = s.anchorRect
  const { width, height } = el.getBoundingClientRect()
  const p = clampAnchoredPosition({
    anchorTop: rect.top,
    anchorLeft: rect.left,
    anchorWidth: rect.width,
    anchorHeight: rect.height,
    panelWidth: width || 320,
    panelHeight: height || 120,
    viewportWidth: vw,
    viewportHeight: vh,
    margin: 8,
    gap: 8,
  })
  panelStyle.value = {
    top: `${p.top}px`,
    left: `${p.left}px`,
  }
}

function focusDefault() {
  if (!anchoredUserDialogState.value) return
  primaryBtnRef.value?.focus()
}

const onPointerDown = (e: PointerEvent) => {
  recordLastPointer(e.clientX, e.clientY)
}

const onKeyDown = (e: KeyboardEvent) => {
  if (!anchoredUserDialogOpen.value) return
  if (e.key === 'Escape') {
    e.preventDefault()
    resolveAnchoredUserDialogDismiss()
  }
}

const onResize = () => {
  if (anchoredUserDialogOpen.value) positionPanel()
}

watch(
  () => [anchoredUserDialogOpen.value, anchoredUserDialogState.value] as const,
  async ([open]) => {
    if (!open) {
      dontAskAgain.value = false
      return
    }
    dontAskAgain.value = false
    await nextTick()
    positionPanel()
    await nextTick()
    positionPanel()
    focusDefault()
  }
)

watch(panelRef, () => {
  if (anchoredUserDialogOpen.value) {
    nextTick(() => positionPanel())
  }
})

onMounted(() => {
  setAnchoredUserDialogHostMounted(true)
  document.addEventListener('pointerdown', onPointerDown, true)
  document.addEventListener('keydown', onKeyDown, true)
  window.addEventListener('resize', onResize)
})

onUnmounted(() => {
  setAnchoredUserDialogHostMounted(false)
  document.removeEventListener('pointerdown', onPointerDown, true)
  document.removeEventListener('keydown', onKeyDown, true)
  window.removeEventListener('resize', onResize)
})
</script>
