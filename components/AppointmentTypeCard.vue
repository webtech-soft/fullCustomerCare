<template>
  <Card 
    class="overflow-hidden transition-shadow hover:shadow-md cursor-pointer"
    @click="handleClick"
  >
    <CardContent class="p-4 sm:p-6">
      <div class="flex items-start gap-4">
        <!-- Icon -->
        <div class="flex-shrink-0">
          <div class="w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-slate-100 flex items-center justify-center">
            <component 
              :is="iconComponent" 
              :size="20"
              weight="regular"
              class="text-slate-700"
            />
          </div>
        </div>
        
        <!-- Service Info -->
        <div class="flex-1 min-w-0">
          <h3 class="text-base sm:text-lg font-semibold text-slate-900 mb-1">
            {{ service.name }}
          </h3>
          <p v-if="service.description" class="text-sm text-slate-600">
            {{ service.description }}
          </p>
          <p class="text-xs text-slate-500 mt-1">{{ formatDuration(service.duration) }}</p>
        </div>
      </div>
    </CardContent>
  </Card>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import Card from './ui/Card.vue'
import CardContent from './ui/CardContent.vue'
import type { AppointmentType } from '@/types/appointment'
import { formatDurationHoursMinutes } from '@/lib/appointments/duration'
import {
  PhCircle,
  PhCircleDashed,
  PhWrench,
  PhArrowClockwise,
  PhBatteryFull,
  PhDrop,
  PhClipboardText,
  PhArrowsOut,
  PhGear,
  PhMagnifyingGlass,
  PhCar,
  PhTire,
  PhDisc,
  PhCarBattery,
  PhWarningCircle,
  PhEngine,
  PhSteeringWheel,
} from '@phosphor-icons/vue'

interface Props {
  service: AppointmentType
}

const props = defineProps<Props>()

const emit = defineEmits<{
  select: [service: AppointmentType]
}>()

// Map icon names to components
const iconMap: Record<string, any> = {
  Circle: PhCircle,
  CircleDot: PhCircleDashed,
  Wrench: PhWrench,
  RotateCw: PhArrowClockwise,
  Battery: PhBatteryFull,
  CarBattery: PhCarBattery,
  Droplet: PhDrop,
  ClipboardCheck: PhClipboardText,
  Move: PhArrowsOut,
  Settings: PhGear,
  Search: PhMagnifyingGlass,
  Car: PhCar,
  Tire: PhTire,
  Disc: PhDisc,
  WarningCircle: PhWarningCircle,
  Engine: PhEngine,
  SteeringWheel: PhSteeringWheel,
}

const iconComponent = computed(() => {
  return iconMap[props.service.icon] || PhCircle
})

const formatDuration = (minutes: number) => formatDurationHoursMinutes(minutes)

const handleClick = () => {
  emit('select', props.service)
}
</script>
