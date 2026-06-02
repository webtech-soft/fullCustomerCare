<template>
  <div class="w-full">
    <div class="flex items-center gap-2 mb-3">
      <PhGearSix :size="16" weight="regular" class="text-slate-500 shrink-0" />
      <span class="text-sm font-medium text-slate-700">Card Fields</span>
      <Badge v-if="visibleCount < totalCount" class="bg-slate-200 text-slate-600 text-xs">
        {{ visibleCount }}/{{ totalCount }}
      </Badge>
    </div>

    <div class="grid grid-cols-5 gap-x-4 gap-y-1.5 mb-3">
      <label
        v-for="field in inlineOrderedFields"
        :key="field.key"
        class="flex items-center gap-2 py-1.5 rounded hover:bg-slate-50 cursor-pointer"
      >
        <Checkbox
          :checked="isFieldChecked(field.key)"
          @update:checked="() => toggleField(field.key)"
          class="shrink-0"
        />
        <span class="text-sm text-slate-700 truncate">{{ field.label }}</span>
      </label>
    </div>

    <div class="flex flex-wrap items-center justify-between gap-2 text-xs">
      <div class="flex items-center gap-3">
        <button
          type="button"
          class="text-brand-accent hover:underline"
          @click="showAll"
        >
          Show All
        </button>
        <button
          type="button"
          class="text-slate-500 hover:underline"
          @click="resetToDefault"
        >
          Reset to Default
        </button>
      </div>
      <!-- Spacer so layout matches ColumnConfigurator (Reorder columns button height) -->
      <div class="h-8 w-[130px] shrink-0" aria-hidden="true" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import Checkbox from '@/components/ui/Checkbox.vue'
import Badge from '@/components/ui/Badge.vue'
import { PhGearSix } from '@phosphor-icons/vue'
import { DISPLAY_FIELDS, DEFAULT_CARD_FIELDS, DEFAULT_TABLE_COLUMNS, type DisplayFieldConfig } from '@/types/ticket'

interface Props {
  visibleFields: string[]
  fieldOrder: string[]
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'update:visible-fields': [fields: string[]]
  'update:field-order': [order: string[]]
}>()

const allFields = DISPLAY_FIELDS
const totalCount = allFields.length

const INLINE_GRID_COLS = 5
const INLINE_GRID_ROWS = 6

const inlineOrderedFields = computed<DisplayFieldConfig[]>(() => {
  const defaultKeys = DEFAULT_TABLE_COLUMNS
  const defaultFields = defaultKeys
    .map(key => allFields.find(f => f.key === key))
    .filter((f): f is DisplayFieldConfig => f != null)
  const otherFields = allFields.filter(f => !defaultKeys.includes(f.key))

  // First two columns in row-major 5×6 grid are at indices: 0,5,10,15,20,25 (col 0) and 1,6,11,16,21,26 (col 1)
  const firstTwoColumnIndices = [0, 5, 10, 15, 20, 25, 1, 6, 11, 16, 21, 26]
  const result: (DisplayFieldConfig | null)[] = Array(INLINE_GRID_COLS * INLINE_GRID_ROWS).fill(null)

  firstTwoColumnIndices.forEach((idx, i) => {
    if (i < defaultFields.length && idx < result.length) {
      result[idx] = defaultFields[i]
    }
  })

  let otherIdx = 0
  for (let i = 0; i < result.length; i++) {
    if (result[i] == null && otherIdx < otherFields.length) {
      result[i] = otherFields[otherIdx++]
    }
  }

  return result.filter((f): f is DisplayFieldConfig => f != null)
})

const visibleCount = computed(() => props.visibleFields.length)

function isFieldChecked(key: string): boolean {
  return props.visibleFields.includes(key)
}

function toggleField(key: string) {
  const isChecked = isFieldChecked(key)
  const nextVisible = isChecked
    ? props.visibleFields.filter((k) => k !== key)
    : [...props.visibleFields, key]

  emit('update:visible-fields', nextVisible)

  // Keep a stable ordering list so cards can respect field order,
  // even though we don't expose a separate reorder UI.
  if (!props.fieldOrder.includes(key)) {
    emit('update:field-order', [...props.fieldOrder, key])
  }
}

function showAll() {
  const allKeys = allFields.map((f) => f.key)
  emit('update:visible-fields', allKeys)

  const newOrder = [...props.fieldOrder]
  for (const key of allKeys) {
    if (!newOrder.includes(key)) {
      newOrder.push(key)
    }
  }
  emit('update:field-order', newOrder)
}

function resetToDefault() {
  const defaults = [...DEFAULT_CARD_FIELDS]
  emit('update:visible-fields', defaults)
  emit('update:field-order', defaults)
}
</script>
