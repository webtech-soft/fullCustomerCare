<template>
  <div class="w-full">
    <!-- Calendar Header -->
    <div class="flex items-center justify-between mb-4">
      <button
        @click="previousMonth"
        class="p-2 hover:bg-slate-100 rounded-md transition-colors"
        type="button"
      >
        <PhCaretLeft :size="16" weight="regular" class="text-slate-700" />
      </button>
      
      <button
        @click="showMonthYearPicker = !showMonthYearPicker"
        class="px-3 py-1.5 text-sm font-medium text-slate-900 hover:bg-slate-100 rounded-md transition-colors flex items-center gap-1"
        type="button"
      >
        {{ monthYearLabel }}
        <PhCaretDown :size="14" weight="regular" class="text-slate-600" />
      </button>
      
      <button
        @click="nextMonth"
        class="p-2 hover:bg-slate-100 rounded-md transition-colors"
        type="button"
      >
        <PhCaretRight :size="16" weight="regular" class="text-slate-700" />
      </button>
    </div>

    <!-- Month/Year Picker -->
    <div v-if="showMonthYearPicker" class="mb-4 p-3 bg-slate-50 rounded-md">
      <div class="grid grid-cols-2 gap-3">
        <div>
          <label class="block text-xs font-medium text-slate-600 mb-1">Month</label>
          <select
            v-model="selectedMonth"
            @change="updateDate"
            class="w-full h-9 rounded-md border border-input bg-background px-2 py-1 text-sm"
          >
            <option v-for="(month, index) in months" :key="index" :value="index">
              {{ month }}
            </option>
          </select>
        </div>
        <div>
          <label class="block text-xs font-medium text-slate-600 mb-1">Year</label>
          <select
            v-model="selectedYear"
            @change="updateDate"
            class="w-full h-9 rounded-md border border-input bg-background px-2 py-1 text-sm"
          >
            <option v-for="year in availableYears" :key="year" :value="year">
              {{ year }}
            </option>
          </select>
        </div>
      </div>
    </div>

    <!-- Days of Week Header -->
    <div class="grid grid-cols-7 gap-1 mb-2">
      <div
        v-for="day in daysOfWeek"
        :key="day"
        class="text-center text-xs font-medium text-slate-600 py-2"
      >
        {{ day }}
      </div>
    </div>

    <!-- Calendar Grid -->
    <div class="grid grid-cols-7 gap-1">
      <button
        v-for="(date, index) in calendarDays"
        :key="index"
        @click.stop="selectDate(date)"
        :disabled="date.isPast"
        :class="[
          'h-9 w-full rounded-md text-sm font-medium transition-colors',
          date.isPast
            ? 'text-slate-300 cursor-not-allowed opacity-50'
            : date.isCurrentMonth
            ? date.isSelected
              ? 'bg-slate-900 text-white'
              : date.isToday
              ? 'bg-slate-100 text-slate-900 font-semibold'
              : 'text-slate-900 hover:bg-slate-100'
            : 'text-slate-400 hover:bg-slate-50',
          date.isSelected && !date.isPast && 'ring-2 ring-slate-900 ring-offset-1'
        ]"
        type="button"
      >
        {{ date.day }}
      </button>
    </div>

    <!-- Clear Button -->
    <div class="mt-4 flex justify-start">
      <button
        @click="clearDate"
        class="px-3 py-1.5 text-sm text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-colors"
        type="button"
      >
        Clear
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { PhCaretLeft, PhCaretRight, PhCaretDown } from '@phosphor-icons/vue'

interface Props {
  modelValue?: string // ISO date string (YYYY-MM-DD) - active date
  minDate?: string // ISO date string (YYYY-MM-DD)
  selectedDates?: string[] // Array of selected dates for multi-select
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: '',
  minDate: '',
  selectedDates: () => [],
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
  'toggle-date': [date: string] // Emitted when a date is clicked for multi-select
}>()

const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const months = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
]

const currentDate = ref(new Date())
const showMonthYearPicker = ref(false)
const selectedMonth = ref(new Date().getMonth())
const selectedYear = ref(new Date().getFullYear())

// Available years (current year ± 10 years)
const availableYears = computed(() => {
  const currentYear = new Date().getFullYear()
  const years = []
  for (let i = currentYear - 10; i <= currentYear + 10; i++) {
    years.push(i)
  }
  return years
})

// Update currentDate when month/year changes
const updateDate = () => {
  currentDate.value = new Date(selectedYear.value, selectedMonth.value, 1)
  showMonthYearPicker.value = false
}

// Initialize from modelValue
watch(() => props.modelValue, (newValue) => {
  if (newValue) {
    const date = new Date(newValue)
    if (!isNaN(date.getTime())) {
      currentDate.value = date
      selectedMonth.value = date.getMonth()
      selectedYear.value = date.getFullYear()
    }
  }
}, { immediate: true })

