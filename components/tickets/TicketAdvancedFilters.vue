<template>
  <div :class="wrapperClass" ref="containerRef">
    <!-- Toggle button -->
    <button
      type="button"
      data-onboarding="ticket-presets-trigger"
      @click="toggleOpen"
      :class="triggerClass"
    >
      <span class="flex min-w-0 flex-1 items-center gap-2">
        <PhFunnel :size="16" weight="regular" class="shrink-0" />
        <span
          v-if="selectedPresetIsFavorite && title !== 'Custom'"
          class="inline-flex shrink-0 text-amber-500"
          title="Favorite preset"
        >
          <PhStar :size="16" weight="fill" aria-hidden="true" />
        </span>
        <span class="min-w-0 truncate text-left">{{ title }}</span>
        <Badge v-if="activeFilterCount > 0" class="ml-2 shrink-0 bg-brand-accent text-brand-accent-foreground">
          {{ activeFilterCount }}
        </Badge>
      </span>
      <PhCaretDown
        :size="16"
        weight="bold"
        class="shrink-0"
        :class="['transition-transform', { 'rotate-180': isOpen }]"
      />
    </button>

    <!-- Inline collapsible content -->
    <div
      v-if="variant === 'inline'"
      v-show="isOpen"
      class="px-4 pb-4 pt-3 space-y-4 border-t border-border"
    >
      <!-- Top controls: Display / Tab (Group By) / Sort By -->
      <div v-if="headerHasContent" class="space-y-3 pb-3 border-b border-border">
        <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
          <div
            v-if="visibleStyleOptions.length > 1"
            class="flex flex-col gap-2 text-xs font-medium text-muted-foreground sm:flex-row sm:items-center w-full min-w-0"
            data-keep-filters-open="true"
            data-onboarding="ticket-preset-display-inline"
          >
            <span class="hidden sm:inline">Display</span>
            <div class="inline-flex w-full sm:w-auto rounded-md border border-border bg-muted overflow-hidden">
              <button
                v-for="style in visibleStyleOptions"
                :key="style.value"
                type="button"
                @click="onStyleClick(style.value)"
                :class="[
                  'flex min-w-0 flex-1 items-center justify-center px-2.5 py-1 text-xs sm:text-sm font-medium transition-colors',
                  effectiveStyle === style.value
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-background/60 dark:hover:bg-accent/40'
                ]"
              >
                <span class="inline-flex w-full items-center justify-center gap-1.5">
                  <component :is="getStyleIcon(style.value)" :size="14" weight="regular" class="shrink-0" />
                  <span>{{ style.label }}</span>
                </span>
              </button>
            </div>
          </div>
          <!-- Tab (Group By) custom listbox (in-DOM so onboarding spotlight can include open panel) -->
          <div
            class="flex flex-col gap-1 text-xs text-muted-foreground w-full min-w-0 sm:w-48 sm:shrink-0"
            data-onboarding="ticket-tab-group-by"
          >
            <span class="font-medium">Tab (Group By)</span>
            <div class="relative w-full" ref="tabGroupPickerRootRef">
              <button
                :id="TICKETS_TAB_GROUP_BY_TRIGGER_ID"
                ref="tabGroupDropdownTriggerRef"
                type="button"
                data-onboarding="ticket-tab-group-by-trigger"
                class="flex h-10 min-h-[44px] sm:min-h-[40px] w-full items-center gap-2 rounded-md border border-input bg-background px-3 py-2 text-left text-sm ring-offset-background hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                @click.stop="isTabGroupPickerOpen = !isTabGroupPickerOpen"
                :aria-expanded="isTabGroupPickerOpen"
                aria-haspopup="listbox"
              >
                <span class="min-w-0 flex-1 truncate">{{ tabGroupPickerTriggerLabel }}</span>
                <PhCaretDown
                  :size="16"
                  weight="bold"
                  class="shrink-0 transition-transform text-muted-foreground"
                  :class="{ 'rotate-180': isTabGroupPickerOpen }"
                />
              </button>
              <div
                v-show="isTabGroupPickerOpen"
                data-onboarding="ticket-tab-group-by-panel"
                class="absolute left-0 right-0 top-full z-[110] mt-1 max-h-[min(50dvh,16rem)] overflow-y-auto rounded-md border border-border bg-popover py-1 shadow-md text-popover-foreground"
                role="listbox"
              >
                <button
                  v-for="opt in tabGroupByMenuOptions"
                  :key="opt.value"
                  type="button"
                  role="option"
                  :aria-selected="tabGroupByValue === opt.value"
                  class="flex w-full px-3 py-2 text-left text-sm transition-colors hover:bg-accent"
                  :class="{ 'bg-accent': tabGroupByValue === opt.value }"
                  @click="pickTabGroupMenuOption(opt.value)"
                >
                  {{ opt.label }}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Include in search (API call parameters) - moved to expandable area -->
      <div v-if="showMore">
        <p class="text-xs font-medium text-muted-foreground mb-2">Include in search</p>
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-4">
          <div>
            <label class="block text-xs font-medium text-muted-foreground mb-1">Partial Fill</label>
            <select
              :value="filters.partialFill ?? -1"
              @change="handleFilterChange('partialFill', parseInt(($event.target as HTMLSelectElement).value))"
              class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <option :value="-1">All</option>
              <option :value="1">Yes</option>
              <option :value="0">No</option>
            </select>
          </div>
          <div>
            <label class="block text-xs font-medium text-muted-foreground mb-1">Back Order</label>
            <select
              :value="filters.backOrder ?? -1"
              @change="handleFilterChange('backOrder', parseInt(($event.target as HTMLSelectElement).value))"
              class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <option :value="-1">All</option>
              <option :value="0">Not BO</option>
              <option :value="1">Yes BO</option>
            </select>
          </div>
          <div>
            <label class="block text-xs font-medium text-muted-foreground mb-1">National Account</label>
            <select
              :value="filters.natAcct ?? -1"
              @change="handleFilterChange('natAcct', parseInt(($event.target as HTMLSelectElement).value))"
              class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <option :value="-1">All</option>
              <option :value="0">No national acct</option>
              <option :value="1">Yes national acct</option>
            </select>
          </div>
          <div>
            <label class="block text-xs font-medium text-muted-foreground mb-1">Print Status</label>
            <select
              :value="filters.printStatus ?? 0"
              @change="handleFilterChange('printStatus', parseInt(($event.target as HTMLSelectElement).value))"
              class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <option :value="0">All</option>
              <option :value="1">Printed</option>
              <option :value="2">Not printed</option>
            </select>
          </div>
        </div>
      </div>

      <!-- Filters section -->
      <div>
        <p class="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Filters</p>
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-4" data-onboarding="ticket-filters-grid">
          <!-- Primary 4 filters -->
          <div>
            <label class="block text-xs font-medium text-muted-foreground mb-1">Date</label>
            <select
              :value="filters.dateRange"
              @change="handleFilterChange('dateRange', ($event.target as HTMLSelectElement).value)"
              class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <option v-for="option in DATE_RANGE_OPTIONS" :key="option" :value="option">
                {{ option }}
              </option>
            </select>
          </div>
          <div>
            <label class="block text-xs font-medium text-muted-foreground mb-1">Ticket Type</label>
            <TicketTypePicker
              :filters="filters"
              full-width
              @update:filters="(next) => emit('update:filters', next)"
            />
          </div>
          <div>
            <label class="block text-xs font-medium text-muted-foreground mb-1">Sales Rep</label>
            <select
              :value="filters.salesrep || ''"
              @change="handleFilterChange('salesrep', ($event.target as HTMLSelectElement).value || undefined)"
              class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <option value="">All Salesreps</option>
              <option v-for="s in salesrepOptions" :key="s" :value="s">{{ s }}</option>
            </select>
          </div>
          <div>
            <label class="block text-xs font-medium text-muted-foreground mb-1">Technician</label>
            <select
              :value="filters.technician || ''"
              @change="handleFilterChange('technician', ($event.target as HTMLSelectElement).value || undefined)"
              class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <option value="">All Technicians</option>
              <option v-for="t in technicianOptions" :key="t" :value="t">{{ t }}</option>
            </select>
          </div>

          <!-- Additional filters, only when expanded -->
          <template v-if="showMore">
            <div>
              <label class="block text-xs font-medium text-muted-foreground mb-1">Vehicle Status</label>
              <select
                :value="displayVehicleStatus"
                @change="handleVehicleStatusChange(($event.target as HTMLSelectElement).value)"
                class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <option value="">All Statuses</option>
                <option v-for="status in VEHICLE_STATUSES" :key="status" :value="status">
                  {{ status }}
                </option>
              </select>
            </div>
            <div>
              <label class="block text-xs font-medium text-muted-foreground mb-1">Back Order</label>
              <select
                :value="filters.backOrder ?? -1"
                @change="handleFilterChange('backOrder', parseInt(($event.target as HTMLSelectElement).value))"
                class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <option :value="-1">All</option>
                <option :value="0">Not BO</option>
                <option :value="1">Yes BO</option>
              </select>
            </div>
            <div>
              <label class="block text-xs font-medium text-muted-foreground mb-1">Partial Fill</label>
              <select
                :value="filters.partialFill ?? -1"
                @change="handleFilterChange('partialFill', parseInt(($event.target as HTMLSelectElement).value))"
                class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <option :value="-1">All</option>
                <option :value="1">Yes</option>
                <option :value="0">No</option>
              </select>
            </div>
            <div>
              <label class="block text-xs font-medium text-muted-foreground mb-1">National Account</label>
              <select
                :value="filters.natAcct ?? -1"
                @change="handleFilterChange('natAcct', parseInt(($event.target as HTMLSelectElement).value))"
                class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <option :value="-1">All</option>
                <option :value="0">No national acct</option>
                <option :value="1">Yes national acct</option>
              </select>
            </div>
            <div>
              <label class="block text-xs font-medium text-muted-foreground mb-1">Print Status</label>
              <select
                :value="filters.printStatus ?? 0"
                @change="handleFilterChange('printStatus', parseInt(($event.target as HTMLSelectElement).value))"
                class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <option :value="0">All</option>
                <option :value="1">Printed</option>
                <option :value="2">Not printed</option>
              </select>
            </div>
            <div>
              <label class="block text-xs font-medium text-muted-foreground mb-1">Route</label>
              <select
                :value="filters.routeNum || ''"
                @change="handleFilterChange('routeNum', ($event.target as HTMLSelectElement).value || undefined)"
                class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <option value="">All Routes</option>
                <option v-for="route in routeOptions" :key="route.id" :value="route.id">
                  {{ route.name }}
                </option>
              </select>
            </div>
            <div>
              <label class="inline-flex items-center gap-2 text-xs font-medium text-muted-foreground mb-1">
                <Checkbox
                  :checked="filters.onlyOverdue === true"
                  @update:checked="(val) => handleFilterChange('onlyOverdue', val ? true : undefined)"
                  class="shrink-0"
                />
                <span>Overdue only</span>
              </label>
            </div>
            <div>
              <label class="block text-xs font-medium text-muted-foreground mb-1">Ready For at least</label>
              <select
                :value="filters.readyForAtLeastMinutes ?? ''"
                @change="handleFilterChange('readyForAtLeastMinutes', ($event.target as HTMLSelectElement).value ? parseInt(($event.target as HTMLSelectElement).value) : undefined)"
                class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <option value="">Any</option>
                <option value="30">30 minutes</option>
                <option value="60">1 hour</option>
                <option value="240">4 hours</option>
                <option value="480">8 hours</option>
                <option value="1440">24 hours</option>
              </select>
            </div>
            <div>
              <label class="block text-xs font-medium text-muted-foreground mb-1">Time in Service at least</label>
              <select
                :value="filters.timeInServiceAtLeastMinutes ?? ''"
                @change="handleFilterChange('timeInServiceAtLeastMinutes', ($event.target as HTMLSelectElement).value ? parseInt(($event.target as HTMLSelectElement).value) : undefined)"
                class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <option value="">Any</option>
                <option value="30">30 minutes</option>
                <option value="60">1 hour</option>
                <option value="240">4 hours</option>
                <option value="480">8 hours</option>
                <option value="1440">24 hours</option>
              </select>
            </div>
            <div>
              <label class="block text-xs font-medium text-muted-foreground mb-1">Time Since Check In at least</label>
              <select
                :value="filters.timeSinceCheckInAtLeastMinutes ?? ''"
                @change="handleFilterChange('timeSinceCheckInAtLeastMinutes', ($event.target as HTMLSelectElement).value ? parseInt(($event.target as HTMLSelectElement).value) : undefined)"
                class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <option value="">Any</option>
                <option value="15">15 minutes</option>
                <option value="30">30 minutes</option>
                <option value="60">1 hour</option>
                <option value="240">4 hours</option>
                <option value="480">8 hours</option>
              </select>
            </div>
            <div>
              <label class="block text-xs font-medium text-muted-foreground mb-1">Service Cycle Time at least</label>
              <select
                :value="filters.serviceCycleTimeAtLeastMinutes ?? ''"
                @change="handleFilterChange('serviceCycleTimeAtLeastMinutes', ($event.target as HTMLSelectElement).value ? parseInt(($event.target as HTMLSelectElement).value) : undefined)"
                class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <option value="">Any</option>
                <option value="30">30 minutes</option>
                <option value="60">1 hour</option>
                <option value="240">4 hours</option>
                <option value="480">8 hours</option>
                <option value="1440">24 hours</option>
              </select>
            </div>
            <div>
              <label class="block text-xs font-medium text-muted-foreground mb-1">Inspection Time at least</label>
              <select
                :value="filters.inspectionCompletionAtLeastMinutes ?? ''"
                @change="handleFilterChange('inspectionCompletionAtLeastMinutes', ($event.target as HTMLSelectElement).value ? parseInt(($event.target as HTMLSelectElement).value) : undefined)"
                class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <option value="">Any</option>
                <option value="15">15 minutes</option>
                <option value="30">30 minutes</option>
                <option value="60">1 hour</option>
                <option value="120">2 hours</option>
                <option value="240">4 hours</option>
              </select>
            </div>
            <div v-if="canViewFinancial">
              <label class="block text-xs font-medium text-muted-foreground mb-1">GP %</label>
              <div class="flex items-center gap-2">
                <input
                  type="number"
                  :value="filters.gpPercentMin ?? ''"
                  @change="handleFilterChange('gpPercentMin', ($event.target as HTMLInputElement).value ? parseFloat(($event.target as HTMLInputElement).value) : undefined)"
                  placeholder="Min"
                  class="flex h-10 w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                />
                <span class="text-xs text-muted-foreground">to</span>
                <input
                  type="number"
                  :value="filters.gpPercentMax ?? ''"
                  @change="handleFilterChange('gpPercentMax', ($event.target as HTMLInputElement).value ? parseFloat(($event.target as HTMLInputElement).value) : undefined)"
                  placeholder="Max"
                  class="flex h-10 w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                />
              </div>
            </div>
          </template>
        </div>
      </div>

      <!-- Expand/collapse controls for extra filters -->
      <div class="flex justify-start pt-1">
        <button
          type="button"
          class="text-xs font-medium text-brand-accent hover:underline"
          @click="showMore = !showMore"
        >
          {{ showMore ? 'Show less filters' : 'Show more filters' }}
        </button>
      </div>

      <!-- Fields section -->
      <div v-if="$slots.tools" class="pt-2 border-t border-border mt-2" data-onboarding="ticket-preset-fields">
        <div class="flex flex-wrap items-center gap-3">
          <slot name="tools" />
        </div>
      </div>

      <!-- Actions: mobile = one row (theme icon → Clear → …); sm+ = theme left, actions right -->
      <div
        class="flex flex-wrap items-center gap-2 pt-2 max-sm:justify-start sm:justify-between"
      >
        <button
          v-if="props.tourEnabled"
          ref="tourMenuTriggerRef"
          type="button"
          class="flex h-9 w-9 items-center justify-center rounded-md border border-input bg-background text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          aria-haspopup="menu"
          :aria-expanded="tourMenuOpen"
          aria-label="Tickets tours and options"
          @click.stop="toggleTourMenu"
        >
          <PhInfo :size="16" weight="regular" aria-hidden="true" />
        </button>
        <div class="flex flex-wrap items-center gap-2 sm:ml-auto sm:justify-end">
          <Button variant="outline" size="sm" @click="clearFilters">
            Clear
          </Button>
          <Button
            variant="ink"
            size="sm"
            data-onboarding="ticket-save-preset"
            @click="handlePresetAction"
            :disabled="!canSaveOrUpdatePreset"
            class="disabled:opacity-100"
          >
            Save Preset
          </Button>
          <Button variant="brand" size="sm" @click="onApply">
            Apply
          </Button>
        </div>
      </div>
    </div>

    <!-- Dropdown content (when variant is dropdown) -->
    <Teleport to="body">
      <div
        v-if="variant === 'dropdown' && isOpen"
        id="tickets-filters-onboarding-root"
        ref="dropdownRef"
        data-onboarding="ticket-filters-dropdown-root"
        class="fixed z-[100] flex min-h-0 w-fit min-w-[20rem] max-w-[96vw] flex-col overflow-hidden rounded-md border border-border bg-card text-card-foreground shadow-lg"
        :style="dropdownComputedStyle"
      >
        <div class="min-h-0 min-w-0 flex-1 overflow-y-auto p-4">
        <div class="space-y-4 pb-4 border-b border-border">
          <div id="tickets-presets-onboarding-anchor" data-onboarding="ticket-presets">
            <div class="flex items-center gap-1 mb-2">
              <PhBookmarkSimple :size="12" weight="regular" class="text-muted-foreground" />
              <span class="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Presets</span>
            </div>
            <div class="flex flex-col gap-2">
              <div class="relative w-full" ref="presetPickerRootRef">
                <button
                  :id="TICKETS_PRESET_DROPDOWN_TRIGGER_ID"
                  ref="presetDropdownTriggerRef"
                  type="button"
                  data-onboarding="ticket-presets-dropdown-trigger"
                  class="flex h-10 w-full items-center gap-2 rounded-md border border-input bg-background px-3 py-2 text-left text-sm ring-offset-background hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  @click.stop="isPresetPickerOpen = !isPresetPickerOpen"
                  :aria-expanded="isPresetPickerOpen"
                >
                  <span class="min-w-0 flex-1 truncate">{{ presetPickerTriggerLabel }}</span>
                  <PhCaretDown
                    :size="16"
                    weight="bold"
                    class="shrink-0 transition-transform text-muted-foreground"
                    :class="{ 'rotate-180': isPresetPickerOpen }"
                  />
                </button>
                <div
                  v-show="isPresetPickerOpen"
                  data-onboarding="ticket-presets-dropdown-panel"
                  class="absolute left-0 right-0 top-full z-[110] mt-1 rounded-md border border-border bg-popover py-1 shadow-md text-popover-foreground"
                  role="listbox"
                >
                  <template v-for="(preset, userPresetIdx) in presetsForDisplay.filter(p => (p.scope ?? (p.isSystemPreset ? 'system' : 'user')) === 'user')" :key="preset.id">
                    <div
                      role="option"
                      :aria-selected="selectedPresetId === preset.id"
                      class="flex w-full items-stretch gap-0 border-b border-border last:border-b-0 transition-colors hover:bg-accent"
                      :class="{ 'bg-accent': selectedPresetId === preset.id }"
                    >
                      <button
                        type="button"
                        class="flex min-w-0 flex-1 items-center gap-2 px-3 py-2 text-left text-sm"
                        @click="handlePresetMenuPick(preset)"
                      >
                        <PhStar
                          v-if="preset.isDefault"
                          :size="14"
                          weight="fill"
                          class="shrink-0 text-amber-500"
                        />
                        <span v-else class="w-[14px] shrink-0" aria-hidden="true" />
                        <span class="min-w-0 flex-1 truncate">{{ preset.name }}</span>
                      </button>
                      <span
                        class="flex shrink-0 items-center gap-0.5 border-l border-border py-1 pl-1 pr-2"
                        @click.stop
                      >
                        <button
                          v-if="canEditPreset(preset)"
                          type="button"
                          class="p-1 rounded hover:bg-accent text-muted-foreground hover:text-foreground"
                          title="Rename preset"
                          @click="openEditPresetDialog(preset)"
                        >
                          <PhPencil :size="14" weight="regular" />
                        </button>
                        <button
                          type="button"
                          class="p-1 rounded hover:bg-accent"
                          :title="preset.isDefault ? 'Favorite preset' : 'Mark as favorite'"
                          :data-onboarding="userPresetIdx === 0 ? 'ticket-preset-favorite' : undefined"
                          @click="setPresetDefault(preset.id)"
                        >
                          <PhStar :size="14" :weight="preset.isDefault ? 'fill' : 'regular'" class="text-amber-500" />
                        </button>
                        <button
                          v-if="canDeletePreset(preset)"
                          type="button"
                          class="p-1 rounded hover:bg-accent text-muted-foreground hover:text-red-500"
                          title="Delete preset"
                          @click="deletePreset(preset.id)"
                        >
                          <PhTrash :size="14" weight="regular" />
                        </button>
                      </span>
                    </div>
                  </template>
                  <div
                    v-if="presetsForDisplay.some(p => (p.scope ?? (p.isSystemPreset ? 'system' : 'user')) === 'company')"
                    class="px-3 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground border-t border-border"
                  >
                    Company
                  </div>
                  <template v-for="preset in presetsForDisplay.filter(p => (p.scope ?? (p.isSystemPreset ? 'system' : 'user')) === 'company')" :key="preset.id">
                    <div
                      role="option"
                      :aria-selected="selectedPresetId === preset.id"
                      class="flex w-full items-stretch gap-0 border-b border-border last:border-b-0 transition-colors hover:bg-accent"
                      :class="{ 'bg-accent': selectedPresetId === preset.id }"
                    >
                      <button
                        type="button"
                        class="flex min-w-0 flex-1 items-center gap-2 px-3 py-2 text-left text-sm"
                        @click="handlePresetMenuPick(preset)"
                      >
                        <PhStar
                          v-if="preset.isDefault"
                          :size="14"
                          weight="fill"
                          class="shrink-0 text-amber-500"
                        />
                        <span v-else class="w-[14px] shrink-0" aria-hidden="true" />
                        <span class="min-w-0 flex-1 truncate">{{ preset.name }}</span>
                      </button>
                      <span
                        class="flex shrink-0 items-center gap-0.5 border-l border-border py-1 pl-1 pr-2"
                        @click.stop
                      >
                        <button
                          v-if="canEditPreset(preset)"
                          type="button"
                          class="p-1 rounded hover:bg-accent text-muted-foreground hover:text-foreground"
                          title="Rename preset"
                          @click="openEditPresetDialog(preset)"
                        >
                          <PhPencil :size="14" weight="regular" />
                        </button>
                        <button
                          type="button"
                          class="p-1 rounded hover:bg-accent"
                          :title="preset.isDefault ? 'Favorite preset' : 'Mark as favorite'"
                          @click="setPresetDefault(preset.id)"
                        >
                          <PhStar :size="14" :weight="preset.isDefault ? 'fill' : 'regular'" class="text-amber-500" />
                        </button>
                        <button
                          v-if="canDeletePreset(preset)"
                          type="button"
                          class="p-1 rounded hover:bg-accent text-muted-foreground hover:text-red-500"
                          title="Delete preset"
                          @click="deletePreset(preset.id)"
                        >
                          <PhTrash :size="14" weight="regular" />
                        </button>
                      </span>
                    </div>
                  </template>
                  <div
                    v-if="presetsForDisplay.some(p => (p.scope ?? (p.isSystemPreset ? 'system' : 'user')) === 'system')"
                    class="px-3 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground border-t border-border"
                  >
                    System
                  </div>
                  <template v-for="preset in presetsForDisplay.filter(p => (p.scope ?? (p.isSystemPreset ? 'system' : 'user')) === 'system')" :key="preset.id">
                    <div
                      role="option"
                      :aria-selected="selectedPresetId === preset.id"
                      class="flex w-full items-stretch gap-0 border-b border-border last:border-b-0 transition-colors hover:bg-accent"
                      :class="{ 'bg-accent': selectedPresetId === preset.id }"
                    >
                      <button
                        type="button"
                        class="flex min-w-0 flex-1 items-center gap-2 px-3 py-2 text-left text-sm"
                        @click="handlePresetMenuPick(preset)"
                      >
                        <PhStar
                          v-if="preset.isDefault"
                          :size="14"
                          weight="fill"
                          class="shrink-0 text-amber-500"
                        />
                        <span v-else class="w-[14px] shrink-0" aria-hidden="true" />
                        <span class="min-w-0 flex-1 truncate">{{ preset.name }}</span>
                      </button>
                      <span
                        class="flex shrink-0 items-center gap-0.5 border-l border-border py-1 pl-1 pr-2"
                        @click.stop
                      >
                        <button
                          v-if="canEditPreset(preset)"
                          type="button"
                          class="p-1 rounded hover:bg-accent text-muted-foreground hover:text-foreground"
                          title="Rename preset"
                          @click="openEditPresetDialog(preset)"
                        >
                          <PhPencil :size="14" weight="regular" />
                        </button>
                        <button
                          type="button"
                          class="p-1 rounded hover:bg-accent"
                          :title="preset.isDefault ? 'Favorite preset' : 'Mark as favorite'"
                          @click="setPresetDefault(preset.id)"
                        >
                          <PhStar :size="14" :weight="preset.isDefault ? 'fill' : 'regular'" class="text-amber-500" />
                        </button>
                        <button
                          v-if="canDeletePreset(preset)"
                          type="button"
                          class="p-1 rounded hover:bg-accent text-muted-foreground hover:text-red-500"
                          title="Delete preset"
                          @click="deletePreset(preset.id)"
                        >
                          <PhTrash :size="14" weight="regular" />
                        </button>
                      </span>
                    </div>
                  </template>
                </div>
              </div>
              <div v-if="selectedPresetId || presetsForDisplay.length === 0" class="flex items-center justify-between gap-2">
                <span v-if="presetsForDisplay.length === 0" class="text-sm text-muted-foreground">No saved presets</span>
                <button
                  v-if="selectedPresetId"
                  type="button"
                  class="text-xs font-medium text-muted-foreground hover:underline inline-flex items-center gap-1"
                  @click="emit('clear-preset-selection')"
                >
                  <PhX :size="12" weight="regular" />
                  Clear selected preset
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Top controls: Display / Tab (Group By) / Sort By -->
        <div v-if="headerHasContent" class="space-y-4 pb-4 border-b border-border">
          <div class="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between sm:gap-4">
            <div
              v-if="visibleStyleOptions.length > 1"
              class="flex flex-col gap-2 text-xs font-medium text-muted-foreground sm:flex-row sm:items-center w-full min-w-0"
              data-keep-filters-open="true"
              data-onboarding="ticket-preset-display-inline"
            >
              <span class="hidden sm:inline">Display</span>
              <div class="inline-flex w-full sm:w-auto rounded-md border border-border bg-muted overflow-hidden">
                <button
                  v-for="style in visibleStyleOptions"
                  :key="style.value"
                  type="button"
                  @click="onStyleClick(style.value)"
                  :class="[
                    'flex min-w-0 flex-1 items-center justify-center px-3 py-1.5 text-xs sm:text-sm font-medium transition-colors',
                    effectiveStyle === style.value
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-background/60 dark:hover:bg-accent/40'
                  ]"
                >
                  <span class="inline-flex w-full items-center justify-center gap-1.5">
                    <component :is="getStyleIcon(style.value)" :size="14" weight="regular" class="shrink-0" />
                    <span>{{ style.label }}</span>
                  </span>
                </button>
              </div>
            </div>

            <!-- Tab (Group By) custom listbox (in-DOM so onboarding spotlight can include open panel) -->
            <div
              class="flex flex-col gap-1 text-xs text-muted-foreground w-full min-w-0 sm:w-48 sm:shrink-0"
              data-onboarding="ticket-tab-group-by"
            >
              <span class="font-medium">Tab (Group By)</span>
              <div class="relative w-full" ref="tabGroupPickerRootRef">
                <button
                  :id="TICKETS_TAB_GROUP_BY_TRIGGER_ID"
                  ref="tabGroupDropdownTriggerRef"
                  type="button"
                  data-onboarding="ticket-tab-group-by-trigger"
                  class="flex h-10 min-h-[44px] sm:min-h-[40px] w-full items-center gap-2 rounded-md border border-input bg-background px-3 py-2 text-left text-sm ring-offset-background hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  @click.stop="isTabGroupPickerOpen = !isTabGroupPickerOpen"
                  :aria-expanded="isTabGroupPickerOpen"
                  aria-haspopup="listbox"
                >
                  <span class="min-w-0 flex-1 truncate">{{ tabGroupPickerTriggerLabel }}</span>
                  <PhCaretDown
                    :size="16"
                    weight="bold"
                    class="shrink-0 transition-transform text-muted-foreground"
                    :class="{ 'rotate-180': isTabGroupPickerOpen }"
                  />
                </button>
                <div
                  v-show="isTabGroupPickerOpen"
                  data-onboarding="ticket-tab-group-by-panel"
                  class="absolute left-0 right-0 top-full z-[110] mt-1 max-h-[min(50dvh,16rem)] overflow-y-auto rounded-md border border-border bg-popover py-1 shadow-md text-popover-foreground"
                  role="listbox"
                >
                  <button
                    v-for="opt in tabGroupByMenuOptions"
                    :key="opt.value"
                    type="button"
                    role="option"
                    :aria-selected="tabGroupByValue === opt.value"
                    class="flex w-full px-3 py-2 text-left text-sm transition-colors hover:bg-accent"
                    :class="{ 'bg-accent': tabGroupByValue === opt.value }"
                    @click="pickTabGroupMenuOption(opt.value)"
                  >
                    {{ opt.label }}
                  </button>
                </div>
              </div>
            </div>

            <!-- Sort By -->
            <div class="flex flex-col gap-1 text-xs text-muted-foreground w-full min-w-0 sm:w-48 sm:shrink-0" data-onboarding="ticket-sort">
              <span class="font-medium">Sort By</span>
              <select
                data-onboarding="ticket-sort-select"
                :value="progressSortValue"
                @change="onProgressSortChange(($event.target as HTMLSelectElement).value)"
                class="flex h-10 min-h-[44px] sm:min-h-[40px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <option value="readyFirst">Ready first</option>
                <option value="readyLast">Ready last</option>
                <option value="timeUntilDueAsc">Time until due (urgent first)</option>
                <option value="overdueTimeDesc">Overdue time (most overdue first)</option>
                <option value="readyForDesc">Ready for (waiting longest)</option>
                <option value="timeSinceCheckInDesc">Time since check-in (longest first)</option>
                <option value="serviceCycleTimeDesc">Service cycle time (longest first)</option>
                <option value="ticketAgeDesc">Time in service (oldest first)</option>
                <option value="promisedTimeAsc">Promised time (earliest first)</option>
                <option value="promisedTimeDesc">Promised time (latest first)</option>
                <option v-if="canViewFinancial" value="gpPercentDesc">GP % (high to low)</option>
                <option v-if="canViewFinancial" value="gpPercentAsc">GP % (low to high)</option>
                <option v-if="canViewFinancial" value="totalDesc">Total (high to low)</option>
                <option v-if="canViewFinancial" value="totalAsc">Total (low to high)</option>
                <option value="technicianAsc">Technician (A-Z)</option>
                <option value="technicianDesc">Technician (Z-A)</option>
                <option value="salesrepAsc">Sales rep (A-Z)</option>
                <option value="salesrepDesc">Sales rep (Z-A)</option>
                <option value="bayAsc">Bay (A-Z)</option>
                <option value="bayDesc">Bay (Z-A)</option>
                <option value="viewedStatusViewedFirst">Viewed status (viewed first)</option>
                <option value="approvedStatusApprovedFirst">Approved status (approved first)</option>
                <option value="ticketNumberAsc">Ticket # ascending</option>
                <option value="ticketNumberDesc">Ticket # descending</option>
              </select>
            </div>
          </div>
        </div>

        <div class="space-y-4">
          <!-- Filters section -->
          <div>
            <div class="flex items-center gap-1 mb-1">
              <PhFunnel :size="12" weight="regular" class="text-muted-foreground" />
              <span class="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Filters
              </span>
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" data-onboarding="ticket-filters-grid">
              <!-- Primary 4 filters -->
              <div>
                <label class="block text-xs font-medium text-muted-foreground mb-1">Date</label>
                <select
                  :value="filters.dateRange"
                  @change="handleFilterChange('dateRange', ($event.target as HTMLSelectElement).value)"
                  class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  <option v-for="option in DATE_RANGE_OPTIONS" :key="option" :value="option">
                    {{ option }}
                  </option>
                </select>
              </div>
              <div>
                <label class="block text-xs font-medium text-muted-foreground mb-1">Ticket Type</label>
                <TicketTypePicker
                  :filters="filters"
                  full-width
                  @update:filters="(next) => emit('update:filters', next)"
                />
              </div>
              <div>
                <label class="block text-xs font-medium text-muted-foreground mb-1">Sales Rep</label>
                <select
                  :value="filters.salesrep || ''"
                  @change="handleFilterChange('salesrep', ($event.target as HTMLSelectElement).value || undefined)"
                  class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  <option value="">All Salesreps</option>
                  <option v-for="s in salesrepOptions" :key="s" :value="s">{{ s }}</option>
                </select>
              </div>
              <div>
                <label class="block text-xs font-medium text-muted-foreground mb-1">Technician</label>
                <select
                  :value="filters.technician || ''"
                  @change="handleFilterChange('technician', ($event.target as HTMLSelectElement).value || undefined)"
                  class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  <option value="">All Technicians</option>
                  <option v-for="t in technicianOptions" :key="t" :value="t">{{ t }}</option>
                </select>
              </div>

              <!-- Additional filters, only when expanded -->
              <template v-if="showMore">
                <div>
                  <label class="block text-xs font-medium text-muted-foreground mb-1">Vehicle Status</label>
                  <select
                    :value="displayVehicleStatus"
                    @change="handleVehicleStatusChange(($event.target as HTMLSelectElement).value)"
                    class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  >
                    <option value="">All Statuses</option>
                    <option v-for="status in VEHICLE_STATUSES" :key="status" :value="status">{{ status }}</option>
                  </select>
                </div>
                <div>
                  <label class="block text-xs font-medium text-muted-foreground mb-1">Back Order</label>
                  <select
                    :value="filters.backOrder ?? -1"
                    @change="handleFilterChange('backOrder', parseInt(($event.target as HTMLSelectElement).value))"
                    class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  >
                    <option :value="-1">All</option>
                    <option :value="0">Not BO</option>
                    <option :value="1">Yes BO</option>
                  </select>
                </div>
                <div>
                  <label class="block text-xs font-medium text-muted-foreground mb-1">Partial Fill</label>
                  <select
                    :value="filters.partialFill ?? -1"
                    @change="handleFilterChange('partialFill', parseInt(($event.target as HTMLSelectElement).value))"
                    class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  >
                    <option :value="-1">All</option>
                    <option :value="1">Yes</option>
                    <option :value="0">No</option>
                  </select>
                </div>
                <div>
                  <label class="block text-xs font-medium text-muted-foreground mb-1">National Account</label>
                  <select
                    :value="filters.natAcct ?? -1"
                    @change="handleFilterChange('natAcct', parseInt(($event.target as HTMLSelectElement).value))"
                    class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  >
                    <option :value="-1">All</option>
                    <option :value="0">No national acct</option>
                    <option :value="1">Yes national acct</option>
                  </select>
                </div>
                <div>
                  <label class="block text-xs font-medium text-muted-foreground mb-1">Print Status</label>
                  <select
                    :value="filters.printStatus ?? 0"
                    @change="handleFilterChange('printStatus', parseInt(($event.target as HTMLSelectElement).value))"
                    class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  >
                    <option :value="0">All</option>
                    <option :value="1">Printed</option>
                    <option :value="2">Not printed</option>
                  </select>
                </div>
                <div>
                  <label class="block text-xs font-medium text-muted-foreground mb-1">Route</label>
                  <select
                    :value="filters.routeNum || ''"
                    @change="handleFilterChange('routeNum', ($event.target as HTMLSelectElement).value || undefined)"
                    class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  >
                    <option value="">All Routes</option>
                    <option v-for="route in routeOptions" :key="route.id" :value="route.id">{{ route.name }}</option>
                  </select>
                </div>
              </template>
            </div>
          </div>
          <!-- Expand/collapse controls for extra filters -->
          <div class="flex justify-start pt-1">
            <button
              type="button"
              class="text-xs font-medium text-brand-accent hover:underline"
              @click="showMore = !showMore"
            >
              {{ showMore ? 'Show less filters' : 'Show more filters' }}
            </button>
          </div>
          <!-- Fields section -->
          <div v-if="$slots.tools" class="pt-3 border-t border-border mt-2" data-onboarding="ticket-preset-fields">
            <div class="flex flex-wrap items-center gap-3">
              <slot name="tools" />
            </div>
          </div>
        </div>
        </div>

        <div
          data-onboarding="ticket-filters-footer"
          class="flex shrink-0 flex-wrap items-center gap-2 border-t border-border bg-card px-4 pt-3 pb-4 shadow-[0_-4px_12px_-4px_rgba(15,23,42,0.08)] dark:shadow-[0_-4px_12px_-4px_rgba(0,0,0,0.35)] sm:shadow-none max-sm:pb-[max(1rem,env(safe-area-inset-bottom,0px))] max-sm:justify-start sm:justify-between"
        >
          <button
            v-if="props.tourEnabled"
            ref="tourMenuTriggerRef"
            type="button"
            class="flex h-9 w-9 items-center justify-center rounded-md border border-input bg-background text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            aria-haspopup="menu"
            :aria-expanded="tourMenuOpen"
            aria-label="Tickets tours and options"
            @click.stop="toggleTourMenu"
          >
            <PhInfo :size="16" weight="regular" aria-hidden="true" />
          </button>
          <div class="flex flex-wrap items-center gap-2 sm:ml-auto sm:justify-end">
            <Button variant="outline" size="sm" @click="clearFilters">Clear</Button>
            <Button
              variant="ink"
              size="sm"
              data-onboarding="ticket-save-preset"
              @click="handlePresetAction"
              :disabled="!canSaveOrUpdatePreset"
              class="disabled:opacity-100"
            >
              Save Preset
            </Button>
            <Button variant="brand" size="sm" @click="onApply">Apply</Button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>

  <Teleport to="body">
    <div
      v-if="props.tourEnabled && tourMenuOpen"
      ref="tourMenuPanelRef"
      role="menu"
      aria-label="Tickets tour options"
      data-keep-filters-open="true"
      class="fixed z-[120] min-w-[11.5rem] rounded-md border border-border bg-card py-1 text-sm shadow-md"
      :style="tourMenuStyle"
    >
      <div class="border-b border-border px-2 py-1.5">
        <ThemeToggle />
      </div>
      <button
        type="button"
        role="menuitem"
        class="flex w-full px-3 py-2 text-left text-foreground hover:bg-muted"
        @click="pickTour('quick')"
      >
        Quick Tour
      </button>
      <button
        type="button"
        role="menuitem"
        class="flex w-full px-3 py-2 text-left text-foreground hover:bg-muted"
        @click="pickTour('advanced')"
      >
        Advanced Tour
      </button>
      <button
        type="button"
        role="menuitem"
        class="flex w-full px-3 py-2 text-left text-foreground hover:bg-muted"
        @click="pickTour('preset')"
      >
        How to build a preset
      </button>
    </div>
  </Teleport>

  <!-- Save Preset Dialog -->
  <Dialog v-model="isSavePresetDialogOpen">
    <DialogContent class="max-w-sm">
      <DialogHeader>
        <DialogTitle>Save Filter Preset</DialogTitle>
      </DialogHeader>
      <div>
        <div>
          <label class="block text-sm font-medium text-foreground mb-2">Preset Name</label>
        </div>
        <div>
          <Input
            ref="savePresetNameInputRef"
            v-model="newPresetName"
            placeholder="e.g., My Daily View"
            class="w-full"
            @keyup.enter="savePresetFromDialog"
          />
        </div>
        <div class="h-8" aria-hidden="true"></div>
        <div v-if="props.saveScopeOptions.length > 0">
          <label class="block text-sm font-medium text-foreground mb-2">Save to</label>
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <button
              v-for="scope in props.saveScopeOptions"
              :key="scope"
              type="button"
              @click="savePresetToScope(scope)"
              class="h-11 rounded-md border border-brand-ink bg-brand-ink text-white text-sm font-medium transition-colors px-4 hover:opacity-90"
              :disabled="!newPresetName.trim()"
            >
              {{ scope === 'system' ? 'Default Presets' : scope === 'company' ? 'Company Presets' : 'My Presets' }}
            </button>
          </div>
        </div>
      </div>
      <div class="flex justify-end gap-2 mt-5">
        <Button
          v-if="canUpdateSelectedPreset"
          variant="brand"
          @click="updatePresetFromDialog"
        >
          Update Preset
        </Button>
        <Button variant="outline" @click="isSavePresetDialogOpen = false">Cancel</Button>
      </div>
    </DialogContent>
  </Dialog>

  <Dialog :model-value="isEditPresetDialogOpen" @update:model-value="(v) => !v && closeEditPresetDialog()">
    <DialogContent class="max-w-sm">
      <DialogHeader>
        <DialogTitle>Edit Preset</DialogTitle>
      </DialogHeader>
      <div class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-foreground mb-1">Preset Name</label>
          <Input
            v-model="editPresetName"
            placeholder="e.g., My Daily View"
            class="w-full"
            @keyup.enter="savePresetNameEdit"
          />
        </div>
      </div>
      <div class="flex justify-end gap-2 mt-4">
        <Button variant="outline" @click="closeEditPresetDialog">Cancel</Button>
        <Button
          variant="brand"
          @click="savePresetNameEdit"
          :disabled="!editPresetName.trim()"
        >
          Save
        </Button>
      </div>
    </DialogContent>
  </Dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted, onUnmounted, useSlots } from 'vue'
