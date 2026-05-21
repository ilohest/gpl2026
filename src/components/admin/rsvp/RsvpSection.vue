<!-- src/components/admin/rsvp/RsvpSection.vue -->
<template>
  <div v-if="showSkeleton" class="flex flex-col gap-4">
    <div class="grid md:grid-cols-3 gap-4">
      <Card
        class="md:col-span-2"
        :style="{ border: '1px solid var(--accent-color)' }"
      >
        <template #title>
          <Skeleton width="12rem" height="1rem" />
        </template>
        <template #content>
          <div class="admin-rsvp-layout">
            <div class="admin-rsvp-layout__left">
              <Skeleton width="6rem" height="2.5rem" class="mb-2" />
              <Skeleton width="10rem" height="0.9rem" class="mb-4" />
              <div class="admin-rsvp-metrics">
                <Skeleton width="100%" height="3.25rem" />
                <Skeleton width="100%" height="3.25rem" />
                <Skeleton width="100%" height="3.25rem" />
              </div>
            </div>
            <div class="admin-rsvp-layout__right">
              <Skeleton width="10rem" height="10rem" border-radius="999px" />
            </div>
          </div>
        </template>
      </Card>

      <Card
        class="md:col-span-1"
        :style="{ border: '1px solid var(--accent-color)' }"
      >
        <template #title>
          <Skeleton width="10rem" height="1rem" />
        </template>
        <template #content>
          <Skeleton width="6rem" height="2.5rem" class="mb-2" />
          <Skeleton width="10rem" height="0.9rem" class="mb-4" />
          <Skeleton width="100%" height="3.25rem" />
        </template>
      </Card>
    </div>

    <Card :style="{ border: '1px solid var(--accent-color)' }">
      <template #content>
        <Skeleton width="10rem" height="1rem" class="mb-3" />
        <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Skeleton width="100%" height="6rem" />
          <Skeleton width="100%" height="6rem" />
          <Skeleton width="100%" height="6rem" />
        </div>
        <Skeleton width="100%" height="14rem" class="mt-4" />
      </template>
    </Card>
  </div>

  <div v-else class="flex flex-col gap-4">
    <div class="grid md:grid-cols-3 gap-4">
      <!-- PRESENT PEOPLE + ATTENDANCE RATE -->
      <Card
        class="md:col-span-2"
        :style="{ border: '1px solid var(--accent-color)' }"
      >
        <template #title>
          <div class="flex items-center justify-between gap-2">
            <p class="admin-bento-title">
              <i class="pi pi-users text-sm" aria-hidden="true" />
              {{ t("admin.stats.total_people") }}
            </p>
            <i
              class="pi pi-info-circle text-xs opacity-60"
              v-tooltip.top="
                t(
                  'admin.stats.couple_included_tooltip',
                  'Incluye a los novios / Includes the bride and groom',
                )
              "
            />
          </div>
        </template>

        <template #content>
          <div class="admin-rsvp-layout">
            <div class="admin-rsvp-layout__left">
              <p class="admin-rsvp-total">
                {{ totalPeople }}
              </p>
              <p class="admin-rsvp-total-label">
                {{ t("admin.stats.total_people") }}
              </p>

              <div class="admin-rsvp-metrics">
                <div class="admin-rsvp-metric">
                  <span class="admin-rsvp-metric__label">{{
                    t("admin.stats.total_people_main")
                  }}</span>
                  <strong class="admin-rsvp-metric__value">{{
                    mainGuestsCount
                  }}</strong>
                </div>
                <div class="admin-rsvp-metric">
                  <span class="admin-rsvp-metric__label">{{
                    t("admin.stats.total_people_plusone")
                  }}</span>
                  <strong class="admin-rsvp-metric__value">{{
                    totalPlusOnes
                  }}</strong>
                </div>
                <div class="admin-rsvp-metric">
                  <span class="admin-rsvp-metric__label">{{
                    t("admin.stats.total_children")
                  }}</span>
                  <strong class="admin-rsvp-metric__value">{{
                    totalChildrenPresent
                  }}</strong>
                </div>
              </div>
            </div>

            <div class="admin-rsvp-layout__right">
              <div class="admin-rsvp-donut-wrap">
                <div class="admin-rsvp-donut" :style="peopleYesNoDonutStyle">
                  <span>{{ peopleYesRate }}%</span>
                </div>
                <div class="admin-rsvp-donut-legend">
                  <p>
                    <span class="dot dot-ok"></span>
                    {{ t("common.yes") }} · {{ peopleYesCount }}
                  </p>
                  <p>
                    <span class="dot dot-no"></span>
                    {{ t("common.no") }} · {{ peopleNoCount }}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </template>
      </Card>

      <!-- RSVP DEADLINE -->
      <Card
        class="md:col-span-1"
        :style="{ border: '1px solid var(--accent-color)' }"
      >
        <template #title>
          <div class="flex items-start justify-start">
            <p class="admin-bento-title">
              <i class="pi pi-calendar-clock text-sm" aria-hidden="true" />
              {{ t("admin.stats.rsvp_deadline_title") }}
            </p>
          </div>
        </template>

        <template #content>
          <div class="flex flex-col gap-2">
            <p class="admin-kpi-value">{{ daysUntilDeadlineDisplay }}</p>
            <p class="admin-kpi-label">
              {{ t("admin.stats.rsvp_days_left") }}
            </p>

            <div class="mt-1">
              <div class="admin-rsvp-metric admin-rsvp-metric--boxed">
                <span class="admin-rsvp-metric__label">{{
                  t("admin.stats.rsvp_deadline_date")
                }}</span>
                <strong class="admin-rsvp-metric__value">{{
                  rsvpDeadlineLabel
                }}</strong>
              </div>
            </div>
          </div>
        </template>
      </Card>
    </div>

    <div class="grid md:grid-cols-3 gap-4">
      <!-- RESTRICTIONS -->
      <Card
        class="h-full"
        :style="{ border: '1px solid var(--accent-color)' }"
        :pt="{
          root: { class: 'h-full flex flex-col' },
          body: { class: 'flex-1 flex flex-col' },
          content: { class: 'flex-1 flex flex-col' },
        }"
      >
        <template #title>
          <div class="flex items-center justify-between gap-2">
            <p class="admin-bento-title">
              <i
                class="pi pi-exclamation-triangle text-sm"
                aria-hidden="true"
              />
              {{ t("admin.responses.total_diet_yes") }}
            </p>
            <Button
              v-if="!showDietHelp"
              size="small"
              text
              rounded
              icon="pi pi-info-circle"
              severity="secondary"
              class="p-0"
              aria-label="Help"
              @click="showDietHelp = true"
            />
          </div>
        </template>

        <template #content>
          <div class="flex flex-1 flex-col">
            <!-- Total personnes présentes avec AU MOINS une restriction -->
            <p class="admin-kpi-value">
              {{ dietYesAmongAttendees }}
            </p>
            <p class="admin-kpi-label mt-1">
              {{
                t(
                  "admin.stats.diet_hint",
                  "Personnes présentes ayant déclaré au moins une restriction",
                )
              }}
            </p>

            <!-- Détail par menu (uniquement invités présents) -->
            <ul v-if="menuBreakdown.length" class="mt-3 space-y-1 text-sm">
              <li
                v-for="item in menuBreakdown"
                :key="item.key"
                class="flex justify-between items-start gap-[0.55rem] p-[0.35rem] px-[0.45rem] rounded-[0.6rem] bg-[var(--surface-soft)]"
              >
                <span class="inline-flex items-center gap-2">
                  <i
                    v-if="item.isUnassigned"
                    class="pi pi-exclamation-triangle text-xs text-amber-700"
                  />
                  <span>{{ item.label }}</span>
                </span>

                <span class="text-xl font-normal leading-[1.1]">{{
                  item.count
                }}</span>
              </li>
            </ul>

            <ContentViewer
              v-else
              class="mt-3 text-sm opacity-60"
              :empty-text="
                t(
                  'admin.menus.none_assigned',
                  'Aucun menu attribué pour l’instant.',
                )
              "
            />

            <Message
              v-if="showDietHelp"
              severity="info"
              :closable="true"
              class="mt-3"
              @close="showDietHelp = false"
            >
              <div class="text-xs text-left">
                {{
                  t(
                    "admin.stats.diet_menu_auto_hint",
                    "Puedes crear menús según las restricciones alimentarias, y las asignaciones se hacen automáticamente para los invitados presentes según sus necesidades.",
                  )
                }}
              </div>
            </Message>

            <Can module="menus_seating" mode="write">
              <div class="mt-auto pt-3 flex gap-2">
                <Button
                  size="small"
                  class="w-full text-sm btn-accent"
                  icon="pi pi-sliders-h"
                  :label="t('admin.menus.manage_button')"
                  @click="openMenusSection"
                />
              </div>
            </Can>
          </div>
        </template>
      </Card>

      <div class="h-full flex flex-col gap-4">
        <!-- WEDDING PARTS -->
        <Card :style="{ border: '1px solid var(--accent-color)' }">
          <template #title>
            <div class="flex items-start justify-start">
              <p class="admin-bento-title">
                <i class="pi pi-calendar text-sm" aria-hidden="true" />
                {{ t("admin.responses.wedding_event_parts") }}
              </p>
            </div>
          </template>

          <template #content>
            <ul class="space-y-1 text-sm">
              <li
                v-for="item in weddingPartsBreakdown"
                :key="item.key"
                class="flex justify-between items-start gap-[0.55rem] p-[0.35rem] px-[0.45rem] rounded-[0.6rem] bg-[var(--surface-soft)]"
              >
                <span>{{ item.label }}</span>
                <span class="text-xl font-normal leading-[1.1]">{{
                  item.count
                }}</span>
              </li>
            </ul>
          </template>
        </Card>

        <!-- TRANSPORT -->
        <Card :style="{ border: '1px solid var(--accent-color)' }">
          <template #title>
            <div class="flex items-start justify-start">
              <p class="admin-bento-title">
                <i class="pi pi-truck text-sm" aria-hidden="true" />
                {{ t("admin.responses.total_transport") }}
              </p>
            </div>
          </template>

          <template #content>
            <p class="admin-kpi-value">
              {{ rsvpStore.totals.transport }}
            </p>
            <p class="admin-kpi-label mt-1">
              {{
                t(
                  "admin.stats.transport_hint",
                  "Places de transport à prévoir (invités + accompagnants)",
                )
              }}
            </p>
          </template>
        </Card>
      </div>

      <!-- SONGS -->
      <Card
        class="h-full"
        :style="{ border: '1px solid var(--accent-color)' }"
        :pt="{
          root: { class: 'h-full flex flex-col' },
          body: { class: 'flex-1 flex flex-col' },
          content: { class: 'flex-1 flex flex-col' },
        }"
      >
        <template #title>
          <div class="flex items-start justify-start">
            <p class="admin-bento-title">
              <i class="pi pi-volume-up text-sm" aria-hidden="true" />
              {{ t("admin.stats.songs_title") }}
            </p>
          </div>
        </template>

        <template #content>
          <p class="admin-kpi-value">
            {{ guestsWithSongs }}
          </p>
          <p class="admin-kpi-label mt-1">
            {{ t("admin.stats.songs_hint") }}
          </p>

          <!-- 3 dernières pochettes -->
          <div v-if="lastSongCovers.length" class="my-3 grid grid-cols-3 gap-2">
            <div
              v-for="(song, idx) in lastSongCovers"
              :key="idx"
              class="aspect-square rounded-md overflow-hidden bg-gray-200 flex items-center justify-center"
              :title="
                song.title && song.artist
                  ? `${song.title} — ${song.artist}`
                  : song.title || song.artist
              "
            >
              <img
                v-if="song.artworkUrl"
                :src="song.artworkUrl"
                alt=""
                class="w-full h-full object-cover"
                loading="lazy"
              />
              <i v-else class="pi pi-wave-pulse text-gray-400 text-xs"></i>
            </div>
          </div>

          <!-- Bouton pour organiser la playlist -->
          <Can module="playlist" mode="write">
            <Button
              size="small"
              class="mt-auto pt-3 w-full text-sm btn-accent"
              icon="pi pi-sliders-h"
              :label="t('admin.stats.songs_manage_button')"
              @click="openPlaylistSection"
            />
          </Can>
        </template>
      </Card>
    </div>

    <!-- DETAIL -->
    <Card
      id="rsvp-responses-bento"
      :style="{ border: '1px solid var(--accent-color)' }"
    >
      <template #title>
        <div class="flex items-center justify-between gap-2">
          <p class="admin-bento-title">
            <i class="pi pi-envelope text-sm" aria-hidden="true" />
            {{ t("admin.responses.title") }}
          </p>
          <Button
            v-if="!showRsvpHelp"
            text
            rounded
            size="small"
            icon="pi pi-info-circle"
            severity="secondary"
            class="p-0"
            aria-label="Help"
            @click="openRsvpHelp"
          />
        </div>
      </template>

      <template #content>
        <Message
          v-if="showRsvpHelp"
          severity="info"
          :closable="true"
          class="mb-3"
          @close="closeRsvpHelp"
        >
          <div class="text-xs text-left space-y-2">
            <ul class="list-disc pl-4 space-y-1">
              <li>{{ t("admin.responses.help_1") }}</li>
              <li>{{ t("admin.responses.help_2") }}</li>
              <li>{{ t("admin.responses.help_3") }}</li>
            </ul>
          </div>
        </Message>
        <div v-if="!showRsvpFullscreen" class="overflow-auto mt-6">
          <DataTable
            :value="filteredRowsByWeddingParts"
            v-model:filters="filters"
            filter-display="row"
            :global-filter-fields="globalFilters"
            data-key="guestId"
            paginator
            :rows="rsvpTableRows"
            :rows-per-page-options="rsvpRowsPerPageOptions"
            sort-mode="single"
            sort-field="createdAt"
            :sort-order="-1"
            responsive-layout="scroll"
            size="small"
            class="admin-datatable"
            :loading="rsvpStore.rsvpLoading"
            loading-icon="pi pi-spin pi-spinner"
            :row-class="rowClass"
            @row-click="handleRowClick"
            @page="onRsvpTablePage"
          >
            <!-- HEADER -->
            <template #header>
              <div
                class="flex gap-3 flex-col md:flex-row"
                :class="me.canWrite('rsvp') ? 'justify-between' : 'justify-end'"
              >
                <Can module="rsvp" mode="write">
                  <Button
                    icon="pi pi-plus"
                    :label="t('common.add_guest')"
                    size="small"
                    @click="openAddGuestDialog"
                    class="btn-accent"
                  />
                </Can>

                <div class="flex gap-2 flex-col md:flex-row">
                  <Button
                    size="small"
                    :label="t('admin.responses.export')"
                    icon="pi pi-download"
                    @click="exportExcel"
                    text
                    severity="secondary"
                  />

                  <Button
                    icon="pi pi-window-maximize"
                    :label="t('common.fullscreen')"
                    size="small"
                    severity="secondary"
                    @click="showRsvpFullscreen = true"
                  />

                  <IconField icon-position="left">
                    <InputIcon class="pi pi-search" />
                    <InputText
                      v-model="filters.global.value"
                      :placeholder="t('admin.search')"
                      class="w-full text-sm"
                    />
                  </IconField>
                </div>
              </div>
            </template>

            <!-- FULL NAME -->
            <Column
              field="fullName"
              :header="t('admin.responses.name')"
              sortable
            >
              <template #body="{ data }">
                <div class="text-sm">
                  {{ data.fullName }}
                </div>
              </template>
            </Column>

            <!-- PRESENCE -->
            <Column
              field="attending"
              :header="t('admin.responses.attending')"
              sortable
              filter
              filter-match-mode="equals"
              :show-filter-menu="false"
              style="width: 110px"
            >
              <template #body="{ data }">
                <span
                  class="inline-flex items-center rounded-full px-2 py-0.5 text-sm border"
                  :class="
                    isRowAttending(data)
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : 'bg-rose-50 text-rose-700 border-rose-200'
                  "
                >
                  {{ ynLabel(data.attending) }}
                </span>
              </template>
              <template #filter="{ filterModel, filterCallback }">
                <Select
                  v-model="filterModel.value"
                  :options="yesNoFilterOptions"
                  option-label="label"
                  option-value="value"
                  show-clear
                  append-to="body"
                  class="w-full rsvp-filter-select"
                  @change="filterCallback()"
                >
                  <template #value="{ value, placeholder }">
                    <span
                      v-if="value !== null && value !== undefined"
                      class="inline-flex items-center rounded-full px-2 py-0.5 text-xs border"
                      :class="attendingChipClass(value)"
                    >
                      {{ ynLabel(value) }}
                    </span>
                    <span v-else class="text-xs opacity-60">{{
                      placeholder
                    }}</span>
                  </template>
                  <template #option="{ option }">
                    <span
                      class="inline-flex items-center rounded-full px-2 py-0.5 text-xs border"
                      :class="attendingChipClass(option.value)"
                    >
                      {{ option.label }}
                    </span>
                  </template>
                </Select>
              </template>
            </Column>

            <!-- TYPE -->
            <Column
              field="rowType"
              :header="t('admin.responses.role')"
              sortable
              filter
              filter-match-mode="equals"
              :show-filter-menu="false"
            >
              <template #body="{ data }">
                <!-- Cas mariés : icône couronne -->
                <span
                  v-if="data.isCouple"
                  class="inline-flex items-center gap-1 px-2 py-0.5 text-sm"
                >
                  <img
                    :src="crownIcon"
                    alt="Couple"
                    class="w-4 h-4 object-contain"
                  />
                  <!-- Optionnel : petit label si tu veux -->
                  <span class="uppercase tracking-wide text-[0.7rem]">
                    <!-- Tu peux affiner ici : Novia / Novio, etc. -->
                    {{
                      data.isPrimary
                        ? t("admin.responses.couple_bride")
                        : t("admin.responses.couple_groom")
                    }}
                  </span>
                </span>

                <span
                  v-else-if="data.isChild"
                  class="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs border bg-indigo-50 text-indigo-700 border-indigo-200"
                >
                  <i class="pi pi-star"></i>
                  {{ t("admin.responses.is_child") }}
                </span>

                <!-- Cas “invités normaux” : chip comme avant -->
                <span
                  v-else
                  class="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs"
                  :class="
                    data.isPrimary
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : 'bg-sky-50 text-sky-700 border border-sky-200'
                  "
                >
                  <i
                    class="pi"
                    :class="data.isPrimary ? 'pi-star-fill' : 'pi-user-plus'"
                  ></i>
                  {{
                    data.isPrimary
                      ? t("admin.responses.role_primary")
                      : t("admin.responses.role_plus_one")
                  }}
                </span>
              </template>
              <template #filter="{ filterModel, filterCallback }">
                <Select
                  v-model="filterModel.value"
                  :options="typeFilterOptions"
                  option-label="label"
                  option-value="value"
                  show-clear
                  append-to="body"
                  class="w-full rsvp-filter-select"
                  @change="filterCallback()"
                >
                  <template #value="{ value, placeholder }">
                    <span
                      v-if="value !== null && value !== undefined"
                      class="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs border"
                      :class="typeChipClass(value)"
                    >
                      <img
                        v-if="value === 'COUPLE'"
                        :src="crownIcon"
                        alt=""
                        class="w-3 h-3 object-contain"
                      />
                      <i v-else-if="value === 'CHILD'" class="pi pi-star" />
                      <i
                        v-else
                        class="pi"
                        :class="
                          value === 'PRIMARY' ? 'pi-star-fill' : 'pi-user-plus'
                        "
                      />
                      {{
                        findFilterOption(typeFilterOptions, value)?.label ||
                          placeholder
                      }}
                    </span>
                    <span v-else class="text-xs opacity-60">{{
                      placeholder
                    }}</span>
                  </template>
                  <template #option="{ option }">
                    <span
                      class="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs border"
                      :class="typeChipClass(option.value)"
                    >
                      <img
                        v-if="option.value === 'COUPLE'"
                        :src="crownIcon"
                        alt=""
                        class="w-3 h-3 object-contain"
                      />
                      <i
                        v-else-if="option.value === 'CHILD'"
                        class="pi pi-star"
                      />
                      <i
                        v-else
                        class="pi"
                        :class="
                          option.value === 'PRIMARY'
                            ? 'pi-star-fill'
                            : 'pi-user-plus'
                        "
                      />
                      {{ option.label }}
                    </span>
                  </template>
                </Select>
              </template>
            </Column>

            <!-- MAIN GUEST -->
            <Column
              field="mainGuestName"
              :header="t('admin.responses.main_guest')"
              sortable
              style="min-width: 160px"
            >
              <template #body="{ data }">
                <span v-if="!data.isPrimary && !data.isCouple" class="text-sm">
                  {{ formatMainGuestCell(data) }}
                </span>
                <span v-else class="text-sm opacity-60">—</span>
              </template>
            </Column>

            <Column
              field="weddingEventPartsText"
              :header="t('admin.responses.wedding_event_parts')"
              filter
              filter-match-mode="contains"
              :show-filter-menu="false"
              style="min-width: 220px"
            >
              <template #filter>
                <MultiSelect
                  v-model="weddingPartsFilterValues"
                  :options="weddingPartFilterOptions"
                  option-label="label"
                  option-value="value"
                  show-clear
                  display="chip"
                  :max-selected-labels="1"
                  append-to="body"
                  class="w-full rsvp-filter-select"
                >
                  <template #value="{ value, placeholder }">
                    <span
                      v-if="Array.isArray(value) && value.length"
                      class="inline-flex items-center rounded-full px-2 py-0.5 text-xs border bg-violet-50 text-violet-700 border-violet-200"
                    >
                      {{
                        value.length === 1
                          ? findFilterOption(weddingPartFilterOptions, value[0])
                            ?.label
                          : `${value.length}`
                      }}
                    </span>
                    <span v-else class="text-xs opacity-60">{{
                      placeholder
                    }}</span>
                  </template>
                  <template #option="{ option }">
                    <span
                      class="inline-flex items-center rounded-full px-2 py-0.5 text-xs border bg-violet-50 text-violet-700 border-violet-200"
                    >
                      {{ option.label }}
                    </span>
                  </template>
                </MultiSelect>
              </template>
              <template #body="{ data }">
                <div
                  v-if="hasWeddingEventParts(data)"
                  class="flex flex-wrap gap-1"
                >
                  <span
                    v-for="part in weddingEventPartLabels(data)"
                    :key="part"
                    class="inline-flex items-center rounded-full px-2 py-0.5 text-[0.7rem] border bg-violet-50 text-violet-700 border-violet-200"
                  >
                    {{ part }}
                  </span>
                </div>
                <span v-else class="text-sm opacity-60">—</span>
              </template>
            </Column>

            <!-- TRANSPORT -->
            <Column
              field="transport"
              :header="t('admin.responses.transport')"
              sortable
              filter
              filter-match-mode="equals"
              :show-filter-menu="false"
              style="width: 110px"
            >
              <template #body="{ data }">
                <span
                  class="inline-flex items-center rounded-full px-2 py-0.5 text-sm border"
                  :class="
                    isRowTransport(data)
                      ? 'bg-sky-50 text-sky-700 border-sky-200'
                      : 'bg-orange-50 text-orange-700 border-orange-200'
                  "
                >
                  {{ ynLabel(data.transport) }}
                </span>
              </template>
              <template #filter="{ filterModel, filterCallback }">
                <Select
                  v-model="filterModel.value"
                  :options="yesNoFilterOptions"
                  option-label="label"
                  option-value="value"
                  show-clear
                  append-to="body"
                  class="w-full rsvp-filter-select"
                  @change="filterCallback()"
                >
                  <template #value="{ value, placeholder }">
                    <span
                      v-if="value !== null && value !== undefined"
                      class="inline-flex items-center rounded-full px-2 py-0.5 text-xs border"
                      :class="transportChipClass(value)"
                    >
                      {{ ynLabel(value) }}
                    </span>
                    <span v-else class="text-xs opacity-60">{{
                      placeholder
                    }}</span>
                  </template>
                  <template #option="{ option }">
                    <span
                      class="inline-flex items-center rounded-full px-2 py-0.5 text-xs border"
                      :class="transportChipClass(option.value)"
                    >
                      {{ option.label }}
                    </span>
                  </template>
                </Select>
              </template>
            </Column>

            <!-- RESTRICTIONS -->
            <Column
              field="dietSearchText"
              :header="t('admin.responses.restrictions')"
              sortable
              filter
              filter-match-mode="contains"
              :show-filter-menu="false"
              style="min-width: 220px"
            >
              <template #filter="{ filterModel, filterCallback }">
                <Select
                  v-model="filterModel.value"
                  :options="dietFilterOptions"
                  option-label="label"
                  option-value="value"
                  show-clear
                  append-to="body"
                  class="w-full rsvp-filter-select"
                  @change="filterCallback()"
                >
                  <template #value="{ value, placeholder }">
                    <span
                      v-if="value !== null && value !== undefined"
                      class="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs border bg-amber-50 text-amber-800 border-amber-200"
                    >
                      <img
                        v-if="findFilterOption(dietFilterOptions, value)?.icon"
                        :src="findFilterOption(dietFilterOptions, value)?.icon"
                        alt=""
                        class="w-3.5 h-3.5 object-contain"
                      />
                      {{
                        findFilterOption(dietFilterOptions, value)?.label ||
                          placeholder
                      }}
                    </span>
                    <span v-else class="text-xs opacity-60">{{
                      placeholder
                    }}</span>
                  </template>
                  <template #option="{ option }">
                    <span
                      class="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs border bg-amber-50 text-amber-800 border-amber-200"
                    >
                      <img
                        v-if="option.icon"
                        :src="option.icon"
                        alt=""
                        class="w-3.5 h-3.5 object-contain"
                      />
                      {{ option.label }}
                    </span>
                  </template>
                </Select>
              </template>
              <template #body="{ data }">
                <div v-if="hasDietForRow(data)" class="flex flex-wrap gap-1">
                  <span
                    v-for="badge in getDietBadgesForRow(data)"
                    :key="badge.key"
                    class="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[0.7rem] bg-amber-50 text-amber-800 border border-amber-200"
                  >
                    <img
                      :src="badge.icon"
                      alt=""
                      class="w-4 h-4 object-contain"
                    />
                    <span>{{ badge.label }}</span>
                  </span>
                </div>

                <span v-else class="text-sm opacity-60">—</span>
              </template>
            </Column>

            <!-- MESSAGE -->
            <Column
              field="message"
              :header="t('admin.responses.message')"
              sortable
              style="min-width: 260px; max-width: 320px"
            >
              <template #body="{ data }">
                <div
                  class="whitespace-nowrap overflow-hidden text-ellipsis max-w-[320px] text-sm"
                  :title="data.message || ''"
                >
                  {{
                    data.message && String(data.message).trim()
                      ? data.message
                      : "—"
                  }}
                </div>
              </template>
            </Column>

            <!-- GIFT -->
            <Column
              field="giftAmount"
              :header="t('admin.responses.gift_amount')"
              sortable
              style="width: 140px"
            >
              <template #body="{ data }">
                <!-- ✅ Pas de cadeau pour les mariés -->
                <span v-if="data.isCouple" class="text-sm opacity-60">—</span>

                <div v-else @click.stop>
                  <InputNumber
                    v-if="me.canWrite('rsvp')"
                    v-model="data.giftAmount"
                    input-class="w-full text-sm"
                    class="w-full"
                    :min="0"
                    :max-fraction-digits="2"
                    :use-grouping="false"
                    placeholder="—"
                    @update:model-value="(val) => onGiftAmountChange(data, val)"
                    @click.stop
                    @mousedown.stop
                  />
                  <span v-else class="text-sm">
                    {{
                      data.giftAmount === 0 || data.giftAmount
                        ? data.giftAmount
                        : "—"
                    }}
                  </span>
                </div>
              </template>
            </Column>

            <!-- EMAIL -->
            <Column
              field="email"
              :header="t('admin.responses.email')"
              sortable
              style="min-width: 180px"
            >
              <template #body="{ data }">
                <span class="text-sm">
                  {{ data.email || "—" }}
                </span>
              </template>
            </Column>

            <!-- DATE -->
            <Column
              field="createdAt"
              :header="t('admin.responses.created_at')"
              sortable
              style="min-width: 150px"
            >
              <template #body="{ data }">
                <span v-if="data.createdAt" class="text-sm">
                  {{ formatDate(data.createdAt) }}
                </span>
                <span v-else>—</span>
              </template>
            </Column>

            <!-- ACTIONS -->
            <Column v-if="me.canWrite('rsvp')" :header="''" style="width: 80px">
              <template #body="{ data }">
                <Button
                  icon="pi pi-trash"
                  size="small"
                  text
                  rounded
                  severity="danger"
                  v-tooltip.top="t('admin.responses.delete_guest_tooltip')"
                  :aria-label="t('admin.responses.delete_guest_tooltip')"
                  @click.stop="confirmDeleteRow(data)"
                />
              </template>
            </Column>

            <template #empty>
              <ContentViewer
                class="my-3"
                :show-no-results="hasActiveRsvpFilters"
                :no-results-text="
                  t('common.no_results', 'Aucun résultat pour votre recherche.')
                "
                :empty-text="t('common.no_data', 'Aucune donnée à afficher.')"
              />
            </template>
          </DataTable>
        </div>
      </template>
    </Card>
  </div>

  <!-- ADD GUEST DIALOG -->
  <Dialog
    v-model:visible="showAddGuestDialog"
    modal
    :style="{ width: '96vw', maxWidth: '920px' }"
    :breakpoints="{ '960px': '96vw', '640px': '100vw' }"
  >
    <template #header>
      <div class="flex items-center gap-2">
        <span>{{ t("admin.responses.add_manual_title") }}</span>
        <Button
          v-if="!showManualGroupHelp"
          size="small"
          text
          rounded
          icon="pi pi-info-circle"
          severity="secondary"
          class="p-0"
          aria-label="Help"
          @click="openManualGroupHelp"
        />
      </div>
    </template>

    <div class="space-y-4">
      <Message
        v-if="showManualGroupHelp"
        severity="info"
        :closable="true"
        class="mb-1"
        @close="closeManualGroupHelp"
      >
        <div class="text-xs text-left">
          {{ t("admin.responses.add_manual_group_consistency_msg") }}
        </div>
      </Message>

      <div class="flex justify-between items-center">
        <div />
        <Button
          icon="pi pi-user-plus"
          size="small"
          severity="secondary"
          text
          :label="t('admin.responses.add_manual_group_add_person')"
          @click="addManualPerson"
        />
      </div>

      <div class="space-y-3 max-h-[62vh] overflow-auto pr-1">
        <div
          v-for="(person, idx) in manualGuests"
          :key="person.localId"
          class="rounded-md border border-[rgba(0,0,0,0.08)] p-3 space-y-3"
        >
          <div class="flex items-center justify-between gap-2">
            <p class="font-semibold text-sm">
              {{
                t("admin.responses.add_manual_group_person_n", { n: idx + 1 })
              }}
            </p>
            <div class="flex items-center gap-2">
              <span
                class="text-[0.7rem] uppercase tracking-wide px-2 py-0.5 rounded-full"
                :class="
                  idx === 0
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : 'bg-sky-50 text-sky-700 border border-sky-200'
                "
              >
                {{
                  idx === 0
                    ? t("admin.responses.add_manual_group_primary")
                    : t("admin.responses.add_manual_group_plus_one")
                }}
              </span>
              <Button
                v-if="idx > 0 && isManualPersonPristine(person)"
                icon="pi pi-times"
                severity="secondary"
                text
                rounded
                size="small"
                :aria-label="
                  t('admin.responses.add_manual_group_remove_person')
                "
                @click="removeManualPerson(idx)"
              />
            </div>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div class="space-y-1">
              <label class="font-semibold text-sm">
                {{ t("admin.responses.first_name") }}
              </label>
              <InputText v-model="person.firstName" class="w-full" />
            </div>

            <div class="space-y-1">
              <label class="font-semibold text-sm">
                {{ t("admin.responses.last_name") }}
              </label>
              <InputText v-model="person.lastName" class="w-full" />
            </div>

            <div class="space-y-1">
              <label class="font-semibold text-sm">
                {{ t("admin.responses.email") }}
              </label>
              <InputText v-model="person.email" class="w-full" />
            </div>
          </div>

          <div v-if="idx > 0" class="flex items-center gap-3">
            <Checkbox
              :id="`manual-is-child-${person.localId}`"
              v-model="person.isChild"
              binary
              class="manual-child-checkbox"
            />
            <label
              :for="`manual-is-child-${person.localId}`"
              class="text-sm manual-child-label"
            >
              {{ t("rsvp.form.is_child") }}
            </label>
          </div>

          <RsvpFieldsDialog
            v-model:attending="person.attending"
            v-model:wedding-event-parts="person.weddingEventParts"
            v-model:transport="person.transport"
            v-model:diet-codes="person.dietCodes"
            v-model:diet-other-text="person.dietOtherText"
            :yes-no-options="attendingOptions"
            :transport-options="transportOptions"
            :wedding-part-options="weddingPartFilterOptions"
            :diet-options="dietOptions"
            :select-pt="selectPt"
            @attending-change="onManualAttendingChange(person)"
          />
        </div>
      </div>

      <Message v-if="addGuestError" severity="warn" :closable="false">
        {{ addGuestError }}
      </Message>
    </div>

    <template #footer>
      <Can module="rsvp" mode="write">
        <div class="flex justify-end gap-2">
          <Button
            size="small"
            severity="secondary"
            icon="pi pi-times"
            :label="t('common.cancel')"
            @click="showAddGuestDialog = false"
          />
          <Button
            size="small"
            :label="t('common.save')"
            icon="pi pi-save"
            :loading="savingManualGuest"
            @click="saveManualGuest"
            class="btn-accent !bg-[var(--accent-color)] !border-[var(--accent-color)]"
          />
        </div>
      </Can>
    </template>
  </Dialog>

  <!-- FULLSCREEN DIALOG -->
  <Dialog
    v-model:visible="showRsvpFullscreen"
    class="rsvp-fullscreen-dialog"
    modal
    maximizable
    :dismissable-mask="true"
    :draggable="false"
    :style="{ width: '98vw', height: '95vh' }"
    :content-style="{ height: 'calc(95vh - 120px)', overflow: 'auto' }"
    :header="t('admin.responses.title')"
  >
    <DataTable
      :value="filteredRowsByWeddingParts"
      v-model:filters="filters"
      filter-display="row"
      :global-filter-fields="globalFilters"
      data-key="guestId"
      paginator
      :rows="rsvpFullscreenTableRows"
      :rows-per-page-options="rsvpRowsPerPageOptions"
      sort-mode="single"
      sort-field="createdAt"
      :sort-order="-1"
      responsive-layout="scroll"
      size="small"
      class="admin-datatable"
      :loading="rsvpStore.rsvpLoading"
      loading-icon="pi pi-spin pi-spinner"
      :row-class="rowClass"
      @row-click="handleRowClick"
      @page="onRsvpFullscreenTablePage"
      scrollable
      scroll-height="flex"
    >
      <template #header>
        <div class="flex items-center justify-between gap-3">
          <div class="flex items-center gap-2">
            <Can module="rsvp" mode="write">
              <Button
                icon="pi pi-plus"
                :label="t('common.add_guest')"
                size="small"
                @click="openAddGuestDialog"
                class="btn-accent"
              />
            </Can>
          </div>

          <IconField icon-position="left" class="w-72">
            <InputIcon class="pi pi-search" />
            <InputText
              v-model="filters.global.value"
              :placeholder="t('admin.search')"
              class="w-full text-sm"
            />
          </IconField>
        </div>
      </template>

      <!-- FULL NAME -->
      <Column field="fullName" :header="t('admin.responses.name')" sortable>
        <template #body="{ data }">
          <div class="text-sm">
            {{ data.fullName }}
          </div>
        </template>
      </Column>

      <!-- PRESENCE -->
      <Column
        field="attending"
        :header="t('admin.responses.attending')"
        sortable
        filter
        filter-match-mode="equals"
        :show-filter-menu="false"
        style="width: 110px"
      >
        <template #body="{ data }">
          <span
            class="inline-flex items-center rounded-full px-2 py-0.5 text-sm border"
            :class="
              isRowAttending(data)
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : 'bg-rose-50 text-rose-700 border-rose-200'
            "
          >
            {{ ynLabel(data.attending) }}
          </span>
        </template>
        <template #filter="{ filterModel, filterCallback }">
          <Select
            v-model="filterModel.value"
            :options="yesNoFilterOptions"
            option-label="label"
            option-value="value"
            show-clear
            append-to="body"
            class="w-full rsvp-filter-select"
            @change="filterCallback()"
          >
            <template #value="{ value, placeholder }">
              <span
                v-if="value !== null && value !== undefined"
                class="inline-flex items-center rounded-full px-2 py-0.5 text-xs border"
                :class="attendingChipClass(value)"
              >
                {{ ynLabel(value) }}
              </span>
              <span v-else class="text-xs opacity-60">{{ placeholder }}</span>
            </template>
            <template #option="{ option }">
              <span
                class="inline-flex items-center rounded-full px-2 py-0.5 text-xs border"
                :class="attendingChipClass(option.value)"
              >
                {{ option.label }}
              </span>
            </template>
          </Select>
        </template>
      </Column>

      <!-- TYPE -->
      <Column
        field="rowType"
        :header="t('admin.responses.role')"
        sortable
        filter
        filter-match-mode="equals"
        :show-filter-menu="false"
      >
        <template #body="{ data }">
          <!-- Cas mariés : icône couronne -->
          <span
            v-if="data.isCouple"
            class="inline-flex items-center gap-1 px-2 py-0.5 text-sm"
          >
            <img :src="crownIcon" alt="Couple" class="w-4 h-4 object-contain" />
            <!-- Optionnel : petit label si tu veux -->
            <span class="uppercase tracking-wide text-[0.7rem]">
              <!-- Tu peux affiner ici : Novia / Novio, etc. -->
              {{
                data.isPrimary
                  ? t("admin.responses.couple_bride")
                  : t("admin.responses.couple_groom")
              }}
            </span>
          </span>

          <span
            v-else-if="data.isChild"
            class="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs border bg-indigo-50 text-indigo-700 border-indigo-200"
          >
            <i class="pi pi-star"></i>
            {{ t("admin.responses.is_child") }}
          </span>

          <!-- Cas “invités normaux” : chip comme avant -->
          <span
            v-else
            class="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs"
            :class="
              data.isPrimary
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                : 'bg-sky-50 text-sky-700 border border-sky-200'
            "
          >
            <i
              class="pi"
              :class="data.isPrimary ? 'pi-star-fill' : 'pi-user-plus'"
            ></i>
            {{
              data.isPrimary
                ? t("admin.responses.role_primary")
                : t("admin.responses.role_plus_one")
            }}
          </span>
        </template>
        <template #filter="{ filterModel, filterCallback }">
          <Select
            v-model="filterModel.value"
            :options="typeFilterOptions"
            option-label="label"
            option-value="value"
            show-clear
            append-to="body"
            class="w-full rsvp-filter-select"
            @change="filterCallback()"
          >
            <template #value="{ value, placeholder }">
              <span
                v-if="value !== null && value !== undefined"
                class="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs border"
                :class="typeChipClass(value)"
              >
                <img
                  v-if="value === 'COUPLE'"
                  :src="crownIcon"
                  alt=""
                  class="w-3 h-3 object-contain"
                />
                <i v-else-if="value === 'CHILD'" class="pi pi-star" />
                <i
                  v-else
                  class="pi"
                  :class="value === 'PRIMARY' ? 'pi-star-fill' : 'pi-user-plus'"
                />
                {{
                  findFilterOption(typeFilterOptions, value)?.label ||
                    placeholder
                }}
              </span>
              <span v-else class="text-xs opacity-60">{{ placeholder }}</span>
            </template>
            <template #option="{ option }">
              <span
                class="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs border"
                :class="typeChipClass(option.value)"
              >
                <img
                  v-if="option.value === 'COUPLE'"
                  :src="crownIcon"
                  alt=""
                  class="w-3 h-3 object-contain"
                />
                <i v-else-if="option.value === 'CHILD'" class="pi pi-star" />
                <i
                  v-else
                  class="pi"
                  :class="
                    option.value === 'PRIMARY' ? 'pi-star-fill' : 'pi-user-plus'
                  "
                />
                {{ option.label }}
              </span>
            </template>
          </Select>
        </template>
      </Column>

      <!-- MAIN GUEST -->
      <Column
        field="mainGuestName"
        :header="t('admin.responses.main_guest')"
        sortable
        style="min-width: 160px"
      >
        <template #body="{ data }">
          <span v-if="!data.isPrimary && !data.isCouple" class="text-sm">
            {{ formatMainGuestCell(data) }}
          </span>
          <span v-else class="text-sm opacity-60">—</span>
        </template>
      </Column>

      <Column
        field="weddingEventPartsText"
        :header="t('admin.responses.wedding_event_parts')"
        filter
        filter-match-mode="contains"
        :show-filter-menu="false"
        style="min-width: 220px"
      >
        <template #filter>
          <MultiSelect
            v-model="weddingPartsFilterValues"
            :options="weddingPartFilterOptions"
            option-label="label"
            option-value="value"
            show-clear
            display="chip"
            :max-selected-labels="1"
            append-to="body"
            class="w-full rsvp-filter-select"
          >
            <template #value="{ value, placeholder }">
              <span
                v-if="Array.isArray(value) && value.length"
                class="inline-flex items-center rounded-full px-2 py-0.5 text-xs border bg-violet-50 text-violet-700 border-violet-200"
              >
                {{
                  value.length === 1
                    ? findFilterOption(weddingPartFilterOptions, value[0])
                      ?.label
                    : `${value.length}`
                }}
              </span>
              <span v-else class="text-xs opacity-60">{{ placeholder }}</span>
            </template>
            <template #option="{ option }">
              <span
                class="inline-flex items-center rounded-full px-2 py-0.5 text-xs border bg-violet-50 text-violet-700 border-violet-200"
              >
                {{ option.label }}
              </span>
            </template>
          </MultiSelect>
        </template>
        <template #body="{ data }">
          <div v-if="hasWeddingEventParts(data)" class="flex flex-wrap gap-1">
            <span
              v-for="part in weddingEventPartLabels(data)"
              :key="part"
              class="inline-flex items-center rounded-full px-2 py-0.5 text-[0.7rem] border bg-violet-50 text-violet-700 border-violet-200"
            >
              {{ part }}
            </span>
          </div>
          <span v-else class="text-sm opacity-60">—</span>
        </template>
      </Column>

      <!-- TRANSPORT -->
      <Column
        field="transport"
        :header="t('admin.responses.transport')"
        sortable
        filter
        filter-match-mode="equals"
        :show-filter-menu="false"
        style="width: 110px"
      >
        <template #body="{ data }">
          <span
            class="inline-flex items-center rounded-full px-2 py-0.5 text-sm border"
            :class="
              isRowTransport(data)
                ? 'bg-sky-50 text-sky-700 border-sky-200'
                : 'bg-orange-50 text-orange-700 border-orange-200'
            "
          >
            {{ ynLabel(data.transport) }}
          </span>
        </template>
        <template #filter="{ filterModel, filterCallback }">
          <Select
            v-model="filterModel.value"
            :options="yesNoFilterOptions"
            option-label="label"
            option-value="value"
            show-clear
            append-to="body"
            class="w-full rsvp-filter-select"
            @change="filterCallback()"
          >
            <template #value="{ value, placeholder }">
              <span
                v-if="value !== null && value !== undefined"
                class="inline-flex items-center rounded-full px-2 py-0.5 text-xs border"
                :class="transportChipClass(value)"
              >
                {{ ynLabel(value) }}
              </span>
              <span v-else class="text-xs opacity-60">{{ placeholder }}</span>
            </template>
            <template #option="{ option }">
              <span
                class="inline-flex items-center rounded-full px-2 py-0.5 text-xs border"
                :class="transportChipClass(option.value)"
              >
                {{ option.label }}
              </span>
            </template>
          </Select>
        </template>
      </Column>

      <!-- RESTRICTIONS -->
      <Column
        field="dietSearchText"
        :header="t('admin.responses.restrictions')"
        sortable
        filter
        filter-match-mode="contains"
        :show-filter-menu="false"
        style="min-width: 220px"
      >
        <template #filter="{ filterModel, filterCallback }">
          <Select
            v-model="filterModel.value"
            :options="dietFilterOptions"
            option-label="label"
            option-value="value"
            show-clear
            append-to="body"
            class="w-full rsvp-filter-select"
            @change="filterCallback()"
          >
            <template #value="{ value, placeholder }">
              <span
                v-if="value !== null && value !== undefined"
                class="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs border bg-amber-50 text-amber-800 border-amber-200"
              >
                <img
                  v-if="findFilterOption(dietFilterOptions, value)?.icon"
                  :src="findFilterOption(dietFilterOptions, value)?.icon"
                  alt=""
                  class="w-3.5 h-3.5 object-contain"
                />
                {{
                  findFilterOption(dietFilterOptions, value)?.label ||
                    placeholder
                }}
              </span>
              <span v-else class="text-xs opacity-60">{{ placeholder }}</span>
            </template>
            <template #option="{ option }">
              <span
                class="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs border bg-amber-50 text-amber-800 border-amber-200"
              >
                <img
                  v-if="option.icon"
                  :src="option.icon"
                  alt=""
                  class="w-3.5 h-3.5 object-contain"
                />
                {{ option.label }}
              </span>
            </template>
          </Select>
        </template>
        <template #body="{ data }">
          <div v-if="hasDietForRow(data)" class="flex flex-wrap gap-1">
            <span
              v-for="badge in getDietBadgesForRow(data)"
              :key="badge.key"
              class="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[0.7rem] bg-amber-50 text-amber-800 border border-amber-200"
            >
              <img :src="badge.icon" alt="" class="w-4 h-4 object-contain" />
              <span>{{ badge.label }}</span>
            </span>
          </div>

          <span v-else class="text-sm opacity-60">—</span>
        </template>
      </Column>

      <!-- MESSAGE -->
      <Column
        field="message"
        :header="t('admin.responses.message')"
        sortable
        style="min-width: 260px; max-width: 320px"
      >
        <template #body="{ data }">
          <div
            class="whitespace-nowrap overflow-hidden text-ellipsis max-w-[320px] text-sm"
            :title="data.message || ''"
          >
            {{
              data.message && String(data.message).trim() ? data.message : "—"
            }}
          </div>
        </template>
      </Column>

      <!-- GIFT -->
      <Column
        field="giftAmount"
        :header="t('admin.responses.gift_amount', 'Cadeau (€)')"
        sortable
        style="width: 140px"
      >
        <template #body="{ data }">
          <div @click.stop>
            <!-- ✅ Pas de cadeau pour les mariés -->
            <span v-if="data.isCouple" class="text-sm opacity-60">—</span>

            <template v-else>
              <InputNumber
                v-if="me.canWrite('rsvp')"
                v-model="data.giftAmount"
                input-class="w-full text-sm"
                class="w-full"
                :min="0"
                :max-fraction-digits="2"
                :use-grouping="false"
                placeholder="—"
                @update:model-value="(val) => onGiftAmountChange(data, val)"
                @click.stop
                @mousedown.stop
              />
              <span v-else class="text-sm">
                {{
                  data.giftAmount === 0 || data.giftAmount
                    ? data.giftAmount
                    : "—"
                }}
              </span>
            </template>
          </div>
        </template>
      </Column>

      <!-- EMAIL -->
      <Column
        field="email"
        :header="t('admin.responses.email')"
        sortable
        style="min-width: 180px"
      >
        <template #body="{ data }">
          <span class="text-sm">
            {{ data.email || "—" }}
          </span>
        </template>
      </Column>

      <!-- DATE -->
      <Column
        field="createdAt"
        :header="t('admin.responses.created_at')"
        sortable
        style="min-width: 150px"
      >
        <template #body="{ data }">
          <span v-if="data.createdAt" class="text-sm">
            {{ formatDate(data.createdAt) }}
          </span>
          <span v-else>—</span>
        </template>
      </Column>

      <!-- ACTIONS -->
      <Column v-if="me.canWrite('rsvp')" :header="''" style="width: 80px">
        <template #body="{ data }">
          <Button
            icon="pi pi-trash"
            size="small"
            text
            rounded
            severity="danger"
            v-tooltip.top="t('admin.responses.delete_guest_tooltip')"
            :aria-label="t('admin.responses.delete_guest_tooltip')"
            @click.stop="confirmDeleteRow(data)"
          />
        </template>
      </Column>

      <template #empty>
        <ContentViewer
          class="my-3"
          :show-no-results="hasActiveRsvpFilters"
          :no-results-text="
            t('common.no_results', 'Aucun résultat pour votre recherche.')
          "
          :empty-text="t('common.no_data', 'Aucune donnée à afficher.')"
        />
      </template>
    </DataTable>
  </Dialog>
