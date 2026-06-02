<template>
  <Teleport to="body">
    <Transition name="ticket-actions-overlay" appear>
      <div
        v-if="open"
        class="fixed inset-0 z-[150] bg-black/50"
        aria-hidden="true"
        @click="handleOverlayClick"
      />
    </Transition>

    <Transition
      name="ticket-actions-drawer"
      appear
      @after-enter="onDrawerAfterEnter"
      @after-leave="onDrawerAfterLeave"
    >
      <aside
        v-if="open"
        :class="[
          'fixed right-0 top-0 z-[151] h-dvh max-h-dvh w-full border-l border-slate-200 bg-white shadow-xl flex flex-col transition-[max-width] duration-200 pt-safe pb-safe',
          fullInvoiceOpen
            ? 'max-w-[min(96vw,1600px)]'
            : 'max-w-md sm:max-w-lg md:max-w-2xl',
        ]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="ticket-actions-drawer-title"
        @click.stop
      >
        <template v-if="fullInvoiceOpen && ticket">
          <span id="ticket-actions-drawer-title" class="sr-only">Ticket #{{ ticket.ticketNumber }}</span>
          <div class="flex-1 min-h-0 flex flex-col overflow-hidden">
            <CustomerInvoiceView
              :key="`${ticket.ticketNumber}-${embeddedInvToken}`"
              embedded
              :embedded-inv-token="embeddedInvToken"
              :embedded-open-approvals="embeddedOpenApprovals"
              @embedded-back="onEmbeddedBackFromInvoice"
              @open-in-full-page="emit('open-in-full-page')"
            />
          </div>
        </template>

        <template v-else>
        <div class="shrink-0 border-b border-slate-200 px-3 pt-3 pb-2">
          <div class="flex items-start justify-between gap-2 mb-2">
            <h2 id="ticket-actions-drawer-title" class="text-base font-semibold text-slate-900 leading-tight min-w-0">
              <span v-if="ticket">Ticket #{{ ticket.ticketNumber }}</span>
              <span v-else>Ticket</span>
            </h2>
            <button
              type="button"
              class="rounded-md p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-800 shrink-0"
              aria-label="Close panel"
              @click="handleClose"
            >
              <PhX :size="20" weight="regular" />
            </button>
          </div>
          <div class="flex gap-1 border-b border-slate-100 -mb-px" data-onboarding="ticket-drawer-tabs">
            <button
              v-if="canShowTab('view')"
              type="button"
              class="px-3 py-2 text-sm font-medium rounded-t-md border-b-2 transition-colors min-h-[44px]"
              :class="activeTab === 'view'
                ? 'border-slate-900 text-slate-900'
                : 'border-transparent text-slate-600 hover:text-slate-900'"
              @click="setTab('view')"
            >
              View
            </button>
            <button
              v-if="canShowTab('chat')"
              type="button"
              class="px-3 py-2 text-sm font-medium rounded-t-md border-b-2 transition-colors min-h-[44px]"
              :class="activeTab === 'chat'
                ? 'border-slate-900 text-slate-900'
                : 'border-transparent text-slate-600 hover:text-slate-900'"
              @click="setTab('chat')"
            >
              Chat
            </button>
            <button
              v-if="canShowTab('timeline')"
              type="button"
              class="px-3 py-2 text-sm font-medium rounded-t-md border-b-2 transition-colors min-h-[44px]"
              :class="activeTab === 'timeline'
                ? 'border-slate-900 text-slate-900'
                : 'border-transparent text-slate-600 hover:text-slate-900'"
              @click="setTab('timeline')"
            >
              Timeline
            </button>
            <button
              v-if="canShowTab('approvals')"
              type="button"
              class="px-3 py-2 text-sm font-medium rounded-t-md border-b-2 transition-colors min-h-[44px]"
              :class="activeTab === 'approvals'
                ? 'border-slate-900 text-slate-900'
                : 'border-transparent text-slate-600 hover:text-slate-900'"
              @click="setTab('approvals')"
            >
              Approvals
            </button>
            <button
              v-if="canShowTab('technicianWorksheet')"
              type="button"
              class="px-3 py-2 text-sm font-medium rounded-t-md border-b-2 transition-colors min-h-[44px]"
              :class="activeTab === 'technicianWorksheet'
                ? 'border-slate-900 text-slate-900'
                : 'border-transparent text-slate-600 hover:text-slate-900'"
              @click="setTab('technicianWorksheet')"
            >
              Technician Worksheet
            </button>
          </div>
        </div>

        <div class="flex-1 min-h-0 flex flex-col">
          <div v-if="!ticket" class="p-6 text-sm text-slate-600">No ticket selected.</div>

          <template v-else>
            <div v-show="activeTab === 'view'" class="flex-1 min-h-0 flex flex-col">
              <div class="flex-1 min-h-0 overflow-y-auto p-4 space-y-4" data-onboarding="ticket-drawer-invoice-preview">
                <div v-if="invoiceLoading" class="text-sm text-slate-600 py-8 text-center">Loading invoice…</div>
                <div v-else-if="invoiceError" class="rounded-md bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
                  {{ invoiceError }}
                </div>
                <template v-else-if="invoiceDetail?.success && ticket">
                  <InvoiceTicketCorePreview
                    :ticket="ticket"
                    :invoice-detail="invoiceDetail"
                    :can-view-financial="canViewFinancial"
                  />
                </template>
                <div v-else class="text-sm text-slate-600 py-8 text-center">No data.</div>
              </div>
              <div
                v-if="showViewFooter"
                class="shrink-0 border-t border-slate-200 bg-white p-4 space-y-2"
                data-onboarding="ticket-drawer-view-footer"
              >
                <Button
                  v-if="canOpenFullCustomerInvoice"
                  data-onboarding="ticket-drawer-open-customer"
                  class="w-full min-h-[44px] bg-slate-900 hover:bg-slate-800 text-white"
                  @click="emit('open-full-invoice')"
                >
                  Open {{ sendToCustomerTypeLabel }}
                </Button>
                <div
                  v-if="showViewChatActions"
                  class="flex flex-row gap-2 items-stretch"
                >
                  <Button
                    variant="outline"
                    class="flex-1 min-w-0 min-h-[44px] border-slate-300 px-2 text-center whitespace-normal leading-snug"
                    @click="onSendTicketTypeToCustomer($event)"
                  >
                    Send {{ sendToCustomerTypeLabel }} to customer
                  </Button>
                  <Button
                    data-onboarding="ticket-drawer-request-approval"
                    class="flex-1 min-w-0 min-h-[44px] bg-brand-accent hover:bg-brand-accent-hover text-brand-accent-foreground border-transparent px-2 text-center whitespace-normal leading-snug"
                    @click="onRequestApprovalFromView($event)"
                  >
                    Request Approval
                  </Button>
                </div>
              </div>
            </div>

            <div v-show="activeTab === 'chat'" class="flex-1 min-h-0 flex flex-col overflow-hidden" data-onboarding="ticket-chat-panel">
              <ChatPanelBody
                v-if="hasChatContact"
                class="flex-1 min-h-0"
                :active="open && activeTab === 'chat'"
                :phone="ticket.phone"
                :customer-name="ticket.name"
                :ticket-number="ticket.ticketNumber"
                :ticket-type="ticket.type"
                :inspection-id="ticket.inspectionId"
                :email="ticket.email"
                :shop-name="ticket.storeName"
                :vehicle-display="vehicleDisplayForChat"
                :pending-chat-bootstrap="pendingChatBootstrap"
                :highlighted-quick-insert="highlightedQuickInsert"
                :suppress-chat-history-fetch="suppressChatHistoryFetch"
                @cancel="handleClose"
                @bootstrap-consumed="onChatBootstrapConsumed"
                @quick-insert-interaction="onQuickInsertInteraction"
                @message-sent="onChatMessageSent"
              />
              <div v-else class="p-6 text-sm text-slate-600">
                No phone number or email on file for this ticket.
              </div>
            </div>

            <div v-show="activeTab === 'timeline'" class="flex-1 overflow-y-auto min-h-0 p-2" data-onboarding="ticket-timeline-panel">
              <TimelinePanel
                v-if="ticket.ticketNumber != null"
                :timeline-data="timelineData"
                :has-approvals="timelineHasApprovals"
                :is-advisor-view="true"
                :is-ticket-viewed-pulsing="timelineViewPulsing"
                :is-inspection-viewed-pulsing="timelineInspectionViewPulsing"
                @show-approvals="emit('show-approvals')"
              />
            </div>

            <div v-show="activeTab === 'approvals'" class="flex-1 min-h-0 flex flex-col overflow-hidden" data-onboarding="ticket-drawer-approvals-panel">
              <ApprovedServicesPanel
                v-if="ticket.ticketNumber != null"
                :ticket-number="ticket.ticketNumber"
                :approval-tick="approvalUpdateTrigger"
                :record="approvalsRecordOverride"
                :can-view-financial="canViewFinancial"
              />
            </div>

            <div v-show="activeTab === 'technicianWorksheet'" class="flex-1 min-h-0 flex flex-col overflow-hidden">
              <TechnicianWorksheetPanel
                v-if="ticket.ticketNumber != null"
                :ticket="ticket"
                :invoice-detail="invoiceDetail"
                :invoice-loading="invoiceLoading"
                :invoice-error="invoiceError"
                :can-view-cost="canViewFinancial"
                :approval-update-trigger="approvalUpdateTrigger"
                :approvals-record-override="approvalsRecordOverride"
                @show-vehicle-specs="emit('show-vehicle-specs')"
              />
            </div>
          </template>
        </div>
        </template>
      </aside>
    </Transition>
  </Teleport>