import Button from '@/components/ui/Button.vue'
import Badge from '@/components/ui/Badge.vue'
import Checkbox from '@/components/ui/Checkbox.vue'
import Dialog from '@/components/ui/Dialog.vue'
import DialogContent from '@/components/ui/DialogContent.vue'
import DialogHeader from '@/components/ui/DialogHeader.vue'
import DialogTitle from '@/components/ui/DialogTitle.vue'
import Input from '@/components/ui/Input.vue'
import ThemeToggle from '@/components/ui/ThemeToggle.vue'
import TicketTypePicker from '@/components/tickets/TicketTypePicker.vue'
import type { TicketFilters, TabulationDimension, TicketStyle, ProgressSortOption, FilterPreset, PresetScope } from '@/types/ticket'
import { DEFAULT_STYLE_PREFERENCES, DEFAULT_FILTERS } from '@/types/ticket'
import {
  runTicketsTourMenuAction,
  type TicketsTourMenuAction,
} from '@/composables/useTicketsTourMenu'
import {
  TICKETS_PRESET_DROPDOWN_TRIGGER_ID,
  TICKETS_TAB_GROUP_BY_TRIGGER_ID,
} from '@/lib/tickets-onboarding-step-defs'
import { clampPopoverLeft, getVisualViewportHeight } from '@/lib/popover-position'
import {
  PhFunnel,
  PhCaretDown,
  PhBookmarkSimple,
  PhPencil,
  PhInfo,
  PhStar,
  PhTrash,
  PhX,
  PhTable,
  PhSquaresFour,
  PhChartLine,
} from '@phosphor-icons/vue'

