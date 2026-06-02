<template>
  <div class="w-full space-y-6">
    <form @submit.prevent="handleFind" class="space-y-6">
      <!-- Search Method -->
      <div class="space-y-2">
        <Label class="text-base font-semibold text-slate-700">
          Search Method
        </Label>
        
        <!-- Toggle for Phone/Email -->
        <div class="flex gap-2">
          <button
            type="button"
            @click="handleToggleSearchMethod('phone')"
            :class="[
              'flex-1 min-h-[44px] px-4 py-2 rounded-md text-sm font-medium transition-colors',
              searchMethod === 'phone'
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            ]"
          >
            Phone Number
          </button>
          <button
            type="button"
            @click="handleToggleSearchMethod('email')"
            :class="[
              'flex-1 min-h-[44px] px-4 py-2 rounded-md text-sm font-medium transition-colors',
              searchMethod === 'email'
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            ]"
          >
            Email
          </button>
        </div>
      </div>

      <!-- Dynamic Input Fields -->
      <div class="space-y-4">
        <!-- Phone Number Only -->
        <div v-if="searchMethod === 'phone'" class="space-y-2">
          <Label for="phone" class="text-base font-semibold text-slate-700">
            Phone Number
          </Label>
          <Input
            ref="phoneInputRef"
            id="phone"
            :model-value="phone"
            @update:model-value="handlePhoneInput"
            type="tel"
            placeholder="(555) 123-4567"
            class="h-11 text-base"
            @blur="validatePhoneField"
            :class="phoneError ? 'border-red-500' : ''"
          />
          <p v-if="phoneError" class="text-sm text-red-600">
            {{ phoneError }}
          </p>
        </div>

        <!-- Email Only -->
        <div v-if="searchMethod === 'email'" class="space-y-2">
          <Label for="email" class="text-base font-semibold text-slate-700">
            Email Address
          </Label>
          <Input
            ref="emailInputRef"
            id="email"
            v-model="email"
            type="email"
            placeholder="email@example.com"
            class="h-11 text-base"
            @blur="validateEmailField"
            :class="emailError ? 'border-red-500' : ''"
          />
          <p v-if="emailError" class="text-sm text-red-600">
            {{ emailError }}
          </p>
        </div>
      </div>

      <!-- Error Message -->
      <div v-if="errorMessage" class="rounded-lg bg-red-50 border border-red-200 p-4 space-y-3">
        <p class="text-sm text-red-600">
          {{ errorMessage }}
        </p>
        <!-- Show action buttons only for "not found" errors, not validation errors -->
        <div v-if="showCreateNewAccountButton" class="flex flex-col sm:flex-row gap-2">
          <Button
            type="button"
            variant="outline"
            size="default"
            class="w-full sm:w-auto"
            @click="handleTryAgain"
          >
            Try Again
          </Button>
          <Button
            type="button"
            variant="default"
            size="default"
            class="w-full sm:w-auto"
            @click="handleCreateNewAccount"
          >
            Create New Account
          </Button>
        </div>
      </div>

      <!-- Find Button -->
      <div class="flex justify-end pt-2">
        <Button
          type="submit"
          variant="default"
          size="lg"
          class="min-w-[120px] h-12 text-base font-semibold"
          :disabled="isLoading"
          @click.prevent="handleFind"
        >
          <PhMagnifyingGlass v-if="!isLoading" :size="20" weight="regular" class="mr-2" />
          <span v-if="isLoading" class="w-5 h-5 mr-2 border-2 border-white border-t-transparent rounded-full animate-spin inline-block" />
          {{ isLoading ? 'SEARCHING...' : 'FIND' }}
        </Button>
      </div>
    </form>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, computed, nextTick } from 'vue'
import { PhMagnifyingGlass } from '@phosphor-icons/vue'
import Button from './ui/Button.vue'
import Input from './ui/Input.vue'
import Label from './ui/Label.vue'
import { formatPhoneNumber, validateEmail } from '@/lib/validation'
import { customerVehicleLookup, mapCustomerDataToForm, needsSelection } from '@/lib/customer-api'

interface Props {
  initialSearchState?: {
    searchMethod?: string
    phone?: string
    email?: string
  }
}

const props = withDefaults(defineProps<Props>(), {
  initialSearchState: () => ({
    searchMethod: 'phone',
    phone: '',
    email: '',
  })
})

const emit = defineEmits<{
  found: [data: any]
  needsSelection: [customerRecord: any]
  multipleCustomers: [customers: any[]]
  updateSearchState: [state: { searchMethod: string; phone: string; email: string }]
  createNewAccount: [data: any]
}>()

