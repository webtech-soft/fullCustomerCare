<template>
  <div class="w-full space-y-4">
    <!-- Customer Name -->
    <div class="rounded-lg bg-slate-50 border border-slate-200 p-3 sm:p-4">
      <p class="text-xs sm:text-sm font-semibold text-slate-700 mb-1">Customer:</p>
      <p class="text-sm sm:text-base text-slate-900 break-words">{{ customerName }}</p>
    </div>

    <!-- Vehicle Selection -->
    <div v-if="vehicleOptions.length > 0" class="space-y-2">
      <Label class="text-sm sm:text-base font-semibold text-slate-700">
        Vehicle <span class="text-slate-500 font-normal">(select the vehicle in for service)</span>
      </Label>
      <div class="space-y-2 max-h-96 overflow-y-auto scrollbar-hide">
        <label
          v-for="(vehicle, index) in vehicleOptions"
          :key="index"
          class="flex items-start gap-2 sm:gap-3 p-3 rounded-lg border-2 cursor-pointer transition-colors min-h-[44px]"
          :class="selectedVehicleIndex === index ? 'border-slate-900 bg-slate-50' : 'border-slate-200 hover:border-slate-300'"
        >
          <input
            type="radio"
            :value="index"
            v-model="selectedVehicleIndex"
            @change="showAddVehicle = false"
            class="w-5 h-5 mt-0.5 sm:mt-1 text-slate-900 focus:ring-slate-900 shrink-0"
          />
          <div class="flex-1 min-w-0">
            <div class="flex flex-wrap items-center gap-1.5 sm:gap-2 mb-1">
              <span class="text-sm sm:text-base font-semibold text-slate-900 break-words">
                {{ vehicle.year }} {{ vehicle.make }} {{ vehicle.model }}
              </span>
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-x-2 sm:gap-x-4 gap-y-1 text-xs sm:text-sm text-slate-600">
              <div v-if="vehicle.licensePlate">
                <span class="font-medium">Plate:</span> {{ vehicle.licensePlate }}
              </div>
              <div v-if="vehicle.vin">
                <span class="font-medium">VIN:</span> {{ vehicle.vin }}
              </div>
              <div v-if="vehicle.mileage">
                <span class="font-medium">Mileage:</span> {{ vehicle.mileage.toLocaleString() }}
              </div>
              <div v-if="vehicle.lastServiceDate">
                <span class="font-medium">Last Service:</span> {{ vehicle.lastServiceDate }}
              </div>
            </div>
          </div>
        </label>
        
        <!-- Add New Vehicle Option -->
        <label
          class="flex items-start gap-2 sm:gap-3 p-3 rounded-lg border-2 cursor-pointer transition-colors min-h-[44px]"
          :class="selectedVehicleIndex === 'new' ? 'border-slate-900 bg-slate-50' : 'border-slate-200 hover:border-slate-300 border-dashed'"
        >
          <input
            type="radio"
            value="new"
            v-model="selectedVehicleIndex"
            @change="showAddVehicle = true"
            class="w-5 h-5 mt-0.5 sm:mt-1 text-slate-900 focus:ring-slate-900 shrink-0"
          />
          <div class="flex-1 flex items-center gap-2">
            <PhPlus :size="16" weight="regular" class="text-slate-600 shrink-0" />
            <span class="text-sm sm:text-base font-medium text-slate-900">Add New Vehicle</span>
          </div>
        </label>
        
        <!-- New Vehicle Input -->
        <div v-if="showAddVehicle" class="p-3 sm:p-4 rounded-lg border-2 border-slate-300 bg-slate-50 space-y-3 sm:space-y-4">
          <div class="flex items-center justify-between mb-2">
            <Label class="text-sm font-semibold text-slate-700">New Vehicle Information</Label>
            <button
              @click="showAddVehicle = false; selectedVehicleIndex = 0; resetNewVehicle()"
              class="p-1 hover:bg-slate-200 rounded transition-colors"
              type="button"
            >
              <PhX :size="16" weight="regular" class="text-slate-600" />
            </button>
          </div>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div class="space-y-2">
              <Label class="text-sm font-semibold text-slate-700">License Plate</Label>
              <Input
                v-model="newVehicle.licensePlate"
                placeholder="ABC123"
                class="h-11 text-base"
              />
            </div>
            <div class="space-y-2">
              <Label class="text-sm font-semibold text-slate-700">State</Label>
              <Input
                v-model="newVehicle.state"
                placeholder="CA"
                class="h-11 text-base"
                maxlength="2"
              />
            </div>
            <div class="space-y-2">
              <Label class="text-sm font-semibold text-slate-700">Year</Label>
              <Input
                v-model="newVehicle.year"
                placeholder="2024"
                class="h-11 text-base"
                :class="newVehicleErrors.year ? 'border-red-500' : ''"
                @blur="validateNewVehicleYear"
                maxlength="4"
              />
              <p v-if="newVehicleErrors.year" class="text-xs text-red-600">{{ newVehicleErrors.year }}</p>
            </div>
            <div class="space-y-2">
              <Label class="text-sm font-semibold text-slate-700">Make</Label>
              <Input
                v-model="newVehicle.make"
                placeholder="Ford"
                class="h-11 text-base"
              />
            </div>
            <div class="space-y-2">
              <Label class="text-sm font-semibold text-slate-700">Model</Label>
              <Input
                v-model="newVehicle.model"
                placeholder="F-150"
                class="h-11 text-base"
              />
            </div>
            <div class="space-y-2">
              <Label class="text-sm font-semibold text-slate-700">VIN</Label>
              <Input
                v-model="newVehicle.vin"
                placeholder="1FTFW1ET5DFC12345"
                class="h-11 text-base"
                :class="newVehicleErrors.vin ? 'border-red-500' : ''"
                @blur="validateNewVehicleVin"
                maxlength="17"
              />
              <p v-if="newVehicleErrors.vin" class="text-xs text-red-600">{{ newVehicleErrors.vin }}</p>
            </div>
            <div class="space-y-2">
              <Label class="text-sm font-semibold text-slate-700">Mileage</Label>
              <Input
                v-model="newVehicle.mileage"
                placeholder="50000"
                class="h-11 text-base"
                :class="newVehicleErrors.mileage ? 'border-red-500' : ''"
                @blur="validateNewVehicleMileage"
              />
              <p v-if="newVehicleErrors.mileage" class="text-xs text-red-600">{{ newVehicleErrors.mileage }}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { PhPlus, PhX } from '@phosphor-icons/vue'