</template>

<script lang="ts">
export type TicketActionsTab = 'view' | 'chat' | 'timeline' | 'approvals' | 'technicianWorksheet'
</script>

<script setup lang="ts">
import { computed, ref, watch, onMounted, onUnmounted } from 'vue'
import { PhX } from '@phosphor-icons/vue'
import Button from '@/components/ui/Button.vue'
import TimelinePanel from '@/components/TimelinePanel.vue'
import ApprovedServicesPanel from '@/components/tickets/ApprovedServicesPanel.vue'
import TechnicianWorksheetPanel from '@/components/tickets/TechnicianWorksheetPanel.vue'
import ChatPanelBody, {
  type ChatPanelBootstrap,
  type ChatQuickInsertHighlight,
  type ChatQuickInsertKind,
} from '@/components/chat/ChatPanelBody.vue'
import InvoiceTicketCorePreview from '@/components/invoices/InvoiceTicketCorePreview.vue'
import CustomerInvoiceView from '@/pages/CustomerInvoiceView.vue'
import type { Ticket, InvoiceDetailResponse, TicketActionVisibility } from '@/types/ticket'
import { DEFAULT_TICKET_ACTION_VISIBILITY } from '@/types/ticket'
import type { TicketTimelineData } from '@/composables/useTicketTimelineData'
import type { WorkApprovalRecordV1 } from '@/lib/work-approvals'
import {
  getInvoiceTypeLabel,
  getVehicleMakeModelYearFromTicketVehicle,
} from '@/lib/invoice-line-items'
import { alertAnchored } from '@/lib/ui/anchoredUserDialog'