</template>

<script setup>
import {
  ref,
  computed,
  watch,
  onMounted,
  onBeforeUnmount,
  nextTick,
} from "vue";
import * as XLSX from "xlsx";

import { useLang } from "@/composables/useLang";
import { useRoute, useRouter } from "vue-router";

import Dialog from "primevue/dialog";
import Message from "primevue/message";
import DataTable from "primevue/datatable";
import Column from "primevue/column";
import InputNumber from "primevue/inputnumber";
import Select from "primevue/select";
import MultiSelect from "primevue/multiselect";
import IconField from "primevue/iconfield";
import InputIcon from "primevue/inputicon";
import Card from "primevue/card";
import Button from "primevue/button";
import Checkbox from "primevue/checkbox";
import InputText from "primevue/inputtext";
import { useToast } from "primevue/usetoast";
import { useConfirm } from "primevue/useconfirm";

import crownIcon from "@/assets/icons/crown.png";
import { getDietBadges } from "@/shared/dietIcons";
import {
  dietOptions as buildDietOptions,
  dietLabel,
  normalizeDietCodes,
  ensureOtherIfText,
} from "../../../../shared/dietTypes";
import { weddingConfig } from "../../../../shared/weddingConfig";

import { useRsvpStore } from "@/stores/rsvpStore";
import { useMenusStore } from "@/stores/menusStore";
import { useMeStore } from "@/stores/meStore";
import { showApiError } from "@/utils/showApiError";
import ContentViewer from "@/components/utils/ContentViewer.vue";
import RsvpFieldsDialog from "@/components/admin/rsvp/RsvpFieldsDialog.vue";