const TABULATE_BY_OPTIONS: { value: TabulationDimension; label: string }[] = [
  { value: 'vehicleStatus', label: 'Vehicle Status' },
  { value: 'ticketType', label: 'Ticket Type' },
  { value: 'technician', label: 'Technician' },
  { value: 'salesRep', label: 'Sales Rep' },
  { value: 'approvedStatus', label: 'Approved Status' },
  { value: 'viewedStatus', label: 'Viewed Status' },
  { value: 'overdueStatus', label: 'Overdue Status' },
  { value: 'inspectionStatus', label: 'Inspection Status' },
]

interface RouteOption {
  id: string
  name: string
}

interface Props {
  title?: string
  presets?: FilterPreset[]
  selectedPresetId?: string | number | null
  canUpdateSelectedPreset?: boolean
  filters: TicketFilters
  availableRoutes?: RouteOption[]
  availableSalesreps?: string[]
  availableTechnicians?: string[]
  /** 'inline' = collapsible below button; 'dropdown' = content in a dropdown panel */
  variant?: 'inline' | 'dropdown'
  /** Optional controlled open state for dropdown variant */
  open?: boolean
  /**
   * When true, mousedown outside the flyout does not close it (or nested preset/tab pickers).
   * Used during tickets onboarding so clicks on the tour dim pass through without collapsing filters.
   */
  suppressClickOutsideClose?: boolean
  /** Currently selected style for tickets view (v-model) */
  modelValue?: TicketStyle
  /** Explicit style, if parent prefers :current-style over v-model */
  currentStyle?: TicketStyle
  /** Optional subset/ordering of available styles */
  styleOptions?: { value: TicketStyle; label: string }[]
  /** Current progress sort option (used when style is progress) */
  progressSortBy?: ProgressSortOption
  /** When false (HDN2), hide GP%/total filters and sort options */
  canViewFinancial?: boolean
  saveScopeOptions?: PresetScope[]
  /** Controls whether ticket tour affordances are visible/enabled. */
  tourEnabled?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  title: 'Filters',
  presets: () => [],
  selectedPresetId: null,
  canUpdateSelectedPreset: false,
  availableRoutes: () => [],
  availableSalesreps: () => [],
  availableTechnicians: () => [],
  variant: 'inline',
  open: undefined,
  suppressClickOutsideClose: false,
  modelValue: undefined,
  currentStyle: undefined,
  styleOptions: () => [],
  progressSortBy: 'readyFirst',
  canViewFinancial: true,
  saveScopeOptions: () => ['user'] as PresetScope[],
  tourEnabled: true,
})

