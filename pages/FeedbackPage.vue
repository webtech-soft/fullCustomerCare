<template>
  <div class="h-full bg-brand-shell">
    <!-- Page Header -->
    <div class="border-b bg-white">
      <div class="mx-auto max-w-7xl px-3 py-4 sm:px-6 lg:px-8">
        <h1 class="text-xl sm:text-2xl font-bold w-full text-brand-accent">Feedback</h1>
      </div>
    </div>

    <div class="mx-auto max-w-7xl px-3 py-6 sm:px-6 lg:px-8">
      <!-- Filters -->
      <Card class="mb-6 p-4">
        <div class="space-y-4">
          <!-- Filter Row - Date Range, Sort, and Salesrep -->
          <div
            class="flex flex-col gap-3 w-full min-w-0 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3"
          >
            <div class="relative w-full min-w-0 sm:w-auto" ref="dateRangeRef">
              <select
                :value="filters.dateRange"
                @change="handleDateRangeChange(($event.target as HTMLSelectElement).value)"
                class="flex h-11 min-h-[44px] sm:h-10 sm:min-h-0 w-full sm:w-auto rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <option>Past 3 Months</option>
                <option>Today</option>
                <option>Yesterday</option>
                <option>This Week</option>
                <option>Last Week</option>
                <option>This Month</option>
                <option>Last Month</option>
                <option>This Quarter</option>
                <option>Last Quarter</option>
                <option>This Year</option>
                <option>Last Year</option>
                <option>Custom Date Range</option>
              </select>
            </div>

            <select
              :value="sortOrder"
              @change="sortOrder = ($event.target as HTMLSelectElement).value"
              class="flex h-11 min-h-[44px] sm:h-10 sm:min-h-0 w-full sm:w-auto rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <option value="newest">Newest to Oldest</option>
              <option value="oldest">Oldest to Newest</option>
            </select>

            <select
              :value="selectedSalesrep || 'All Salesreps'"
              @change="selectedSalesrep = ($event.target as HTMLSelectElement).value === 'All Salesreps' ? null : ($event.target as HTMLSelectElement).value"
              class="flex h-11 min-h-[44px] sm:h-10 sm:min-h-0 w-full sm:w-auto rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <option>All Salesreps</option>
              <option v-for="salesrep in availableSalesreps" :key="salesrep" :value="salesrep">
                {{ salesrep }}
              </option>
            </select>

            <!-- Search Button -->
            <Button
              variant="ink"
              @click="handleSearch"
              class="h-11 min-h-[44px] sm:h-10 sm:min-h-0 w-full sm:w-auto min-w-[100px]"
            >
              <PhMagnifyingGlass :size="16" weight="regular" class="mr-2" />
              Search
            </Button>

            <!-- View Toggle -->
            <div
              class="flex w-full sm:w-auto items-center gap-2 border rounded-md p-1 h-11 min-h-[44px] sm:h-10 sm:min-h-0"
            >
              <button
                @click="viewMode = 'card'"
                :class="[
                  'flex flex-1 sm:flex-initial items-center justify-center gap-2 px-3 py-1.5 rounded text-sm font-medium transition-colors min-h-[44px] sm:min-h-[36px]',
                  viewMode === 'card'
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-600 hover:bg-slate-100'
                ]"
              >
                <PhSquaresFour :size="16" weight="regular" />
                <span class="hidden sm:inline">Cards</span>
              </button>
              <button
                @click="viewMode = 'table'"
                :class="[
                  'flex flex-1 sm:flex-initial items-center justify-center gap-2 px-3 py-1.5 rounded text-sm font-medium transition-colors min-h-[44px] sm:min-h-[36px]',
                  viewMode === 'table'
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-600 hover:bg-slate-100'
                ]"
              >
                <PhTable :size="16" weight="regular" />
                <span class="hidden sm:inline">Table</span>
              </button>
            </div>
          </div>

          <!-- Second Row - Checkbox Filters -->
          <div class="flex flex-wrap items-center gap-4">
            <label class="flex items-center gap-2 text-sm cursor-pointer">
              <Checkbox
                :checked="filters.overdueOnly"
                @update:checked="(val) => handleFilterChange('overdueOnly', val)"
              />
              <span>Overdue Invoices Only</span>
            </label>

            <label class="flex items-center gap-2 text-sm cursor-pointer">
              <Checkbox
                :checked="filters.declinedOnly"
                @update:checked="(val) => handleFilterChange('declinedOnly', val)"
              />
              <span>Show Declined Only</span>
            </label>
          </div>

          <!-- Custom Date Range Popover -->
          <Teleport to="body">
            <div
              v-if="showCustomDatePopover"
              ref="customDatePopoverRef"
              class="fixed z-[100] w-[calc(100vw-2rem)] sm:w-80 max-w-sm rounded-md border bg-white shadow-lg p-4"
              :style="{
                top: `${customDatePopoverPosition.top}px`,
                left: `${customDatePopoverPosition.left}px`,
              }"
            >
              <div class="space-y-4">
                <div class="text-sm font-medium text-slate-900">Custom Date Range</div>
                <div class="space-y-3">
                  <div>
                    <label class="block text-xs font-medium text-slate-600 mb-1">From Date</label>
                    <input
                      type="date"
                      :value="customFromDateInput"
                      @input="(e) => customFromDateInput = (e.target as HTMLInputElement).value"
                      class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    />
                  </div>
                  <div>
                    <label class="block text-xs font-medium text-slate-600 mb-1">To Date</label>
                    <input
                      type="date"
                      :value="customToDateInput"
                      @input="(e) => customToDateInput = (e.target as HTMLInputElement).value"
                      class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    />
                  </div>
                </div>
                <div class="flex gap-2 justify-end">
                  <Button
                    variant="outline"
                    size="sm"
                    @click="cancelCustomDateRange"
                  >
                    Cancel
                  </Button>
                  <Button variant="brand" size="sm" @click="applyCustomDateRange">
                    Apply
                  </Button>
                </div>
              </div>
            </div>
          </Teleport>
        </div>
      </Card>

      <!-- Invoices Display -->
      <div v-if="loading" class="text-center py-12">
        <p class="text-slate-600">Loading invoices...</p>
      </div>
      <div v-else-if="invoices.length === 0" class="text-center py-12">
        <p class="text-slate-600">No invoices found</p>
      </div>
      <div v-else>
        <!-- Card View -->
        <div v-if="viewMode === 'card'" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <FeedbackCard
            v-for="invoice in sortedInvoices"
            :key="invoice.id"
            :ticket="invoice"
            @sendFeedback="handleSendFeedback"
            @chat="handleChat"
            @view="handleView"
          />
        </div>

        <!-- Table View -->
        <div v-else class="bg-white rounded-lg border overflow-hidden overflow-x-auto">
          <table class="w-full">
            <thead class="bg-slate-50 border-b">
              <tr>
                <th 
                  @click="handleSort('ticketNumber')"
                  class="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider cursor-pointer hover:bg-slate-100 select-none"
                >
                  <div class="flex items-center gap-2">
                    <span>Invoice #</span>
                    <span v-if="sortColumn === 'ticketNumber'" class="text-slate-400">
                      <PhCaretUp v-if="sortDirection === 'asc'" :size="12" weight="bold" />
                      <PhCaretDown v-else :size="12" weight="bold" />
                    </span>
                  </div>
                </th>
                <th 
                  @click="handleSort('date')"
                  class="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider cursor-pointer hover:bg-slate-100 select-none"
                >
                  <div class="flex items-center gap-2">
                    <span>Date</span>
                    <span v-if="sortColumn === 'date'" class="text-slate-400">
                      <PhCaretUp v-if="sortDirection === 'asc'" :size="12" weight="bold" />
                      <PhCaretDown v-else :size="12" weight="bold" />
                    </span>
                  </div>
                </th>
                <th 
                  @click="handleSort('total')"
                  class="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider cursor-pointer hover:bg-slate-100 select-none"
                >
                  <div class="flex items-center gap-2">
                    <span>Total</span>
                    <span v-if="sortColumn === 'total'" class="text-slate-400">
                      <PhCaretUp v-if="sortDirection === 'asc'" :size="12" weight="bold" />
                      <PhCaretDown v-else :size="12" weight="bold" />
                    </span>
                  </div>
                </th>
                <th 
                  @click="handleSort('customer')"
                  class="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider cursor-pointer hover:bg-slate-100 select-none"
                >
                  <div class="flex items-center gap-2">
                    <span>Customer</span>
                    <span v-if="sortColumn === 'customer'" class="text-slate-400">
                      <PhCaretUp v-if="sortDirection === 'asc'" :size="12" weight="bold" />
                      <PhCaretDown v-else :size="12" weight="bold" />
                    </span>
                  </div>
                </th>
                <th 
                  @click="handleSort('vehicle')"
                  class="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider cursor-pointer hover:bg-slate-100 select-none"
                >
                  <div class="flex items-center gap-2">
                    <span>Vehicle</span>
                    <span v-if="sortColumn === 'vehicle'" class="text-slate-400">
                      <PhCaretUp v-if="sortDirection === 'asc'" :size="12" weight="bold" />
                      <PhCaretDown v-else :size="12" weight="bold" />
                    </span>
                  </div>
                </th>
                <th 
                  @click="handleSort('salesrep')"
                  class="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider cursor-pointer hover:bg-slate-100 select-none"
                >
                  <div class="flex items-center gap-2">
                    <span>Salesrep</span>
                    <span v-if="sortColumn === 'salesrep'" class="text-slate-400">
                      <PhCaretUp v-if="sortDirection === 'asc'" :size="12" weight="bold" />
                      <PhCaretDown v-else :size="12" weight="bold" />
                    </span>
                  </div>
                </th>
                <th class="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Technician</th>
                <th class="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Status</th>
                <th class="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody class="bg-white divide-y divide-slate-200">
              <tr
                v-for="invoice in sortedTableInvoices"
                :key="invoice.id"
                class="transition-colors"
              >
                <td class="px-4 py-3 whitespace-nowrap">
                  <div class="text-sm font-semibold text-slate-900">#{{ invoice.ticketNumber }}</div>
                </td>
                <td class="px-4 py-3 whitespace-nowrap">
                  <div class="text-sm text-slate-900">{{ invoice.date }}</div>
                </td>
                <td class="px-4 py-3 whitespace-nowrap">
                  <div class="text-sm font-semibold text-slate-900">{{ formatCurrency(invoice.total) }}</div>
                </td>
                <td class="px-4 py-3">
                  <div class="text-sm text-slate-900">{{ invoice.name || "—" }}</div>
                </td>
                <td class="px-4 py-3">
                  <div class="text-sm text-slate-900">{{ invoice.vehicle || "—" }}</div>
                </td>
                <td class="px-4 py-3 whitespace-nowrap">
                  <div class="text-sm text-slate-900">{{ invoice.salesrep || "—" }}</div>
                </td>
                <td class="px-4 py-3 whitespace-nowrap">
                  <div class="text-sm text-slate-900">{{ invoice.technician || "—" }}</div>
                </td>
                <td class="px-4 py-3 whitespace-nowrap">
                  <div class="flex items-center gap-1">
                    <Badge
                      v-if="isOverdue(invoice)"
                      class="text-xs bg-red-100 text-red-800 border-red-200"
                    >
                      Overdue
                    </Badge>
                    <Badge
                      v-if="invoicesWithDeclinedStatus.get(invoice.ticketNumber)"
                      class="text-xs bg-orange-100 text-orange-800 border-orange-200"
                    >
                      Declined
                    </Badge>
                    <span v-if="!isOverdue(invoice) && !invoicesWithDeclinedStatus.get(invoice.ticketNumber)" class="text-xs text-slate-500">—</span>
                  </div>
                </td>
                <td class="px-4 py-3 whitespace-nowrap">
                  <div class="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="default"
                      class="bg-brand-accent hover:bg-brand-accent-hover text-brand-accent-foreground h-9"
                      @click="handleSendFeedback(invoice)"
                    >
                      <PhPaperPlaneTilt :size="14" weight="regular" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      @click="handleChat(invoice)"
                      class="h-9"
                    >
                      <PhChats :size="14" weight="regular" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      @click="handleView(invoice)"
                      class="h-9"
                    >
                      <PhEye :size="14" weight="regular" />
                    </Button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Invoice Detail Dialog -->
    <Dialog v-model="showInvoiceDialog">
      <DialogContent class="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Invoice #{{ selectedInvoice?.ticketNumber }}</DialogTitle>
        </DialogHeader>
        <div class="flex-1 overflow-y-auto">
          <div v-if="isLoadingInvoice" class="flex items-center justify-center py-8">
            <p class="text-slate-600">Loading invoice details...</p>
          </div>
          <div v-else-if="invoiceError" class="flex items-center justify-center py-8">
            <p class="text-red-600 text-sm">{{ invoiceError }}</p>
          </div>
          <div v-else-if="invoiceDetail" class="space-y-4">
            <!-- Invoice Header Info -->
            <div v-if="selectedInvoice" class="bg-slate-50 rounded-lg p-4 space-y-2">
              <div class="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span class="text-slate-600">Date:</span>
                  <span class="ml-2 font-medium">{{ selectedInvoice.date }}</span>
                </div>
                <div>
                  <span class="text-slate-600">Customer:</span>
                  <span class="ml-2 font-medium">{{ selectedInvoice.name }}</span>
                </div>
                <div v-if="selectedInvoice.vehicle">
                  <span class="text-slate-600">Vehicle:</span>
                  <span class="ml-2 font-medium">{{ selectedInvoice.vehicle }}</span>
                </div>
              </div>
            </div>

            <!-- Line Items -->
            <div v-if="invoiceDetail.detailRows && invoiceDetail.detailRows.length > 0">
              <h4 class="font-semibold text-slate-900 mb-3">Invoice Items</h4>
              <div class="space-y-2">
                <div
                  v-for="item in getRegularLineItems()"
                  :key="item.LineNum"
                  class="bg-white border border-slate-200 rounded p-3"
                  :class="{
                    'opacity-60': item.Props?.IsComment,
                    'bg-slate-50': item.Props?.IsHeaderItem
                  }"
                >
                  <div class="flex items-start justify-between gap-4">
                    <div class="flex-1 min-w-0">
                      <p class="text-sm font-medium text-slate-900">
                        {{ item.Description || '—' }}
                      </p>
                      <div class="flex items-center gap-3 text-xs text-slate-600 mt-1">
                        <span v-if="item.Quantity">Quantity: {{ item.Quantity }}</span>
                      </div>
                    </div>
                    <div class="text-right flex-shrink-0">
                      <p v-if="item.Total" class="text-sm font-semibold text-slate-900">
                        {{ formatCurrency(item.Total) }}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Declined Items -->
            <div v-if="getDeclinedItems().length > 0" class="mt-4">
              <h4 class="font-semibold text-red-700 mb-3">DECLINED</h4>
              <div class="space-y-2">
                <div
                  v-for="item in getDeclinedItems()"
                  :key="item.LineNum"
                  class="bg-red-50 border border-red-200 rounded p-3"
                >
                  <div class="flex items-start justify-between gap-4">
                    <div class="flex-1 min-w-0">
                      <p class="text-sm font-medium text-slate-900">
                        {{ item.Description || '—' }}
                      </p>
                      <div class="flex items-center gap-3 text-xs text-slate-600 mt-1">
                        <span v-if="item.Quantity">Quantity: {{ item.Quantity }}</span>
                      </div>
                    </div>
                    <div class="text-right flex-shrink-0">
                      <p v-if="item.Total" class="text-sm font-semibold text-slate-900">
                        {{ formatCurrency(item.Total) }}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Invoice Summary -->
            <div v-if="invoiceDetail.invoiceRow" class="bg-slate-50 rounded-lg p-4">
              <div class="space-y-2 text-sm">
                <div v-if="invoiceDetail.invoiceRow.Subtotal">
                  <span class="text-slate-600">Subtotal:</span>
                  <span class="ml-2 font-medium">{{ formatCurrency(invoiceDetail.invoiceRow.Subtotal) }}</span>
                </div>
                <div v-if="invoiceDetail.invoiceRow.SalesTax">
                  <span class="text-slate-600">Sales Tax:</span>
                  <span class="ml-2 font-medium">{{ formatCurrency(invoiceDetail.invoiceRow.SalesTax) }}</span>
                </div>
                <div v-if="invoiceDetail.invoiceRow.Total" class="pt-2 border-t border-slate-200">
                  <span class="text-slate-900 font-semibold">Total:</span>
                  <span class="ml-2 font-bold text-lg">{{ formatCurrency(invoiceDetail.invoiceRow.Total) }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div class="flex justify-end pt-4 border-t border-slate-200">
          <Button
            variant="outline"
            @click="showInvoiceDialog = false"
          >
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>

    <!-- Email Editor Dialog -->
    <Dialog v-model="showEmailEditor">
      <DialogContent class="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Send Feedback Email</DialogTitle>
        </DialogHeader>
        <div class="flex-1 overflow-y-auto space-y-4">
          <!-- Invoice Info -->
          <div v-if="selectedInvoiceForFeedback" class="bg-slate-50 rounded-lg p-4 space-y-2 text-sm">
            <div>
              <span class="text-slate-600">Invoice #:</span>
              <span class="ml-2 font-medium">{{ selectedInvoiceForFeedback.ticketNumber }}</span>
            </div>
            <div>
              <span class="text-slate-600">Customer:</span>
              <span class="ml-2 font-medium">{{ selectedInvoiceForFeedback.name }}</span>
            </div>
            <div v-if="selectedInvoiceForFeedback.vehicle">
              <span class="text-slate-600">Vehicle:</span>
              <span class="ml-2 font-medium">{{ selectedInvoiceForFeedback.vehicle }}</span>
            </div>
          </div>

          <!-- Message Type Dropdown -->
          <div>
            <label class="block text-sm font-medium text-slate-700 mb-2">
              Message Type
            </label>
            <select
              :value="emailMessageType"
              @change="handleMessageTypeChange(($event.target as HTMLSelectElement).value)"
              class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <option value="thank_you">Thank You</option>
              <option value="follow_up">Follow Up</option>
              <option value="survey">Survey Request</option>
              <option value="reminder">Declined Service Reminder</option>
              <option value="custom">Custom Message</option>
            </select>
          </div>

          <!-- Message Editor -->
          <div>
            <label class="block text-sm font-medium text-slate-700 mb-2">
              Message
            </label>
            <textarea
              v-model="emailMessage"
              rows="10"
              class="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-y"
              placeholder="Enter your message here..."
            ></textarea>
          </div>

          <!-- Communication Method Selection -->
          <div v-if="selectedInvoiceForFeedback && (selectedInvoiceForFeedback.email || selectedInvoiceForFeedback.phone)" class="space-y-3 pt-2">
            <label class="block text-sm font-medium text-slate-700 mb-2">
              Send via:
            </label>
            <div class="space-y-3">
              <div v-if="selectedInvoiceForFeedback.email" class="flex items-center gap-2">
                <Checkbox v-model:checked="sendViaEmail" />
                <label class="text-sm font-medium text-slate-700 cursor-pointer">Email</label>
                <span class="text-xs text-slate-500 ml-2">{{ selectedInvoiceForFeedback.email }}</span>
              </div>
              <div v-if="selectedInvoiceForFeedback.phone" class="flex items-center gap-2">
                <Checkbox v-model:checked="sendViaSMS" />
                <label class="text-sm font-medium text-slate-700 cursor-pointer">SMS</label>
                <span class="text-xs text-slate-500 ml-2">{{ selectedInvoiceForFeedback.phone }}</span>
              </div>
            </div>
          </div>
          <div v-else-if="selectedInvoiceForFeedback" class="text-sm text-slate-600">
            No phone number or email address is available for this customer.
          </div>
        </div>
        <div class="flex justify-end gap-2 pt-4 border-t border-slate-200">
          <Button
            variant="outline"
            @click="handleCancelEmail"
          >
            Cancel
          </Button>
          <Button
            class="bg-brand-accent hover:bg-brand-accent-hover text-brand-accent-foreground"
            @click="handleSendEmail"
            :disabled="!emailMessage.trim() || (!sendViaEmail && !sendViaSMS)"
          >
            Send
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, computed } from 'vue'
import Card from '@/components/ui/Card.vue'
import Button from '@/components/ui/Button.vue'
import Checkbox from '@/components/ui/Checkbox.vue'
import FeedbackCard from '@/components/FeedbackCard.vue'
import Badge from '@/components/ui/Badge.vue'
import { PhSquaresFour, PhTable, PhPaperPlaneTilt, PhChats, PhEye, PhCaretUp, PhCaretDown, PhMagnifyingGlass } from '@phosphor-icons/vue'
import type { Ticket } from '@/types/ticket'
import { fetchFeedbackInvoices, type FeedbackFilters, isOverdue as checkIsOverdue } from '@/api/feedback'
import { fetchInvoiceDetail } from '@/api/tickets'
import { buildSendEmailRequest, sendChatMessage, sendEmail } from '@/api/chat'
import { useSessionCookie } from '@/composables/useSessionCookie'
import { positionDateRangePopover } from '@/lib/popover-position'
import Dialog from '@/components/ui/Dialog.vue'
import DialogContent from '@/components/ui/DialogContent.vue'
import DialogHeader from '@/components/ui/DialogHeader.vue'
import DialogTitle from '@/components/ui/DialogTitle.vue'