const searchMethod = ref(props.initialSearchState?.searchMethod || 'phone')
// Format phone number if it exists in initial state
const initialPhone = props.initialSearchState?.phone || ''
const phone = ref(initialPhone ? formatPhoneNumber(initialPhone) : '')
const email = ref(props.initialSearchState?.email || '')
const phoneError = ref('')
const emailError = ref('')
const isLoading = ref(false)
const errorMessage = ref('')

// Input refs for focus management
const phoneInputRef = ref<any>(null)
const emailInputRef = ref<any>(null)

// Computed property to determine if "Create New Account" button should be shown
const showCreateNewAccountButton = computed(() => {
  if (!errorMessage.value) return false
  
  // Show button only for "not found" errors, not validation errors
  const notFoundMessages = [
    'No customers found',
    'Customer not found',
    'No customers found matching'
  ]
  
  return notFoundMessages.some(msg => errorMessage.value.includes(msg))
})

// Define emitSearchState early so it can be used in watchers
const emitSearchState = () => {
  emit('updateSearchState', {
    searchMethod: searchMethod.value,
    phone: phone.value,
    email: email.value,
  })
}

// Handle toggle for customer view (phone/email)
const handleToggleSearchMethod = (method: 'phone' | 'email') => {
  searchMethod.value = method
  emitSearchState()
}

// Function to focus the appropriate input field based on search method
const focusSearchField = async () => {
  // Wait for DOM to update
  await nextTick()
  // Add a small delay to ensure the input is fully rendered
  await new Promise(resolve => setTimeout(resolve, 100))
  
  let inputRef: any = null
  
  switch (searchMethod.value) {
    case 'phone':
      inputRef = phoneInputRef.value
      break
    case 'email':
      inputRef = emailInputRef.value
      break
  }
  
  // The Input component exposes a focus() method
  if (inputRef && typeof inputRef.focus === 'function') {
    inputRef.focus()
  } else if (inputRef && inputRef.input) {
    // Fallback: try to access the input element directly
    const inputElement = inputRef.input
    if (inputElement && typeof inputElement.focus === 'function') {
      inputElement.focus()
    }
  }
}

// Watch for changes to initialSearchState and update phone/email
watch(() => props.initialSearchState, (newState) => {
  if (newState) {
    if (newState.phone !== undefined && newState.phone !== phone.value) {
      phone.value = newState.phone ? formatPhoneNumber(newState.phone) : ''
    }
    if (newState.email !== undefined && newState.email !== email.value) {
      email.value = newState.email || ''
    }
    if (newState.searchMethod && newState.searchMethod !== searchMethod.value) {
      searchMethod.value = newState.searchMethod
    }
  }
}, { immediate: true, deep: true })

// On mount, ensure phone is formatted
onMounted(() => {
  // Format phone if it exists
  if (phone.value && !phone.value.includes('(')) {
    phone.value = formatPhoneNumber(phone.value)
  }
  searchMethod.value = 'phone'
  emitSearchState()
  
  // Focus the search field after mount with a delay to ensure DOM is ready
  setTimeout(() => {
    focusSearchField()
  }, 150)
})

// Focus the search field when method changes
watch(() => searchMethod.value, (newMethod) => {
  emitSearchState()
  // Focus the appropriate search field when method changes
  focusSearchField()
})

// Watch for changes to search fields and emit state updates
watch([searchMethod, phone, email], () => {
  emitSearchState()
})

const handlePhoneInput = (value: string) => {
  // Always format the phone number, even if it's already partially formatted
  const formatted = formatPhoneNumber(value)
  phone.value = formatted
  emitSearchState()
  
  // Clear error while user is typing - validation happens on blur or submit
  phoneError.value = ''
}

const validatePhoneField = () => {
  // Only validate on blur if the field has been touched
  const digitsOnly = phone.value.replace(/\D/g, '')
  if (digitsOnly.length === 0) {
    // Empty field - show required error
    phoneError.value = 'Phone number is required'
  } else if (digitsOnly.length < 10) {
    // Partial entry - show error
    phoneError.value = 'Phone number must be 10 digits'
  } else if (digitsOnly.length === 10) {
    // Valid - clear error
    phoneError.value = ''
  } else {
    // Too many digits
    phoneError.value = 'Phone number must be 10 digits'
  }
}

const validateEmailField = () => {
  const result = validateEmail(email.value)
  emailError.value = result.error || ''
}

