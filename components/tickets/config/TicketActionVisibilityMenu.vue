<template>
  <div class="relative shrink-0" ref="containerRef">
    <button
      type="button"
      data-onboarding="ticket-edit-actions-trigger"
      @click="toggleOpen"
      class="flex items-center gap-2 h-9 px-3 rounded-md border border-input bg-background text-sm font-medium text-foreground hover:bg-accent transition-colors"
    >
      <PhListBullets :size="16" weight="regular" />
      <span>Edit Actions</span>
      <Badge
        v-if="hiddenActionCount > 0"
        class="ml-1 bg-muted text-muted-foreground text-xs border border-border"
      >
        {{ visibleActionCount }}/{{ actionKeys.length }}
      </Badge>
    </button>

    <Teleport to="body">
      <div
        v-if="isOpen"
        ref="panelRef"
        data-keep-filters-open="true"
        data-onboarding="ticket-edit-actions-panel"
        class="fixed z-[100] w-72 rounded-md border border-border bg-popover text-popover-foreground shadow-lg flex flex-col max-h-[min(85vh,24rem)]"
        :style="panelStyle"
      >
        <div class="overflow-y-auto p-2 min-h-0 flex-1 space-y-1">
          <label
            v-for="row in rows"
            :key="row.key"
            class="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-accent cursor-pointer"
            :class="row.disabled ? 'opacity-60 cursor-not-allowed' : ''"
            :title="row.disabled ? row.disabledTitle : undefined"
          >
            <Checkbox
              :checked="visibility[row.key]"
              :disabled="row.disabled"
              class="shrink-0"
              @update:checked="(v) => !row.disabled && toggle(row.key, !!v)"
            />
            <span class="text-sm text-foreground flex-1">{{ row.label }}</span>
          </label>
        </div>
        <div class="p-3 border-t border-border shrink-0">
          <button
            type="button"
            class="text-xs text-brand-accent hover:underline"
            @click="showAll"
          >
            Show all
          </button>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import Badge from '@/components/ui/Badge.vue'
import Checkbox from '@/components/ui/Checkbox.vue'
import { PhListBullets } from '@phosphor-icons/vue'
import { useUserPreferences } from '@/composables/useUserPreferences'
import { DEFAULT_TICKET_ACTION_VISIBILITY, type TicketActionVisibility } from '@/types/ticket'

type ActionKey = keyof TicketActionVisibility

const props = withDefaults(
  defineProps<{
    canChat?: boolean
  }>(),
  { canChat: true }
)

const { ticketActionVisibility, updateTicketActionVisibility } = useUserPreferences()

const containerRef = ref<HTMLElement | null>(null)
const panelRef = ref<HTMLElement | null>(null)
const isOpen = ref(false)
const panelStyle = ref({ top: '0px', left: '0px' })

const visibility = computed(() => ticketActionVisibility.value)

const actionKeys = Object.keys(DEFAULT_TICKET_ACTION_VISIBILITY) as ActionKey[]

const hiddenActionCount = computed(
  () => actionKeys.filter((k) => !visibility.value[k]).length
)
const visibleActionCount = computed(() => actionKeys.length - hiddenActionCount.value)

const rows = computed(() => {
  const chatDisabled = !props.canChat
  return [
    { key: 'view' as const, label: 'View', disabled: false, disabledTitle: undefined },
    {
      key: 'chat' as const,
      label: 'Chat',
      disabled: chatDisabled,
      disabledTitle: chatDisabled ? 'Chat is not available for your account' : undefined,
    },
    { key: 'timeline' as const, label: 'Timeline', disabled: false, disabledTitle: undefined },
    { key: 'approvals' as const, label: 'Approvals', disabled: false, disabledTitle: undefined },
    { key: 'inspection' as const, label: 'Inspection', disabled: false, disabledTitle: undefined },
    { key: 'nextStep' as const, label: 'Next step', disabled: false, disabledTitle: undefined },
    {
      key: 'technicianWorksheet' as const,
      label: 'Technician Worksheet',
      disabled: false,
      disabledTitle: undefined,
    },
  ]
})

function toggle(key: ActionKey, on: boolean) {
  updateTicketActionVisibility({ [key]: on })
}

function showAll() {
  updateTicketActionVisibility({ ...DEFAULT_TICKET_ACTION_VISIBILITY })
}

function updatePanelPosition() {
  if (!containerRef.value) return
  const rect = containerRef.value.getBoundingClientRect()
  const panelWidth = 288
  const panelHeight = 320
  let left = rect.left
  if (left + panelWidth > window.innerWidth - 16) {
    left = window.innerWidth - panelWidth - 16
  }
  left = Math.max(16, left)
  let top = rect.bottom + 4
  if (top + panelHeight > window.innerHeight - 16) {
    top = Math.max(16, rect.top - panelHeight - 4)
  } else {
    top = Math.max(16, top)
  }
  panelStyle.value = { top: `${top}px`, left: `${left}px` }
}

function toggleOpen() {
  isOpen.value = !isOpen.value
}

watch(isOpen, (open) => {
  if (open) updatePanelPosition()
})

function handleClickOutside(event: MouseEvent) {
  if (!isOpen.value) return
  const t = event.target as Node
  if (containerRef.value?.contains(t) || panelRef.value?.contains(t)) return
  isOpen.value = false
}

onMounted(() => {
  document.addEventListener('mousedown', handleClickOutside)
})
onUnmounted(() => {
  document.removeEventListener('mousedown', handleClickOutside)
})
</script>
