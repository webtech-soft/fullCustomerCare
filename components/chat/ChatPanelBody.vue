<template>
  <div class="flex flex-col min-h-0 flex-1">
    <div class="flex-1 min-h-0 flex flex-col gap-2 px-4 pt-2">
      <div class="flex items-center text-xs text-slate-500 px-1">
        <span v-if="loading">Loading messages…</span>
        <span v-else-if="error" class="text-red-600">Failed to load messages.</span>
      </div>

      <div
        ref="messagesContainer"
        class="flex-1 min-h-0 overflow-y-auto rounded-md bg-slate-50 border border-slate-200 px-3 py-2 space-y-2"
      >
        <div
          v-if="!loading && !error && visibleMessages.length === 0"
          class="text-xs text-slate-500 text-center py-4"
        >
          {{ emptyThreadHint }}
        </div>

        <div
          v-for="message in visibleMessages"
          :key="message.id"
          class="flex"
          :class="message.direction === 'outbound' ? 'justify-end' : 'justify-start'"
        >
          <div
            class="max-w-[80%] rounded-lg px-3 py-2 text-xs sm:text-sm shadow-sm"
            :class="messageBubbleClass(message)"
          >
            <template v-if="isEmailMessage(message)">
              <p class="font-semibold whitespace-pre-wrap break-words">
                Subject: {{ emailSubjectForDisplay(message) }}
              </p>
              <p class="mt-1 text-[11px] opacity-90 break-all">
                To: {{ emailToForDisplay(message) }}
              </p>
              <p class="mt-1 text-[10px] opacity-80">
                {{ formatEmailTimestamp(message.sentAt) }}
              </p>
              <p class="mt-1.5 whitespace-pre-wrap break-words">
                {{ emailBodyForDisplay(message) }}
              </p>
            </template>
            <template v-else>
              <p class="whitespace-pre-wrap break-words">
                {{ message.body }}
              </p>
              <p class="mt-1 text-[10px] opacity-80 text-right">
                {{ formatTimestamp(message.sentAt) }}
              </p>
            </template>
          </div>
        </div>
      </div>

      <div
        v-if="error"
        class="text-xs text-red-600 bg-red-50 border border-red-200 rounded-md px-2 py-1"
      >
        {{ error }}
      </div>
    </div>

    <div class="mt-3 pt-2 border-t border-slate-200 space-y-2 shrink-0 px-4 pb-4">
      <div class="text-xs text-slate-600 space-y-2">
        <template v-if="channel === 'sms'">
          <div v-if="editingRecipient === 'sms'" class="space-y-2">
            <label :for="smsRecipientInputId" class="sr-only">SMS recipient phone number</label>
            <input
              :id="smsRecipientInputId"
              v-model="recipientDraft"
              type="tel"
              autocomplete="tel"
              class="w-full rounded-md border border-slate-300 px-2 py-1.5 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-500"
              :aria-invalid="!!recipientEditError"
              :aria-describedby="recipientEditError ? smsRecipientErrorId : undefined"
            >
            <p
              v-if="recipientEditError"
              :id="smsRecipientErrorId"
              class="text-xs text-red-600"
              role="alert"
            >
              {{ recipientEditError }}
            </p>
            <div class="flex flex-wrap gap-2">
              <Button size="sm" type="button" @click="applySmsRecipient">
                Apply
              </Button>
              <Button size="sm" variant="outline" type="button" @click="cancelRecipientEdit">
                Cancel
              </Button>
            </div>
          </div>
          <div v-else class="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span v-if="hasPhone">
              Sending to:
              <span class="font-medium text-slate-900">{{ displayPhoneFormatted }}</span>
            </span>
            <span v-else class="text-red-500">No phone on file</span>
            <button
              type="button"
              class="inline-flex items-center justify-center rounded-md border border-slate-300 bg-white p-1.5 text-slate-700 touch-manipulation min-h-9 min-w-9 sm:min-h-8 sm:min-w-8 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              aria-label="Edit SMS recipient"
              @click="startEditSms"
            >
              <PhPencil :size="14" weight="regular" aria-hidden="true" />
            </button>
            <button
              v-if="overridePhone != null"
              type="button"
              class="text-xs font-medium text-slate-700 underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
              @click="resetPhoneOverride"
            >
              Use ticket phone
            </button>
          </div>
        </template>
        <template v-else>
          <div v-if="editingRecipient === 'email'" class="space-y-2">
            <label :for="emailRecipientInputId" class="sr-only">Email recipient address</label>
            <input
              :id="emailRecipientInputId"
              v-model="recipientDraft"
              type="email"
              autocomplete="email"
              class="w-full rounded-md border border-slate-300 px-2 py-1.5 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-500"
              :aria-invalid="!!recipientEditError"
              :aria-describedby="recipientEditError ? emailRecipientErrorId : undefined"
            >
            <p
              v-if="recipientEditError"
              :id="emailRecipientErrorId"
              class="text-xs text-red-600"
              role="alert"
            >
              {{ recipientEditError }}
            </p>
            <div class="flex flex-wrap gap-2">
              <Button size="sm" type="button" @click="applyEmailRecipient">
                Apply
              </Button>
              <Button size="sm" variant="outline" type="button" @click="cancelRecipientEdit">
                Cancel
              </Button>
            </div>
          </div>
          <div v-else class="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span v-if="hasEmail">
              Sending to:
              <span class="font-medium text-slate-900">{{ effectiveEmail }}</span>
            </span>
            <span v-else class="text-red-500">No email on file</span>
            <button
              type="button"
              class="inline-flex items-center justify-center rounded-md border border-slate-300 bg-white p-1.5 text-slate-700 touch-manipulation min-h-9 min-w-9 sm:min-h-8 sm:min-w-8 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              aria-label="Edit email recipient"
              @click="startEditEmail"
            >
              <PhPencil :size="14" weight="regular" aria-hidden="true" />
            </button>
            <button
              v-if="overrideEmail != null"
              type="button"
              class="text-xs font-medium text-slate-700 underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
              @click="resetEmailOverride"
            >
              Use ticket email
            </button>
          </div>
        </template>
      </div>
      <div
        class="flex flex-wrap items-center gap-2 text-xs text-slate-500"
        role="group"
        aria-label="Message channel"
        data-onboarding="ticket-chat-channel"
      >
        <span>Channel:</span>
        <button
          type="button"
          class="inline-flex items-center justify-center rounded-full border text-xs font-medium touch-manipulation disabled:opacity-50 disabled:pointer-events-none min-h-[44px] min-w-[44px] px-4 sm:min-h-9 sm:min-w-0 sm:px-3 sm:py-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          :class="channel === 'sms'
            ? 'bg-slate-900 text-white border-slate-900'
            : 'bg-white text-slate-700 border-slate-300'"
          :disabled="!hasPhone"
          :aria-pressed="channel === 'sms'"
          @click="channel = 'sms'"
        >
          SMS
        </button>
        <button
          type="button"
          class="inline-flex items-center justify-center rounded-full border text-xs font-medium touch-manipulation disabled:opacity-50 disabled:pointer-events-none min-h-[44px] min-w-[44px] px-4 sm:min-h-9 sm:min-w-0 sm:px-3 sm:py-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          :class="channel === 'email'
            ? 'bg-slate-900 text-white border-slate-900'
            : 'bg-white text-slate-700 border-slate-300'"
          :disabled="!hasEmail"
          :aria-pressed="channel === 'email'"
          @click="channel = 'email'"
        >
          Email
        </button>
      </div>
      <div v-if="channel === 'email'" class="space-y-1">
        <label class="block text-xs font-medium text-slate-600">Subject</label>
        <input
          v-model="subject"
          type="text"
          class="w-full rounded-md border border-slate-300 px-2 py-1 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-500"
          placeholder="Subject"
        >
      </div>
      <div v-if="hasQuickInserts" class="flex flex-wrap items-center gap-2 text-xs" data-onboarding="ticket-chat-quick-inserts">
        <span class="text-slate-500">Quick inserts:</span>
        <Button
          v-if="showCustomerViewQuickInserts"
          size="sm"
          variant="outline"
          class="h-7 px-2 text-xs"
          :class="quickInsertOutlineClass('customerView')"
          :disabled="!ticketNumber"
          @click="onCustomerViewQuickInsertClick"
        >
          Customer View
        </Button>
        <Button
          v-if="showCustomerViewQuickInserts"
          size="sm"
          variant="outline"
          class="h-7 px-2 text-xs"
          :class="quickInsertOutlineClass('requestApproval')"
          :disabled="!ticketNumber"
          @click="onRequestApprovalQuickInsertClick"
        >
          Request Approval
        </Button>
        <Button
          v-if="showInspectionQuickInsert"
          size="sm"
          variant="outline"
          class="h-7 px-2 text-xs"
          :disabled="inspectionQuickInsertDisabled"
          @click="onInspectionQuickInsertClick"
        >
          Inspection
        </Button>
      </div>
      <Textarea
        v-model="composerText"
        rows="3"
        placeholder="Type a message…"
        class="w-full text-sm"
        data-onboarding="ticket-chat-composer"
      />
      <div
        v-if="quickInsertText"
        class="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700 whitespace-pre-wrap break-words"
      >
        {{ quickInsertText }}
      </div>

      <div v-if="smsOversizeStash.length > 0" class="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-950 space-y-2">
        <p>
          {{ smsOversizeWarningText }}
        </p>
        <div class="flex flex-wrap items-center gap-2">
          <Button
            v-if="hasEmail"
            size="sm"
            variant="outline"
            type="button"
            class="border-amber-300 bg-white text-amber-950 hover:bg-amber-100"
            @click="switchToEmailForOversizeAttachments"
          >
            Switch to email
          </Button>
          <Button size="sm" variant="ghost" type="button" class="text-amber-900" @click="dismissSmsOversizeWarning">
            Dismiss
          </Button>
        </div>
      </div>

      <div class="flex flex-wrap items-center gap-2">
        <input
          ref="attachmentInputRef"
          type="file"
          class="sr-only"
          multiple
          :accept="CHAT_ATTACHMENT_ACCEPT_ATTR"
          @change="onAttachmentInputChange"
        >
        <Button
          v-if="channel === 'sms' && hasPhone"
          variant="outline"
          size="sm"
          type="button"
          class="shrink-0"
          @click="openAttachmentPicker"
        >
          <PhPaperclip :size="14" weight="regular" class="mr-1.5 inline-block shrink-0" aria-hidden="true" />
          Attach
        </Button>
      </div>
      <p v-if="channel === 'sms' && hasPhone" class="text-[11px] text-slate-500">
        SMS/MMS: JPEG, PNG, GIF, or PDF — max {{ smsAttachmentMaxLabel }}.
      </p>
      <p v-if="channel === 'email' && hasEmail" class="text-[11px] text-slate-500">
        Email attachments are not yet supported in SEND_EMAIL.
      </p>
      <p
        v-if="channel === 'sms' && hasPhone && pendingAttachments.length > 0 && !smsAttachmentsValid"
        class="text-[11px] text-red-600"
        role="alert"
      >
        MMS limit exceeded: message text plus attachments must be ≤ 5 MB (up to {{ MMS_MAX_FILE_COUNT }} files).
      </p>
      <p
        v-if="channel === 'sms' && hasPhone && smsHasPdfAttachment"
        class="text-[11px] text-amber-800"
      >
        PDF may not open in every MMS app; use Email if the customer has trouble.
      </p>
      <p
        v-if="channel === 'email' && hasEmail && pendingAttachments.length > 0 && !emailAttachmentsValid"
        class="text-[11px] text-red-600"
        role="alert"
      >
        Email attachments exceed {{ emailAttachmentMaxLabel }} or {{ EMAIL_MAX_FILE_COUNT }} files.
      </p>
      <ul v-if="pendingAttachments.length > 0" class="flex flex-col gap-1 text-xs text-slate-700">
        <li
          v-for="(file, idx) in pendingAttachments"
          :key="`${file.name}-${file.size}-${idx}`"
          class="flex items-center justify-between gap-2 rounded border border-slate-200 bg-slate-50 px-2 py-1"
        >
          <span class="truncate" :title="file.name">{{ file.name }} ({{ formatFileSize(file.size) }})</span>
          <button
            type="button"
            class="shrink-0 text-slate-600 underline text-[11px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
            @click="removeAttachment(idx)"
          >
            Remove
          </button>
        </li>
      </ul>
      <div class="flex flex-wrap items-center justify-between gap-2">
        <div class="flex items-center gap-2">
          <Button variant="outline" size="sm" @click="emit('cancel')">
            Cancel
          </Button>
          <Button
            variant="brand"
            size="sm"
            :disabled="sending || !canSend"
            @click="handleSend"
          >
            <span v-if="sending" class="w-3.5 h-3.5 mr-2 border-2 border-white border-t-transparent rounded-full animate-spin inline-block" />
            <span>Send</span>
          </Button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, onUpdated, ref, watch } from 'vue'
