<template>
  <Card>
    <CardContent class="space-y-6 p-6">
      <div class="space-y-2">
        <h3 class="text-lg font-semibold text-slate-900">Anything else we should know?</h3>
        <p class="text-sm text-slate-600">Add notes and optional documents for your service visit.</p>
      </div>

      <div class="space-y-3">
        <label class="text-sm font-medium text-slate-700">Additional information</label>
        <textarea
          :value="notes"
          rows="4"
          placeholder="Share extra details for the technician..."
          class="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none"
          @input="onNotesInput"
        />
      </div>

      <div class="space-y-3">
        <label class="text-sm font-medium text-slate-700">Attach photos or documents</label>
        <Input type="file" multiple accept=".jpg,.jpeg,.png,.gif,.pdf" @input="onFilesPicked" />
        <p class="text-xs text-slate-500">Accepted: JPG, PNG, GIF, PDF</p>

        <div v-if="attachments.length > 0" class="rounded-md border border-slate-200 bg-slate-50 p-3">
          <p class="mb-2 text-xs font-medium text-slate-600">Selected files</p>
          <ul class="space-y-1 text-sm text-slate-700">
            <li v-for="file in attachments" :key="file.name + file.size">- {{ file.name }}</li>
          </ul>
        </div>
      </div>

      <div class="flex justify-end gap-3 border-t pt-4">
        <Button variant="outline" @click="$emit('back')">Back</Button>
        <Button :disabled="isUploading" @click="$emit('next')">
          {{ isUploading ? 'Uploading...' : 'Next' }}
        </Button>
      </div>
    </CardContent>
  </Card>
</template>

<script setup lang="ts">
import Input from '@/components/ui/Input.vue'
import Card from '@/components/ui/Card.vue'
import CardContent from '@/components/ui/CardContent.vue'
import Button from '@/components/ui/Button.vue'

interface Props {
  notes: string
  attachments: File[]
  isUploading?: boolean
}

defineProps<Props>()

const emit = defineEmits<{
  'update:notes': [value: string]
  'update:attachments': [files: File[]]
  next: []
  back: []
}>()

const onNotesInput = (event: Event) => {
  emit('update:notes', (event.target as HTMLTextAreaElement).value)
}

const onFilesPicked = (event: Event) => {
  const input = event.target as HTMLInputElement
  emit('update:attachments', Array.from(input.files || []))
}
</script>
