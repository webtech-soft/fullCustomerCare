/**
 * Chat / SMS server (Twilio + optional SMTP email).
 *
 * Environment (Twilio — required for SMS/MMS):
 *   TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER
 *
 * MMS media must be fetched by Twilio over HTTPS (or public HTTP in dev only).
 *   PUBLIC_MEDIA_BASE_URL — e.g. https://api.example.com (no trailing slash).
 *   If unset, defaults to http://127.0.0.1:<PORT> (Twilio cannot reach this from the cloud).
 *
 * Upload storage:
 *   CHAT_UPLOAD_DIR — optional; default ./uploads/chat-media
 *
 * Email (SMTP — works with SendGrid, Amazon SES SMTP, Microsoft 365, etc.):
 *   SMTP_HOST — if unset, POST /chat/email returns 503.
 *   SMTP_PORT — default 587
 *   SMTP_SECURE — set "true" for port 465
 *   SMTP_USER, SMTP_PASS — omit user for unauthenticated relay (rare)
 *   EMAIL_FROM — From address (defaults to SMTP_USER)
 *
 * Limits: MMS total (body + all media) ≤ 5 MB; up to 10 media URLs (Twilio).
 * Email attachments: allowlisted types only; combined size ≤ 25 MB (align with typical providers).
 *
 * MMS file cleanup after delivery:
 *   POST /sms-status-callback — Twilio status webhook; on MessageStatus=delivered, deletes uploaded
 *   media files for that MessageSid from CHAT_UPLOAD_DIR.
 *   Set TWILIO_STATUS_CALLBACK_URL to the full public URL of this route so outbound messages.create
 *   receives status events (also configure the same URL on the Twilio number / Messaging Service).
 *   Mapping MessageSid → media IDs is in-memory only (lost on process restart).
 *
 * Appointment reschedule offers (sessionless customer links):
 *   APPOINTMENT_RESCHEDULE_STAFF_KEY — required for POST mint / GET sync / POST ack (staff SPA sends x-appointment-staff-key).
 *   APPOINTMENT_RESCHEDULE_TTL_MS — optional TTL for offers (default 7 days).
 */
import 'dotenv/config'
import express from 'express'
import fs from 'fs/promises'
import { createReadStream, mkdirSync, existsSync } from 'fs'
import path from 'path'
import { randomUUID } from 'crypto'
import twilio from 'twilio'
import TwilioMessagingResponse from 'twilio/lib/twiml/MessagingResponse.js'
import multer from 'multer'
import nodemailer from 'nodemailer'

const { MessagingResponse } = TwilioMessagingResponse

const {
  TWILIO_ACCOUNT_SID,
  TWILIO_AUTH_TOKEN,
  TWILIO_PHONE_NUMBER,
  TEST_RECIPIENT_NUMBER,
  PORT,
} = process.env

if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_PHONE_NUMBER) {
  console.warn(
    '[sms-server] Missing one or more Twilio env vars: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER',
  )
}

const client = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

/** Twilio MMS + email allowlist (PDF + images per product plan). */
const ALLOWED_MIME = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'application/pdf',
])

const MMS_MAX_TOTAL_BYTES = 5 * 1024 * 1024
const MMS_MAX_FILES = 10
const EMAIL_MAX_TOTAL_BYTES = 25 * 1024 * 1024
const EMAIL_MAX_FILES = 10
/** Per-file cap on the MMS upload endpoint (single file cannot exceed MMS bundle max). */
const MMS_UPLOAD_PER_FILE_BYTES = MMS_MAX_TOTAL_BYTES

const port = Number(PORT) || 3000

const uploadDir = process.env.CHAT_UPLOAD_DIR
  ? path.resolve(process.env.CHAT_UPLOAD_DIR)
  : path.join(process.cwd(), 'uploads', 'chat-media')

if (!existsSync(uploadDir)) {
  mkdirSync(uploadDir, { recursive: true })
}

function getPublicMediaBase() {
  const fromEnv = process.env.PUBLIC_MEDIA_BASE_URL?.trim()
  if (fromEnv) return fromEnv.replace(/\/+$/, '')
  const fallback = `http://127.0.0.1:${port}`
  console.warn(
    `[sms-server] PUBLIC_MEDIA_BASE_URL not set; using ${fallback} (Twilio cannot fetch this from the public internet).`,
  )
  return fallback
}

function safeDispositionName(original) {
  const base = path
    .basename(original || 'file')
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .slice(0, 20)
  return base.length > 0 ? base : 'file'
}

function mimeAllowed(mime) {
  return ALLOWED_MIME.has(String(mime || '').toLowerCase())
}

const mmsDiskStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadDir)
  },
  filename: (_req, _file, cb) => {
    cb(null, randomUUID())
  },
})

const uploadMmsMedia = multer({
  storage: mmsDiskStorage,
  limits: { fileSize: MMS_UPLOAD_PER_FILE_BYTES, files: MMS_MAX_FILES },
  fileFilter: (_req, file, cb) => {
    if (mimeAllowed(file.mimetype)) cb(null, true)
    else cb(new Error('Unsupported file type'))
  },
})

const emailUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: EMAIL_MAX_TOTAL_BYTES, files: EMAIL_MAX_FILES },
  fileFilter: (_req, file, cb) => {
    if (mimeAllowed(file.mimetype)) cb(null, true)
    else cb(new Error('Unsupported file type'))
  },
})

// In-memory message store: phone -> ChatMessage[]
const messagesByPhone = new Map()

/** Outbound MMS: Twilio MessageSid -> upload UUIDs (files under uploadDir) pending deletion on delivered. */
const pendingMmsMediaBySid = new Map()
/** OTP state by normalized phone (in-memory only). */
const otpSessionsByPhone = new Map()
/** Server-visible appointments for ICS export, keyed by appointment id. */
const icalAppointmentsById = new Map()

