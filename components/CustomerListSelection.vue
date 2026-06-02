<template>
  <div class="w-full space-y-4">
    <div class="rounded-lg bg-slate-50 border border-slate-200 p-3 sm:p-4 mb-2 sm:mb-3">
      <p class="text-[10px] sm:text-xs md:text-sm text-slate-700 leading-tight">
        We found {{ filteredCustomers.length }} account{{ filteredCustomers.length > 1 ? 's' : '' }} matching your search. Please select the correct one.
      </p>
    </div>

    <div class="max-h-[60vh] overflow-y-auto pr-2 space-y-1.5 sm:space-y-2">
      <label
        v-for="(customer, index) in filteredCustomers"
        :key="customer.CustomerNum || index"
        class="flex items-start gap-2 sm:gap-3 p-2 sm:p-3 md:p-4 rounded-lg border-2 cursor-pointer transition-colors min-h-[44px]"
        :class="selectedIndex === index ? 'border-slate-900 bg-slate-50' : 'border-slate-200 hover:border-slate-300'"
      >
        <input
          type="radio"
          :value="index"
          v-model="selectedIndex"
          class="w-5 h-5 mt-0.5 sm:mt-1 text-slate-900 focus:ring-slate-900 shrink-0"
        />
        <div class="flex-1 min-w-0">
          <div class="flex flex-wrap items-center gap-1 sm:gap-1.5 md:gap-2 mb-1 sm:mb-1.5 md:mb-2">
            <span class="text-sm sm:text-base md:text-lg font-semibold text-slate-900 break-words">
              {{ customer.Name || customer.name || 'Unknown Customer' }}
            </span>
            <span v-if="customer.CustomerNum" class="text-xs px-1 sm:px-1.5 md:px-2 py-0.5 rounded bg-slate-200 text-slate-700 shrink-0">
              #{{ customer.CustomerNum }}
            </span>
          </div>
          
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-x-1.5 sm:gap-x-2 md:gap-x-4 gap-y-0.5 sm:gap-y-1 text-xs sm:text-sm text-slate-600">
            <div v-if="customer.Address1 || customer.address1" class="break-words">
              <span class="font-medium">Address:</span> <span class="break-all">{{ customer.Address1 || customer.address1 }}</span>
            </div>
            <div v-if="customer.City || customer.city" class="break-words">
              <span class="font-medium">City:</span> {{ customer.City || customer.city }}
            </div>
            <div v-if="customer.Zip || customer.zip" class="break-words">
              <span class="font-medium">Zip:</span> {{ customer.Zip || customer.zip }}
            </div>
            <div v-if="customer.StoreNum !== undefined" class="break-words">
              <span class="font-medium">Store:</span> {{ customer.StoreNum }}
            </div>
            <div v-if="getPrimaryPhone(customer)" class="break-words">
              <span class="font-medium">Phone:</span> <span class="break-all">{{ getPrimaryPhone(customer) }}</span>
            </div>
            <div v-if="getPrimaryEmail(customer)" class="break-words">
              <span class="font-medium">Email:</span> <span class="break-all">{{ getPrimaryEmail(customer) }}</span>
            </div>
            <div v-if="customer.CustomerSince || customer.customerSince" class="break-words">
              <span class="font-medium">Customer Since:</span> {{ customer.CustomerSince || customer.customerSince }}
            </div>
            <div v-if="getVehicleCount(customer) > 0" class="break-words">
              <span class="font-medium">Vehicles:</span> {{ getVehicleCount(customer) }}
            </div>
          </div>
        </div>
      </label>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'

interface Props {
  customers: any[]
}

const props = defineProps<Props>()

const emit = defineEmits<{
  selected: [customer: any]
  selectionChanged: [customer: any | null]
}>()

const selectedIndex = ref(0)

// Filter out CASH CUSTOMER from the list
const filteredCustomers = computed(() => {
  return props.customers.filter((customer: any) => {
    const name = customer.Name || customer.name || ''
    return name.toUpperCase() !== 'CASH CUSTOMER'
  })
})

// Emit selection change whenever selectedIndex changes
watch(selectedIndex, (newIndex) => {
  if (newIndex >= 0 && newIndex < filteredCustomers.value.length && filteredCustomers.value.length > 0) {
    emit('selectionChanged', filteredCustomers.value[newIndex])
  } else if (filteredCustomers.value.length === 0) {
    emit('selectionChanged', null)
  }
}, { immediate: true })

// Also watch filteredCustomers to update selection when list changes
watch(filteredCustomers, (newList) => {
  if (newList.length > 0) {
    // Reset to first customer if current selection is out of bounds
    if (selectedIndex.value >= newList.length) {
      selectedIndex.value = 0
    } else if (selectedIndex.value >= 0 && selectedIndex.value < newList.length) {
      // Emit the currently selected customer
      emit('selectionChanged', newList[selectedIndex.value])
    }
  } else {
    selectedIndex.value = 0
    emit('selectionChanged', null)
  }
}, { immediate: true })

const getPrimaryPhone = (customer: any): string => {
  const contacts = customer.Contacts || customer.contacts || []
  const phoneContact = contacts.find((c: any) => 
    (c.Type === 'PHONE' || c.type === 'PHONE') && 
    (c.Priority === 'Primary' || c.priority === 'Primary')
  ) || contacts.find((c: any) => c.Type === 'PHONE' || c.type === 'PHONE')
  return phoneContact?.Value || phoneContact?.value || ''
}

const getPrimaryEmail = (customer: any): string => {
  const contacts = customer.Contacts || customer.contacts || []
  const emailContact = contacts.find((c: any) => 
    (c.Type === 'EMAIL' || c.type === 'EMAIL') && 
    (c.Priority === 'Primary' || c.priority === 'Primary')
  ) || contacts.find((c: any) => c.Type === 'EMAIL' || c.type === 'EMAIL')
  return emailContact?.Value || emailContact?.value || ''
}

const getVehicleCount = (customer: any): number => {
  const vehicles = customer.Vehicles || customer.vehicles || []
  return vehicles.length
}

const handleContinue = () => {
  if (selectedIndex.value >= 0 && selectedIndex.value < filteredCustomers.value.length) {
    emit('selected', filteredCustomers.value[selectedIndex.value])
  }
}

// Get the currently selected customer
const getSelectedCustomer = () => {
  if (selectedIndex.value >= 0 && selectedIndex.value < filteredCustomers.value.length) {
    return filteredCustomers.value[selectedIndex.value]
  }
  return null
}

// Expose handleContinue and getSelectedCustomer for parent component
defineExpose({
  handleContinue,
  getSelectedCustomer
})
</script>
