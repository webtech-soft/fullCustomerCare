<template>
  <select
    ref="selectRef"
    :value="modelValue"
    @input="$emit('update:modelValue', ($event.target as HTMLSelectElement).value)"
    @keydown.enter.prevent="handleEnterKey"
    @focus="handleFocus"
    :class="cn(
      'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
      $attrs.class
    )"
    v-bind="$attrs"
  >
    <slot />
  </select>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { cn } from '@/lib/utils'

withDefaults(defineProps<{
  modelValue?: string | number
}>(), {
  modelValue: ''
})

defineEmits<{
  'update:modelValue': [value: string | number]
}>()

const selectRef = ref<HTMLSelectElement | null>(null)

const handleEnterKey = (event: KeyboardEvent) => {
  // Get all focusable elements in the form
  const form = selectRef.value?.closest('form')
  if (!form) return

  const focusableElements = form.querySelectorAll<HTMLElement>(
    'input:not([type="hidden"]):not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled])'
  )

  const elementsArray = Array.from(focusableElements)
  const currentIndex = elementsArray.indexOf(selectRef.value!)

  // Find next focusable element
  if (currentIndex !== -1 && currentIndex < elementsArray.length - 1) {
    const nextElement = elementsArray[currentIndex + 1]
    // Skip textarea elements (allow Enter for new lines)
    if (nextElement.tagName === 'TEXTAREA') {
      if (currentIndex + 1 < elementsArray.length - 1) {
        elementsArray[currentIndex + 2]?.focus()
      }
    } else {
      nextElement.focus()
    }
  }
}

const handleFocus = (event: FocusEvent) => {
  const target = event.target as HTMLElement
  if (target) {
    // Scroll the field into view with some padding from the top
    setTimeout(() => {
      target.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'center',
        inline: 'nearest'
      })
    }, 100)
  }
}
</script>
