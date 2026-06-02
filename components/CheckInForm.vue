<template>
  <div class="w-full max-w-5xl mx-auto px-2 sm:px-0">
    <div class="space-y-4 sm:space-y-6">
      <form @submit.prevent="handleSubmit" class="space-y-4 sm:space-y-6">
        <Card class="shadow-md">
          <CardHeader>
            <h3 class="text-base sm:text-xl font-semibold text-slate-900">Customer Information</h3>
          </CardHeader>
          <CardContent class="space-y-4">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div class="space-y-2">
                <Label for="firstName">First Name</Label>
                <Input
                  ref="nameInputRef"
                  id="firstName"
                  v-model="formData.firstName"
                  required
                  @blur="validateFirstNameField"
                  :class="validationErrors.firstName ? 'border-red-500' : ''"
                />
                <p v-if="validationErrors.firstName" class="text-sm text-red-600">
                  {{ validationErrors.firstName }}
                </p>
              </div>
              <div class="space-y-2">
                <Label for="lastName">Last Name</Label>
                <Input
                  id="lastName"
                  v-model="formData.lastName"
                  required
                  @blur="validateLastNameField"
                  :class="validationErrors.lastName ? 'border-red-500' : ''"
                />
                <p v-if="validationErrors.lastName" class="text-sm text-red-600">
                  {{ validationErrors.lastName }}
                </p>
              </div>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div class="space-y-2">
                <Label for="phone">Phone</Label>
                <Input
                  id="phone"
                  :model-value="formData.phone"
                  @update:model-value="handlePhoneInput"
                  type="tel"
                  required
                  @blur="validatePhoneField"
                  :class="validationErrors.phone ? 'border-red-500' : ''"
                />
                <p v-if="validationErrors.phone" class="text-sm text-red-600">
                  {{ validationErrors.phone }}
                </p>
              </div>
              <div class="space-y-2">
                <Label for="email">Email</Label>
                <Input
                  id="email"
                  v-model="formData.email"
                  type="email"
                  @blur="validateEmailField"
                  :class="validationErrors.email ? 'border-red-500' : ''"
                />
                <p v-if="validationErrors.email" class="text-sm text-red-600">
                  {{ validationErrors.email }}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card class="shadow-md">
          <CardHeader>
            <h3 class="text-base sm:text-xl font-semibold text-slate-900">Address Information</h3>
          </CardHeader>
          <CardContent class="space-y-4">
            <div class="space-y-2">
              <Label for="street">Street Address</Label>
              <Input
                id="street"
                v-model="formData.address.street"
                @blur="() => validateTextField('street', formData.address.street, 'Street address')"
              />
            </div>
            <div class="space-y-2">
              <Label for="apt">Apt, suite (optional)</Label>
              <Input
                id="apt"
                v-model="formData.address.apt"
                @blur="() => validateTextField('apt', formData.address.apt, 'Apt/suite')"
              />
            </div>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div class="space-y-2">
                <Label for="city">City</Label>
                <Input
                  id="city"
                  v-model="formData.address.city"
                  @blur="() => validateTextField('city', formData.address.city, 'City')"
                />
              </div>
              <div class="space-y-2">
                <Label for="state">State</Label>
                <Select id="state" v-model="formData.address.state">
                  <option value="">Select State</option>
                  <option value="AL">Alabama</option>
                  <option value="AK">Alaska</option>
                  <option value="AZ">Arizona</option>
                  <option value="AR">Arkansas</option>
                  <option value="CA">California</option>
                  <option value="CO">Colorado</option>
                  <option value="CT">Connecticut</option>
                  <option value="DE">Delaware</option>
                  <option value="FL">Florida</option>
                  <option value="GA">Georgia</option>
                  <option value="HI">Hawaii</option>
                  <option value="ID">Idaho</option>
                  <option value="IL">Illinois</option>
                  <option value="IN">Indiana</option>
                  <option value="IA">Iowa</option>
                  <option value="KS">Kansas</option>
                  <option value="KY">Kentucky</option>
                  <option value="LA">Louisiana</option>
                  <option value="ME">Maine</option>
                  <option value="MD">Maryland</option>
                  <option value="MA">Massachusetts</option>
                  <option value="MI">Michigan</option>
                  <option value="MN">Minnesota</option>
                  <option value="MS">Mississippi</option>
                  <option value="MO">Missouri</option>
                  <option value="MT">Montana</option>
                  <option value="NE">Nebraska</option>
                  <option value="NV">Nevada</option>
                  <option value="NH">New Hampshire</option>
                  <option value="NJ">New Jersey</option>
                  <option value="NM">New Mexico</option>
                  <option value="NY">New York</option>
                  <option value="NC">North Carolina</option>
                  <option value="ND">North Dakota</option>
                  <option value="OH">Ohio</option>
                  <option value="OK">Oklahoma</option>
                  <option value="OR">Oregon</option>
                  <option value="PA">Pennsylvania</option>
                  <option value="RI">Rhode Island</option>
                  <option value="SC">South Carolina</option>
                  <option value="SD">South Dakota</option>
                  <option value="TN">Tennessee</option>
                  <option value="TX">Texas</option>
                  <option value="UT">Utah</option>
                  <option value="VT">Vermont</option>
                  <option value="VA">Virginia</option>
                  <option value="WA">Washington</option>
                  <option value="WV">West Virginia</option>
                  <option value="WI">Wisconsin</option>
                  <option value="WY">Wyoming</option>
                </Select>
              </div>
              <div class="space-y-2">
                <Label for="zip">Zip Code</Label>
                <Input
                  id="zip"
                  v-model="formData.address.zip"
                  @blur="validateZipField"
                  :class="validationErrors.zip ? 'border-red-500' : ''"
                />
                <p v-if="validationErrors.zip" class="text-sm text-red-600">
                  {{ validationErrors.zip }}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card class="shadow-md">
          <CardHeader>
            <h3 class="text-base sm:text-xl font-semibold text-slate-900">Vehicle Information</h3>
          </CardHeader>
          <CardContent>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div class="space-y-2">
                <Label for="licensePlate">License Plate</Label>
                <Input
                  id="licensePlate"
                  v-model="formData.vehicle.licensePlate"
                  @blur="() => validateTextField('licensePlate', formData.vehicle.licensePlate, 'License plate')"
                />
              </div>
              <div class="space-y-2">
                <Label for="vehicleState">State</Label>
                <Input
                  id="vehicleState"
                  v-model="formData.vehicle.state"
                  maxlength="2"
                  placeholder="CA"
                />
              </div>
              <div class="space-y-2">
                <Label for="year">Year</Label>
                <Input
                  id="year"
                  v-model="formData.vehicle.year"
                  required
                  @blur="validateYearField"
                  :class="validationErrors.year ? 'border-red-500' : ''"
                  maxlength="4"
                />
                <p v-if="validationErrors.year" class="text-sm text-red-600">
                  {{ validationErrors.year }}
                </p>
              </div>
              <div class="space-y-2">
                <Label for="make">Make</Label>
                <Input
                  id="make"
                  v-model="formData.vehicle.make"
                  required
                  @blur="validateMakeField"
                  :class="validationErrors.make ? 'border-red-500' : ''"
                />
                <p v-if="validationErrors.make" class="text-sm text-red-600">
                  {{ validationErrors.make }}
                </p>
              </div>
              <div class="space-y-2">
                <Label for="model">Model</Label>
                <Input
                  id="model"
                  v-model="formData.vehicle.model"
                  required
                  @blur="validateModelField"
                  :class="validationErrors.model ? 'border-red-500' : ''"
                />
                <p v-if="validationErrors.model" class="text-sm text-red-600">
                  {{ validationErrors.model }}
                </p>
              </div>
              <div class="space-y-2">
                <Label for="vin">VIN</Label>
                <Input
                  id="vin"
                  v-model="formData.vehicle.vin"
                  @blur="validateVinField"
                  :class="validationErrors.vin ? 'border-red-500' : ''"
                  maxlength="17"
                />
                <p v-if="validationErrors.vin" class="text-sm text-red-600">
                  {{ validationErrors.vin }}
                </p>
              </div>
              <div class="space-y-2 md:col-span-2">
                <Label for="mileage">Mileage</Label>
                <Input
                  id="mileage"
                  v-model="formData.vehicle.mileage"
                  @blur="validateMileageField"
                  :class="validationErrors.mileage ? 'border-red-500' : ''"
                />
                <p v-if="validationErrors.mileage" class="text-sm text-red-600">
                  {{ validationErrors.mileage }}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div class="sticky bottom-0 z-10 bg-white/95 backdrop-blur-sm border-t border-slate-200 px-4 py-3 rounded-md">
          <p class="text-sm text-slate-600">
            Review your details, then click <span class="font-semibold text-slate-900">Confirm Appointment</span> to continue.
          </p>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'
