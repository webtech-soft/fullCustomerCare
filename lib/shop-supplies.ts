/**
 * Shop supplies are identified by PartNum segments that start with "SS99".
 * The API may include a prefix before the SS99 segment (e.g. "ABC-SS99...").
 */
export function isShopSuppliesPartNum(partNum: unknown): boolean {
  if (typeof partNum !== "string") return false

  const normalized = partNum.trim().toUpperCase()
  if (!normalized) return false

  const idx = normalized.indexOf("SS99")
  if (idx === -1) return false

  // Exact start: "SS99..."
  if (idx === 0) return true

  // Allow prefixes separated by a non-alphanumeric character (e.g. "ABC-SS99...")
  const charBefore = normalized[idx - 1]
  return !/[A-Z0-9]/.test(charBefore)
}