const rsvpStore = useRsvpStore();
const menusStore = useMenusStore();
const me = useMeStore();

const showSkeleton = computed(
  () => rsvpStore.rsvpLoading && !(rsvpStore.rsvpRows || []).length,
);

const { t, lang } = useLang();
const emit = defineEmits(["deleted"]);
const toast = useToast();
const confirm = useConfirm();
const route = useRoute();
const router = useRouter();
const RESPONSES_BENTO_HASH = "#rsvp-responses-bento";

/* ---------- Filters ---------- */

const globalFilters = [
  "fullName",
  "firstName",
  "lastName",
  "message",
  "mainGuestName",
  "email",
  "dietOtherText",
  "weddingEventPartsText",
  "dietSearchText",
  "rowType",
];

const RSVP_HELP_STORAGE_KEY = "help:rsvp:responses";
const MANUAL_GROUP_HELP_STORAGE_KEY = "help:rsvp:manual-group";
const RSVP_TABLE_ROWS_STORAGE_KEY = "datatable:rsvp:responses:rows";
const RSVP_FULLSCREEN_TABLE_ROWS_STORAGE_KEY =
  "datatable:rsvp:responses-fullscreen:rows";
const rsvpRowsPerPageOptions = [10, 20, 50, 100];

function getInitialRsvpHelpVisibility() {
  if (typeof window === "undefined") return true;
  try {
    return window.localStorage.getItem(RSVP_HELP_STORAGE_KEY) !== "hidden";
  } catch {
    return true;
  }
}