const emit = defineEmits<{
  'update:filters': [filters: TicketFilters]
  apply: []
  clear: []
  'update:open': [open: boolean]
  'update:modelValue': [style: TicketStyle]
  'update:progressSortBy': [value: ProgressSortOption]
  'save-preset': [name: string, filters: TicketFilters, isDefault: boolean, scope: PresetScope]
  'update-selected-preset': []
  'select-preset': [preset: FilterPreset]
  'delete-preset': [presetId: string | number]
  'set-default-preset': [presetId: string | number]
  'rename-preset': [payload: { presetId: string | number; name: string }]
  'clear-preset-selection': []
  /** Fires after the teleported dropdown position/size is applied (for tour anchoring). */
  'flyout-layout': []
}>()

const VEHICLE_STATUSES = [
  "Not Started",
  "Online Appointment",
  "Not Here Yet",
  "Check In",
  "On Lot",
  "In Shop",
  "Inspection Complete",
  "Awaiting Callback",
  "Awaiting Parts",
  "Out For Sublet",
  "Ready",
] as const

const DATE_RANGE_OPTIONS = [
  'Today',
  'Yesterday',
  'Tomorrow',
  'This Week',
  'Last Week',
  'This Month',
  'Last Month',
  'This Quarter',
  'Last Quarter',
  'This Year',
  'Last Year',
  'Custom Date Range',
] as const

