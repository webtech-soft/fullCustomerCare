import { isShopSuppliesPartNum } from '@/lib/shop-supplies'
import type { DetailRow, InvoiceDetailResponse, InvoiceRow } from '@/types/ticket'

export interface GroupedPackageItem {
  packageId: number
  headerItem: DetailRow
  items: DetailRow[]
}

export function formatInvoiceCurrency(amount: string | number): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num)
}

export function getRegularLineItemsFromRows(rows: DetailRow[]): DetailRow[] {
  return (rows || []).filter((item) => {
    if (item.Props?.IsDeclined || item.Props?.IsComment) return false
    return !isShopSuppliesPartNum(item.ProductNum)
  })
}

export function getDeclinedLineItemsFromRows(rows: DetailRow[]): DetailRow[] {
  return (rows || []).filter((item) => {
    if (!item.Props?.IsDeclined) return false
    if (item.Props?.IsComment) return false
    return !isShopSuppliesPartNum(item.ProductNum)
  })
}

export function getShopSuppliesLineItemsFromRows(rows: DetailRow[]): DetailRow[] {
  return (rows || []).filter((item) => {
    if (item.Props?.IsDeclined || item.Props?.IsComment) return false
    return isShopSuppliesPartNum(item.ProductNum)
  })
}

export function getShopSuppliesTotalFromRows(rows: DetailRow[]): number {
  return getShopSuppliesLineItemsFromRows(rows).reduce(
    (sum, item) => sum + (parseFloat(item.Total || '0') || 0),
    0
  )
}

/** Combine duplicate OIL items with same PartNum */
function combineDuplicateOILItems(items: DetailRow[]): DetailRow[] {
  const itemsCopy: DetailRow[] = items.map((item) => ({
    ...item,
    Props: item.Props ? { ...item.Props } : undefined,
  }))
  const oilItemsMap = new Map<string, DetailRow[]>()
  const itemsToRemove = new Set<number>()

  itemsCopy.forEach((item) => {
    const rawsize = item.Rawsize?.trim().toUpperCase()
    if (rawsize === 'OIL' && item.ProductNum) {
      if (!oilItemsMap.has(item.ProductNum)) {
        oilItemsMap.set(item.ProductNum, [])
      }
      oilItemsMap.get(item.ProductNum)!.push(item)
    }
  })

  oilItemsMap.forEach((oilItems) => {
    if (oilItems.length < 2) return

    oilItems.sort((a, b) => (Number(a.LineNum) || 0) - (Number(b.LineNum) || 0))

    const baseItem = oilItems[0]

    let combinedQuantity = 0
    let combinedTotal = 0

    oilItems.forEach((item) => {
      const qty = parseFloat(item.Quantity || '0') || 0
      const total = parseFloat(item.Total || '0') || 0
      combinedQuantity += qty
      combinedTotal += total
    })

    baseItem.Quantity = parseFloat(combinedQuantity.toFixed(2)).toString()
    baseItem.Total = parseFloat(combinedTotal.toFixed(2)).toString()

    for (let i = 1; i < oilItems.length; i++) {
      itemsToRemove.add(oilItems[i].LineNum)
    }
  })

  return itemsCopy.filter((item) => !itemsToRemove.has(item.LineNum))
}