function getInitialManualGroupHelpVisibility() {
  if (typeof window === "undefined") return true;
  try {
    return (
      window.localStorage.getItem(MANUAL_GROUP_HELP_STORAGE_KEY) !== "hidden"
    );
  } catch {
    return true;
  }
}

function getInitialPageSize(storageKey, defaultSize, allowedSizes) {
  if (typeof window === "undefined") return defaultSize;
  try {
    const rawValue = Number(window.localStorage.getItem(storageKey));
    return allowedSizes.includes(rawValue) ? rawValue : defaultSize;
  } catch {
    return defaultSize;
  }
}

function persistPageSize(storageKey, nextSize, allowedSizes) {
  if (typeof window === "undefined") return;
  if (!allowedSizes.includes(nextSize)) return;
  try {
    window.localStorage.setItem(storageKey, String(nextSize));
  } catch {
    // ignore localStorage failures
  }
}

const showRsvpHelp = ref(getInitialRsvpHelpVisibility());
const showManualGroupHelp = ref(getInitialManualGroupHelpVisibility());
const showDietHelp = ref(false);
const rsvpTableRows = ref(
  getInitialPageSize(RSVP_TABLE_ROWS_STORAGE_KEY, 10, rsvpRowsPerPageOptions),
);
const rsvpFullscreenTableRows = ref(
  getInitialPageSize(
    RSVP_FULLSCREEN_TABLE_ROWS_STORAGE_KEY,
    20,
    rsvpRowsPerPageOptions,
  ),
);