const DEFAULT_STYLE_OPTIONS: { value: TicketStyle; label: string }[] = [
  { value: 'table', label: 'Table' },
  { value: 'card', label: 'Cards' },
  { value: 'progress', label: 'Progress' },
]

const STYLE_ICON_MAP: Record<TicketStyle, any> = {
  table: PhTable,
  card: PhSquaresFour,
  progress: PhChartLine,
}

const containerRef = ref<HTMLElement | null>(null)
const dropdownRef = ref<HTMLElement | null>(null)
const presetPickerRootRef = ref<HTMLElement | null>(null)
const presetDropdownTriggerRef = ref<HTMLButtonElement | null>(null)
const tabGroupPickerRootRef = ref<HTMLElement | null>(null)
const tabGroupDropdownTriggerRef = ref<HTMLButtonElement | null>(null)
const isPresetPickerOpen = ref(false)
const isTabGroupPickerOpen = ref(false)
const isOpen = ref(false)
const tourMenuTriggerRef = ref<HTMLElement | null>(null)
const tourMenuPanelRef = ref<HTMLElement | null>(null)
const tourMenuOpen = ref(false)
const tourMenuStyle = ref({ top: '0px', left: '0px' })
const dropdownStyle = ref<{ top: string; left: string; transform?: string; maxHeight?: string }>({ top: '0px', left: '0px' })
/** Position + max height; outer panel uses flex + inner scroll so footer actions stay visible on mobile. */
const dropdownComputedStyle = computed(() => ({
  ...dropdownStyle.value,
  maxHeight: dropdownStyle.value.maxHeight ?? 'calc(100dvh - 4rem)',
}))
const showMore = ref(false)

