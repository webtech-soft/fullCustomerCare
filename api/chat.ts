import type { ChatMessage } from '@/types/chat'

const CHAT_API_BASE_URL = import.meta.env.VITE_CHAT_API_BASE_URL || ''

function getBaseUrl() {
  if (import.meta.env.DEV) {
    // In dev, force same-origin requests so Vite proxy handles /chat and /auth.
    return ''
  }
  if (!CHAT_API_BASE_URL) {
    // Fallback to same-origin; backend can be reverse-proxied in dev/prod.
    return ''
  }
  return CHAT_API_BASE_URL.replace(/\/+$/, '')
}

async function readChatApiError(response: Response): Promise<string> {
  const text = await response.text().catch(() => '')
  try {
    const j = JSON.parse(text) as { error?: string; success?: boolean }
    if (typeof j?.error === 'string' && j.error.trim()) return j.error
  } catch {
    /* ignore */
  }
  return text.trim() || `Request failed (status ${response.status})`
}

export async function fetchChatHistoryByPhone(
  phone: string,
  options?: { pageToken?: string; signal?: AbortSignal },
): Promise<ChatMessage[]> {
  const baseUrl = getBaseUrl()
  const url = new URL(`${baseUrl}/chat/history`, window.location.origin)
  url.searchParams.set('phone', phone)
  if (options?.pageToken) {
    url.searchParams.set('pageToken', options.pageToken)
  }

  const response = await fetch(url.toString(), {
    method: 'GET',
    signal: options?.signal,
    headers: {
      Accept: 'application/json',
    },
  })

  if (!response.ok) {
    throw new Error(`Failed to load chat history (status ${response.status})`)
  }

  const data = await response.json() as { messages?: ChatMessage[] }
  return data.messages ?? []
}

export interface UploadedChatAttachment {
  mediaUrl: string
  contentType: string
  size: number
  filename: string
}

export async function uploadChatAttachments(
  files: File[],
  options?: { signal?: AbortSignal },
): Promise<
  { success: true; attachments: UploadedChatAttachment[] } | { success: false; error: string }
> {
  if (files.length === 0) {
    return { success: true, attachments: [] }
  }
  const baseUrl = getBaseUrl()
  const form = new FormData()
  for (const f of files) {
    form.append('files', f)
  }
  const response = await fetch(`${baseUrl}/chat/attachments`, {
    method: 'POST',
    body: form,
    signal: options?.signal,
  })
  const text = await response.text()
  type UploadJson = {
    success?: boolean
    attachments?: UploadedChatAttachment[]
    error?: string
  }
  let data: UploadJson | null = null
  try {
    data = JSON.parse(text) as UploadJson
  } catch {
    /* non-JSON */
  }
  if (!response.ok || !data || data.success === false) {
    return {
      success: false,
      error:
        (data && typeof data.error === 'string' && data.error) ||
        text.trim() ||
        `Upload failed (status ${response.status})`,
    }
  }
  return { success: true, attachments: data.attachments ?? [] }
}

export interface SendChatMessageInput {
  phone: string
  body: string
  ticketNumber?: number
  channel?: 'sms' | 'email'
  /** Public HTTPS URLs from POST /chat/attachments (Twilio MediaUrl). */
  mediaUrls?: string[]
}

export interface SendChatMessageResult {
  success: boolean
  message?: ChatMessage
  error?: string
}

export interface SendPhoneVerificationCodeInput {
  phone: string
  smsOptIn: boolean
}

export interface PhoneVerificationResult {
  success: boolean
  verified?: boolean
  error?: string
}

export async function sendChatMessage(input: SendChatMessageInput): Promise<SendChatMessageResult> {
  const baseUrl = getBaseUrl()
  const response = await fetch(`${baseUrl}/chat/send`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      phone: input.phone,
      body: input.body,
      ticketNumber: input.ticketNumber,
      channel: input.channel ?? 'sms',
      mediaUrls: input.mediaUrls?.length ? input.mediaUrls : undefined,
    }),
  })

  if (!response.ok) {
    return {
      success: false,
      error: await readChatApiError(response),
    }
  }

  const data = (await response.json()) as {
    success?: boolean
    message?: ChatMessage
    error?: string
  }

  if (data.success === false) {
    return { success: false, error: data.error ?? 'Unknown error from chat backend' }
  }

  return {
    success: true,
    message: data.message,
  }
}

export async function sendPhoneVerificationCode(
  input: SendPhoneVerificationCodeInput,
): Promise<PhoneVerificationResult> {
  try {
    const baseUrl = getBaseUrl()
    const response = await fetch(`${baseUrl}/auth/phone/send-code`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(input),
    })

    if (!response.ok) {
      return { success: false, error: await readChatApiError(response) }
    }
    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unable to reach OTP service',
    }
  }
}