const invoices = ref<Ticket[]>([])
const loading = ref(true)
const sortOrder = ref('newest') // Default: newest to oldest
const selectedSalesrep = ref<string | null>(null)
const viewMode = ref<'card' | 'table'>('card')
const sortColumn = ref<string | null>(null)
const sortDirection = ref<'asc' | 'desc'>('asc')

// Invoice detail dialog state
const showInvoiceDialog = ref(false)
const selectedInvoice = ref<Ticket | null>(null)
const invoiceDetail = ref<any>(null)
const isLoadingInvoice = ref(false)
const invoiceError = ref('')

// Search trigger - increments when search button is clicked to trigger API refetch
const searchTrigger = ref(0)

// Initialize with past 3 months
const now = new Date()
const threeMonthsAgo = new Date(now)
threeMonthsAgo.setMonth(now.getMonth() - 3)

const formatDateForInput = (date: Date): string => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const formatDateForApi = (date: Date): string => {
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const year = date.getFullYear()
  return `${month}/${day}/${year}`
}

const filters = ref<FeedbackFilters>({
  dateRange: "Past 3 Months",
  customFromDate: formatDateForApi(threeMonthsAgo),
  customToDate: formatDateForApi(now),
  overdueOnly: false,
  declinedOnly: false,
})

