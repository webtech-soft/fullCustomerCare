/** Time intervals for Google Calendar–style column packing (overlap groups + greedy columns). */

export type LayoutInterval = {
  id: string
  start: number
  end: number
}

export type LaneAssignment = {
  laneIndex: number
  laneCount: number
}

export function intervalsOverlap(a: LayoutInterval, b: LayoutInterval): boolean {
  return a.start < b.end && b.start < a.end
}

/**
 * Assigns laneIndex / laneCount per id. Overlap-connected intervals share one packing;
 * each group uses equal-width columns (laneCount = columns opened by greedy placement).
 */
export function computeLaneLayout(intervals: LayoutInterval[]): Map<string, LaneAssignment> {
  const result = new Map<string, LaneAssignment>()
  if (intervals.length === 0) return result

  const n = intervals.length
  const adj: number[][] = Array.from({ length: n }, () => [])
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      if (intervalsOverlap(intervals[i], intervals[j])) {
        adj[i].push(j)
        adj[j].push(i)
      }
    }
  }

  const visited = new Array(n).fill(false)
  for (let i = 0; i < n; i++) {
    if (visited[i]) continue
    const compIndices: number[] = []
    const stack = [i]
    visited[i] = true
    while (stack.length) {
      const u = stack.pop()!
      compIndices.push(u)
      for (const v of adj[u]) {
        if (!visited[v]) {
          visited[v] = true
          stack.push(v)
        }
      }
    }
    const comp = compIndices.map((idx) => intervals[idx])
    packOverlapComponent(comp, result)
  }
  return result
}

function packOverlapComponent(comp: LayoutInterval[], out: Map<string, LaneAssignment>) {
  if (comp.length === 0) return
  const sorted = [...comp].sort(
    (a, b) => a.start - b.start || b.end - a.end || a.id.localeCompare(b.id)
  )
  const columnEnds: number[] = []
  const laneIndexById = new Map<string, number>()
  for (const ev of sorted) {
    let placedCol = -1
    for (let c = 0; c < columnEnds.length; c++) {
      if (columnEnds[c] <= ev.start) {
        placedCol = c
        columnEnds[c] = ev.end
        break
      }
    }
    if (placedCol === -1) {
      placedCol = columnEnds.length
      columnEnds.push(ev.end)
    }
    laneIndexById.set(ev.id, placedCol)
  }
  const laneCount = Math.max(1, columnEnds.length)
  for (const ev of comp) {
    out.set(ev.id, { laneIndex: laneIndexById.get(ev.id) ?? 0, laneCount })
  }
}