import Label from './ui/Label.vue'
import Input from './ui/Input.vue'
import { validatePhone, formatPhoneNumber, validateEmail } from '@/lib/validation'

interface Props {
  customerRecord: any
}

const props = defineProps<Props>()

const emit = defineEmits<{
  selected: [data: any]
}>()

const customer = props.customerRecord || {}
const customerName = customer.Name || customer.name || ''

// Extract all phone numbers
const phoneOptions = computed(() => {
  const contacts = customer.Contacts || customer.contacts || []
  return contacts
    .filter((c: any) => c.Type === 'PHONE' || c.type === 'PHONE')
    .map((c: any) => ({
      value: c.Value || c.value || '',
      priority: c.Priority || c.priority || '',
      lastUsed: c.LastUsed || c.lastUsed || '',
    }))
    .filter((p: any) => p.value)
})

// Extract all email addresses
const emailOptions = computed(() => {
  const contacts = customer.Contacts || customer.contacts || []
  return contacts
    .filter((c: any) => c.Type === 'EMAIL' || c.type === 'EMAIL')
    .map((c: any) => ({
      value: c.Value || c.value || '',
      priority: c.Priority || c.priority || '',
      lastUsed: c.LastUsed || c.lastUsed || '',
    }))
    .filter((e: any) => e.value)
})

// Extract all vehicles
const vehicleOptions = computed(() => {
  const vehicles = customer.Vehicles || customer.vehicles || []
  return vehicles.map((v: any) => ({
    licensePlate: v.Tag || v.tag || '',
    state: v.State || v.state || '',
    year: v.Year || v.year || '',
    make: v.Make || v.make || '',
    model: v.Model || v.model || '',
    vin: v.VIN || v.vin || '',
    mileage: v.Mileage || v.mileage || 0,
    lastServiceDate: v.LastServiceDate || v.lastServiceDate || '',
    lastServiceMileage: v.LastServiceMileage || v.lastServiceMileage || 0,
  }))
})

// Selected values
const selectedVehicleIndex = ref<number | 'new'>(0)

// "Add New" states
const showAddVehicle = ref(false)

// New values
const newPhone = ref('')
const newPhoneError = ref('')
const newEmail = ref('')
const newEmailError = ref('')
const newVehicle = ref({
  licensePlate: '',
  state: '',
  year: '',
  make: '',
  model: '',
  vin: '',
  mileage: '',
})
const newVehicleErrors = ref({
  year: '',
  mileage: '',
  vin: '',
})

// Validation functions
const handleNewPhoneInput = (value: string) => {
  const formatted = formatPhoneNumber(value)
  newPhone.value = formatted
  
  const digitsOnly = formatted.replace(/\D/g, '')
  if (digitsOnly.length > 0 && digitsOnly.length !== 10) {
    validateNewPhone()
  } else if (digitsOnly.length === 10) {
    newPhoneError.value = ''
  }
}

const validateNewPhone = () => {
  const result = validatePhone(newPhone.value, false)
  newPhoneError.value = result.error || ''
}

const validateNewEmail = () => {
  const result = validateEmail(newEmail.value)
  newEmailError.value = result.error || ''
}

