<template>
  <div class="h-full bg-brand-shell">
    <!-- Page Header -->
    <div v-if="showPageHeader" class="border-b bg-white">
      <div class="mx-auto max-w-7xl px-3 sm:px-4 lg:px-8 py-3 sm:py-4">
        <div class="flex items-center justify-between gap-3">
          <h1 class="text-xl sm:text-2xl font-bold text-brand-accent">Appointments</h1>
          <button
            type="button"
            @click="goToAppointmentsDashboard"
            class="px-4 py-2 text-sm border border-slate-300 rounded-md hover:bg-slate-50 transition-colors"
          >
            Back to Appointments
          </button>
        </div>
      </div>
    </div>

    <div v-if="mode === 'app'" class="mx-auto max-w-7xl px-3 sm:px-4 lg:px-8 py-4">
      <div class="flex items-center justify-end gap-2">
        <Button variant="outline" @click="resetToServiceSelection">Start Over</Button>
        <Button v-if="showCloseButton" variant="outline" @click="emit('close')">Close</Button>
      </div>
    </div>

    <!-- Service Selection Step (Initial View) -->
    <div v-if="appointmentStep === 'serviceSelection'" class="mx-auto max-w-7xl px-3 sm:px-4 lg:px-8 py-4 sm:py-6">
      <!-- Title and Instruction -->
      <div class="mx-auto mb-6 w-full max-w-[862.667px]">
        <h2 class="mb-2 text-2xl font-bold text-slate-900 sm:text-3xl">Book Appointment</h2>
        <p class="text-sm text-slate-600 sm:text-base">Please select appointment type:</p>
      </div>

      <!-- Service Cards Grid -->
      <div class="mx-auto w-full max-w-[862.667px]">
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <AppointmentTypeCard
            v-for="service in appointmentTypes"
            :key="service.id"
            :service="service"
            @select="handleServiceSelect"
          />
        </div>
      </div>
    </div>

    <div v-else-if="appointmentStep === 'issueType'" class="mx-auto max-w-7xl px-3 sm:px-4 lg:px-8 py-4 sm:py-6">
      <div class="mb-6 flex items-center justify-between">
        <h2 class="text-2xl sm:text-3xl font-bold text-slate-900">Book Appointment</h2>
        <button
          @click="goBack"
          class="px-4 py-2 text-sm border border-slate-300 rounded-md hover:bg-slate-50 transition-colors"
          type="button"
        >
          ← Back
        </button>
      </div>
      <IssueTypeStep
        v-if="selectedServiceQuestionTree"
        v-model="selectedIssueType"
        :question="selectedServiceQuestionTree.issueQuestion"
        @next="handleIssueTypeNext"
        @back="goBack"
      />
    </div>

    <div v-else-if="appointmentStep === 'issueFollowup'" class="mx-auto max-w-7xl px-3 sm:px-4 lg:px-8 py-4 sm:py-6">
      <div class="mb-6 flex items-center justify-between">
        <h2 class="text-2xl sm:text-3xl font-bold text-slate-900">Book Appointment</h2>
        <button
          @click="goBack"
          class="px-4 py-2 text-sm border border-slate-300 rounded-md hover:bg-slate-50 transition-colors"
          type="button"
        >
          ← Back
        </button>
      </div>
      <FollowupQuestionsStep
        v-if="selectedServiceQuestionTree"
        v-model="followupAnswers"
        :questions="selectedServiceQuestionTree.followupQuestions"
        @next="handleFollowupNext"
        @back="goBack"
      />
    </div>

    <div v-else-if="appointmentStep === 'serviceVisitInfo'" class="mx-auto max-w-7xl px-3 sm:px-4 lg:px-8 py-4 sm:py-6">
      <div class="mb-6 flex items-center justify-between">
        <h2 class="text-2xl sm:text-3xl font-bold text-slate-900">Book Appointment</h2>
        <button
          @click="goBack"
          class="px-4 py-2 text-sm border border-slate-300 rounded-md hover:bg-slate-50 transition-colors"
          type="button"
        >
          ← Back
        </button>
      </div>
      <ServiceVisitInfoStep
        :notes="additionalVisitNotes"
        :attachments="visitAttachmentFiles"
        :is-uploading="isUploadingVisitInfo"
        @update:notes="additionalVisitNotes = $event"
        @update:attachments="visitAttachmentFiles = $event"
        @next="handleServiceVisitInfoNext"
        @back="goBack"
      />
    </div>

    <div v-else-if="appointmentStep === 'phoneVerification'" class="mx-auto max-w-7xl px-3 sm:px-4 lg:px-8 py-4 sm:py-6">
      <div class="mb-6 flex items-center justify-between">
        <h2 class="text-2xl sm:text-3xl font-bold text-slate-900">Book Appointment</h2>
        <button
          @click="goBack"
          class="px-4 py-2 text-sm border border-slate-300 rounded-md hover:bg-slate-50 transition-colors"
          type="button"
        >
          ← Back
        </button>
      </div>
      <PhoneVerificationStep
        :phone="phoneForVerification"
        :sms-opt-in="smsOptIn"
        :shop-name="selectedStoreLabel"
        :code="otpCode"
        :code-sent="otpCodeSent"
        :verified="otpVerified"
        :sending-code="sendingOtpCode"
        :verifying-code="verifyingOtpCode"
        :error-message="otpErrorMessage"
        @update:phone="phoneForVerification = $event"
        @update:sms-opt-in="smsOptIn = $event"
        @update:code="otpCode = $event"
        @send-code="sendVerificationCode"
        @verify-code="verifyCode"
        @next="handlePhoneVerificationNext"
        @back="goBack"
      />
    </div>

    <div v-else-if="appointmentStep === 'customerIdentity'" class="mx-auto max-w-7xl px-3 sm:px-4 lg:px-8 py-4 sm:py-6">
      <div class="mb-6 flex items-center justify-between">
        <h2 class="text-2xl sm:text-3xl font-bold text-slate-900">Book Appointment</h2>
        <button
          @click="goBack"
          class="px-4 py-2 text-sm border border-slate-300 rounded-md hover:bg-slate-50 transition-colors"
          type="button"
        >
          ← Back
        </button>
      </div>
      <CustomerIdentityStep
        v-model="customerIdentityForm"
        @next="handleCustomerIdentityNext"
        @back="goBack"
      />
    </div>

    <div v-else-if="appointmentStep === 'transportation'" class="mx-auto max-w-7xl px-3 sm:px-4 lg:px-8 py-4 sm:py-6">
      <div class="mb-6 flex items-center justify-between">
        <h2 class="text-2xl sm:text-3xl font-bold text-slate-900">Transportation</h2>
        <button
          @click="goBack"
          class="px-4 py-2 text-sm border border-slate-300 rounded-md hover:bg-slate-50 transition-colors"
          type="button"
        >
          ← Back
        </button>
      </div>
      <Card>
        <CardContent class="space-y-6">
          <p class="text-sm text-slate-700">Will you wait here or drop your vehicle off?</p>
          <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Button
              :variant="isDropoff ? 'default' : 'outline'"
              class="justify-start"
              @click="isDropoff = true"
            >
              I will drop off my vehicle
            </Button>
            <Button
              :variant="!isDropoff ? 'default' : 'outline'"
              class="justify-start"
              @click="isDropoff = false"
            >
              I will wait for my vehicle
            </Button>
          </div>
          <div class="flex justify-end gap-3 border-t pt-4">
            <Button variant="outline" @click="goBack">Back</Button>
            <Button @click="appointmentStep = 'booking'">Next</Button>
          </div>
        </CardContent>
      </Card>
    </div>

    <!-- Booking Step -->
    <div v-else-if="appointmentStep === 'booking'" class="mx-auto max-w-7xl px-3 sm:px-4 lg:px-8 py-4 sm:py-6">
      <div class="mb-6 flex items-center justify-between">
        <h2 class="text-2xl sm:text-3xl font-bold text-slate-900">Book Appointment</h2>
        <button
          @click="goBack"
          class="px-4 py-2 text-sm border border-slate-300 rounded-md hover:bg-slate-50 transition-colors"
          type="button"
        >
          ← Back
        </button>
      </div>

      <Card>
        <CardHeader>
          <div v-if="selectedService" class="space-y-1">
            <div class="text-sm font-medium text-slate-600">Selected Service</div>
            <div class="text-base font-semibold text-slate-900">{{ selectedService.name }}</div>
            <div class="text-sm text-slate-600">{{ formatDuration(selectedService.duration) }}</div>
          </div>
        </CardHeader>
        <CardContent class="space-y-6">

          <!-- Service Description (for "Other" service) -->
          <div v-if="selectedService?.id === 'other'">
            <label class="block text-sm font-medium text-slate-700 mb-2">Service Description</label>
            <textarea
              v-model="serviceDescription"
              placeholder="Please describe the service you need..."
              rows="3"
              class="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none"
            />
          </div>

          <!-- Date and Time Selector -->
          <div class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-slate-700 mb-2">Date</label>
              <!-- Clickable Date Field -->
              <button
                type="button"
                @click="showCalendar = !showCalendar"
                class="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-left ring-offset-background hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <span v-if="selectedDate" class="text-slate-900">
                  {{ formatDateDisplay(selectedDate) }}
                </span>
                <span v-else class="text-slate-400">Select a date</span>
              </button>
              
              <!-- Calendar Popover -->
              <div
                v-if="showCalendar"
                @click.stop
                class="mt-2 p-4 bg-white border rounded-md shadow-lg"
              >
                <Calendar
                  v-model="selectedDate"
                  :min-date="minDate"
                  @update:model-value="handleDateSelect"
                />
              </div>
            </div>

            <div>
              <label class="block text-sm font-medium text-slate-700 mb-2">Time</label>
              <div class="relative">
                <input
                  type="text"
                  v-model="selectedTimeDisplay"
                  @input="handleTimeInput"
                  @focus="showTimeDropdown = true"
                  @blur="handleTimeBlur"
                  placeholder="Select or type time"
                  class="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                />
                <div
                  v-if="showTimeDropdown"
                  class="absolute z-10 w-full mt-1 max-h-64 overflow-y-auto bg-white border rounded-md shadow-lg"
                >
                  <button
                    v-for="timeOption in timeOptions"
                    :key="timeOption.value"
                    @click="selectTime(timeOption.value)"
                    :class="[
                      'w-full text-left px-3 py-2 text-sm hover:bg-slate-100 transition-colors',
                      selectedTime === timeOption.value && 'bg-slate-100 font-medium'
                    ]"
                    type="button"
                  >
                    {{ timeOption.label }}
                  </button>
                </div>
              </div>
            </div>

            <!-- Dropoff/Wait Toggle -->
            <div>
              <label class="block text-sm font-medium text-slate-700 mb-2">Service Type</label>
              <div class="relative inline-flex rounded-md border border-slate-300 bg-white p-1" role="group">
                <button
                  type="button"
                  @click="isDropoff = true"
                  :class="[
                    'px-4 py-2 text-sm font-medium rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-slate-900 focus:ring-offset-2',
                    isDropoff
                      ? 'bg-slate-900 text-white'
                      : 'text-slate-700 hover:bg-slate-50'
                  ]"
                >
                  Dropoff
                </button>
                <button
                  type="button"
                  @click="isDropoff = false"
                  :disabled="selectedTime === 'am-dropoff'"
                  :class="[
                    'px-4 py-2 text-sm font-medium rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-slate-900 focus:ring-offset-2',
                    !isDropoff
                      ? 'bg-slate-900 text-white'
                      : selectedTime === 'am-dropoff'
                      ? 'text-slate-400 cursor-not-allowed'
                      : 'text-slate-700 hover:bg-slate-50',
                    selectedTime === 'am-dropoff' && 'opacity-50'
                  ]"
                >
                  Wait
                </button>
              </div>
            </div>
          </div>

          <!-- Additional Services -->
          <div class="space-y-3">
            <Button
              variant="outline"
              @click="showAdditionalServices = !showAdditionalServices"
              class="w-full"
            >
              <span v-if="!showAdditionalServices">Add Additional Services</span>
              <span v-else>Hide Additional Services</span>
            </Button>

            <div
              v-if="showAdditionalServices"
              ref="additionalServicesRef"
              class="space-y-3 max-h-64 overflow-y-auto border rounded-md p-4"
            >
              <div
                v-for="service in availableAdditionalServices"
                :key="service.id"
                class="flex items-center gap-3 p-2 rounded-md hover:bg-slate-50"
              >
                <Checkbox
                  :checked="selectedAdditionalServices.includes(service.id)"
                  @update:checked="(checked) => toggleAdditionalService(service.id, checked)"
                />
                <div class="flex-1">
                  <div class="text-sm font-medium text-slate-900">{{ service.name }}</div>
                  <div class="text-xs text-slate-600">{{ formatDuration(service.duration) }}</div>
                </div>
              </div>
            </div>

            <!-- Selected Additional Services Summary -->
            <div v-if="selectedAdditionalServices.length > 0" class="mt-3 p-3 bg-slate-50 rounded-md">
              <div class="text-xs font-medium text-slate-600 mb-2">Additional Services:</div>
              <div class="space-y-1">
                <div
                  v-for="serviceId in selectedAdditionalServices"
                  :key="serviceId"
                  class="text-sm text-slate-900"
                >
                  • {{ getServiceName(serviceId) }}
                </div>
              </div>
            </div>
          </div>

          <!-- Action Buttons -->
          <div class="flex gap-3 justify-end pt-4 border-t">
            <Button variant="outline" @click="resetToServiceSelection">Cancel</Button>
            <Button @click="proceedFromSchedule">Proceed</Button>
          </div>
        </CardContent>
      </Card>
        </div>

        <!-- Have You Been Here Before Step -->
    <div v-else-if="appointmentStep === 'haveYouBeenHere'" class="mx-auto max-w-7xl px-3 sm:px-4 lg:px-8 py-4 sm:py-6">
      <div class="mb-6 flex items-center justify-between">
        <h2 class="text-2xl sm:text-3xl font-bold text-slate-900">Have You Been Here Before?</h2>
        <button
          @click="goBack"
          class="px-4 py-2 text-sm border border-slate-300 rounded-md hover:bg-slate-50 transition-colors"
          type="button"
        >
          ← Back
        </button>
      </div>

      <Card>
        <CardContent class="space-y-6">
          <div class="text-center py-4">
            <p class="text-base text-slate-700 mb-6">
              Have you visited us before?
            </p>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Button
              @click="handleHaveYouBeenHereYes"
              class="min-h-[44px] text-lg font-semibold"
            >
              Yes
            </Button>
            <Button
              @click="handleHaveYouBeenHereNo"
              variant="outline"
              class="min-h-[44px] text-lg font-semibold"
            >
              No
            </Button>
          </div>
        </CardContent>
      </Card>
        </div>

        <!-- Customer Lookup Step -->
    <div v-else-if="appointmentStep === 'customerLookup'" class="mx-auto max-w-7xl px-3 sm:px-4 lg:px-8 py-4 sm:py-6">
      <div class="mb-6 flex items-center justify-between">
        <h2 class="text-2xl sm:text-3xl font-bold text-slate-900">Find Your Account</h2>
        <button
          @click="goBack"
          class="px-4 py-2 text-sm border border-slate-300 rounded-md hover:bg-slate-50 transition-colors"
          type="button"
        >
          ← Back
        </button>
      </div>

      <Card>
        <CardContent>
          <ReturningCustomerLookup
            :initial-search-state="searchState"
            @found="handleCustomerFound"
            @needs-selection="handleNeedsSelection"
            @multiple-customers="handleMultipleCustomers"
            @update-search-state="(state) => searchState = { ...searchState, ...state }"
            @create-new-account="handleCreateNewAccountFromLookup"
          />
        </CardContent>
      </Card>
        </div>

        <!-- Customer List Selection Step -->
    <div v-else-if="appointmentStep === 'customerList'" class="mx-auto max-w-7xl px-3 sm:px-4 lg:px-8 py-4 sm:py-6">
      <div class="mb-6 flex items-center justify-between">
        <h2 class="text-2xl sm:text-3xl font-bold text-slate-900">Select Customer</h2>
        <button
          @click="goBack"
          class="px-4 py-2 text-sm border border-slate-300 rounded-md hover:bg-slate-50 transition-colors"
          type="button"
        >
          ← Back
        </button>
      </div>

      <Card>
        <CardContent class="space-y-6">
          <CustomerListSelection
            ref="customerListSelectionRef"
            :customers="multipleCustomers"
            @selected="handleCustomerListSelected"
            @selection-changed="handleCustomerListSelectionChanged"
          />
          <div class="flex gap-3 justify-end pt-4 border-t">
            <Button variant="outline" @click="goBack">Back</Button>
            <Button @click="handleCustomerListConfirm">Proceed</Button>
          </div>
        </CardContent>
      </Card>
        </div>

        <!-- Customer Selection Step (multiple phones/emails/vehicles) -->
    <div v-else-if="appointmentStep === 'customerSelection'" class="mx-auto max-w-7xl px-3 sm:px-4 lg:px-8 py-4 sm:py-6">
      <div class="mb-6 flex items-center justify-between">
        <h2 class="text-2xl sm:text-3xl font-bold text-slate-900">Select Contact Information</h2>
        <button
          @click="goBack"
          class="px-4 py-2 text-sm border border-slate-300 rounded-md hover:bg-slate-50 transition-colors"
          type="button"
        >
          ← Back
        </button>
      </div>

      <Card>
        <CardContent class="space-y-6">
          <CustomerSelection
            ref="customerSelectionRef"
            :customer-record="customerRecordForSelection"
            @selected="handleSelectionComplete"
          />
          <div class="flex gap-3 justify-end pt-4 border-t">
            <Button variant="outline" @click="goBack">Back</Button>
            <Button @click="handleCustomerSelectionConfirm" :disabled="isConfirmingAppointment">
              <span v-if="isConfirmingAppointment" class="w-5 h-5 mr-2 border-2 border-white border-t-transparent rounded-full animate-spin inline-block" />
              {{ isConfirmingAppointment ? 'Processing...' : 'Confirm Appointment' }}
            </Button>
          </div>
        </CardContent>
      </Card>
        </div>

        <!-- Customer Record View Step -->
    <div v-else-if="appointmentStep === 'customerRecord'" class="mx-auto max-w-7xl px-3 sm:px-4 lg:px-8 py-4 sm:py-6">
      <div class="mb-6 flex items-center justify-between">
        <h2 class="text-2xl sm:text-3xl font-bold text-slate-900">Confirm Your Information</h2>
        <button
          @click="goBack"
          class="px-4 py-2 text-sm border border-slate-300 rounded-md hover:bg-slate-50 transition-colors"
          type="button"
        >
          ← Back
        </button>
      </div>

      <Card>
        <CardContent class="space-y-6">
          <!-- Customer information display -->
          <div v-if="customerData" class="space-y-4">
            <div class="p-4 bg-slate-50 rounded-md">
              <h3 class="font-semibold text-slate-900 mb-3">Customer Information</h3>
              <div class="space-y-2 text-sm">
                <div><span class="font-medium">Name:</span> {{ customerData.name }}</div>
                <div v-if="customerData.phone"><span class="font-medium">Phone:</span> {{ customerData.phone }}</div>
                <div v-if="customerData.email"><span class="font-medium">Email:</span> {{ customerData.email }}</div>
                <div v-if="customerData.vehicle">
                  <div v-if="customerData.vehicle.year || customerData.vehicle.make || customerData.vehicle.model">
                    <span class="font-medium">Vehicle:</span> 
                    {{ customerData.vehicle.year }} {{ customerData.vehicle.make }} {{ customerData.vehicle.model }}
                  </div>
                  <div v-if="customerData.vehicle.licensePlate">
                    <span class="font-medium">License Plate:</span> {{ customerData.vehicle.licensePlate }}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div class="flex gap-3 justify-end pt-4 border-t">
            <Button variant="outline" @click="goBack">Back</Button>
            <Button @click="handleCustomerRecordProceed">Proceed</Button>
          </div>
        </CardContent>
      </Card>
        </div>

        <!-- Vehicle Selection Step -->
    <div v-else-if="appointmentStep === 'vehicleSelection'" class="mx-auto max-w-7xl px-3 sm:px-4 lg:px-8 py-4 sm:py-6">
      <div class="mb-6 flex items-center justify-between">
        <h2 class="text-2xl sm:text-3xl font-bold text-slate-900">Select Vehicle</h2>
        <button
          @click="goBack"
          class="px-4 py-2 text-sm border border-slate-300 rounded-md hover:bg-slate-50 transition-colors"
          type="button"
        >
          ← Back
        </button>
      </div>

      <Card>
        <CardContent class="space-y-6">
          <div class="rounded-lg bg-slate-50 border border-slate-200 p-3 sm:p-4 mb-2 sm:mb-3">
            <p class="text-[10px] sm:text-xs md:text-sm text-slate-700 leading-tight">
              Please select the vehicle for this appointment.
            </p>
          </div>

          <div class="max-h-[60vh] overflow-y-auto pr-2 space-y-1.5 sm:space-y-2">
            <label
              v-for="(vehicle, index) in availableVehicles"
              :key="index"
              class="flex items-start gap-2 sm:gap-3 p-2 sm:p-3 md:p-4 rounded-lg border-2 cursor-pointer transition-colors min-h-[44px]"
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
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-x-1.5 sm:gap-x-2 md:gap-x-4 gap-y-0.5 sm:gap-y-1 text-xs sm:text-sm text-slate-600">
                  <div v-if="vehicle.year || vehicle.make || vehicle.model" class="col-span-1 sm:col-span-2">
                    <span class="font-semibold text-slate-900 text-sm sm:text-base">
                      {{ vehicle.year }} {{ vehicle.make }} {{ vehicle.model }}
                    </span>
                  </div>
                  <div v-if="vehicle.licensePlate">
                    <span class="font-medium">License Plate:</span> {{ vehicle.licensePlate }}
                  </div>
                  <div v-if="vehicle.state">
                    <span class="font-medium">State:</span> {{ vehicle.state }}
                  </div>
                  <div v-if="vehicle.vin">
                    <span class="font-medium">VIN:</span> <span class="break-all">{{ vehicle.vin }}</span>
                  </div>
                  <div v-if="vehicle.mileage">
                    <span class="font-medium">Mileage:</span> {{ vehicle.mileage }}
                  </div>
                </div>
              </div>
            </label>
            
            <!-- Add New Vehicle Option -->
            <label
              class="flex items-start gap-2 sm:gap-3 p-2 sm:p-3 md:p-4 rounded-lg border-2 cursor-pointer transition-colors min-h-[44px]"
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
                  @click="showAddVehicle = false; selectedVehicleIndex = availableVehicles.length > 0 ? 0 : 'new'; resetNewVehicle()"
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

          <div class="flex gap-3 justify-end pt-4 border-t">
            <Button variant="outline" @click="goBack">Back</Button>
            <Button @click="handleVehicleSelectionConfirm" :disabled="isConfirmingAppointment">
              <span v-if="isConfirmingAppointment" class="w-5 h-5 mr-2 border-2 border-white border-t-transparent rounded-full animate-spin inline-block" />
              {{ isConfirmingAppointment ? 'Processing...' : 'Next' }}
            </Button>
          </div>
        </CardContent>
      </Card>
        </div>

        <!-- Customer Form Step (New Customer) -->
    <div v-else-if="appointmentStep === 'customerForm'" class="mx-auto max-w-7xl px-3 sm:px-4 lg:px-8 py-4 sm:py-6">
      <div class="mb-6 flex items-start gap-4">
        <button
          @click="goBack"
          class="px-4 py-2 text-sm border border-slate-300 rounded-md hover:bg-slate-50 transition-colors"
          type="button"
        >
          ← Back
        </button>
        <div class="flex-1 max-w-5xl">
          <Card class="overflow-hidden shadow-lg">
            <CardHeader class="bg-gradient-to-r from-slate-50 to-white px-4 sm:px-6 py-4 sm:py-6">
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                  <svg class="w-5 h-5 sm:w-6 sm:h-6 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5h6m-6 4h6m-7 6h8m2 4H6a2 2 0 01-2-2V5a2 2 0 012-2h9l5 5v9a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div>
                  <h2 class="text-lg sm:text-2xl font-semibold text-slate-900">New Customer Information</h2>
                  <p class="text-xs sm:text-sm text-slate-600 mt-1">
                    Please complete your information to confirm your appointment.
                  </p>
                </div>
              </div>
            </CardHeader>
          </Card>
        </div>
      </div>

      <div class="space-y-6">
        <CheckInForm
          ref="checkInFormRef"
          :is-new-customer="true"
          :customer-data="customerData"
          @checkin="handleFormCheckin"
        />
        <div class="max-w-5xl mx-auto flex gap-3 justify-end pt-4 border-t border-slate-200">
          <Button variant="outline" @click="goBack">Back</Button>
          <Button @click="handleFormCheckin" :disabled="isConfirmingAppointment">
            <span v-if="isConfirmingAppointment" class="w-5 h-5 mr-2 border-2 border-white border-t-transparent rounded-full animate-spin inline-block" />
            {{ isConfirmingAppointment ? 'Processing...' : 'Confirm Appointment' }}
          </Button>
        </div>
      </div>
        </div>

    <div v-else-if="appointmentStep === 'rideNeed'" class="mx-auto max-w-7xl px-3 sm:px-4 lg:px-8 py-4 sm:py-6">
      <div class="mb-6 flex items-center justify-between">
        <h2 class="text-2xl sm:text-3xl font-bold text-slate-900">Transportation</h2>
        <button
          @click="goBack"
          class="px-4 py-2 text-sm border border-slate-300 rounded-md hover:bg-slate-50 transition-colors"
          type="button"
        >
          ← Back
        </button>
      </div>
      <RideNeedStep
        v-model="needsRide"
        @next="confirmAppointment"
        @back="goBack"
      />
    </div>

        <!-- Appointment Summary Step -->
    <div v-else-if="appointmentStep === 'summary'" class="mx-auto max-w-7xl px-3 sm:px-4 lg:px-8 py-4 sm:py-6">
      <Card>
        <CardContent class="space-y-6">
          <div class="text-center py-4">
            <div class="mb-6">
              <div class="inline-flex items-center justify-center w-16 h-16 rounded-full bg-brand-accent/15 mb-4">
                <svg class="w-8 h-8 text-brand-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                </svg>
              </div>
              <h2 class="text-2xl font-bold text-slate-900 mb-2">Appointment Confirmed!</h2>
              <p class="text-slate-600">Your appointment has been successfully scheduled.</p>
            </div>
          </div>

          <div v-if="appointmentSummary" class="space-y-4">
            <div class="p-4 bg-slate-50 rounded-md space-y-3">
              <h3 class="font-semibold text-slate-900 mb-3">Appointment Details</h3>
              
              <div class="space-y-2 text-sm">
                <div>
                  <span class="font-medium text-slate-700">Service:</span>
                  <span class="ml-2 text-slate-900">{{ appointmentSummary.serviceName }}</span>
                </div>
                
                <div v-if="appointmentSummary.additionalServices && appointmentSummary.additionalServices.length > 0">
                  <span class="font-medium text-slate-700">Additional Services:</span>
                  <ul class="ml-2 mt-1 list-disc list-inside text-slate-900">
                    <li v-for="service in appointmentSummary.additionalServices" :key="service">
                      {{ service }}
                    </li>
                  </ul>
                </div>
                
                <div>
                  <span class="font-medium text-slate-700">Date:</span>
                  <span class="ml-2 text-slate-900">{{ appointmentSummary.dateFormatted }}</span>
                </div>
                
                <div>
                  <span class="font-medium text-slate-700">Time:</span>
                  <span class="ml-2 text-slate-900">{{ appointmentSummary.timeFormatted }}</span>
                </div>
                
                <div>
                  <span class="font-medium text-slate-700">Service Type:</span>
                  <span class="ml-2 text-slate-900">{{ appointmentSummary.serviceType }}</span>
                </div>
                <div>
                  <span class="font-medium text-slate-700">Needs Ride:</span>
                  <span class="ml-2 text-slate-900">{{ appointmentSummary.needsRide }}</span>
                </div>
              </div>
            </div>

            <div class="p-4 bg-slate-50 rounded-md space-y-3">
              <h3 class="font-semibold text-slate-900 mb-3">Customer Information</h3>
              
              <div class="space-y-2 text-sm">
                <div>
                  <span class="font-medium text-slate-700">Name:</span>
                  <span class="ml-2 text-slate-900">{{ appointmentSummary.customerName }}</span>
                </div>
                
                <div v-if="appointmentSummary.customerPhone">
                  <span class="font-medium text-slate-700">Phone:</span>
                  <span class="ml-2 text-slate-900">{{ appointmentSummary.customerPhone }}</span>
                </div>
                
                <div v-if="appointmentSummary.customerEmail">
                  <span class="font-medium text-slate-700">Email:</span>
                  <span class="ml-2 text-slate-900">{{ appointmentSummary.customerEmail }}</span>
                </div>
                
                <div v-if="appointmentSummary.vehicleInfo">
                  <span class="font-medium text-slate-700">Vehicle:</span>
                  <span class="ml-2 text-slate-900">{{ appointmentSummary.vehicleInfo }}</span>
                </div>
                <div v-if="appointmentSummary.visitNotes">
                  <span class="font-medium text-slate-700">Visit Notes:</span>
                  <span class="ml-2 text-slate-900">{{ appointmentSummary.visitNotes }}</span>
                </div>
              </div>
            </div>
          </div>

          <div class="text-center pt-4">
            <p class="text-sm text-slate-500">
              This window will close automatically in {{ countdown }} seconds...
            </p>
            <div class="mt-3 flex items-center justify-center gap-2">
              <Button v-if="mode === 'app'" variant="outline" @click="emit('close')">Close Scheduler</Button>
              <Button v-else variant="outline" @click="resetToServiceSelection">Book Another Appointment</Button>
            </div>
          </div>
        </CardContent>
      </Card>
        </div>
    <div v-if="submissionError" class="mx-auto max-w-7xl px-3 pb-4 sm:px-4 lg:px-8">
      <div class="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">
        {{ submissionError }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick, onUnmounted, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { PhPlus, PhX } from '@phosphor-icons/vue'
import AppointmentTypeCard from '@/components/AppointmentTypeCard.vue'
import IssueTypeStep from '@/components/appointments/booking/IssueTypeStep.vue'
import FollowupQuestionsStep from '@/components/appointments/booking/FollowupQuestionsStep.vue'
import ServiceVisitInfoStep from '@/components/appointments/booking/ServiceVisitInfoStep.vue'
import PhoneVerificationStep from '@/components/appointments/booking/PhoneVerificationStep.vue'
import CustomerIdentityStep from '@/components/appointments/booking/CustomerIdentityStep.vue'
import RideNeedStep from '@/components/appointments/booking/RideNeedStep.vue'
import Calendar from '@/components/Calendar.vue'
import Button from '@/components/ui/Button.vue'
import Card from '@/components/ui/Card.vue'
import CardHeader from '@/components/ui/CardHeader.vue'
import CardContent from '@/components/ui/CardContent.vue'
import Checkbox from '@/components/ui/Checkbox.vue'
import Input from '@/components/ui/Input.vue'
import Label from '@/components/ui/Label.vue'
import ReturningCustomerLookup from '@/components/ReturningCustomerLookup.vue'
import CustomerSelection from '@/components/CustomerSelection.vue'
import CustomerListSelection from '@/components/CustomerListSelection.vue'
import CheckInForm from '@/components/CheckInForm.vue'
import type { AppointmentIssueAnswers, AppointmentType } from '@/types/appointment'
import { customerVehicleLookup, needsSelection, mapCustomerDataToForm } from '@/lib/customer-api'
import { sendAppointment } from '@/api/appointments'
import { sendPhoneVerificationCode, uploadChatAttachments, verifyPhoneCode } from '@/api/chat'
import { useSessionCookie } from '@/composables/useSessionCookie'
import { useStoreContext } from '@/composables/useStoreContext'
import { formatDurationHoursMinutes } from '@/lib/appointments/duration'
import { formatTimeLabel } from '@/lib/appointments/time'
import {
  formatLocalIsoDate,
  isShopOpenSlot,
  listOpenBookingTimesForDate,
  SHOP_OPEN_START_HOUR,
} from '@/lib/appointments/shopCalendar'
import { APPOINTMENT_SERVICE_CATALOG, getServiceQuestionTree } from '@/lib/appointments/serviceQuestionTree'

const appointmentTypes = ref<AppointmentType[]>([...APPOINTMENT_SERVICE_CATALOG])

const formatDuration = (minutes: number) => formatDurationHoursMinutes(minutes)
const router = useRouter()
const props = withDefaults(
  defineProps<{
    mode?: 'app' | 'embed'
    showPageHeader?: boolean
    showCloseButton?: boolean
  }>(),
  {
    mode: 'embed',
    showPageHeader: true,
    showCloseButton: false,
  }
)
const emit = defineEmits<{
  (e: 'close'): void
  (e: 'completed', value: { mode: 'app' | 'embed' }): void
  (e: 'height-change', value: { height: number }): void
}>()
const { selectedStoreLabel } = useStoreContext()
const goToAppointmentsDashboard = () => {
  router.push('/appointments')
}

// Appointment state
const selectedService = ref<AppointmentType | null>(null)
const selectedDate = ref('')
const selectedTime = ref('')

// Cookie management for date selection
const { setCookie, getCookie } = useSessionCookie()
const COOKIE_NAME = 'appointments_selected_date'

// Load date from cookie on mount
onMounted(() => {
  const savedDate = getCookie(COOKIE_NAME)
  if (savedDate) {
    selectedDate.value = savedDate
  }
})

// Save date to cookie when it changes
watch(selectedDate, (newDate) => {
  if (newDate) {
    setCookie(COOKIE_NAME, newDate)
  }
})
const showAdditionalServices = ref(false)
const selectedAdditionalServices = ref<string[]>([])
const serviceDescription = ref('')
const additionalServicesRef = ref<HTMLElement | null>(null)
const showCalendar = ref(false)
const isDropoff = ref(true) // Default to Dropoff
const showTimeDropdown = ref(false)
const selectedTimeDisplay = ref('')

// Component refs
const customerListSelectionRef = ref<InstanceType<typeof CustomerListSelection> | null>(null)
const customerSelectionRef = ref<InstanceType<typeof CustomerSelection> | null>(null)
const checkInFormRef = ref<InstanceType<typeof CheckInForm> | null>(null)

// Time options follow shop open bounds (see shopCalendar.ts; per-store later)
const timeOptions = computed(() => {
  const options: Array<{ label: string; value: string }> = []
  const now = new Date()
  const today = formatLocalIsoDate(now)
  const dateKey = selectedDate.value || today
  const isToday = dateKey === today

  if (!isToday || (isToday && now.getHours() < SHOP_OPEN_START_HOUR)) {
    options.push({ label: 'AM dropoff', value: 'am-dropoff' })
  }

  for (const time24 of listOpenBookingTimesForDate(dateKey, now)) {
    options.push({
      label: formatTimeLabel(time24),
      value: time24,
    })
  }

  return options
})

// Get minimum date (today)
const minDate = computed(() => formatLocalIsoDate(new Date()))

// Get available additional services (all services except the selected one)
const availableAdditionalServices = computed(() => {
  if (!selectedService.value) return appointmentTypes.value
  return appointmentTypes.value.filter(service => service.id !== selectedService.value?.id)
})

const selectedServiceQuestionTree = computed(() => {
  if (!selectedService.value) return null
  return getServiceQuestionTree(selectedService.value.id)
})

const handleServiceSelect = (service: AppointmentType) => {
  selectedService.value = service
  selectedDate.value = minDate.value

  const now = new Date()
  const slots = listOpenBookingTimesForDate(minDate.value, now)
  const time24 = slots[0] ?? `${String(SHOP_OPEN_START_HOUR).padStart(2, '0')}:00`
  selectedTime.value = time24
  selectedTimeDisplay.value = formatTimeLabel(time24)
  
  selectedAdditionalServices.value = []
  showAdditionalServices.value = false
  serviceDescription.value = '' // Clear description when selecting a new service
  showCalendar.value = false
  showTimeDropdown.value = false
  isDropoff.value = true // Default to Dropoff
  selectedIssueType.value = ''
  followupAnswers.value = {}
  additionalVisitNotes.value = ''
  visitAttachmentFiles.value = []
  uploadedVisitAttachments.value = []
  phoneForVerification.value = ''
  smsOptIn.value = false
  otpCode.value = ''
  otpCodeSent.value = false
  otpVerified.value = false
  otpErrorMessage.value = ''
  customerIdentityForm.value = {
    name: '',
    email: '',
    address: { street: '', city: '', state: '', zip: '' },
  }
  needsRide.value = null
  appointmentStep.value = 'issueType'
}

const selectTime = (value: string) => {
  if (value === 'am-dropoff') {
    selectedTime.value = 'am-dropoff'
    selectedTimeDisplay.value = 'AM dropoff'
    isDropoff.value = true // Force dropoff when AM dropoff is selected
  } else {
    selectedTime.value = value
    // Find the display label for this time
    const option = timeOptions.value.find(opt => opt.value === value)
    selectedTimeDisplay.value = option?.label || value
    // If switching away from AM dropoff, keep current dropoff/wait state
  }
  showTimeDropdown.value = false
}

const handleTimeInput = (event: Event) => {
  const input = event.target as HTMLInputElement
  const value = input.value
  
  // Allow typing, but validate format
  selectedTimeDisplay.value = value
  
  // Try to parse the input
  const timeMatch = value.match(/(\d{1,2}):?(\d{2})?\s*(AM|PM|am|pm)?/i)
  if (timeMatch) {
    let hour = parseInt(timeMatch[1])
    const minute = timeMatch[2] ? parseInt(timeMatch[2]) : 0
    const ampm = timeMatch[3]?.toUpperCase()
    
    // Validate minute is 0 or 30
    if (minute !== 0 && minute !== 30) {
      return // Invalid minute
    }
    
    // Convert to 24-hour format
    if (ampm === 'PM' && hour !== 12) {
      hour += 12
    } else if (ampm === 'AM' && hour === 12) {
      hour = 0
    }
    
    const hour24Str = hour.toString().padStart(2, '0')
    const minuteStr = minute.toString().padStart(2, '0')
    const time24 = `${hour24Str}:${minuteStr}`
    if (!isShopOpenSlot(time24)) {
      return
    }
    const now = new Date()
    const today = formatLocalIsoDate(now)
    if (selectedDate.value === today) {
      const currentHour = now.getHours()
      const currentMinute = now.getMinutes()
      if (hour < currentHour || (hour === currentHour && minute < currentMinute)) {
        return
      }
    }
    selectedTime.value = time24
  }
}

const handleTimeBlur = () => {
  // Close dropdown after a short delay to allow click events
  setTimeout(() => {
    showTimeDropdown.value = false
  }, 200)
  
  // Validate and format the input on blur
  if (selectedTimeDisplay.value && selectedTimeDisplay.value !== 'AM dropoff') {
    const timeMatch = selectedTimeDisplay.value.match(/(\d{1,2}):?(\d{2})?\s*(AM|PM|am|pm)?/i)
    if (timeMatch) {
      let hour = parseInt(timeMatch[1])
      const minute = timeMatch[2] ? parseInt(timeMatch[2]) : 0
      const ampm = timeMatch[3]?.toUpperCase()
      
      // Convert to 24-hour format
      if (ampm === 'PM' && hour !== 12) {
        hour += 12
      } else if (ampm === 'AM' && hour === 12) {
        hour = 0
      }
      
      const hour24Str = hour.toString().padStart(2, '0')
      const minuteStr = minute.toString().padStart(2, '0')
      const time24 = `${hour24Str}:${minuteStr}`
      if (
        (minute === 0 || minute === 30) &&
        isShopOpenSlot(time24)
      ) {
        const now = new Date()
        const today = formatLocalIsoDate(now)
        if (selectedDate.value === today) {
          const currentHour = now.getHours()
          const currentMinute = now.getMinutes()
          if (hour < currentHour || (hour === currentHour && minute < currentMinute)) {
            const option = timeOptions.value.find(opt => opt.value === selectedTime.value)
            selectedTimeDisplay.value = option?.label || ''
            return
          }
        }

        selectedTime.value = time24
        const hour12 = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour
        const ampmDisplay = hour < 12 ? 'AM' : 'PM'
        selectedTimeDisplay.value = `${hour12}:${minuteStr} ${ampmDisplay}`
      } else {
        // Invalid time, reset to last valid value
        const option = timeOptions.value.find(opt => opt.value === selectedTime.value)
        selectedTimeDisplay.value = option?.label || ''
      }
    }
  }
}

const formatDateDisplay = (dateString: string) => {
  if (!dateString) return ''
  // Parse as local date to avoid timezone issues
  const [y, m, d] = dateString.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

const handleDateSelect = (dateString: string) => {
  selectedDate.value = dateString
  // Close calendar after selection
  
  const now = new Date()
  const today = formatLocalIsoDate(now)

  const [y, m, d] = dateString.split('-').map(Number)
  const selectedDateObj = new Date(y, m - 1, d)
  const todayObj = new Date(now.getFullYear(), now.getMonth(), now.getDate())

  if (selectedDateObj > todayObj) {
    selectedTime.value = 'am-dropoff'
    selectedTimeDisplay.value = 'AM dropoff'
    isDropoff.value = true
  } else if (dateString === today && selectedTime.value && selectedTime.value !== 'am-dropoff') {
    const [hourStr, minuteStr] = selectedTime.value.split(':')
    const hour = parseInt(hourStr)
    const minute = parseInt(minuteStr)
    const currentHour = now.getHours()
    const currentMinute = now.getMinutes()
    
    if (hour < currentHour || (hour === currentHour && minute < currentMinute)) {
      // Selected time is in the past, reset to first available time
      const firstAvailableTime = timeOptions.value.find(opt => opt.value !== 'am-dropoff')
      if (firstAvailableTime) {
        selectedTime.value = firstAvailableTime.value
        selectedTimeDisplay.value = firstAvailableTime.label
      } else {
        // If no times available, default to AM dropoff
        selectedTime.value = 'am-dropoff'
        selectedTimeDisplay.value = 'AM dropoff'
      }
    }
  }
  
  showCalendar.value = false
}

const toggleAdditionalService = (serviceId: string, checked: boolean) => {
  if (checked) {
    if (!selectedAdditionalServices.value.includes(serviceId)) {
      selectedAdditionalServices.value.push(serviceId)
    }
  } else {
    selectedAdditionalServices.value = selectedAdditionalServices.value.filter(id => id !== serviceId)
  }
}

const getServiceName = (serviceId: string) => {
  const service = appointmentTypes.value.find(s => s.id === serviceId)
  return service?.name || serviceId
}

// Auto-scroll to additional services when opened on mobile
watch(showAdditionalServices, async (isOpen) => {
  if (isOpen && additionalServicesRef.value) {
    await nextTick()
    // Check if mobile (viewport width < 640px, which is Tailwind's sm breakpoint)
    const isMobile = window.innerWidth < 640
    if (isMobile) {
      additionalServicesRef.value.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      })
    }
  }
})