// Cookie management for date selection
const { setCookie, getCookie, deleteCookie } = useSessionCookie()
const COOKIE_DATE_RANGE = 'feedback_date_range'
const COOKIE_CUSTOM_FROM = 'feedback_custom_from_date'
const COOKIE_CUSTOM_TO = 'feedback_custom_to_date'

// Custom date range popover state
const showCustomDatePopover = ref(false)
const dateRangeRef = ref<HTMLElement | null>(null)
const customDatePopoverRef = ref<HTMLElement | null>(null)
const customDatePopoverPosition = ref({ top: 0, left: 0 })
const customFromDateInput = ref(formatDateForInput(threeMonthsAgo))
const customToDateInput = ref(formatDateForInput(now))

/**
 * Parses a date string in MM/DD/YYYY format to a Date object
 */
const parseDate = (dateStr: string): Date | null => {
  if (!dateStr) return null
  const parts = dateStr.split('/')
  if (parts.length !== 3) return null
  const month = parseInt(parts[0]) - 1 // Month is 0-indexed
  const day = parseInt(parts[1])
  const year = parseInt(parts[2])
  return new Date(year, month, day)
}

/**
 * Get unique list of salesreps from invoices
 */
const availableSalesreps = computed(() => {
  const salesrepSet = new Set<string>()
  invoices.value.forEach((invoice) => {
    if (invoice.salesrep && invoice.salesrep.trim()) {
      salesrepSet.add(invoice.salesrep.trim())
    }
  })
  return Array.from(salesrepSet).sort()
})