const OTP_CODE_TTL_MS = Number(process.env.OTP_CODE_TTL_MS || 10 * 60 * 1000)
const OTP_RESEND_COOLDOWN_MS = Number(process.env.OTP_RESEND_COOLDOWN_MS || 30 * 1000)
const OTP_MAX_ATTEMPTS = Number(process.env.OTP_MAX_ATTEMPTS || 5)

function normalizePhoneNumber(raw) {
  return String(raw || '').replace(/\D/g, '')
}

function formatPhoneForTwilio(raw) {
  const digits = normalizePhoneNumber(raw)
  if (digits.length === 11 && digits.startsWith('1')) {
    return `+${digits}`
  }
  if (digits.length === 10) {
    return `+1${digits}`
  }
  return null
}

function padIcs(value) {
  return String(value).padStart(2, '0')
}

function escapeIcsText(value) {
  return String(value || '')
    .replace(/\\/g, '\\\\')
    .replace(/\r\n/g, '\n')
    .replace(/\n/g, '\\n')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
}

function parseIcsLocalDateTime(requestedDate, requestedTime) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(requestedDate || ''))) return null
  if (!/^\d{2}:\d{2}$/.test(String(requestedTime || ''))) return null
  const [year, month, day] = requestedDate.split('-').map(Number)
  const [hour, minute] = requestedTime.split(':').map(Number)
  const parsed = new Date(year, month - 1, day, hour, minute, 0, 0)
  if (Number.isNaN(parsed.getTime())) return null
  return parsed
}

function toIcsUtcStamp(date) {
  const d = new Date(date)
  return `${d.getUTCFullYear()}${padIcs(d.getUTCMonth() + 1)}${padIcs(d.getUTCDate())}T${padIcs(d.getUTCHours())}${padIcs(d.getUTCMinutes())}${padIcs(d.getUTCSeconds())}Z`
}

function toIcsLocalStamp(date) {
  const d = new Date(date)
  return `${d.getFullYear()}${padIcs(d.getMonth() + 1)}${padIcs(d.getDate())}T${padIcs(d.getHours())}${padIcs(d.getMinutes())}00`
}

function buildIcsDescription(record) {
  const parts = [
    record.note ? `Notes: ${record.note}` : '',
    record.customerPhone ? `Phone: ${record.customerPhone}` : '',
    record.customerEmail ? `Email: ${record.customerEmail}` : '',
    record.bayName ? `Bay: ${record.bayName}` : '',
  ].filter(Boolean)
  return parts.join('\n')
}

function buildIcsFromCachedAppointments(records) {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//AndreoliAndAssociates//CustomerCare//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
  ]

  for (const record of records) {
    if (record.recordType !== 'booked_unconfirmed' && record.recordType !== 'confirmed') continue
    const start = parseIcsLocalDateTime(record.requestedDate, record.requestedTime)
    if (!start) continue
    const durationMinutes = Number.isFinite(Number(record.requestedDuration)) && Number(record.requestedDuration) > 0
      ? Number(record.requestedDuration)
      : 60
    const end = new Date(start.getTime() + durationMinutes * 60_000)
    const dtStamp = toIcsUtcStamp(record.updatedAt || Date.now())
    const uid = `${record.id}@customer-care-appointments`
    const summaryBase = String(record.customerName || '').trim()
    const summary = summaryBase ? `${summaryBase} - Appointment` : 'Appointment'
    const description = buildIcsDescription(record)

    lines.push('BEGIN:VEVENT')
    lines.push(`UID:${escapeIcsText(uid)}`)
    lines.push(`DTSTAMP:${dtStamp}`)
    lines.push(`DTSTART:${toIcsLocalStamp(start)}`)
    lines.push(`DTEND:${toIcsLocalStamp(end)}`)
    lines.push(`SUMMARY:${escapeIcsText(summary)}`)
    if (description) {
      lines.push(`DESCRIPTION:${escapeIcsText(description)}`)
    }
    lines.push(`STATUS:${record.status === 'confirmed' ? 'CONFIRMED' : 'TENTATIVE'}`)
    lines.push('END:VEVENT')
  }

  lines.push('END:VCALENDAR')
  return `${lines.join('\r\n')}\r\n`
}

function generateOtpCode() {
  return String(Math.floor(100000 + Math.random() * 900000))
}

async function deleteMmsMediaFiles(mediaIds) {
  for (const id of mediaIds) {
    if (!UUID_RE.test(id)) continue
    await fs.unlink(path.join(uploadDir, id)).catch(() => {})
    await fs.unlink(path.join(uploadDir, `${id}.meta.json`)).catch(() => {})
  }
}

function registerPendingMmsMedia(messageSid, mediaIds) {
  if (!messageSid || !mediaIds?.length) return
  pendingMmsMediaBySid.set(messageSid, [...mediaIds])
}

async function onTwilioMessageDelivered(messageSid) {
  const ids = pendingMmsMediaBySid.get(messageSid)
  if (!ids?.length) return
  await deleteMmsMediaFiles(ids)
  pendingMmsMediaBySid.delete(messageSid)
  console.log('[sms-server] Deleted MMS media after delivered:', messageSid, ids.length, 'file(s)')
}

function addMessage(phone, message) {
  const key = String(phone || '').trim()
  if (!key) return
  const existing = messagesByPhone.get(key) || []
  messagesByPhone.set(key, [...existing, message])
}

function getMessagesForPhone(phone) {
  const key = String(phone || '').trim()
  if (!key) return []
  const list = messagesByPhone.get(key) || []
  return [...list].sort((a, b) => new Date(a.sentAt) - new Date(b.sentAt))
}

/**
 * Resolve uploaded media IDs from public URLs we issued.
 * @param {string[]} mediaUrls
 */
