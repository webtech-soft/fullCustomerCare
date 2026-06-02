<template>
  <div class="relative" ref="containerRef">
    <!-- Popover variant: button + teleported panel -->
    <template v-if="variant === 'popover'">
      <button
        @click="isOpen = !isOpen"
        class="flex items-center gap-2 h-9 px-3 rounded-md border border-slate-300 bg-white text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
      >
        <PhGearSix :size="16" weight="regular" />
        <span>Fields</span>
        <Badge v-if="hiddenCount > 0" class="ml-1 bg-slate-200 text-slate-600 text-xs">
          {{ visibleColumns.length }}/{{ allFields.length }}
        </Badge>
      </button>

      <Teleport to="body">
        <div
          v-if="isOpen"
          ref="panelRef"
          class="fixed z-[100] w-[calc(100vw-2rem)] sm:w-80 max-w-sm rounded-md border bg-white shadow-lg flex flex-col max-h-[min(85dvh,40rem)]"
          :style="panelStyle"
        >
          <div class="p-3 border-b shrink-0">
            <div class="flex items-center justify-between">
              <h3 class="text-sm font-semibold text-slate-900">Configure Fields</h3>
              <button @click="isOpen = false" class="p-1 rounded hover:bg-slate-100">
                <PhX :size="16" weight="regular" class="text-slate-500" />
              </button>
            </div>
          </div>

          <div class="overflow-y-auto p-2 min-h-0 flex-1 max-h-[70dvh]">
            <template v-for="section in reorderSections" :key="section.id">
              <p class="text-xs font-medium text-slate-500 uppercase tracking-wide pt-2 first:pt-0 pb-1">
                {{ section.label }}
              </p>
              <div
                v-for="item in section.items"
                :key="item.field.key"
                class="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-slate-50"
                draggable="true"
                @dragstart="handleDragStart(item.index)"
                @dragover.prevent="handleDragOver(item.index)"
                @drop="handleDrop(item.index)"
                @dragend="handleDragEnd"
              >
                <div class="cursor-grab text-slate-400 hover:text-slate-600">
                  <PhDotsSixVertical :size="16" weight="bold" />
                </div>
                <Checkbox
                  :checked="visibleColumns.includes(item.field.key)"
                  @update:checked="(val) => toggleColumn(item.field.key, val)"
                />
                <span class="text-sm text-slate-700 flex-1" :title="item.field.label">{{ item.field.label }}</span>
              </div>
            </template>
          </div>

          <div class="p-3 border-t flex justify-between shrink-0">
            <button
              @click="showAll"
              class="text-xs text-brand-accent hover:underline"
            >
              Show All
            </button>
            <button
              @click="resetToDefault"
              class="text-xs text-slate-500 hover:underline"
            >
              Reset to Default
            </button>
          </div>
        </div>
      </Teleport>
    </template>

    <!-- Inline variant: columns section embedded in advanced filters (always visible, grid of checkboxes) -->
    <div v-else class="w-full" ref="inlineContainerRef">
      <div class="flex items-center gap-2 mb-3">
        <PhGearSix :size="16" weight="regular" class="text-slate-500 shrink-0" />
        <span class="text-sm font-medium text-slate-700">Fields</span>
        <Badge v-if="hiddenCount > 0" class="bg-slate-200 text-slate-600 text-xs">
          {{ visibleColumns.length }}/{{ allFields.length }}
        </Badge>
      </div>
      <div class="mb-3">
        <!-- Collapsed: flat list of selected fields only -->
        <div
          v-if="!showMoreFields"
          class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-x-4 gap-y-1.5"
        >
          <label
            v-for="field in inlineCollapsedFields"
            :key="field.key"
            class="flex items-center gap-2 py-1.5 rounded hover:bg-slate-50 cursor-pointer"
          >
            <Checkbox
              :checked="visibleColumns.includes(field.key)"
              @update:checked="(val) => toggleColumn(field.key, val)"
              class="shrink-0"
            />
            <span class="text-sm text-slate-700 truncate" :title="field.label">{{ field.label }}</span>
          </label>
        </div>
        <!-- Expanded: sections with category headers -->
        <div v-else class="space-y-3">
          <div v-for="section in inlineSections" :key="section.id" class="space-y-1.5">
            <p class="text-xs font-medium text-slate-500 uppercase tracking-wide">{{ section.label }}</p>
            <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-x-4 gap-y-1.5">
              <label
                v-for="field in section.fields"
                :key="field.key"
                class="flex items-center gap-2 py-1.5 rounded hover:bg-slate-50 cursor-pointer"
              >
                <Checkbox
                  :checked="visibleColumns.includes(field.key)"
                  @update:checked="(val) => toggleColumn(field.key, val)"
                  class="shrink-0"
                />
                <span class="text-sm text-slate-700 truncate" :title="field.label">{{ field.label }}</span>
              </label>
            </div>
          </div>
        </div>
      </div>
      <div class="flex flex-wrap items-center gap-3 text-xs">
        <div class="flex items-center gap-3">
          <button
            type="button"
            @click="showMoreFields = !showMoreFields"
            class="text-brand-accent hover:underline"
          >
            {{ showMoreFields ? 'Show fewer fields' : 'Show more fields' }}
          </button>
          <button
            type="button"
            @click="showAll"
            class="text-brand-accent hover:underline"
          >
            Select all
          </button>
          <button
            type="button"
            @click="resetToDefault"
            class="text-slate-500 hover:underline"
          >
            Reset to Default
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import Badge from '@/components/ui/Badge.vue'
import Checkbox from '@/components/ui/Checkbox.vue'
import { PhGearSix, PhX, PhDotsSixVertical } from '@phosphor-icons/vue'
import {
  DISPLAY_FIELDS,
  DISPLAY_FIELD_CATEGORIES,
  DEFAULT_TABLE_COLUMNS,
  FINANCIAL_FIELD_KEYS,
  type DisplayFieldConfig,
  type DisplayFieldCategory,
} from '@/types/ticket'
import { anchoredPopoverWidthPx, clampPopoverLeft, getVisualViewportHeight } from '@/lib/popover-position'