import Input from './ui/Input.vue'
import Label from './ui/Label.vue'
import Select from './ui/Select.vue'
import Card from './ui/Card.vue'
import CardHeader from './ui/CardHeader.vue'
import CardContent from './ui/CardContent.vue'
import { 
  validatePhone, 
  validateEmail, 
  validateZipCode, 
  validateVehicleYear, 
  validateMileage, 
  validateSafeText,
  formatPhoneNumber
} from '@/lib/validation'

interface Props {
  isNewCustomer?: boolean
  customerData?: any
}

const props = withDefaults(defineProps<Props>(), {
  isNewCustomer: false,
  customerData: null
})

const emit = defineEmits<{
  checkin: []
}>()

const formData = ref({
  firstName: '',
  lastName: '',
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
})

const validationErrors = ref({
  firstName: '',
  lastName: '',
  phone: '',
  email: '',
  street: '',
  apt: '',
  city: '',
  zip: '',
  year: '',
  make: '',
  model: '',
  licensePlate: '',
  vin: '',
  mileage: ''
})

const nameInputRef = ref<any>(null)

// Populate form with customer data if provided
watch(() => props.customerData, (data) => {
  if (data) {
    // Parse name if provided as full name, otherwise use firstName/lastName
    let firstName = data.firstName || ''
    let lastName = data.lastName || ''
    if (data.name && !firstName && !lastName) {
      const nameParts = data.name.split(' ')
      firstName = nameParts[0] || ''
      lastName = nameParts.slice(1).join(' ') || ''
    }
    
    formData.value = {
      firstName: firstName,
      lastName: lastName,
      phone: data.phone || '',
      email: data.email || '',
      address: {
        street: data.address?.street || '',
        apt: data.address?.apt || '',
        city: data.address?.city || '',
        state: data.address?.state || '',
        zip: data.address?.zip || ''
      },
      vehicle: {
        licensePlate: data.vehicle?.licensePlate || '',
        state: data.vehicle?.state || '',
        year: data.vehicle?.year || '',
        make: data.vehicle?.make || '',
        model: data.vehicle?.model || '',
        vin: data.vehicle?.vin || '',
        mileage: data.vehicle?.mileage || ''
      }
    }
  }
}, { immediate: true })