import { PhPaperclip, PhPencil } from '@phosphor-icons/vue'
import Button from '@/components/ui/Button.vue'
import Textarea from '@/components/ui/Textarea.vue'
import type { ChatMessage } from '@/types/chat'
import type { TicketType } from '@/types/ticket'
import {
  buildSendEmailRequest,
  fetchChatHistoryByPhone,
  sendChatMessage,
  sendEmail,
  uploadChatAttachments,
} from '@/api/chat'
import { getInvoiceTypeLabel } from '@/lib/invoice-line-items'
import {
  CHAT_ATTACHMENT_ACCEPT_ATTR,
  EMAIL_ATTACHMENTS_TOTAL_MAX_BYTES,
  EMAIL_MAX_FILE_COUNT,
  isAllowedChatAttachmentMime,
  MMS_MAX_FILE_COUNT,
  MMS_TOTAL_MAX_BYTES,
  mmsTotalBytes,
  partitionFilesByMime,
} from '@/lib/chat-attachment-policy'
import { buildTicketsTourDemoChatThread } from '@/lib/tickets-tour-demo'
import { formatPhoneNumber, normalizeUsPhoneTenDigits, validateEmail } from '@/lib/validation'

export type ChatPanelBootstrap = null | 'customerView' | 'requestApproval'