async function resolveMediaItems(mediaUrls) {
  const items = []
  for (const rawUrl of mediaUrls) {
    let id = null
    try {
      const u = new URL(String(rawUrl))
      const last = u.pathname.replace(/\/+$/, '').split('/').pop()
      if (last && UUID_RE.test(last)) id = last
    } catch {
      const m = String(rawUrl).match(
        /([0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})/i,
      )
      if (m) id = m[1]
    }
    if (!id || !UUID_RE.test(id)) {
      return { ok: false, error: `Invalid media URL: ${rawUrl}` }
    }
    const filePath = path.join(uploadDir, id)
    const metaPath = path.join(uploadDir, `${id}.meta.json`)
    try {
      const metaRaw = await fs.readFile(metaPath, 'utf8')
      const meta = JSON.parse(metaRaw)
      const st = await fs.stat(filePath)
      if (!mimeAllowed(meta.mime)) {
        return { ok: false, error: `Unsupported stored media type for ${id}` }
      }
      items.push({
        id,
        path: filePath,
        size: st.size,
        mime: meta.mime,
        filename: meta.disposition || 'file',
      })
    } catch {
      return { ok: false, error: `Media not found for URL` }
    }
  }
  return { ok: true, items }
}

function getMailTransport() {
  const host = process.env.SMTP_HOST?.trim()
  if (!host) return null
  const portSmtp = Number(process.env.SMTP_PORT || 587)
  const secure = process.env.SMTP_SECURE === 'true'
  const user = process.env.SMTP_USER?.trim()
  return nodemailer.createTransport({
    host,
    port: portSmtp,
    secure,
    auth: user ? { user, pass: process.env.SMTP_PASS || '' } : undefined,
  })
}

const BASIC_EMAIL_RE = /^[^\s@<>(),]+@[^\s@<>(),]+\.[^\s@<>(),]+$/
const NAMED_EMAIL_RE = /^([^,<>\r\n]+)<([^<>\s,]+@[^<>\s,]+\.[^<>\s,]+)>$/

function splitAddressCsv(csv, fieldName) {
  if (typeof csv !== 'string' || !csv.trim()) return []
  const parts = csv.split(',')
  return parts.map((part, index) => {
    const value = part.trim()
    if (!value) {
      throw new Error(`${fieldName} contains an empty address at position ${index + 1}`)
    }
    return value
  })
}

function parseAddressToken(token, fieldName) {
  const namedMatch = token.match(NAMED_EMAIL_RE)
  if (namedMatch) {
    const name = namedMatch[1].trim()
    const address = namedMatch[2].trim()
    if (name.includes(',')) {
      throw new Error(`${fieldName} display names cannot contain commas: ${token}`)
    }
    if (!BASIC_EMAIL_RE.test(address)) {
      throw new Error(`${fieldName} has an invalid email address: ${token}`)
    }
    return name ? { name, address } : address
  }

  if (!BASIC_EMAIL_RE.test(token)) {
    throw new Error(`${fieldName} has an invalid email address: ${token}`)
  }

  return token
}

function parseAddressList(csv, fieldName) {
  const tokens = splitAddressCsv(csv, fieldName)
  return tokens.map((token) => parseAddressToken(token, fieldName))
}

function isWrappedHtml(value) {
  if (typeof value !== 'string') return false
  const trimmed = value.trim()
  return /^<html[\s>]/i.test(trimmed) && /<\/html>\s*$/i.test(trimmed)
}

function stripOuterHtmlWrapper(value) {
  const trimmed = String(value || '').trim()
  return trimmed.replace(/^<html[^>]*>/i, '').replace(/<\/html>\s*$/i, '').trim()
}

function stripHtmlTags(value) {
  return String(value || '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function toHtmlFragment(value) {
  const trimmed = String(value || '').trim()
  if (!trimmed) return ''
  if (isWrappedHtml(trimmed)) {
    return stripOuterHtmlWrapper(trimmed)
  }
  return `<p>${escapeHtml(trimmed).replace(/\r?\n/g, '<br>')}</p>`
}

function toTextSegment(value) {
  const trimmed = String(value || '').trim()
  if (!trimmed) return ''
  if (isWrappedHtml(trimmed)) {
    return stripHtmlTags(stripOuterHtmlWrapper(trimmed))
  }
  return trimmed
}

function composeEmailContent(body, signature) {
  const bodyIsHtml = isWrappedHtml(body)
  const signatureIsHtml = isWrappedHtml(signature)
  const text = [toTextSegment(body), toTextSegment(signature)].filter(Boolean).join('\n\n') || ' '
  const shouldIncludeHtml = bodyIsHtml || signatureIsHtml
  const html = shouldIncludeHtml
    ? [toHtmlFragment(body), toHtmlFragment(signature)].filter(Boolean).join('\n')
    : undefined
  return { text, html }
}

function isFromOverrideAllowed() {
  return String(process.env.EMAIL_ALLOW_FROM_OVERRIDE || 'false').trim().toLowerCase() === 'true'
}

function getDefaultSignature() {
  return String(process.env.EMAIL_DEFAULT_SIGNATURE || '')
}

function toNumericEmailId(providerMessageId) {
  const idText = String(providerMessageId || '')
  const digits = idText.match(/\d+/g)?.join('') || ''
  if (digits) {
    const candidate = Number.parseInt(digits.slice(0, 15), 10)
    if (Number.isSafeInteger(candidate) && candidate > 0) {
      return candidate
    }
  }

  const timestampTail = Date.now() % 10000000000
  const randomTail = Math.floor(Math.random() * 1000)
  return timestampTail * 1000 + randomTail
}

const app = express()

const corsAllowedOrigins = (
  process.env.CORS_ALLOWED_ORIGINS ||
  'http://localhost:3001,http://127.0.0.1:3001,http://localhost:5173,http://127.0.0.1:5173'
)
  .split(',')
  .map((value) => value.trim())
  .filter(Boolean)

function isCorsOriginAllowed(origin) {
  return corsAllowedOrigins.includes(origin)
}

app.use((req, res, next) => {
  const requestOrigin = req.headers.origin
  if (requestOrigin && isCorsOriginAllowed(requestOrigin)) {
    res.setHeader('Access-Control-Allow-Origin', requestOrigin)
    res.setHeader('Vary', 'Origin')
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept, x-appointment-staff-key')
  }

  if (req.method === 'OPTIONS') {
    res.status(204).end()
    return
  }

  next()
})

app.use(express.json())
app.use(express.urlencoded({ extended: false }))

app.get('/test-send', async (_req, res) => {
  if (!TEST_RECIPIENT_NUMBER) {
    res.status(400).json({
      success: false,
      error: 'TEST_RECIPIENT_NUMBER is not set in the environment',
    })
    return
  }

  try {
    const message = await client.messages.create({
      from: TWILIO_PHONE_NUMBER,
      to: TEST_RECIPIENT_NUMBER,
      body: 'Test SMS from local dev environment',
    })
    console.log('[sms-server] Test SMS sent, SID:', message.sid)
    res.json({ success: true, sid: message.sid })
  } catch (error) {
    console.error('[sms-server] Error sending test SMS:', error)
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    })
  }
})