const handleFind = async () => {
  console.log('handleFind called', { searchMethod: searchMethod.value, phone: phone.value })
  
  // Clear previous errors
  errorMessage.value = ''
  
  // Validate phone if it's required for the search method
  if (searchMethod.value === 'phone') {
    // Ensure phone is formatted before validation
    if (phone.value && !phone.value.includes('(')) {
      phone.value = formatPhoneNumber(phone.value)
    }
    
    const digitsOnly = phone.value.replace(/\D/g, '')
    if (!digitsOnly || digitsOnly.length !== 10) {
      phoneError.value = digitsOnly.length === 0 ? 'Phone number is required' : 'Phone number must be 10 digits'
      console.log('Phone validation failed:', phoneError.value, { phone: phone.value, digitsOnly })
      return // Don't submit if there's a phone error
    }
    // Clear any previous error if valid
    phoneError.value = ''
  }
  
  // Validate that we have a search value
  let searchValue = ''
  let searchKey: 'NAME' | 'PHONE' | 'TAG' | 'VIN' | 'EMAIL' = 'PHONE'
  
  switch (searchMethod.value) {
    case 'phone':
      // Ensure phone is formatted before extracting digits
      if (phone.value && !phone.value.includes('(')) {
        phone.value = formatPhoneNumber(phone.value)
      }
      searchValue = phone.value.replace(/\D/g, '') // Remove formatting
      searchKey = 'PHONE'
      if (!searchValue || searchValue.length !== 10) {
        phoneError.value = 'Please enter a valid phone number'
        return
      }
      break
    case 'email':
      validateEmailField()
      if (emailError.value) {
        return
      }
      searchValue = email.value.trim()
      searchKey = 'EMAIL'
      if (!searchValue) {
        errorMessage.value = 'Please enter an email address'
        return
      }
      break
    default:
      errorMessage.value = 'Please select a search method'
      return
  }
  
  console.log('Making API call', { searchKey, searchValue, searchMethod: searchMethod.value })
  isLoading.value = true
  
  try {
    const response = await customerVehicleLookup({
      searchKey,
      searchValue,
      maxCustomers: 50,
      showInactive: false,
    })
    
    console.log('API response:', response)
    
    if (!response.success) {
      errorMessage.value = response.error || 'Customer not found. Please check your information and try again.'
      isLoading.value = false
      return
    }
    
    if (!response.customers || response.customers.length === 0) {
      errorMessage.value = 'No customers found. Please check your information and try again.'
      isLoading.value = false
      return
    }
    
    // Filter out CASH CUSTOMER from results
    let filteredCustomers = response.customers.filter((customer: any) => {
      const name = customer.Name || customer.name || ''
      return name.toUpperCase() !== 'CASH CUSTOMER'
    })
    
    // If all customers were filtered out, show not found
    if (filteredCustomers.length === 0) {
      errorMessage.value = 'No customers found. Please check your information and try again.'
      isLoading.value = false
      return
    }
    
    // If multiple customers found, show customer selection screen
    if (filteredCustomers.length > 1) {
      console.log('Multiple customers found, emitting multipleCustomers event', filteredCustomers.length)
      emit('multipleCustomers', filteredCustomers)
      isLoading.value = false
      return
    }
    
    // Single customer found - proceed with normal flow
    const customer = filteredCustomers[0]
    
    // Check if customer needs to select from multiple options (phones/emails/vehicles)
    if (needsSelection(customer, searchKey)) {
      // Emit event to show selection screen
      emit('needsSelection', customer)
    } else {
      // Map the API response to the form data format
      const customerData = mapCustomerDataToForm(customer, undefined, undefined, undefined)
      
      // If we have form input values that weren't in the API response, preserve them
      if (phone.value && !customerData.phone) {
        customerData.phone = phone.value
      }
      if (email.value && !customerData.email) {
        customerData.email = email.value
      }
      
      emit('found', customerData)
    }
  } catch (error: any) {
    console.error('Customer lookup error:', error)
    errorMessage.value = error.message || 'An error occurred while searching. Please try again.'
  } finally {
    isLoading.value = false
  }
}

// Map search fields to form data structure for new account creation
const mapSearchFieldsToFormData = () => {
  const formData: any = {
    name: '',
    phone: '',
    email: '',
    address: {
      street: '',
      apt: '',
      city: '',
      state: '',
      zip: ''
    },
    vehicle: {
      licensePlate: '',
      state: '',
      year: '',
      make: '',
      model: '',
      vin: '',
      mileage: ''
    }
  }

  // Map phone (from phone search)
  if (phone.value && searchMethod.value === 'phone') {
    formData.phone = phone.value
  }

  // Map email (from email search)
  if (email.value && searchMethod.value === 'email') {
    formData.email = email.value.trim()
  }

  return formData
}

const handleCreateNewAccount = () => {
  const formData = mapSearchFieldsToFormData()
  emit('createNewAccount', formData)
}

const handleTryAgain = () => {
  // Clear all search fields
  phone.value = ''
  email.value = ''
  
  // Clear error messages
  errorMessage.value = ''
  phoneError.value = ''
  emailError.value = ''
  
  // Emit updated search state
  emitSearchState()
}

// Expose focusSearchField method for parent component
defineExpose({
  focusSearchField
})
</script>