export type ChatQuickInsertKind = 'customerView' | 'requestApproval' | 'inspection'

export type ChatQuickInsertHighlight = 'customerView' | 'requestApproval' | null

const smsRecipientInputId = 'ticket-chat-recipient-sms'
const smsRecipientErrorId = 'ticket-chat-recipient-sms-err'
const emailRecipientInputId = 'ticket-chat-recipient-email'
const emailRecipientErrorId = 'ticket-chat-recipient-email-err'

const smsAttachmentMaxLabel = `${Math.round(MMS_TOTAL_MAX_BYTES / (1024 * 1024))} MB total (text + files)`
const emailAttachmentMaxLabel = `${Math.round(EMAIL_ATTACHMENTS_TOTAL_MAX_BYTES / (1024 * 1024))} MB total`

const props = defineProps<{
  /** When true, chat loads/refreshes for the current phone (e.g. drawer tab active). */
  active: boolean
  phone?: string
  customerName?: string
  ticketNumber?: number
  ticketType?: TicketType
  inspectionId?: string
  email?: string
  /** Shop/store display name used in customer-view email subject prefill. */
  shopName?: string
  /** Display vehicle for approval-request message (e.g. year make model). */
  vehicleDisplay?: string
  /** One-shot action when switching to chat from the ticket View tab. */
  pendingChatBootstrap?: ChatPanelBootstrap
  /** Highlights the matching quick-insert (e.g. after opening chat from the View tab). */
  highlightedQuickInsert?: ChatQuickInsertHighlight
  /**
   * When true, skip fetching SMS history (e.g. tickets onboarding Chat step) so API failures
   * don’t show error banners—thread shows the normal empty state instead.
   */
  suppressChatHistoryFetch?: boolean
}>()