const validateNewVehicleYear = () => {
  if (!newVehicle.value.year) {
    newVehicleErrors.value.year = ''
    return
  }
  const yearRegex = /^\d{4}$/
  const yearNum = parseInt(newVehicle.value.year)
  if (!yearRegex.test(newVehicle.value.year)) {
    newVehicleErrors.value.year = 'Year must be 4 digits'
  } else if (yearNum < 1900 || yearNum > new Date().getFullYear() + 1) {
    newVehicleErrors.value.year = `Year must be between 1900 and ${new Date().getFullYear() + 1}`
  } else {
    newVehicleErrors.value.year = ''
  }
}

const validateNewVehicleMileage = () => {
  if (!newVehicle.value.mileage) {
    newVehicleErrors.value.mileage = ''
    return
  }
  const mileageNum = parseFloat(newVehicle.value.mileage.replace(/[^0-9.]/g, ''))
  if (isNaN(mileageNum) || mileageNum < 0) {
    newVehicleErrors.value.mileage = 'Mileage must be a positive number'
  } else if (mileageNum > 10000000) {
    newVehicleErrors.value.mileage = 'Mileage is too high'
  } else {
    newVehicleErrors.value.mileage = ''
  }
}

const validateNewVehicleVin = () => {
  if (!newVehicle.value.vin) {
    newVehicleErrors.value.vin = ''
    return
  }
  const vinUpper = newVehicle.value.vin.toUpperCase()
  if (vinUpper.length !== 17) {
    newVehicleErrors.value.vin = 'VIN must be 17 characters'
  } else if (!/^[A-HJ-NPR-Z0-9]{17}$/.test(vinUpper)) {
    newVehicleErrors.value.vin = 'VIN contains invalid characters'
  } else {
    newVehicleErrors.value.vin = ''
  }
}

const resetNewVehicle = () => {
  newVehicle.value = {
    licensePlate: '',
    state: '',
    year: '',
    make: '',
    model: '',
    vin: '',
    mileage: '',
  }
  newVehicleErrors.value = {
    year: '',
    mileage: '',
    vin: '',
  }
}

// Set defaults on mount
onMounted(() => {
  // Default to first vehicle
  if (vehicleOptions.value.length > 0) {
    selectedVehicleIndex.value = 0
  }
})

const handleContinue = () => {
  // Validate new vehicle if being added
  if (selectedVehicleIndex.value === 'new') {
    validateNewVehicleYear()
    validateNewVehicleMileage()
    validateNewVehicleVin()
    if (newVehicleErrors.value.year || newVehicleErrors.value.mileage || newVehicleErrors.value.vin) {
      return
    }
  }
  
  // Automatically use primary phone, or first phone
  let phone = ''
  if (phoneOptions.value.length > 0) {
    const primary = phoneOptions.value.find((p: any) => p.priority === 'Primary')
    phone = primary ? primary.value : phoneOptions.value[0]?.value || ''
  }
  
  // Automatically use primary email, or first email
  let email = ''
  if (emailOptions.value.length > 0) {
    const primary = emailOptions.value.find((e: any) => e.priority === 'Primary')
    email = primary ? primary.value : emailOptions.value[0]?.value || ''
  }
  
  // Get selected vehicle (new or existing)
  let vehicle
  if (selectedVehicleIndex.value === 'new') {
    vehicle = {
      licensePlate: newVehicle.value.licensePlate || '',
      state: newVehicle.value.state || '',
      year: newVehicle.value.year || '',
      make: newVehicle.value.make || '',
      model: newVehicle.value.model || '',
      vin: newVehicle.value.vin || '',
      mileage: newVehicle.value.mileage || '',
    }
  } else if (vehicleOptions.value.length > 0) {
    const vehicleIndex = typeof selectedVehicleIndex.value === 'number' ? selectedVehicleIndex.value : 0
    const selectedVehicle = vehicleOptions.value[vehicleIndex] || {}
    vehicle = {
      licensePlate: selectedVehicle.licensePlate || '',
      state: selectedVehicle.state || '',
      year: selectedVehicle.year ? String(selectedVehicle.year) : '',
      make: selectedVehicle.make || '',
      model: selectedVehicle.model || '',
      vin: selectedVehicle.vin || '',
      mileage: selectedVehicle.mileage ? String(selectedVehicle.mileage) : '',
    }
  } else {
    vehicle = {
      licensePlate: '',
      state: '',
      year: '',
      make: '',
      model: '',
      vin: '',
      mileage: '',
    }
  }
  
  const customerData = {
    name: customerName,
    phone,
    email,
    address: {
      street: customer.Address1 || customer.address1 || '',
      apt: customer.Address2 || customer.address2 || '',
      city: customer.City || customer.city || '',
      state: '',
      zip: customer.Zip || customer.zip || '',
    },
    vehicle,
    // Preserve original customer record for API calls
    _customerRecord: customer,
  }
  
  emit('selected', customerData)
}

// Expose handleContinue for parent component
defineExpose({
  handleContinue
})
</script>
