<template>
  <div class="h-full bg-brand-shell">
    <TicketsWelcomeModal
      v-if="isTicketsTourDesktop"
      v-model="ticketsWelcomeOpen"
      @start-tour="onTicketsWelcomeStartTour"
      @skip="onTicketsWelcomeSkip"
      @remind="onTicketsWelcomeRemind"
    />
    <!-- Page Header: full-width stack on small screens; centered toolbar from sm -->
    <div class="border-b border-border bg-card">
      <div class="mx-auto w-full max-w-[2130px] px-3 sm:px-4 lg:px-8 py-3 sm:py-4">
        <!-- Mobile: compact title + expand/collapse so the table gets more vertical space -->
        <div class="flex items-center justify-between gap-2 w-full sm:hidden">
          <h1 class="pl-[15px] text-xl font-bold shrink-0 min-w-0 truncate text-brand-accent">
            Tickets
          </h1>
          <div class="flex items-center gap-2 shrink-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              class="h-10 min-h-[44px] shrink-0 border-input"
              :aria-expanded="mobileTicketsHeaderExpanded"
              aria-controls="tickets-mobile-header-controls"
              @click="mobileTicketsHeaderExpanded = !mobileTicketsHeaderExpanded"
            >
              <PhCaretDown
                :size="18"
                weight="bold"
                class="transition-transform duration-200"
                :class="mobileTicketsHeaderExpanded ? 'rotate-180' : ''"
              />
              <span class="ml-1.5">{{ mobileTicketsHeaderExpanded ? 'Hide' : 'Filters' }}</span>
            </Button>
          </div>
        </div>

        <div
          id="tickets-mobile-header-controls"
          class="flex flex-col gap-3 w-full min-w-0 max-sm:mt-3 max-sm:pt-3 max-sm:border-t max-sm:border-border sm:mt-0 sm:pt-0 sm:border-0 sm:flex-row sm:flex-wrap sm:items-center sm:justify-start sm:gap-4"
          :class="{ 'max-sm:hidden': !mobileTicketsHeaderExpanded }"
        >
          <h1
            class="hidden pl-[15px] sm:block text-xl sm:text-2xl font-bold shrink-0 w-full sm:w-auto text-brand-accent"
          >
            Tickets
          </h1>
          <div class="w-full min-w-0 sm:w-auto shrink-0">
            <TicketAdvancedFilters
              ref="ticketAdvancedFiltersRef"
              variant="dropdown"
              :tour-enabled="isTicketsTourDesktop"
              :filters="filters"
              :open="filtersDropdownOpen"
              :suppress-click-outside-close="suppressFiltersFlyoutClickOutsideForTour"
              :title="filtersDropdownTitle"
              :presets="presetsForDisplay"
              :save-scope-options="saveScopeOptions"
              :selected-preset-id="selectedPresetId"
              :can-update-selected-preset="canUpdateSelectedPreset"
              :available-routes="availableRoutes"
              :available-salesreps="availableSalesreps"
              :available-technicians="availableTechnicians"
              :model-value="currentStyle"
              :current-style="currentStyle"
              :progress-sort-by="progressConfig.sortBy ?? 'readyFirst'"
              :can-view-financial="canViewFinancial"
              @update:filters="handleFiltersUpdate"
              @update:open="(v) => (filtersDropdownOpen = v)"
              @apply="handleSearch"
              @update:model-value="onUserPicksTicketStyle"
              @update:progress-sort-by="(v) => updateProgressConfig({ sortBy: v })"
              @save-preset="handleAdvancedFiltersSavePreset"
              @update-selected-preset="handleUpdateSelectedPreset"
              @select-preset="handlePresetSelect"
              @delete-preset="handlePresetDelete"
              @set-default-preset="handlePresetSetDefault"
              @rename-preset="handlePresetRename"
              @clear-preset-selection="handleClearPresetSelection"
              @clear="handleAdvancedFiltersClear"
              @flyout-layout="onTicketFiltersFlyoutLayout"
            >
              <template #tools>
                <div class="flex flex-col gap-3 w-full">
                  <!-- Inline Fields configurator: table -->
                  <ColumnConfigurator
                    v-if="currentStyle === 'table'"
                    class="w-full min-w-0"
                    variant="inline"
                    :can-view-financial="canViewFinancial"
                    :visible-columns="draftSharedVisibleColumns"
                    :column-order="draftSharedColumnOrder"
                    :collapsed-field-keys="tableConfig.visibleColumns"
                    @update:visible-columns="updateTableColumns"
                    @update:column-order="updateTableColumnOrder"
                  />
                  <!-- Inline Fields configurator: progress -->
                  <ColumnConfigurator
                    v-else-if="currentStyle === 'progress'"
                    class="w-full min-w-0"
                    variant="inline"
                    :can-view-financial="canViewFinancial"
                    :visible-columns="draftSharedVisibleColumns"
                    :column-order="draftSharedColumnOrder"
                    :default-columns="DEFAULT_PROGRESS_FIELDS"
                    :collapsed-field-keys="progressConfig.visibleFields ?? DEFAULT_PROGRESS_FIELDS"
                    @update:visible-columns="updateTableColumns"
                    @update:column-order="updateTableColumnOrder"
                  />
                  <!-- Inline Fields configurator: card -->
                  <ColumnConfigurator
                    v-else-if="currentStyle === 'card'"
                    class="w-full min-w-0"
                    variant="inline"
                    :can-view-financial="canViewFinancial"
                    :visible-columns="draftSharedVisibleColumns"
                    :column-order="draftSharedColumnOrder"
                    :collapsed-field-keys="cardConfig.visibleFields"
                    @update:visible-columns="updateCardFields"
                    @update:column-order="updateCardFieldOrder"
                  />
                  <div class="flex flex-wrap items-center gap-2 pt-2 border-t border-border">
                    <TicketActionVisibilityMenu :can-chat="hasChat" />
                  </div>
                </div>
              </template>
            </TicketAdvancedFilters>
          </div>
          <div
            class="flex flex-col gap-3 w-full min-w-0 sm:flex-row sm:flex-wrap sm:items-center sm:gap-2 sm:w-auto"
          >
            <div
              id="tickets-header-style-picker"
              ref="ticketStylePickerAnchorRef"
              data-keep-filters-open="true"
              class="w-full min-w-0 sm:w-auto"
            >
              <TicketStyleSelector :model-value="currentStyle" @update:model-value="onUserPicksTicketStyle" />
            </div>
            <TicketFilterBar
              class="w-full min-w-0 sm:w-auto"
              :filters="filters"
              @update:filters="handleFiltersUpdate"
            />
          </div>
          <div
            class="flex w-full min-w-0 items-center gap-2 sm:flex-1 sm:min-w-[200px] sm:max-w-sm"
          >
            <Input
              placeholder="Search..."
              :model-value="filters.search || ''"
              @update:model-value="(v) => handleFiltersUpdate({ ...filters, search: v })"
              @keyup.enter="handleSearchBarSubmit"
              class="w-full min-h-[44px] h-11"
            />
            <Button
              variant="ink"
              @click="handleSearchBarSubmit"
              class="h-11 min-h-[44px] min-w-[100px] shrink-0"
            >
              <PhMagnifyingGlass :size="16" weight="regular" class="mr-2" />
              Search
            </Button>
          </div>
        </div>
      </div>
    </div>

    <!-- Table view: content centered; cards/other use max-width -->
    <div
      class="mx-auto w-full px-3 sm:px-4 lg:px-8 py-4 sm:py-6"
      :class="[
        currentStyle !== 'table' ? 'max-w-[2130px]' : 'flex flex-col items-center',
      ]"
    >
      <!-- Invoice load error (e.g. from View click) -->
      <div v-if="invoiceError" class="mb-4 rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700 flex items-center justify-between gap-2">
        <span>{{ invoiceError }}</span>
        <Button variant="ghost" size="sm" @click="invoiceError = ''" class="text-red-700 shrink-0">Dismiss</Button>
      </div>
      <div v-if="presetLoadMessage" class="mb-4 rounded-md bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800 flex items-center justify-between gap-2">
        <span>{{ presetLoadMessage }}</span>
        <Button variant="ghost" size="sm" @click="presetLoadMessage = ''" class="text-amber-800 shrink-0">Dismiss</Button>
      </div>
      <div
        v-if="mobileTableRedirectBanner"
        class="relative mb-3 rounded-lg border border-slate-200/80 bg-white px-3 py-2.5 pr-11 text-sm text-slate-700 shadow-sm"
        role="status"
      >
        <p class="leading-snug">
          Switched to card view for mobile.
          <button
            type="button"
            class="ml-1 inline font-medium text-brand-accent underline decoration-brand-accent/40 underline-offset-2 hover:no-underline focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent rounded-sm"
            @click="onMobileTableBannerChangeClick"
          >
            Change
          </button>
        </p>
        <button
          type="button"
          class="absolute right-2 top-1/2 -translate-y-1/2 flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
          aria-label="Dismiss"
          @click="dismissMobileTableRedirectBanner"
        >
          <PhX :size="18" weight="bold" />
        </button>
      </div>
      <div
        v-if="showMobileTableNotOptimizedBanner"
        class="relative mb-3 rounded-lg border border-amber-200/90 bg-amber-50 px-3 py-2.5 pr-11 text-sm text-amber-950 shadow-sm"
        role="status"
      >
        <p class="leading-snug">
          Table view is not optimized for mobile.
          <button
            type="button"
            class="ml-1 inline font-medium text-brand-accent underline decoration-brand-accent/40 underline-offset-2 hover:no-underline focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent rounded-sm"
            @click="onMobileTableUseCardsClick"
          >
            Use cards
          </button>
        </p>
        <button
          type="button"
          class="absolute right-2 top-1/2 -translate-y-1/2 flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-amber-800/70 hover:bg-amber-100/80 hover:text-amber-950 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
          aria-label="Dismiss"
          @click="dismissMobileTableNotOptimizedBanner"
        >
          <PhX :size="18" weight="bold" />
        </button>
      </div>

      <!-- Loading State (include bootstrap: avoid empty flash before restored filters run first real fetch) -->
      <div
        v-if="(loading || !ticketsQueryReady) && !tourMainBypassContentLoading && !tourAdvancedBypassContentLoading"
        class="w-full text-center py-12"
      >
        <p class="text-slate-600">Loading tickets...</p>
      </div>

      <!-- Error State -->
      <div v-else-if="ticketsError" class="w-full text-center py-12">
        <p class="text-red-600">Error loading tickets: {{ ticketsError.message }}</p>
        <Button @click="refreshTickets" variant="outline" class="mt-4">
          Try Again
        </Button>
      </div>

      <!-- Empty State -->
      <div v-else-if="ticketsListForViewsBase.length === 0" class="w-full text-center py-12">
        <p class="text-slate-600">No tickets found</p>
      </div>

      <!-- Style Views -->
      <template v-else>
        <!-- Tabulated (group by tabs) - shown when Tab dropdown is not None -->
        <TabulatedView
          v-if="appliedTabulateBy"
          :tickets="ticketsListForViewsBase"
          :tabulate-by="appliedTabulateBy"
          :content-style="currentStyle"
          :table-visible-columns="orderedTableVisibleColumns"
          :card-visible-field-keys="orderedCardVisibleFields"
          :card-fields-by-category="cardFieldsByCategory"
          :progress-sort-by="progressConfig.sortBy ?? 'readyFirst'"
          :progress-view-meta="progressViewMeta"
          :progress-visible-fields="progressConfig.visibleFields ?? DEFAULT_PROGRESS_FIELDS"
          :loading-ticket-number="loadingTicketNumber"
          :view-status-update-trigger="viewStatusUpdateTrigger"
          :inspection-view-update-trigger="inspectionViewUpdateTrigger"
          :approval-update-trigger="approvalUpdateTrigger"
          :can-view-cost="canViewFinancial"
          :can-chat="hasChat"
          :ticket-action-visibility="ticketActionVisibility"
          @view="handleView"
          @open-view-panel="handleOpenViewPanel"
          @chat="handleChat"
          @edit-status="handleEditStatus"
          @inspection="handleInspection"
          @update="handleUpdate"
          @timeline="openTimelineDrawer"
          @approvals="openApprovalsDrawer"
          @action="handleProgressAction"
          @status-change="handleStatusChange"
          @update:sort-by="(v) => updateProgressConfig({ sortBy: v })"
          @reorder="handleTableColumnReorder"
        />

        <!-- Card Style (non-tabulated) -->
        <CardStyle
          v-else-if="currentStyle === 'card'"
          :tickets="visibleTickets"
          :visible-field-keys="orderedCardVisibleFields"
          :fields-by-category="cardFieldsByCategory"
          :loading-ticket-number="loadingTicketNumber"
          :view-status-update-trigger="viewStatusUpdateTrigger"
          :inspection-view-update-trigger="inspectionViewUpdateTrigger"
          :approval-update-trigger="approvalUpdateTrigger"
          :can-view-cost="canViewFinancial"
          :can-chat="hasChat"
          :view-meta="progressViewMeta"
          :ticket-action-visibility="ticketActionVisibility"
          @view="handleView"
          @open-view-panel="handleOpenViewPanel"
          @chat="handleChat"
          @edit-status="handleEditStatus"
          @inspection="handleInspection"
          @action="handleProgressAction"
          @update="handleUpdate"
          @timeline="openTimelineDrawer"
          @approvals="openApprovalsDrawer"
        />

        <!-- Table Style (non-tabulated) -->
        <TableStyle
          v-else-if="currentStyle === 'table'"
          :tickets="visibleTickets"
          :visible-column-keys="orderedTableVisibleColumns"
          :loading-ticket-number="loadingTicketNumber"
          :view-status-update-trigger="viewStatusUpdateTrigger"
          :inspection-view-update-trigger="inspectionViewUpdateTrigger"
          :approval-update-trigger="approvalUpdateTrigger"
          :can-view-cost="canViewFinancial"
          :can-chat="hasChat"
          :view-meta="progressViewMeta"
          :ticket-action-visibility="ticketActionVisibility"
          @view="handleView"
          @open-view-panel="handleOpenViewPanel"
          @chat="handleChat"
          @inspection="handleInspection"
          @update="handleUpdate"
          @timeline="openTimelineDrawer"
          @approvals="openApprovalsDrawer"
          @action="handleProgressAction"
          @reorder="handleTableColumnReorder"
        />

        <!-- Progress Style (non-tabulated) -->
        <ProgressStyle
          v-else-if="currentStyle === 'progress'"
          :tickets="ticketsListForViewsBase"
          :sort-by="progressConfig.sortBy ?? 'readyFirst'"
          :view-meta="progressViewMeta"
          :visible-fields="progressConfig.visibleFields ?? DEFAULT_PROGRESS_FIELDS"
          :view-status-update-trigger="viewStatusUpdateTrigger"
          :inspection-view-update-trigger="inspectionViewUpdateTrigger"
          :approval-update-trigger="approvalUpdateTrigger"
          :can-view-cost="canViewFinancial"
          :can-chat="hasChat"
          :ticket-action-visibility="ticketActionVisibility"
          @update:sort-by="(v) => updateProgressConfig({ sortBy: v })"
          @view="handleView"
          @open-view-panel="handleOpenViewPanel"
          @chat="handleChat"
          @timeline="openTimelineDrawer"
          @approvals="openApprovalsDrawer"
          @action="handleProgressAction"
          @status-change="handleStatusChange"
        />

        <!-- Load More Button (for card/table, non-tabulated) -->
        <div v-if="!appliedTabulateBy && (currentStyle === 'card' || currentStyle === 'table') && hasMoreTickets" class="w-full flex justify-center mt-4 sm:mt-6">
          <Button variant="outline" @click="loadMore" class="min-w-[120px] h-11 w-full sm:w-auto">
            Load More
          </Button>
        </div>
      </template>
      <TicketsOnboardingTour
        v-if="ticketsOnboardingOpen"
        ref="ticketsOnboardingTourRef"
        v-model:open="ticketsOnboardingOpen"
        :steps="TICKETS_ONBOARDING_MAIN_STEPS"
        :get-target-element="getTicketsTourTargetElement"
        :title-override="mainTourTitleOverride"
        :description-override="mainTourDescriptionOverride"
        :spotlight-patch="mainTourSpotlightPatch"
        :secondary-actions="mainTourSecondaryActions"
        :next-disabled="mainTourNextDisabled"
        @step-change="onTicketsOnboardingStepChange"
        @skip="onTicketsOnboardingSkip"
        @complete="onTicketsOnboardingComplete"
        @secondary-action="onTicketsOnboardingSecondaryAction"
      />
      <TicketsOnboardingTour
        v-if="ticketsAdvancedOnboardingOpen"
        ref="ticketsAdvancedOnboardingTourRef"
        v-model:open="ticketsAdvancedOnboardingOpen"
        :steps="ticketsAdvancedOnboardingSteps"
        :get-target-element="getTicketsTourTargetElement"
        panel-eyebrow="Advanced tickets tour"
        :secondary-actions="advancedTourSecondaryActions"
        @step-change="onAdvancedTourStepChange"
        @skip="onAdvancedTourSkip"
        @complete="onAdvancedTourComplete"
        @secondary-action="onAdvancedTourSecondaryAction"
      />
      <TicketsOnboardingTour
        v-if="ticketsPresetBuilderOnboardingOpen"
        ref="ticketsPresetBuilderOnboardingTourRef"
        v-model:open="ticketsPresetBuilderOnboardingOpen"
        :steps="TICKETS_ONBOARDING_PRESET_BUILDER_STEPS"
        :get-target-element="getTicketsTourTargetElement"
        panel-eyebrow="Preset builder tour"
        @step-change="onPresetBuilderTourStepChange"
        @skip="onPresetBuilderTourSkip"
        @complete="onPresetBuilderTourComplete"
      />
    </div>

    <TicketActionsDrawer
      v-model:open="actionsDrawerOpen"
      v-model:active-tab="actionsTab"
      v-model:full-invoice-open="drawerFullInvoiceOpen"
      :ticket="actionsDrawerTicket"
      :has-cost="hasCost"
      :can-view-financial="canViewFinancial"
      :has-chat="hasChat"
      :ticket-action-visibility="ticketActionVisibility"
      :invoice-detail="drawerInvoiceDetail"
      :invoice-loading="drawerInvoiceLoading"
      :invoice-error="drawerInvoiceError"
      :timeline-data="actionsDrawerTimelineForUi"
      :timeline-has-approvals="actionsDrawerHasApprovals"
      :timeline-view-pulsing="actionsDrawerViewPulsing"
      :timeline-inspection-view-pulsing="actionsDrawerInspectionViewPulsing"
      :approval-update-trigger="approvalUpdateTrigger"
      :embedded-inv-token="drawerEmbeddedInvToken"
      :embedded-open-approvals="drawerEmbeddedOpenApprovals"
      :suppress-chat-history-fetch="suppressChatHistoryForAdvancedTour"
      :approvals-record-override="tourApprovalsRecordOverride"
      @close="onActionsDrawerClosed"
      @drawer-enter-done="onTicketActionsDrawerEnterDone"
      @open-full-invoice="openFullCustomerInvoiceFromDrawer"
      @open-in-full-page="openCustomerInvoiceInFullPageFromDrawer"
      @show-approvals="handleActionsDrawerShowApprovals"
      @show-vehicle-specs="handleShowVehicleSpecs"
      @chat-inactive="showChatInactiveDialog = true"
    />

    <!-- Chat is not active dialog (when hasChat is false) -->
    <Dialog v-model="showChatInactiveDialog">
      <DialogContent class="max-w-md">
        <DialogHeader>
          <DialogTitle>Chat is not active</DialogTitle>
        </DialogHeader>
        <p class="text-sm text-slate-700">
          Chat is not active. To activate, please contact HITS Support. To access team chat, press the button below.
        </p>
        <div class="flex flex-wrap justify-end gap-3 pt-4 border-t border-slate-200">
          <Button variant="outline" @click="handleChatInactiveSettings">Settings</Button>
          <Button variant="outline" @click="handleChatInactiveTeamChat">Team Chat</Button>
          <Button variant="outline" @click="showChatInactiveDialog = false">Cancel</Button>
        </div>
      </DialogContent>
    </Dialog>

  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