const props = defineProps<{
  open: boolean
  activeTab: TicketActionsTab
  ticket: Ticket | null
  hasCost: boolean
  canViewFinancial: boolean
  hasChat: boolean
  ticketActionVisibility?: TicketActionVisibility
  invoiceDetail: InvoiceDetailResponse | null
  invoiceLoading: boolean
  invoiceError: string
  timelineData: TicketTimelineData
  timelineHasApprovals: boolean
  timelineViewPulsing: boolean
  timelineInspectionViewPulsing: boolean
  /** Bumps when work-approvals storage changes so Approvals tab refreshes. */
  approvalUpdateTrigger: number
  fullInvoiceOpen: boolean
  embeddedInvToken: string
  embeddedOpenApprovals: boolean
  /** Skip chat history request (tickets tour) so load failures don’t surface in the UI. */
  suppressChatHistoryFetch?: boolean
  /** When set, Approvals tab reads this instead of work-approvals localStorage (tickets tour). */
  approvalsRecordOverride?: WorkApprovalRecordV1 | undefined
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  'update:activeTab': [tab: TicketActionsTab]
  'update:fullInvoiceOpen': [value: boolean]
  close: []
  /** Slide-in transition finished; parent can re-measure onboarding tour anchors. */
  'drawer-enter-done': []
  'open-full-invoice': []
  'open-in-full-page': []
  'show-approvals': []
  'show-vehicle-specs': []
  'chat-inactive': []
}>()

