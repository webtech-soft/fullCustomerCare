<template>
  <div class="space-y-6">
    <!-- Compact identity (no shop header, no history/timeline actions) -->
    <div class="bg-slate-50 rounded-lg p-4 space-y-3">
      <div class="flex flex-wrap items-center gap-3">
        <h3 class="text-lg font-semibold text-slate-900">
          {{ getInvoiceTypeLabel(ticket.type) }} #{{ ticket.ticketNumber }}
        </h3>
        <p class="text-sm text-slate-600">Date: {{ ticket.date }}</p>
      </div>
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
        <div>
          <span class="text-slate-600">Customer:</span>
          <span class="ml-2 font-medium text-slate-900">{{ ticket.name || '—' }}</span>
        </div>
      </div>
      <div v-if="ticket.vehicle" class="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm pt-2 border-t border-slate-200">
        <div>
          <span class="text-slate-600">License Plate:</span>
          <span class="ml-2 font-medium text-slate-900">{{
            getLicensePlateDisplayFromTicket(ticket.vehicle, invoiceDetail.invoiceRow?.AutoTagState)
          }}</span>
        </div>
        <div>
          <span class="text-slate-600">Vehicle:</span>
          <span class="ml-2 font-medium text-slate-900">{{
            getVehicleMakeModelYearFromTicketVehicle(ticket.vehicle) || '—'
          }}</span>
        </div>
        <div v-if="mileage != null">
          <span class="text-slate-600">Mileage:</span>
          <span class="ml-2 font-medium text-slate-900">{{ formatMileage(mileage) }}</span>
        </div>
        <div v-if="vin">
          <span class="text-slate-600">VIN:</span>
          <span class="ml-2 font-medium text-slate-900">{{ vin }}</span>
        </div>
      </div>
    </div>

    <div v-if="invoiceDetail.detailRows?.length" class="space-y-2">
      <template v-for="packageGroup in lineItemGroups" :key="'p-' + packageGroup.packageId + '-' + packageGroup.headerItem.LineNum">
        <div class="bg-white border border-slate-200 rounded p-4">
          <div class="flex items-start justify-between gap-4">
            <div class="flex-1 min-w-0">
              <p class="text-sm font-medium text-slate-900">
                {{ packageGroup.headerItem.Description || '—' }}
              </p>
              <div class="flex items-center gap-3 text-xs text-slate-600 mt-1">
                <span
                  v-if="
                    packageGroup.headerItem.Quantity &&
                    packageGroup.headerItem.Quantity !== '0' &&
                    packageGroup.headerItem.Goods !== 'S'
                  "
                >Quantity: {{ packageGroup.headerItem.Quantity }}</span>
              </div>
              <div
                v-if="packageGroup.items?.length"
                class="mt-2 ml-4 space-y-1 border-l-2 border-slate-300 pl-4"
              >
                <div v-for="item in packageGroup.items" :key="item.LineNum" class="text-xs text-slate-600">
                  <p>{{ item.Description || '—' }}</p>
                  <div class="flex items-center gap-3 text-xs text-slate-500 mt-1">
                    <span v-if="item.Quantity && item.Quantity !== '0' && item.Goods !== 'S'">Quantity: {{ item.Quantity }}</span>
                  </div>
                </div>
              </div>
            </div>
            <div v-if="canViewFinancial" class="text-right flex-shrink-0">
              <p class="text-sm font-semibold text-slate-900">
                {{ formatInvoiceCurrency(getGroupTotal(packageGroup)) }}
              </p>
            </div>
          </div>
        </div>
      </template>
    </div>

    <div v-if="declinedGroups.length > 0">
      <h4 class="font-semibold text-red-700 mb-3 text-lg">DECLINED SERVICES</h4>
      <div class="space-y-2">
        <template
          v-for="packageGroup in declinedGroups"
          :key="'d-' + packageGroup.packageId + '-' + packageGroup.headerItem.LineNum"
        >
          <div class="bg-red-50 border border-red-200 rounded p-4">
            <div class="flex items-start justify-between gap-4">
              <div class="flex-1 min-w-0">
                <p class="text-sm font-medium text-slate-900">
                  {{ packageGroup.headerItem.Description || '—' }}
                </p>
                <div class="flex items-center gap-3 text-xs text-slate-600 mt-1">
                  <span
                    v-if="
                      packageGroup.headerItem.Quantity &&
                      packageGroup.headerItem.Quantity !== '0' &&
                      packageGroup.headerItem.Goods !== 'S'
                    "
                  >Quantity: {{ packageGroup.headerItem.Quantity }}</span>
                </div>
                <div
                  v-if="packageGroup.items?.length"
                  class="mt-2 ml-4 space-y-1 border-l-2 border-red-300 pl-4"
                >
                  <div v-for="item in packageGroup.items" :key="item.LineNum" class="text-xs text-slate-600">
                    <p>{{ item.Description || '—' }}</p>
                    <div class="flex items-center gap-3 text-xs text-slate-500 mt-1">
                      <span v-if="item.Quantity && item.Quantity !== '0' && item.Goods !== 'S'">Quantity: {{ item.Quantity }}</span>
                    </div>
                  </div>
                </div>
              </div>
              <div v-if="canViewFinancial" class="text-right flex-shrink-0">
                <p class="text-sm font-semibold text-slate-900">
                  {{ formatInvoiceCurrency(getGroupTotal(packageGroup)) }}
                </p>
              </div>
            </div>
          </div>
        </template>
      </div>
    </div>

    <div v-if="canViewFinancial && invoiceDetail.invoiceRow" class="bg-slate-50 rounded-lg p-4 border-t-2 border-slate-300">
      <div class="space-y-2 text-sm">
        <div v-if="subtotal != null" class="flex justify-between">
          <span class="text-slate-600">Subtotal:</span>
          <span class="font-medium text-slate-900">{{ formatInvoiceCurrency(subtotal) }}</span>
        </div>
        <div v-if="shopSuppliesTotal > 0" class="flex justify-between">
          <span class="text-slate-600">Shop Supplies:</span>
          <span class="font-medium text-slate-900">{{ formatInvoiceCurrency(shopSuppliesTotal) }}</span>
        </div>
        <div v-if="invoiceDetail.invoiceRow.SalesTax" class="flex justify-between">
          <span class="text-slate-600">Sales Tax:</span>
          <span class="font-medium text-slate-900">{{ formatInvoiceCurrency(invoiceDetail.invoiceRow.SalesTax) }}</span>
        </div>
        <div v-if="total != null" class="flex justify-between pt-2 border-t border-slate-300">
          <span class="text-slate-900 font-semibold text-base">Total:</span>
          <span class="font-bold text-lg text-slate-900">{{ formatInvoiceCurrency(total) }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { Ticket, InvoiceDetailResponse } from '@/types/ticket'
import {
  formatInvoiceCurrency,
  getGroupedCustomerPreviewLineItems,
  getGroupTotal,
  getDeclinedLineItemsFromRows,
  groupItemsByPackage,
  getShopSuppliesTotalFromRows,
  getCustomerPreviewSubtotal,
  getCustomerPreviewTotal,
  getInvoiceTypeLabel,
  getVehicleMakeModelYearFromTicketVehicle,
  getLicensePlateDisplayFromTicket,
} from '@/lib/invoice-line-items'

const props = withDefaults(
  defineProps<{
    ticket: Ticket
    invoiceDetail: InvoiceDetailResponse
    canViewFinancial?: boolean
  }>(),
  { canViewFinancial: true },
)

const lineItemGroups = computed(() => getGroupedCustomerPreviewLineItems(props.invoiceDetail.detailRows))

const declinedGroups = computed(() =>
  groupItemsByPackage(getDeclinedLineItemsFromRows(props.invoiceDetail.detailRows || [])),
)

const shopSuppliesTotal = computed(() =>
  props.invoiceDetail.detailRows ? getShopSuppliesTotalFromRows(props.invoiceDetail.detailRows) : 0,
)

const subtotal = computed(() => getCustomerPreviewSubtotal(props.invoiceDetail))
const total = computed(() => getCustomerPreviewTotal(props.invoiceDetail))

const mileage = computed(() => {
  if (props.invoiceDetail.invoiceRow?.Mileage !== undefined) {
    return props.invoiceDetail.invoiceRow.Mileage
  }
  const t = props.ticket
  if (t && 'mileage' in t && t.mileage !== undefined) return t.mileage as number
  return undefined
})

const vin = computed(() => props.invoiceDetail.invoiceRow?.VIN)

function formatMileage(mileageVal: number): string {
  return new Intl.NumberFormat('en-US').format(mileageVal)
}
</script>
