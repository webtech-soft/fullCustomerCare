<template>
  <Card>
    <CardContent class="space-y-6 p-6">
      <div class="space-y-2">
        <h3 class="text-lg font-semibold text-slate-900">Help us pinpoint the issue</h3>
        <p class="text-sm text-slate-600">Answer a few quick questions for your technician.</p>
      </div>

      <div class="space-y-6">
        <div v-for="question in questions" :key="question.id" class="space-y-3">
          <p class="text-sm font-medium text-slate-800">{{ question.prompt }}</p>
          <div class="space-y-2">
            <button
              v-for="option in question.options"
              :key="option.id"
              type="button"
              :class="[
                'w-full rounded-md border px-4 py-2.5 text-left text-sm transition-colors',
                answers[question.id] === option.id
                  ? 'border-brand-accent bg-brand-accent/5 text-slate-900'
                  : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50',
              ]"
              @click="setAnswer(question.id, option.id)"
            >
              {{ option.label }}
            </button>
          </div>
        </div>
      </div>

      <div class="flex justify-end gap-3 border-t pt-4">
        <Button variant="outline" @click="$emit('back')">Back</Button>
        <Button :disabled="!allAnswered" @click="$emit('next')">Next</Button>
      </div>
    </CardContent>
  </Card>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { AppointmentIssueAnswers, AppointmentIssueQuestion } from '@/types/appointment'
import Card from '@/components/ui/Card.vue'
import CardContent from '@/components/ui/CardContent.vue'
import Button from '@/components/ui/Button.vue'

interface Props {
  questions: AppointmentIssueQuestion[]
  modelValue: AppointmentIssueAnswers
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'update:modelValue': [value: AppointmentIssueAnswers]
  next: []
  back: []
}>()

const answers = computed(() => props.modelValue || {})
const allAnswered = computed(() => props.questions.every((question) => Boolean(answers.value[question.id])))

const setAnswer = (questionId: string, optionId: string) => {
  emit('update:modelValue', {
    ...answers.value,
    [questionId]: optionId,
  })
}
</script>