interface Props {
  visibleColumns: string[]
  columnOrder?: string[]
  defaultColumns?: string[]
  /** Optional source for collapsed rows; defaults to visibleColumns when omitted. */
  collapsedFieldKeys?: string[]
  /** 'popover' = button that opens a separate dropdown; 'inline' = expandable section inside parent (e.g. advanced filters) */
  variant?: 'popover' | 'inline'
  canViewFinancial?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  columnOrder: () => [],
  defaultColumns: () => [...DEFAULT_TABLE_COLUMNS],
  variant: 'popover',
  canViewFinancial: true,
})

const emit = defineEmits<{
  'update:visibleColumns': [columns: string[]]
  'update:columnOrder': [order: string[]]
}>()

const containerRef = ref<HTMLElement | null>(null)
const panelRef = ref<HTMLElement | null>(null)
const isOpen = ref(false)
const panelStyle = ref({ top: '0px', left: '0px' })
const draggedIndex = ref<number | null>(null)

// Inline variant: show more fields
const inlineContainerRef = ref<HTMLElement | null>(null)
const showMoreFields = ref(false)

const financialFieldKeySet = new Set<string>(FINANCIAL_FIELD_KEYS)

const allFields = computed(() =>
  props.canViewFinancial
    ? DISPLAY_FIELDS
    : DISPLAY_FIELDS.filter((f) => !financialFieldKeySet.has(f.key)),
)

/** Master list: fields ordered by category, then by columnOrder within each category. */
const masterOrderedFields = computed<DisplayFieldConfig[]>(() => {
  const result: DisplayFieldConfig[] = []
  const orderSet = props.columnOrder.length > 0 ? props.columnOrder : null
  for (const { id: categoryId } of DISPLAY_FIELD_CATEGORIES) {
    const inCategory = allFields.value.filter(f => f.category === categoryId)
    if (orderSet) {
      inCategory.sort((a, b) => {
        const ia = orderSet.indexOf(a.key)
        const ib = orderSet.indexOf(b.key)
        if (ia === -1 && ib === -1) return 0
        if (ia === -1) return 1
        if (ib === -1) return -1
        return ia - ib
      })
    }
    result.push(...inCategory)
  }
  return result
})