// Reactive state for declined-only filter
const invoicesWithDeclinedStatus = ref<Map<number, boolean>>(new Map())

// Watch for declined-only filter changes and check declined status
watch(
  () => filters.value.declinedOnly,
  async (enabled) => {
    if (enabled) {
      // When enabled, check declined status for all invoices
      const invoicesToCheck = selectedSalesrep.value
        ? invoices.value.filter((inv) => inv.salesrep === selectedSalesrep.value)
        : invoices.value

      // Check declined status for all invoices in parallel (with limit to avoid overwhelming)
      const checkPromises = invoicesToCheck.slice(0, 50).map(async (invoice) => {
        const hasDeclined = await hasDeclinedServices(invoice)
        invoicesWithDeclinedStatus.value.set(invoice.ticketNumber, hasDeclined)
      })

      await Promise.all(checkPromises)
    } else {
      // Clear cache when filter is disabled
      invoicesWithDeclinedStatus.value.clear()
    }
  }
)

/**
 * Computed property for filtered and sorted invoices
 */
const sortedInvoices = computed(() => {
  let invoicesToSort = [...invoices.value]
  
  // Filter by salesrep if selected
  if (selectedSalesrep.value) {
    invoicesToSort = invoicesToSort.filter(
      (invoice) => invoice.salesrep === selectedSalesrep.value
    )
  }

  // Filter by declined only if enabled
  if (filters.value.declinedOnly) {
    invoicesToSort = invoicesToSort.filter((invoice) => {
      return invoicesWithDeclinedStatus.value.get(invoice.ticketNumber) === true
    })
  }
  
  // Sort by date
  return invoicesToSort.sort((a, b) => {
    const dateA = parseDate(a.date)
    const dateB = parseDate(b.date)
    
    // Handle null dates (put them at the end)
    if (!dateA && !dateB) return 0
    if (!dateA) return 1
    if (!dateB) return -1
    
    if (sortOrder.value === 'newest') {
      // Newest to oldest: compare dates descending
      return dateB.getTime() - dateA.getTime()
    } else {
      // Oldest to newest: compare dates ascending
      return dateA.getTime() - dateB.getTime()
    }
  })
})