const resetToServiceSelection = () => {
  // Clear summary timer if it exists
  if (summaryTimer) {
    clearInterval(summaryTimer)
    summaryTimer = null
  }
  
  selectedService.value = null
  selectedDate.value = ''
  selectedTime.value = ''
  selectedTimeDisplay.value = ''
  selectedAdditionalServices.value = []
  showAdditionalServices.value = false
  serviceDescription.value = ''
  showCalendar.value = false
  showTimeDropdown.value = false
  isDropoff.value = true // Default to Dropoff
  // Reset appointment flow
  appointmentStep.value = 'serviceSelection'
  customerData.value = null
  customerRecordForSelection.value = null
  multipleCustomers.value = []
  isReturningCustomer.value = false
  appointmentSummary.value = null
  countdown.value = 10
  isConfirmingAppointment.value = false // Reset loading state
  selectedIssueType.value = ''
  followupAnswers.value = {}
  additionalVisitNotes.value = ''
  visitAttachmentFiles.value = []
  uploadedVisitAttachments.value = []
  phoneForVerification.value = ''
  smsOptIn.value = false
  otpCode.value = ''
  otpCodeSent.value = false
  otpVerified.value = false
  otpErrorMessage.value = ''
  needsRide.value = null
  customerIdentityForm.value = {
    name: '',
    email: '',
    address: {
      street: '',
      city: '',
      state: '',
      zip: '',
    },
  }
  searchState.value = {
    searchMethod: 'phone',
    phone: '',
    email: '',
    name: '',
    licensePlate: '',
    vin: ''
  }
}

