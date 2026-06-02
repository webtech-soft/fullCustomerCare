import type { WorkApprovalItemV1, WorkApprovalRecordV1 } from '@/lib/work-approvals'

export function workApprovalApprovedTotal(record: WorkApprovalRecordV1 | null): number {
  const items = record?.items ?? []
  return items.reduce((sum, i) => sum + (Number.isFinite(i.amount) ? i.amount : 0), 0)
}

export function workApprovalSortedItems(record: WorkApprovalRecordV1 | null): WorkApprovalItemV1[] {
  const items = record?.items ?? []
  return [...items].sort((a, b) => a.lineNum - b.lineNum)
}

/** Single string or first/latest when multiple batches. */
export function workApprovalDateRangeDisplay(
  record: WorkApprovalRecordV1 | null
): string | { first: string; latest: string } | null {
  const items = record?.items ?? []
  if (items.length === 0) return null
  const sorted = [...items].sort((a, b) => a.approvedAtIso.localeCompare(b.approvedAtIso))
  const first = sorted[0]
  const latest = sorted[sorted.length - 1]
  const firstStr = `${first.approvedDate} ${first.approvedTime}`
  const latestStr = `${latest.approvedDate} ${latest.approvedTime}`
  return firstStr === latestStr ? firstStr : { first: firstStr, latest: latestStr }
}

export function workApprovalLatestSignatureDataUrl(record: WorkApprovalRecordV1 | null): string {
  const items = record?.items ?? []
  if (items.length === 0) return ''
  const latest = items.reduce<WorkApprovalItemV1 | null>((acc, item) => {
    if (!acc) return item
    return item.approvedAtIso > acc.approvedAtIso ? item : acc
  }, null)
  return latest?.signatureDataUrl ?? ''
}
