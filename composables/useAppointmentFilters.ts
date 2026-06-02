import { computed, ref, watch } from 'vue'
import type { AppointmentFilters, AppointmentRecord } from '@/types/appointment'

const STORAGE_KEY = 'hd_appointments_filters'

const defaultFilters: AppointmentFilters = {
  search: '',
  bayIds: [],
  recordTypes: [],
  statuses: [],
  sortBy: 'date_time_asc',
}

export function useAppointmentFilters() {
  const filters = ref<AppointmentFilters>(loadFilters())

  watch(
    filters,
    () => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(filters.value))
    },
    { deep: true }
  )

  const hasActiveFilters = computed(() => {
    return Boolean(
      filters.value.search ||
        filters.value.bayIds.length ||
        filters.value.recordTypes.length ||
        filters.value.statuses.length ||
        filters.value.sortBy !== 'date_time_asc' ||
        filters.value.dateFrom ||
        filters.value.dateTo
    )
  })

  const matchesRecord = (record: AppointmentRecord): boolean => {
    const q = filters.value.search.trim().toLowerCase()
    if (q) {
      const value = `${record.customerName} ${record.bayName || ''} ${record.vehicle?.year || ''} ${
        record.vehicle?.make || ''
      } ${record.vehicle?.model || ''} ${record.requestedDate}`.toLowerCase()
      if (!value.includes(q)) {
        return false
      }
    }

    if (filters.value.bayIds.length && !filters.value.bayIds.includes(record.bayId || 'NB')) {
      return false
    }
    if (filters.value.recordTypes.length && !filters.value.recordTypes.includes(record.recordType)) {
      return false
    }
    if (filters.value.statuses.length && !filters.value.statuses.includes(record.status)) {
      return false
    }
    if (filters.value.dateFrom && record.requestedDate < filters.value.dateFrom) {
      return false
    }
    if (filters.value.dateTo && record.requestedDate > filters.value.dateTo) {
      return false
    }
    return true
  }

  const clearFilters = () => {
    filters.value = { ...defaultFilters }
  }

  return {
    filters,
    hasActiveFilters,
    matchesRecord,
    clearFilters,
  }
}

function loadFilters(): AppointmentFilters {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) {
    return { ...defaultFilters }
  }
  try {
    return { ...defaultFilters, ...(JSON.parse(raw) as AppointmentFilters) }
  } catch {
    return { ...defaultFilters }
  }
}
