<template>
  <Dialog :model-value="modelValue" @update:model-value="$emit('update:modelValue', $event)">
    <DialogContent class="max-w-lg">
      <DialogHeader>
        <DialogTitle>Send reschedule link</DialogTitle>
      </DialogHeader>
      <div class="space-y-3 text-sm text-slate-700">
        <p class="text-xs text-slate-500">Customer will open the link and tap one of the times you offered.</p>
        <div>
          <span class="mb-1 block text-xs font-medium text-slate-600">Offered times</span>
          <ul class="list-inside list-disc text-sm">
            <li v-for="(s, i) in slots" :key="i">{{ formatSlot(s) }}</li>
          </ul>
        </div>
        <div>
          <span class="mb-1 block text-xs font-medium text-slate-600">Link</span>
          <div class="break-all rounded border border-slate-200 bg-slate-50 px-2 py-1.5 font-mono text-xs text-slate-800">
            {{ rescheduleUrl }}
          </div>
        </div>
        <label class="block">
          <span class="mb-1 block text-xs font-medium text-slate-600">Message</span>
          <textarea
            :value="message"
            rows="6"
            class="w-full rounded-md border border-slate-200 p-2 text-sm"
            @input="$emit('update:message', ($event.target as HTMLTextAreaElement).value)"
          />
        </label>
        <p v-if="sendError" class="text-xs text-red-600">{{ sendError }}</p>
      </div>
      <div class="mt-4 flex justify-end gap-2">
        <button type="button" class="rounded-md border px-3 py-2 text-sm" @click="$emit('update:modelValue', false)">
          Cancel
        </button>
        <button
          type="button"
          class="rounded-md bg-slate-900 px-3 py-2 text-sm text-white disabled:cursor-not-allowed disabled:bg-slate-400"
          :disabled="sending || !canSend"
          @click="onSend"
        >
          {{ sending ? 'Sending…' : 'Send SMS' }}
        </button>
      </div>
    </DialogContent>
  </Dialog>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import Dialog from '@/components/ui/Dialog.vue'
import DialogContent from '@/components/ui/DialogContent.vue'
import DialogHeader from '@/components/ui/DialogHeader.vue'
import DialogTitle from '@/components/ui/DialogTitle.vue'
import { formatTimeLabel } from '@/lib/appointments/time'
import { sendChatMessage } from '@/api/chat'

export interface RescheduleSlot {
  date: string
  time: string
}

const props = defineProps<{
  modelValue: boolean
  message: string
  slots: RescheduleSlot[]
  rescheduleUrl: string
  customerPhone?: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  'update:message': [value: string]
  sent: []
}>()

const sending = ref(false)
const sendError = ref('')

const digitsPhone = computed(() => (props.customerPhone || '').replace(/\D/g, ''))

const canSend = computed(() => {
  return Boolean(digitsPhone.value) && props.message.trim().length > 0
})

watch(
  () => props.modelValue,
  (open) => {
    if (open) sendError.value = ''
  }
)

function formatSlot(s: RescheduleSlot): string {
  const [y, m, d] = s.date.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  const datePart = date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
  return `${datePart} at ${formatTimeLabel(s.time)}`
}

function toSmsPhone(digits: string): string {
  if (digits.length === 10) return `+1${digits}`
  if (digits.startsWith('1') && digits.length === 11) return `+${digits}`
  if (digits.startsWith('+')) return digits
  return digits.length ? `+${digits}` : ''
}

const onSend = async () => {
  sendError.value = ''
  const phone = toSmsPhone(digitsPhone.value)
  if (!phone) {
    sendError.value = 'Customer phone is missing or invalid.'
    return
  }
  sending.value = true
  try {
    const result = await sendChatMessage({
      phone,
      body: props.message.trim(),
      channel: 'sms',
    })
    if (!result.success) {
      sendError.value = result.error || 'Failed to send SMS'
      return
    }
    emit('sent')
    emit('update:modelValue', false)
  } finally {
    sending.value = false
  }
}
</script>