const orderedFields = masterOrderedFields

/** For inline variant: sections (category + fields). When collapsed, only visible fields in each section; when expanded, all fields. */
interface InlineSection {
  id: DisplayFieldCategory
  label: string
  fields: DisplayFieldConfig[]
}

/** When collapsed: flat list of selected fields only (no category headers). */
const inlineCollapsedFields = computed<DisplayFieldConfig[]>(() =>
  masterOrderedFields.value.filter((f) => (props.collapsedFieldKeys ?? props.visibleColumns).includes(f.key))
)

const inlineSections = computed<InlineSection[]>(() => {
  if (!showMoreFields.value) return []
  return DISPLAY_FIELD_CATEGORIES.map(({ id, label }) => {
    const fields = masterOrderedFields.value.filter(f => f.category === id)
    return { id, label, fields }
  }).filter(section => section.fields.length > 0)
})

/** Reorder popover: sections with fields and their global index in orderedFields for drag-drop. */
interface ReorderSectionItem {
  field: DisplayFieldConfig
  index: number
}
const reorderSections = computed<{ id: DisplayFieldCategory; label: string; items: ReorderSectionItem[] }[]>(() => {
  const ordered = orderedFields.value
  return DISPLAY_FIELD_CATEGORIES.map(({ id, label }) => ({
    id,
    label,
    items: ordered
      .map((field, index) => ({ field, index }))
      .filter(({ field }) => field.category === id)
  })).filter(s => s.items.length > 0)
})

const hiddenCount = computed(() => allFields.value.length - props.visibleColumns.length)

function updatePanelPosition() {
  if (containerRef.value) {
    const rect = containerRef.value.getBoundingClientRect()
    const panelWidth = anchoredPopoverWidthPx()
    const vh = getVisualViewportHeight()
    const panelHeight = Math.min(vh * 0.85, 640)
    const margin = 16

    const left = clampPopoverLeft(rect.left, panelWidth, margin)

    let top = rect.bottom + 4
    if (top + panelHeight > vh - margin) {
      top = Math.max(margin, rect.top - panelHeight - 4)
    } else {
      top = Math.max(margin, top)
    }

    panelStyle.value = {
      top: `${top}px`,
      left: `${left}px`,
    }
  }
}

function toggleColumn(key: string, visible: boolean) {
  const columns = [...props.visibleColumns]
  if (visible && !columns.includes(key)) {
    columns.push(key)
  } else if (!visible) {
    const index = columns.indexOf(key)
    if (index > -1) columns.splice(index, 1)
  }
  emit('update:visibleColumns', columns)
}

function showAll() {
  if (props.variant === 'inline') {
    showMoreFields.value = true
  }
  emit('update:visibleColumns', allFields.value.map(f => f.key))
}

function resetToDefault() {
  emit('update:visibleColumns', [...props.defaultColumns])
  emit('update:columnOrder', [...props.defaultColumns])
}

function handleDragStart(index: number) {
  draggedIndex.value = index
}

function handleDragOver(index: number) {
  if (draggedIndex.value === null || draggedIndex.value === index) return
}

function handleDrop(index: number) {
  if (draggedIndex.value === null || draggedIndex.value === index) return
  
  const newOrder = orderedFields.value.map(f => f.key)
  const [removed] = newOrder.splice(draggedIndex.value, 1)
  newOrder.splice(index, 0, removed)
  
  emit('update:columnOrder', newOrder)
  draggedIndex.value = null
}

function handleDragEnd() {
  draggedIndex.value = null
}

watch(isOpen, (open) => {
  if (open) {
    updatePanelPosition()
  }
})

onMounted(() => {
  const handleClickOutside = (event: MouseEvent) => {
    if (isOpen.value) {
      if (containerRef.value && !containerRef.value.contains(event.target as Node) &&
          panelRef.value && !panelRef.value.contains(event.target as Node)) {
        isOpen.value = false
      }
    }
  }
  
  document.addEventListener('mousedown', handleClickOutside)
  
  onUnmounted(() => {
    document.removeEventListener('mousedown', handleClickOutside)
  })
})
</script>
