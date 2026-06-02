<template>
  <div class="relative" ref="containerRef">
    <div class="flex items-center gap-2">
      <!-- Preset dropdown -->
      <div class="relative">
        <button
          @click="isDropdownOpen = !isDropdownOpen"
          class="flex items-center gap-2 h-10 px-3 rounded-md border border-input bg-background text-sm hover:bg-slate-50 transition-colors"
        >
          <PhBookmarkSimple :size="16" weight="regular" />
          <span class="max-w-[120px] truncate">
            {{ selectedPreset?.name || 'Filter Presets' }}
          </span>
          <PhCaretDown :size="12" weight="bold" :class="['transition-transform', { 'rotate-180': isDropdownOpen }]" />
        </button>

        <!-- Dropdown menu -->
        <Teleport to="body">
          <div
            v-if="isDropdownOpen"
            ref="dropdownRef"
            class="fixed z-[100] w-64 rounded-md border bg-white shadow-lg py-1"
            :style="dropdownStyle"
          >
            <!-- Presets list -->
            <div v-if="presets.length > 0" class="max-h-48 overflow-y-auto">
              <button
                v-for="preset in presets"
                :key="preset.id"
                @click="selectPreset(preset)"
                class="w-full flex items-center justify-between px-3 py-2 text-sm text-left hover:bg-slate-50 transition-colors"
              >
                <span class="flex items-center gap-2 truncate">
                  <PhStar v-if="preset.isDefault" :size="14" weight="fill" class="text-amber-500 flex-shrink-0" />
                  <span class="truncate">{{ preset.name }}</span>
                </span>
                <div class="flex items-center gap-1 flex-shrink-0">
                  <button
                    @click.stop="openEditDialog(preset)"
                    class="p-1 rounded hover:bg-slate-200 text-slate-500 hover:text-slate-700"
                    title="Rename preset"
                  >
                    <PhPencil :size="14" weight="regular" />
                  </button>
                  <button
                    @click.stop="setAsDefault(preset)"
                    class="p-1 rounded hover:bg-slate-200"
                    :title="preset.isDefault ? 'Default preset' : 'Set as default'"
                  >
                    <PhStar :size="14" :weight="preset.isDefault ? 'fill' : 'regular'" class="text-amber-500" />
                  </button>
                  <button
                    @click.stop="deletePreset(preset)"
                    class="p-1 rounded hover:bg-slate-200 text-slate-500 hover:text-red-500"
                    title="Delete preset"
                  >
                    <PhTrash :size="14" weight="regular" />
                  </button>
                </div>
              </button>
            </div>
            <div v-else class="px-3 py-4 text-sm text-slate-500 text-center">
              No saved presets
            </div>

            <template v-if="selectedPreset">
              <div class="border-t my-1" />
              <button
                @click="clearSelection"
                class="w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-slate-50 transition-colors text-slate-500"
              >
                <PhX :size="16" weight="regular" />
                Clear Selection
              </button>
            </template>
          </div>
        </Teleport>
      </div>
    </div>
  </div>

  <!-- Edit Preset Dialog -->
  <Dialog :model-value="!!editingPreset" @update:model-value="(v) => !v && closeEditDialog()">
    <DialogContent class="max-w-sm">
      <DialogHeader>
        <DialogTitle>Edit Preset</DialogTitle>
      </DialogHeader>
      <div class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-slate-700 mb-1">Preset Name</label>
          <Input
            v-model="editName"
            placeholder="e.g., My Daily View"
            class="w-full"
            @keyup.enter="saveEditDialog"
          />
        </div>
        <label class="flex items-center gap-2 text-sm cursor-pointer">
          <Checkbox v-model:checked="editIsDefault" />
          <span>Set as default preset</span>
        </label>
      </div>
      <div class="flex justify-end gap-2 mt-4">
        <Button variant="outline" @click="closeEditDialog">Cancel</Button>
        <Button variant="brand" @click="saveEditDialog" :disabled="!editName.trim()">
          Save Preset
        </Button>
      </div>
    </DialogContent>
  </Dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import {
  PhBookmarkSimple,
  PhCaretDown,
  PhPencil,
  PhStar,
  PhTrash,
  PhX
} from '@phosphor-icons/vue'
import Button from '@/components/ui/Button.vue'
import Checkbox from '@/components/ui/Checkbox.vue'
import Dialog from '@/components/ui/Dialog.vue'
import DialogContent from '@/components/ui/DialogContent.vue'
import DialogHeader from '@/components/ui/DialogHeader.vue'
import DialogTitle from '@/components/ui/DialogTitle.vue'
import Input from '@/components/ui/Input.vue'
import type { FilterPreset } from '@/types/ticket'

interface Props {
  presets: FilterPreset[]
  selectedPresetId?: string | null
}

const props = withDefaults(defineProps<Props>(), {
  presets: () => [],
  selectedPresetId: null
})

const emit = defineEmits<{
  select: [preset: FilterPreset]
  delete: [presetId: string]
  setDefault: [presetId: string]
  clearSelection: []
  'update-preset': [preset: FilterPreset]
}>()

const containerRef = ref<HTMLElement | null>(null)
const dropdownRef = ref<HTMLElement | null>(null)
const isDropdownOpen = ref(false)
const dropdownStyle = ref({ top: '0px', left: '0px' })

// Edit preset dialog state
const editingPreset = ref<FilterPreset | null>(null)
const editName = ref('')
const editIsDefault = ref(false)

const selectedPreset = computed(() => 
  props.presets.find(p => p.id === props.selectedPresetId) || null
)

function updateDropdownPosition() {
  if (containerRef.value) {
    const rect = containerRef.value.getBoundingClientRect()
    dropdownStyle.value = {
      top: `${rect.bottom + 4}px`,
      left: `${Math.max(8, rect.left)}px`
    }
  }
}

function selectPreset(preset: FilterPreset) {
  emit('select', preset)
  isDropdownOpen.value = false
}

function deletePreset(preset: FilterPreset) {
  emit('delete', preset.id)
}

function setAsDefault(preset: FilterPreset) {
  emit('setDefault', preset.id)
}

function openEditDialog(preset: FilterPreset) {
  editingPreset.value = preset
  editName.value = preset.name
  editIsDefault.value = preset.isDefault ?? false
  isDropdownOpen.value = false
}

function closeEditDialog() {
  editingPreset.value = null
  editName.value = ''
  editIsDefault.value = false
}

function saveEditDialog() {
  if (!editingPreset.value || !editName.value.trim()) return
  emit('update-preset', {
    ...editingPreset.value,
    name: editName.value.trim(),
    isDefault: editIsDefault.value
  })
  closeEditDialog()
}

function clearSelection() {
  emit('clearSelection')
  isDropdownOpen.value = false
}

// Update position when dropdown opens
watch(isDropdownOpen, (open) => {
  if (open) {
    updateDropdownPosition()
  }
})

// Close dropdown on outside click
onMounted(() => {
  const handleClickOutside = (event: MouseEvent) => {
    if (!isDropdownOpen.value) return
    
    if (containerRef.value && !containerRef.value.contains(event.target as Node) &&
        dropdownRef.value && !dropdownRef.value.contains(event.target as Node)) {
      isDropdownOpen.value = false
    }
  }
  
  document.addEventListener('mousedown', handleClickOutside)
  
  onUnmounted(() => {
    document.removeEventListener('mousedown', handleClickOutside)
  })
})
</script>