const validateTextField = (field: string, value: string, fieldName: string) => {
  const result = validateSafeText(value, fieldName, false) // Optional
  if (field in validationErrors.value) {
    validationErrors.value[field as keyof typeof validationErrors.value] = result.error || ''
  }
}

const handlePhoneInput = (value: string) => {
  const formatted = formatPhoneNumber(value)
  formData.value.phone = formatted
  
  // Validate as user types
  const digitsOnly = formatted.replace(/\D/g, '')
  if (digitsOnly.length > 0 && digitsOnly.length !== 10) {
    validatePhoneField()
  } else if (digitsOnly.length === 10) {
    validationErrors.value.phone = ''
  }
}

const validateFirstNameField = () => {
  const result = validateSafeText(formData.value.firstName, 'First name', true)
  validationErrors.value.firstName = result.error || ''
}

const validateLastNameField = () => {
  const result = validateSafeText(formData.value.lastName, 'Last name', true)
  validationErrors.value.lastName = result.error || ''
}

const validatePhoneField = () => {
  const result = validatePhone(formData.value.phone, true) // Required
  validationErrors.value.phone = result.error || ''
}

const validateEmailField = () => {
  const result = validateEmail(formData.value.email)
  validationErrors.value.email = result.error || ''
}

const validateZipField = () => {
  const result = validateZipCode(formData.value.address.zip)
  validationErrors.value.zip = result.error || ''
}