app.post('/auth/phone/send-code', async (req, res) => {
  const { phone, smsOptIn } = req.body ?? {}
  const normalizedPhone = normalizePhoneNumber(phone)
  const twilioPhone = formatPhoneForTwilio(phone)

  if (!twilioPhone) {
    res.status(400).json({ success: false, error: 'Enter a valid US phone number' })
    return
  }
  if (smsOptIn !== true) {
    res.status(400).json({ success: false, error: 'SMS opt-in is required' })
    return
  }

  const now = Date.now()
  const existing = otpSessionsByPhone.get(normalizedPhone)
  if (existing && now < existing.resendAvailableAt) {
    const retryAfterSeconds = Math.ceil((existing.resendAvailableAt - now) / 1000)
    res.status(429).json({
      success: false,
      error: `Please wait ${retryAfterSeconds}s before requesting another code`,
    })
    return
  }

  const code = generateOtpCode()
  try {
    await client.messages.create({
      from: TWILIO_PHONE_NUMBER,
      to: twilioPhone,
      body: `Your verification code is ${code}. It expires in 10 minutes.`,
    })

    otpSessionsByPhone.set(normalizedPhone, {
      code,
      createdAt: now,
      expiresAt: now + OTP_CODE_TTL_MS,
      resendAvailableAt: now + OTP_RESEND_COOLDOWN_MS,
      attempts: 0,
      verified: false,
    })

    res.json({ success: true })
  } catch (error) {
    console.error('[sms-server] OTP send error:', error)
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send verification code',
    })
  }
})

app.post('/auth/phone/verify-code', (req, res) => {
  const { phone, code } = req.body ?? {}
  const normalizedPhone = normalizePhoneNumber(phone)
  const normalizedCode = String(code || '').trim()

  if (!normalizedPhone || !normalizedCode) {
    res.status(400).json({ success: false, error: 'Phone and code are required' })
    return
  }

  const session = otpSessionsByPhone.get(normalizedPhone)
  if (!session) {
    res.status(400).json({ success: false, error: 'No verification code found for this phone' })
    return
  }
  if (Date.now() > session.expiresAt) {
    otpSessionsByPhone.delete(normalizedPhone)
    res.status(400).json({ success: false, error: 'Verification code expired. Request a new code.' })
    return
  }
  if (session.attempts >= OTP_MAX_ATTEMPTS) {
    otpSessionsByPhone.delete(normalizedPhone)
    res.status(429).json({ success: false, error: 'Too many attempts. Request a new code.' })
    return
  }
  if (session.code !== normalizedCode) {
    session.attempts += 1
    otpSessionsByPhone.set(normalizedPhone, session)
    res.status(400).json({ success: false, error: 'Incorrect verification code' })
    return
  }

  otpSessionsByPhone.set(normalizedPhone, {
    ...session,
    verified: true,
    verifiedAt: Date.now(),
  })
  res.json({ success: true, verified: true })
})

/** Upload files for MMS: returns public MediaUrls for Twilio. */
app.post('/chat/attachments', (req, res, next) => {
  uploadMmsMedia.array('files', MMS_MAX_FILES)(req, res, (err) => {
    if (err) return next(err)
    void (async () => {
      const files = req.files
      if (!files?.length) {
        res.status(400).json({ success: false, error: 'No files' })
        return
      }

      const publicBase = getPublicMediaBase()
      const attachments = []

      try {
        for (const f of files) {
          const id = path.basename(f.path)
          const meta = {
            mime: f.mimetype,
            disposition: safeDispositionName(f.originalname),
            size: f.size,
          }
          await fs.writeFile(path.join(uploadDir, `${id}.meta.json`), JSON.stringify(meta), 'utf8')
          attachments.push({
            mediaUrl: `${publicBase}/chat/media/${id}`,
            contentType: f.mimetype,
            size: f.size,
            filename: meta.disposition,
          })
        }

        const total = attachments.reduce((s, a) => s + a.size, 0)
        if (total > MMS_MAX_TOTAL_BYTES) {
          for (const f of files) {
            await fs.unlink(f.path).catch(() => {})
            await fs.unlink(path.join(uploadDir, `${path.basename(f.path)}.meta.json`)).catch(() => {})
          }
          res.status(400).json({
            success: false,
            error: `Attachments exceed ${MMS_MAX_TOTAL_BYTES} bytes total (MMS limit)`,
          })
          return
        }

        res.json({ success: true, attachments })
      } catch (e) {
        console.error('[sms-server] Upload error:', e)
        for (const f of files) {
          await fs.unlink(f.path).catch(() => {})
          await fs.unlink(path.join(uploadDir, `${path.basename(f.path)}.meta.json`)).catch(() => {})
        }
        res.status(500).json({ success: false, error: 'Upload failed' })
      }
    })()
  })
})

