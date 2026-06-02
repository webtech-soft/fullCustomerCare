<template>
  <Card>
    <CardContent class="space-y-6 p-6">
      <div class="space-y-2">
        <h3 class="text-lg font-semibold text-slate-900">Tell us about you</h3>
        <p class="text-sm text-slate-600">We could not find an existing customer record.</p>
      </div>

      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div class="space-y-2 sm:col-span-2">
          <Label>Name</Label>
          <Input :model-value="form.name" @update:model-value="setField('name', $event)" />
        </div>
        <div class="space-y-2 sm:col-span-2">
          <Label>Address</Label>
          <Input :model-value="form.address.street" @update:model-value="setAddressField('street', $event)" />
        </div>
        <div class="space-y-2">
          <Label>City</Label>
          <Input :model-value="form.address.city" @update:model-value="setAddressField('city', $event)" />
        </div>
        <div class="space-y-2">
          <Label>State</Label>
          <Input :model-value="form.address.state" @update:model-value="setAddressField('state', $event)" />
        </div>
        <div class="space-y-2">
          <Label>ZIP</Label>
          <Input :model-value="form.address.zip" @update:model-value="setAddressField('zip', $event)" />
        </div>
        <div class="space-y-2 sm:col-span-2">
          <Label>Email</Label>
          <Input :model-value="form.email" @update:model-value="setField('email', $event)" />
        </div>
      </div>

      <div class="flex justify-end gap-3 border-t pt-4">
        <Button variant="outline" @click="$emit('back')">Back</Button>
        <Button :disabled="!isValid" @click="$emit('next')">Next</Button>
      </div>
    </CardContent>
  </Card>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import Card from '@/components/ui/Card.vue'
import CardContent from '@/components/ui/CardContent.vue'
import Label from '@/components/ui/Label.vue'
import Input from '@/components/ui/Input.vue'
import Button from '@/components/ui/Button.vue'

interface IdentityForm {
  name: string
  email: string
  address: {
    street: string
    city: string
    state: string
    zip: string
  }
}

interface Props {
  modelValue: IdentityForm
}

const props = defineProps<Props>()
const emit = defineEmits<{
  'update:modelValue': [value: IdentityForm]
  next: []
  back: []
}>()

const form = computed(() => props.modelValue)
const isValid = computed(() => Boolean(form.value.name.trim() && form.value.address.street.trim() && form.value.email.trim()))

const setField = (field: 'name' | 'email', value: string) => {
  emit('update:modelValue', {
    ...form.value,
    [field]: value,
  })
}

const setAddressField = (field: 'street' | 'city' | 'state' | 'zip', value: string) => {
  emit('update:modelValue', {
    ...form.value,
    address: {
      ...form.value.address,
      [field]: value,
    },
  })
}
</script>