// Appointment flow state
type AppointmentStep =
  | 'serviceSelection'
  | 'issueType'
  | 'issueFollowup'
  | 'serviceVisitInfo'
  | 'phoneVerification'
  | 'haveYouBeenHere'
  | 'customerLookup'
  | 'customerSelection'
  | 'customerList'
  | 'customerForm'
  | 'customerIdentity'
  | 'customerRecord'
  | 'vehicleSelection'
  | 'transportation'
  | 'booking'
  | 'rideNeed'
  | 'summary'
const appointmentStep = ref<AppointmentStep>('serviceSelection')
const isReturningCustomer = ref(false)
const customerData = ref<any>(null)
const customerRecordForSelection = ref<any>(null)
const multipleCustomers = ref<any[]>([])
const searchState = ref({
  searchMethod: 'phone',
  phone: '',
  email: '',
  name: '',
  licensePlate: '',
  vin: ''
})
const appointmentSummary = ref<any>(null)
const countdown = ref(10)
let summaryTimer: ReturnType<typeof setTimeout> | null = null
const selectedVehicleIndex = ref<number | 'new'>(0)
const isConfirmingAppointment = ref(false)
const selectedIssueType = ref('')
const followupAnswers = ref<AppointmentIssueAnswers>({})
const additionalVisitNotes = ref('')
const visitAttachmentFiles = ref<File[]>([])
const uploadedVisitAttachments = ref<Array<{ mediaUrl: string; filename: string }>>([])
const isUploadingVisitInfo = ref(false)
const phoneForVerification = ref('')
const smsOptIn = ref(false)
const otpCode = ref('')
const otpCodeSent = ref(false)
const otpVerified = ref(false)
const sendingOtpCode = ref(false)
const verifyingOtpCode = ref(false)
const otpErrorMessage = ref('')
const needsRide = ref<boolean | null>(null)
const customerIdentityForm = ref({
  name: '',
  email: '',
  address: {
    street: '',
    city: '',
    state: '',
    zip: '',
  },
})
const showAddVehicle = ref(false)
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
const submissionError = ref('')

