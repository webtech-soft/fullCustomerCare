import { createApp } from 'vue'
import { createRouter, createWebHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'
import App from './App.vue'
import './style.css'
import { initColorMode } from '@/composables/useColorMode'
import { initTimelineIndexedDb } from '@/lib/timelineIndexedDb'

initColorMode()
void initTimelineIndexedDb()

const ticketsPage = () => import('./pages/TicketsPage.vue')

const routes: RouteRecordRaw[] = [
  { path: '/', component: ticketsPage },
  { path: '/tickets', component: ticketsPage },
  { path: '/check-in', component: () => import('./pages/CheckInsPage.vue') },
  { path: '/checkins', component: () => import('./pages/CheckInsPage.vue') },
  { path: '/feedback', component: () => import('./pages/FeedbackPage.vue') },
  { path: '/appointments', component: () => import('./pages/AppointmentsDashboardPage.vue') },
  { path: '/appointments/book', component: () => import('./pages/AppointmentsPage.vue') },
  { path: '/appointments/widget', component: () => import('./pages/AppointmentsWidgetPage.vue') },
  { path: '/book', component: () => import('./pages/AppointmentsPage.vue') },
  { path: '/widget', component: () => import('./pages/AppointmentsWidgetPage.vue') },
  { path: '/appointments/reschedule', component: () => import('./pages/AppointmentReschedulePage.vue') },
  { path: '/view/:token', component: () => import('./pages/CustomerInvoiceView.vue') },
  { path: '/cv', component: () => import('./pages/CustomerInvoiceView.vue') },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

const app = createApp(App)
app.use(router)
app.mount('#app')

