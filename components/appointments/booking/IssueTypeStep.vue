<template>
  <Card>
    <CardContent class="space-y-6 p-6">
      <div class="space-y-2">
        <h3 class="text-lg font-semibold text-slate-900">{{ question.prompt }}</h3>
        <p class="text-sm text-slate-600">Select the option that best matches your issue.</p>
      </div>

      <div class="space-y-3">
        <button
          v-for="option in question.options"
          :key="option.id"
          type="button"
          :class="[
            'w-full rounded-md border px-4 py-3 text-left transition-colors',
            selectedOption === option.id
              ? 'border-brand-accent bg-brand-accent/5 text-slate-900'
              : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50',
          ]"
          @click="selectedOption = option.id"
        >
          {{ option.label }}
        </button>
      </div>

      <div class="flex justify-end gap-3 border-t pt-4">
        <Button variant="outline" @click="$emit('back')">Back</Button>
        <Button :disabled="!selectedOption" @click="$emit('next', selectedOption)">Next</Button>
      </div>
    </CardContent>
  </Card>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { AppointmentIssueQuestion } from '@/types/appointment'
import Card from '@/components/ui/Card.vue'
import CardContent from '@/components/ui/CardContent.vue'
import Button from '@/components/ui/Button.vue'

interface Props {
  question: AppointmentIssueQuestion
  modelValue: string
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
  next: [value: string]
  back: []
}>()

const selectedOption = computed({
  get: () => props.modelValue,
  set: (value: string) => emit('update:modelValue', value),
})
</script>