const validateYearField = () => {
  if (!formData.value.vehicle.year) {
    validationErrors.value.year = 'Year is required'
    return
  }
  const result = validateVehicleYear(formData.value.vehicle.year)
  validationErrors.value.year = result.error || ''
}

const validateMakeField = () => {
  const result = validateSafeText(formData.value.vehicle.make, 'Make', true)
  validationErrors.value.make = result.error || ''
}

const validateModelField = () => {
  const result = validateSafeText(formData.value.vehicle.model, 'Model', true)
  validationErrors.value.model = result.error || ''
}

const validateMileageField = () => {
  if (!formData.value.vehicle.mileage) {
    validationErrors.value.mileage = ''
    return
  }
  const result = validateMileage(formData.value.vehicle.mileage)
  validationErrors.value.mileage = result.error || ''
}

const validateVinField = () => {
  if (!formData.value.vehicle.vin) {
    validationErrors.value.vin = ''
    return
  }
  const vinUpper = formData.value.vehicle.vin.toUpperCase()
  if (vinUpper.length !== 17) {
    validationErrors.value.vin = 'VIN must be 17 characters'
  } else if (!/^[A-HJ-NPR-Z0-9]{17}$/.test(vinUpper)) {
    validationErrors.value.vin = 'VIN contains invalid characters'
  } else {
    validationErrors.value.vin = ''
  }
}

const handleSubmit = () => {
  // Validate all required fields
  validateFirstNameField()
  validateLastNameField()
  validatePhoneField()
  validateEmailField()
  validateZipField()
  validateYearField()
  validateMakeField()
  validateModelField()
  validateMileageField()
  validateVinField()
  
  // Check if there are any errors
  const hasErrors = Object.values(validationErrors.value).some(error => error !== '')
  
  // Check required fields
  const hasRequiredFields = formData.value.firstName && 
                            formData.value.lastName && 
                            formData.value.phone &&
                            formData.value.vehicle.year &&
                            formData.value.vehicle.make &&
                            formData.value.vehicle.model
  
  if (!hasErrors && hasRequiredFields) {
    emit('checkin')
  }
}

const getFormData = () => {
  // Validate before returning
  validateFirstNameField()
  validateLastNameField()
  validatePhoneField()
  validateEmailField()
  validateZipField()
  validateYearField()
  validateMakeField()
  validateModelField()
  validateMileageField()
  validateVinField()
  
  // Check if there are any errors
  const hasErrors = Object.values(validationErrors.value).some(error => error !== '')
  
  // Check required fields
  const hasRequiredFields = formData.value.firstName && 
                            formData.value.lastName && 
                            formData.value.phone &&
                            formData.value.vehicle.year &&
                            formData.value.vehicle.make &&
                            formData.value.vehicle.model
  
  if (hasErrors || !hasRequiredFields) {
    return null
  }
  
  // Combine first and last name for display
  const fullName = `${formData.value.firstName} ${formData.value.lastName}`.trim()
  
  return {
    ...formData.value,
    name: fullName, // Full name for display
    custNum: 0, // New customer, no customer number
    custFirstName: formData.value.firstName,
    custLastName: formData.value.lastName,
  }
}

onMounted(() => {
  // Focus name field on mount
  if (nameInputRef.value && typeof nameInputRef.value.focus === 'function') {
    nameInputRef.value.focus()
  }
})

// Expose getFormData for parent component
defineExpose({
  getFormData
})
</script>