function onRsvpTablePage(event) {
  const nextSize = Number(event?.rows);
  if (!rsvpRowsPerPageOptions.includes(nextSize)) return;
  rsvpTableRows.value = nextSize;
  persistPageSize(
    RSVP_TABLE_ROWS_STORAGE_KEY,
    nextSize,
    rsvpRowsPerPageOptions,
  );
}

function onRsvpFullscreenTablePage(event) {
  const nextSize = Number(event?.rows);
  if (!rsvpRowsPerPageOptions.includes(nextSize)) return;
  rsvpFullscreenTableRows.value = nextSize;
  persistPageSize(
    RSVP_FULLSCREEN_TABLE_ROWS_STORAGE_KEY,
    nextSize,
    rsvpRowsPerPageOptions,
  );
}

function createInitialFilters() {
  return {
    global: { value: null, matchMode: "contains" },
    attending: { value: null, matchMode: "equals" },
    rowType: { value: null, matchMode: "equals" },
    weddingEventPartsText: { value: null, matchMode: "contains" },
    transport: { value: null, matchMode: "equals" },
    dietSearchText: { value: null, matchMode: "contains" },
  };
}

const filters = ref(createInitialFilters());

const yesNoFilterOptions = computed(() => [
  { label: t("common.yes"), value: true },
  { label: t("common.no"), value: false },
]);
const weddingPartsFilterValues = ref([]);

function normalizeWeddingPartQuery(value) {
  const v = String(value || "")
    .trim()
    .toLowerCase();
  if (!v) return "";
  if (v === "mass" || v === "misa" || v === "messe") return "mass";
  if (
    v === "cocktailreception" ||
    v === "cocktail_reception" ||
    v === "cocktail-reception" ||
    v === "cocktail" ||
    v === "coctel"
  ) {
    return "cocktailReception";
  }
  if (v === "dinner" || v === "cena") return "dinner";
  if (v === "party" || v === "fiesta") return "party";
  if (v === "brunch") return "brunch";
  return "";
}

