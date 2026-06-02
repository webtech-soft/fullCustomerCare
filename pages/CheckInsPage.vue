<template>
  <div class="h-full bg-brand-shell">
    <!-- Page Header with Style Selector and Main Filters -->
    <div class="border-b bg-white">
      <div class="mx-auto max-w-7xl px-3 sm:px-4 lg:px-8 py-3 sm:py-4">
        <div
          class="flex flex-col gap-3 w-full min-w-0 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-3"
        >
          <div
            class="flex flex-col gap-3 w-full min-w-0 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3 sm:flex-1"
          >
            <h1 class="text-xl sm:text-2xl font-bold shrink-0 w-full sm:w-auto text-brand-accent">
              Check In
            </h1>
            <!-- Style selector: Table / Cards -->
            <div
              class="flex w-full sm:w-auto items-center gap-0 border rounded-md border-border overflow-hidden h-10 min-h-[44px] sm:h-9 sm:min-h-0 p-0.5 bg-muted"
            >
              <button
                type="button"
                @click="viewMode = 'table'"
                :class="[
                  'flex flex-1 sm:flex-initial items-center justify-center gap-2 px-3 py-1.5 rounded text-sm font-medium transition-colors min-h-[44px] sm:min-h-[32px]',
                  viewMode === 'table'
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:bg-background/60 dark:hover:bg-accent/40'
                ]"
              >
                <PhTable :size="16" weight="regular" />
                <span class="hidden sm:inline">Table</span>
              </button>
              <button
                type="button"
                @click="viewMode = 'card'"
                :class="[
                  'flex flex-1 sm:flex-initial items-center justify-center gap-2 px-3 py-1.5 rounded text-sm font-medium transition-colors min-h-[44px] sm:min-h-[32px]',
                  viewMode === 'card'
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:bg-background/60 dark:hover:bg-accent/40'
                ]"
              >
                <PhSquaresFour :size="16" weight="regular" />
                <span class="hidden sm:inline">Cards</span>
              </button>
            </div>
            <div class="relative w-full min-w-0 sm:w-auto" ref="dateRangeRef">
              <select
                :value="filters.dateRange"
                @change="handleDateRangeChange(($event.target as HTMLSelectElement).value)"
                class="flex h-10 min-h-[44px] sm:h-9 sm:min-h-0 w-full sm:w-auto rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <option>Today</option>
                <option>Yesterday</option>
                <option>Tomorrow</option>
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
              :value="filters.status || 'All Statuses'"
              @change="handleFilterChange('status', ($event.target as HTMLSelectElement).value)"
              class="flex h-10 min-h-[44px] sm:h-9 sm:min-h-0 w-full sm:w-auto rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <option>All Statuses</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
            </select>
            <Button
              variant="ink"
              @click="handleSearch"
              class="h-10 min-h-[44px] sm:h-9 sm:min-h-0 w-full sm:w-auto min-w-[100px]"
            >
              <PhMagnifyingGlass :size="16" weight="regular" class="mr-2" />
              Search
            </Button>
          </div>
          <Button
            variant="brand"
            class="h-11 min-h-[44px] sm:h-10 sm:min-h-0 w-full sm:w-auto sm:shrink-0 hover:opacity-90"
          >
            <PhPlus :size="16" weight="regular" class="sm:mr-2" />
            <span class="hidden sm:inline">Check In</span>
          </Button>
        </div>
      </div>
    </div>

    <!-- Custom Date Range Popover (for date select) -->
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
            <Button variant="outline" size="sm" @click="cancelCustomDateRange">Cancel</Button>
            <Button variant="brand" size="sm" @click="applyCustomDateRange">Apply</Button>
          </div>
        </div>
      </div>
    </Teleport>

    <div class="mx-auto max-w-7xl px-3 sm:px-4 lg:px-8 py-4 sm:py-6">
      <!-- Check In Display -->
      <div v-if="loading" class="text-center py-12">
        <p class="text-slate-600">Loading check-ins...</p>
      </div>
      <div v-else-if="checkIns.length === 0" class="text-center py-12">
        <p class="text-slate-600">No check-ins found</p>
      </div>
      <div v-else>
        <!-- Card View -->
        <div v-if="viewMode === 'card'" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <TicketCard
            v-for="checkIn in checkIns"
            :key="checkIn.id"
            :ticket="checkIn"
            :show-timeline-button="false"
            @view="handleView"
            @chat="handleChat"
            @edit-status="handleEditStatus"
            @inspection="handleInspection"
            @update="handleUpdate"
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
                    <span>Ticket #</span>
                    <span v-if="sortColumn === 'ticketNumber'" class="text-slate-400">
                      <PhCaretUp v-if="sortDirection === 'asc'" :size="12" weight="bold" />
                      <PhCaretDown v-else :size="12" weight="bold" />
                    </span>
                  </div>
                </th>
                <th 
                  @click="handleSort('type')"
                  class="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider cursor-pointer hover:bg-slate-100 select-none"
                >
                  <div class="flex items-center gap-2">
                    <span>Type</span>
                    <span v-if="sortColumn === 'type'" class="text-slate-400">
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
                <th 
                  @click="handleSort('status')"
                  class="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider cursor-pointer hover:bg-slate-100 select-none"
                >
                  <div class="flex items-center gap-2">
                    <span>Status</span>
                    <span v-if="sortColumn === 'status'" class="text-slate-400">
                      <PhCaretUp v-if="sortDirection === 'asc'" :size="12" weight="bold" />
                      <PhCaretDown v-else :size="12" weight="bold" />
                    </span>
                  </div>
                </th>
                <th class="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody class="bg-white divide-y divide-slate-200">
              <tr
                v-for="checkIn in sortedCheckIns"
                :key="checkIn.id"
                class="transition-colors"
              >
                <td class="px-4 py-3 whitespace-nowrap">
                  <div class="text-sm font-semibold text-slate-900">#{{ checkIn.ticketNumber }}</div>
                </td>
                <td class="px-4 py-3 whitespace-nowrap">
                  <Badge variant="outline" class="text-xs">
                    {{ getTypeLabel(checkIn.type) }}
                  </Badge>
                </td>
                <td class="px-4 py-3 whitespace-nowrap">
                  <div class="text-sm text-slate-900">{{ checkIn.date }}</div>
                </td>
                <td class="px-4 py-3 whitespace-nowrap">
                  <div class="text-sm font-semibold text-slate-900">{{ formatCurrency(checkIn.total) }}</div>
                </td>
                <td class="px-4 py-3">
                  <div class="text-sm text-slate-900">{{ checkIn.name || "—" }}</div>
                </td>
                <td class="px-4 py-3">
                  <div class="text-sm text-slate-900">{{ checkIn.vehicle || "—" }}</div>
                </td>
                <td class="px-4 py-3 whitespace-nowrap">
                  <div class="text-sm text-slate-900">{{ checkIn.salesrep || "—" }}</div>
                </td>
                <td class="px-4 py-3 whitespace-nowrap">
                  <div class="text-sm text-slate-900">{{ checkIn.technician || "—" }}</div>
                </td>
                <td class="px-4 py-3 whitespace-nowrap">
                  <Badge
                    :class="cn(
                      'text-xs font-semibold',
                      getVehicleStatusColor(checkIn.vehicleStatus || 'Not Started')
                    )"
                  >
                    {{ checkIn.vehicleStatus || 'Not Started' }}
                  </Badge>
                </td>
                <td class="px-4 py-3 whitespace-nowrap">
                  <div class="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      @click="handleView(checkIn)"
                      class="h-9"
                    >
                      <PhEye :size="14" weight="regular" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      @click="handleChat(checkIn)"
                      class="h-9"
                    >
                      <PhChatCircle :size="14" weight="regular" />
                    </Button>
                    <Button
                      size="sm"
                      :variant="getInspectionButtonProps(checkIn.inspectionStatus).variant"
                      @click="handleInspection(checkIn)"
                      :class="cn(
                        'h-9',
                        getInspectionButtonProps(checkIn.inspectionStatus).className
                      )"
                    >
                      <PhClipboardText :size="14" weight="regular" />
                    </Button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, computed } from 'vue'