watch(
  () => appointmentStep.value,
  () => {
    if (typeof window !== 'undefined') {
      requestAnimationFrame(() => {
        emit('height-change', { height: document.documentElement.scrollHeight })
      })
    }
  },
  { immediate: true }
)

const handleIssueTypeNext = () => {
  appointmentStep.value = 'issueFollowup'
}

const handleFollowupNext = () => {
  appointmentStep.value = 'serviceVisitInfo'
}

const handleServiceVisitInfoNext = async () => {
  if (isUploadingVisitInfo.value) return
  isUploadingVisitInfo.value = true
  try {
    if (visitAttachmentFiles.value.length > 0) {
      const uploadResult = await uploadChatAttachments(visitAttachmentFiles.value)
      if (!uploadResult.success) {
        otpErrorMessage.value = uploadResult.error || 'Failed to upload attachments'
        return
      }
      uploadedVisitAttachments.value = uploadResult.attachments.map((item) => ({
        mediaUrl: item.mediaUrl,
        filename: item.filename,
      }))
    } else {
      uploadedVisitAttachments.value = []
    }
    appointmentStep.value = 'phoneVerification'
  } finally {
    isUploadingVisitInfo.value = false
  }
}

const sendVerificationCode = async () => {
  sendingOtpCode.value = true
  otpErrorMessage.value = ''
  otpVerified.value = false
  otpCode.value = ''
  const result = await sendPhoneVerificationCode({
    phone: phoneForVerification.value,
    smsOptIn: smsOptIn.value,
  })
  sendingOtpCode.value = false
  if (!result.success) {
    otpErrorMessage.value = result.error || 'Unable to send code'
    return
  }
  otpCodeSent.value = true
}