// Save preset dialog state
const isSavePresetDialogOpen = ref(false)
const savePresetNameInputRef = ref<InstanceType<typeof Input> | HTMLElement | null>(null)
const newPresetName = ref('')
const newPresetIsDefault = ref(false)
const newPresetScope = ref<PresetScope>('user')
const isEditPresetDialogOpen = ref(false)
const editPresetId = ref<string | null>(null)
const editPresetName = ref('')

const visibleStyleOptions = computed(() => {
  return props.styleOptions && props.styleOptions.length > 0
    ? props.styleOptions
    : DEFAULT_STYLE_OPTIONS
})

const effectiveStyle = computed<TicketStyle>(() => {
  return (
    (props.currentStyle as TicketStyle | undefined) ??
    (props.modelValue as TicketStyle | undefined) ??
    DEFAULT_STYLE_PREFERENCES.defaultStyle
  )
})

const slots = useSlots()

const headerHasContent = computed(() => {
  return visibleStyleOptions.value.length > 1 || !!slots.tools
})

const tabGroupByValue = computed(() => props.filters.tabulateBy ?? 'none')

const tabGroupByMenuOptions = computed(() => [
  { value: 'none' as const, label: 'None' },
  ...TABULATE_BY_OPTIONS.map((o) => ({ value: o.value, label: o.label })),
])

const tabGroupPickerTriggerLabel = computed(() => {
  const v = tabGroupByValue.value
  if (v === 'none') return 'None'
  return TABULATE_BY_OPTIONS.find((o) => o.value === v)?.label ?? v
})