import Button from '@/components/ui/Button.vue'
import TicketCard from '@/components/TicketCard.vue'
import Badge from '@/components/ui/Badge.vue'
import { PhPlus, PhSquaresFour, PhTable, PhEye, PhChatCircle, PhClipboardText, PhCaretUp, PhCaretDown, PhMagnifyingGlass } from '@phosphor-icons/vue'
import { cn } from '@/lib/utils'
import { positionDateRangePopover } from '@/lib/popover-position'
import type { Ticket } from '@/types/ticket'
import { fetchCheckIns, type CheckInFilters } from '@/api/checkins'
import { navigateToDVIEditor } from '@/lib/project-navigation'
import { useSessionCookie } from '@/composables/useSessionCookie'
import { VIEW_BUTTON_SOLID_VIEWED_CLASS } from '@/composables/useViewButtonState'

const checkIns = ref<Ticket[]>([])
const loading = ref(true)
const viewMode = ref<'card' | 'table'>('table')
const sortColumn = ref<string | null>(null)
const sortDirection = ref<'asc' | 'desc'>('asc')

// Search trigger - increments when search button is clicked to trigger API refetch
const searchTrigger = ref(0)
const filters = ref<CheckInFilters>({
  dateRange: "Today",
  status: "All Statuses",
})