const verifyCode = async () => {
  verifyingOtpCode.value = true
  otpErrorMessage.value = ''
  const result = await verifyPhoneCode({
    phone: phoneForVerification.value,
    code: otpCode.value,
  })
  verifyingOtpCode.value = false
  if (!result.success || !result.verified) {
    otpErrorMessage.value = result.error || 'Code verification failed'
    return
  }
  otpVerified.value = true
}

const handlePhoneVerificationNext = async () => {
  if (!otpVerified.value) return
  const lookup = await customerVehicleLookup({
    searchKey: 'PHONE',
    searchValue: phoneForVerification.value,
    exactMatch: false,
  })
  if (!lookup.success || !lookup.customers || lookup.customers.length === 0) {
    isReturningCustomer.value = false
    customerData.value = {
      name: '',
      phone: phoneForVerification.value,
      email: '',
      address: { street: '', apt: '', city: '', state: '', zip: '' },
      vehicle: {},
    }
    appointmentStep.value = 'customerIdentity'
    return
  }

  isReturningCustomer.value = true
  if (lookup.customers.length > 1) {
    handleMultipleCustomers(lookup.customers)
    return
  }
  const matched = lookup.customers[0]
  if (needsSelection(matched)) {
    handleNeedsSelection(matched)
    return
  }
  customerData.value = mapCustomerDataToForm(matched)
  appointmentStep.value = 'customerRecord'
}