export function groupItemsByPackage(items: DetailRow[]): GroupedPackageItem[] {
  const combinedItems = combineDuplicateOILItems(items)

  const sortedItems = [...combinedItems].sort((a, b) => {
    const numA = Number(a.LineNum) || 0
    const numB = Number(b.LineNum) || 0
    return numA - numB
  })

  const processedLineNums = new Set<number>()
  const grouped: GroupedPackageItem[] = []

  const oilItems: DetailRow[] = []
  for (let i = 0; i < sortedItems.length; i++) {
    if (processedLineNums.has(sortedItems[i].LineNum)) continue

    const currentItem = sortedItems[i]
    const rawsize = currentItem.Rawsize?.trim().toUpperCase() || ''

    if (rawsize === 'OIL') {
      oilItems.push(currentItem)
    }
  }

  oilItems.sort((a, b) => (Number(a.LineNum) || 0) - (Number(b.LineNum) || 0))

  if (oilItems.length > 0) {
    const oilItem = oilItems[0]
    const oilItemIndex = sortedItems.findIndex((item) => item.LineNum === oilItem.LineNum)

    if (oilItemIndex !== -1 && !processedLineNums.has(oilItem.LineNum)) {
      const nestedItems: DetailRow[] = []

      for (let j = 0; j < sortedItems.length; j++) {
        if (sortedItems[j].LineNum === oilItem.LineNum) continue
        if (processedLineNums.has(sortedItems[j].LineNum)) continue

        const checkItem = sortedItems[j]
        const checkRawsize = checkItem.Rawsize?.trim().toUpperCase() || ''
        const checkDescription = checkItem.Description?.trim().toUpperCase() || ''

        const hasRawsizeOilFilter = checkRawsize === 'OIL FILTER'
        const hasDescriptionOilFilter = checkDescription.includes('OIL FILTER')
        const isOilFilter = hasRawsizeOilFilter || hasDescriptionOilFilter

        if (isOilFilter) {
          nestedItems.push(checkItem)
          processedLineNums.add(checkItem.LineNum)
          break
        }
      }

      const oilItemNum = Number(oilItem.LineNum) || 0
      const expectedNextItemNum = oilItemNum + 2

      const nestedItemNums = new Set(nestedItems.map((item) => Number(item.LineNum) || 0))

      for (let j = 0; j < sortedItems.length; j++) {
        if (sortedItems[j].LineNum === oilItem.LineNum) continue
        if (processedLineNums.has(sortedItems[j].LineNum)) continue

        const checkItemNum = Number(sortedItems[j].LineNum) || 0
        if (checkItemNum === expectedNextItemNum && !nestedItemNums.has(checkItemNum)) {
          nestedItems.push(sortedItems[j])
          processedLineNums.add(sortedItems[j].LineNum)
          break
        }
      }

      nestedItems.sort((a, b) => (Number(a.LineNum) || 0) - (Number(b.LineNum) || 0))
      processedLineNums.add(oilItem.LineNum)
      grouped.push({
        packageId: oilItem.Package ?? 0,
        headerItem: oilItem,
        items: nestedItems,
      })
    }
  }

  const packageMap = new Map<number, DetailRow[]>()

  sortedItems.forEach((item) => {
    if (processedLineNums.has(item.LineNum)) return

    const packageId = item.Package ?? 0
    if (!packageMap.has(packageId)) {
      packageMap.set(packageId, [])
    }
    packageMap.get(packageId)!.push(item)
  })

  const sortedPackages = Array.from(packageMap.entries()).sort((a, b) => {
    const minA = Math.min(...a[1].map((item) => Number(item.LineNum) || 0))
    const minB = Math.min(...b[1].map((item) => Number(item.LineNum) || 0))
    return minA - minB
  })

  sortedPackages.forEach(([packageId, packageItems]) => {
    if (packageId === 0) {
      const sortedStandaloneItems = [...packageItems].sort((a, b) => {
        return (Number(a.LineNum) || 0) - (Number(b.LineNum) || 0)
      })
      sortedStandaloneItems.forEach((item) => {
        grouped.push({
          packageId: 0,
          headerItem: item,
          items: [],
        })
      })
      return
    }

    const sortedPackageItems = [...packageItems].sort((a, b) => {
      return (Number(a.LineNum) || 0) - (Number(b.LineNum) || 0)
    })
    const headerItem = sortedPackageItems[0]
    const otherItems = sortedPackageItems.slice(1)
    otherItems.sort((a, b) => {
      return (Number(a.LineNum) || 0) - (Number(b.LineNum) || 0)
    })

    grouped.push({
      packageId,
      headerItem,
      items: otherItems,
    })
  })

  return grouped.sort((a, b) => {
    const numA = Number(a.headerItem.LineNum) || 0
    const numB = Number(b.headerItem.LineNum) || 0
    return numA - numB
  })
}