function applyWeddingPartFilterFromQuery() {
  const normalized = normalizeWeddingPartQuery(route.query?.weddingPart);
  weddingPartsFilterValues.value = normalized ? [normalized] : [];
}

function normalizeTransportQuery(value) {
  const v = String(value || "")
    .trim()
    .toLowerCase();
  if (!v) return null;
  if (v === "yes" || v === "true" || v === "1" || v === "si" || v === "sí") {
    return true;
  }
  if (v === "no" || v === "false" || v === "0") {
    return false;
  }
  return null;
}

function applyTransportFilterFromQuery() {
  const transportValue = normalizeTransportQuery(route.query?.transport);
  filters.value.transport.value = transportValue;
}

function applyAttendingFilterFromQuery() {
  const attendingValue = normalizeTransportQuery(route.query?.attending);
  filters.value.attending.value = attendingValue;
}

function normalizeRowTypeQuery(value) {
  const v = String(value || "")
    .trim()
    .toUpperCase();
  if (!v) return null;
  if (v === "COUPLE" || v === "PRIMARY" || v === "CHILD" || v === "PLUS_ONE") {
    return v;
  }
  return null;
}

function applyRowTypeFilterFromQuery() {
  const rowType = normalizeRowTypeQuery(route.query?.rowType);
  filters.value.rowType.value = rowType;
}

function applyDietFilterFromQuery() {
  const diet = String(route.query?.diet || "").trim();
  filters.value.dietSearchText.value = diet || null;
}

function scrollToResponsesBentoIfNeeded() {
  if (route.hash !== RESPONSES_BENTO_HASH) return;

  const tryScroll = (retries = 10) => {
    nextTick(() => {
      const el = document.getElementById("rsvp-responses-bento");
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
        return;
      }
      if (retries > 0) {
        setTimeout(() => tryScroll(retries - 1), 120);
      }
    });
  };

  tryScroll();
}

const typeFilterOptions = computed(() => [
  { label: t("admin.responses.couple_pair"), value: "COUPLE" },
  { label: t("admin.responses.role_primary"), value: "PRIMARY" },
  { label: t("admin.responses.is_child"), value: "CHILD" },
  { label: t("admin.responses.role_plus_one"), value: "PLUS_ONE" },
]);

const weddingPartFilterOptions = computed(() => [
  { label: t("rsvp.form.wedding_part_mass"), value: "mass" },
  {
    label: t("rsvp.form.wedding_part_cocktail_reception"),
    value: "cocktailReception",
  },
  { label: t("rsvp.form.wedding_part_dinner"), value: "dinner" },
  { label: t("rsvp.form.wedding_part_party"), value: "party" },
  { label: t("rsvp.form.wedding_part_brunch"), value: "brunch" },
]);

const dietFilterOptions = computed(() =>
  (dietOptions.value || []).map((opt) => {
    const key = String(opt?.value || "");
    const badge = getDietBadges([key], "")?.[0];
    return {
      label: String(opt?.label || key),
      value: key,
      icon: badge?.icon || "",
    };
  }),
);

function findFilterOption(options, value) {
  return (options || []).find((o) => o?.value === value) || null;
}

function attendingChipClass(v) {
  return v === true
    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
    : "bg-rose-50 text-rose-700 border-rose-200";
}

function transportChipClass(v) {
  return v === true
    ? "bg-sky-50 text-sky-700 border-sky-200"
    : "bg-orange-50 text-orange-700 border-orange-200";
}

function typeChipClass(v) {
  if (v === "PRIMARY")
    return "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (v === "CHILD") return "bg-indigo-50 text-indigo-700 border-indigo-200";
  if (v === "PLUS_ONE") return "bg-sky-50 text-sky-700 border-sky-200";
  return "bg-amber-50 text-amber-800 border-amber-200";
}

const showAddGuestDialog = ref(false);
const savingManualGuest = ref(false);
const addGuestError = ref("");
const showRsvpFullscreen = ref(false);

const hasActiveRsvpFilters = computed(() => {
  const f = filters.value || {};
  const hasGlobal = !!String(f?.global?.value || "").trim();

  const keys = [
    "attending",
    "rowType",
    "weddingEventPartsText",
    "transport",
    "dietSearchText",
  ];

  const hasColumn = keys.some((key) => {
    const value = f?.[key]?.value;
    if (typeof value === "boolean") return true;
    return value !== null && value !== undefined && String(value).trim() !== "";
  });

  return hasGlobal || hasColumn || weddingPartsFilterValues.value.length > 0;
});

const filteredRowsByWeddingParts = computed(() => {
  const selected = Array.isArray(weddingPartsFilterValues.value)
    ? weddingPartsFilterValues.value
    : [];
  if (!selected.length) return rsvpStore.rsvpRows;

  const wanted = new Set(selected.map((x) => String(x || "").trim()));
  return rsvpStore.rsvpRows.filter((row) =>
    normalizeWeddingEventParts(row?.weddingEventParts).some((part) =>
      wanted.has(part),
    ),
  );
});
function closeRsvpHelp() {
  showRsvpHelp.value = false;
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(RSVP_HELP_STORAGE_KEY, "hidden");
  } catch {
    // ignore localStorage failures
  }
}

function openRsvpHelp() {
  showRsvpHelp.value = true;
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(RSVP_HELP_STORAGE_KEY);
  } catch {
    // ignore localStorage failures
  }
}

function closeManualGroupHelp() {
  showManualGroupHelp.value = false;
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(MANUAL_GROUP_HELP_STORAGE_KEY, "hidden");
  } catch {
    // ignore localStorage failures
  }
}

function openManualGroupHelp() {
  showManualGroupHelp.value = true;
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(MANUAL_GROUP_HELP_STORAGE_KEY);
  } catch {
    // ignore localStorage failures
  }
}

/* ---------- Navigation ---------- */

function openPlaylistSection() {
  router.push({ path: "/admin", query: { section: "playlist" } });
}

function openMenusSection() {
  router.push({ path: "/admin", query: { section: "menus" } });
}

/* ---------- Group stats ---------- */

const respondentRows = computed(() =>
  rsvpStore.rsvpRows.filter((row) => !isSystemCoupleRow(row)),
);

function isRowAttending(row) {
  return row?.attending === true;
}

function isSystemCoupleRow(row) {
  return row?.isCouple === true && String(row?.rsvpId || "") === "couple";
}

const totalPeople = computed(
  () => rsvpStore.rsvpRows.filter((r) => isRowAttending(r)).length,
);

const respondentDeclinedPeople = computed(
  () => respondentRows.value.filter((r) => r?.attending === false).length,
);

const peopleYesCount = computed(() => Number(totalPeople.value || 0));
const peopleNoCount = computed(() =>
  Number(respondentDeclinedPeople.value || 0),
);
const peopleRespondedCount = computed(
  () => peopleYesCount.value + peopleNoCount.value,
);
const peopleYesRate = computed(() => {
  const total = peopleRespondedCount.value;
  if (!total) return 0;
  return Math.round((peopleYesCount.value * 100) / total);
});
const peopleYesNoDonutStyle = computed(() => {
  const total = peopleRespondedCount.value;
  if (!total) {
    return { background: "conic-gradient(#d8d8de 0% 100%)" };
  }
  const yesPct = Math.round((peopleYesCount.value * 100) / total);
  return {
    background: `conic-gradient(#4caf50 0% ${yesPct}%, #e57373 ${yesPct}% 100%)`,
  };
});

