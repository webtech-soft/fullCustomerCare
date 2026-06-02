<template>
  <div class="cards-grid-fixed" ref="gridRef">
    <TicketCard
      v-for="(ticket, cardIdx) in tickets"
      :key="ticket.id"
      :ticket="ticket"
      :mark-onboarding-actions="
        !!ticket.tourDemoAdvActionSignalsAnchor || (!hasAdvActionSignalsAnchor && cardIdx === 0)
      "
      :visible-field-keys="visibleFieldKeys"
      :fields-by-category="fieldsByCategory"
      :status-meta="viewMeta?.[ticket.id]"
      :loadingTicketNumber="loadingTicketNumber"
      :view-status-update-trigger="viewStatusUpdateTrigger"
      :inspection-view-update-trigger="inspectionViewUpdateTrigger"
      :approval-update-trigger="approvalUpdateTrigger"
      :can-view-cost="canViewCost"
      :can-chat="canChat"
      :ticket-action-visibility="ticketActionVisibility"
      @view="$emit('view', $event)"
      @open-view-panel="$emit('open-view-panel', $event)"
      @chat="(ticket, anchor) => $emit('chat', ticket, anchor)"
      @timeline="$emit('timeline', $event)"
      @approvals="$emit('approvals', $event)"
      @edit-status="$emit('edit-status', $event)"
      @inspection="$emit('inspection', $event)"
      @action="(t, a) => $emit('action', t, a)"
      @update="(id, updates) => $emit('update', id, updates)"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted, watch, nextTick } from 'vue'
import TicketCard from '@/components/TicketCard.vue'
import type { Ticket, TicketStatusMeta, DisplayFieldConfig, DisplayFieldCategory, TicketActionVisibility } from '@/types/ticket'
import { DEFAULT_TICKET_ACTION_VISIBILITY } from '@/types/ticket'

interface Props {
  tickets: Ticket[]
  visibleFieldKeys?: string[]
  fieldsByCategory?: Partial<Record<DisplayFieldCategory, DisplayFieldConfig[]>>
  loadingTicketNumber?: number | null
  viewStatusUpdateTrigger?: number
  inspectionViewUpdateTrigger?: number
  approvalUpdateTrigger?: number
  canViewCost?: boolean
  canChat?: boolean
  viewMeta?: Record<number, TicketStatusMeta>
  ticketActionVisibility?: TicketActionVisibility
}

const props = withDefaults(defineProps<Props>(), {
  canViewCost: true,
  canChat: true,
  viewMeta: () => ({}),
  ticketActionVisibility: () => ({ ...DEFAULT_TICKET_ACTION_VISIBILITY }),
})

const hasAdvActionSignalsAnchor = computed(() =>
  props.tickets.some((t) => t.tourDemoAdvActionSignalsAnchor),
)

defineEmits<{
  view: [ticket: Ticket]
  'open-view-panel': [ticket: Ticket]
  chat: [ticket: Ticket, anchor?: MouseEvent]
  timeline: [ticket: Ticket]
  approvals: [ticket: Ticket]
  'edit-status': [ticket: Ticket]
  inspection: [ticket: Ticket]
  action: [ticket: Ticket, action: string]
  update: [ticketId: number, updates: { vehicleStatus?: string; inspectionId?: string }]
}>()

const gridRef = ref<HTMLElement | null>(null)

const ROW_TOLERANCE_PX = 2

const clearRowHeights = () => {
  const container = gridRef.value
  if (!container) return

  const children = Array.from(container.children) as HTMLElement[]
  for (const el of children) {
    el.style.minHeight = ''
    el.style.height = ''

    const actionsEl = el.querySelector('[data-ticket-card-actions]') as HTMLElement | null
    if (actionsEl) {
      actionsEl.style.paddingTop = ''
    }
  }
}

const applyRowHeights = () => {
  const container = gridRef.value
  if (!container) return

  const children = Array.from(container.children) as HTMLElement[]
  if (children.length === 0) return

  // Single-column layout: no need to force equal heights
  if (window.innerWidth < 640) {
    return
  }

  type Row = HTMLElement[]
  const rows: Row[] = []

  let currentRowTop: number | null = null
  let currentRow: Row = []

  for (const el of children) {
    const top = el.offsetTop

    if (currentRowTop === null) {
      currentRowTop = top
      currentRow = [el]
      continue
    }

    if (Math.abs(top - currentRowTop) <= ROW_TOLERANCE_PX) {
      currentRow.push(el)
    } else {
      rows.push(currentRow)
      currentRowTop = top
      currentRow = [el]
    }
  }

  if (currentRow.length > 0) {
    rows.push(currentRow)
  }

  for (const row of rows) {
    const maxHeight = Math.max(...row.map((el) => el.offsetHeight))
    for (const el of row) {
      el.style.minHeight = `${maxHeight}px`
    }

    const actionsInfo: {
      actionsEl: HTMLElement
      basePaddingTop: number
      bottomPosition: number
    }[] = []

    for (const cardEl of row) {
      const actionsEl = cardEl.querySelector('[data-ticket-card-actions]') as HTMLElement | null
      if (!actionsEl) continue

      actionsEl.style.paddingTop = ''

      const cardRect = cardEl.getBoundingClientRect()
      const actionsRect = actionsEl.getBoundingClientRect()

      const bottomPosition = actionsRect.bottom - cardRect.top
      const computed = window.getComputedStyle(actionsEl)
      const basePaddingTop = parseFloat(computed.paddingTop || '0') || 0

      actionsInfo.push({ actionsEl, basePaddingTop, bottomPosition })
    }

    if (actionsInfo.length === 0) {
      continue
    }

    const maxBottom = Math.max(...actionsInfo.map((info) => info.bottomPosition))

    for (const info of actionsInfo) {
      const extra = maxBottom - info.bottomPosition
      if (extra > 0) {
        info.actionsEl.style.paddingTop = `${info.basePaddingTop + extra}px`
      }
    }
  }
}

let resizeTimeout: number | null = null
let mutationObserver: MutationObserver | null = null

const recomputeRowHeights = () => {
  const container = gridRef.value
  if (!container) return

  clearRowHeights()
  nextTick(() => {
    applyRowHeights()
  })
}

const handleResize = () => {
  if (resizeTimeout !== null) {
    window.clearTimeout(resizeTimeout)
  }
  resizeTimeout = window.setTimeout(() => {
    recomputeRowHeights()
  }, 100)
}

onMounted(() => {
  nextTick(() => {
    recomputeRowHeights()

    const container = gridRef.value
    if (container && !mutationObserver) {
      mutationObserver = new MutationObserver(() => {
        handleResize()
      })
      mutationObserver.observe(container, {
        childList: true,
        subtree: true,
      })
    }
  })
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  if (mutationObserver) {
    mutationObserver.disconnect()
    mutationObserver = null
  }
  if (resizeTimeout !== null) {
    window.clearTimeout(resizeTimeout)
    resizeTimeout = null
  }
})

watch(
  () => props.tickets,
  () => {
    recomputeRowHeights()
  }
)

watch(
  () => [props.visibleFieldKeys, props.fieldsByCategory],
  () => {
    recomputeRowHeights()
  },
  { deep: true }
)
</script>

<style scoped>
.cards-grid-fixed {
  display: grid;
  gap: 1rem;
  justify-content: center;
  grid-template-columns: repeat(auto-fill, minmax(400px, 400px));
}
@media (max-width: 639px) {
  .cards-grid-fixed {
    grid-template-columns: 1fr;
  }
}
</style>