/** Public media for Twilio GET/HEAD (Content-Type must match bytes). */
app.get('/chat/media/:id', async (req, res) => {
  const id = req.params.id
  if (!UUID_RE.test(id)) {
    res.status(404).end()
    return
  }
  const filePath = path.join(uploadDir, id)
  const metaPath = path.join(uploadDir, `${id}.meta.json`)
  try {
    const [st, metaRaw] = await Promise.all([fs.stat(filePath), fs.readFile(metaPath, 'utf8')])
    const meta = JSON.parse(metaRaw)
    res.setHeader('Content-Type', meta.mime)
    res.setHeader('Content-Disposition', `inline; filename="${meta.disposition}"`)
    res.setHeader('Content-Length', String(st.size))
    createReadStream(filePath).pipe(res)
  } catch {
    res.status(404).end()
  }
})

app.head('/chat/media/:id', async (req, res) => {
  const id = req.params.id
  if (!UUID_RE.test(id)) {
    res.status(404).end()
    return
  }
  const filePath = path.join(uploadDir, id)
  const metaPath = path.join(uploadDir, `${id}.meta.json`)
  try {
    const [st, metaRaw] = await Promise.all([fs.stat(filePath), fs.readFile(metaPath, 'utf8')])
    const meta = JSON.parse(metaRaw)
    res.setHeader('Content-Type', meta.mime)
    res.setHeader('Content-Disposition', `inline; filename="${meta.disposition}"`)
    res.setHeader('Content-Length', String(st.size))
    res.status(200).end()
  } catch {
    res.status(404).end()
  }
})

app.post('/chat/send', async (req, res) => {
  const { phone, body, ticketNumber, channel, mediaUrls } = req.body ?? {}

  if (!phone || typeof phone !== 'string' || !phone.trim()) {
    res.status(400).json({ success: false, error: 'Missing phone' })
    return
  }

  const bodyText = typeof body === 'string' ? body : ''
  const urlList = Array.isArray(mediaUrls)
    ? mediaUrls.filter((u) => typeof u === 'string' && u.trim())
    : []

  if (!bodyText.trim() && urlList.length === 0) {
    res.status(400).json({ success: false, error: 'Message body or at least one attachment is required' })
    return
  }

  const normalizedChannel = channel === 'email' ? 'email' : 'sms'

  if (normalizedChannel === 'email') {
    res.status(400).json({ success: false, error: 'Email channel not yet implemented' })
    return
  }

  if (urlList.length > MMS_MAX_FILES) {
    res.status(400).json({ success: false, error: `At most ${MMS_MAX_FILES} media files per MMS` })
    return
  }

  let mediaItems = []
  if (urlList.length > 0) {
    const resolved = await resolveMediaItems(urlList)
    if (!resolved.ok) {
      res.status(400).json({ success: false, error: resolved.error })
      return
    }
    mediaItems = resolved.items
    const mediaBytes = mediaItems.reduce((s, x) => s + x.size, 0)
    const bodyBytes = Buffer.byteLength(bodyText, 'utf8')
    if (mediaBytes + bodyBytes > MMS_MAX_TOTAL_BYTES) {
      res.status(400).json({
        success: false,
        error: 'MMS total size exceeds 5 MB (message text + all attachments)',
      })
      return
    }
  }

  try {
    const trimmedBody = bodyText.trim()
    /** Twilio accepts MMS with media; use a minimal body if text is empty. */
    const sendBody = trimmedBody || (mediaItems.length > 0 ? ' ' : '')
    const payload = {
      from: TWILIO_PHONE_NUMBER,
      to: phone,
      body: sendBody,
    }
    if (mediaItems.length > 0) {
      payload.mediaUrl = mediaItems.map((x) => `${getPublicMediaBase()}/chat/media/${x.id}`)
    }

    const statusCallbackUrl = process.env.TWILIO_STATUS_CALLBACK_URL?.trim()
    if (statusCallbackUrl) {
      payload.statusCallback = statusCallbackUrl
    }

    const message = await client.messages.create(payload)

    if (mediaItems.length > 0) {
      registerPendingMmsMedia(message.sid, mediaItems.map((x) => x.id))
    }

    const nowIso = new Date().toISOString()
    const storedMessage = {
      id: message.sid,
      phone,
      direction: 'outbound',
      body: trimmedBody,
      sentAt: nowIso,
      status: 'sent',
      ticketNumber: ticketNumber ?? null,
      attachments:
        mediaItems.length > 0
          ? mediaItems.map((x) => ({
              filename: x.filename,
              mimeType: x.mime,
              size: x.size,
              url: `${getPublicMediaBase()}/chat/media/${x.id}`,
            }))
          : undefined,
    }

    addMessage(phone, storedMessage)

    res.json({
      success: true,
      message: storedMessage,
    })
  } catch (error) {
    console.error('[sms-server] Error sending chat SMS:', error)
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    })
  }
})