const emit = defineEmits<{
  cancel: []
  'message-sent': [message: ChatMessage]
  loading: [value: boolean]
  'bootstrap-consumed': []
  'quick-insert-interaction': [kind: ChatQuickInsertKind]
}>()

const messages = ref<ChatMessage[]>([])
const loading = ref(false)
const error = ref<string | null>(null)
const composerText = ref('')
const quickInsertText = ref('')
const sending = ref(false)
const channel = ref<'sms' | 'email'>('sms')
const messagesContainer = ref<HTMLElement | null>(null)

const subject = ref('')
const canInsertCustomerView = ref(false)

const attachmentInputRef = ref<HTMLInputElement | null>(null)
const pendingAttachments = ref<File[]>([])
/** Files that exceeded the SMS size limit; offered for email or dismiss. */
const smsOversizeStash = ref<File[]>([])

const overridePhone = ref<string | null>(null)
const overrideEmail = ref<string | null>(null)
const editingRecipient = ref<null | 'sms' | 'email'>(null)
const recipientDraft = ref('')
const recipientEditError = ref<string | null>(null)
const lastAppliedQuickInsertComposerText = ref<string | null>(null)

const normalizedPropPhone = computed(
  () => normalizeUsPhoneTenDigits(props.phone ?? '') ?? '',
)

const effectivePhone = computed(() => {
  if (overridePhone.value !== null) return overridePhone.value
  return normalizedPropPhone.value
})

const effectiveEmail = computed(() => {
  if (overrideEmail.value !== null) return overrideEmail.value.trim()
  return (props.email ?? '').trim()
})

const hasPhone = computed(() => effectivePhone.value.length === 10)
const hasEmail = computed(() => effectiveEmail.value.length > 0)

const smsOversizeWarningText = computed(() => {
  if (smsOversizeStash.value.length === 0) return ''
  const list = smsOversizeStash.value.map((f) => `“${f.name}”`).join(', ')
  return `One or more files exceed the per-file ${Math.round(MMS_TOTAL_MAX_BYTES / (1024 * 1024))} MB MMS cap: ${list}. Switch to email to include them, or dismiss to drop them.`
})

/** UTF-8 length of outbound body (counts toward Twilio 5 MB MMS bundle). */
const composedBodyUtf8Bytes = computed(() =>
  new TextEncoder().encode(
    [composerText.value.trim(), quickInsertText.value.trim()].filter(Boolean).join('\n\n'),
  ).length,
)

const smsHasPdfAttachment = computed(
  () =>
    channel.value === 'sms'
    && pendingAttachments.value.some(
      (f) =>
        f.type === 'application/pdf'
        || f.name.toLowerCase().endsWith('.pdf'),
    ),
)

