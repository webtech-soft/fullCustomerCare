/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Hits API account (e.g. 44000JAN). Falls back in code if unset. */
  readonly VITE_HITS_ACCOUNT?: string
  readonly VITE_DVI_EDITOR_URL?: string
  readonly VITE_CHECK_IN_URL?: string
  /** URL for resolving external inv tokens (e.g. portal). Expects ?inv=<token>, returns { invoiceNum: number }. */
  readonly VITE_RESOLVE_INV_TOKEN_URL?: string
  /** sms-server base (e.g. http://localhost:3000) for chat + appointment reschedule offers. */
  readonly VITE_CHAT_API_BASE_URL?: string
  /** Same value as server APPOINTMENT_RESCHEDULE_STAFF_KEY; used to mint/sync reschedule offers. */
  readonly VITE_APPOINTMENT_RESCHEDULE_STAFF_KEY?: string
  readonly DEV?: boolean
  readonly MODE?: string
  readonly PROD?: boolean
  readonly SSR?: boolean
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