export async function verifyPhoneCode(input: {
  phone: string
  code: string
}): Promise<PhoneVerificationResult> {
  try {
    const baseUrl = getBaseUrl()
    const response = await fetch(`${baseUrl}/auth/phone/verify-code`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(input),
    })

    if (!response.ok) {
      return { success: false, error: await readChatApiError(response) }
    }
    const data = (await response.json().catch(() => null)) as { verified?: boolean } | null
    return { success: true, verified: data?.verified === true }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unable to reach OTP service',
    }
  }
}

export interface SendChatEmailInput {
  email: string
  subject: string
  body: string
  ticketNumber?: number
  attachments?: File[]
}

export interface SendChatEmailResult {
  success: boolean
  error?: string
}

export interface SendEmailRequest {
  Subject: string
  Body: string
  Signature?: string
  FromAddr?: string
  ToAddrs: string
  CCAddrs?: string
  BCCAddrs?: string
}

export interface BuildSendEmailRequestInput {
  to: string | string[]
  subject: string
  body: string
  signature?: string
  fromAddr?: string
  cc?: string | string[]
  bcc?: string | string[]
  bodyIsHtml?: boolean
  signatureIsHtml?: boolean
}

export interface SendEmailResult {
  success: boolean
  emailId?: number
  error?: string
}

function isWrappedHtml(value: string): boolean {
  const trimmed = value.trim()
  return /^<html[\s>]/i.test(trimmed) && /<\/html>\s*$/i.test(trimmed)
}

function toCsv(value?: string | string[]): string | undefined {
  if (value == null) return undefined
  if (Array.isArray(value)) {
    const joined = value
      .map((item) => item.trim())
      .filter(Boolean)
      .join(', ')
    return joined || undefined
  }
  const trimmed = value.trim()
  return trimmed || undefined
}

function toHtmlEnvelope(value: string, asHtml: boolean): string {
  const trimmed = value.trim()
  if (!trimmed) return ''
  if (!asHtml) return trimmed
  return isWrappedHtml(trimmed) ? trimmed : `<html><body>${trimmed}</body></html>`
}

export function buildSendEmailRequest(input: BuildSendEmailRequestInput): SendEmailRequest {
  const request: SendEmailRequest = {
    Subject: input.subject.trim(),
    Body: toHtmlEnvelope(input.body, input.bodyIsHtml === true),
    ToAddrs: toCsv(input.to) ?? '',
  }

  const signature = toHtmlEnvelope(input.signature ?? '', input.signatureIsHtml === true)
  if (signature) request.Signature = signature
  const fromAddr = toCsv(input.fromAddr)
  if (fromAddr) request.FromAddr = fromAddr
  const cc = toCsv(input.cc)
  if (cc) request.CCAddrs = cc
  const bcc = toCsv(input.bcc)
  if (bcc) request.BCCAddrs = bcc

  return request
}

export async function sendEmail(
  input: SendEmailRequest,
  options?: { signal?: AbortSignal },
): Promise<SendEmailResult> {
  const baseUrl = getBaseUrl()
  const response = await fetch(`${baseUrl}/email/send`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(input),
    signal: options?.signal,
  })

  if (!response.ok) {
    return {
      success: false,
      error: await readChatApiError(response),
    }
  }

  const data = (await response.json().catch(() => null)) as { EmailId?: unknown } | null
  if (!data || !Number.isInteger(data.EmailId) || (data.EmailId as number) <= 0) {
    return {
      success: false,
      error: 'SEND_EMAIL did not return a valid EmailId',
    }
  }

  return {
    success: true,
    emailId: data.EmailId as number,
  }
}

export async function sendChatEmail(input: SendChatEmailInput): Promise<SendChatEmailResult> {
  const baseUrl = getBaseUrl()
  const files = input.attachments?.filter(Boolean) ?? []

  if (files.length > 0) {
    const form = new FormData()
    form.append('email', input.email)
    form.append('subject', input.subject)
    form.append('body', input.body)
    if (input.ticketNumber != null) {
      form.append('ticketNumber', String(input.ticketNumber))
    }
    for (const f of files) {
      form.append('attachments', f)
    }
    const response = await fetch(`${baseUrl}/chat/email`, {
      method: 'POST',
      body: form,
    })
    if (!response.ok) {
      return { success: false, error: await readChatApiError(response) }
    }
    const data = (await response.json().catch(() => null)) as {
      success?: boolean
      error?: string
    } | null
    if (!data || data.success === false) {
      return {
        success: false,
        error: data?.error ?? 'Unknown error from email backend',
      }
    }
    return { success: true }
  }

  const response = await fetch(`${baseUrl}/chat/email`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      email: input.email,
      subject: input.subject,
      body: input.body,
      ticketNumber: input.ticketNumber,
    }),
  })

  if (!response.ok) {
    return { success: false, error: await readChatApiError(response) }
  }

  const data = (await response.json().catch(() => null)) as {
    success?: boolean
    error?: string
  } | null
  if (!data || data.success === false) {
    return {
      success: false,
      error: data?.error ?? 'Unknown error from email backend',
    }
  }

  return { success: true }
}