const progressSortValue = computed<ProgressSortOption>(() => {
  return (props.progressSortBy as ProgressSortOption | undefined) ?? 'readyFirst'
})

const wrapperClass = computed(() =>
  props.variant === 'dropdown'
    ? 'relative'
    : 'border-t border-border'
)

const triggerClass = computed(() =>
  props.variant === 'dropdown'
    ? 'flex w-full min-w-0 max-w-full sm:w-[170px] sm:min-w-[170px] sm:max-w-[170px] items-center gap-2 h-9 px-3 rounded-md border border-input bg-background text-sm font-medium text-foreground hover:bg-accent transition-colors'
    : 'w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-foreground hover:bg-accent transition-colors'
)

function setOpen(value: boolean) {
  if (props.open !== undefined) {
    emit('update:open', value)
  } else {
    isOpen.value = value
  }
}

function toggleOpen() {
  setOpen(!isOpen.value)
  if (props.variant === 'dropdown' && isOpen.value) {
    updateDropdownPosition()
  }
}

function updateDropdownPosition() {
  if (containerRef.value) {
    const rect = containerRef.value.getBoundingClientRect()
    const topPx = rect.bottom + 8
    const bottomGap = 16
    const maxHeightPx = Math.max(200, getVisualViewportHeight() - topPx - bottomGap)
    const estimatedWidth = dropdownRef.value?.getBoundingClientRect().width ?? Math.min(672, window.innerWidth * 0.96)
    dropdownStyle.value = {
      top: `${topPx}px`,
      left: `${clampPopoverLeft(rect.left, estimatedWidth)}px`,
      maxHeight: `${maxHeightPx}px`
    }
  }
}

function onApply() {
  emit('apply')
  if (props.variant === 'dropdown') {
    setOpen(false)
  }
}

function onStyleClick(style: TicketStyle) {
  if (style === effectiveStyle.value) return
  emit('update:modelValue', style)
}

function getStyleIcon(style: TicketStyle) {
  return STYLE_ICON_MAP[style]
}

function onTabGroupByChange(value: string) {
  if (value === 'none') {
    emit('update:filters', { ...props.filters, tabulateBy: undefined })
    return
  }
  emit('update:filters', { ...props.filters, tabulateBy: value as TabulationDimension })
}

function pickTabGroupMenuOption(value: string) {
  isTabGroupPickerOpen.value = false
  onTabGroupByChange(value)
}

function onProgressSortChange(value: string) {
  emit('update:progressSortBy', value as ProgressSortOption)
}

function updateTourMenuPosition() {
  if (!tourMenuTriggerRef.value || typeof window === 'undefined') return
  const rect = tourMenuTriggerRef.value.getBoundingClientRect()
  const viewportPadding = 8
  const menuGap = 4
  const menuWidth = 184
  const measuredMenuHeight = tourMenuPanelRef.value?.getBoundingClientRect().height
  const menuHeight = measuredMenuHeight && Number.isFinite(measuredMenuHeight)
    ? measuredMenuHeight
    : 172
  const left = Math.min(
    Math.max(viewportPadding, rect.left),
    Math.max(viewportPadding, window.innerWidth - menuWidth - viewportPadding)
  )
  const topIfBelow = rect.bottom + menuGap
  const topIfAbove = rect.top - menuHeight - menuGap
  const maxTop = Math.max(viewportPadding, window.innerHeight - menuHeight - viewportPadding)
  const top = (
    topIfBelow + menuHeight > window.innerHeight - viewportPadding &&
    topIfAbove >= viewportPadding
  )
    ? topIfAbove
    : Math.min(Math.max(viewportPadding, topIfBelow), maxTop)
  tourMenuStyle.value = {
    top: `${top}px`,
    left: `${left}px`,
  }
}

function toggleTourMenu() {
  if (!props.tourEnabled) return
  tourMenuOpen.value = !tourMenuOpen.value
}

function closeTourMenu() {
  tourMenuOpen.value = false
}

async function pickTour(kind: TicketsTourMenuAction) {
  closeTourMenu()
  await nextTick()
  runTicketsTourMenuAction(kind)
}

const canSavePreset = computed(() => {
  const defaultStyle = DEFAULT_STYLE_PREFERENCES.defaultStyle
  return activeFilterCount.value > 0 || effectiveStyle.value !== defaultStyle
})

const canSaveOrUpdatePreset = computed(() => {
  if (props.canUpdateSelectedPreset) return true
  return canSavePreset.value
})

const presetsForDisplay = computed(() => {
  const list = [...props.presets]
  const scopeOrder: Record<PresetScope, number> = { user: 1, company: 2, system: 3 }
  list.sort((a, b) => {
    const aScope = (a.scope ?? (a.isSystemPreset ? 'system' : 'user')) as PresetScope
    const bScope = (b.scope ?? (b.isSystemPreset ? 'system' : 'user')) as PresetScope
    if (scopeOrder[aScope] !== scopeOrder[bScope]) return scopeOrder[aScope] - scopeOrder[bScope]
    return a.name.localeCompare(b.name)
  })
  return list
})

function canEditPreset(preset: FilterPreset): boolean {
  return preset.ownerCanEdit !== false
}

function canDeletePreset(preset: FilterPreset): boolean {
  return preset.ownerCanDelete !== false
}

/** True when the active preset is marked as default / favorite. */
const selectedPresetIsFavorite = computed(() => {
  if (!props.selectedPresetId) return false
  const preset = props.presets.find((p) => p.id === props.selectedPresetId)
  return !!preset?.isDefault
})
const selectedPresetForAction = computed(() => {
  if (!props.selectedPresetId) return null
  return props.presets.find((p) => p.id === props.selectedPresetId) ?? null
})

const presetPickerTriggerLabel = computed(() => {
  if (!props.selectedPresetId) return 'No preset selected'
  const preset = presetsForDisplay.value.find((p) => p.id === props.selectedPresetId)
  if (!preset) return 'No preset selected'
  return preset.isDefault ? `★ ${preset.name}` : preset.name
})

function openSavePresetDialog() {
  if (!canSaveOrUpdatePreset.value) return
  newPresetName.value = selectedPresetForAction.value?.name ?? ''
  newPresetIsDefault.value = false
  newPresetScope.value = props.saveScopeOptions[0] ?? 'user'
  isSavePresetDialogOpen.value = true
}

function handlePresetAction() {
  openSavePresetDialog()
}

function updatePresetFromDialog() {
  if (!props.canUpdateSelectedPreset) return
  emit('update-selected-preset')
  isSavePresetDialogOpen.value = false
}

function savePresetFromDialog() {
  if (!newPresetName.value.trim()) return
  const trimmedName = newPresetName.value.trim()
  newPresetName.value = trimmedName
  emit('save-preset', trimmedName, { ...props.filters }, newPresetIsDefault.value, newPresetScope.value)
  newPresetIsDefault.value = false
  newPresetScope.value = props.saveScopeOptions[0] ?? 'user'
  void focusSavePresetNameInput(true)
}

function savePresetToScope(scope: PresetScope) {
  if (!newPresetName.value.trim()) return
  if (!props.saveScopeOptions.includes(scope)) return
  newPresetScope.value = scope
  savePresetFromDialog()
}

async function focusSavePresetNameInput(selectText = false) {
  await nextTick()

  const hostEl = savePresetNameInputRef.value as any
  const inputEl: HTMLInputElement | null =
    hostEl instanceof HTMLInputElement
      ? hostEl
      : hostEl?.$el?.querySelector?.('input') ?? hostEl?.querySelector?.('input') ?? null

  if (!inputEl) return
  inputEl.focus()
  if (selectText) {
    inputEl.select()
  }
}

function selectPreset(preset: FilterPreset) {
  emit('select-preset', preset)
}

function handlePresetMenuPick(preset: FilterPreset | null) {
  isPresetPickerOpen.value = false
  if (!preset) {
    emit('clear-preset-selection')
    return
  }
  selectPreset(preset)
}

function deletePreset(presetId: string | number) {
  emit('delete-preset', presetId)
}

function setPresetDefault(presetId: string | number) {
  emit('set-default-preset', presetId)
}

function openEditPresetDialog(preset: FilterPreset) {
  editPresetId.value = preset.id
  editPresetName.value = preset.name
  isEditPresetDialogOpen.value = true
}

function closeEditPresetDialog() {
  isEditPresetDialogOpen.value = false
  editPresetId.value = null
  editPresetName.value = ''
}

function savePresetNameEdit() {
  if (!editPresetId.value || !editPresetName.value.trim()) return
  emit('rename-preset', {
    presetId: editPresetId.value,
    name: editPresetName.value.trim(),
  })
  closeEditPresetDialog()
}