function toStartOfDay(dateLike) {
  const d = new Date(dateLike);
  if (Number.isNaN(d.getTime())) return null;
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function resolveRsvpDeadlineDate() {
  const explicit = String(weddingConfig?.rsvp?.deadlineDate || "").trim();
  if (explicit) {
    const d = toStartOfDay(`${explicit}T00:00:00`);
    if (d) return d;
  }

  const enDeadline = String(weddingConfig?.rsvp?.perLocale?.ca?.deadline || "");
  const fallback = toStartOfDay(enDeadline);
  if (fallback) return fallback;

  return null;
}

const rsvpDeadlineDate = resolveRsvpDeadlineDate();
const MS_PER_DAY = 24 * 60 * 60 * 1000;

const daysUntilRsvpDeadline = computed(() => {
  if (!rsvpDeadlineDate) return null;
  const today = toStartOfDay(new Date());
  if (!today) return null;
  return Math.ceil((rsvpDeadlineDate.getTime() - today.getTime()) / MS_PER_DAY);
});

const daysUntilDeadlineDisplay = computed(() => {
  const d = daysUntilRsvpDeadline.value;
  if (d == null) return "—";
  return String(Math.max(0, d));
});

const rsvpDeadlineLabel = computed(() => {
  const current = String(lang.value || "es")
    .toLowerCase()
    .startsWith("ca") ? "ca" : "es";
  return (
    weddingConfig?.rsvp?.perLocale?.[current]?.deadline ||
    weddingConfig?.rsvp?.perLocale?.es?.deadline ||
    "—"
  );
});

const mainGuestsCount = computed(
  () =>
    rsvpStore.rsvpRows.filter(
      (row) =>
        isRowAttending(row) && (row?.isPrimary === true || row?.isCouple),
    ).length,
);
const totalPlusOnes = computed(
  () =>
    rsvpStore.rsvpRows.filter(
      (row) => isRowAttending(row) && row?.isPrimary !== true && !row?.isCouple,
    ).length,
);
const totalChildrenPresent = computed(
  () =>
    rsvpStore.rsvpRows.filter(
      (row) => isRowAttending(row) && row?.isChild === true,
    ).length,
);
const dietYesAmongAttendees = computed(
  () =>
    rsvpStore.rsvpRows.filter(
      (row) => isRowAttending(row) && hasDietForRow(row),
    ).length,
);

const guestsWithSongs = computed(() => {
  const groupIds = new Set();

  respondentRows.value.forEach((row) => {
    const gid = row.rsvpId;
    if (!gid) return;

    const songs = Array.isArray(row.groupSongs) ? row.groupSongs : [];
    const hasSongs = songs.some(
      (s) => String(s?.title || "").trim() || String(s?.artist || "").trim(),
    );

    if (hasSongs) groupIds.add(gid);
  });

  return groupIds.size;
});

const weddingPartsBreakdown = computed(() => {
  const partsOrder = ["mass", "cocktailReception", "dinner", "party", "brunch"];
  const counts = new Map(partsOrder.map((p) => [p, 0]));

  rsvpStore.rsvpRows.forEach((row) => {
    if (!isRowAttending(row)) return;
    const parts = normalizeWeddingEventParts(row?.weddingEventParts);
    parts.forEach((part) => {
      counts.set(part, (counts.get(part) || 0) + 1);
    });
  });

  return partsOrder.map((key) => ({
    key,
    label: weddingEventPartLabel(key),
    count: counts.get(key) || 0,
  }));
});

/* ---------- Helpers ---------- */

function hasDietForRow(row) {
  const otherText = String(row?.dietOtherText || "").trim();
  const codes = normalizeDietCodes(row?.dietCodes, { dropUnknown: true });
  return codes.length > 0 || otherText.length > 0;
}

function normalizeWeddingEventParts(parts) {
  const allowed = new Set([
    "mass",
    "cocktailReception",
    "dinner",
    "party",
    "brunch",
  ]);
  if (!Array.isArray(parts)) return [];
  return parts.map((x) => String(x || "").trim()).filter((x) => allowed.has(x));
}

function weddingEventPartLabel(code) {
  switch (code) {
    case "mass":
      return t("rsvp.form.wedding_part_mass");
    case "cocktailReception":
      return t("rsvp.form.wedding_part_cocktail_reception");
    case "dinner":
      return t("rsvp.form.wedding_part_dinner");
    case "party":
      return t("rsvp.form.wedding_part_party");
    case "brunch":
      return t("rsvp.form.wedding_part_brunch");
    default:
      return code;
  }
}

function hasWeddingEventParts(row) {
  return normalizeWeddingEventParts(row?.weddingEventParts).length > 0;
}

function weddingEventPartLabels(row) {
  return normalizeWeddingEventParts(row?.weddingEventParts).map(
    weddingEventPartLabel,
  );
}

function toDateSafe(ts) {
  if (!ts) return null;
  if (typeof ts?.toDate === "function") return ts.toDate();
  if (typeof ts?.toMillis === "function") return new Date(ts.toMillis());
  if (typeof ts === "number") return new Date(ts);
  const d = new Date(ts);
  return Number.isNaN(d.getTime()) ? null : d;
}

function formatDate(ts) {
  const d = toDateSafe(ts);
  return d ? d.toLocaleString() : "—";
}

function rowClass(data) {
  return data.isPrimary ? "" : "bg-[rgba(0,0,0,0.015)]";
}

function isRowTransport(row) {
  return row?.transport === true;
}

function toMillisSafe(ts) {
  const d = toDateSafe(ts);
  return d ? d.getTime() : 0;
}

function getDietBadgesForRow(row) {
  const otherText = String(row?.dietOtherText || "").trim();
  let codes = normalizeDietCodes(row?.dietCodes, { dropUnknown: true });

  if (codes.includes("other") && !otherText)
    codes = codes.filter((c) => c !== "other");
  if (otherText && !codes.includes("other")) codes = [...codes, "other"];
  if (!codes.length) return [];

  const rawBadges = getDietBadges(codes, otherText);

  return rawBadges
    .map((b) => ({
      ...b,
      label: b.key === "other" ? otherText : t(b.i18nKey),
    }))
    .filter((b) => b.key !== "other" || otherText);
}

/* ---------- Row click -> detail ---------- */

function handleRowClick(event) {
  const row = event.data;

  if (row?.isCouple) {
    router.push({ name: "AdminRsvpDetail", params: { id: "couple" } });
    return;
  }

  const gid = row?.rsvpId || row?.id;
  if (!gid) return;

  router.push({ name: "AdminRsvpDetail", params: { id: String(gid) } });
}

/* ---------- Delete ---------- */

function confirmDeleteRow(row) {
  confirm.require({
    header: t("common.confirm"),
    message: t("common.confirm_delete_msg"),
    icon: "pi pi-exclamation-triangle",
    rejectLabel: t("common.cancel"),
    acceptLabel: t("common.delete"),
    acceptClass: "p-button-danger",
    rejectClass: "p-button-secondary",
    acceptIcon: "pi pi-check",
    rejectIcon: "pi pi-times",
    accept: () => deleteRow(row),
  });
}

async function deleteRow(row) {
  const rsvpId = row.rsvpId || row.id;
  const guestId = row.guestId;
  const label = row.fullName || "";

  if (!rsvpId || !guestId) return;

  try {
    await rsvpStore.deleteGuest(String(guestId));
    toast.add({
      severity: "success",
      summary: t("common.deleted"),
      detail: label || "OK",
      life: 3000,
    });
    emit("deleted", { rsvpId, guestId });
  } catch (e) {
    console.error(e);
    showApiError(t, toast, e, { life: 5000 });
  }
}

/* ---------- Export Excel ---------- */

function ynLabel(value) {
  if (typeof value === "boolean")
    return value ? t("common.yes") : t("common.no");
  const v = String(value || "").toLowerCase();
  if (v === "si") return t("common.yes");
  if (v === "no") return t("common.no");
  return value || "—";
}

function formatSongsCell(row) {
  const songs = Array.isArray(row.groupSongs)
    ? row.groupSongs
    : Array.isArray(row.songs)
      ? row.songs
      : typeof row.songs === "string"
        ? row.songs
        : null;

  if (typeof songs === "string") return songs.trim();

  if (Array.isArray(songs)) {
    return songs
      .map((s) => {
        const title = String(s?.title || "").trim();
        const artist = String(s?.artist || "").trim();
        if (!title && !artist) return "";
        if (title && artist) return `${title} — ${artist}`;
        return title || artist;
      })
      .filter(Boolean)
      .join(" | ");
  }

  return "";
}

function formatRestrictionsCell(row) {
  if (!isRowAttending(row)) return "";

  const otherText = String(row?.dietOtherText || "").trim();
  const codes = normalizeDietCodes(row?.dietCodes, { dropUnknown: true });

  const labels = codes
    .filter((c) => c !== "other")
    .map((c) => dietLabel(c))
    .filter(Boolean);

  if (otherText) labels.push(otherText);
  return labels.join(", ");
}

function exportExcel() {
  const headers = [
    t("admin.responses.name"),
    t("admin.responses.role"),
    t("admin.responses.main_guest"),
    t("admin.responses.message"),
    t("admin.responses.songs"),
    t("admin.responses.attending"),
    t("admin.responses.transport"),
    t("admin.responses.wedding_event_parts"),
    t("admin.responses.is_child"),
    t("admin.responses.restrictions"),
    t("admin.responses.email"),
    t("admin.responses.created_at"),
    t("admin.responses.gift_amount"),
  ];

  const data = rsvpStore.rsvpRows.map((r) => [
    r.fullName || "—",
    r.isCouple
      ? r.isPrimary
        ? "COUPLE_BRIDE"
        : "COUPLE_GROOM"
      : r.isPrimary
        ? "PRIMARY"
        : "PLUS_ONE",
    !r.isPrimary && !r.isCouple ? formatMainGuestCell(r) : "—",
    r.message || "",
    formatSongsCell(r),
    isRowAttending(r) ? "si" : "no",
    isRowTransport(r) ? "si" : "no",
    weddingEventPartLabels(r).join(", "),
    r.isChild ? t("common.yes") : t("common.no"),
    formatRestrictionsCell(r),
    r.email || "",
    r.createdAt ? formatDate(r.createdAt) : "",
    r.giftAmount === 0 || r.giftAmount ? Number(r.giftAmount) : "",
  ]);

  const ws = XLSX.utils.aoa_to_sheet([headers, ...data]);

  ws["!cols"] = headers.map((h, i) => {
    const maxDataLen = Math.max(
      String(h).length,
      ...data.map((row) => String(row[i] ?? "").length),
    );
    return { wch: Math.min(Math.max(12, maxDataLen + 2), 60) };
  });

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Responses");

  const ts = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  const filename = `responses_${ts.getFullYear()}-${pad(ts.getMonth() + 1)}-${pad(
    ts.getDate(),
  )}_${pad(ts.getHours())}${pad(ts.getMinutes())}.xlsx`;

  XLSX.writeFile(wb, filename);

  toast.add({
    severity: "success",
    summary: t("admin.responses.export"),
    detail: t("common.export_done"),
    life: 3000,
  });
}

/* ---------- Last song covers ---------- */

const lastSongCovers = computed(() => {
  const groupsMap = new Map();

  rsvpStore.rsvpRows.forEach((row) => {
    const gid = row.rsvpId || row.id;
    if (!gid) return;

    if (!groupsMap.has(gid)) {
      groupsMap.set(gid, {
        createdAt: row.groupCreatedAt ?? row.createdAt ?? 0,
        songs: Array.isArray(row.groupSongs)
          ? row.groupSongs
          : Array.isArray(row.songs)
            ? row.songs
            : [],
      });
    }
  });

  const allSongs = [];

  for (const { createdAt, songs } of groupsMap.values()) {
    if (!Array.isArray(songs) || songs.length === 0) continue;

    songs.forEach((s) => {
      const title = String(s?.title || "").trim();
      const artist = String(s?.artist || "").trim();
      const artworkUrl = String(s?.artworkUrl || "").trim();
      if (!title && !artist && !artworkUrl) return;

      allSongs.push({
        title,
        artist,
        artworkUrl,
        createdAt: toMillisSafe(createdAt),
      });
    });
  }

  return allSongs
    .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
    .slice(0, 3);
});

/* ---------- Diet options + UI ---------- */

const dietOptions = computed(() => buildDietOptions(t));

const selectPt = {
  root: { class: "w-full bg-transparent border-0 shadow-none" },
  button: { class: "flex-1 px-3 py-1 border rounded-2xl text-xs" },
};

/* ---------- Main guest helpers (no DB-es fields) ---------- */

const primaryNameByRsvpId = computed(() => {
  const m = new Map();

  for (const row of rsvpStore.rsvpRows) {
    const groupId = row.rsvpId || row.id;
    if (!groupId) continue;

    if (row.isPrimary && !row.isCouple) {
      const name = String(row.fullName || "").trim();
      if (name) m.set(groupId, name);
    }
  }

  return m;
});

function getGroupPrimaryName(row) {
  const groupId = row.rsvpId || row.id;
  return groupId ? primaryNameByRsvpId.value.get(groupId) : "";
}

function formatMainGuestCell(row) {
  if (row.isPrimary || row.isCouple) return "—";
  return (
    (row.mainGuestName && String(row.mainGuestName).trim()) ||
    getGroupPrimaryName(row) ||
    "—"
  );
}

/* ---------- Manual guest ---------- */

let manualLocalId = 0;
function newManualPerson() {
  manualLocalId += 1;
  return {
    localId: `manual-${manualLocalId}`,
    firstName: "",
    lastName: "",
    email: "",
    isChild: false,
    attending: "yes",
    weddingEventParts: [],
    transport: "no",
    dietCodes: [],
    dietOtherText: "",
  };
}

const manualGuests = ref([newManualPerson()]);

const attendingOptions = computed(() => [
  { label: t("common.yes"), value: "yes" },
  { label: t("common.no"), value: "no" },
]);

const transportOptions = computed(() => [
  { label: t("common.yes"), value: "yes" },
  { label: t("common.no"), value: "no" },
]);

function openAddGuestDialog() {
  addGuestError.value = "";
  manualGuests.value = [newManualPerson()];
  showAddGuestDialog.value = true;
}

function addManualPerson() {
  manualGuests.value.push(newManualPerson());
}

function removeManualPerson(index) {
  if (index <= 0) return;
  manualGuests.value.splice(index, 1);
}

function isManualPersonPristine(person) {
  const firstName = String(person?.firstName || "").trim();
  const lastName = String(person?.lastName || "").trim();
  const email = String(person?.email || "").trim();
  const dietOtherText = String(person?.dietOtherText || "").trim();
  const attending = String(person?.attending || "yes").toLowerCase();
  const transport = String(person?.transport || "no").toLowerCase();
  const weddingEventParts = normalizeWeddingEventParts(
    person?.weddingEventParts,
  );
  const dietCodes = normalizeDietCodes(person?.dietCodes, {
    dropUnknown: true,
  });

  return (
    !firstName &&
    !lastName &&
    !email &&
    !person?.isChild &&
    attending === "yes" &&
    transport === "no" &&
    weddingEventParts.length === 0 &&
    dietCodes.length === 0 &&
    !dietOtherText
  );
}

function onManualAttendingChange(person) {
  const isAttending = String(person?.attending || "").toLowerCase() === "yes";
  if (isAttending) return;
  person.transport = "no";
  person.weddingEventParts = [];
  person.dietCodes = [];
  person.dietOtherText = "";
}

async function saveManualGuest() {
  addGuestError.value = "";
  if (!Array.isArray(manualGuests.value) || manualGuests.value.length === 0) {
    addGuestError.value = t("admin.responses.add_manual_group_error_min_one");
    return;
  }

  const payloadGuests = [];
  for (const person of manualGuests.value) {
    const firstName = String(person?.firstName || "").trim();
    const lastName = String(person?.lastName || "").trim();
    const email = String(person?.email || "").trim();

    if (!firstName || !lastName) {
      addGuestError.value = t("admin.responses.add_manual_error_name");
      return;
    }
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      addGuestError.value = t("admin.responses.add_manual_error_email");
      return;
    }

    const attendingUi = String(person?.attending || "yes").toLowerCase();
    const transportUi = String(person?.transport || "no").toLowerCase();
    const isAttending = attendingUi === "yes";
    const wantsTransport = transportUi === "yes";
    const otherText = String(person?.dietOtherText || "").trim();

    let dietCodes = normalizeDietCodes(person?.dietCodes, {
      dropUnknown: true,
    });
    dietCodes = ensureOtherIfText(dietCodes, otherText);

    payloadGuests.push({
      firstName,
      lastName,
      email,
      isChild: !!person?.isChild,
      attending: isAttending,
      weddingEventParts: isAttending
        ? normalizeWeddingEventParts(person?.weddingEventParts)
        : [],
      transport: isAttending ? wantsTransport : false,
      dietCodes: isAttending ? dietCodes : [],
      dietOtherText: isAttending ? otherText : "",
    });
  }

  savingManualGuest.value = true;

  try {
    await rsvpStore.addManualGroup({
      guests: payloadGuests,
    });

    showAddGuestDialog.value = false;

    toast.add({
      severity: "success",
      summary: t("common.saved"),
      detail: t("admin.responses.add_manual_success"),
      life: 2500,
    });
  } catch (e) {
    console.error(e);
    showApiError(t, toast, e, { life: 5000 });

    if (e?.status === 404) addGuestError.value = "Endpoint manquant (404).";
    else if (e?.status === 403)
      addGuestError.value = t("errors.permission.write");
    else addGuestError.value = t("errors.generic");
  } finally {
    savingManualGuest.value = false;
  }
}

