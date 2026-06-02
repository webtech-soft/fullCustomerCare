/**
 * Query/cache key for full invoice detail (includeRawData: true, includeSchema: false).
 * Must match TicketsPage and any other caller that warms this cache before opening /cv internally.
 */
export function invoiceDetailQueryKey(ticketNumber: number): string {
  return `invoice-detail|${ticketNumber}|true|false`
}