const smsAttachmentsValid = computed(() => {
  if (channel.value !== 'sms') return true
  const files = pendingAttachments.value
  if (files.length === 0) return true
  if (files.length > MMS_MAX_FILE_COUNT) return false
  for (const f of files) {
    if (!isAllowedChatAttachmentMime(f.type)) return false
    if (f.size > MMS_TOTAL_MAX_BYTES) return false
  }
  return composedBodyUtf8Bytes.value + mmsTotalBytes(files) <= MMS_TOTAL_MAX_BYTES
})

const emailAttachmentsValid = computed(() => {
  if (channel.value !== 'email') return true
  const files = pendingAttachments.value
  return files.length === 0
})

const displayPhoneFormatted = computed(() => {
  if (!hasPhone.value) return ''
  return formatPhoneNumber(effectivePhone.value)
})

const approvalVehicleLabel = computed(() => {
  const v = props.vehicleDisplay?.trim()
  return v && v.length > 0 ? v : 'vehicle'
})

const canInsertInspection = computed(() => !!props.inspectionId && props.inspectionId.trim().length > 0)
/** During tickets tour, history fetch is skipped; still show quick inserts so the step matches the copy. */
const tourShowsQuickInserts = computed(
  () => !!props.suppressChatHistoryFetch && props.ticketNumber != null,
)
const hasQuickInserts = computed(
  () => canInsertCustomerView.value || canInsertInspection.value || tourShowsQuickInserts.value,
)
const showCustomerViewQuickInserts = computed(
  () => canInsertCustomerView.value || tourShowsQuickInserts.value,
)
const showInspectionQuickInsert = computed(
  () => canInsertInspection.value || tourShowsQuickInserts.value,
)
const inspectionQuickInsertDisabled = computed(
  () => !canInsertInspection.value && !tourShowsQuickInserts.value,
)

function quickInsertOutlineClass(which: 'customerView' | 'requestApproval') {
  const base = 'h-7 px-2 transition-shadow'
  if (props.highlightedQuickInsert === which) {
    return `${base} ring-2 ring-slate-900 ring-offset-1 border-slate-900 bg-slate-50 font-medium shadow-sm`
  }
  return base
}

const emptyThreadHint = computed(() => {
  if (channel.value === 'email') {
    return 'No email history for this contact.'
  }
  if (hasPhone.value) return 'No previous messages for this number.'
  return 'No SMS history for this contact. Use Email to send a message.'
})

const visibleMessages = computed(() => {
  if (channel.value === 'email') {
    return messages.value.filter((message) => isEmailMessage(message))
  }
  return messages.value.filter((message) => !isEmailMessage(message))
})

const canSend = computed(() => {
  const bodyOk =
    composerText.value.trim().length > 0
    || quickInsertText.value.trim().length > 0
    || pendingAttachments.value.length > 0
  if (channel.value === 'sms') {
    return (
      bodyOk
      && hasPhone.value
      && !sending.value
      && smsAttachmentsValid.value
    )
  }
  return (
    bodyOk
    && hasEmail.value
    && subject.value.trim().length > 0
    && !sending.value
    && emailAttachmentsValid.value
  )
})

function formatTimestamp(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function formatEmailTimestamp(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function isEmailMessage(message: ChatMessage) {
  return message.channel === 'email' || !!message.emailTo || message.body.startsWith('(Email to ')
}

function emailSubjectForDisplay(message: ChatMessage) {
  const trimmed = message.emailSubject?.trim()
  return trimmed && trimmed.length > 0 ? trimmed : 'No subject'
}

function emailToForDisplay(message: ChatMessage) {
  const explicit = message.emailTo?.trim()
  if (explicit && explicit.length > 0) return explicit
  const legacy = message.body.match(/^\(Email to ([^)]+)\)/)
  return legacy?.[1]?.trim() || 'Unknown recipient'
}

function emailBodyForDisplay(message: ChatMessage) {
  if (!message.body.startsWith('(Email to ')) return message.body
  return message.body.replace(/^\(Email to [^)]+\)\n*/u, '')
}

function messageBubbleClass(message: ChatMessage) {
  if (message.direction === 'outbound') {
    return isEmailMessage(message)
      ? 'bg-blue-500 text-white'
      : 'bg-brand-accent text-brand-accent-foreground'
  }
  return isEmailMessage(message)
    ? 'bg-blue-50 text-slate-900 border border-blue-200'
    : 'bg-white text-slate-900 border border-slate-200'
}

function applyDefaultChannel() {
  if (!hasPhone.value && hasEmail.value) {
    channel.value = 'email'
  } else if (hasPhone.value && !hasEmail.value) {
    channel.value = 'sms'
  } else if (hasPhone.value && hasEmail.value) {
    channel.value = 'sms'
  }
}

function clearRecipientOverrides() {
  overridePhone.value = null
  overrideEmail.value = null
}

function clearRecipientEditUi() {
  editingRecipient.value = null
  recipientDraft.value = ''
  recipientEditError.value = null
}