const loadInvoices = async () => {
  loading.value = true
  try {
    const data = await fetchFeedbackInvoices(filters.value)
    invoices.value = data
  } catch (error) {
    console.error("Error fetching feedback invoices:", error)
  } finally {
    loading.value = false
  }
}

// Cache for declined status to avoid repeated API calls
const declinedStatusCache = ref<Map<number, boolean>>(new Map())
const loadingDeclinedStatus = ref<Set<number>>(new Set())

// Check if an invoice has declined services
const hasDeclinedServices = async (invoice: Ticket): Promise<boolean> => {
  // Check cache first
  if (declinedStatusCache.value.has(invoice.ticketNumber)) {
    return declinedStatusCache.value.get(invoice.ticketNumber) || false
  }

  // If already loading, return false for now
  if (loadingDeclinedStatus.value.has(invoice.ticketNumber)) {
    return false
  }

  try {
    loadingDeclinedStatus.value.add(invoice.ticketNumber)
    const response = await fetchInvoiceDetail({
      invoiceNum: invoice.ticketNumber,
      includeRawData: 'false',
      includeSchema: 'false',
    })

    if (response.success && response.detailRows) {
      const hasDeclined = response.detailRows.some((item: any) => item.Props?.IsDeclined)
      declinedStatusCache.value.set(invoice.ticketNumber, hasDeclined)
      return hasDeclined
    }
    return false
  } catch (error) {
    console.error('Error checking declined services:', error)
    return false
  } finally {
    loadingDeclinedStatus.value.delete(invoice.ticketNumber)
  }
}