function collapseFullInvoice() {
  emit('update:fullInvoiceOpen', false)
}

/** Tailwind `md` is 768px — on smaller screens, back from full invoice should dismiss the drawer. */
const isMobileCloseDrawerOnEmbeddedBack = ref(
  typeof window !== 'undefined' && window.matchMedia('(max-width: 767px)').matches,
)
let mobileEmbeddedBackMq: MediaQueryList | null = null
function onMobileEmbeddedBackMqChange() {
  isMobileCloseDrawerOnEmbeddedBack.value = mobileEmbeddedBackMq?.matches ?? false
}

function onEmbeddedBackFromInvoice() {
  if (isMobileCloseDrawerOnEmbeddedBack.value) {
    handleClose()
    return
  }
  collapseFullInvoice()
}

function handleOverlayClick() {
  if (props.fullInvoiceOpen) {
    collapseFullInvoice()
    return
  }
  handleClose()
}

const pendingChatBootstrap = ref<ChatPanelBootstrap>(null)
const highlightedQuickInsert = ref<ChatQuickInsertHighlight>(null)
const effectiveActionVisibility = computed<TicketActionVisibility>(
  () => props.ticketActionVisibility ?? DEFAULT_TICKET_ACTION_VISIBILITY,
)

const hasChatContact = computed(() => {
  const t = props.ticket
  if (!t) return false
  return !!(t.phone?.trim() || t.email?.trim())
})

const showViewChatActions = computed(() => props.hasChat && hasChatContact.value)

const canOpenFullCustomerInvoice = computed(
  () => !!props.ticket && props.invoiceDetail?.success === true,
)

const showViewFooter = computed(
  () => canOpenFullCustomerInvoice.value || showViewChatActions.value,
)

const sendToCustomerTypeLabel = computed(() => {
  const t = props.ticket
  if (!t) return 'Invoice'
  return getInvoiceTypeLabel(t.type)
})

const vehicleDisplayForChat = computed(() => {
  const t = props.ticket
  if (!t?.vehicle) return ''
  return getVehicleMakeModelYearFromTicketVehicle(t.vehicle)
})

function canShowTab(tab: TicketActionsTab): boolean {
  const visibility = effectiveActionVisibility.value
  if (tab === 'view') return props.hasCost && visibility.view
  if (tab === 'chat') return props.hasChat && visibility.chat
  if (tab === 'timeline') return visibility.timeline
  if (tab === 'approvals') return visibility.approvals
  return visibility.technicianWorksheet
}

function getFirstAvailableTab(): TicketActionsTab | null {
  const order: TicketActionsTab[] = ['view', 'chat', 'timeline', 'approvals', 'technicianWorksheet']
  return order.find((tab) => canShowTab(tab)) ?? null
}

function handleClose() {
  pendingChatBootstrap.value = null
  highlightedQuickInsert.value = null
  // Do not emit fullInvoiceOpen before open: that would re-render the tabbed
  // shell while the drawer is still open (visible flash). Parent @close clears it.
  emit('update:open', false)
  // Defer emit('close') until after-leave so parent does not null ticket / full
  // invoice while the panel is still transitioning (avoids tab shell flash).
}

function onDrawerAfterEnter() {
  emit('drawer-enter-done')
}

function onDrawerAfterLeave() {
  if (props.open) return
  emit('close')
}