function startEditSms() {
  editingRecipient.value = 'sms'
  recipientEditError.value = null
  recipientDraft.value = hasPhone.value ? formatPhoneNumber(effectivePhone.value) : ''
}

function startEditEmail() {
  editingRecipient.value = 'email'
  recipientEditError.value = null
  recipientDraft.value = hasEmail.value ? effectiveEmail.value : ''
}

function cancelRecipientEdit() {
  clearRecipientEditUi()
}

function applySmsRecipient() {
  const normalized = normalizeUsPhoneTenDigits(recipientDraft.value)
  if (!normalized) {
    recipientEditError.value = 'Enter a valid 10-digit US phone number'
    return
  }
  overridePhone.value = normalized
  clearRecipientEditUi()
  messages.value = []
  composerText.value = ''
  quickInsertText.value = ''
  void loadMessages()
}

function applyEmailRecipient() {
  const t = recipientDraft.value.trim()
  if (!t) {
    recipientEditError.value = 'Email is required'
    return
  }
  const result = validateEmail(t)
  if (!result.isValid) {
    recipientEditError.value = result.error ?? 'Please enter a valid email address'
    return
  }
  overrideEmail.value = t
  clearRecipientEditUi()
  messages.value = []
  composerText.value = ''
  quickInsertText.value = ''
}

function resetPhoneOverride() {
  overridePhone.value = null
  messages.value = []
  if (props.active) {
    void loadMessages()
  }
}

function resetEmailOverride() {
  overrideEmail.value = null
  messages.value = []
}

