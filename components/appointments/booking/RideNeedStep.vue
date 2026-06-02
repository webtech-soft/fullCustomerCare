<template>
  <Card>
    <CardContent class="space-y-6 p-6">
      <div class="space-y-2">
        <h3 class="text-lg font-semibold text-slate-900">Do you need a ride?</h3>
        <p class="text-sm text-slate-600">Let us know if transportation support is needed.</p>
      </div>

      <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <button
          type="button"
          :class="buttonClass(needsRide === true)"
          @click="$emit('update:modelValue', true)"
        >
          Yes, I need a ride
        </button>
        <button
          type="button"
          :class="buttonClass(needsRide === false)"
          @click="$emit('update:modelValue', false)"
        >
          No, I have a ride
        </button>
      </div>

      <div class="flex justify-end gap-3 border-t pt-4">
        <Button variant="outline" @click="$emit('back')">Back</Button>
        <Button :disabled="needsRide === null" @click="$emit('next')">Next</Button>
      </div>
    </CardContent>
  </Card>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import Card from '@/components/ui/Card.vue'
import CardContent from '@/components/ui/CardContent.vue'
import Button from '@/components/ui/Button.vue'

interface Props {
  modelValue: boolean | null
}

const props = defineProps<Props>()

defineEmits<{
  'update:modelValue': [value: boolean]
  next: []
  back: []
}>()

const needsRide = computed(() => props.modelValue)

const buttonClass = (selected: boolean) =>
  [
    'rounded-md border px-4 py-3 text-left transition-colors',
    selected
      ? 'border-brand-accent bg-brand-accent/5 text-slate-900'
      : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50',
  ]
</script>