/* ---------- Gift inline save ---------- */

const giftSaveTimers = new Map();
const giftPrevValues = new Map();

function normalizeGift(val) {
  const num =
    val === null || val === undefined || val === "" ? null : Number(val);
  return Number.isFinite(num) ? num : null;
}

function onGiftAmountChange(row, val) {
  if (!row?.rsvpId || !row?.guestId) return;

  const key = row.guestId;

  if (!giftPrevValues.has(key)) giftPrevValues.set(key, row.giftAmount ?? null);

  const normalized = normalizeGift(val);

  if (giftSaveTimers.has(key)) clearTimeout(giftSaveTimers.get(key));

  giftSaveTimers.set(
    key,
    setTimeout(async () => {
      const prev = giftPrevValues.get(key);

      try {
        await rsvpStore.updateGuestGiftAmount({
          guestId: row.guestId,
          amount: normalized,
        });
        giftPrevValues.set(key, normalized);
      } catch (e) {
        console.error(e);
        row.giftAmount = prev;
        showApiError(t, toast, e, { life: 4000 });
      } finally {
        giftSaveTimers.delete(key);
      }
    }, 500),
  );
}

/* ---------- Menu breakdown ---------- */

const canReadMenusSeating = computed(() => me.canRead("menus_seating"));

const rsvpGuestIds = computed(() =>
  (rsvpStore.rsvpRows || [])
    .map((r) => String(r?.guestId || "").trim())
    .filter(Boolean),
);

async function syncMenuAssignmentsRealtime() {
  if (!canReadMenusSeating.value) {
    menusStore.disposeRealtime?.();
    return;
  }
  await menusStore.initRealtime?.({ guestIds: rsvpGuestIds.value });
}

const menuBreakdown = computed(() => {
  if (!canReadMenusSeating.value) {
    const counts = new Map();
    const labelsByCode = new Map(
      (dietOptions.value || []).map((opt) => [
        String(opt?.value || ""),
        opt?.label,
      ]),
    );

    rsvpStore.rsvpRows.forEach((r) => {
      if (!isRowAttending(r) || !hasDietForRow(r)) return;

      const otherText = String(r?.dietOtherText || "").trim();
      let codes = normalizeDietCodes(r?.dietCodes, { dropUnknown: true });
      codes = ensureOtherIfText(codes, otherText);

      for (const code of codes) {
        const isOther = code === "other";
        const otherLabel =
          otherText || t("admin.responses.diet_other", "Autre");
        const key = isOther ? `diet:other:${otherLabel}` : `diet:${code}`;
        const label = isOther
          ? otherLabel
          : labelsByCode.get(code) || dietLabel(code) || code;
        const prev = counts.get(key) || {
          key,
          label,
          count: 0,
          isUnassigned: false,
        };
        prev.count += 1;
        counts.set(key, prev);
      }
    });

    return Array.from(counts.values())
      .filter((x) => x.count > 0)
      .sort((a, b) => b.count - a.count);
  }

  const counts = new Map();

  rsvpStore.rsvpRows.forEach((r) => {
    if (!isRowAttending(r)) return;

    const guestId = r.guestId;
    if (!guestId) return;

    const a = menusStore.getAssignmentForGuest?.(guestId);
    const menuId = a?.menuId ?? null;

    const isUnassigned = !menuId;
    const key = isUnassigned ? "menu:__unassigned__" : `menu:${menuId}`;

    const label = isUnassigned
      ? t("admin.menus.unassigned_label", "Non assigné")
      : menusStore.menuById?.(menuId)?.name || menuId;

    const prev = counts.get(key) || { key, label, count: 0, isUnassigned };
    prev.count += 1;
    counts.set(key, prev);
  });

  return Array.from(counts.values())
    .filter((x) => x.count > 0)
    .sort((a, b) => {
      if (a.isUnassigned !== b.isUnassigned) return a.isUnassigned ? 1 : -1;
      return b.count - a.count;
    });
});

/* ---------- Init ---------- */

onMounted(async () => {
  applyWeddingPartFilterFromQuery();
  applyTransportFilterFromQuery();
  applyAttendingFilterFromQuery();
  applyRowTypeFilterFromQuery();
  applyDietFilterFromQuery();
  scrollToResponsesBentoIfNeeded();
  await syncMenuAssignmentsRealtime();
});

watch(
  () => route.query?.weddingPart,
  () => {
    applyWeddingPartFilterFromQuery();
  },
);

watch(
  () => route.query?.transport,
  () => {
    applyTransportFilterFromQuery();
  },
);

watch(
  () => route.query?.attending,
  () => {
    applyAttendingFilterFromQuery();
  },
);

watch(
  () => route.query?.rowType,
  () => {
    applyRowTypeFilterFromQuery();
  },
);

watch(
  () => route.query?.diet,
  () => {
    applyDietFilterFromQuery();
  },
);

watch(
  () => route.hash,
  () => {
    scrollToResponsesBentoIfNeeded();
  },
);

watch(
  () => rsvpGuestIds.value.join("|"),
  () => {
    syncMenuAssignmentsRealtime();
  },
);

watch(
  () => canReadMenusSeating.value,
  () => {
    syncMenuAssignmentsRealtime();
  },
);

onBeforeUnmount(() => {
  for (const t of giftSaveTimers.values()) clearTimeout(t);
  giftSaveTimers.clear();
  menusStore.disposeRealtime?.();
});
</script>

<style scoped>
#rsvp-responses-bento {
  scroll-margin-top: 84px;
}

.admin-kpi-value {
  font-size: 3.2rem;
  line-height: 1;
  font-weight: 400;
  margin-bottom: 0.2rem;
  text-align: left;
}

.admin-kpi-label {
  font-size: 0.85rem;
  color: rgba(51, 51, 51, 0.68);
  text-align: left;
}

:deep(.admin-datatable .p-datatable-tbody > tr) {
  cursor: pointer;
  transition: background-color 150ms ease;
}

:deep(.admin-datatable .p-datatable-tbody > tr:hover) {
  background-color: rgba(0, 0, 0, 0.03);
}

:deep(.admin-datatable .rsvp-filter-select.p-select) {
  min-height: 2.5rem !important;
  border-radius: 0.7rem !important;
}

:deep(.admin-datatable .rsvp-filter-select.p-multiselect) {
  min-height: 2.5rem !important;
  border-radius: 0.7rem !important;
}

:deep(.admin-datatable .rsvp-filter-select.p-select .p-select-label) {
  min-height: 2.5rem !important;
  padding: 0.62rem 0.8rem !important;
  font-size: 0.82rem !important;
  line-height: 1.1 !important;
  display: flex;
  align-items: center;
}

:deep(.admin-datatable .rsvp-filter-select.p-multiselect .p-multiselect-label) {
  min-height: 2.5rem !important;
  padding: 0.62rem 0.8rem !important;
  font-size: 0.82rem !important;
  line-height: 1.1 !important;
  display: flex;
  align-items: center;
}

:deep(.admin-datatable .rsvp-filter-select.p-select .p-select-dropdown) {
  width: 2.35rem !important;
}

:deep(
  .admin-datatable .rsvp-filter-select.p-multiselect .p-multiselect-dropdown
) {
  width: 2.35rem !important;
}

:deep(.manual-child-checkbox.p-checkbox-checked .p-checkbox-box) {
  background: var(--accent-color) !important;
  border-color: var(--accent-color) !important;
}

.manual-child-label {
  margin-left: 0.45rem;
}
</style>

<style>
.rsvp-fullscreen-dialog .admin-datatable .rsvp-filter-select.p-select,
.rsvp-fullscreen-dialog .admin-datatable .rsvp-filter-select.p-multiselect {
  min-height: 2.5rem !important;
  border-radius: 0.7rem !important;
}

.rsvp-fullscreen-dialog
  .admin-datatable
  .rsvp-filter-select.p-select
  .p-select-label,
.rsvp-fullscreen-dialog
  .admin-datatable
  .rsvp-filter-select.p-multiselect
  .p-multiselect-label {
  min-height: 2.5rem !important;
  padding: 0.62rem 0.8rem !important;
  font-size: 0.82rem !important;
  line-height: 1.1 !important;
  display: flex;
  align-items: center;
}

.rsvp-fullscreen-dialog
  .admin-datatable
  .rsvp-filter-select.p-select
  .p-select-dropdown,
.rsvp-fullscreen-dialog
  .admin-datatable
  .rsvp-filter-select.p-multiselect
  .p-multiselect-dropdown {
  width: 2.35rem !important;
}
</style>