import {
  registerTicketsTourMenuHandlers,
  clearTicketsTourMenuHandlers,
} from '@/composables/useTicketsTourMenu'
import { useSessionCookie } from '@/composables/useSessionCookie'
import Button from '@/components/ui/Button.vue'
import Input from '@/components/ui/Input.vue'
import Textarea from '@/components/ui/Textarea.vue'
import Dialog from '@/components/ui/Dialog.vue'
import DialogContent from '@/components/ui/DialogContent.vue'
import DialogHeader from '@/components/ui/DialogHeader.vue'
import DialogTitle from '@/components/ui/DialogTitle.vue'
import { PhCaretDown, PhChatCircle, PhEnvelope, PhMagnifyingGlass, PhX } from '@phosphor-icons/vue'
import { cn } from '@/lib/utils'
import {
  isNarrowViewportForTicketStyle,
  readMobileTableOverride,
  readMobileTableNotOptimizedDismissed,
  setMobileTableOverride,
  setMobileTableNotOptimizedDismissed,
  clearMobileTableOverride,
  clearMobileTableNotOptimizedDismissed,
} from '@/lib/mobile-ticket-style'

// New ticket components
import TicketStyleSelector from '@/components/tickets/TicketStyleSelector.vue'
import TicketFilterBar from '@/components/tickets/TicketFilterBar.vue'
import TicketAdvancedFilters from '@/components/tickets/TicketAdvancedFilters.vue'
import TicketsOnboardingTour, { type TicketsTourSpotlightPatch } from '@/components/tickets/TicketsOnboardingTour.vue'
import TicketsWelcomeModal from '@/components/tickets/TicketsWelcomeModal.vue'
import ColumnConfigurator from '@/components/tickets/config/ColumnConfigurator.vue'
import TicketActionVisibilityMenu from '@/components/tickets/config/TicketActionVisibilityMenu.vue'
import CardFieldConfigurator from '@/components/tickets/config/CardFieldConfigurator.vue'

// Style components
import CardStyle from '@/components/tickets/styles/CardStyle.vue'
import TableStyle from '@/components/tickets/styles/TableStyle.vue'
import ProgressStyle from '@/components/tickets/styles/ProgressStyle.vue'
import TabulatedView from '@/components/tickets/styles/TabulatedView.vue'

// Types and composables
import type {
  Ticket,
  TicketFilters,
  TicketStyle,
  TicketActionVisibility,
  FilterPreset,
  PresetScope,
  TabulationDimension,
  TicketStatusMeta,
  DisplayFieldConfig,
  DisplayFieldCategory,
  InvoiceDetailResponse,
  ProgressSortOption,
} from '@/types/ticket'
import {
  DISPLAY_FIELDS,
  DEFAULT_FILTERS,
  DEFAULT_PROGRESS_FIELDS,
  DEFAULT_STYLE_PREFERENCES,
  FINANCIAL_FIELD_KEYS,
  mapVehicleStatusToApi,
} from '@/types/ticket'
import { fetchTickets, sendHitsNotification, fetchInvoiceDetail } from '@/api/tickets'
import { getSelectedStoreNum } from '@/composables/useStoreContext'
import { invoiceDetailQueryKey } from '@/lib/invoice-detail-cache'
import { useQuery } from '@/composables/useQuery'
import { CacheProfiles } from '@/data/queryClient'
import { useUserPreferences } from '@/composables/useUserPreferences'
import { usePermissions } from '@/composables/usePermissions'
import { navigateToDVIEditor } from '@/lib/project-navigation'
import { alertAnchored } from '@/lib/ui/anchoredUserDialog'
import { setupInspectionListener, type InspectionUpdate } from '@/lib/inspection-listener'
import { getInvoiceViewStatus, isInvoiceActivelyViewed, syncVehicleStatusTimelineFromTickets } from '@/lib/invoice-view-tracker'
import {
  getAllInspectionSentEvents,
  getInspectionViewStatus,
  isInspectionActivelyViewed,
  markInspectionSent,
  markInspectionViewAccessed,
  touchInspectionViewActive,
} from '@/lib/inspection-view-tracker'
import { getWorkApproval, type WorkApprovalRecordV1 } from '@/lib/work-approvals'
import { useTicketTimelineData, type TicketTimelineData } from '@/composables/useTicketTimelineData'
import TicketActionsDrawer from '@/components/tickets/TicketActionsDrawer.vue'
import type { TicketActionsTab } from '@/components/tickets/TicketActionsDrawer.vue'
import { getTicketComputedFields } from '@/composables/useTicketComputedFields'
import {
  devUserContextRevision,
  getDevUserContext,
  isDevUserContextLoaded,
  loadDevUserContext,
} from '@/composables/useDevUserContext'
import { HITS_ACCOUNT } from '@/config/hitsAccount'
import { encodeInvoiceToken, generateCustomerViewUrl } from '@/lib/invoice-token'
import {
  markTicketsAdvancedOnboardingCompleted,
  markTicketsAdvancedOnboardingSkipped,
  markTicketsOnboardingCompleted,
  markTicketsOnboardingSkipped,
  markTicketsPresetBuilderOnboardingCompleted,
  markTicketsPresetBuilderOnboardingSkipped,
  readTicketsOnboardingState,
  isTicketsWelcomeSnoozedThisSession,
  snoozeTicketsWelcomeForSession,
} from '@/lib/tickets-onboarding'
import {
  TICKETS_ONBOARDING_ADV_ACTION_BUTTON_STATES_STEP_ID,
  TICKETS_ONBOARDING_ADVANCED_STEPS,
  TICKETS_ONBOARDING_MAIN_STEPS,
  TICKETS_ONBOARDING_PRESET_BUILDER_STEPS,
  TICKETS_PRESET_DROPDOWN_TRIGGER_ID,
  TICKETS_PRESET_DROPDOWN_TRIGGER_SELECTOR,
  TICKETS_TAB_GROUP_BY_TRIGGER_ID,
  TICKETS_TAB_GROUP_BY_TRIGGER_SELECTOR,
  type TicketOnboardingStep,
} from '@/lib/tickets-onboarding-step-defs'
import {
  applyAdvActionSignalsDemoRowPatch,
  buildTourDemoInvoiceDetail,
  buildTourDemoTimelineData,
  buildTourDemoWorkApprovalRecord,
  buildTourDrawerDemoTicket,
  buildTourStyleDemoTicketsRaw,
  isTicketsTourDemoTicketNumber,
} from '@/lib/tickets-tour-demo'

const { hasCost, hasChat, canViewFinancial } = usePermissions()

const FINANCIAL_SORT_OPTIONS: ProgressSortOption[] = [
  'gpPercentDesc',
  'gpPercentAsc',
  'totalDesc',
  'totalAsc',
]

const financialFieldKeySet = new Set<string>(FINANCIAL_FIELD_KEYS)

function stripFinancialFieldKeys(keys: string[]): string[] {
  return keys.filter((k) => !financialFieldKeySet.has(k))
}

function stripFinancialPreferences(): void {
  if (canViewFinancial.value) return

  const nextFilters: TicketFilters = {
    ...filters.value,
    gpPercentMin: undefined,
    gpPercentMax: undefined,
  }
  if (
    nextFilters.gpPercentMin !== filters.value.gpPercentMin ||
    nextFilters.gpPercentMax !== filters.value.gpPercentMax
  ) {
    filters.value = nextFilters
    setLastUsedFilters(nextFilters)
  }

  const sort = progressConfig.value.sortBy
  if (sort && FINANCIAL_SORT_OPTIONS.includes(sort)) {
    updateProgressConfig({ sortBy: 'readyFirst' })
  }

  const tableVisible = stripFinancialFieldKeys(tableConfig.value.visibleColumns)
  const tableOrder = stripFinancialFieldKeys(tableConfig.value.columnOrder)
  if (
    tableVisible.length !== tableConfig.value.visibleColumns.length ||
    tableOrder.length !== tableConfig.value.columnOrder.length
  ) {
    updateTableConfig({ visibleColumns: tableVisible, columnOrder: tableOrder })
  }

  const cardVisible = stripFinancialFieldKeys(cardConfig.value.visibleFields)
  const cardOrder = stripFinancialFieldKeys(cardConfig.value.fieldOrder)
  if (
    cardVisible.length !== cardConfig.value.visibleFields.length ||
    cardOrder.length !== cardConfig.value.fieldOrder.length
  ) {
    updateCardConfig({ visibleFields: cardVisible, fieldOrder: cardOrder })
  }

  const progressVisible = progressConfig.value.visibleFields
    ? stripFinancialFieldKeys(progressConfig.value.visibleFields)
    : undefined
  if (
    progressVisible &&
    progressConfig.value.visibleFields &&
    progressVisible.length !== progressConfig.value.visibleFields.length
  ) {
    updateProgressConfig({ visibleFields: progressVisible })
  }
}

// User preferences
const {
  initialize: initializePreferences,
  currentStyle,
  setCurrentStyle,
  cardConfig,
  tableConfig,
  progressConfig,
  filterPresets,
  lastUsedFilters,
  setLastUsedFilters,
  updateCardConfig,
  updateTableConfig,
  updateBoardConfig,
  updateProgressConfig,
  ticketActionVisibility,
  addFilterPreset,
  removeFilterPreset,
  saveFilterPreset,
  setDefaultPreset,
  applyPreset,
} = useUserPreferences()

const { setCookie, setCookieWithMaxAge, getCookie, deleteCookie } = useSessionCookie()
const COOKIE_DATE_RANGE = 'tickets_date_range'
const COOKIE_CUSTOM_FROM = 'tickets_custom_from_date'
const COOKIE_CUSTOM_TO = 'tickets_custom_to_date'
const COOKIE_VIEW_MODE = 'tickets_view_mode'
const COOKIE_ACTIVE_PRESET_ID = 'tickets_active_preset_id'

/** Seconds until the next local 03:00 boundary (today 3 AM if before that, else tomorrow 3 AM). */
function maxAgeSecondsUntilNextLocalThreeAM(): number {
  const now = Date.now()
  const d = new Date(now)
  const y = d.getFullYear()
  const m = d.getMonth()
  const day = d.getDate()
  const threeAMToday = new Date(y, m, day, 3, 0, 0, 0).getTime()
  const boundary =
    now < threeAMToday ? threeAMToday : new Date(y, m, day + 1, 3, 0, 0, 0).getTime()
  return Math.max(1, Math.floor((boundary - now) / 1000))
}

function persistActivePresetCookie(presetId: string | number) {
  setCookieWithMaxAge(COOKIE_ACTIVE_PRESET_ID, String(presetId), maxAgeSecondsUntilNextLocalThreeAM())
}

function clearActivePresetCookie() {
  deleteCookie(COOKIE_ACTIVE_PRESET_ID)
}

/** Avoid writing date cookies during onMounted so preset/lastUsed application does not overwrite the saved date choice. */
const dateFilterCookiesReady = ref(false)

function clearDateFilterCookies() {
  deleteCookie(COOKIE_DATE_RANGE)
  deleteCookie(COOKIE_CUSTOM_FROM)
  deleteCookie(COOKIE_CUSTOM_TO)
}

function persistDateFilterCookies() {
  const { dateRange, customFromDate, customToDate } = filters.value
  if (dateRange) setCookie(COOKIE_DATE_RANGE, dateRange)
  if (customFromDate) {
    setCookie(COOKIE_CUSTOM_FROM, customFromDate)
  } else {
    deleteCookie(COOKIE_CUSTOM_FROM)
  }
  if (customToDate) {
    setCookie(COOKIE_CUSTOM_TO, customToDate)
  } else {
    deleteCookie(COOKIE_CUSTOM_TO)
  }
}

const VALID_VIEW_COOKIE = ['card', 'table', 'progress'] as const
type ViewModeValue = (typeof VALID_VIEW_COOKIE)[number]

function persistTicketsViewModeCookie() {
  const v = currentStyle.value
  if (v && VALID_VIEW_COOKIE.includes(v as ViewModeValue)) {
    setCookie(COOKIE_VIEW_MODE, v)
  }
}

// Local state
const filters = ref<TicketFilters>({ ...DEFAULT_FILTERS })
// Snapshot of filters at the time of last search - API runs only when Search is clicked
const filtersSnapshot = ref<TicketFilters>({ ...filters.value })
/** When false, tickets query uses a placeholder key so we do not fetch with default filters before onMounted restores prefs/cookies. */
const ticketsQueryReady = ref(false)
const searchTrigger = ref(0)
const visibleCount = ref(15)
const loadingTicketNumber = ref<number | null>(null)
const invoiceError = ref('')
const viewStatusUpdateTrigger = ref(0)
const inspectionViewUpdateTrigger = ref(0)
const approvalUpdateTrigger = ref(0)
const selectedPresetId = ref<string | number | null>(null)