app.post('/chat/email', (req, res, next) => {
  emailUpload.array('attachments', EMAIL_MAX_FILES)(req, res, (err) => {
    if (err) return next(err)
    void (async () => {
      const email = req.body?.email
      const subject = req.body?.subject
      const textBody = req.body?.body
      const ticketNumberRaw = req.body?.ticketNumber

      if (!email || typeof email !== 'string' || !email.trim()) {
        res.status(400).json({ success: false, error: 'Missing email' })
        return
      }
      if (!subject || typeof subject !== 'string' || !subject.trim()) {
        res.status(400).json({ success: false, error: 'Missing subject' })
        return
      }
      if (typeof textBody !== 'string') {
        res.status(400).json({ success: false, error: 'Missing body' })
        return
      }

      const files = req.files || []
      let totalBytes = 0
      for (const f of files) {
        totalBytes += f.size
      }
      if (totalBytes > EMAIL_MAX_TOTAL_BYTES) {
        res.status(400).json({
          success: false,
          error: `Attachments exceed ${EMAIL_MAX_TOTAL_BYTES} bytes total`,
        })
        return
      }

      const trimmedText = textBody.trim()
      if (!trimmedText && files.length === 0) {
        res.status(400).json({
          success: false,
          error: 'Message body or at least one attachment is required',
        })
        return
      }

      const transport = getMailTransport()
      if (!transport) {
        res.status(503).json({
          success: false,
          error:
            'Email is not configured. Set SMTP_HOST (and typically SMTP_USER, SMTP_PASS, EMAIL_FROM).',
        })
        return
      }

      const from = process.env.EMAIL_FROM?.trim() || process.env.SMTP_USER?.trim()
      if (!from) {
        res.status(503).json({
          success: false,
          error: 'Set EMAIL_FROM (or SMTP_USER) for the From address.',
        })
        return
      }

      let ticketNumber = null
      if (ticketNumberRaw != null && String(ticketNumberRaw).trim() !== '') {
        const n = Number(ticketNumberRaw)
        ticketNumber = Number.isFinite(n) ? n : null
      }

      try {
        await transport.sendMail({
          from,
          to: email.trim(),
          subject: subject.trim(),
          text: trimmedText || ' ',
          attachments: files.map((f) => {
            const raw = f.originalname || 'attachment'
            const ext = path.extname(raw)
            const base = safeDispositionName(path.basename(raw, ext) || 'file')
            const filename = `${base}${ext}`.length > 0 ? `${base}${ext}` : 'attachment'
            return {
              filename,
              content: f.buffer,
              contentType: f.mimetype,
            }
          }),
        })

        console.log('[sms-server] Chat email sent:', {
          to: email.trim(),
          subject: subject.trim(),
          ticketNumber,
          attachmentCount: files.length,
        })

        res.json({
          success: true,
          attachmentCount: files.length,
        })
      } catch (e) {
        console.error('[sms-server] Email send error:', e)
        res.status(500).json({
          success: false,
          error: e instanceof Error ? e.message : 'Failed to send email',
        })
      }
    })()
  })
})

app.post('/email/send', async (req, res) => {
  const {
    Subject,
    Body,
    Signature,
    FromAddr,
    ToAddrs,
    CCAddrs,
    BCCAddrs,
  } = req.body ?? {}

  if (typeof Subject !== 'string' || !Subject.trim()) {
    res.status(400).json({ error: 'Subject is required and cannot be empty' })
    return
  }
  if (typeof Body !== 'string' || !Body.trim()) {
    res.status(400).json({ error: 'Body is required and cannot be empty' })
    return
  }
  if (typeof ToAddrs !== 'string' || !ToAddrs.trim()) {
    res.status(400).json({ error: 'ToAddrs is required and cannot be empty' })
    return
  }
  if (Signature != null && typeof Signature !== 'string') {
    res.status(400).json({ error: 'Signature must be a string when provided' })
    return
  }
  if (FromAddr != null && typeof FromAddr !== 'string') {
    res.status(400).json({ error: 'FromAddr must be a string when provided' })
    return
  }
  if (CCAddrs != null && typeof CCAddrs !== 'string') {
    res.status(400).json({ error: 'CCAddrs must be a string when provided' })
    return
  }
  if (BCCAddrs != null && typeof BCCAddrs !== 'string') {
    res.status(400).json({ error: 'BCCAddrs must be a string when provided' })
    return
  }

  let toList
  let ccList = []
  let bccList = []
  try {
    toList = parseAddressList(ToAddrs, 'ToAddrs')
    ccList = parseAddressList(CCAddrs || '', 'CCAddrs')
    bccList = parseAddressList(BCCAddrs || '', 'BCCAddrs')
  } catch (error) {
    res.status(400).json({
      error: error instanceof Error ? error.message : 'Invalid recipient address list',
    })
    return
  }

  const fromAddrRaw = String(FromAddr || '').trim()
  const allowOverride = isFromOverrideAllowed()
  if (fromAddrRaw && !allowOverride) {
    res.status(403).json({
      error: 'FromAddr override is not permitted for this integrator configuration',
    })
    return
  }

  let fromAddress = process.env.EMAIL_FROM?.trim() || process.env.SMTP_USER?.trim() || ''
  if (fromAddrRaw) {
    try {
      const parsedFrom = parseAddressList(fromAddrRaw, 'FromAddr')
      if (parsedFrom.length !== 1) {
        res.status(400).json({ error: 'FromAddr must contain exactly one sender address' })
        return
      }
      fromAddress = parsedFrom[0]
    } catch (error) {
      res.status(400).json({
        error: error instanceof Error ? error.message : 'Invalid FromAddr value',
      })
      return
    }
  }

  if (!fromAddress) {
    res.status(503).json({
      error: 'No sender address configured. Set EMAIL_FROM (or SMTP_USER).',
    })
    return
  }

  const transport = getMailTransport()
  if (!transport) {
    res.status(503).json({
      error:
        'Email transport is not configured. Set SMTP_HOST (and typically SMTP_USER, SMTP_PASS).',
    })
    return
  }

  const signatureToUse = Signature == null ? getDefaultSignature() : Signature
  const composed = composeEmailContent(Body, signatureToUse)
  const subject = Subject.trim()

  try {
    const info = await transport.sendMail({
      from: fromAddress,
      to: toList,
      cc: ccList.length > 0 ? ccList : undefined,
      bcc: bccList.length > 0 ? bccList : undefined,
      subject,
      text: composed.text,
      html: composed.html,
    })

    res.json({
      EmailId: toNumericEmailId(info?.messageId),
    })
  } catch (error) {
    console.error('[sms-server] SEND_EMAIL error:', error)
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to send email',
    })
  }
})

app.get('/chat/history', (req, res) => {
  const phone = req.query.phone
  const messages = getMessagesForPhone(phone)
  res.json({ messages })
})

/** @type {Map<string, object>} token -> offer */
const appointmentRescheduleOffers = new Map()

const APPOINTMENT_RESCHEDULE_STAFF_KEY = process.env.APPOINTMENT_RESCHEDULE_STAFF_KEY?.trim()
const APPOINTMENT_RESCHEDULE_TTL_MS = Number(process.env.APPOINTMENT_RESCHEDULE_TTL_MS) || 7 * 24 * 60 * 60 * 1000