// Watch searchTrigger to reload invoices when search button is clicked
watch(searchTrigger, () => {
  loadInvoices()
})

// Handle search button click
const handleSearch = () => {
  searchTrigger.value++
}

onMounted(() => {
  // Load date filters from cookies
  const savedDateRange = getCookie(COOKIE_DATE_RANGE)
  const savedCustomFrom = getCookie(COOKIE_CUSTOM_FROM)
  const savedCustomTo = getCookie(COOKIE_CUSTOM_TO)
  
  if (savedDateRange) {
    filters.value.dateRange = savedDateRange
  }
  if (savedCustomFrom) {
    filters.value.customFromDate = savedCustomFrom
  }
  if (savedCustomTo) {
    filters.value.customToDate = savedCustomTo
  }
  
  // Load on mount
  searchTrigger.value++
})

const handleFilterChange = (key: keyof typeof filters.value, value: any) => {
  filters.value = { ...filters.value, [key]: value }
}

// Save date filters to cookies when they change
watch(
  () => [filters.value.dateRange, filters.value.customFromDate, filters.value.customToDate],
  ([dateRange, customFrom, customTo]) => {
    if (dateRange) {
      setCookie(COOKIE_DATE_RANGE, dateRange)
    }
    if (customFrom) {
      setCookie(COOKIE_CUSTOM_FROM, customFrom)
    } else {
      deleteCookie(COOKIE_CUSTOM_FROM)
    }
    if (customTo) {
      setCookie(COOKIE_CUSTOM_TO, customTo)
    } else {
      deleteCookie(COOKIE_CUSTOM_TO)
    }
  }
)

const handleDateRangeChange = (value: string) => {
  if (value === 'Custom Date Range') {
    showCustomDatePopover.value = true
    if (filters.value.customFromDate) {
      const fromParts = filters.value.customFromDate.split('/')
      if (fromParts.length === 3) {
        customFromDateInput.value = `${fromParts[2]}-${fromParts[0].padStart(2, '0')}-${fromParts[1].padStart(2, '0')}`
      }
    } else {
      customFromDateInput.value = formatDateForInput(threeMonthsAgo)
    }
    
    if (filters.value.customToDate) {
      const toParts = filters.value.customToDate.split('/')
      if (toParts.length === 3) {
        customToDateInput.value = `${toParts[2]}-${toParts[0].padStart(2, '0')}-${toParts[1].padStart(2, '0')}`
      }
    } else {
      customToDateInput.value = formatDateForInput(now)
    }
    updateCustomDatePopoverPosition()
  } else if (value === 'Past 3 Months') {
    // Set to past 3 months
    const now = new Date()
    const threeMonthsAgo = new Date(now)
    threeMonthsAgo.setMonth(now.getMonth() - 3)
    filters.value = {
      ...filters.value,
      dateRange: value,
      customFromDate: formatDateForApi(threeMonthsAgo),
      customToDate: formatDateForApi(now),
    }
    showCustomDatePopover.value = false
  } else {
    // For other predefined ranges, calculate dates and convert to custom range
    const now = new Date()
    let fromDate = new Date()
    let toDate = new Date()
    
    switch (value) {
      case 'Today':
        // Already set to today
        break
      case 'Yesterday':
        fromDate.setDate(now.getDate() - 1)
        toDate.setDate(now.getDate() - 1)
        break
      case 'This Week':
        fromDate.setDate(now.getDate() - now.getDay())
        break
      case 'Last Week':
        const lastWeekStart = new Date(now)
        lastWeekStart.setDate(now.getDate() - now.getDay() - 7)
        fromDate = lastWeekStart
        toDate = new Date(lastWeekStart)
        toDate.setDate(lastWeekStart.getDate() + 6)
        break
      case 'This Month':
        fromDate.setDate(1)
        break
      case 'Last Month':
        fromDate = new Date(now.getFullYear(), now.getMonth() - 1, 1)
        toDate = new Date(now.getFullYear(), now.getMonth(), 0)
        break
      case 'This Quarter':
        const currentQuarter = Math.floor(now.getMonth() / 3)
        fromDate = new Date(now.getFullYear(), currentQuarter * 3, 1)
        break
      case 'Last Quarter':
        const lastQuarter = Math.floor(now.getMonth() / 3) - 1
        const lastQuarterYear = lastQuarter < 0 ? now.getFullYear() - 1 : now.getFullYear()
        const lastQuarterMonth = lastQuarter < 0 ? 9 : lastQuarter * 3
        fromDate = new Date(lastQuarterYear, lastQuarterMonth, 1)
        toDate = new Date(lastQuarterYear, lastQuarterMonth + 3, 0)
        break
      case 'This Year':
        fromDate.setMonth(0, 1)
        break
      case 'Last Year':
        fromDate = new Date(now.getFullYear() - 1, 0, 1)
        toDate = new Date(now.getFullYear() - 1, 11, 31)
        break
    }
    
    filters.value = {
      ...filters.value,
      dateRange: 'Custom Date Range',
      customFromDate: formatDateForApi(fromDate),
      customToDate: formatDateForApi(toDate),
    }
    showCustomDatePopover.value = false
  }
}

