/**
 * Hits / portal account id used on API payloads and tokens.
 * Override for local testing: VITE_HITS_ACCOUNT in .env
 * Future: resolve from authenticated user / DB and fall back to this.
 */
export const HITS_ACCOUNT =
  import.meta.env.VITE_HITS_ACCOUNT?.trim() || '44000JAN'