// Cookie management for date selection
const { setCookie, getCookie, deleteCookie } = useSessionCookie()
const COOKIE_DATE_RANGE = 'checkins_date_range'
const COOKIE_CUSTOM_FROM = 'checkins_custom_from_date'
const COOKIE_CUSTOM_TO = 'checkins_custom_to_date'

// Custom date range popover state
const showCustomDatePopover = ref(false)
const dateRangeRef = ref<HTMLElement | null>(null)
const customDatePopoverRef = ref<HTMLElement | null>(null)
const customDatePopoverPosition = ref({ top: 0, left: 0 })
const customFromDateInput = ref('')
const customToDateInput = ref('')

const loadCheckIns = async () => {
  loading.value = true
  try {
    const data = await fetchCheckIns(filters.value)
    checkIns.value = data
  } catch (error) {
    console.error("Error fetching check-in:", error)
  } finally {
    loading.value = false
  }
}

// Watch searchTrigger to reload check-ins when search button is clicked
watch(searchTrigger, () => {
  loadCheckIns()
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

const handleFilterChange = (key: keyof typeof filters.value, value: any) => {
  filters.value = { ...filters.value, [key]: value }
}

const handleDateRangeChange = (value: string) => {
  if (value === 'Custom Date Range') {
    showCustomDatePopover.value = true
    if (filters.value.customFromDate) {
      const fromParts = filters.value.customFromDate.split('/')
      if (fromParts.length === 3) {
        customFromDateInput.value = `${fromParts[2]}-${fromParts[0].padStart(2, '0')}-${fromParts[1].padStart(2, '0')}`
      }
    } else {
      const today = new Date()
      customFromDateInput.value = today.toISOString().split('T')[0]
    }
    
    if (filters.value.customToDate) {
      const toParts = filters.value.customToDate.split('/')
      if (toParts.length === 3) {
        customToDateInput.value = `${toParts[2]}-${toParts[0].padStart(2, '0')}-${toParts[1].padStart(2, '0')}`
      }
    } else {
      const today = new Date()
      customToDateInput.value = today.toISOString().split('T')[0]
    }
    updateCustomDatePopoverPosition()
  } else {
    filters.value = {
      ...filters.value,
      dateRange: value,
      customFromDate: undefined,
      customToDate: undefined,
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
    filters.value.dateRange = 'This Year'
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

const handleView = (ticket: Ticket) => {
  console.log("View check-in:", ticket)
}

const handleChat = (ticket: Ticket) => {
  console.log("Chat with check-in:", ticket)
}

const handleEditStatus = (ticket: Ticket) => {
  console.log("Edit status for check-in:", ticket)
}

const handleInspection = (ticket: Ticket) => {
  navigateToDVIEditor(
    {
      inspectionId: ticket.inspectionId,
      ticketNumber: ticket.ticketNumber,
    },
    true
  )
}

const handleUpdate = async (
  ticketId: number,
  updates: { technician?: string; vehicleStatus?: string; inspectionId?: string }
) => {
  // Update local state immediately for responsive UI
  checkIns.value = checkIns.value.map((t) =>
    t.id === ticketId
      ? {
          ...t,
          ...(updates.technician !== undefined && {
            technician: updates.technician,
          }),
          ...(updates.vehicleStatus !== undefined && {
            vehicleStatus: updates.vehicleStatus as Ticket["vehicleStatus"],
          }),
          ...(updates.inspectionId !== undefined && {
            inspectionId: updates.inspectionId,
          }),
        }
      : t
  )
}

// Helper functions for table view
const getTypeLabel = (type: string) => {
  switch (type) {
    case "Q":
      return "Quote"
    case "W":
      return "Workorder"
    case "I":
      return "Invoice"
    case "B":
      return "Batch"
    default:
      return type
  }
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount)
}

const getVehicleStatusColor = (status: string) => {
  switch (status) {
    case "Not Started":
      return "bg-gray-100 text-gray-800 border-gray-200"
    case "Online Appointment":
      return "bg-blue-50 text-blue-700 border-blue-200"
    case "Not Here Yet":
      return "bg-slate-200 text-slate-700 border-slate-300"
    case "Check In":
      return "bg-blue-300 text-blue-800 border-blue-400"
    case "On Lot":
      return "bg-blue-700 text-blue-100 border-blue-800"
    case "In Shop":
      return "bg-indigo-100 text-indigo-800 border-indigo-200"
    case "Inspection Complete":
      return "bg-teal-100 text-teal-800 border-teal-200"
    case "Awaiting Callback":
      return "bg-amber-100 text-amber-800 border-amber-200"
    case "Awaiting Parts":
      return "bg-orange-100 text-orange-800 border-orange-200"
    case "Out For Sublet":
      return "bg-purple-100 text-purple-800 border-purple-200"
    case "Ready":
      return "bg-green-100 text-green-800 border-green-200"
    default:
      return "bg-gray-100 text-gray-800 border-gray-200"
  }
}

const getInspectionButtonProps = (status?: string) => {
  switch (status) {
    case "complete":
      return {
        variant: "default" as const,
        className: VIEW_BUTTON_SOLID_VIEWED_CLASS,
      }
    case "incomplete":
      return {
        variant: "default" as const,
        className: "bg-yellow-500 hover:bg-yellow-600 text-white",
      }
    default:
      return {
        variant: "outline" as const,
        className: "",
      }
  }
}

// Sorting logic
const handleSort = (column: string) => {
  if (sortColumn.value === column) {
    sortDirection.value = sortDirection.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortColumn.value = column
    sortDirection.value = 'asc'
  }
}

const sortedCheckIns = computed(() => {
  if (!sortColumn.value) {
    return checkIns.value
  }

  const sorted = [...checkIns.value]
  const direction = sortDirection.value === 'asc' ? 1 : -1

  sorted.sort((a, b) => {
    switch (sortColumn.value) {
      case 'ticketNumber':
        return (a.ticketNumber - b.ticketNumber) * direction
      
      case 'type':
        return a.type.localeCompare(b.type) * direction
      
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
      
      case 'status':
        return (a.vehicleStatus || '').localeCompare(b.vehicleStatus || '') * direction
      
      default:
        return 0
    }
  })

  return sorted
})

const parseDate = (dateStr: string): Date | null => {
  if (!dateStr) return null
  const parts = dateStr.split('/')
  if (parts.length === 3) {
    return new Date(`${parts[2]}-${parts[0]}-${parts[1]}`)
  }
  return null
}
</script>
