export type TicketsTourMenuAction = 'quick' | 'advanced' | 'preset'

export type TicketsTourMenuHandlers = {
  quick: () => void
  advanced: () => void
  preset: () => void
}

let handlers: TicketsTourMenuHandlers | null = null

export function registerTicketsTourMenuHandlers(next: TicketsTourMenuHandlers) {
  handlers = next
}

export function clearTicketsTourMenuHandlers() {
  handlers = null
}

export function runTicketsTourMenuAction(kind: TicketsTourMenuAction) {
  if (!handlers) return
  if (kind === 'quick') handlers.quick()
  else if (kind === 'advanced') handlers.advanced()
  else handlers.preset()
}