function presetIdEquals(a: string | number | null | undefined, b: string | number | null | undefined): boolean {
  if (a == null || b == null) return false
  if (a === b) return true
  const aNum = Number.parseInt(String(a), 10)
  const bNum = Number.parseInt(String(b), 10)
  if (Number.isInteger(aNum) && Number.isInteger(bNum)) return aNum === bNum
  return String(a) === String(b)
}
/** Mobile-only: start collapsed to prioritize ticket data; Filters expands the full header. */
const mobileTicketsHeaderExpanded = ref(false)
/** After auto table→card redirect on narrow viewports; dismissible + auto-hide. */
const mobileTableRedirectBanner = ref(false)
/** Synced with localStorage: second-banner “not optimized” dismissed for future visits. */
const mobileTableNotOptimizedDismissed = ref(
  typeof window !== 'undefined' && readMobileTableNotOptimizedDismissed(),
)
const ticketStylePickerAnchorRef = ref<HTMLElement | null>(null)
let mobileTableBannerAutoDismissTimer: ReturnType<typeof setTimeout> | null = null

function clearMobileTableBannerTimer() {
  if (mobileTableBannerAutoDismissTimer != null) {
    clearTimeout(mobileTableBannerAutoDismissTimer)
    mobileTableBannerAutoDismissTimer = null
  }
}

function scheduleMobileTableBannerAutoDismiss() {
  clearMobileTableBannerTimer()
  mobileTableBannerAutoDismissTimer = setTimeout(() => {
    mobileTableBannerAutoDismissTimer = null
    mobileTableRedirectBanner.value = false
  }, 5000)
}

function dismissMobileTableRedirectBanner() {
  clearMobileTableBannerTimer()
  mobileTableRedirectBanner.value = false
}

function onMobileTableBannerChangeClick() {
  mobileTicketsHeaderExpanded.value = true
  void nextTick(() => {
    ticketStylePickerAnchorRef.value?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  })
}

const showMobileTableNotOptimizedBanner = computed(() => {
  if (!isNarrowViewportForTicketStyle()) return false
  if (currentStyle.value !== 'table') return false
  if (mobileTableNotOptimizedDismissed.value) return false
  if (mobileTableRedirectBanner.value) return false
  return true
})

function dismissMobileTableNotOptimizedBanner() {
  setMobileTableNotOptimizedDismissed()
  mobileTableNotOptimizedDismissed.value = true
}

function onMobileTableUseCardsClick() {
  clearMobileTableOverride()
  setCurrentStyle('card')
  if (isNarrowViewportForTicketStyle()) {
    setCookie(COOKIE_VIEW_MODE, 'card')
  }
}

/**
 * Table from cookie, default preset on load, or choosing a preset can set style without going through the style picker.
 * On narrow viewports, coerce to card unless the user opted in (cookie or localStorage override).
 */
function maybeRedirectMobileTableToCard() {
  if (!isNarrowViewportForTicketStyle()) return
  if (currentStyle.value !== 'table') return
  if (readMobileTableOverride()) return
  if (getCookie(COOKIE_VIEW_MODE) === 'table') return
  setCurrentStyle('card')
  mobileTableRedirectBanner.value = true
  scheduleMobileTableBannerAutoDismiss()
}

/** Run after layout so viewport + style match post-preset/init; idempotent. */
function runMobileTableRedirectPasses() {
  maybeRedirectMobileTableToCard()
  void nextTick(() => {
    maybeRedirectMobileTableToCard()
    requestAnimationFrame(() => {
      maybeRedirectMobileTableToCard()
    })
  })
}

/** Style changes from the pickers — on narrow viewports, view cookie only updates here (explicit user choice). */
function onUserPicksTicketStyle(style: TicketStyle) {
  if (isNarrowViewportForTicketStyle()) {
    if (style === 'table') {
      clearMobileTableNotOptimizedDismissed()
      mobileTableNotOptimizedDismissed.value = false
      setMobileTableOverride()
      setCurrentStyle(style)
      if (VALID_VIEW_COOKIE.includes(style as ViewModeValue)) {
        setCookie(COOKIE_VIEW_MODE, style)
      }
      return
    }
    clearMobileTableOverride()
    setCurrentStyle(style)
    if (VALID_VIEW_COOKIE.includes(style as ViewModeValue)) {
      setCookie(COOKIE_VIEW_MODE, style)
    }
    return
  }
  setCurrentStyle(style)
}

const filtersDropdownOpen = ref(false)
const ticketsWelcomeOpen = ref(false)
const ticketsOnboardingOpen = ref(false)
const ticketsAdvancedOnboardingOpen = ref(false)
const ticketsPresetBuilderOnboardingOpen = ref(false)
const isTicketsTourDesktop = ref(
  typeof window !== 'undefined' ? window.matchMedia('(min-width: 1024px)').matches : true,
)
const ticketAdvancedFiltersRef = ref<{
  openPresetPickerForTour: () => void
  closePresetPickerForTour?: () => void
  openTabGroupSelectForTour?: () => void
  closeTabGroupSelectForTour?: () => void
  getOnboardingFlyoutRoot?: () => HTMLElement | null
  getOnboardingPresetsAnchor?: () => HTMLElement | null
  getOnboardingPresetTrigger?: () => HTMLButtonElement | null
} | null>(null)
const ticketsOnboardingTourRef = ref<{ refreshLayout: () => void } | null>(null)
const ticketsAdvancedOnboardingTourRef = ref<{ refreshLayout: () => void } | null>(null)
const ticketsPresetBuilderOnboardingTourRef = ref<{ refreshLayout: () => void } | null>(null)
/** Last onboarding tour step id (for gating delayed preset picker open). */
const ticketsOnboardingTourStepId = ref<string | null>(null)
const ticketsAdvancedTourStepId = ref<string | null>(null)
const ticketsPresetBuilderTourStepId = ref<string | null>(null)
let ticketsTourPresetPickerTimer: ReturnType<typeof setTimeout> | null = null
let ticketsTourTabGroupPickerTimer: ReturnType<typeof setTimeout> | null = null
let ticketsTourStyleCycleTimers: number[] = []

const mainTourTitleOverride = ref<string | null>(null)
const mainTourDescriptionOverride = ref<string | null>(null)
const mainTourNextDisabled = ref(false)
/** After 2s on presets step, tour opens preset list and expands spotlight (cancelled if user leaves step earlier). */
const mainTourPresetsPickerRevealed = ref(false)
/** After 2s on Tab (Group By) step, tour focuses/opens the native select and widens spotlight (cancelled if user leaves earlier). */
const mainTourTabGroupPickerRevealed = ref(false)

const tourTimelineDataOverride = ref<TicketTimelineData | null>(null)
/** Demo work approval for Advanced tour Approvals tab (avoids mutating localStorage). */
const tourApprovalsRecordOverride = ref<WorkApprovalRecordV1 | undefined>(undefined)

const mainTourSpotlightPatch = computed((): TicketsTourSpotlightPatch | null => {
  if (
    !ticketsOnboardingOpen.value ||
    ticketsAdvancedOnboardingOpen.value ||
    ticketsPresetBuilderOnboardingOpen.value
  ) {
    return null
  }
  const stepId = ticketsOnboardingTourStepId.value

  if (stepId === 'presets') {
    if (!mainTourPresetsPickerRevealed.value) {
      return {
        selector: TICKETS_PRESET_DROPDOWN_TRIGGER_SELECTOR,
        spotlightUnionSelectors: [],
        panelAnchorSelector: TICKETS_PRESET_DROPDOWN_TRIGGER_SELECTOR,
        panelPlacement: 'leftOfTarget',
      }
    }
    return {
      selector: TICKETS_PRESET_DROPDOWN_TRIGGER_SELECTOR,
      spotlightUnionSelectors: ['[data-onboarding="ticket-presets-dropdown-panel"]'],
      panelAnchorSelector: TICKETS_PRESET_DROPDOWN_TRIGGER_SELECTOR,
      panelPlacement: 'leftOfTarget',
    }
  }

  if (stepId === 'tabGroup') {
    if (!mainTourTabGroupPickerRevealed.value) {
      return {
        selector: TICKETS_TAB_GROUP_BY_TRIGGER_SELECTOR,
        spotlightUnionSelectors: [],
        panelAnchorSelector: TICKETS_TAB_GROUP_BY_TRIGGER_SELECTOR,
        panelPlacement: 'rightOfTarget',
      }
    }
    return {
      selector: TICKETS_TAB_GROUP_BY_TRIGGER_SELECTOR,
      spotlightUnionSelectors: ['[data-onboarding="ticket-tab-group-by-panel"]'],
      panelAnchorSelector: TICKETS_TAB_GROUP_BY_TRIGGER_SELECTOR,
      panelPlacement: 'rightOfTarget',
    }
  }

  return null
})

/** While any tickets tour is open, skip filters flyout/preset click-outside close (shield blocks real outside clicks; this avoids edge cases). */
const suppressFiltersFlyoutClickOutsideForTour = computed(() => {
  if (ticketsPresetBuilderOnboardingOpen.value) return true
  return ticketsOnboardingOpen.value || ticketsAdvancedOnboardingOpen.value
})

function closeAllTicketsTourSurfaces() {
  ticketsWelcomeOpen.value = false
  ticketsOnboardingOpen.value = false
  ticketsAdvancedOnboardingOpen.value = false
  ticketsPresetBuilderOnboardingOpen.value = false
}

function canStartTicketsTour(): boolean {
  if (isTicketsTourDesktop.value) return true
  clearAllTicketsTourUiTimers()
  closeAllTicketsTourSurfaces()
  return false
}

function clearTicketsTourPresetPickerTimer() {
  if (ticketsTourPresetPickerTimer != null) {
    clearTimeout(ticketsTourPresetPickerTimer)
    ticketsTourPresetPickerTimer = null
  }
}

function clearTicketsTourTabGroupPickerTimer() {
  if (ticketsTourTabGroupPickerTimer != null) {
    clearTimeout(ticketsTourTabGroupPickerTimer)
    ticketsTourTabGroupPickerTimer = null
  }
}

function clearTicketsTourStyleCycleTimers() {
  for (const t of ticketsTourStyleCycleTimers) {
    clearTimeout(t)
  }
  ticketsTourStyleCycleTimers = []
}

function clearAllTicketsTourUiTimers() {
  clearTicketsTourPresetPickerTimer()
  clearTicketsTourTabGroupPickerTimer()
  clearTicketsTourStyleCycleTimers()
}

/** Bridges Teleported filter DOM into the tour (querySelector often misses Teleport timing). */
function getTicketsTourTargetElement(selector: string): HTMLElement | null {
  const f = ticketAdvancedFiltersRef.value
  if (selector === '#tickets-filters-onboarding-root') {
    const bridged = f?.getOnboardingFlyoutRoot?.() ?? null
    return bridged ?? document.getElementById('tickets-filters-onboarding-root')
  }
  if (selector === '#tickets-presets-onboarding-anchor') {
    const bridged = f?.getOnboardingPresetsAnchor?.() ?? null
    if (bridged) return bridged
    return document.getElementById('tickets-presets-onboarding-anchor')
  }
  const isPresetTrigger =
    selector === TICKETS_PRESET_DROPDOWN_TRIGGER_SELECTOR ||
    selector === '[data-onboarding="ticket-presets-dropdown-trigger"]'
  const isPresetPanel = selector === '[data-onboarding="ticket-presets-dropdown-panel"]'

  if (isPresetTrigger || isPresetPanel) {
    const root =
      f?.getOnboardingFlyoutRoot?.() ?? document.getElementById('tickets-filters-onboarding-root')
    if (isPresetTrigger) {
      const byId = document.getElementById(TICKETS_PRESET_DROPDOWN_TRIGGER_ID)
      if (byId instanceof HTMLElement) return byId
      const fromRef = f?.getOnboardingPresetTrigger?.() ?? null
      if (fromRef instanceof HTMLElement) return fromRef
      if (root instanceof HTMLElement) {
        const tagged = root.querySelector('[data-onboarding="ticket-presets-dropdown-trigger"]')
        if (tagged instanceof HTMLElement) return tagged
        const anchor = root.querySelector('#tickets-presets-onboarding-anchor')
        const firstBtn = anchor?.querySelector('button[type="button"]')
        if (firstBtn instanceof HTMLElement) return firstBtn
      }
    }
    if (root instanceof HTMLElement) {
      const hit = root.querySelector(selector)
      if (hit instanceof HTMLElement) return hit
    }
    try {
      const globalHit = document.querySelector(selector)
      if (globalHit instanceof HTMLElement) return globalHit
    } catch {
      /* ignore */
    }
  }

  const isTabGroupTrigger =
    selector === TICKETS_TAB_GROUP_BY_TRIGGER_SELECTOR ||
    selector === '[data-onboarding="ticket-tab-group-by-trigger"]'
  const isTabGroupPanel = selector === '[data-onboarding="ticket-tab-group-by-panel"]'
  const isTabGroupWrapper = selector === '[data-onboarding="ticket-tab-group-by"]'
  if (isTabGroupTrigger || isTabGroupPanel || isTabGroupWrapper) {
    if (isTabGroupTrigger) {
      const byId = document.getElementById(TICKETS_TAB_GROUP_BY_TRIGGER_ID)
      if (byId instanceof HTMLElement) return byId
    }
    const root =
      f?.getOnboardingFlyoutRoot?.() ?? document.getElementById('tickets-filters-onboarding-root')
    if (root instanceof HTMLElement) {
      const hit = root.querySelector(selector)
      if (hit instanceof HTMLElement) return hit
    }
    try {
      const globalHit = document.querySelector(selector)
      if (globalHit instanceof HTMLElement) return globalHit
    } catch {
      /* ignore */
    }
  }
  return null
}

/** After teleported filters panel gets position from TicketAdvancedFilters, re-measure tour anchors. */
function onTicketFiltersFlyoutLayout() {
  if (ticketsPresetBuilderOnboardingOpen.value) {
    void nextTick(() => {
      ticketsPresetBuilderOnboardingTourRef.value?.refreshLayout()
    })
    return
  }
  if (!ticketsOnboardingOpen.value || ticketsAdvancedOnboardingOpen.value) return
  const id = ticketsOnboardingTourStepId.value
  // Allow refresh while step id is still null (race: flyout opens before first `step-change` lands).
  if (id != null && !['presets', 'tabGroup', 'filters'].includes(id)) return
  void nextTick(() => {
    ticketsOnboardingTourRef.value?.refreshLayout()
  })
}

const presetLoadMessage = ref('')
const draftSharedVisibleColumns = ref<string[]>([])
const draftSharedColumnOrder = ref<string[]>([])
function filterAdvancedOnboardingSteps(): TicketOnboardingStep[] {
  let steps = [...TICKETS_ONBOARDING_ADVANCED_STEPS]
  if (!hasCost.value) {
    steps = steps.filter(
      (s) =>
        ![
          'adv-drawer-view-footer',
          'adv-drawer-invoice-preview',
          'adv-drawer-open-customer',
        ].includes(s.id),
    )
  }
  if (!hasChat.value) {
    steps = steps.filter((s) => s.id !== 'adv-drawer-chat')
  }
  return steps
}

const ticketsAdvancedOnboardingSteps = computed(() => filterAdvancedOnboardingSteps())

function onTicketsWelcomeStartTour() {
  ticketsWelcomeOpen.value = false
  if (!canStartTicketsTour()) return
  void nextTick(() => {
    startTicketsOnboardingTour()
  })
}

function onTicketsWelcomeSkip() {
  markTicketsOnboardingSkipped()
  ticketsWelcomeOpen.value = false
}

function onTicketsWelcomeRemind() {
  snoozeTicketsWelcomeForSession()
  ticketsWelcomeOpen.value = false
}

function startTicketsOnboardingTour() {
  if (!canStartTicketsTour()) return
  clearAllTicketsTourUiTimers()
  ticketsAdvancedOnboardingOpen.value = false
  ticketsPresetBuilderOnboardingOpen.value = false
  ticketsOnboardingTourStepId.value = null
  mainTourTitleOverride.value = null
  mainTourDescriptionOverride.value = null
  mainTourNextDisabled.value = false
  mainTourPresetsPickerRevealed.value = false
  mainTourTabGroupPickerRevealed.value = false
  // Step 1 is presets: open filters before the tour mounts so the anchor exists and teleported content can render.
  mobileTicketsHeaderExpanded.value = true
  filtersDropdownOpen.value = true
  ticketsOnboardingOpen.value = true
}

function startAdvancedTicketsOnboardingTour() {
  if (!canStartTicketsTour()) return
  clearAllTicketsTourUiTimers()
  ticketsOnboardingOpen.value = false
  ticketsPresetBuilderOnboardingOpen.value = false
  tourTimelineDataOverride.value = null
  tourApprovalsRecordOverride.value = undefined
  ticketsAdvancedTourStepId.value = null
  ticketsAdvancedOnboardingOpen.value = true
}

