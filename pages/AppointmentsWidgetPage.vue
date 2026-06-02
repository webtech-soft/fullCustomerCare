<template>
  <div class="appointments-widget">
    <BookingScheduler mode="embed" :show-page-header="false" />
  </div>
</template>

<script setup lang="ts">
import BookingScheduler from '@/components/appointments/BookingScheduler.vue'
</script>

<style scoped>
.appointments-widget {
  min-height: 100dvh;
  width: 100%;
}
</style>
