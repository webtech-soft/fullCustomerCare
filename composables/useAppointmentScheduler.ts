import { ref } from 'vue'
import type { AppointmentRecord } from '@/types/appointment'
import { canDropInBaySlot, moveAppointmentRecord } from '@/api/appointments'

const UNDO_WINDOW_MS = 5000

export interface UndoState {
  visible: boolean
  message: string
  undo?: () => Promise<void>
}

export interface AppointmentSchedulerOptions {
  applyOptimisticMove?: (
    id: string,
    next: { bayId: string; requestedDate: string; requestedTime: string }
  ) => AppointmentRecord | null
  restoreOptimisticMove?: (snapshot: AppointmentRecord | null) => void
}

export function useAppointmentScheduler(
  onRefresh: () => Promise<void>,
  options: AppointmentSchedulerOptions = {}
) {
  const undoState = ref<UndoState>({
    visible: false,
    message: '',
  })

  let hideTimer: number | undefined

  const isBayOnlySameSlotMove = (
    r: AppointmentRecord,
    next: { bayId: string; requestedDate: string; requestedTime: string }
  ) =>
    next.requestedDate === r.requestedDate &&
    next.requestedTime === r.requestedTime &&
    (r.bayId || 'NB') !== next.bayId

  const scheduleMove = async (
    record: AppointmentRecord,
    next: { bayId: string; requestedDate: string; requestedTime: string }
  ): Promise<{ success: boolean; reason?: string }> => {
    if (
      (record.bayId || 'NB') === next.bayId &&
      record.requestedDate === next.requestedDate &&
      record.requestedTime === next.requestedTime
    ) {
      return { success: true }
    }

    const canDrop = await canDropInBaySlot({
      bayId: next.bayId,
      date: next.requestedDate,
      requestedTime: next.requestedTime,
      duration: record.requestedDuration,
      movingRecordId: record.id,
      targetRecordType: record.recordType,
    })

    if (!canDrop) {
      return { success: false, reason: 'Blocked time in selected bay.' }
    }

    const previous = {
      bayId: record.bayId || 'NB',
      requestedDate: record.requestedDate,
      requestedTime: record.requestedTime,
    }

    const optimisticSnapshot = options.applyOptimisticMove?.(record.id, next) ?? null
    let moveSucceeded = false
    try {
      const skipIcalForBayShuffle = isBayOnlySameSlotMove(record, next)
      const moved = await moveAppointmentRecord(
        record.id,
        next,
        { syncIcal: !skipIcalForBayShuffle },
        record
      )
      if (!moved) {
        throw new Error('Move failed because the appointment no longer exists.')
      }
      moveSucceeded = true
      await onRefresh()
    } catch (error) {
      options.restoreOptimisticMove?.(optimisticSnapshot)
      return {
        success: false,
        reason: error instanceof Error ? error.message : 'Failed to move appointment.',
      }
    }

    if (moveSucceeded) {
      showUndo('Appointment moved. Undo?', async () => {
        const revertSnapshot = options.applyOptimisticMove?.(record.id, previous) ?? null
        try {
          const reverted = await moveAppointmentRecord(record.id, previous, { syncIcal: true }, record)
          if (!reverted) {
            throw new Error('Undo failed because the appointment no longer exists.')
          }
          await onRefresh()
        } catch {
          options.restoreOptimisticMove?.(revertSnapshot)
        }
      })
    }

    return { success: true }
  }

  const showUndo = (message: string, undo: () => Promise<void>) => {
    if (hideTimer) {
      window.clearTimeout(hideTimer)
    }
    undoState.value = {
      visible: true,
      message,
      undo: async () => {
        await undo()
        undoState.value = { visible: false, message: '' }
      },
    }
    hideTimer = window.setTimeout(() => {
      undoState.value = { visible: false, message: '' }
    }, UNDO_WINDOW_MS)
  }

  return {
    undoState,
    scheduleMove,
  }
}
