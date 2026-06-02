<template>
  <div class="flex flex-col h-full min-h-0">
    <div v-if="showHeader" class="shrink-0 border-b border-slate-200 px-4 py-3 flex items-center justify-between gap-4">
      <h3 class="text-lg font-semibold text-slate-900 truncate">Approved Services</h3>
      <button
        v-if="showClose"
        type="button"
        class="min-h-[44px] min-w-[44px] px-4 py-2 text-sm font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-colors touch-manipulation shrink-0"
        @click="emit('close')"
      >
        Close
      </button>
    </div>

    <div class="flex-1 min-h-0 overflow-y-auto p-4 space-y-4" style="scrollbar-width: thin;">
      <div v-if="!effectiveRecord || effectiveRecord.items.length === 0" class="rounded-md border border-slate-200 bg-slate-50 p-4">
        <p class="text-sm text-slate-700">No approvals recorded.</p>
      </div>
      <div v-else class="space-y-4">
        <div class="rounded-md border border-slate-200 p-3">
          <p class="text-sm font-semibold text-slate-900">Ticket approval</p>
          <div class="mt-2 space-y-2 text-sm text-slate-700">
            <div v-if="canViewFinancial" class="flex justify-between gap-2">
              <span class="text-slate-500">Total approved</span>
              <span class="font-semibold text-slate-900">{{ formatInvoiceCurrency(approvedTotal) }}</span>
            </div>
            <div class="flex justify-between gap-2">
              <span class="text-slate-500">Approval date(s)</span>
              <span class="text-slate-900 text-right">
                <template v-if="dateRange">
                  <template v-if="typeof dateRange === 'string'">{{ dateRange }}</template>
                  <template v-else>First: {{ dateRange.first }} · Latest: {{ dateRange.latest }}</template>
                </template>
                <template v-else>—</template>
              </span>
            </div>
          </div>
        </div>

        <div class="rounded-md border border-slate-200 p-3">
          <p class="text-sm font-semibold text-slate-900">Signature</p>
          <div class="mt-2">
            <img
              v-if="signatureDataUrl"
              :src="signatureDataUrl"
              alt="Customer signature"
              class="w-full h-36 object-contain bg-white border border-slate-200 rounded"
            />
            <p v-else class="text-sm text-slate-500">—</p>
            <p
              v-if="signatureDataUrl && sortedItems.some((i) => i.verbalApproval)"
              class="text-[11px] text-slate-500 mt-1"
            >
              Some items were approved verbally.
            </p>
          </div>
        </div>

        <div class="rounded-md border border-slate-200 p-3">
          <p class="text-sm font-semibold text-slate-900 mb-2">Approved services</p>
          <div v-if="sortedItems.length === 0" class="text-sm text-slate-500">—</div>
          <div v-else class="space-y-3">
            <div
              v-for="item in sortedItems"
              :key="item.key"
              class="flex items-start justify-between gap-3"
            >
              <div class="min-w-0">
                <p class="text-sm font-semibold text-slate-800 uppercase tracking-tight truncate">
                  {{ item.description || '—' }}
                </p>
                <p class="text-[11px] text-slate-500 mt-0.5">
                  <template v-if="item.verbalApproval && item.approverName">
                    Approved verbally by {{ item.approverName }} on {{ item.approvedDate }} at {{ item.approvedTime }}
                  </template>
                  <template v-else>
                    Approved on {{ item.approvedDate }} at {{ item.approvedTime }}
                  </template>
                </p>
              </div>
              <p
                v-if="canViewFinancial"
                class="text-sm font-semibold text-slate-900 flex-shrink-0 tabular-nums"
              >
                {{ formatInvoiceCurrency(item.amount) }}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { getWorkApproval, type WorkApprovalRecordV1 } from '@/lib/work-approvals'
import { formatInvoiceCurrency } from '@/lib/invoice-line-items'
import {
  workApprovalApprovedTotal,
  workApprovalDateRangeDisplay,
  workApprovalLatestSignatureDataUrl,
  workApprovalSortedItems,
} from '@/lib/work-approval-display'

const props = withDefaults(
  defineProps<{
    /** When set, overrides storage read (e.g. CustomerInvoiceView reactive copy). */
    record?: WorkApprovalRecordV1 | null
    ticketNumber?: number | null
    /** Bumps reactive read from localStorage when used with ticketNumber. */
    approvalTick?: number
    /** Drawer mode: title row without dialog chrome. */
    showHeader?: boolean
    showClose?: boolean
    canViewFinancial?: boolean
  }>(),
  {
    record: undefined,
    ticketNumber: null,
    approvalTick: 0,
    showHeader: false,
    showClose: false,
    canViewFinancial: true,
  }
)

const emit = defineEmits<{
  close: []
}>()

const effectiveRecord = computed((): WorkApprovalRecordV1 | null => {
  if (props.record !== undefined) {
    return props.record
  }
  const n = props.ticketNumber
  if (n == null) return null
  void props.approvalTick
  return getWorkApproval(n)
})

const approvedTotal = computed(() => workApprovalApprovedTotal(effectiveRecord.value))
const sortedItems = computed(() => workApprovalSortedItems(effectiveRecord.value))
const dateRange = computed(() => workApprovalDateRangeDisplay(effectiveRecord.value))
const signatureDataUrl = computed(() => workApprovalLatestSignatureDataUrl(effectiveRecord.value))
</script>
