<template>
  <div class="space-y-2">
    <div ref="wrapRef" class="rounded-md border border-slate-300 bg-white">
      <canvas
        ref="canvasRef"
        class="block h-40 w-full touch-none"
        aria-label="Signature drawing area. Use touch, pen, or mouse to sign."
        :aria-describedby="signatureHintId"
        @pointerdown="onPointerDown"
        @pointermove="onPointerMove"
        @pointerup="onPointerUp"
        @pointercancel="onPointerUp"
        @pointerleave="onPointerUp"
      />
    </div>
    <div class="flex items-center justify-between">
      <p :id="signatureHintId" class="text-xs text-slate-500">Sign above</p>
      <button
        type="button"
        class="text-sm font-medium text-slate-700 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-sm"
        aria-label="Clear signature"
        @click="clear"
      >
        Clear
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref, useId, watch } from 'vue'

const signatureHintId = useId()

const props = withDefaults(defineProps<{
  modelValue?: string
}>(), {
  modelValue: '',
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const wrapRef = ref<HTMLDivElement | null>(null)
const canvasRef = ref<HTMLCanvasElement | null>(null)

let ctx: CanvasRenderingContext2D | null = null
let isDrawing = false
let lastPoint: { x: number; y: number } | null = null
let resizeObserver: ResizeObserver | null = null

const CANVAS_HEIGHT_PX = 160

function getPoint(evt: PointerEvent): { x: number; y: number } | null {
  const canvas = canvasRef.value
  if (!canvas) return null
  const rect = canvas.getBoundingClientRect()
  const x = evt.clientX - rect.left
  const y = evt.clientY - rect.top
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null
  return { x, y }
}

function initContext() {
  const canvas = canvasRef.value
  const wrap = wrapRef.value
  if (!canvas || !wrap) return

  const width = Math.max(1, Math.floor(wrap.getBoundingClientRect().width))
  const dpr = Math.max(1, window.devicePixelRatio || 1)

  // Resize canvas backing store
  canvas.width = Math.floor(width * dpr)
  canvas.height = Math.floor(CANVAS_HEIGHT_PX * dpr)

  // Ensure CSS size
  canvas.style.width = '100%'
  canvas.style.height = `${CANVAS_HEIGHT_PX}px`

  const nextCtx = canvas.getContext('2d')
  if (!nextCtx) return
  ctx = nextCtx

  // Reset transform then scale for DPR
  ctx.setTransform(1, 0, 0, 1, 0, 0)
  ctx.scale(dpr, dpr)

  // Style
  ctx.lineWidth = 2
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.strokeStyle = 'hsl(222.2, 47.4%, 11.2%)' /* brand-ink */

  // If we have an existing signature, redraw it after resize.
  if (props.modelValue) {
    void drawDataUrl(props.modelValue)
  } else {
    // Clear background
    ctx.clearRect(0, 0, width, CANVAS_HEIGHT_PX)
  }
}

async function drawDataUrl(dataUrl: string) {
  const canvas = canvasRef.value
  const wrap = wrapRef.value
  if (!canvas || !wrap) return
  if (!ctx) return

  const width = Math.max(1, Math.floor(wrap.getBoundingClientRect().width))
  ctx.clearRect(0, 0, width, CANVAS_HEIGHT_PX)

  await new Promise<void>((resolve) => {
    const img = new Image()
    img.onload = () => {
      try {
        ctx?.drawImage(img, 0, 0, width, CANVAS_HEIGHT_PX)
      } finally {
        resolve()
      }
    }
    img.onerror = () => resolve()
    img.src = dataUrl
  })
}

function emitDataUrl() {
  const canvas = canvasRef.value
  if (!canvas) return
  try {
    emit('update:modelValue', canvas.toDataURL('image/png'))
  } catch {
    // ignore
  }
}

function clear() {
  const wrap = wrapRef.value
  if (!ctx || !wrap) {
    emit('update:modelValue', '')
    return
  }
  const width = Math.max(1, Math.floor(wrap.getBoundingClientRect().width))
  ctx.clearRect(0, 0, width, CANVAS_HEIGHT_PX)
  emit('update:modelValue', '')
}

function onPointerDown(evt: PointerEvent) {
  const canvas = canvasRef.value
  if (!ctx || !canvas) return
  const point = getPoint(evt)
  if (!point) return
  isDrawing = true
  lastPoint = point
  canvas.setPointerCapture?.(evt.pointerId)
  ctx.beginPath()
  ctx.moveTo(point.x, point.y)
}

function onPointerMove(evt: PointerEvent) {
  if (!ctx || !isDrawing) return
  const point = getPoint(evt)
  if (!point || !lastPoint) return
  ctx.lineTo(point.x, point.y)
  ctx.stroke()
  lastPoint = point
}

function onPointerUp() {
  if (!ctx) return
  if (!isDrawing) return
  isDrawing = false
  lastPoint = null
  emitDataUrl()
}

onMounted(() => {
  initContext()
  const wrap = wrapRef.value
  if (wrap && typeof ResizeObserver !== 'undefined') {
    resizeObserver = new ResizeObserver(() => {
      initContext()
    })
    resizeObserver.observe(wrap)
  }
})

onUnmounted(() => {
  resizeObserver?.disconnect()
  resizeObserver = null
})

watch(
  () => props.modelValue,
  (next) => {
    if (!next) return
    // If modelValue changes externally, render it.
    void drawDataUrl(next)
  }
)
</script>