const handleCustomerIdentityNext = () => {
  customerData.value = {
    ...customerData.value,
    name: customerIdentityForm.value.name,
    phone: phoneForVerification.value,
    email: customerIdentityForm.value.email,
    address: {
      street: customerIdentityForm.value.address.street,
      city: customerIdentityForm.value.address.city,
      state: customerIdentityForm.value.address.state,
      zip: customerIdentityForm.value.address.zip,
    },
  }
  selectedVehicleIndex.value = 'new'
  showAddVehicle.value = true
  appointmentStep.value = 'vehicleSelection'
}

const proceedFromSchedule = () => {
  appointmentStep.value = 'rideNeed'
}

// Legacy handlers kept for compatibility with existing template block.
const handleHaveYouBeenHereYes = () => {
  isReturningCustomer.value = true
  appointmentStep.value = 'phoneVerification'
}

const handleHaveYouBeenHereNo = () => {
  isReturningCustomer.value = false
  appointmentStep.value = 'phoneVerification'
}

const handleCustomerFound = (data: any) => {
  console.log('handleCustomerFound called with data:', data)
  customerData.value = data
  appointmentStep.value = 'customerRecord'
  console.log('Appointment step changed to customerRecord')
}

// Get available vehicles for selection
const availableVehicles = computed(() => {
  if (!customerData.value || !customerData.value._customerRecord) {
    return []
  }
  const customer = customerData.value._customerRecord
  const vehicles = customer.Vehicles || customer.vehicles || []
  return vehicles.map((v: any) => ({
    licensePlate: v.Tag || v.tag || '',
    state: v.State || v.state || '',
    year: v.Year ? String(v.Year) : (v.year ? String(v.year) : ''),
    make: v.Make || v.make || '',
    model: v.Model || v.model || '',
    vin: v.VIN || v.vin || '',
    mileage: v.Mileage ? String(v.Mileage) : (v.mileage ? String(v.mileage) : ''),
  }))
})

