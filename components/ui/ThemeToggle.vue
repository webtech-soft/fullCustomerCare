<template>
  <Button
    type="button"
    variant="outline"
    size="sm"
    class="shrink-0 gap-1.5 border-input max-sm:h-9 max-sm:w-9 max-sm:p-0 max-sm:justify-center max-sm:gap-0"
    :aria-pressed="isDark"
    :aria-label="isDark ? 'Switch to light mode' : 'Switch to dark mode'"
    :title="isDark ? 'Light mode' : 'Dark mode'"
    data-keep-filters-open="true"
    @click.stop="toggle"
  >
    <PhSun v-if="isDark" :size="18" weight="regular" class="shrink-0" aria-hidden="true" />
    <PhMoon v-else :size="18" weight="regular" class="shrink-0" aria-hidden="true" />
    <span class="hidden text-xs sm:inline">{{ isDark ? 'Light' : 'Dark' }}</span>
  </Button>
</template>

<script setup lang="ts">
import { PhMoon, PhSun } from '@phosphor-icons/vue'
import { useColorMode } from '@/composables/useColorMode'
import Button from '@/components/ui/Button.vue'

const { isDark, toggle } = useColorMode()
</script>