const applyCustomDateRange = () => {
  if (customFromDateInput.value && customToDateInput.value) {
    const fromParts = customFromDateInput.value.split('-')
    const toParts = customToDateInput.value.split('-')
    
    if (fromParts.length === 3 && toParts.length === 3) {
      filters.value = {
        ...filters.value,
        dateRange: 'Custom Date Range',
        customFromDate: `${fromParts[1]}/${fromParts[2]}/${fromParts[0]}`,
        customToDate: `${toParts[1]}/${toParts[2]}/${toParts[0]}`,
      }
    }
  }
  showCustomDatePopover.value = false
}

const cancelCustomDateRange = () => {
  showCustomDatePopover.value = false
  if (filters.value.dateRange === 'Custom Date Range' && !filters.value.customFromDate) {
    filters.value.dateRange = 'Past 3 Months'
    const now = new Date()
    const threeMonthsAgo = new Date(now)
    threeMonthsAgo.setMonth(now.getMonth() - 3)
    filters.value.customFromDate = formatDateForApi(threeMonthsAgo)
    filters.value.customToDate = formatDateForApi(now)
  }
}

const updateCustomDatePopoverPosition = () => {
  if (!dateRangeRef.value) return
  
  requestAnimationFrame(() => {
    if (!dateRangeRef.value) return
    
    const rect = dateRangeRef.value.getBoundingClientRect()
    customDatePopoverPosition.value = positionDateRangePopover(rect)
  })
}

watch(showCustomDatePopover, (isOpen) => {
  if (isOpen) {
    updateCustomDatePopoverPosition()
    const handleScroll = () => updateCustomDatePopoverPosition()
    const handleResize = () => updateCustomDatePopoverPosition()
    
    window.addEventListener('scroll', handleScroll, true)
    window.addEventListener('resize', handleResize)
    
    return () => {
      window.removeEventListener('scroll', handleScroll, true)
      window.removeEventListener('resize', handleResize)
    }
  }
})

watch(showCustomDatePopover, (isOpen) => {
  if (!isOpen) return
  
  const handleClickOutside = (event: MouseEvent) => {
    if (
      dateRangeRef.value &&
      !dateRangeRef.value.contains(event.target as Node) &&
      customDatePopoverRef.value &&
      !customDatePopoverRef.value.contains(event.target as Node)
    ) {
      showCustomDatePopover.value = false
    }
  }

  const handleEscape = (event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      showCustomDatePopover.value = false
    }
  }
  
  document.addEventListener('mousedown', handleClickOutside, true)
  document.addEventListener('keydown', handleEscape, true)
  
  return () => {
    document.removeEventListener('mousedown', handleClickOutside, true)
    document.removeEventListener('keydown', handleEscape, true)
  }
})

// Email editor dialog state
const showEmailEditor = ref(false)
const selectedInvoiceForFeedback = ref<Ticket | null>(null)
const emailMessageType = ref('thank_you')
const emailMessage = ref('')
const sendViaEmail = ref(false)
const sendViaSMS = ref(false)

// Canned messages by type
const cannedMessages: Record<string, string> = {
  thank_you: `Thank you for choosing [Shop Name].
We appreciate the opportunity to service your [vehicle]. If you have any questions about today's visit or notice anything out of the ordinary, please don't hesitate to contact us.

We look forward to helping you stay safe and on the road.`,
  follow_up: `How did we do?
We're always working to improve, and your feedback matters to us. Please take a moment to answer a few quick questions about your recent visit to [Shop Name].

This feedback goes directly to our team and helps us serve you better.

Start here: [Internal Survey Link]`,
  survey: `We value your feedback.
If you have a moment, we'd appreciate you sharing your experience with [Shop Name]. Your feedback helps us improve and helps other customers choose a shop they can trust.

Please leave your review here: [External Survey Link]`,
  reminder: `Service Reminder from [Shop Name]
During your recent visit, you chose to decline the following recommended service(s):

[List of Declined Services]

If you have questions or would like to schedule these services at a later time, we're happy to help. Our goal is to keep your vehicle safe and running reliably.`,
  custom: '',
}

const handleSendFeedback = (invoice: Ticket) => {
  selectedInvoiceForFeedback.value = invoice
  emailMessageType.value = 'thank_you'
  emailMessage.value = cannedMessages.thank_you
  // Initialize checkboxes - check both if both are available, otherwise check the available one
  sendViaEmail.value = !!invoice.email
  sendViaSMS.value = !!invoice.phone
  showEmailEditor.value = true
}

