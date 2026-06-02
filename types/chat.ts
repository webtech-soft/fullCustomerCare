export type ChatDirection = 'inbound' | 'outbound'
export type ChatChannel = 'sms' | 'email'

export type ChatMessageStatus = 'sent' | 'delivered' | 'failed' | 'queued'

export interface ChatAttachment {
  id?: string
  filename: string
  mimeType: string
  size?: number
  /**
   * For persisted messages this should be a URL.
   * For unsent/local files the UI can keep the File object separately.
   */
  url?: string
}

export interface ChatMessage {
  id: string
  phone: string
  direction: ChatDirection
  channel?: ChatChannel
  body: string
  emailTo?: string
  emailSubject?: string
  sentAt: string
  status?: ChatMessageStatus
  attachments?: ChatAttachment[]
}

export interface ChatHistoryQuery {
  phone: string
  pageToken?: string
}