function startPresetBuilderOnboardingTour() {
  if (!canStartTicketsTour()) return
  clearAllTicketsTourUiTimers()
  ticketsOnboardingOpen.value = false
  ticketsAdvancedOnboardingOpen.value = false
  tourTimelineDataOverride.value = null
  tourApprovalsRecordOverride.value = undefined
  ticketsPresetBuilderTourStepId.value = null
  actionsDrawerOpen.value = false
  drawerFullInvoiceOpen.value = false
  mobileTicketsHeaderExpanded.value = true
  filtersDropdownOpen.value = true
  ticketsPresetBuilderOnboardingOpen.value = true
}

registerTicketsTourMenuHandlers({
  quick: startTicketsOnboardingTour,
  advanced: startAdvancedTicketsOnboardingTour,
  preset: startPresetBuilderOnboardingTour,
})

function scrollTourTargetIntoView(selector: string | null) {
  if (!selector) return
  void nextTick(() => {
    requestAnimationFrame(() => {
      const el = document.querySelector(selector)
      el?.scrollIntoView({ block: 'nearest', behavior: 'instant' })
      if (ticketsAdvancedOnboardingOpen.value) {
        ticketsAdvancedOnboardingTourRef.value?.refreshLayout()
      } else if (ticketsPresetBuilderOnboardingOpen.value) {
        ticketsPresetBuilderOnboardingTourRef.value?.refreshLayout()
      } else if (ticketsOnboardingOpen.value) {
        ticketsOnboardingTourRef.value?.refreshLayout()
      }
    })
  })
}

function getAdvancedTourDrawerTicket(): Ticket {
  const real = filteredTickets.value[0]
  if (real) return real
  return buildTourDrawerDemoTicket()
}

const MAIN_TOUR_STYLE_CYCLE_MS = 3000

function startMainTourStyleCycle() {
  clearTicketsTourStyleCycleTimers()
  mainTourNextDisabled.value = false
  mainTourTitleOverride.value = null
  mainTourDescriptionOverride.value = 'Table layout: dense rows for scanning many tickets at once.'
  setCurrentStyle('table')

  const order = ['table', 'card', 'progress'] as const satisfies readonly TicketStyle[]
  const blurbs: Record<(typeof order)[number], string> = {
    table: 'Table layout: dense rows for scanning many tickets at once.',
    card: 'Card layout: more space per ticket for customer and vehicle context.',
    progress: 'Progress layout: pipeline view for vehicle status at a glance.',
  }

  let cycleIndex = 0

  const tick = () => {
    if (!ticketsOnboardingOpen.value || ticketsOnboardingTourStepId.value !== 'styles') return
    cycleIndex = (cycleIndex + 1) % order.length
    const style = order[cycleIndex]!
    mainTourDescriptionOverride.value = blurbs[style]
    setCurrentStyle(style)
    void nextTick(() => ticketsOnboardingTourRef.value?.refreshLayout())
    const nextId = window.setTimeout(tick, MAIN_TOUR_STYLE_CYCLE_MS)
    ticketsTourStyleCycleTimers.length = 0
    ticketsTourStyleCycleTimers.push(nextId)
  }

  const firstId = window.setTimeout(tick, MAIN_TOUR_STYLE_CYCLE_MS)
  ticketsTourStyleCycleTimers.push(firstId)
}

function onTicketsOnboardingSecondaryAction(actionId: string) {
  if (actionId !== 'advanced') return
  clearAllTicketsTourUiTimers()
  mainTourPresetsPickerRevealed.value = false
  mainTourTabGroupPickerRevealed.value = false
  void nextTick(() => {
    ticketAdvancedFiltersRef.value?.closePresetPickerForTour?.()
    ticketAdvancedFiltersRef.value?.closeTabGroupSelectForTour?.()
  })
  mainTourTitleOverride.value = null
  mainTourDescriptionOverride.value = null
  mainTourNextDisabled.value = false
  ticketsOnboardingOpen.value = false
  startAdvancedTicketsOnboardingTour()
}

const advancedTourSecondaryActions = computed(() => {
  if (!ticketsAdvancedOnboardingOpen.value) return []
  const id = ticketsAdvancedTourStepId.value
  if (id !== TICKETS_ONBOARDING_ADV_ACTION_BUTTON_STATES_STEP_ID) {
    return []
  }
  return [{ actionId: 'build-presets' as const, label: 'How to build a preset' }]
})

function onAdvancedTourSecondaryAction(actionId: string) {
  if (actionId !== 'build-presets') return
  markTicketsAdvancedOnboardingCompleted()
  clearAllTicketsTourUiTimers()
  ticketsAdvancedOnboardingOpen.value = false
  ticketsAdvancedTourStepId.value = null
  tourTimelineDataOverride.value = null
  tourApprovalsRecordOverride.value = undefined
  actionsDrawerOpen.value = false
  drawerFullInvoiceOpen.value = false
  mobileTicketsHeaderExpanded.value = true
  filtersDropdownOpen.value = true
  void nextTick(() => {
    ticketAdvancedFiltersRef.value?.closePresetPickerForTour?.()
    startPresetBuilderOnboardingTour()
  })
}

const mainTourSecondaryActions = computed(() => {
  if (!ticketsOnboardingOpen.value || ticketsOnboardingTourStepId.value !== 'finish') {
    return []
  }
  return [{ actionId: 'advanced' as const, label: 'Advanced tour' }]
})

function onTicketsOnboardingSkip() {
  clearAllTicketsTourUiTimers()
  mainTourPresetsPickerRevealed.value = false
  mainTourTabGroupPickerRevealed.value = false
  void nextTick(() => {
    ticketAdvancedFiltersRef.value?.closePresetPickerForTour?.()
    ticketAdvancedFiltersRef.value?.closeTabGroupSelectForTour?.()
  })
  markTicketsOnboardingSkipped()
  filtersDropdownOpen.value = false
  mainTourTitleOverride.value = null
  mainTourDescriptionOverride.value = null
  mainTourNextDisabled.value = false
}

function onTicketsOnboardingComplete() {
  clearAllTicketsTourUiTimers()
  mainTourPresetsPickerRevealed.value = false
  mainTourTabGroupPickerRevealed.value = false
  void nextTick(() => {
    ticketAdvancedFiltersRef.value?.closePresetPickerForTour?.()
    ticketAdvancedFiltersRef.value?.closeTabGroupSelectForTour?.()
  })
  markTicketsOnboardingCompleted()
  filtersDropdownOpen.value = false
  mainTourTitleOverride.value = null
  mainTourDescriptionOverride.value = null
  mainTourNextDisabled.value = false
}

function onTicketsOnboardingStepChange(stepId: string) {
  const prevStepId = ticketsOnboardingTourStepId.value
  ticketsOnboardingTourStepId.value = stepId

  const needsFiltersOpen =
    stepId === 'presets' || stepId === 'filters' || stepId === 'tabGroup'
  if (needsFiltersOpen) {
    mobileTicketsHeaderExpanded.value = true
    filtersDropdownOpen.value = true
  } else if (stepId === 'styles' || stepId === 'actions' || stepId === 'finish') {
    filtersDropdownOpen.value = false
  }

  if (stepId === 'actions') {
    setCurrentStyle('table')
  }

  if (stepId !== 'styles') {
    clearTicketsTourStyleCycleTimers()
    mainTourTitleOverride.value = null
    mainTourDescriptionOverride.value = null
    mainTourNextDisabled.value = false
  }

  if (!ticketsOnboardingOpen.value) {
    return
  }

  if (stepId === 'presets') {
    if (prevStepId !== 'presets') {
      mainTourPresetsPickerRevealed.value = false
      clearTicketsTourPresetPickerTimer()
      void nextTick(() => {
        ticketAdvancedFiltersRef.value?.closePresetPickerForTour?.()
        ticketsTourPresetPickerTimer = setTimeout(() => {
          ticketsTourPresetPickerTimer = null
          if (!ticketsOnboardingOpen.value) return
          if (ticketsOnboardingTourStepId.value !== 'presets') return
          mainTourPresetsPickerRevealed.value = true
          ticketAdvancedFiltersRef.value?.openPresetPickerForTour()
          void nextTick(() => {
            requestAnimationFrame(() => {
              requestAnimationFrame(() => {
                ticketsOnboardingTourRef.value?.refreshLayout()
              })
            })
          })
        }, 2000)
      })
    }
  } else {
    if (prevStepId === 'presets') {
      mainTourPresetsPickerRevealed.value = false
      void nextTick(() => ticketAdvancedFiltersRef.value?.closePresetPickerForTour?.())
    }
    clearTicketsTourPresetPickerTimer()
  }

  if (stepId === 'tabGroup') {
    if (prevStepId !== 'tabGroup') {
      mainTourTabGroupPickerRevealed.value = false
      clearTicketsTourTabGroupPickerTimer()
      void nextTick(() => {
        ticketAdvancedFiltersRef.value?.closeTabGroupSelectForTour?.()
        ticketsTourTabGroupPickerTimer = setTimeout(() => {
          ticketsTourTabGroupPickerTimer = null
          if (!ticketsOnboardingOpen.value) return
          if (ticketsOnboardingTourStepId.value !== 'tabGroup') return
          mainTourTabGroupPickerRevealed.value = true
          ticketAdvancedFiltersRef.value?.openTabGroupSelectForTour?.()
          void nextTick(() => {
            requestAnimationFrame(() => {
              requestAnimationFrame(() => {
                ticketsOnboardingTourRef.value?.refreshLayout()
              })
            })
          })
        }, 2000)
      })
    }
  } else {
    if (prevStepId === 'tabGroup') {
      mainTourTabGroupPickerRevealed.value = false
      void nextTick(() => ticketAdvancedFiltersRef.value?.closeTabGroupSelectForTour?.())
    }
    clearTicketsTourTabGroupPickerTimer()
  }

  if (stepId === 'styles' && prevStepId !== 'styles') {
    startMainTourStyleCycle()
  }

  if (stepId === 'actions' || stepId === 'styles') {
    void nextTick(() => {
      requestAnimationFrame(() => {
        scrollTourTargetIntoView('[data-onboarding="ticket-row-actions"]')
      })
    })
  }
}

function onAdvancedTourSkip() {
  clearAllTicketsTourUiTimers()
  markTicketsAdvancedOnboardingSkipped()
  ticketsAdvancedOnboardingOpen.value = false
  ticketsPresetBuilderOnboardingOpen.value = false
  filtersDropdownOpen.value = false
  tourTimelineDataOverride.value = null
  tourApprovalsRecordOverride.value = undefined
  actionsDrawerOpen.value = false
  drawerFullInvoiceOpen.value = false
}

function onAdvancedTourComplete() {
  clearAllTicketsTourUiTimers()
  markTicketsAdvancedOnboardingCompleted()
  ticketsAdvancedOnboardingOpen.value = false
  ticketsPresetBuilderOnboardingOpen.value = false
  filtersDropdownOpen.value = false
  tourTimelineDataOverride.value = null
  tourApprovalsRecordOverride.value = undefined
  actionsDrawerOpen.value = false
  drawerFullInvoiceOpen.value = false
}

function onAdvancedTourStepChange(stepId: string) {
  const prevStepId = ticketsAdvancedTourStepId.value
  const stepChanged = prevStepId !== stepId
  ticketsAdvancedTourStepId.value = stepId

  const isDrawerStep =
    stepId.startsWith('adv-drawer-') && stepId !== 'adv-drawer-customer-copy'
  const isEditActionsStep = stepId === 'adv-edit-actions'
  const isActionButtonStatesStep = stepId === TICKETS_ONBOARDING_ADV_ACTION_BUTTON_STATES_STEP_ID

  if (isActionButtonStatesStep) {
    actionsDrawerOpen.value = false
    drawerFullInvoiceOpen.value = false
    filtersDropdownOpen.value = false
    tourTimelineDataOverride.value = null
    tourApprovalsRecordOverride.value = undefined
    setCurrentStyle('table')
  }

  if (isEditActionsStep) {
    actionsDrawerOpen.value = false
    drawerFullInvoiceOpen.value = false
    mobileTicketsHeaderExpanded.value = true
    filtersDropdownOpen.value = true
    tourTimelineDataOverride.value = null
    tourApprovalsRecordOverride.value = undefined
  }

  if (isDrawerStep || stepId === 'adv-drawer-customer-copy') {
    filtersDropdownOpen.value = false
    const t = getAdvancedTourDrawerTicket()
    actionsDrawerTicket.value = t
    actionsDrawerOpen.value = true
    drawerFullInvoiceOpen.value = false
    drawerEmbeddedOpenApprovals.value = false
    tourApprovalsRecordOverride.value = undefined
    if (isTicketsTourDemoTicketNumber(t.ticketNumber)) {
      drawerInvoiceDetail.value = buildTourDemoInvoiceDetail(t.ticketNumber)
      drawerInvoiceLoading.value = false
      drawerInvoiceError.value = ''
    }
  }

  if (stepId === 'adv-drawer-view-footer' || stepId === 'adv-drawer-invoice-preview') {
    actionsTab.value = normalizeActionsTab('view')
  }
  if (stepId === 'adv-drawer-open-customer') {
    actionsTab.value = normalizeActionsTab('view')
  }
  if (stepId === 'adv-drawer-customer-copy') {
    actionsTab.value = normalizeActionsTab('view')
  }
  if (stepId === 'adv-drawer-chat') {
    actionsTab.value = normalizeActionsTab('chat')
    tourTimelineDataOverride.value = null
  }
  if (stepId === 'adv-drawer-timeline') {
    actionsTab.value = normalizeActionsTab('timeline')
    tourTimelineDataOverride.value = buildTourDemoTimelineData()
  }
  if (stepId === 'adv-drawer-approvals') {
    actionsTab.value = normalizeActionsTab('approvals')
    tourTimelineDataOverride.value = null
    const tn = getAdvancedTourDrawerTicket().ticketNumber
    tourApprovalsRecordOverride.value =
      tn != null && isTicketsTourDemoTicketNumber(tn) ? buildTourDemoWorkApprovalRecord(tn) : undefined
  }

  if (isDrawerStep || stepId === 'adv-drawer-customer-copy') {
    void nextTick(() => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          ticketsAdvancedOnboardingTourRef.value?.refreshLayout()
        })
      })
    })
  }

  if (stepChanged) {
    const advStep = ticketsAdvancedOnboardingSteps.value.find((s) => s.id === stepId)
    void nextTick(() => {
      scrollTourTargetIntoView(advStep?.selector ?? null)
    })
  }
}

function onPresetBuilderTourStepChange(stepId: string) {
  const prevStepId = ticketsPresetBuilderTourStepId.value
  const stepChanged = prevStepId !== stepId
  ticketsPresetBuilderTourStepId.value = stepId

  if (prevStepId === 'adv-preset-favorite' && stepId !== 'adv-preset-favorite') {
    void nextTick(() => ticketAdvancedFiltersRef.value?.closePresetPickerForTour?.())
  }

  actionsDrawerOpen.value = false
  drawerFullInvoiceOpen.value = false
  mobileTicketsHeaderExpanded.value = true
  filtersDropdownOpen.value = true
  tourTimelineDataOverride.value = null
  tourApprovalsRecordOverride.value = undefined

  if (stepId === 'adv-preset-favorite') {
    void nextTick(() => {
      ticketAdvancedFiltersRef.value?.openPresetPickerForTour()
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          ticketsPresetBuilderOnboardingTourRef.value?.refreshLayout()
        })
      })
    })
  }

  if (stepChanged) {
    const tourStep = TICKETS_ONBOARDING_PRESET_BUILDER_STEPS.find((s) => s.id === stepId)
    void nextTick(() => {
      scrollTourTargetIntoView(tourStep?.selector ?? null)
    })
  }
}

function onPresetBuilderTourSkip() {
  clearAllTicketsTourUiTimers()
  markTicketsPresetBuilderOnboardingSkipped()
  ticketsPresetBuilderOnboardingOpen.value = false
  filtersDropdownOpen.value = false
  void nextTick(() => ticketAdvancedFiltersRef.value?.closePresetPickerForTour?.())
}

function onPresetBuilderTourComplete() {
  clearAllTicketsTourUiTimers()
  markTicketsPresetBuilderOnboardingCompleted()
  ticketsPresetBuilderOnboardingOpen.value = false
  filtersDropdownOpen.value = false
  void nextTick(() => ticketAdvancedFiltersRef.value?.closePresetPickerForTour?.())
}


let cleanupListener: (() => void) | null = null
let timelineIdbChangeListener: ((e: Event) => void) | null = null
let viewStatusChangeListener: ((e: Event) => void) | null = null
let inspectionViewStatusChangeListener: ((e: Event) => void) | null = null
let approvalChangeListener: (() => void) | null = null
let vehicleStatusChangeListener: (() => void) | null = null