const handleMessageTypeChange = (type: string) => {
  emailMessageType.value = type
  emailMessage.value = cannedMessages[type] || ''
}

const handleSendEmail = async () => {
  if (!selectedInvoiceForFeedback.value) return

  // Check that at least one channel is selected
  if (!sendViaEmail.value && !sendViaSMS.value) {
    alert('Please select at least one communication method')
    return
  }

  // Validate selected channels have contact info
  if (sendViaSMS.value && !selectedInvoiceForFeedback.value.phone) {
    alert('Phone number is required for SMS but not available')
    return
  }
  if (sendViaEmail.value && !selectedInvoiceForFeedback.value.email) {
    alert('Email address is required for email but not available')
    return
  }

  const ticket = selectedInvoiceForFeedback.value
  let lastError: string | null = null

  if (sendViaEmail.value && ticket.email) {
    const emailResult = await sendEmail(buildSendEmailRequest({
      to: ticket.email,
      subject: `Feedback Follow-up - Invoice #${ticket.ticketNumber}`,
      body: emailMessage.value.trim(),
    }))
    if (!emailResult.success) {
      lastError = emailResult.error ?? 'Failed to send feedback email'
    }
  }

  if (sendViaSMS.value && ticket.phone) {
    const smsResult = await sendChatMessage({
      phone: ticket.phone,
      body: emailMessage.value.trim(),
      ticketNumber: ticket.ticketNumber,
      channel: 'sms',
    })
    if (!smsResult.success) {
      lastError = smsResult.error ?? 'Failed to send feedback SMS'
    }
  }

  if (lastError) {
    alert(lastError)
    return
  }

  const channels: string[] = []
  if (sendViaEmail.value) channels.push('Email')
  if (sendViaSMS.value) channels.push('SMS')
  
  console.log(`Sending via ${channels.join(' and ')}:`, {
    invoice: selectedInvoiceForFeedback.value,
    type: emailMessageType.value,
    message: emailMessage.value,
    channels,
  })
  
  // Close dialog after sending
  showEmailEditor.value = false
  selectedInvoiceForFeedback.value = null
  sendViaEmail.value = false
  sendViaSMS.value = false
}

const handleCancelEmail = () => {
  showEmailEditor.value = false
  selectedInvoiceForFeedback.value = null
  emailMessage.value = ''
  emailMessageType.value = 'thank_you'
  sendViaEmail.value = false
  sendViaSMS.value = false
}

const handleChat = (invoice: Ticket) => {
  // TODO: Implement chat functionality
  console.log("Chat with invoice:", invoice)
}

const handleView = async (invoice: Ticket) => {
  selectedInvoice.value = invoice
  showInvoiceDialog.value = true
  isLoadingInvoice.value = true
  invoiceError.value = ''
  invoiceDetail.value = null

  try {
    const response = await fetchInvoiceDetail({
      invoiceNum: invoice.ticketNumber,
      includeRawData: 'false',
      includeSchema: 'false',
    })

    if (!response.success) {
      invoiceError.value = response.error || 'Failed to load invoice details'
    } else {
      invoiceDetail.value = response
    }
  } catch (error) {
    console.error('Error fetching invoice detail:', error)
    invoiceError.value = error instanceof Error ? error.message : 'An error occurred while loading invoice details'
  } finally {
    isLoadingInvoice.value = false
  }
}

const formatCurrency = (amount: string | number): string => {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num)
}

const getRegularLineItems = (): any[] => {
  if (!invoiceDetail.value?.detailRows) return []
  return invoiceDetail.value.detailRows.filter(
    (item: any) => !item.Props?.IsDeclined && !item.Props?.IsComment
  )
}

const getDeclinedItems = (): any[] => {
  if (!invoiceDetail.value?.detailRows) return []
  return invoiceDetail.value.detailRows.filter((item: any) => item.Props?.IsDeclined)
}

// Helper function for table view
const isOverdue = (invoice: Ticket): boolean => {
  return checkIsOverdue(invoice)
}

// Sorting logic for table view
const handleSort = (column: string) => {
  if (sortColumn.value === column) {
    sortDirection.value = sortDirection.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortColumn.value = column
    sortDirection.value = 'asc'
  }
}

const sortedTableInvoices = computed(() => {
  if (!sortColumn.value || viewMode.value === 'card') {
    return sortedInvoices.value
  }

  const sorted = [...sortedInvoices.value]
  const direction = sortDirection.value === 'asc' ? 1 : -1

  sorted.sort((a, b) => {
    switch (sortColumn.value) {
      case 'ticketNumber':
        return (a.ticketNumber - b.ticketNumber) * direction
      
      case 'date':
        const dateA = parseDate(a.date)
        const dateB = parseDate(b.date)
        if (!dateA && !dateB) return 0
        if (!dateA) return 1
        if (!dateB) return -1
        return (dateA.getTime() - dateB.getTime()) * direction
      
      case 'total':
        return (a.total - b.total) * direction
      
      case 'customer':
        return (a.name || '').localeCompare(b.name || '') * direction
      
      case 'vehicle':
        return (a.vehicle || '').localeCompare(b.vehicle || '') * direction
      
      case 'salesrep':
        return (a.salesrep || '').localeCompare(b.salesrep || '') * direction
      
      default:
        return 0
    }
  })

  return sorted
})
</script>