const handleCustomerRecordProceed = () => {
  // Always show vehicle selection
  selectedVehicleIndex.value = availableVehicles.value.length > 0 ? 0 : 'new'
  showAddVehicle.value = false
  resetNewVehicle()
  appointmentStep.value = 'vehicleSelection'
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

const handleVehicleSelectionConfirm = () => {
  // Validate new vehicle if being added
  if (selectedVehicleIndex.value === 'new') {
    validateNewVehicleYear()
    validateNewVehicleMileage()
    validateNewVehicleVin()
    if (newVehicleErrors.value.year || newVehicleErrors.value.mileage || newVehicleErrors.value.vin) {
      return
    }
  }
  
  if (!customerData.value) {
    return
  }
  
  // Update customerData with selected vehicle
  if (selectedVehicleIndex.value === 'new') {
    // Use new vehicle data
    customerData.value = {
      ...customerData.value,
      vehicle: {
        licensePlate: newVehicle.value.licensePlate || '',
        state: newVehicle.value.state || '',
        year: newVehicle.value.year || '',
        make: newVehicle.value.make || '',
        model: newVehicle.value.model || '',
        vin: newVehicle.value.vin || '',
        mileage: newVehicle.value.mileage || '',
      },
    }
  } else if (customerData.value._customerRecord) {
    // Use existing vehicle
    const customer = customerData.value._customerRecord
    const vehicles = customer.Vehicles || customer.vehicles || []
    const vehicleIndex = typeof selectedVehicleIndex.value === 'number' ? selectedVehicleIndex.value : 0
    const selectedVehicle = vehicles[vehicleIndex]
    
    if (selectedVehicle) {
      customerData.value = {
        ...customerData.value,
        vehicle: {
          licensePlate: selectedVehicle.Tag || selectedVehicle.tag || '',
          state: selectedVehicle.State || selectedVehicle.state || '',
          year: selectedVehicle.Year ? String(selectedVehicle.Year) : (selectedVehicle.year ? String(selectedVehicle.year) : ''),
          make: selectedVehicle.Make || selectedVehicle.make || '',
          model: selectedVehicle.Model || selectedVehicle.model || '',
          vin: selectedVehicle.VIN || selectedVehicle.vin || '',
          mileage: selectedVehicle.Mileage ? String(selectedVehicle.Mileage) : (selectedVehicle.mileage ? String(selectedVehicle.mileage) : ''),
        },
      }
    } else {
      // No vehicle found - set empty vehicle object
      customerData.value = {
        ...customerData.value,
        vehicle: {
          licensePlate: '',
          state: '',
          year: '',
          make: '',
          model: '',
          vin: '',
          mileage: '',
        },
      }
    }
  } else {
    // No customer record - set empty vehicle object
    customerData.value = {
      ...customerData.value,
      vehicle: {
        licensePlate: '',
        state: '',
        year: '',
        make: '',
        model: '',
        vin: '',
        mileage: '',
      },
    }
  }
  
  appointmentStep.value = 'transportation'
}

const handleNeedsSelection = (customerRecord: any) => {
  console.log('handleNeedsSelection called with customerRecord:', customerRecord)
  customerRecordForSelection.value = customerRecord
  appointmentStep.value = 'customerSelection'
  console.log('Appointment step changed to customerSelection')
}

const handleMultipleCustomers = (customers: any[]) => {
  console.log('handleMultipleCustomers called with customers:', customers?.length, customers)
  multipleCustomers.value = customers
  appointmentStep.value = 'customerList'
  console.log('Appointment step changed to customerList, multipleCustomers.value:', multipleCustomers.value)
}

const selectedCustomerFromList = ref<any>(null)

const handleCustomerListSelected = (customer: any) => {
  // Don't navigate away from the list - just store the selected customer
  // Navigation will happen when "Proceed" is clicked
  // This allows the user to change their selection before proceeding
}

const handleCustomerListSelectionChanged = (customer: any | null) => {
  // Update the selected customer when selection changes
  selectedCustomerFromList.value = customer
}

const handleCustomerListConfirm = async () => {
  // Get the selected customer from the component
  if (customerListSelectionRef.value) {
    // Get the currently selected customer
    const selectedCustomer = customerListSelectionRef.value.getSelectedCustomer()
    
    if (!selectedCustomer) {
      console.error('No customer selected')
      return
    }
    
    // Check if customer needs selection (multiple phones/emails)
    if (needsSelection(selectedCustomer)) {
      customerRecordForSelection.value = selectedCustomer
      appointmentStep.value = 'customerSelection'
      return
    }
    
    // Map customer data
    customerData.value = mapCustomerDataToForm(selectedCustomer)
    
    // Always show vehicle selection
    selectedVehicleIndex.value = availableVehicles.value.length > 0 ? 0 : 'new'
    showAddVehicle.value = false
    resetNewVehicle()
    appointmentStep.value = 'vehicleSelection'
  }
}

const handleSelectionComplete = (data: any) => {
  customerData.value = data
  appointmentStep.value = 'customerRecord'
}

const handleCustomerSelectionConfirm = async () => {
  // Get the selected data from the component
  if (customerSelectionRef.value) {
    // Trigger the selection to set customerData
    customerSelectionRef.value.handleContinue()
    
    // Wait for next tick to ensure customerData is set via the @selected event
    await nextTick()
    
    // Always show vehicle selection
    if (customerData.value) {
      selectedVehicleIndex.value = availableVehicles.value.length > 0 ? 0 : 'new'
      showAddVehicle.value = false
      resetNewVehicle()
      appointmentStep.value = 'vehicleSelection'
    }
  }
}

const handleCreateNewAccountFromLookup = (data: any) => {
  customerData.value = data
  appointmentStep.value = 'customerForm'
}

const goBack = () => {
  if (appointmentStep.value === 'rideNeed') {
    appointmentStep.value = 'booking'
  } else if (appointmentStep.value === 'booking') {
    appointmentStep.value = 'transportation'
  } else if (appointmentStep.value === 'transportation') {
    appointmentStep.value = 'vehicleSelection'
  } else if (appointmentStep.value === 'vehicleSelection') {
    if (!isReturningCustomer.value) {
      appointmentStep.value = 'customerIdentity'
      return
    }
    appointmentStep.value = 'customerRecord'
  } else if (appointmentStep.value === 'customerRecord') {
    appointmentStep.value = 'phoneVerification'
    customerData.value = null
  } else if (appointmentStep.value === 'customerIdentity') {
    appointmentStep.value = 'phoneVerification'
  } else if (appointmentStep.value === 'customerSelection') {
    if (multipleCustomers.value.length > 0) {
      appointmentStep.value = 'customerList'
    } else {
      appointmentStep.value = 'phoneVerification'
    }
  } else if (appointmentStep.value === 'customerList') {
    appointmentStep.value = 'phoneVerification'
  } else if (appointmentStep.value === 'phoneVerification') {
    appointmentStep.value = 'serviceVisitInfo'
  } else if (appointmentStep.value === 'serviceVisitInfo') {
    appointmentStep.value = 'issueFollowup'
  } else if (appointmentStep.value === 'issueFollowup') {
    appointmentStep.value = 'issueType'
  } else if (appointmentStep.value === 'issueType') {
    appointmentStep.value = 'serviceSelection'
  }
}

const handleFormCheckin = () => {
  // Get form data from CheckInForm component
  if (checkInFormRef.value) {
    const formData = checkInFormRef.value.getFormData()
    if (formData) {
      customerData.value = formData
      confirmAppointment()
    }
  } else {
    // If no form ref, proceed with existing customerData
    confirmAppointment()
  }
}

const formatTimeDisplay = (time: string) => {
  if (time === 'am-dropoff') {
    return 'AM dropoff'
  }
  const [hourStr, minuteStr] = time.split(':')
  const hour = parseInt(hourStr)
  const hour12 = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour
  const ampm = hour < 12 ? 'AM' : 'PM'
  return `${hour12}:${minuteStr} ${ampm}`
}

const buildIssueSummary = () => {
  const tree = selectedServiceQuestionTree.value
  if (!tree) return ''
  const lines: string[] = []
  const issueOption = tree.issueQuestion.options.find((opt) => opt.id === selectedIssueType.value)
  if (issueOption) {
    lines.push(`${tree.issueQuestion.prompt}: ${issueOption.label}`)
  }
  for (const question of tree.followupQuestions) {
    const answerId = followupAnswers.value[question.id]
    const option = question.options.find((opt) => opt.id === answerId)
    if (option) {
      lines.push(`${question.prompt}: ${option.label}`)
    }
  }
  if (additionalVisitNotes.value.trim()) {
    lines.push(`Additional info: ${additionalVisitNotes.value.trim()}`)
  }
  if (uploadedVisitAttachments.value.length > 0) {
    const attachmentSummary = uploadedVisitAttachments.value
      .map((file) => `${file.filename} (${file.mediaUrl})`)
      .join('; ')
    lines.push(`Attachments: ${attachmentSummary}`)
  }
  lines.push(`Ride needed: ${needsRide.value ? 'Yes' : 'No'}`)
  return lines.join('\n')
}

const confirmAppointment = async () => {
  if (!selectedService.value || !selectedDate.value || !selectedTime.value || !customerData.value) {
    console.error('Missing required appointment data')
    return
  }

  // Prevent multiple submissions
  if (isConfirmingAppointment.value) {
    return
  }

  // Set loading state
  isConfirmingAppointment.value = true

  // Determine custNum: null for new customers (said "No" to "Have You Been Here Before?" or not found via lookup)
  // Only use actual custNum if customer was found via lookup
  let custNum: number | null = null
  if (isReturningCustomer.value && customerData.value.custNum && customerData.value.custNum > 0) {
    custNum = customerData.value.custNum
  }

  // Build appointment data
  const appointmentData = {
    service: {
      id: selectedService.value.id,
      name: selectedService.value.name,
      duration: selectedService.value.duration,
    },
    serviceDescription: [selectedService.value.id === 'other' ? serviceDescription.value : '', buildIssueSummary()]
      .filter(Boolean)
      .join('\n'),
    date: selectedDate.value,
    time: selectedTime.value,
    isDropoff: isDropoff.value || selectedTime.value === 'am-dropoff',
    additionalServices: selectedAdditionalServices.value.map(id => getServiceName(id)),
    needsRide: needsRide.value === true,
    issueTypeAnswer: selectedIssueType.value,
    followupAnswers: { ...followupAnswers.value },
    uploadedAttachments: [...uploadedVisitAttachments.value],
    customer: {
      ...customerData.value,
      // Set custNum to null for new customers, otherwise use the found customer number
      custNum: custNum,
      custFirstName: customerData.value.custFirstName || customerData.value.name?.split(' ')[0] || '',
      custLastName: customerData.value.custLastName || customerData.value.name?.split(' ').slice(1).join(' ') || '',
    },
  }

  console.log('Sending appointment:', appointmentData)

  // Send appointment to point of sale
  try {
    submissionError.value = ''
    const result = await sendAppointment(appointmentData, { source: props.mode === 'embed' ? 'widget' : 'book' })
    
    if (result.success) {
      console.log('Appointment sent successfully:', result)
      
      // Build summary data
      const vehicleInfo = customerData.value.vehicle
        ? `${customerData.value.vehicle.year || ''} ${customerData.value.vehicle.make || ''} ${customerData.value.vehicle.model || ''}`.trim()
        : null
      
      appointmentSummary.value = {
        serviceName: selectedService.value.name,
        additionalServices: selectedAdditionalServices.value.length > 0 
          ? selectedAdditionalServices.value.map(id => getServiceName(id))
          : null,
        dateFormatted: formatDateDisplay(selectedDate.value),
        timeFormatted: formatTimeDisplay(selectedTime.value),
        serviceType: isDropoff.value ? 'Dropoff' : 'Wait',
        needsRide: needsRide.value ? 'Yes' : 'No',
        customerName: customerData.value.name || '',
        customerPhone: customerData.value.phone || null,
        customerEmail: customerData.value.email || null,
        vehicleInfo: vehicleInfo || null,
        visitNotes: additionalVisitNotes.value || null,
      }
      
      // Show summary step
      appointmentStep.value = 'summary'
      emit('completed', { mode: props.mode })
      countdown.value = 10
      
      // Start countdown timer
      startSummaryCountdown()
    } else {
      console.error('Failed to send appointment:', result.error)
      submissionError.value = `Failed to send appointment: ${result.error || 'Unknown error'}`
    }
  } catch (error: any) {
    console.error('Error sending appointment:', error)
    submissionError.value = `Error sending appointment: ${error.message || 'Unknown error'}`
  } finally {
    // Reset loading state
    isConfirmingAppointment.value = false
  }
}

const startSummaryCountdown = () => {
  // Clear any existing timer
  if (summaryTimer) {
    clearInterval(summaryTimer)
  }
  
  // Update countdown every second
  summaryTimer = setInterval(() => {
    countdown.value--
    
    if (countdown.value <= 0) {
      // Clear timer and reset
      if (summaryTimer) {
        clearInterval(summaryTimer)
        summaryTimer = null
      }
      resetToServiceSelection()
    }
  }, 1000)
}

onUnmounted(() => {
  // Clean up timer on component unmount
  if (summaryTimer) {
    clearInterval(summaryTimer)
    summaryTimer = null
  }
})
</script>