// Update selectedMonth and selectedYear when currentDate changes
watch(() => currentDate.value, (newDate) => {
  selectedMonth.value = newDate.getMonth()
  selectedYear.value = newDate.getFullYear()
})

const monthYearLabel = computed(() => {
  return `${months[currentDate.value.getMonth()]} ${currentDate.value.getFullYear()}`
})

const calendarDays = computed(() => {
  const year = currentDate.value.getFullYear()
  const month = currentDate.value.getMonth()
  
  // First day of the month
  const firstDay = new Date(year, month, 1)
  const firstDayOfWeek = firstDay.getDay()
  
  // Last day of the month
  const lastDay = new Date(year, month + 1, 0)
  const daysInMonth = lastDay.getDate()
  
  // Previous month's trailing days
  const prevMonth = new Date(year, month, 0)
  const daysInPrevMonth = prevMonth.getDate()
  
  const days: Array<{
    day: number
    date: Date
    isCurrentMonth: boolean
    isSelected: boolean
    isToday: boolean
    isPast: boolean
  }> = []
  
  // Initialize today for date comparisons (must be before loops that use it)
  const today = new Date()
  today.setHours(0, 0, 0, 0) // Reset to start of day for accurate comparison
  
  // Add previous month's trailing days
  for (let i = firstDayOfWeek - 1; i >= 0; i--) {
    const day = daysInPrevMonth - i
    const date = new Date(year, month - 1, day)
    date.setHours(0, 0, 0, 0)
    const isPast = date < today
    days.push({
      day,
      date,
      isCurrentMonth: false,
      isSelected: false,
      isToday: false,
      isPast,
    })
  }
  
  // Add current month's days
  
  // Parse selectedDate (active date) as local date to avoid timezone issues
  let selectedDate: Date | null = null
  if (props.modelValue) {
    const [y, m, d] = props.modelValue.split('-').map(Number)
    selectedDate = new Date(y, m - 1, d)
  }
  
  // Create a Set of selected dates for quick lookup
  const selectedDatesSet = new Set(props.selectedDates || [])
  
  // Get minDate for comparison
  let minDateObj: Date | null = null
  if (props.minDate) {
    const [y, m, d] = props.minDate.split('-').map(Number)
    minDateObj = new Date(y, m - 1, d)
    minDateObj.setHours(0, 0, 0, 0)
  }
  
  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month, day)
    date.setHours(0, 0, 0, 0) // Reset to start of day for accurate comparison
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    const isToday = date.toDateString() === today.toDateString()
    const isActive = selectedDate && date.toDateString() === selectedDate.toDateString()
    const isSelected = selectedDatesSet.has(dateStr)
    const isPast = date < today && !isToday
    
    days.push({
      day,
      date,
      isCurrentMonth: true,
      isSelected: isActive || isSelected, // Show as selected if active or in selectedDates
      isToday,
      isPast,
    })
  }
  
  // Add next month's leading days to fill the grid (6 rows = 42 days)
  const remainingDays = 42 - days.length
  for (let day = 1; day <= remainingDays; day++) {
    const date = new Date(year, month + 1, day)
    date.setHours(0, 0, 0, 0)
    const isPast = date < today
    days.push({
      day,
      date,
      isCurrentMonth: false,
      isSelected: false,
      isToday: false,
      isPast,
    })
  }
  
  return days
})

const selectDate = (dateInfo: { date: Date; isCurrentMonth: boolean; isPast: boolean }) => {
  // Don't allow selecting past dates
  if (dateInfo.isPast) {
    return
  }
  
  // Format date as YYYY-MM-DD using local date components to avoid timezone issues
  const year = dateInfo.date.getFullYear()
  const month = String(dateInfo.date.getMonth() + 1).padStart(2, '0')
  const day = String(dateInfo.date.getDate()).padStart(2, '0')
  const selectedDateStr = `${year}-${month}-${day}`
  
  // Check minDate constraint
  if (props.minDate && selectedDateStr < props.minDate) {
    return
  }
  
  // If clicking on a date from another month, navigate to that month first
  if (!dateInfo.isCurrentMonth) {
    currentDate.value = new Date(dateInfo.date.getFullYear(), dateInfo.date.getMonth(), 1)
  }
  
  // If selectedDates prop is provided (even if empty), we're in multi-select mode
  // Otherwise, single select mode
  if (props.selectedDates !== undefined) {
    // Multi-select mode: emit toggle-date and set as active date
    emit('toggle-date', selectedDateStr)
    emit('update:modelValue', selectedDateStr)
  } else {
    // Single select mode: just emit update:modelValue
    emit('update:modelValue', selectedDateStr)
  }
}

const previousMonth = () => {
  currentDate.value = new Date(currentDate.value.getFullYear(), currentDate.value.getMonth() - 1, 1)
}

const nextMonth = () => {
  currentDate.value = new Date(currentDate.value.getFullYear(), currentDate.value.getMonth() + 1, 1)
}

const clearDate = () => {
  emit('update:modelValue', '')
}
</script>