function assertAppointmentRescheduleStaffKey(req, res) {
  if (!APPOINTMENT_RESCHEDULE_STAFF_KEY) {
    res.status(503).json({
      success: false,
      error: 'APPOINTMENT_RESCHEDULE_STAFF_KEY is not configured on the server',
    })
    return false
  }
  const key = req.headers['x-appointment-staff-key']
  if (typeof key !== 'string' || key !== APPOINTMENT_RESCHEDULE_STAFF_KEY) {
    res.status(401).json({ success: false, error: 'Unauthorized' })
    return false
  }
  return true
}

function isOfferExpired(offer) {
  return Date.now() > offer.expiresAt
}

function pruneExpiredRescheduleOffers() {
  for (const [token, offer] of appointmentRescheduleOffers) {
    if (isOfferExpired(offer)) appointmentRescheduleOffers.delete(token)
  }
}

function slotsEqual(a, b) {
  return a && b && String(a.date) === String(b.date) && String(a.time) === String(b.time)
}

/** Staff: create offer (1–3 slots). */
app.post('/appointment-reschedule/offers', (req, res) => {
  if (!assertAppointmentRescheduleStaffKey(req, res)) return
  pruneExpiredRescheduleOffers()

  const body = req.body ?? {}
  const recordId = typeof body.recordId === 'string' ? body.recordId.trim() : ''
  const storeId = body.storeId != null ? String(body.storeId).trim() : ''
  const bayId = typeof body.bayId === 'string' && body.bayId.trim() ? body.bayId.trim() : 'NB'
  const durationMinutes = Number(body.durationMinutes)
  const slots = Array.isArray(body.slots) ? body.slots : []
  const customerName = typeof body.customerName === 'string' ? body.customerName.trim() : ''
  const customerPhone = typeof body.customerPhone === 'string' ? body.customerPhone.trim() : ''
  const shopName = typeof body.shopName === 'string' ? body.shopName.trim() : ''

  if (!recordId || !storeId) {
    res.status(400).json({ success: false, error: 'recordId and storeId are required' })
    return
  }
  if (!Number.isFinite(durationMinutes) || durationMinutes <= 0) {
    res.status(400).json({ success: false, error: 'durationMinutes must be a positive number' })
    return
  }
  if (slots.length < 1 || slots.length > 3) {
    res.status(400).json({ success: false, error: 'slots must be an array of 1 to 3 { date, time }' })
    return
  }
  const normalizedSlots = []
  for (const s of slots) {
    const date = typeof s?.date === 'string' ? s.date.trim() : ''
    const time = typeof s?.time === 'string' ? s.time.trim() : ''
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time)) {
      res.status(400).json({ success: false, error: 'Each slot needs date YYYY-MM-DD and time HH:mm' })
      return
    }
    normalizedSlots.push({ date, time })
  }

  const token = randomUUID()
  const now = Date.now()
  const offer = {
    token,
    recordId,
    storeId,
    bayId,
    durationMinutes,
    slots: normalizedSlots,
    customerName,
    customerPhone,
    shopName,
    status: 'pending',
    chosenSlot: null,
    appliedToCalendar: false,
    createdAt: new Date().toISOString(),
    expiresAt: now + APPOINTMENT_RESCHEDULE_TTL_MS,
  }
  appointmentRescheduleOffers.set(token, offer)

  res.json({
    success: true,
    token,
    expiresAt: new Date(offer.expiresAt).toISOString(),
  })
})

/** Public: read offer for customer page. */
app.get('/appointment-reschedule/offers/:token', (req, res) => {
  pruneExpiredRescheduleOffers()
  const token = req.params.token
  const offer = appointmentRescheduleOffers.get(token)
  if (!offer || isOfferExpired(offer)) {
    res.status(404).json({ success: false, error: 'Offer not found or expired' })
    return
  }
  res.json({
    success: true,
    customerName: offer.customerName || '',
    slots: offer.slots,
    status: offer.status,
    chosenSlot: offer.chosenSlot,
    durationMinutes: offer.durationMinutes,
    shopName: offer.shopName || '',
    expiresAt: new Date(offer.expiresAt).toISOString(),
  })
})

/** Public: customer selects one offered slot. */
app.post('/appointment-reschedule/offers/:token/select', (req, res) => {
  pruneExpiredRescheduleOffers()
  const token = req.params.token
  const offer = appointmentRescheduleOffers.get(token)
  if (!offer || isOfferExpired(offer)) {
    res.status(404).json({ success: false, error: 'Offer not found or expired' })
    return
  }
  if (offer.status !== 'pending') {
    res.status(409).json({ success: false, error: 'This offer has already been used' })
    return
  }
  const date = typeof req.body?.date === 'string' ? req.body.date.trim() : ''
  const time = typeof req.body?.time === 'string' ? req.body.time.trim() : ''
  const match = offer.slots.find((s) => slotsEqual(s, { date, time }))
  if (!match) {
    res.status(400).json({ success: false, error: 'Selected time is not one of the offered slots' })
    return
  }
  offer.chosenSlot = { date: match.date, time: match.time }
  offer.status = 'chosen'
  res.json({ success: true, chosenSlot: offer.chosenSlot })
})

/** Staff: list customer choices not yet applied in the SPA calendar. */
app.get('/appointment-reschedule/sync', (req, res) => {
  if (!assertAppointmentRescheduleStaffKey(req, res)) return
  pruneExpiredRescheduleOffers()
  const storeId = req.query.storeId != null ? String(req.query.storeId).trim() : ''
  if (!storeId) {
    res.status(400).json({ success: false, error: 'storeId query is required' })
    return
  }
  const items = []
  for (const [token, offer] of appointmentRescheduleOffers) {
    if (offer.storeId !== storeId) continue
    if (offer.status !== 'chosen' || offer.appliedToCalendar) continue
    if (!offer.chosenSlot) continue
    items.push({
      token,
      recordId: offer.recordId,
      storeId: offer.storeId,
      bayId: offer.bayId,
      date: offer.chosenSlot.date,
      time: offer.chosenSlot.time,
    })
  }
  res.json({ success: true, items })
})

