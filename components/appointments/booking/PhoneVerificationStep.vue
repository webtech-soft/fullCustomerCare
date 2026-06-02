<template>
  <Card>
    <CardContent class="space-y-6 p-6">
      <div class="space-y-2">
        <h3 class="text-lg font-semibold text-slate-900">Verify your phone number</h3>
        <p class="text-sm text-slate-600">
          We will text a verification code so you can continue scheduling.
        </p>
      </div>

      <div class="space-y-4">
        <div class="space-y-2">
          <label class="text-sm font-medium text-slate-700">Phone Number</label>
          <Input
            :model-value="phone"
            placeholder="(555) 123-4567"
            @update:model-value="$emit('update:phone', $event)"
          />
        </div>

        <label class="flex items-start gap-3 rounded-md border border-slate-200 p-3">
          <Checkbox :checked="smsOptIn" @update:checked="$emit('update:smsOptIn', $event)" />
          <span class="text-sm text-slate-700">
            {{ consentLabel }}
          </span>
        </label>

        <div class="flex gap-3">
          <Button :disabled="!canSend || sendingCode" @click="$emit('send-code')">
            {{ sendingCode ? 'Sending...' : 'Send code' }}
          </Button>
          <p v-if="codeSent" class="self-center text-sm text-emerald-700">Code sent</p>
        </div>

        <div v-if="codeSent" class="space-y-2">
          <label class="text-sm font-medium text-slate-700">Verification code</label>
          <div class="flex gap-2">
            <input
              v-for="(_, index) in codeDigits"
              :key="`otp-${index}`"
              :ref="setDigitRef(index)"
              :value="codeDigits[index]"
              inputmode="numeric"
              maxlength="1"
              autocomplete="one-time-code"
              class="h-11 w-11 rounded-md border border-input bg-background text-center text-base font-semibold ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              @input="handleDigitInput(index, $event)"
              @keydown.backspace="handleBackspace(index, $event)"
              @paste="handlePaste(index, $event)"
            />
          </div>
          <p v-if="verifyingCode" class="text-sm text-slate-600">Verifying code...</p>
          <p v-if="verified" class="text-sm font-medium text-emerald-700">
            Code verified. Continuing to the next step...
          </p>
        </div>

        <p v-if="errorMessage" class="text-sm text-red-600">{{ errorMessage }}</p>
      </div>

      <div class="flex justify-end gap-3 border-t pt-4">
        <Button variant="outline" @click="$emit('back')">Back</Button>
      </div>
    </CardContent>
  </Card>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import Checkbox from '@/components/ui/Checkbox.vue'
import Card from '@/components/ui/Card.vue'
import CardContent from '@/components/ui/CardContent.vue'
import Button from '@/components/ui/Button.vue'
import Input from '@/components/ui/Input.vue'

interface Props {
  phone: string
  smsOptIn: boolean
  shopName?: string
  code: string
  codeSent: boolean
  verified: boolean
  sendingCode?: boolean
  verifyingCode?: boolean
  errorMessage?: string
}

const props = withDefaults(defineProps<Props>(), {
  sendingCode: false,
  verifyingCode: false,
  errorMessage: '',
})

const emit = defineEmits<{
  'update:phone': [value: string]
  'update:smsOptIn': [value: boolean]
  'update:code': [value: string]
  'send-code': []
  'verify-code': []
  next: []
  back: []
}>()

const canSend = computed(() => Boolean(props.phone.trim()) && props.smsOptIn)
const consentLabel = computed(() => {
  const resolvedShopName = props.shopName?.trim() || 'your selected shop'
  return `I consent to receive marketing and service-related text messages, including appointment reminders, from ${resolvedShopName}. Msg/data rates may apply. Reply STOP to opt out, HELP for help.`
})
const hasAutoContinued = ref(false)
const digitRefs = ref<Array<HTMLInputElement | null>>([])

const codeDigits = computed(() => {
  const digits = props.code.replace(/\D/g, '').slice(0, 6)
  return Array.from({ length: 6 }, (_, index) => digits[index] || '')
})

const setDigitRef = (index: number) => (element: Element | null) => {
  digitRefs.value[index] = element as HTMLInputElement | null
}

const focusDigit = (index: number) => {
  const next = digitRefs.value[index]
  if (next) next.focus()
}

const updateCodeDigits = (nextDigits: string[]) => {
  const value = nextDigits.join('').replace(/\D/g, '').slice(0, 6)
  emit('update:code', value)
}

const handleDigitInput = (index: number, event: Event) => {
  const input = event.target as HTMLInputElement
  const raw = input.value.replace(/\D/g, '')
  const nextDigits = [...codeDigits.value]
  nextDigits[index] = raw.slice(-1) || ''
  updateCodeDigits(nextDigits)
  if (raw && index < 5) {
    focusDigit(index + 1)
  }
}

const handleBackspace = (index: number, event: KeyboardEvent) => {
  if (codeDigits.value[index]) {
    return
  }
  if (index > 0) {
    event.preventDefault()
    const nextDigits = [...codeDigits.value]
    nextDigits[index - 1] = ''
    updateCodeDigits(nextDigits)
    focusDigit(index - 1)
  }
}

const handlePaste = (index: number, event: ClipboardEvent) => {
  const pasted = event.clipboardData?.getData('text') || ''
  const digits = pasted.replace(/\D/g, '').slice(0, 6 - index)
  if (!digits) return
  event.preventDefault()
  const nextDigits = [...codeDigits.value]
  digits.split('').forEach((digit, offset) => {
    nextDigits[index + offset] = digit
  })
  updateCodeDigits(nextDigits)
  const targetIndex = Math.min(index + digits.length, 5)
  focusDigit(targetIndex)
}

watch(
  () => props.code,
  (value) => {
    const normalized = value.replace(/\D/g, '')
    if (normalized.length === 6 && !props.verifyingCode && !props.verified) {
      emit('verify-code')
    }
  }
)

watch(
  () => props.verified,
  (verified) => {
    if (!verified) {
      hasAutoContinued.value = false
      return
    }
    if (hasAutoContinued.value) return
    hasAutoContinued.value = true
    setTimeout(() => emit('next'), 700)
  }
)

watch(
  () => props.codeSent,
  async (codeSent, previousCodeSent) => {
    if (!codeSent || previousCodeSent === codeSent) return
    await nextTick()
    focusDigit(0)
  }
)
</script>
