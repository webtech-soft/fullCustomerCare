/** Align with sms-server.js ALLOWED_MIME + product plan. */
export const CHAT_ATTACHMENT_MIME_ALLOWLIST = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'application/pdf',
] as const

export const CHAT_ATTACHMENT_ACCEPT_ATTR =
  'image/jpeg,image/png,image/gif,application/pdf,.jpg,.jpeg,.png,.gif,.pdf'

/** Twilio MMS bundle limit (message + all media). */
export const MMS_TOTAL_MAX_BYTES = 5 * 1024 * 1024

/** Typical provider cap for a single message (attachments + text). */
export const EMAIL_ATTACHMENTS_TOTAL_MAX_BYTES = 25 * 1024 * 1024

export const MMS_MAX_FILE_COUNT = 10
export const EMAIL_MAX_FILE_COUNT = 10

export function isAllowedChatAttachmentMime(mime: string): boolean {
  const m = mime.toLowerCase()
  return (CHAT_ATTACHMENT_MIME_ALLOWLIST as readonly string[]).includes(m)
}

export function partitionFilesByMime(files: File[]): { ok: File[]; rejected: File[] } {
  const ok: File[] = []
  const rejected: File[] = []
  for (const f of files) {
    if (isAllowedChatAttachmentMime(f.type || '')) ok.push(f)
    else rejected.push(f)
  }
  return { ok, rejected }
}

export function mmsTotalBytes(files: File[]): number {
  return files.reduce((s, f) => s + f.size, 0)
}
