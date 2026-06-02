<template>
  <Dialog :model-value="modelValue" :close-on-backdrop="false" @update:model-value="emit('update:modelValue', $event)">
    <DialogContent class="max-w-lg gap-5">
      <DialogHeader class="flex flex-row items-start gap-3 space-y-0 text-left sm:flex-nowrap">
        <img
          src="/HITS%20-%20HD.png"
          alt="HITS"
          width="120"
          height="40"
          class="h-10 w-auto shrink-0 object-contain sm:h-11"
          decoding="async"
        />
        <DialogTitle
          class="flex-1 min-w-0 text-xl sm:text-2xl leading-tight"
        >
          A Smarter Way to Manage Tickets
        </DialogTitle>
      </DialogHeader>
      <p class="text-sm text-foreground leading-relaxed">
        This page brings your queue, customer touchpoints, and layout choices together in one place. Here is what you can do:
      </p>
      <ul class="list-disc pl-5 text-sm text-foreground space-y-2 leading-relaxed">
        <li>
          <strong>Find the right tickets first</strong> — filter by date, status, advisor, or tech so nothing falls through the cracks.
        </li>
        <li>
          <strong>Work in the layout that fits your role</strong> — table for managers, card view for the floor, progress view for a snapshot.
        </li>
        <li>
          <strong>Pick up where you left off</strong> — save your preferred views as presets and organize work with group-by tabs.
        </li>
        <li>
          <strong>Act without leaving the queue</strong> — view details, send a chat, check the timeline, or submit an approval from any row.
        </li>
      </ul>
      <p class="text-sm text-muted-foreground">
        Take a short guided tour to see these in context, or go straight to your queue.
      </p>
      <div class="flex flex-col-reverse gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-3 pt-2 border-t border-border">
        <div class="flex flex-col gap-2 sm:flex-row sm:gap-2">
          <Button type="button" variant="outline" class="w-full sm:w-auto" @click="emit('remind')">
            Remind me next time
          </Button>
          <Button type="button" variant="ghost" class="w-full sm:w-auto text-muted-foreground" @click="emit('skip')">
            Skip
          </Button>
        </div>
        <Button type="button" variant="brand" class="w-full sm:w-auto shrink-0" @click="emit('start-tour')">
          Start tour
        </Button>
      </div>
    </DialogContent>
  </Dialog>
</template>

<script setup lang="ts">
import Button from '@/components/ui/Button.vue'
import Dialog from '@/components/ui/Dialog.vue'
import DialogContent from '@/components/ui/DialogContent.vue'
import DialogHeader from '@/components/ui/DialogHeader.vue'
import DialogTitle from '@/components/ui/DialogTitle.vue'

defineProps<{
  modelValue: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  'start-tour': []
  'skip': []
  'remind': []
}>()
</script>