function clearAttachmentState() {
  pendingAttachments.value = []
  smsOversizeStash.value = []
  if (attachmentInputRef.value) attachmentInputRef.value.value = ''
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function openAttachmentPicker() {
  attachmentInputRef.value?.click()
}

function onAttachmentInputChange(ev: Event) {
  const input = ev.target as HTMLInputElement
  const picked = Array.from(input.files ?? [])
  input.value = ''
  if (picked.length === 0) return

  const { ok: mimeOk, rejected: mimeBad } = partitionFilesByMime(picked)
  if (mimeBad.length > 0) {
    error.value = 'Only JPEG, PNG, GIF, and PDF files are allowed.'
  }
  if (mimeOk.length === 0) return

  if (channel.value === 'email') {
    let next = [...pendingAttachments.value]
    let remaining = EMAIL_ATTACHMENTS_TOTAL_MAX_BYTES - mmsTotalBytes(next)
    const skipped: string[] = []
    for (const f of mimeOk) {
      if (next.length >= EMAIL_MAX_FILE_COUNT) {
        skipped.push(f.name)
        continue
      }
      if (f.size > remaining) {
        skipped.push(f.name)
        continue
      }
      next.push(f)
      remaining -= f.size
    }
    pendingAttachments.value = next
    if (skipped.length > 0) {
      error.value = `Some files were not added (max ${emailAttachmentMaxLabel}, ${EMAIL_MAX_FILE_COUNT} files).`
    }
    return
  }

  const text = [composerText.value.trim(), quickInsertText.value.trim()].filter(Boolean).join('\n\n')
  const bodyBytes = new TextEncoder().encode(text).length
  const room = MMS_TOTAL_MAX_BYTES - bodyBytes

  const tooBigPerFile: File[] = []
  const next: File[] = [...pendingAttachments.value]
  let used = mmsTotalBytes(next)
  const skipped: string[] = []

  for (const f of mimeOk) {
    if (f.size > MMS_TOTAL_MAX_BYTES) {
      tooBigPerFile.push(f)
      continue
    }
    if (next.length >= MMS_MAX_FILE_COUNT) {
      skipped.push(f.name)
      continue
    }
    if (used + f.size > room) {
      skipped.push(f.name)
      continue
    }
    next.push(f)
    used += f.size
  }

  pendingAttachments.value = next
  if (tooBigPerFile.length > 0) {
    smsOversizeStash.value = [...smsOversizeStash.value, ...tooBigPerFile]
  }
  if (skipped.length > 0) {
    error.value = `Some files were not added (MMS allows ${smsAttachmentMaxLabel}, including your message text).`
  }
}

function removeAttachment(index: number) {
  pendingAttachments.value = pendingAttachments.value.filter((_, i) => i !== index)
}

function dismissSmsOversizeWarning() {
  smsOversizeStash.value = []
}

function splitOversizeFromPendingForSms() {
  const ok: File[] = []
  const big: File[] = []
  for (const f of pendingAttachments.value) {
    (f.size <= MMS_TOTAL_MAX_BYTES ? ok : big).push(f)
  }
  pendingAttachments.value = ok
  if (big.length > 0) {
    smsOversizeStash.value = [...smsOversizeStash.value, ...big]
  }
}

function switchToEmailForOversizeAttachments() {
  if (!hasEmail.value) return
  error.value = 'Email attachments are not supported in SEND_EMAIL yet.'
  channel.value = 'email'
}

function contactAvailable() {
  return hasPhone.value || hasEmail.value
}

async function loadMessages() {
  if (!hasPhone.value) {
    messages.value = []
    loading.value = false
    error.value = null
    return
  }
  if (props.suppressChatHistoryFetch) {
    loading.value = false
    error.value = null
    messages.value = buildTicketsTourDemoChatThread(effectivePhone.value)
    return
  }
  loading.value = true
  error.value = null
  try {
    const result = await fetchChatHistoryByPhone(effectivePhone.value)
    messages.value = result
  } catch (err) {
    console.error('Error loading chat history:', err)
    error.value = err instanceof Error ? err.message : 'Failed to load messages'
  } finally {
    loading.value = false
  }
}

watch(
  loading,
  (v) => {
    emit('loading', v)
  },
  { immediate: true },
)

function refresh() {
  if (!loading.value && hasPhone.value) {
    void loadMessages()
  }
}

defineExpose({ refresh })

async function resolveCustomerViewQuickInsertUrl(): Promise<string> {
  if (!props.ticketNumber) return ''
  const globalAny = window as any
  const helper = typeof globalAny.generateCustomerViewUrl === 'function'
    ? globalAny.generateCustomerViewUrl
    : null

  if (!helper) {
    return `ticket #${props.ticketNumber}`
  }

  try {
    const url = await helper(props.ticketNumber)
    if (typeof url === 'string' && url.trim().length > 0) return url.trim()
  } catch {
    /* fall through */
  }
  return `ticket #${props.ticketNumber}`
}

async function resolveQuickInsertAvailability() {
  canInsertCustomerView.value = false

  if (!props.ticketNumber) return

  const globalAny = window as any
  const helper = typeof globalAny.generateCustomerViewUrl === 'function'
    ? globalAny.generateCustomerViewUrl
    : null

  if (!helper) return

  try {
    const url = await helper(props.ticketNumber)
    canInsertCustomerView.value = typeof url === 'string' && url.trim().length > 0
  } catch {
    canInsertCustomerView.value = false
  }
}

async function handleSend() {
  if (!canSend.value) return
  sending.value = true
  error.value = null
  const messageText = composerText.value.trim()
  const insertText = quickInsertText.value.trim()
  const body = [messageText, insertText].filter(Boolean).join('\n\n')
  const phoneForLog = hasPhone.value ? effectivePhone.value : '(no phone)'
  const files = [...pendingAttachments.value]
  try {
    if (channel.value === 'email') {
      if (!hasEmail.value) {
        error.value = 'No email address on file for this customer'
        return
      }
      if (files.length > 0) {
        error.value = 'Email attachments are not supported in SEND_EMAIL yet. Remove attachments to continue.'
        return
      }
      const emailSubject = subject.value.trim()
      const result = await sendEmail(buildSendEmailRequest({
        to: effectiveEmail.value,
        subject: emailSubject,
        body,
      }))
      if (!result.success) {
        error.value = result.error ?? 'Failed to send email'
        return
      }
      const nowIso = new Date().toISOString()
      const emailMessage: ChatMessage = {
        id: `${nowIso}-${Math.random().toString(36).slice(2)}`,
        phone: phoneForLog,
        direction: 'outbound',
        channel: 'email',
        emailTo: effectiveEmail.value,
        emailSubject,
        body,
        sentAt: nowIso,
        status: 'sent',
      }
      messages.value = [...messages.value, emailMessage]
      emit('message-sent', emailMessage)
      composerText.value = ''
      quickInsertText.value = ''
      subject.value = ''
      clearAttachmentState()
    } else {
      let mediaUrls: string[] | undefined
      if (files.length > 0) {
        const uploaded = await uploadChatAttachments(files)
        if (!uploaded.success) {
          error.value = uploaded.error ?? 'Failed to upload attachments'
          return
        }
        mediaUrls = uploaded.attachments.map((a) => a.mediaUrl)
      }

      const result = await sendChatMessage({
        phone: effectivePhone.value,
        body,
        ticketNumber: props.ticketNumber,
        channel: 'sms',
        mediaUrls,
      })

      if (!result.success) {
        error.value = result.error ?? 'Failed to send message'
        return
      }

      const nowIso = new Date().toISOString()
      const message: ChatMessage = result.message ?? {
        id: `${nowIso}-${Math.random().toString(36).slice(2)}`,
        phone: effectivePhone.value,
        direction: 'outbound',
        body,
        sentAt: nowIso,
        status: 'sent',
      }
      messages.value = [...messages.value, message]
      emit('message-sent', message)
      composerText.value = ''
      quickInsertText.value = ''
      clearAttachmentState()
    }
  } catch (err) {
    console.error('Error sending chat message:', err)
    error.value = err instanceof Error ? err.message : 'Failed to send message'
  } finally {
    sending.value = false
  }
}

async function insertCustomerViewLink() {
  if (!props.ticketNumber) return
  applyQuickInsertEmailSubject('customerView')
  const promptText = 'Please view your work order here:'
  if (
    !composerText.value.trim()
    || composerText.value.trim() === lastAppliedQuickInsertComposerText.value
  ) {
    composerText.value = promptText
    lastAppliedQuickInsertComposerText.value = promptText
  }
  quickInsertText.value = await resolveCustomerViewQuickInsertUrl()
}

function approvalRequestComposerText() {
  return `Your ${approvalVehicleLabel.value} has a pending approval — please review using the link below.`
}

function customerViewSubjectTicketTypeLabel() {
  return getInvoiceTypeLabel(props.ticketType ?? 'I').toLowerCase()
}

function customerViewSubjectShopLabel() {
  const shop = props.shopName?.trim()
  return shop && shop.length > 0 ? shop : 'our shop'
}

function quickInsertEmailSubject(kind: ChatQuickInsertKind) {
  if (kind === 'customerView') {
    return `Your ${customerViewSubjectTicketTypeLabel()} from ${customerViewSubjectShopLabel()}`
  }
  if (kind === 'requestApproval') {
    return `Please approve work on your ${approvalVehicleLabel.value}`
  }
  return 'Your Digital Vehicle Inspection is ready to view'
}

function applyQuickInsertEmailSubject(kind: ChatQuickInsertKind) {
  subject.value = quickInsertEmailSubject(kind)
}

async function insertRequestApprovalLink() {
  if (!props.ticketNumber) return
  applyQuickInsertEmailSubject('requestApproval')
  const promptText = approvalRequestComposerText()
  if (
    !composerText.value.trim()
    || composerText.value.trim() === lastAppliedQuickInsertComposerText.value
  ) {
    composerText.value = promptText
    lastAppliedQuickInsertComposerText.value = promptText
  }
  quickInsertText.value = await resolveCustomerViewQuickInsertUrl()
}

function insertInspectionLink() {
  if (!props.ticketNumber) return
  applyQuickInsertEmailSubject('inspection')
  lastAppliedQuickInsertComposerText.value = null
  quickInsertText.value = `Please view your inspection details for ticket #${props.ticketNumber}.`
}

function onCustomerViewQuickInsertClick() {
  emit('quick-insert-interaction', 'customerView')
  void insertCustomerViewLink()
}

function onRequestApprovalQuickInsertClick() {
  emit('quick-insert-interaction', 'requestApproval')
  void insertRequestApprovalLink()
}

function onInspectionQuickInsertClick() {
  emit('quick-insert-interaction', 'inspection')
  insertInspectionLink()
}

function scrollToBottom() {
  const el = messagesContainer.value
  if (!el) return
  el.scrollTop = el.scrollHeight
}

async function runPendingBootstrap(boot: Exclude<ChatPanelBootstrap, null>) {
  if (boot === 'customerView') {
    await insertCustomerViewLink()
  } else {
    await insertRequestApprovalLink()
  }
  emit('bootstrap-consumed')
}

watch(
  () => [props.active, props.pendingChatBootstrap] as const,
  async ([active, boot]) => {
    if (!active || boot == null) return
    await nextTick()
    await runPendingBootstrap(boot)
  },
  { flush: 'post' },
)

watch(
  () => props.active,
  (active) => {
    if (!active) {
      clearRecipientOverrides()
      clearRecipientEditUi()
      clearAttachmentState()
      return
    }
    if (contactAvailable()) {
      void loadMessages()
      void resolveQuickInsertAvailability()
    }
  },
)

watch(
  () => [props.active, props.phone, props.email] as const,
  ([active]) => {
    if (active) {
      applyDefaultChannel()
    }
  },
  { flush: 'post' },
)

watch(channel, (next) => {
  clearRecipientEditUi()
  if (next === 'sms') {
    splitOversizeFromPendingForSms()
  }
})

watch(
  () => [props.phone, props.email, props.ticketNumber] as const,
  () => {
    clearRecipientOverrides()
    clearRecipientEditUi()
    clearAttachmentState()
    if (props.active && contactAvailable()) {
      void loadMessages()
      void resolveQuickInsertAvailability()
    }
  },
)

watch(
  () => props.suppressChatHistoryFetch,
  (now, prev) => {
    if (prev === true && now === false && props.active && hasPhone.value) {
      void loadMessages()
    }
  },
)

onMounted(() => {
  if (props.active) {
    applyDefaultChannel()
  }
  if (props.active && contactAvailable()) {
    void loadMessages()
    void resolveQuickInsertAvailability()
  }
})

onUpdated(() => {
  scrollToBottom()
})
</script>