watch(isOpen, async (open) => {
  if (open && props.variant === 'dropdown') {
    await nextTick()
    updateDropdownPosition()
    await nextTick()
    emit('flyout-layout')
    // Post-paint remeasure (same idea as Floating UI `autoUpdate`): Teleport + `transform` apply after the frame.
    requestAnimationFrame(() => {
      emit('flyout-layout')
    })
  } else if (!open) {
    isPresetPickerOpen.value = false
    isTabGroupPickerOpen.value = false
    closeTourMenu()
  }
})

watch(tourMenuOpen, (open) => {
  if (!open) return
  void nextTick(() => updateTourMenuPosition())
})

watch(
  () => props.tourEnabled,
  (enabled) => {
    if (enabled) return
    closeTourMenu()
  },
)

watch(
  () => props.open,
  (val) => {
    if (val !== undefined) {
      isOpen.value = !!val
    }
  },
  { immediate: true }
)

watch(isSavePresetDialogOpen, async (open) => {
  if (!open) return
  await focusSavePresetNameInput(!!newPresetName.value)
})

onMounted(() => {
  const handleClickOutside = (event: MouseEvent) => {
    // Dialogs are teleported outside the filter container; while open, ignore
    // outside-click logic so Cancel doesn't collapse the filters panel.
    if (isSavePresetDialogOpen.value || isEditPresetDialogOpen.value) return
    if (props.suppressClickOutsideClose) return
    const target = event.target as HTMLElement | null

    if (
      tourMenuOpen.value &&
      target &&
      !tourMenuTriggerRef.value?.contains(target) &&
      !tourMenuPanelRef.value?.contains(target)
    ) {
      closeTourMenu()
    }

    // Tour panel is teleported to `body` and is outside preset/tab picker roots.
    // Must run before nested picker closing, or mousedown toggles `isPresetPickerOpen` and
    // can swallow the subsequent click on tour controls (e.g. Advanced tour step 16/16 Back).
    if (target && target.closest('[data-tickets-onboarding-tour="true"]')) {
      return
    }

    if (isOpen.value) {
      if (
        isPresetPickerOpen.value &&
        presetPickerRootRef.value &&
        target &&
        !presetPickerRootRef.value.contains(target)
      ) {
        isPresetPickerOpen.value = false
      }

      if (
        isTabGroupPickerOpen.value &&
        tabGroupPickerRootRef.value &&
        target &&
        !tabGroupPickerRootRef.value.contains(target)
      ) {
        isTabGroupPickerOpen.value = false
      }
    }

    if (!isOpen.value || props.variant !== 'dropdown') return

    // Allow certain controls (e.g. view mode toggle) to keep filters open
    if (target && target.closest('[data-keep-filters-open="true"]')) {
      return
    }

    if (containerRef.value && !containerRef.value.contains(target as Node) &&
        dropdownRef.value && !dropdownRef.value.contains(target as Node)) {
      setOpen(false)
    }
  }
  const handleResize = () => {
    if (tourMenuOpen.value) updateTourMenuPosition()
  }
  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Escape' && tourMenuOpen.value) {
      event.preventDefault()
      closeTourMenu()
    }
  }
  document.addEventListener('mousedown', handleClickOutside)
  window.addEventListener('resize', handleResize)
  document.addEventListener('keydown', handleKeyDown)
  onUnmounted(() => {
    document.removeEventListener('mousedown', handleClickOutside)
    window.removeEventListener('resize', handleResize)
    document.removeEventListener('keydown', handleKeyDown)
  })
})

// Single source of truth for Vehicle Status dropdown: '' = All Statuses, otherwise the status string
const displayVehicleStatus = computed(() => {
  const s = props.filters.status
  if (!s || s === 'All Statuses') return ''
  return s
})

// Option lists that include current filter value so the dropdown always shows the selected value
const salesrepOptions = computed(() => {
  const list = [...props.availableSalesreps]
  const current = props.filters.salesrep?.trim()
  if (current && !list.includes(current)) list.unshift(current)
  return list
})

const technicianOptions = computed(() => {
  const list = [...props.availableTechnicians]
  const current = props.filters.technician?.trim()
  if (current && !list.includes(current)) list.unshift(current)
  return list
})

const routeOptions = computed((): RouteOption[] => {
  const list = [...props.availableRoutes]
  const current = props.filters.routeNum
  if (current && !list.some((r) => r.id === current)) {
    list.unshift({ id: current, name: `Route ${current}` })
  }
  return list
})

const activeFilterCount = computed(() => {
  let count = 0

  // Basic filters
  if (props.filters.dateRange && props.filters.dateRange !== DEFAULT_FILTERS.dateRange) count++
  if (props.filters.customFromDate) count++
  if (props.filters.customToDate) count++
  if (props.filters.ticketNumber) count++
  if (props.filters.search) count++
  if (props.filters.tabulateBy) count++

  // Ticket types (only count if not all are the same as default)
  const hasTypeFilter =
    props.filters.quote ||
    props.filters.batch ||
    props.filters.invoice !== DEFAULT_FILTERS.invoice ||
    props.filters.workorder !== DEFAULT_FILTERS.workorder
  if (hasTypeFilter) count++

  // Advanced / response filters
  if (props.filters.salesrep) count++
  if (props.filters.technician) count++
  if (displayVehicleStatus.value) count++
  if (props.filters.routeNum) count++
  if (props.filters.partialFill !== undefined && props.filters.partialFill !== -1) count++
  if (props.filters.backOrder !== undefined && props.filters.backOrder !== -1) count++
  if (props.filters.natAcct !== undefined && props.filters.natAcct !== -1) count++
  if (props.filters.printStatus !== undefined && props.filters.printStatus !== 0) count++
  if (props.filters.onlyOverdue) count++
  if (props.filters.readyForAtLeastMinutes != null) count++
  if (props.filters.timeInServiceAtLeastMinutes != null) count++
  if (props.filters.timeSinceCheckInAtLeastMinutes != null) count++
  if (props.filters.serviceCycleTimeAtLeastMinutes != null) count++
  if (props.filters.inspectionCompletionAtLeastMinutes != null) count++
  if (props.filters.gpPercentMin != null) count++
  if (props.filters.gpPercentMax != null) count++

  return count
})

function handleFilterChange(key: keyof TicketFilters, value: any) {
  const newFilters = { ...props.filters, [key]: value }
  emit('update:filters', newFilters)
}

function handleVehicleStatusChange(value: string) {
  const status = (value && value.trim()) ? value.trim() : undefined
  emit('update:filters', { ...props.filters, status })
}

function clearFilters() {
  // Reset to true defaults so the badge/count reflects "no filters applied".
  // Keep this aligned with how `activeFilterCount` determines "active".
  emit('update:filters', {
    ...DEFAULT_FILTERS,
    // Explicitly clear optional fields that might be lingering (e.g. from a preset).
    customFromDate: undefined,
    customToDate: undefined,
    ticketNumber: undefined,
    status: undefined,
    search: undefined,
    salesrep: undefined,
    technician: undefined,
    storeNum: undefined,
    routeNum: undefined,
    partialFill: undefined,
    backOrder: undefined,
    natAcct: undefined,
    printStatus: undefined,
    onlyOverdue: undefined,
    readyForAtLeastMinutes: undefined,
    timeInServiceAtLeastMinutes: undefined,
    timeSinceCheckInAtLeastMinutes: undefined,
    serviceCycleTimeAtLeastMinutes: undefined,
    inspectionCompletionAtLeastMinutes: undefined,
    gpPercentMin: undefined,
    gpPercentMax: undefined,
  })
  emit('clear')
}

function openPresetPickerForTour() {
  isPresetPickerOpen.value = true
}

function closePresetPickerForTour() {
  isPresetPickerOpen.value = false
}

function openTabGroupSelectForTour() {
  isTabGroupPickerOpen.value = true
}

function closeTabGroupSelectForTour() {
  isTabGroupPickerOpen.value = false
}

function getOnboardingFlyoutRoot(): HTMLElement | null {
  return dropdownRef.value
}

function getOnboardingPresetsAnchor(): HTMLElement | null {
  return (
    dropdownRef.value?.querySelector('#tickets-presets-onboarding-anchor') ?? null
  )
}

function getOnboardingPresetTrigger(): HTMLButtonElement | null {
  return presetDropdownTriggerRef.value
}

defineExpose({
  openPresetPickerForTour,
  closePresetPickerForTour,
  openTabGroupSelectForTour,
  closeTabGroupSelectForTour,
  getOnboardingFlyoutRoot,
  getOnboardingPresetsAnchor,
  getOnboardingPresetTrigger,
})
</script>