/** Below Tailwind `sm` (640px); filter chip shows selected preset name (not only when unchanged). */
const isMobileTicketsFilterTitle = ref(
  typeof window !== 'undefined' && window.matchMedia('(max-width: 639px)').matches,
)
let mobileTicketsFilterTitleMq: MediaQueryList | null = null
function onMobileTicketsFilterTitleMqChange() {
  isMobileTicketsFilterTitle.value = mobileTicketsFilterTitleMq?.matches ?? false
}
let ticketsTourDesktopMq: MediaQueryList | null = null
function onTicketsTourDesktopMqChange() {
  isTicketsTourDesktop.value = ticketsTourDesktopMq?.matches ?? true
}

watch(isTicketsTourDesktop, (isDesktop) => {
  if (isDesktop) return
  clearAllTicketsTourUiTimers()
  closeAllTicketsTourSurfaces()
})

const actionsDrawerOpen = ref(false)
const actionsDrawerTicket = ref<Ticket | null>(null)
const actionsTab = ref<TicketActionsTab>('view')
const drawerInvoiceDetail = ref<InvoiceDetailResponse | null>(null)
const drawerInvoiceLoading = ref(false)
const drawerInvoiceError = ref('')
const drawerFullInvoiceOpen = ref(false)
const drawerEmbeddedOpenApprovals = ref(false)
const drawerEmbeddedInvToken = ref('')

const vehicleStatusUpdateTrigger = ref(0)

const actionsDrawerTimelineData = useTicketTimelineData(
  () => actionsDrawerTicket.value?.ticketNumber,
  () => actionsDrawerTicket.value?.vehicleStatus,
  {
    approval: approvalUpdateTrigger,
    vehicleStatus: vehicleStatusUpdateTrigger,
    viewStatus: viewStatusUpdateTrigger,
    inspectionView: inspectionViewUpdateTrigger,
  }
)

const actionsDrawerTimelineForUi = computed(
  () => tourTimelineDataOverride.value ?? actionsDrawerTimelineData.value,
)

const actionsDrawerHasApprovals = computed(() => {
  const n = actionsDrawerTicket.value?.ticketNumber
  if (n == null) return false
  const a = getWorkApproval(n)
  return !!(a?.items?.length)
})

const actionsDrawerViewPulsing = computed(() => {
  const n = actionsDrawerTicket.value?.ticketNumber
  return n != null && isInvoiceActivelyViewed(n)
})

const actionsDrawerInspectionViewPulsing = computed(() => {
  const n = actionsDrawerTicket.value?.ticketNumber
  return n != null && isInspectionActivelyViewed(n)
})

function normalizeActionsTab(tab: TicketActionsTab): TicketActionsTab {
  const visibility = ticketActionVisibility.value
  const orderedTabs: TicketActionsTab[] = ['view', 'chat', 'timeline', 'approvals', 'technicianWorksheet']
  const canShowTab = (value: TicketActionsTab, v: TicketActionVisibility): boolean => {
    if (value === 'view') return hasCost.value && v.view
    if (value === 'chat') return hasChat.value && v.chat
    if (value === 'timeline') return v.timeline
    if (value === 'approvals') return v.approvals
    return v.technicianWorksheet
  }

  if (canShowTab(tab, visibility)) return tab
  const firstAvailable = orderedTabs.find((candidate) => canShowTab(candidate, visibility))
  return firstAvailable ?? tab
}

function openTimelineDrawer(ticket: Ticket) {
  actionsDrawerTicket.value = ticket
  actionsTab.value = normalizeActionsTab('timeline')
  actionsDrawerOpen.value = true
  vehicleStatusUpdateTrigger.value = Date.now()
  inspectionViewUpdateTrigger.value = Date.now()
}

function openApprovalsDrawer(ticket: Ticket) {
  actionsDrawerTicket.value = ticket
  actionsTab.value = normalizeActionsTab('approvals')
  actionsDrawerOpen.value = true
}

async function openTechnicianWorksheetDrawer(ticket: Ticket) {
  actionsDrawerTicket.value = ticket
  actionsTab.value = normalizeActionsTab('technicianWorksheet')
  actionsDrawerOpen.value = true
  drawerInvoiceError.value = ''

  if (drawerInvoiceMatchesTicket(drawerInvoiceDetail.value, ticket) || drawerInvoiceLoading.value) {
    return
  }
  await fetchDrawerInvoiceDetail(ticket, { manageLoading: true, showListButtonSpinner: false })
}

async function handleShowVehicleSpecs() {
  await alertAnchored({
    message: 'Vehicle specs integration will be connected in a future update.',
  })
}

function onTicketActionsDrawerEnterDone() {
  if (!ticketsAdvancedOnboardingOpen.value) return
  void nextTick(() => {
    ticketsAdvancedOnboardingTourRef.value?.refreshLayout()
  })
}

function onActionsDrawerClosed() {
  actionsDrawerTicket.value = null
  drawerInvoiceDetail.value = null
  drawerInvoiceError.value = ''
  drawerFullInvoiceOpen.value = false
  drawerEmbeddedOpenApprovals.value = false
  drawerEmbeddedInvToken.value = ''
  tourTimelineDataOverride.value = null
  tourApprovalsRecordOverride.value = undefined
}

function openInternalCustomerInvoiceInNewTab(ticketNumber: number) {
  const url = generateCustomerViewUrl({
    e: 'p',
    a: HITS_ACCOUNT,
    i: ticketNumber.toString(),
  })
  const urlObj = new URL(url, window.location.origin)
  urlObj.searchParams.set('internal', 'true')
  window.open(urlObj.href, '_blank', 'noopener,noreferrer')
}

function openFullCustomerInvoiceFromDrawer() {
  const ticket = actionsDrawerTicket.value
  if (!ticket) return
  drawerEmbeddedInvToken.value = encodeInvoiceToken({
    e: 'p',
    a: HITS_ACCOUNT,
    i: String(ticket.ticketNumber),
  })
  drawerEmbeddedOpenApprovals.value = false
  drawerFullInvoiceOpen.value = true
}

function openCustomerInvoiceInFullPageFromDrawer() {
  const ticket = actionsDrawerTicket.value
  if (!ticket) return
  drawerFullInvoiceOpen.value = false
  drawerEmbeddedOpenApprovals.value = false
  openInternalCustomerInvoiceInNewTab(ticket.ticketNumber)
}

function handleActionsDrawerShowApprovals() {
  const t = actionsDrawerTicket.value
  if (!t) return
  actionsTab.value = normalizeActionsTab('approvals')
  actionsDrawerOpen.value = true
}

watch(drawerFullInvoiceOpen, (full) => {
  if (!full) drawerEmbeddedOpenApprovals.value = false
})

watch(actionsDrawerOpen, (open) => {
  if (open) {
    actionsTab.value = normalizeActionsTab(actionsTab.value)
  }
})

const VIEW_BUTTON_SOLID_AFTER_MS = 5 * 60 * 1000
const viewStatusExpiryTimeouts = new Map<number, ReturnType<typeof setTimeout>>()
const inspectionViewExpiryTimeouts = new Map<number, ReturnType<typeof setTimeout>>()

function clearViewStatusExpiryTimeout(ticketNumber: number) {
  const existing = viewStatusExpiryTimeouts.get(ticketNumber)
  if (existing) {
    clearTimeout(existing)
    viewStatusExpiryTimeouts.delete(ticketNumber)
  }
}

function scheduleViewStatusExpiryTimeout(ticketNumber: number) {
  clearViewStatusExpiryTimeout(ticketNumber)
  const status = getInvoiceViewStatus(ticketNumber)
  if (!status) return
  const expiresAt = status.lastActive + VIEW_BUTTON_SOLID_AFTER_MS
  const msUntilSolid = expiresAt - Date.now()
  if (msUntilSolid <= 0) return
  const timeoutId = setTimeout(() => {
    viewStatusUpdateTrigger.value = Date.now()
    viewStatusExpiryTimeouts.delete(ticketNumber)
  }, msUntilSolid)
  viewStatusExpiryTimeouts.set(ticketNumber, timeoutId)
}

function clearInspectionViewExpiryTimeout(ticketNumber: number) {
  const existing = inspectionViewExpiryTimeouts.get(ticketNumber)
  if (existing) {
    clearTimeout(existing)
    inspectionViewExpiryTimeouts.delete(ticketNumber)
  }
}

function scheduleInspectionViewExpiryTimeout(ticketNumber: number) {
  clearInspectionViewExpiryTimeout(ticketNumber)
  const status = getInspectionViewStatus(ticketNumber)
  if (!status) return
  const expiresAt = status.lastActive + VIEW_BUTTON_SOLID_AFTER_MS
  const msUntilSolid = expiresAt - Date.now()
  if (msUntilSolid <= 0) return
  const timeoutId = setTimeout(() => {
    inspectionViewUpdateTrigger.value = Date.now()
    inspectionViewExpiryTimeouts.delete(ticketNumber)
  }, msUntilSolid)
  inspectionViewExpiryTimeouts.set(ticketNumber, timeoutId)
}

async function handleDviInspectionSent(update: InspectionUpdate) {
  const tn = Number(update.ticketNumber)
  if (!Number.isFinite(tn)) return
  const userName =
    (update.sentBy && String(update.sentBy).trim()) ||
    (typeof localStorage !== 'undefined'
      ? localStorage.getItem('current_user') || localStorage.getItem('user_name') || undefined
      : undefined)
  markInspectionSent(tn, userName, { inspectionId: update.inspectionId })
  const ticket = ticketsValue.value.find((t) => t.ticketNumber === tn)
  const ticketTotal = ticket && typeof ticket.total === 'number' ? ticket.total : undefined
  try {
    const { buildTimelineEventForSent } = await import('@/types/timeline')
    const { persistTimelineEvent } = await import('@/api/timeline')
    await persistTimelineEvent(buildTimelineEventForSent(tn, { user: userName, ticketTotal }))
  } catch (e) {
    console.error('Inspection sent timeline persist:', e)
  }
  inspectionViewUpdateTrigger.value = Date.now()
  scheduleInspectionViewExpiryTimeout(tn)
}

async function handleDviInspectionCustomerViewOpened(update: InspectionUpdate) {
  const tn = Number(update.ticketNumber)
  if (!Number.isFinite(tn)) return
  const token =
    update.inspectionId && String(update.inspectionId).trim()
      ? String(update.inspectionId)
      : `insp-${tn}`
  const existing = getInspectionViewStatus(tn)
  const ticket = ticketsValue.value.find((t) => t.ticketNumber === tn)
  const ticketTotal = ticket && typeof ticket.total === 'number' ? ticket.total : undefined
  if (!existing?.isViewed) {
    markInspectionViewAccessed(tn, token)
    try {
      const { buildTimelineEventForViewed } = await import('@/types/timeline')
      const { persistTimelineEvent } = await import('@/api/timeline')
      await persistTimelineEvent(buildTimelineEventForViewed(tn, { ticketTotal }))
    } catch (e) {
      console.error('Inspection viewed timeline persist:', e)
    }
  } else {
    touchInspectionViewActive(tn)
  }
  inspectionViewUpdateTrigger.value = Date.now()
  scheduleInspectionViewExpiryTimeout(tn)
}

// Chat dialog state
const showChatInactiveDialog = ref(false)

const VEHICLE_STATUSES_FOR_CHECKIN: string[] = ['Not Here Yet', 'Not Started', 'Online Appointment', '']
const canShowCheckinOption = computed(() => {
  const status = actionsDrawerTicket.value?.vehicleStatus ?? ''
  return VEHICLE_STATUSES_FOR_CHECKIN.includes(status)
})

// Available filter options (would be populated from tickets data)
const availableSalesreps = computed(() => {
  const set = new Set<string>()
  ticketsValue.value.forEach(t => {
    if (t.salesrep?.trim()) set.add(t.salesrep.trim())
  })
  return Array.from(set).sort()
})

const availableTechnicians = computed(() => {
  const set = new Set<string>()
  ticketsValue.value.forEach(t => {
    if (t.technician?.trim()) set.add(t.technician.trim())
  })
  return Array.from(set).sort()
})

const availableRoutes = computed(() => {
  const seen = new Map<string, string>()
  ticketsValue.value.forEach(t => {
    if (t.route?.trim()) seen.set(t.route.trim(), t.route.trim())
  })
  return Array.from(seen.entries())
    .map(([id, name]) => ({ id, name }))
    .sort((a, b) => a.name.localeCompare(b.name))
})

// Update snapshot only when Search is triggered (no API call on filter change)
watch(searchTrigger, () => {
  filtersSnapshot.value = { ...filters.value }
  visibleCount.value = 15
})

// Query key from snapshot only - so cache key changes only when user clicks Apply/Search; includes call params only
const ticketsQueryKey = computed(() => {
  if (!ticketsQueryReady.value) {
    return 'tickets|__bootstrap__'
  }
  const parts = [
    'tickets',
    filtersSnapshot.value.dateRange,
    filtersSnapshot.value.customFromDate || '',
    filtersSnapshot.value.customToDate || '',
    filtersSnapshot.value.workorder ? '1' : '0',
    filtersSnapshot.value.invoice ? '1' : '0',
    filtersSnapshot.value.batch ? '1' : '0',
    filtersSnapshot.value.quote ? '1' : '0',
    filtersSnapshot.value.ticketNumber || '',
    String(filtersSnapshot.value.partialFill ?? -1),
    String(filtersSnapshot.value.backOrder ?? -1),
    String(filtersSnapshot.value.natAcct ?? -1),
    String(filtersSnapshot.value.printStatus ?? 0),
    // status, search, salesrep, technician, routeNum excluded - applied client-side
  ]
  return parts.join('|')
})

// Fetch tickets with snapshot so API is called only when Search runs
const { data: tickets, loading, error: ticketsError, refresh: refreshTickets } = useQuery(
  ticketsQueryKey,
  (signal) => {
    if (!ticketsQueryReady.value) {
      return Promise.resolve([] as Ticket[])
    }
    return fetchTickets(filtersSnapshot.value, signal)
  },
  CacheProfiles.list
)

watch(
  tickets,
  async (list) => {
    if (!list?.length) return
    const receivedAt = Date.now()
    const { buildTimelineEventForVehicleStatus } = await import('@/types/timeline')
    const { persistTimelineEvent } = await import('@/api/timeline')
    const appended = syncVehicleStatusTimelineFromTickets(
      list.map((t) => ({ ticketNumber: t.ticketNumber, vehicleStatus: t.vehicleStatus })),
      { receivedAt }
    )
    const iso = new Date(receivedAt).toISOString()
    const userName =
      typeof localStorage !== 'undefined'
        ? localStorage.getItem('current_user') || localStorage.getItem('user_name') || undefined
        : undefined
    for (const a of appended) {
      const src = list.find((t) => t.ticketNumber === a.ticketNumber)
      const ticketTotal = src && typeof src.total === 'number' ? src.total : undefined
      try {
        await persistTimelineEvent(
          buildTimelineEventForVehicleStatus(
            a.ticketNumber,
            mapVehicleStatusToApi(a.status as Ticket['vehicleStatus']),
            { user: userName, ticketTotal, datetime: iso }
          )
        )
      } catch (e) {
        console.error('Timeline persist on list sync:', e)
      }
    }
    vehicleStatusUpdateTrigger.value = Date.now()
  },
  { flush: 'post' }
)

const ticketsValue = computed(() => {
  const base = tickets.value || []
  const now = new Date()
  return base.map((t) => {
    const computedFields = getTicketComputedFields(t, now)
    return {
      ...t,
      ticketAgeMinutes: computedFields.ticketAgeMinutes ?? undefined,
      ticketAgeLabel: computedFields.ticketAgeLabel ?? undefined,
      promisedStart: computedFields.promisedStart
        ? computedFields.promisedStart.toISOString()
        : undefined,
      promisedEnd: computedFields.promisedEnd
        ? computedFields.promisedEnd.toISOString()
        : undefined,
      timeUntilPromiseMinutes: computedFields.timeUntilPromiseMinutes ?? undefined,
      timeUntilPromiseLabel: computedFields.timeUntilPromiseLabel ?? undefined,
      timeUntilDueLabel: computedFields.timeUntilDueLabel ?? undefined,
      promiseOverdueByMinutes: computedFields.promiseOverdueByMinutes ?? undefined,
      promiseOverdueByLabel: computedFields.promiseOverdueByLabel ?? undefined,
      overdueTimeLabel: computedFields.overdueTimeLabel ?? undefined,
      readyForMinutes: computedFields.readyForMinutes ?? undefined,
      readyForLabel: computedFields.readyForLabel ?? undefined,
      timeSinceCheckInMinutes: computedFields.timeSinceCheckInMinutes ?? undefined,
      timeSinceCheckInLabel: computedFields.timeSinceCheckInLabel ?? undefined,
      serviceCycleTimeMinutes: computedFields.serviceCycleTimeMinutes ?? undefined,
      serviceCycleTimeLabel: computedFields.serviceCycleTimeLabel ?? undefined,
      inspectionCompletionMinutes: computedFields.inspectionCompletionMinutes ?? undefined,
      inspectionCompletionLabel: computedFields.inspectionCompletionLabel ?? undefined,
    }
  })
})