/** Staff: mark offer as applied after local calendar update. */
app.post('/appointment-reschedule/sync/ack', (req, res) => {
  if (!assertAppointmentRescheduleStaffKey(req, res)) return
  const token = typeof req.body?.token === 'string' ? req.body.token.trim() : ''
  if (!token || !UUID_RE.test(token)) {
    res.status(400).json({ success: false, error: 'token (UUID) is required' })
    return
  }
  const offer = appointmentRescheduleOffers.get(token)
  if (!offer) {
    res.status(404).json({ success: false, error: 'Offer not found' })
    return
  }
  offer.appliedToCalendar = true
  res.json({ success: true })
})

/** SPA cache upsert: keep server-visible appointment records for iCal export. */
app.post('/appointments/ical/cache', (req, res) => {
  const payload = req.body ?? {}
  const id = typeof payload.id === 'string' ? payload.id.trim() : ''
  if (!id) {
    res.status(400).json({ success: false, error: 'id is required' })
    return
  }
  if (payload.deleted === true) {
    icalAppointmentsById.delete(id)
    res.json({ success: true, deleted: true })
    return
  }

  const normalized = {
    id,
    storeId: payload.storeId != null ? String(payload.storeId).trim() : '',
    customerName: typeof payload.customerName === 'string' ? payload.customerName : '',
    customerPhone: typeof payload.customerPhone === 'string' ? payload.customerPhone : '',
    customerEmail: typeof payload.customerEmail === 'string' ? payload.customerEmail : '',
    recordType: typeof payload.recordType === 'string' ? payload.recordType : '',
    status: payload.status === 'confirmed' ? 'confirmed' : 'unconfirmed',
    requestedDate: typeof payload.requestedDate === 'string' ? payload.requestedDate : '',
    requestedTime: typeof payload.requestedTime === 'string' ? payload.requestedTime : '',
    requestedDuration: Number(payload.requestedDuration),
    bayName: typeof payload.bayName === 'string' ? payload.bayName : '',
    note: typeof payload.note === 'string' ? payload.note : '',
    updatedAt: typeof payload.updatedAt === 'string' ? payload.updatedAt : new Date().toISOString(),
  }
  icalAppointmentsById.set(id, normalized)
  res.json({ success: true })
})

/** Generic ICS export URL for calendar subscriptions. */
app.get('/appointments/ical', (req, res) => {
  const storeId = req.query.storeId != null ? String(req.query.storeId).trim() : ''
  const from = req.query.from != null ? String(req.query.from).trim() : ''
  const to = req.query.to != null ? String(req.query.to).trim() : ''
  const isValidDate = (value) => !value || /^\d{4}-\d{2}-\d{2}$/.test(value)
  if (!isValidDate(from) || !isValidDate(to)) {
    res.status(400).json({ success: false, error: 'from/to must be YYYY-MM-DD when provided' })
    return
  }

  let records = Array.from(icalAppointmentsById.values())
  if (storeId) {
    records = records.filter((record) => String(record.storeId || '') === storeId)
  }
  if (from) {
    records = records.filter((record) => String(record.requestedDate || '') >= from)
  }
  if (to) {
    records = records.filter((record) => String(record.requestedDate || '') <= to)
  }

  const body = buildIcsFromCachedAppointments(records)
  res.setHeader('Content-Type', 'text/calendar; charset=utf-8')
  res.setHeader('Content-Disposition', 'inline; filename="appointments.ics"')
  res.status(200).send(body)
})

app.post('/sms-webhook', (req, res) => {
  console.log('[sms-server] Inbound SMS from:', req.body.From)
  console.log('[sms-server] Body:', req.body.Body)

  const fromPhone = req.body.From
  const bodyText = req.body.Body || ''
  const nowIso = new Date().toISOString()

  addMessage(fromPhone, {
    id: `inbound-${nowIso}-${Math.random().toString(36).slice(2)}`,
    phone: fromPhone,
    direction: 'inbound',
    body: bodyText,
    sentAt: nowIso,
    status: 'sent',
  })

  const twiml = new MessagingResponse()
  twiml.message(`Message received: ${bodyText}`)

  res.type('text/xml').send(twiml.toString())

  // NOTE: For production, validate Twilio signatures here using twilio.validateRequest().
})

/**
 * Twilio status callback (configure on number or Messaging Service, or pass statusCallback per send).
 * Deletes local MMS upload files when the message reaches delivered.
 */
app.post('/sms-status-callback', (req, res) => {
  const sid = req.body.MessageSid || req.body.SmsSid
  const rawStatus = req.body.MessageStatus || req.body.SmsStatus || ''
  const status = String(rawStatus).toLowerCase()

  res.status(204).end()

  if (status === 'delivered' && sid) {
    void onTwilioMessageDelivered(sid)
  }
})

app.use((err, _req, res, _next) => {
  if (res.headersSent) return
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      res.status(400).json({ success: false, error: 'File too large' })
      return
    }
    if (err.code === 'LIMIT_FILE_COUNT') {
      res.status(400).json({ success: false, error: 'Too many files' })
      return
    }
    res.status(400).json({ success: false, error: err.message })
    return
  }
  if (err && err.message === 'Unsupported file type') {
    res.status(400).json({
      success: false,
      error: 'Unsupported file type (allowed: JPEG, PNG, GIF, PDF)',
    })
    return
  }
  console.error('[sms-server] Unhandled error:', err)
  res.status(500).json({
    success: false,
    error: err instanceof Error ? err.message : 'Internal server error',
  })
})

app.listen(port, () => {
  console.log(`[sms-server] Listening on port ${port}`)
})