function setTab(tab: TicketActionsTab) {
  emit('update:activeTab', tab)
}

async function ensureChatAvailableOrWarn(e?: MouseEvent): Promise<boolean> {
  if (!props.hasChat) {
    emit('chat-inactive')
    return false
  }
  if (!hasChatContact.value) {
    await alertAnchored({
      message: 'No phone number or email address available for this customer.',
      anchor: e,
    })
    return false
  }
  return true
}

async function onSendTicketTypeToCustomer(e: MouseEvent) {
  if (!(await ensureChatAvailableOrWarn(e))) return
  highlightedQuickInsert.value = 'customerView'
  pendingChatBootstrap.value = 'customerView'
  emit('update:activeTab', 'chat')
}

async function onRequestApprovalFromView(e: MouseEvent) {
  if (!(await ensureChatAvailableOrWarn(e))) return
  highlightedQuickInsert.value = 'requestApproval'
  pendingChatBootstrap.value = 'requestApproval'
  emit('update:activeTab', 'chat')
}

function onChatBootstrapConsumed() {
  pendingChatBootstrap.value = null
}

function onQuickInsertInteraction(kind: ChatQuickInsertKind) {
  if (kind === 'inspection') {
    highlightedQuickInsert.value = null
    return
  }
  highlightedQuickInsert.value = kind
}

function onChatMessageSent() {
  highlightedQuickInsert.value = null
}

function handleEsc(e: KeyboardEvent) {
  if (e.key === 'Escape' && props.open) {
    if (props.fullInvoiceOpen) {
      collapseFullInvoice()
      return
    }
    handleClose()
  }
}

watch(
  () => props.open,
  (isOpen) => {
    if (typeof document === 'undefined') return
    document.body.style.overflow = isOpen ? 'hidden' : ''
    if (!isOpen) {
      pendingChatBootstrap.value = null
      highlightedQuickInsert.value = null
    }
  },
)

watch(
  () => props.ticket?.ticketNumber,
  () => {
    highlightedQuickInsert.value = null
  },
)

watch(
  () => [
    props.activeTab,
    props.hasCost,
    props.hasChat,
    effectiveActionVisibility.value.view,
    effectiveActionVisibility.value.chat,
    effectiveActionVisibility.value.timeline,
    effectiveActionVisibility.value.approvals,
    effectiveActionVisibility.value.technicianWorksheet,
  ] as const,
  () => {
    if (canShowTab(props.activeTab)) return
    const fallback = getFirstAvailableTab()
    if (fallback && fallback !== props.activeTab) {
      emit('update:activeTab', fallback)
    }
  },
  { immediate: true },
)

onMounted(() => {
  if (typeof window !== 'undefined') {
    mobileEmbeddedBackMq = window.matchMedia('(max-width: 767px)')
    isMobileCloseDrawerOnEmbeddedBack.value = mobileEmbeddedBackMq.matches
    mobileEmbeddedBackMq.addEventListener('change', onMobileEmbeddedBackMqChange)
  }
  window.addEventListener('keydown', handleEsc)
})

onUnmounted(() => {
  mobileEmbeddedBackMq?.removeEventListener('change', onMobileEmbeddedBackMqChange)
  mobileEmbeddedBackMq = null
  if (typeof document !== 'undefined') {
    document.body.style.overflow = ''
  }
  window.removeEventListener('keydown', handleEsc)
})

defineExpose({
  setTab,
})
</script>

<style scoped>
.ticket-actions-overlay-enter-active,
.ticket-actions-overlay-leave-active {
  transition: opacity 0.2s ease;
}

.ticket-actions-overlay-enter-from,
.ticket-actions-overlay-leave-to {
  opacity: 0;
}

.ticket-actions-drawer-enter-active,
.ticket-actions-drawer-leave-active {
  transition: transform 0.25s ease, opacity 0.25s ease;
}

.ticket-actions-drawer-enter-from,
.ticket-actions-drawer-leave-to {
  transform: translateX(100%);
  opacity: 0.98;
}
</style>