// Filtered tickets (client-side search)
const filteredTickets = computed(() => {
  let result = ticketsValue.value

  if (filters.value.search?.trim()) {
    const searchLower = filters.value.search.toLowerCase()
    result = result.filter((ticket) => {
      const searchFields = [
        ticket.name,
        ticket.vehicle,
        String(ticket.ticketNumber),
        ticket.salesrep,
        ticket.technician,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
      return searchFields.includes(searchLower)
    })
  }

  if (filters.value.salesrep) {
    result = result.filter((t) => t.salesrep === filters.value.salesrep)
  }

  if (filters.value.technician) {
    result = result.filter((t) => t.technician === filters.value.technician)
  }

  if (filters.value.status) {
    result = result.filter((t) => t.vehicleStatus === filters.value.status)
  }

  if (filters.value.routeNum) {
    result = result.filter((t) => t.route === filters.value.routeNum)
  }

  if (filters.value.onlyOverdue) {
    result = result.filter((t) => (t.promiseOverdueByMinutes ?? 0) > 0)
  }

  if (filters.value.readyForAtLeastMinutes != null) {
    const min = filters.value.readyForAtLeastMinutes
    result = result.filter((t) => (t.readyForMinutes ?? -1) >= min)
  }

  if (filters.value.timeInServiceAtLeastMinutes != null) {
    const min = filters.value.timeInServiceAtLeastMinutes
    result = result.filter((t) => (t.ticketAgeMinutes ?? -1) >= min)
  }

  if (filters.value.timeSinceCheckInAtLeastMinutes != null) {
    const min = filters.value.timeSinceCheckInAtLeastMinutes
    result = result.filter((t) => (t.timeSinceCheckInMinutes ?? -1) >= min)
  }

  if (filters.value.serviceCycleTimeAtLeastMinutes != null) {
    const min = filters.value.serviceCycleTimeAtLeastMinutes
    result = result.filter((t) => (t.serviceCycleTimeMinutes ?? -1) >= min)
  }

  if (filters.value.inspectionCompletionAtLeastMinutes != null) {
    const min = filters.value.inspectionCompletionAtLeastMinutes
    result = result.filter((t) => (t.inspectionCompletionMinutes ?? -1) >= min)
  }

  if (filters.value.gpPercentMin != null) {
    const min = filters.value.gpPercentMin
    result = result.filter((t) => t.gpPercent != null && t.gpPercent >= min)
  }

  if (filters.value.gpPercentMax != null) {
    const max = filters.value.gpPercentMax
    result = result.filter((t) => t.gpPercent != null && t.gpPercent <= max)
  }

  return result
})

const tourMainActive = computed(
  () =>
    ticketsOnboardingOpen.value &&
    !ticketsAdvancedOnboardingOpen.value &&
    !ticketsPresetBuilderOnboardingOpen.value,
)

const suppressChatHistoryForAdvancedTour = computed(
  () => ticketsAdvancedOnboardingOpen.value && actionsTab.value === 'chat',
)

const tourMainUsesDemoList = computed(() => {
  if (!tourMainActive.value) return false
  const step = ticketsOnboardingTourStepId.value
  if (step === 'styles' || step === 'actions') return true
  return false
})

const tourAdvancedUsesDemoList = computed(
  () =>
    ticketsAdvancedOnboardingOpen.value &&
    ticketsAdvancedTourStepId.value === TICKETS_ONBOARDING_ADV_ACTION_BUTTON_STATES_STEP_ID,
)

const mainTourEnrichedDemoTickets = computed((): Ticket[] => {
  const now = new Date()
  const raw = buildTourStyleDemoTicketsRaw()
  return raw.map((t) => {
    const computedFields = getTicketComputedFields(t, now)
    return {
      ...t,
      ticketAgeMinutes: computedFields.ticketAgeMinutes ?? undefined,
      ticketAgeLabel: computedFields.ticketAgeLabel ?? undefined,
      promisedStart: computedFields.promisedStart ? computedFields.promisedStart.toISOString() : undefined,
      promisedEnd: computedFields.promisedEnd ? computedFields.promisedEnd.toISOString() : undefined,
      timeUntilPromiseMinutes: computedFields.timeUntilPromiseMinutes ?? undefined,
      timeUntilPromiseLabel: computedFields.timeUntilPromiseLabel ?? undefined,
      timeUntilDueLabel: computedFields.timeUntilDueLabel ?? undefined,
      promiseOverdueByMinutes: computedFields.promiseOverdueByMinutes ?? undefined,
      promiseOverdueByLabel: computedFields.promiseOverdueByLabel ?? undefined,
      overdueTimeLabel: computedFields.overdueTimeLabel ?? undefined,
      readyForMinutes: computedFields.readyForMinutes ?? undefined,
      readyForLabel: computedFields.readyForLabel ?? undefined,
      timeSinceCheckInMinutes: computedFields.timeSinceCheckInMinutes ?? undefined,
      timeSinceCheckInLabel: computedFields.timeSinceCheckInLabel ?? undefined,
      serviceCycleTimeMinutes: computedFields.serviceCycleTimeMinutes ?? undefined,
      serviceCycleTimeLabel: computedFields.serviceCycleTimeLabel ?? undefined,
      inspectionCompletionMinutes: computedFields.inspectionCompletionMinutes ?? undefined,
      inspectionCompletionLabel: computedFields.inspectionCompletionLabel ?? undefined,
    }
  })
})

const advancedTourActionSignalsDemoTickets = computed(() =>
  applyAdvActionSignalsDemoRowPatch(mainTourEnrichedDemoTickets.value),
)

const ticketsListForViewsBase = computed(() => {
  if (tourMainUsesDemoList.value) return mainTourEnrichedDemoTickets.value
  if (tourAdvancedUsesDemoList.value) return advancedTourActionSignalsDemoTickets.value
  return filteredTickets.value
})

const tourMainBypassContentLoading = computed(
  () =>
    tourMainActive.value &&
    (ticketsOnboardingTourStepId.value === 'styles' ||
      ticketsOnboardingTourStepId.value === 'actions'),
)

const tourAdvancedBypassContentLoading = computed(() => tourAdvancedUsesDemoList.value)

// Keep tabulated layout tied to last-applied filters (Apply/Search click).
const appliedTabulateBy = computed(() => filtersSnapshot.value.tabulateBy)

const STATUS_ORDER: Record<string, number> = {
  'Online Appointment': 1,
  'Not Here Yet': 2,
  'Check In': 3,
  'On Lot': 4,
  'In Shop': 5,
  'Inspection Complete': 6,
  'Awaiting Callback': 7,
  'Awaiting Parts': 8,
  'Out For Sublet': 9,
  Ready: 10,
  'Not Started': 0,
  '': 0,
}

const sortedTickets = computed(() => [...ticketsListForViewsBase.value])

// Visible tickets (with pagination for card/table; uses sorted list)
const visibleTickets = computed(() => {
  return sortedTickets.value.slice(0, visibleCount.value)
})

const hasMoreTickets = computed(() => {
  return sortedTickets.value.length > visibleCount.value
})

function readCurrentUserName(): string {
  if (typeof localStorage === 'undefined') return ''
  if (import.meta.env.DEV && isDevUserContextLoaded()) {
    return (getDevUserContext().user_name || '').trim()
  }
  const devCtx = import.meta.env.DEV ? getDevUserContext() : { user_name: '' }
  return (devCtx.user_name || localStorage.getItem('current_user') || localStorage.getItem('user_name') || '').trim()
}

function readCurrentRoleId(): number {
  if (typeof localStorage === 'undefined') return 0
  if (import.meta.env.DEV && isDevUserContextLoaded()) {
    const role = Number.parseInt(String(getDevUserContext().role_ID ?? '0'), 10)
    return Number.isNaN(role) ? 0 : role
  }
  const devCtx = import.meta.env.DEV ? getDevUserContext() : { role_ID: 0 }
  const raw = devCtx.role_ID ? String(devCtx.role_ID) : localStorage.getItem('role_ID') || '0'
  const role = Number.parseInt(raw, 10)
  return Number.isNaN(role) ? 0 : role
}

const currentUserName = computed(() => {
  devUserContextRevision.value
  return readCurrentUserName()
})
const currentRoleId = computed(() => {
  devUserContextRevision.value
  return readCurrentRoleId()
})
const isAatechUser = computed(() => currentUserName.value.toUpperCase() === 'AATECH')

const saveScopeOptions = computed<PresetScope[]>(() => {
  if (isAatechUser.value) return ['user', 'company', 'system']
  if (currentRoleId.value === 1) return ['user', 'company']
  return ['user']
})

function getPresetScope(preset: FilterPreset): PresetScope {
  return (preset.scope ?? (preset.isSystemPreset ? 'system' : 'user')) as PresetScope
}

function canEditPresetByRule(preset: FilterPreset): boolean {
  if (isAatechUser.value) return true
  const scope = getPresetScope(preset)
  if (scope === 'system') return false
  if (scope === 'company') return currentRoleId.value === 1
  return (preset.ownerUserName || '').toUpperCase() === currentUserName.value.toUpperCase()
}

function canDeletePresetByRule(preset: FilterPreset): boolean {
  return canEditPresetByRule(preset)
}

const presetsForDisplay = computed<FilterPreset[]>(() =>
  filterPresets.value.map((preset) => ({
    ...preset,
    ownerCanEdit: canEditPresetByRule(preset),
    ownerCanDelete: canDeletePresetByRule(preset),
  }))
)

const selectedPreset = computed(() => {
  if (!selectedPresetId.value) return null
  return presetsForDisplay.value.find((preset) => presetIdEquals(preset.id, selectedPresetId.value)) ?? null
})

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value)
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`
  const entries = Object.entries(value as Record<string, unknown>)
    .filter(([, v]) => v !== undefined)
    .sort(([a], [b]) => a.localeCompare(b))
  return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${stableStringify(v)}`).join(',')}}`
}

const isSelectedPresetDirty = computed(() => {
  const preset = selectedPreset.value
  if (!preset) return false
  const filtersDirty = stableStringify(preset.filters) !== stableStringify(filters.value)
  if (filtersDirty) return true

  const styleDirty = (preset.style ?? currentStyle.value) !== currentStyle.value
  if (styleDirty) return true

  const tableDirty =
    stableStringify(preset.tableConfig?.visibleColumns ?? tableConfig.value.visibleColumns) !== stableStringify(tableConfig.value.visibleColumns) ||
    stableStringify(preset.tableConfig?.columnOrder ?? tableConfig.value.columnOrder) !== stableStringify(tableConfig.value.columnOrder)
  if (tableDirty) return true

  const cardDirty =
    stableStringify(preset.cardConfig?.visibleFields ?? cardConfig.value.visibleFields) !== stableStringify(cardConfig.value.visibleFields) ||
    stableStringify(preset.cardConfig?.fieldOrder ?? cardConfig.value.fieldOrder) !== stableStringify(cardConfig.value.fieldOrder)
  if (cardDirty) return true

  const progressVisibleDirty =
    stableStringify(preset.progressConfig?.visibleFields ?? progressConfig.value.visibleFields) !==
    stableStringify(progressConfig.value.visibleFields)
  if (progressVisibleDirty) return true

  return (preset.progressConfig?.sortBy ?? progressConfig.value.sortBy) !== progressConfig.value.sortBy
})

const filtersDropdownTitle = computed(() => {
  const preset = selectedPreset.value
  if (!preset) return 'Custom'
  if (isMobileTicketsFilterTitle.value) return preset.name
  if (isSelectedPresetDirty.value) return 'Custom'
  return preset.name
})

const canUpdateSelectedPreset = computed(() => {
  return !!selectedPreset.value && canEditPresetByRule(selectedPreset.value) && isSelectedPresetDirty.value
})

// Table columns in display order: columnOrder filtered by visibleColumns (fallback to visibleColumns when columnOrder empty)
const orderedTableVisibleColumns = computed(() => {
  const { visibleColumns, columnOrder } = tableConfig.value
  if (columnOrder.length > 0) {
    const visibleSet = new Set(visibleColumns)
    const ordered: string[] = []
    for (const key of columnOrder) {
      if (visibleSet.has(key)) ordered.push(key)
    }
    for (const key of visibleColumns) {
      if (!columnOrder.includes(key)) ordered.push(key)
    }
    return ordered
  }
  return visibleColumns
})

// Card visible fields in display order: fieldOrder filtered by visibleFields (fallback to visibleFields when fieldOrder empty)
const orderedCardVisibleFields = computed(() => {
  const { visibleFields, fieldOrder } = cardConfig.value
  if (fieldOrder.length > 0) {
    const visibleSet = new Set(visibleFields)
    const ordered: string[] = []
    for (const key of fieldOrder) {
      if (visibleSet.has(key)) ordered.push(key)
    }
    for (const key of visibleFields) {
      if (!fieldOrder.includes(key)) ordered.push(key)
    }
    return ordered
  }
  return visibleFields
})

// Map of display field metadata for quick lookup
const DISPLAY_FIELD_MAP: Record<string, DisplayFieldConfig> = DISPLAY_FIELDS.reduce(
  (acc, field) => {
    acc[field.key] = field
    return acc
  },
  {} as Record<string, DisplayFieldConfig>
)

// Card fields grouped by category, in the configured visible order
const cardFieldsByCategory = computed<Record<DisplayFieldCategory, DisplayFieldConfig[]>>(() => {
  const result: Record<DisplayFieldCategory, DisplayFieldConfig[]> = {
    ticket: [],
    customer: [],
    vehicle: [],
    scheduling: [],
    routing: [],
  }

  for (const key of orderedCardVisibleFields.value) {
    if (key === 'actions') continue
    const meta = DISPLAY_FIELD_MAP[key]
    if (meta) {
      result[meta.category].push(meta)
    }
  }

  return result
})

// Progress view metadata (populated from invoice-view-tracker and work-approvals in next section)
const progressViewMeta = computed<Record<number, TicketStatusMeta>>(() => {
  void inspectionViewUpdateTrigger.value
  const meta: Record<number, TicketStatusMeta> = {}
  filteredTickets.value.forEach((ticket) => {
    const viewStatus = getInvoiceViewStatus(ticket.ticketNumber)
    const approval = getWorkApproval(ticket.ticketNumber)
    const inspSent = getAllInspectionSentEvents(ticket.ticketNumber).length > 0
    const inspView = getInspectionViewStatus(ticket.ticketNumber)
    meta[ticket.id] = {
      isViewed: !!viewStatus?.isViewed,
      isApproved: (approval?.items?.length ?? 0) > 0,
      inspectionSent: inspSent,
      inspectionViewed: !!inspView?.isViewed,
    }
  })
  if (tourMainUsesDemoList.value) {
    for (const t of mainTourEnrichedDemoTickets.value) {
      if (t.tourDemoInvoiceViewed) {
        const cur = meta[t.id]
        meta[t.id] = {
          ...cur,
          isViewed: true,
        }
      }
    }
  }
  return meta
})

watch(
  ticketsValue,
  (newTickets) => {
    newTickets.forEach((t) => {
      scheduleViewStatusExpiryTimeout(t.ticketNumber)
      scheduleInspectionViewExpiryTimeout(t.ticketNumber)
    })
  },
  { immediate: true }
)

// Persist date filters to cookies when they change (after initial load restores saved choice)
watch(
  () => [filters.value.dateRange, filters.value.customFromDate, filters.value.customToDate],
  () => {
    if (!dateFilterCookiesReady.value) return
    persistDateFilterCookies()
  }
)

// Desktop: persist view cookie on style change. Narrow: cookie updates only from onUserPicksTicketStyle.
watch(currentStyle, (value) => {
  if (value === 'table') {
    maybeRedirectMobileTableToCard()
  }
  if (!isNarrowViewportForTicketStyle()) {
    persistTicketsViewModeCookie()
  }
})

// Event handlers
function ensureDimensionFieldVisible(fieldKey: string) {
  const table = tableConfig.value
  const card = cardConfig.value

  // Keep staged field picks (draft) when tabulation bumps applied config — a watch
  // formerly synced draft from table on every updateTableConfig, which wiped
  // unstaged column changes whenever Group By changed.
  const draftVisBase =
    draftSharedVisibleColumns.value.length > 0
      ? draftSharedVisibleColumns.value
      : [...table.visibleColumns]
  const nextDraftVisible = draftVisBase.includes(fieldKey)
    ? [...draftVisBase]
    : [...draftVisBase, fieldKey]
  const draftOrdBase =
    draftSharedColumnOrder.value.length > 0
      ? draftSharedColumnOrder.value
      : table.columnOrder.length > 0
        ? [...table.columnOrder]
        : [...table.visibleColumns]
  const nextDraftOrderRaw = draftOrdBase.includes(fieldKey)
    ? draftOrdBase
    : [...draftOrdBase, fieldKey]
  draftSharedVisibleColumns.value = nextDraftVisible
  draftSharedColumnOrder.value = pinActionsInColumnOrder(nextDraftVisible, nextDraftOrderRaw)

  const nextVisibleColumns = table.visibleColumns.includes(fieldKey)
    ? table.visibleColumns
    : [...table.visibleColumns, fieldKey]
  const nextColumnOrder = table.columnOrder.includes(fieldKey)
    ? table.columnOrder
    : [...table.columnOrder, fieldKey]

  const nextVisibleFields = card.visibleFields.includes(fieldKey)
    ? card.visibleFields
    : [...card.visibleFields, fieldKey]
  const nextFieldOrder = card.fieldOrder.includes(fieldKey)
    ? card.fieldOrder
    : [...card.fieldOrder, fieldKey]

  updateTableConfig({
    visibleColumns: nextVisibleColumns,
    columnOrder: nextColumnOrder,
  })

  updateCardConfig({
    visibleFields: nextVisibleFields,
    fieldOrder: nextFieldOrder,
  })
}

function applyTabulateDefaults(prev: TicketFilters, next: TicketFilters): TicketFilters {
  let result: TicketFilters = { ...next }

  const nextTabulateBy = next.tabulateBy
  const prevTabulateBy = prev.tabulateBy
  const tabulateTurnedOn = !prevTabulateBy && !!nextTabulateBy
  const dimensionChanged = !!prevTabulateBy && !!nextTabulateBy && prevTabulateBy !== nextTabulateBy

  // When tabulating by vehicle status, clear the vehicle status filter so all statuses show in tabs
  if (nextTabulateBy === 'vehicleStatus') {
    result = { ...result, status: undefined }
    ensureDimensionFieldVisible('vehicleStatus')
  }

  if (!nextTabulateBy || (!tabulateTurnedOn && !dimensionChanged)) {
    return result
  }

  switch (nextTabulateBy) {
    case 'ticketType':
      result = {
        ...result,
        workorder: true,
        invoice: true,
        quote: true,
      }
      ensureDimensionFieldVisible('type')
      break
    case 'vehicleStatus':
      result = {
        ...result,
        status: undefined,
      }
      ensureDimensionFieldVisible('vehicleStatus')
      break
    case 'technician':
      result = {
        ...result,
        technician: undefined,
      }
      ensureDimensionFieldVisible('technician')
      break
    case 'salesRep':
      result = {
        ...result,
        salesrep: undefined,
      }
      ensureDimensionFieldVisible('salesrep')
      break
    case 'approvedStatus':
    case 'viewedStatus':
    case 'overdueStatus':
    case 'inspectionStatus':
      ensureDimensionFieldVisible('statusFlags')
      break
  }

  return result
}

// No auto-apply: refetch only when user clicks Apply Filters or Search
const AUTO_APPLY_FILTER_KEYS: (keyof TicketFilters)[] = []

function handleFiltersUpdate(newFilters: TicketFilters) {
  const prev = filters.value
  const adjusted = applyTabulateDefaults(prev, newFilters)
  filters.value = adjusted
  setLastUsedFilters(adjusted)
  const touchedAutoApplyKey = AUTO_APPLY_FILTER_KEYS.some(
    (key) => (prev as Record<string, unknown>)[key] !== (adjusted as Record<string, unknown>)[key]
  )
  if (touchedAutoApplyKey) {
    handleSearch()
  }
}

function handleSearch() {
  applyStagedFieldConfigs()
  // Update snapshot first so query key and API request use current filters (e.g. natAcct, partialFill)
  filtersSnapshot.value = { ...filters.value }
  visibleCount.value = 15
  searchTrigger.value++
}

/** Search bar / Enter: same as `handleSearch`, plus collapse the mobile filter header (`max-sm`, matches Tailwind `sm`). */
function handleSearchBarSubmit() {
  handleSearch()
  if (typeof window !== 'undefined' && window.matchMedia('(max-width: 639px)').matches) {
    mobileTicketsHeaderExpanded.value = false
  }
}

function loadMore() {
  visibleCount.value += 15
}

function drawerInvoiceMatchesTicket(
  detail: InvoiceDetailResponse | null,
  ticket: Ticket
): boolean {
  if (!detail?.success) return false
  const num = detail.invoiceRow?.InvoiceNum
  if (num == null) return false
  return Number(num) === Number(ticket.ticketNumber)
}

async function fetchDrawerInvoiceDetail(
  ticket: Ticket,
  options?: { manageLoading?: boolean; showListButtonSpinner?: boolean }
) {
  const manageLoading = options?.manageLoading !== false
  if (manageLoading) {
    drawerInvoiceLoading.value = true
  }
  if (options?.showListButtonSpinner) {
    loadingTicketNumber.value = ticket.ticketNumber
  }
  drawerInvoiceError.value = ''
  try {
    const { queryClient, CacheProfiles } = await import('@/data/queryClient')
    const invoiceKey = invoiceDetailQueryKey(ticket.ticketNumber)
    const response = await queryClient.fetch(
      invoiceKey,
      (signal) =>
        fetchInvoiceDetail(
          {
            invoiceNum: ticket.ticketNumber,
            includeRawData: 'true',
            includeSchema: 'false',
          },
          signal
        ),
      CacheProfiles.detail
    )

    if (!response.success) {
      drawerInvoiceError.value = response.error || 'Failed to load invoice details'
      return
    }

    drawerInvoiceDetail.value = response
  } catch (error) {
    console.error('Error fetching invoice detail:', error)
    drawerInvoiceError.value =
      error instanceof Error ? error.message : 'An error occurred while loading invoice details'
  } finally {
    if (manageLoading) {
      drawerInvoiceLoading.value = false
    }
    if (options?.showListButtonSpinner) {
      loadingTicketNumber.value = null
    }
  }
}

async function handleView(ticket: Ticket) {
  if (!hasCost.value) return

  drawerInvoiceLoading.value = true
  loadingTicketNumber.value = ticket.ticketNumber
  actionsDrawerTicket.value = ticket
  actionsTab.value = normalizeActionsTab('view')
  actionsDrawerOpen.value = true
  drawerInvoiceDetail.value = null
  drawerInvoiceError.value = ''

  await fetchDrawerInvoiceDetail(ticket, {
    manageLoading: false,
    showListButtonSpinner: false,
  })
  drawerInvoiceLoading.value = false
  loadingTicketNumber.value = null
}

/** Double-click path: opens View tab even when invoice total is $0 (View button stays disabled). */
async function handleOpenViewPanel(ticket: Ticket) {
  if (!hasCost.value) return

  actionsDrawerTicket.value = ticket
  actionsTab.value = normalizeActionsTab('view')
  actionsDrawerOpen.value = true
  drawerInvoiceError.value = ''

  const hasInvoiceTotal = ticket.total != null && ticket.total > 0
  if (!hasInvoiceTotal) {
    drawerInvoiceLoading.value = false
    loadingTicketNumber.value = null
    drawerInvoiceDetail.value = null
    return
  }

  drawerInvoiceLoading.value = true
  loadingTicketNumber.value = ticket.ticketNumber
  drawerInvoiceDetail.value = null

  await fetchDrawerInvoiceDetail(ticket, {
    manageLoading: false,
    showListButtonSpinner: false,
  })
  drawerInvoiceLoading.value = false
  loadingTicketNumber.value = null
}

watch(
  () =>
    [actionsDrawerOpen.value, actionsTab.value, actionsDrawerTicket.value?.ticketNumber ?? null] as const,
  async ([open, tab, ticketNum]) => {
    if (!open || (tab !== 'view' && tab !== 'technicianWorksheet') || ticketNum == null) return
    if (tab === 'view' && !hasCost.value) return
    const ticket = actionsDrawerTicket.value
    if (!ticket || ticket.ticketNumber !== ticketNum) return
    if (
      ticketsAdvancedOnboardingOpen.value &&
      isTicketsTourDemoTicketNumber(ticket.ticketNumber)
    ) {
      return
    }
    if (ticket.total == null || ticket.total === 0) return
    if (drawerInvoiceMatchesTicket(drawerInvoiceDetail.value, ticket)) return
    if (drawerInvoiceLoading.value) return

    await fetchDrawerInvoiceDetail(ticket, { manageLoading: true, showListButtonSpinner: false })
  }
)

async function handleChat(ticket: Ticket, anchor?: MouseEvent) {
  if (!hasChat.value) {
    showChatInactiveDialog.value = true
    return
  }
  const hasPhone = !!ticket.phone?.trim()
  const hasEmail = !!ticket.email?.trim()
  if (!hasPhone && !hasEmail) {
    await alertAnchored({
      message: 'No phone number or email address available for this customer.',
      anchor,
    })
    return
  }
  actionsDrawerTicket.value = ticket
  actionsTab.value = normalizeActionsTab('chat')
  actionsDrawerOpen.value = true
}

function handleChatInactiveSettings() {
  showChatInactiveDialog.value = false
  // To be hooked up later
}

function handleChatInactiveTeamChat() {
  showChatInactiveDialog.value = false
  // To be hooked up later
}

function handleEditStatus(ticket: Ticket) {
  // Open status edit - implementation preserved from original
  console.log('Edit status for ticket:', ticket.ticketNumber)
}

function handleInspection(ticket: Ticket) {
  navigateToDVIEditor(
    {
      inspectionId: ticket.inspectionId,
      ticketNumber: ticket.ticketNumber,
    },
    true
  )
}

async function handleUpdate(
  ticketId: number,
  updates: { technician?: string; vehicleStatus?: string; inspectionId?: string }
) {
  const ticket = ticketsValue.value.find(t => t.id === ticketId)
  if (!ticket) return

  if (
    updates.vehicleStatus !== undefined &&
    String(updates.vehicleStatus).trim() === String(ticket.vehicleStatus ?? '').trim()
  ) {
    return
  }

  if (tickets.value && Array.isArray(tickets.value)) {
    tickets.value = tickets.value.map((t) =>
      t.id === ticketId
        ? {
            ...t,
            ...(updates.technician !== undefined && { technician: updates.technician }),
            ...(updates.vehicleStatus !== undefined && {
              vehicleStatus: updates.vehicleStatus as Ticket['vehicleStatus'],
            }),
            ...(updates.inspectionId !== undefined && { inspectionId: updates.inspectionId }),
          }
        : t
    )
  }

  if (updates.vehicleStatus !== undefined) {
    if (typeof window !== 'undefined') {
      try {
        const { trackVehicleStatusChange } = await import('@/lib/invoice-view-tracker')
        const userName = localStorage.getItem('current_user') || localStorage.getItem('user_name') || undefined
        const ticketTotal = typeof ticket.total === 'number' ? ticket.total : undefined
        trackVehicleStatusChange(ticket.ticketNumber, updates.vehicleStatus, { user: userName, ticketTotal })
        const { buildTimelineEventForVehicleStatus } = await import('@/types/timeline')
        const { persistTimelineEvent } = await import('@/api/timeline')
        const vehicleStatusNumeric = mapVehicleStatusToApi(updates.vehicleStatus as Ticket['vehicleStatus'])
        const row = buildTimelineEventForVehicleStatus(ticket.ticketNumber, vehicleStatusNumeric, {
          user: userName,
          ticketTotal,
        })
        await persistTimelineEvent(row)
      } catch (err) {
        console.error('Error tracking vehicle status change:', err)
      }
      vehicleStatusUpdateTrigger.value = Date.now()
      window.dispatchEvent(new CustomEvent('vehicle-status-changed', {
        detail: { ticketNumber: ticket.ticketNumber, newStatus: updates.vehicleStatus },
      }))
    }

    try {
      const vehicleParts = ticket.vehicle ? ticket.vehicle.match(/^(.+?)\s+(\d{4})\s+\(([^)]+)\)$/) : null
      const vehMake = vehicleParts ? vehicleParts[1].split(' ')[0] : ''
      const vehModel = vehicleParts ? vehicleParts[1].split(' ').slice(1).join(' ') : ''
      const vehYear = vehicleParts ? vehicleParts[2] : ''
      const vehTag = vehicleParts ? vehicleParts[3] : ''
      const apptVehStatus = mapVehicleStatusToApi(updates.vehicleStatus as Ticket['vehicleStatus'])
      const notificationPayload = {
        handlerId: 3,
        notificationType: updates.vehicleStatus,
        ApptVehicleStatus: apptVehStatus,
        ticketNum: ticket.ticketNumber,
        storeNum: getSelectedStoreNum(),
        custNum: 0,
        custFirstName: ticket.name.split(' ')[0] || '',
        custLastName: ticket.name.split(' ').slice(1).join(' ') || '',
        custEmail: '',
        custPhone: '',
        custMobile: '',
        custAddress: '',
        custCity: '',
        custState: '',
        custZip: '',
        apptDate: '',
        apptTime: 0,
        apptDescription: '',
        apptCode: '',
        apptVehStatus: apptVehStatus,
        apptCancel: '',
        comment: `Vehicle status updated to: ${updates.vehicleStatus}`,
        vehTag: vehTag,
        vehMake: vehMake,
        vehModel: vehModel,
        vehYear: vehYear,
        vehVin: '',
        vehMileage: 0,
        attrType: '',
        attrMemo: '',
        attrLink: '',
      }
      const notificationResult = await sendHitsNotification(notificationPayload)
      if (!notificationResult.success) {
        console.error('Failed to send HITS notification:', notificationResult.error)
      }
    } catch (error) {
      console.error('Error sending vehicle status notification:', error)
    }
  }
}

async function handleProgressAction(ticket: Ticket, action: string) {
  switch (action) {
    case 'startWork': {
      await handleUpdate(ticket.id, { vehicleStatus: 'In Shop' })
      return
    }
    case 'technicianWorksheet': {
      await openTechnicianWorksheetDrawer(ticket)
      return
    }
    default:
      console.log('Progress action:', action, 'for ticket:', ticket.ticketNumber)
  }
}

function handleStatusChange(ticketId: number, status: string) {
  handleUpdate(ticketId, { vehicleStatus: status })
}

// Preset handlers
function handlePresetSelect(preset: FilterPreset) {
  clearDateFilterCookies()
  selectedPresetId.value = preset.id
  const appliedFilters = applyPreset(preset.id) ?? preset.filters
  filters.value = { ...appliedFilters }
  presetLoadMessage.value = ''
  persistActivePresetCookie(preset.id)
  syncDraftFieldConfigsFromApplied()
  handleSearch()
  runMobileTableRedirectPasses()
}

function handleClearPresetSelection() {
  selectedPresetId.value = null
  clearActivePresetCookie()
}

async function handlePresetSave(
  name: string,
  presetFilters: TicketFilters,
  isDefault: boolean,
  scope: PresetScope = 'user'
) {
  const allowed = saveScopeOptions.value
  const effectiveScope = allowed.includes(scope) ? scope : (allowed[0] ?? 'user')
  const created = await addFilterPreset(name, presetFilters, effectiveScope)
  if (!created) return
  const preset: FilterPreset = {
    ...created,
    isDefault: isDefault ? true : created.isDefault,
    tableConfig: {
      visibleColumns: [...tableConfig.value.visibleColumns],
      columnOrder: [...tableConfig.value.columnOrder],
    },
    cardConfig: {
      visibleFields: [...cardConfig.value.visibleFields],
      fieldOrder: [...cardConfig.value.fieldOrder],
    },
    progressConfig: {
      visibleFields: [...(progressConfig.value.visibleFields ?? DEFAULT_PROGRESS_FIELDS)],
      sortBy: progressConfig.value.sortBy,
    },
  }
  await handlePresetUpdate(preset)
  selectedPresetId.value = preset.id
  persistActivePresetCookie(preset.id)
}

async function handlePresetDelete(presetId: string | number) {
  const preset = presetsForDisplay.value.find((item) => presetIdEquals(item.id, presetId))
  if (!preset || !canDeletePresetByRule(preset)) return
  await removeFilterPreset(presetId, { allowSystemPresetDeletion: isAatechUser.value })
  if (presetIdEquals(selectedPresetId.value, presetId)) {
    selectedPresetId.value = null
    clearActivePresetCookie()
  }
}

function handlePresetSetDefault(presetId: string | number) {
  setDefaultPreset(presetId)
}

async function handlePresetUpdate(preset: FilterPreset) {
  if (!canEditPresetByRule(preset)) return
  await saveFilterPreset(preset)
  if (preset.isDefault) {
    setDefaultPreset(preset.id)
  }
}

async function handleUpdateSelectedPreset() {
  const preset = selectedPreset.value
  if (!preset || !canEditPresetByRule(preset) || !isSelectedPresetDirty.value) return
  await handlePresetUpdate({
    ...preset,
    filters: { ...filters.value },
    style: currentStyle.value,
    tableConfig: {
      visibleColumns: [...tableConfig.value.visibleColumns],
      columnOrder: [...tableConfig.value.columnOrder],
    },
    cardConfig: {
      visibleFields: [...cardConfig.value.visibleFields],
      fieldOrder: [...cardConfig.value.fieldOrder],
    },
    progressConfig: {
      visibleFields: [...(progressConfig.value.visibleFields ?? DEFAULT_PROGRESS_FIELDS)],
    },
  })
}

async function handlePresetRename(payload: { presetId: string | number; name: string }) {
  const preset = filterPresets.value.find((item) => presetIdEquals(item.id, payload.presetId))
  if (!preset) return
  await handlePresetUpdate({
    ...preset,
    name: payload.name,
  })
}

function handleAdvancedFiltersSavePreset(
  name: string,
  presetFilters: TicketFilters,
  isDefault: boolean,
  scope: PresetScope
) {
  handlePresetSave(name, presetFilters, isDefault, scope)
}

function handleAdvancedFiltersClear() {
  selectedPresetId.value = null
  clearActivePresetCookie()
  const defaultVisibleColumns = [...DEFAULT_STYLE_PREFERENCES.table.visibleColumns]
  const defaultColumnOrder = [...DEFAULT_STYLE_PREFERENCES.table.columnOrder]
  updateTableConfig({
    visibleColumns: [...defaultVisibleColumns],
    columnOrder: [...defaultColumnOrder],
  })
  updateCardConfig({
    visibleFields: [...defaultVisibleColumns],
    fieldOrder: [...defaultColumnOrder],
  })
  updateProgressConfig({ visibleFields: [...defaultVisibleColumns] })
  draftSharedVisibleColumns.value = [...defaultVisibleColumns]
  draftSharedColumnOrder.value = [...defaultColumnOrder]
}

// Config update handlers
function updateTableColumns(columns: string[]) {
  draftSharedVisibleColumns.value = [...columns]
}

/** Keep synthetic `actions` last among visible keys; strip when not visible. */
function pinActionsInColumnOrder(visible: string[], columnOrder: string[]): string[] {
  const visibleSet = new Set(visible)
  const hasActions = visibleSet.has('actions')
  const withoutActions = columnOrder.filter((k) => k !== 'actions')
  if (!hasActions) return withoutActions
  const visibleNonActions = withoutActions.filter((k) => visibleSet.has(k) && k !== 'actions')
  const hidden = withoutActions.filter((k) => !visibleSet.has(k))
  return [...visibleNonActions, 'actions', ...hidden]
}

function updateTableColumnOrder(order: string[]) {
  draftSharedColumnOrder.value = pinActionsInColumnOrder(draftSharedVisibleColumns.value, order)
}

function handleTableColumnReorder(newVisibleOrder: string[]) {
  const { visibleColumns, columnOrder } = tableConfig.value
  const baseOrder = columnOrder.length > 0 ? columnOrder : visibleColumns
  const visibleSet = new Set(visibleColumns)
  const hiddenOrder = baseOrder.filter((key) => !visibleSet.has(key))
  const hasActions = visibleSet.has('actions')
  const dataOnly = newVisibleOrder.filter((k) => k !== 'actions')
  const visiblePrefix = hasActions ? [...dataOnly, 'actions'] : dataOnly
  updateTableConfig({ columnOrder: [...visiblePrefix, ...hiddenOrder] })
  syncDraftFieldConfigsFromApplied()
}

function updateCardFields(fields: string[]) {
  draftSharedVisibleColumns.value = [...fields]
}

function updateCardFieldOrder(order: string[]) {
  draftSharedColumnOrder.value = pinActionsInColumnOrder(draftSharedVisibleColumns.value, order)
}

/** Visible keys in preferred order, then new visible keys, then hidden keys (preferred tail). */
function mergeVisibleIntoFieldOrder(newVisible: string[], preferredOrder: string[]): string[] {
  const visibleSet = new Set(newVisible)
  const ordered: string[] = []
  for (const k of preferredOrder) {
    if (visibleSet.has(k)) ordered.push(k)
  }
  for (const k of newVisible) {
    if (!ordered.includes(k)) ordered.push(k)
  }
  const hidden = preferredOrder.filter((k) => !visibleSet.has(k))
  return [...ordered, ...hidden]
}

function applyStagedFieldConfigs() {
  const visible = [...draftSharedVisibleColumns.value]
  const columnOrderPinned = pinActionsInColumnOrder(visible, draftSharedColumnOrder.value)
  draftSharedColumnOrder.value = columnOrderPinned
  updateTableConfig({
    visibleColumns: visible,
    columnOrder: columnOrderPinned,
  })
  const cardPrev =
    cardConfig.value.fieldOrder.length > 0
      ? cardConfig.value.fieldOrder
      : cardConfig.value.visibleFields
  updateCardConfig({
    visibleFields: visible,
    fieldOrder: mergeVisibleIntoFieldOrder(visible, cardPrev),
  })
  const progressPrev =
    progressConfig.value.visibleFields && progressConfig.value.visibleFields.length > 0
      ? progressConfig.value.visibleFields
      : [...DEFAULT_PROGRESS_FIELDS]
  updateProgressConfig({
    visibleFields: mergeVisibleIntoFieldOrder(visible, progressPrev),
    skipTableCardSync: true,
  })
}

function syncDraftFieldConfigsFromApplied() {
  const vc = [...tableConfig.value.visibleColumns]
  draftSharedVisibleColumns.value = vc
  const appliedSharedOrder = tableConfig.value.columnOrder.length > 0
    ? tableConfig.value.columnOrder
    : tableConfig.value.visibleColumns
  draftSharedColumnOrder.value = pinActionsInColumnOrder(vc, appliedSharedOrder)
}

async function generateCustomerViewUrlForTicket(ticketNumber: number): Promise<string | null> {
  try {
    let ticket = ticketsValue.value.find((t) => t.ticketNumber === ticketNumber)
    if (!ticket) {
      const tempFilters: TicketFilters = {
        ...filters.value,
        ticketNumber: ticketNumber.toString(),
        dateRange: 'This Year',
      }
      const { queryClient, CacheProfiles } = await import('@/data/queryClient')
      const key = `tickets|${ticketNumber}|This Year|${tempFilters.workorder ? '1' : '0'}|${tempFilters.invoice ? '1' : '0'}|${tempFilters.batch ? '1' : '0'}|${tempFilters.quote ? '1' : '0'}|${ticketNumber}|All Statuses|`
      const fetchedTickets = await queryClient.fetch(
        key,
        (signal) => fetchTickets(tempFilters, signal),
        CacheProfiles.list
      )
      ticket = fetchedTickets.find((t) => t.ticketNumber === ticketNumber)
      if (!ticket) return null
    }
    const { generateCustomerViewUrl } = await import('@/lib/invoice-token')
    return generateCustomerViewUrl({
      e: 'p',
      a: HITS_ACCOUNT,
      i: String(ticket.ticketNumber),
    })
  } catch (error) {
    console.error('Error generating customer view URL:', error)
    return null
  }
}

declare global {
  interface Window {
    generateCustomerViewUrl: (ticketNumber: number) => Promise<string | null>
  }
}

// Initialize
onMounted(async () => {
  if (typeof window !== 'undefined') {
    mobileTicketsFilterTitleMq = window.matchMedia('(max-width: 639px)')
    isMobileTicketsFilterTitle.value = mobileTicketsFilterTitleMq.matches
    mobileTicketsFilterTitleMq.addEventListener('change', onMobileTicketsFilterTitleMqChange)
    ticketsTourDesktopMq = window.matchMedia('(min-width: 1024px)')
    isTicketsTourDesktop.value = ticketsTourDesktopMq.matches
    ticketsTourDesktopMq.addEventListener('change', onTicketsTourDesktopMqChange)
  }
  if (import.meta.env.DEV) {
    await loadDevUserContext()
  }
  await initializePreferences()
  stripFinancialPreferences()

  const savedDateRange = getCookie(COOKIE_DATE_RANGE)
  const savedCustomFrom = getCookie(COOKIE_CUSTOM_FROM)
  const savedCustomTo = getCookie(COOKIE_CUSTOM_TO)

  const savedView = getCookie(COOKIE_VIEW_MODE)
  if (savedView === 'board') {
    setCurrentStyle('table')
    setCookie(COOKIE_VIEW_MODE, 'table')
  } else if (savedView && VALID_VIEW_COOKIE.includes(savedView as ViewModeValue)) {
    setCurrentStyle(savedView as ViewModeValue)
  }

  if (lastUsedFilters.value) {
    filters.value = { ...lastUsedFilters.value }
  }

  const cookiePresetId = getCookie(COOKIE_ACTIVE_PRESET_ID)
  const cookiePresetValid =
    cookiePresetId != null &&
    cookiePresetId !== '' &&
    filterPresets.value.some((p) => presetIdEquals(p.id, cookiePresetId))
  if (cookiePresetId && !cookiePresetValid) {
    clearActivePresetCookie()
  }

  if (cookiePresetValid && cookiePresetId) {
    const matchedPreset = filterPresets.value.find((p) => presetIdEquals(p.id, cookiePresetId))
    const appliedFilters = applyPreset(matchedPreset?.id ?? cookiePresetId)
    if (appliedFilters) {
      selectedPresetId.value = matchedPreset?.id ?? cookiePresetId
      filters.value = { ...appliedFilters }
      presetLoadMessage.value = ''
    } else {
      selectedPresetId.value = null
      clearActivePresetCookie()
      presetLoadMessage.value = 'This view is unavailable. Please try again.'
    }
  } else {
    const favoritePreset = filterPresets.value.find((preset) => preset.isDefault)
    if (favoritePreset) {
      const appliedFilters = applyPreset(favoritePreset.id)
      if (appliedFilters) {
        selectedPresetId.value = favoritePreset.id
        filters.value = { ...appliedFilters }
        presetLoadMessage.value = ''
      } else {
        selectedPresetId.value = null
        presetLoadMessage.value = 'This view is unavailable. Please try again.'
      }
    }
  }

  if (savedDateRange) {
    filters.value = { ...filters.value, dateRange: savedDateRange }
  }
  if (savedCustomFrom) {
    filters.value = { ...filters.value, customFromDate: savedCustomFrom }
  }
  if (savedCustomTo) {
    filters.value = { ...filters.value, customToDate: savedCustomTo }
  }

  dateFilterCookiesReady.value = true
  persistDateFilterCookies()

  filtersSnapshot.value = { ...filters.value }
  syncDraftFieldConfigsFromApplied()

  // Ensure the initial tickets query and cache reflect the restored filters
  // (e.g. Last Month) so the results match what the UI shows when returning
  // to this page from a ticket view.
  handleSearch()

  runMobileTableRedirectPasses()

  // Enable the real query key only after prefs/cookies and snapshot are aligned,
  // so the first network fetch never uses the pre-mount DEFAULT_FILTERS snapshot.
  ticketsQueryReady.value = true

  if (
    isTicketsTourDesktop.value &&
    readTicketsOnboardingState() === 'not_seen' &&
    !isTicketsWelcomeSnoozedThisSession()
  ) {
    void nextTick(() => {
      ticketsWelcomeOpen.value = true
    })
  }

  window.generateCustomerViewUrl = generateCustomerViewUrlForTicket
  approvalUpdateTrigger.value = Date.now()

  timelineIdbChangeListener = (e: Event) => {
    const detail = (e as CustomEvent)?.detail as { kind?: string; ticketNumber?: number } | undefined
    const kind = detail?.kind
    const ticketNumber = detail?.ticketNumber
    if (kind === 'invoice_view_status') {
      viewStatusUpdateTrigger.value = Date.now()
      if (typeof ticketNumber === 'number' && !Number.isNaN(ticketNumber)) {
        scheduleViewStatusExpiryTimeout(ticketNumber)
      }
    } else if (kind === 'work_approval') {
      approvalUpdateTrigger.value = Date.now()
    } else if (kind === 'vehicle_status_changes' || kind === 'ticket_sent') {
      vehicleStatusUpdateTrigger.value = Date.now()
    } else if (kind === 'inspection_view_status') {
      inspectionViewUpdateTrigger.value = Date.now()
      if (typeof ticketNumber === 'number' && !Number.isNaN(ticketNumber)) {
        scheduleInspectionViewExpiryTimeout(ticketNumber)
      }
    } else if (kind === 'inspection_sent') {
      inspectionViewUpdateTrigger.value = Date.now()
    }
  }
  window.addEventListener('timeline-idb-changed', timelineIdbChangeListener)

  viewStatusChangeListener = (e: Event) => {
    viewStatusUpdateTrigger.value = Date.now()
    const ticketNumber = (e as CustomEvent)?.detail?.ticketNumber
    if (typeof ticketNumber === 'number') {
      scheduleViewStatusExpiryTimeout(ticketNumber)
    }
  }
  window.addEventListener('invoice-view-status-changed', viewStatusChangeListener)

  inspectionViewStatusChangeListener = (e: Event) => {
    inspectionViewUpdateTrigger.value = Date.now()
    const ticketNumber = (e as CustomEvent)?.detail?.ticketNumber
    if (typeof ticketNumber === 'number') {
      scheduleInspectionViewExpiryTimeout(ticketNumber)
    }
  }
  window.addEventListener('inspection-view-status-changed', inspectionViewStatusChangeListener)

  approvalChangeListener = () => {
    approvalUpdateTrigger.value = Date.now()
  }
  window.addEventListener('work-approval-changed', approvalChangeListener)

  vehicleStatusChangeListener = () => {
    vehicleStatusUpdateTrigger.value = Date.now()
  }
  window.addEventListener('vehicle-status-changed', vehicleStatusChangeListener)

  cleanupListener = setupInspectionListener((update) => {
    if (update.type === 'INSPECTION_CREATED' || update.type === 'INSPECTION_UPDATED') {
      const ticket = ticketsValue.value.find(
        (t) => t.ticketNumber.toString() === update.ticketNumber.toString()
      )
      if (ticket && update.inspectionId) {
        handleUpdate(ticket.id, { inspectionId: update.inspectionId })
      }
    }
    if (update.type === 'INSPECTION_COMPLETED') {
      const ticket = ticketsValue.value.find(
        (t) => t.ticketNumber.toString() === update.ticketNumber.toString()
      )
      if (ticket && update.inspectionId) {
        handleUpdate(ticket.id, { inspectionId: update.inspectionId })
      }
    }
    if (update.type === 'INSPECTION_SENT') {
      void handleDviInspectionSent(update)
    }
    if (update.type === 'INSPECTION_CUSTOMER_VIEW_OPENED') {
      void handleDviInspectionCustomerViewOpened(update)
    }
  })
})

onUnmounted(() => {
  clearTicketsTourMenuHandlers()
  clearAllTicketsTourUiTimers()
  if (cleanupListener) {
    cleanupListener()
  }
  if (timelineIdbChangeListener) {
    window.removeEventListener('timeline-idb-changed', timelineIdbChangeListener)
  }
  if (viewStatusChangeListener) {
    window.removeEventListener('invoice-view-status-changed', viewStatusChangeListener)
  }
  if (inspectionViewStatusChangeListener) {
    window.removeEventListener('inspection-view-status-changed', inspectionViewStatusChangeListener)
  }
  if (approvalChangeListener) {
    window.removeEventListener('work-approval-changed', approvalChangeListener)
  }
  if (vehicleStatusChangeListener) {
    window.removeEventListener('vehicle-status-changed', vehicleStatusChangeListener)
  }
  if (mobileTicketsFilterTitleMq) {
    mobileTicketsFilterTitleMq.removeEventListener('change', onMobileTicketsFilterTitleMqChange)
    mobileTicketsFilterTitleMq = null
  }
  if (ticketsTourDesktopMq) {
    ticketsTourDesktopMq.removeEventListener('change', onTicketsTourDesktopMqChange)
    ticketsTourDesktopMq = null
  }
  for (const timeoutId of viewStatusExpiryTimeouts.values()) {
    clearTimeout(timeoutId)
  }
  viewStatusExpiryTimeouts.clear()
  for (const timeoutId of inspectionViewExpiryTimeouts.values()) {
    clearTimeout(timeoutId)
  }
  inspectionViewExpiryTimeouts.clear()
  clearMobileTableBannerTimer()
})
</script>

