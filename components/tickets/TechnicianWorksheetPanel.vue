<template>
  <div class="flex-1 min-h-0 overflow-y-auto p-4 space-y-4">
    <div class="flex flex-wrap items-center justify-between gap-2">
      <h3 class="text-base font-semibold text-slate-900">Technician Worksheet</h3>
      <Button
        variant="outline"
        size="sm"
        type="button"
        class="min-h-[36px]"
        @click="$emit('show-vehicle-specs')"
      >
        Show Vehicle Specs
      </Button>
    </div>

    <div v-if="invoiceLoading" class="text-sm text-slate-600 py-8 text-center">Loading worksheet…</div>
    <div v-else-if="invoiceError" class="rounded-md bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
      {{ invoiceError }}
    </div>
    <div v-else-if="!invoiceDetail?.success" class="text-sm text-slate-600 py-8 text-center">
      No worksheet data available.
    </div>
    <template v-else>
      <div class="rounded-lg border border-slate-200 bg-slate-50 p-4">
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
          <div class="rounded-md border border-slate-200 bg-white px-3 py-2">
            <p class="text-xs text-slate-600">Total Service Quantity</p>
            <p class="font-semibold text-slate-900">{{ totalServiceQuantity }}</p>
          </div>
          <div class="rounded-md border border-slate-200 bg-white px-3 py-2">
            <p class="text-xs text-slate-600">Total</p>
            <p class="font-semibold text-slate-900">
              {{ canViewCost ? formatInvoiceCurrency(totalWorksheetAmount) : 'Restricted' }}
            </p>
          </div>
        </div>
      </div>

      <div
        v-for="group in worksheetGroups"
        :key="`${group.packageId}-${group.headerItem.LineNum}`"
        class="rounded-lg border border-slate-200 bg-white p-4 space-y-3"
      >
        <div class="flex flex-wrap items-start justify-between gap-3">
          <div class="min-w-0 space-y-1">
            <p class="text-sm font-semibold text-slate-900 break-words">
              {{ group.headerItem.Description || 'Unnamed Service' }}
            </p>
          </div>
          <div class="flex items-center gap-2">
            <span
              :class="[
                'inline-flex items-center rounded-full border px-2 py-1 text-[11px] font-medium',
                isServiceApproved(group)
                  ? 'border-green-300 bg-green-50 text-green-700'
                  : 'border-slate-300 bg-slate-50 text-slate-700',
              ]"
            >
              {{ isServiceApproved(group) ? 'Approved' : 'Not Approved' }}
            </span>
          </div>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-3 gap-2 text-sm">
          <div class="rounded-md bg-slate-50 border border-slate-200 px-3 py-2">
            <p class="text-xs text-slate-600">Goods Quantity</p>
            <p class="font-semibold text-slate-900">{{ getGoodsQuantity(group) }}</p>
          </div>
          <div class="rounded-md bg-slate-50 border border-slate-200 px-3 py-2">
            <p class="text-xs text-slate-600">Service Quantity</p>
            <p class="font-semibold text-slate-900">{{ getServiceQuantity(group) }}</p>
          </div>
          <div class="rounded-md bg-slate-50 border border-slate-200 px-3 py-2">
            <p class="text-xs text-slate-600">Service Total</p>
            <p class="font-semibold text-slate-900">
              {{ canViewCost ? formatInvoiceCurrency(getGroupTotal(group)) : 'Restricted' }}
            </p>
          </div>
        </div>

        <div class="rounded-md border border-slate-200 overflow-hidden">
          <table class="w-full text-xs">
            <thead class="bg-slate-50 text-slate-600">
              <tr>
                <th class="text-left font-medium px-3 py-2">Line</th>
                <th class="text-left font-medium px-3 py-2">Item / Service Name</th>
                <th class="text-left font-medium px-3 py-2">Type</th>
                <th class="text-right font-medium px-3 py-2">Qty</th>
                <th class="text-right font-medium px-3 py-2">Price</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-200">
              <tr
                v-for="item in getPackageLineItems(group)"
                :key="item.LineNum"
                class="align-top"
              >
                <td class="px-3 py-2 text-slate-700">{{ item.LineNum }}</td>
                <td class="px-3 py-2 text-slate-900 break-words">{{ item.Description || '—' }}</td>
                <td class="px-3 py-2 text-slate-700">{{ item.Goods === 'S' ? 'Service' : 'Goods' }}</td>
                <td class="px-3 py-2 text-right text-slate-900">{{ getDisplayQuantity(item) }}</td>
                <td class="px-3 py-2 text-right text-slate-900">
                  {{ canViewCost ? formatInvoiceCurrency(item.Total || 0) : 'Restricted' }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
      <p v-if="worksheetGroups.length === 0" class="text-sm text-slate-600 py-6 text-center">
        No line items were returned for this ticket.
      </p>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import Button from '@/components/ui/Button.vue'
import type { InvoiceDetailResponse, Ticket } from '@/types/ticket'
import type { WorkApprovalRecordV1 } from '@/lib/work-approvals'
import { getWorkApprovalItem } from '@/lib/work-approvals'
import {
  formatInvoiceCurrency,
  getGroupedCustomerPreviewLineItems,
  getDeclinedLineItemsFromRows,
  groupItemsByPackage,
  getGroupTotal,
} from '@/lib/invoice-line-items'

type WorksheetGroup = ReturnType<typeof getGroupedCustomerPreviewLineItems>[number]
type WorksheetRow = WorksheetGroup['headerItem']

const props = defineProps<{
  ticket: Ticket
  invoiceDetail: InvoiceDetailResponse | null
  invoiceLoading: boolean
  invoiceError: string
  canViewCost: boolean
  approvalUpdateTrigger: number
  approvalsRecordOverride?: WorkApprovalRecordV1 | undefined
}>()

defineEmits<{
  'show-vehicle-specs': []
}>()

const worksheetGroups = computed<WorksheetGroup[]>(() => {
  const rows = props.invoiceDetail?.detailRows ?? []
  const acceptedGroups = getGroupedCustomerPreviewLineItems(rows)
  const declinedGroups = groupItemsByPackage(getDeclinedLineItemsFromRows(rows))
  return [...acceptedGroups, ...declinedGroups]
})

const totalServiceQuantity = computed(() => {
  return worksheetGroups.value.reduce((sum, group) => {
    const groupServiceQty = getPackageLineItems(group)
      .filter((item) => item.Goods === 'S' && !isNonBillableServiceItem(item))
      .reduce((groupSum, item) => groupSum + getServiceQuantityForItem(item), 0)
    return sum + groupServiceQty
  }, 0)
})

const totalWorksheetAmount = computed(() => {
  return worksheetGroups.value.reduce((sum, group) => sum + getGroupTotal(group), 0)
})

const approvalTick = computed(() => props.approvalUpdateTrigger)

function serviceGroupKey(group: WorksheetGroup): string {
  return `${group.packageId}:${group.headerItem.LineNum}`
}

function isServiceApproved(group: WorksheetGroup): boolean {
  void approvalTick.value
  const ticketNumber = props.ticket.ticketNumber
  const key = serviceGroupKey(group)
  if (props.approvalsRecordOverride?.ticketNumber === ticketNumber) {
    return props.approvalsRecordOverride.items.some((item) => item.key === key)
  }
  return !!getWorkApprovalItem(ticketNumber, key)
}

function parseQuantity(value?: string): number {
  if (!value) return 0
  const parsed = Number(String(value).replace(/,/g, '').trim())
  return Number.isFinite(parsed) ? parsed : 0
}

function normalizeQuantity(value?: string): string {
  const qty = parseQuantity(value)
  return Number.isFinite(qty) ? String(qty) : '0'
}

function parseAllowedTime(value?: string): number {
  if (!value) return 0
  const parsed = Number(String(value).replace(/,/g, '').trim())
  return Number.isFinite(parsed) ? parsed : 0
}

const NON_BILLABLE_SERVICE_RE = /\b(tax|protection|warranty|disposal)\b/i

function isNonBillableServiceItem(item: WorksheetRow): boolean {
  return item.Goods === 'S' && NON_BILLABLE_SERVICE_RE.test(item.Description ?? '')
}

function getServiceQuantityForItem(item: WorksheetRow): number {
  const quantity = parseQuantity(item.Quantity)
  const allowedTime = parseAllowedTime(item.AllowedTime)
  return allowedTime === 0 ? quantity : quantity * allowedTime
}

function getDisplayQuantity(item: WorksheetRow): string {
  if (item.Goods === 'S') {
    if (isNonBillableServiceItem(item)) return '—'
    return String(getServiceQuantityForItem(item))
  }
  return normalizeQuantity(item.Quantity)
}

function groupRows(group: WorksheetGroup): WorksheetRow[] {
  return [group.headerItem, ...(group.items ?? [])]
}

function shouldSuppressHeaderServiceLine(group: WorksheetGroup): boolean {
  return group.packageId !== 0 && group.headerItem.Goods === 'S'
}

function getPackageLineItems(group: WorksheetGroup): WorksheetRow[] {
  if (shouldSuppressHeaderServiceLine(group)) {
    return group.items ?? []
  }
  return groupRows(group)
}

function getGoodsQuantity(group: WorksheetGroup): string {
  const qty = groupRows(group)
    .filter((item) => item.Goods !== 'S')
    .reduce((sum, item) => sum + parseQuantity(item.Quantity), 0)
  return String(qty)
}

function getServiceQuantity(group: WorksheetGroup): string {
  const qty = getPackageLineItems(group)
    .filter((item) => item.Goods === 'S' && !isNonBillableServiceItem(item))
    .reduce((sum, item) => sum + getServiceQuantityForItem(item), 0)
  return String(qty)
}
</script>