export function getGroupTotal(group: GroupedPackageItem): number {
  let total = parseFloat(group.headerItem.Total || '0') || 0
  if (group.items && group.items.length > 0) {
    group.items.forEach((item) => {
      total += parseFloat(item.Total || '0') || 0
    })
  }
  return total
}

export function getGroupedCustomerPreviewLineItems(
  detailRows: DetailRow[] | undefined | null
): GroupedPackageItem[] {
  if (!detailRows?.length) return []
  const allItems = getRegularLineItemsFromRows(detailRows)
  let grouped = groupItemsByPackage(allItems)
  grouped = [...grouped].sort((a, b) => {
    const numA = Number(a.headerItem.LineNum) || 0
    const numB = Number(b.headerItem.LineNum) || 0
    return numA - numB
  })
  return grouped
}

export function getCustomerPreviewSubtotal(invoiceDetail: InvoiceDetailResponse | null | undefined): number | undefined {
  if (!invoiceDetail?.invoiceRow?.Subtotal) return undefined
  const rows = invoiceDetail.detailRows
  const shopSuppliesTotal = rows ? getShopSuppliesTotalFromRows(rows) : 0
  const apiSubtotal = parseFloat(invoiceDetail.invoiceRow.Subtotal) || 0
  return apiSubtotal - shopSuppliesTotal
}

export function getCustomerPreviewTotal(invoiceDetail: InvoiceDetailResponse | null | undefined): number | undefined {
  const subtotal = getCustomerPreviewSubtotal(invoiceDetail)
  if (subtotal === undefined) return undefined

  const rows = invoiceDetail?.detailRows
  const shopSupplies = rows ? getShopSuppliesTotalFromRows(rows) : 0
  const salesTax = invoiceDetail?.invoiceRow?.SalesTax
    ? parseFloat(invoiceDetail.invoiceRow.SalesTax) || 0
    : 0

  return subtotal + shopSupplies + salesTax
}

export function getInvoiceTypeLabel(type: string): string {
  switch (type) {
    case 'W':
      return 'Workorder'
    case 'I':
      return 'Invoice'
    case 'B':
      return 'Invoice'
    case 'Q':
      return 'Quote'
    default:
      return 'Invoice'
  }
}

/** Vehicle string: "Make Model Year (TAG)" → display year, make, model */
export function getVehicleMakeModelYearFromTicketVehicle(vehicle: string): string {
  if (!vehicle) return ''
  const match = vehicle.match(/^(.+?)\s+(\d{4})\s+\(([^)]+)\)$/)
  if (match) {
    const makeModel = match[1].trim()
    const parts = makeModel.split(' ')
    const make = parts[0] || ''
    const model = parts.slice(1).join(' ') || ''
    return [match[2], make, model].filter(Boolean).join(' ')
  }
  const withoutTag = vehicle.replace(/\s*\([^)]+\)\s*$/, '').trim()
  return withoutTag
}

export function formatLicensePlateForPreview(plate: string | undefined, state?: string): string {
  if (!plate && !state) return '—'
  const p = (plate ?? '').trim()
  const s = (state ?? '').trim()
  return s ? `${p} (${s})` : p || '—'
}

function parseVehicleLicensePlate(vehicle: string): string {
  if (!vehicle) return ''
  const match = vehicle.match(/^(.+?)\s+(\d{4})\s+\(([^)]+)\)$/)
  if (match) return match[3]
  const tagMatch = vehicle.match(/\(([^)]+)\)/)
  return tagMatch ? tagMatch[1] : ''
}

export function getLicensePlateDisplayFromTicket(
  vehicle: string | undefined,
  autoTagState: InvoiceRow['AutoTagState'] | undefined
): string {
  const plate = vehicle ? parseVehicleLicensePlate(vehicle) : ''
  return formatLicensePlateForPreview(plate, autoTagState != null ? String(autoTagState) : undefined)
}
