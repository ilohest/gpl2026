<!-- src/components/admin/agenda/AgendaSection.vue -->
<template>
  <div class="space-y-4">
    <!-- Table -->
    <Card :style="{ border: '1px solid var(--accent-color)' }">
      <template #title>
        <div class="flex md:justify-between flex-col md:flex-row items-start">
          <div class="flex items-center gap-2 min-w-0">
            <p class="admin-bento-title truncate">
              <i class="pi pi-calendar text-sm" aria-hidden="true" />
              {{ t("admin.agenda.title") }}
            </p>
            <Button
              v-if="!showHelper"
              text
              rounded
              size="small"
              icon="pi pi-info-circle"
              severity="secondary"
              class="p-0"
              aria-label="Help"
              @click="openHelper"
            />
          </div>

          <SelectButton
            v-model="viewMode"
            :options="viewModeOptions"
            option-label="label"
            option-value="value"
            class="shrink-0"
          >
            <template #option="{ option }">
              <div class="inline-flex items-center gap-2 px-2">
                <i :class="option.icon" />
                <span class="hidden sm:inline">{{ option.label }}</span>
              </div>
            </template>
          </SelectButton>
        </div>
      </template>

      <template #content>
        <div v-if="showSkeleton" class="space-y-4">
          <div class="flex items-center justify-end my-4">
            <div class="flex gap-2">
              <Skeleton width="8rem" height="2.25rem" border-radius="999px" />
              <Skeleton width="7rem" height="2.25rem" border-radius="999px" />
              <Skeleton width="9rem" height="2.25rem" border-radius="999px" />
            </div>
          </div>

          <Skeleton width="100%" height="2.75rem" />
          <div class="space-y-2">
            <Skeleton v-for="n in 8" :key="n" width="100%" height="2.5rem" />
          </div>
        </div>

        <div v-else>
          <!-- INFO -->
          <Message
            v-if="showHelper"
            severity="info"
            closable
            @close="closeHelper"
            class="mb-3"
          >
            <div class="text-xs text-left space-y-2">
              <ul class="list-disc pl-4 space-y-1">
                <li>{{ t("admin.agenda.helper_body") }}</li>
                <li>{{ t("admin.agenda.helper_views") }}</li>
                <li>{{ t("admin.agenda.helper_types_tags") }}</li>
                <li>{{ t("admin.agenda.helper_reorder") }}</li>
                <li class="mt-1">{{ t("admin.agenda.helper_print") }}</li>
              </ul>
            </div>
          </Message>

          <div class="flex items-center justify-end my-4">
            <div class="w-full sm:w-auto flex flex-col sm:flex-row gap-2">
              <Button
                class="w-full sm:w-auto justify-center"
                :label="t('admin.agenda.pdf_button')"
                icon="pi pi-download"
                size="small"
                text
                severity="secondary"
                @click="showPrint = true"
              />

              <Button
                class="w-full sm:w-auto justify-center"
                size="small"
                v-if="canWriteAgenda"
                :label="t('admin.agenda.add')"
                icon="pi pi-plus"
                @click="openCreateDialog()"
                :style="{
                  backgroundColor: 'var(--accent-color)',
                  borderColor: 'var(--accent-color)',
                  color: 'white',
                }"
              />
              <Button
                class="w-full sm:w-auto justify-center"
                size="small"
                v-if="canWriteAgenda"
                :label="t('admin.agenda.templates_btn')"
                icon="pi pi-sparkles"
                severity="secondary"
                @click="showTemplates = true"
              />
            </div>
          </div>

          <!-- LIST -->
          <div v-if="viewMode === 'list'">
            <div>
              <DataTable
                :value="visibleRows"
                data-key="id"
                :loading="agenda.loading"
                :show-headers="hasListSourceRows"
                v-model:filters="listTableFilters"
                filter-display="row"
                scrollable
                :scroll-height="listTableScrollHeight"
                :reorderable-rows="canWriteAgenda && agenda.isReorderEnabled"
                @row-reorder="onRowReorder"
                selection-mode="single"
                v-model:selection="selectedRow"
                :class="[
                  'admin-datatable text-xs',
                  canWriteAgenda ? 'is-writable' : 'is-readonly',
                ]"
                @row-select="canWriteAgenda ? onRowSelect : undefined"
              >
                <template v-if="hasListSourceRows" #header>
                  <div
                    class="flex flex-col md:flex-row md:items-center md:justify-between gap-2"
                  >
                    <div class="flex-1">
                      <IconField icon-position="left" class="w-full">
                        <InputIcon class="pi pi-search" />
                        <InputText
                          v-model="agenda.search"
                          :placeholder="
                            t('admin.agenda.search_placeholder_list')
                          "
                          class="w-full text-sm"
                        />
                      </IconField>
                    </div>
                  </div>
                </template>

                <template #empty>
                  <ContentViewer
                    class="my-3"
                    :show-no-results="
                      hasListFiltersActive || hasListColumnFiltersActive
                    "
                    :no-results-text="t('admin.agenda.no_results')"
                    :empty-text="t('admin.agenda.no_data')"
                  />
                </template>

                <!-- REORDER -->
                <Column
                  v-if="canWriteAgenda && agenda.isReorderEnabled"
                  row-reorder
                  header-style="width: 3rem"
                />

                <!-- HEURE -->
                <Column field="time" :header="t('admin.agenda.col_time')">
                  <template #body="{ data }">
                    <div class="flex items-center gap-2">
                      <span>{{ data.time || "—" }}</span>
                      <Tag
                        v-if="agenda.conflictFor(data.id)"
                        v-tooltip="t('admin.agenda.tooltip_conflict')"
                        severity="danger"
                        class="rounded-full"
                        :value="null"
                      >
                        <i class="pi pi-exclamation-triangle text-xs" />
                      </Tag>
                    </div>
                    <div class="text-xs opacity-60" v-if="data.durationMin">
                      {{ data.durationMin }} min
                    </div>
                  </template>
                </Column>

                <!-- ACTION -->
                <Column
                  field="type"
                  :header="t('admin.agenda.col_action')"
                  style="min-width: 18rem"
                  filter
                  filter-match-mode="typeAny"
                  :show-filter-menu="false"
                >
                  <template #body="{ data }">
                    <div class="min-w-0">
                      <p class="truncate text-xs">
                        {{ data.title || "—" }}
                      </p>

                      <div class="flex flex-wrap gap-1 mt-1">
                        <Tag
                          v-for="typeCode in (data.type || []).filter(Boolean)"
                          :key="typeCode"
                          severity="info"
                          class="!rounded-full text-xs border"
                        >
                          <template #default>
                            <span class="inline-flex items-center gap-2">
                              <i
                                :class="typeIcon({ type: typeCode })"
                                class="text-xs"
                              />
                              <span class="text-xs">{{
                                typeLabelValue(typeCode)
                              }}</span>
                            </span>
                          </template>
                        </Tag>
                      </div>

                      <p
                        v-if="data.location"
                        class="text-xs opacity-70 truncate mt-1"
                      >
                        <span class="inline-flex items-center gap-2">
                          <i class="pi pi-map-marker text-xs opacity-70" />
                          <span class="truncate">{{ data.location }}</span>
                        </span>
                      </p>

                      <div
                        v-if="
                          (data.trackRefs || []).some(
                            (tr) => tr && (tr.title || tr.artist),
                          )
                        "
                        class="text-xs opacity-70 mt-1"
                      >
                        <div class="flex items-start gap-2">
                          <i
                            class="pi pi-volume-up text-xs opacity-70 mt-0.5 flex-shrink-0"
                          />

                          <div class="min-w-0 flex-1 space-y-0.5">
                            <div
                              v-for="tr in (data.trackRefs || []).filter(
                                (tr) => tr && (tr.title || tr.artist),
                              )"
                              :key="tr._localId || `${tr.source || 'x'}:${tr.id || tr.title || tr.artist}`"
                              class="truncate text-xs"
                            >
                              <span>{{ tr.title || "—" }}</span>
                              <span v-if="tr.artist" class="opacity-70">
                                — {{ tr.artist }}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </template>
                  <template #filter="{ filterModel, filterCallback }">
                    <MultiSelect
                      v-model="filterModel.value"
                      :options="typeOptions"
                      option-label="label"
                      option-value="value"
                      display="chip"
                      show-clear
                      append-to="body"
                      class="w-full agenda-filter-multiselect"
                      :placeholder="t('admin.agenda.col_action')"
                      @update:model-value="filterCallback()"
                    >
                      <template #option="{ option }">
                        <Tag
                          severity="info"
                          class="!rounded-full text-xs border"
                        >
                          <template #default>
                            <span class="inline-flex items-center gap-2">
                              <i
                                :class="
                                  option.icon ||
                                    typeIcon({ type: option.value })
                                "
                                class="text-xs"
                              />
                              <span>{{ option.label }}</span>
                            </span>
                          </template>
                        </Tag>
                      </template>

                      <template #chip="{ value, removeCallback }">
                        <Tag
                          severity="info"
                          class="!rounded-full text-xs border"
                        >
                          <template #default>
                            <span class="inline-flex items-center gap-1">
                              <i
                                :class="typeIcon({ type: value })"
                                class="text-xs"
                              />
                              <span class="truncate max-w-[160px]">
                                {{ typeLabelValue(value) }}
                              </span>
                              <button
                                type="button"
                                class="ml-1 opacity-70 hover:opacity-100"
                                @click.stop="removeCallback($event, value)"
                                aria-label="Remove"
                              >
                                <i class="pi pi-times text-[0.65rem]" />
                              </button>
                            </span>
                          </template>
                        </Tag>
                      </template>
                    </MultiSelect>
                  </template>
                </Column>

                <!-- INTERVENANTS -->
                <Column
                  field="ownerTags"
                  :header="t('admin.agenda.col_owners')"
                  style="width: 12rem"
                  filter
                  filter-match-mode="tagAny"
                  :show-filter-menu="false"
                >
                  <template #body="{ data }">
                    <div class="flex flex-wrap gap-1">
                      <Tag
                        v-for="ownerTag in data.ownerTags || []"
                        :key="ownerTag"
                        class="rounded-full text-xs"
                        :style="ownerTagStyle(ownerTag)"
                      >
                        <template #default>
                          <span class="text-xs">{{
                            ownerTagLabel(ownerTag)
                          }}</span>
                        </template>
                      </Tag>
                    </div>
                  </template>
                  <template #filter="{ filterModel, filterCallback }">
                    <MultiSelect
                      v-model="filterModel.value"
                      :options="tagOptions"
                      option-label="label"
                      option-value="value"
                      display="chip"
                      show-clear
                      append-to="body"
                      class="w-full agenda-filter-multiselect"
                      :placeholder="t('admin.agenda.col_owners')"
                      @update:model-value="filterCallback()"
                    >
                      <template #option="{ option }">
                        <Tag
                          :value="option.label"
                          class="rounded-full text-xs"
                          :style="ownerTagStyle(option.value)"
                        />
                      </template>

                      <template #chip="{ value, removeCallback }">
                        <Tag
                          :value="ownerTagLabel(value)"
                          class="rounded-full text-xs"
                          :style="ownerTagStyle(value)"
                        >
                          <template #default>
                            <span class="inline-flex items-center gap-1">
                              <span class="truncate max-w-[160px]">
                                {{ ownerTagLabel(value) }}
                              </span>
                              <button
                                type="button"
                                class="ml-1 opacity-70 hover:opacity-100"
                                @click.stop="removeCallback($event, value)"
                                aria-label="Remove"
                              >
                                <i class="pi pi-times text-[0.65rem]" />
                              </button>
                            </span>
                          </template>
                        </Tag>
                      </template>
                    </MultiSelect>
                  </template>
                </Column>

                <!-- PARTICIPANTS -->
                <Column
                  field="participants"
                  :header="t('admin.agenda.col_participants')"
                  style="width: 12rem"
                  filter
                  filter-match-mode="tagAny"
                  :show-filter-menu="false"
                >
                  <template #body="{ data }">
                    <div class="flex flex-wrap gap-1">
                      <Tag
                        v-for="p in data.participants || []"
                        :key="p"
                        class="rounded-full text-xs"
                        :style="ownerTagStyle(p)"
                      >
                        <template #default>
                          <span class="text-xs">{{ guestLabel(p) }}</span>
                        </template>
                      </Tag>
                    </div>
                  </template>
                  <template #filter="{ filterModel, filterCallback }">
                    <MultiSelect
                      v-model="filterModel.value"
                      :options="participantAll"
                      option-label="label"
                      option-value="value"
                      display="chip"
                      show-clear
                      filter
                      append-to="body"
                      class="w-full agenda-filter-multiselect"
                      :placeholder="t('admin.agenda.col_participants')"
                      :filter-placeholder="t('common.search', 'Search…')"
                      @update:model-value="filterCallback()"
                    >
                      <template #option="{ option }">
                        <Tag
                          :value="guestLabel(option.value)"
                          class="rounded-full text-xs"
                          :style="ownerTagStyle(option.value)"
                        />
                      </template>

                      <template #chip="{ value, removeCallback }">
                        <Tag
                          :value="guestLabel(value)"
                          class="rounded-full text-xs"
                          :style="ownerTagStyle(value)"
                        >
                          <template #default>
                            <span class="inline-flex items-center gap-1">
                              <span class="truncate max-w-[160px]">
                                {{ guestLabel(value) }}
                              </span>
                              <button
                                type="button"
                                class="ml-1 opacity-70 hover:opacity-100"
                                @click.stop="removeCallback($event, value)"
                                aria-label="Remove"
                              >
                                <i class="pi pi-times text-[0.65rem]" />
                              </button>
                            </span>
                          </template>
                        </Tag>
                      </template>
                    </MultiSelect>
                  </template>
                </Column>

                <!-- NOTE -->
                <Column
                  :header="t('admin.agenda.col_note')"
                  style="width: 3.25rem"
                >
                  <template #body="{ data }">
                    <Button
                      v-if="String(data.notes || '').trim()"
                      icon="pi pi-file-edit"
                      severity="secondary"
                      rounded
                      text
                      size="small"
                      v-tooltip="t('admin.agenda.tooltip_view_note')"
                      @click.stop="openNoteDialog(data)"
                    />
                  </template>
                </Column>

                <!-- ACTIONS -->
                <Column
                  v-if="canWriteAgenda"
                  :header="t('common.actions')"
                  style="width: 8rem"
                >
                  <template #body="{ data }">
                    <div class="flex justify-end gap-1">
                      <Button
                        icon="pi pi-pencil"
                        severity="secondary"
                        text
                        rounded
                        v-tooltip.top="t('admin.agenda.tooltip_edit')"
                        :aria-label="t('admin.agenda.tooltip_edit')"
                        size="small"
                        @click.stop="openEditDialog(data)"
                      />
                      <Button
                        icon="pi pi-copy"
                        severity="secondary"
                        text
                        rounded
                        v-tooltip.top="t('admin.agenda.tooltip_duplicate')"
                        :aria-label="t('admin.agenda.tooltip_duplicate')"
                        size="small"
                        @click.stop="agenda.duplicateItem(data.id, t)"
                      />
                      <Button
                        icon="pi pi-trash"
                        severity="danger"
                        text
                        rounded
                        v-tooltip.top="t('admin.agenda.tooltip_delete')"
                        :aria-label="t('admin.agenda.tooltip_delete')"
                        size="small"
                        @click.stop="confirmDelete(data)"
                      />
                    </div>
                  </template>
                </Column>
              </DataTable>
            </div>
          </div>

          <!-- TIMELINE -->
          <div v-else class="space-y-3">
            <div
              v-if="hasTimelineSourceRows"
              class="flex flex-col md:flex-row md:items-center md:justify-between gap-2"
            >
              <!-- Recherche -->
              <div class="flex-1">
                <IconField icon-position="left" class="w-full md:max-w-sm">
                  <InputIcon class="pi pi-search" />
                  <InputText
                    v-model="timelineSearch"
                    :placeholder="t('admin.agenda.timeline_search_placeholder')"
                    class="w-full text-sm"
                  />
                </IconField>
              </div>

              <!-- Filtres -->
              <div class="flex flex-col sm:flex-row gap-2 shrink-0">
                <Select
                  v-model="timelineType"
                  :options="typeOptions"
                  option-label="label"
                  option-value="value"
                  class="w-full sm:w-56"
                  :placeholder="t('admin.agenda.col_action')"
                  show-clear
                >
                  <!-- valeur sélectionnée -->
                  <template #value="{ value, placeholder }">
                    <span v-if="!value" class="opacity-60">{{
                      placeholder
                    }}</span>

                    <Tag
                      v-else
                      severity="info"
                      class="!rounded-full text-xs border"
                    >
                      <template #default>
                        <span class="inline-flex items-center gap-2">
                          <i
                            :class="typeIcon({ type: value })"
                            class="text-xs"
                          />
                          <span>{{ typeLabelValue(value) }}</span>
                        </span>
                      </template>
                    </Tag>
                  </template>

                  <!-- options -->
                  <template #option="{ option }">
                    <Tag severity="info" class="!rounded-full text-xs border">
                      <template #default>
                        <span class="inline-flex items-center gap-2">
                          <i
                            :class="
                              option.icon || typeIcon({ type: option.value })
                            "
                            class="text-xs"
                          />
                          <span>{{ option.label }}</span>
                        </span>
                      </template>
                    </Tag>
                  </template>
                </Select>

                <Select
                  v-model="timelineTag"
                  :options="tagOptions"
                  option-label="label"
                  option-value="value"
                  class="w-full sm:w-56"
                  :placeholder="t('admin.agenda.filter_owner_placeholder')"
                  show-clear
                >
                  <template #value="{ value, placeholder }">
                    <span v-if="!value" class="opacity-60">{{
                      placeholder
                    }}</span>
                    <Tag
                      v-else
                      :value="ownerTagLabel(value)"
                      class="rounded-full text-xs"
                      :style="ownerTagStyle(value)"
                    />
                  </template>

                  <template #option="{ option }">
                    <Tag
                      :value="option.label"
                      class="rounded-full text-xs"
                      :style="ownerTagStyle(option.value)"
                    />
                  </template>
                </Select>
              </div>
            </div>

            <Timeline
              v-if="hasTimelineRows"
              :value="timelineItems"
              :align="timelineAlign"
              class="customized-timeline"
            >
              <template #marker="{ item }">
                <span
                  class="flex w-8 h-8 items-center justify-center text-white rounded-full z-10 shadow-sm"
                  :style="{ backgroundColor: typeColor(item) }"
                >
                  <i :class="typeIcon(item)" class="text-sm" />
                </span>
              </template>

              <template #content="{ item }">
                <Card class="mt-3 !bg-[var(--surface-soft)]">
                  <template #title>
                    <div class="flex items-center justify-between gap-2">
                      <div class="min-w-0 flex flex-col items-start">
                        <div
                          class="flex gap-2 justify-start text-base items-center"
                        >
                          <span>{{ item.time || "—" }}</span>
                          <span class="truncate text-sm">{{
                            item.title || "—"
                          }}</span>

                          <Tag
                            v-if="agenda.conflictFor(item.id)"
                            v-tooltip="t('admin.agenda.tooltip_conflict')"
                            severity="danger"
                            class="rounded-full"
                            :value="null"
                          >
                            <i class="pi pi-exclamation-triangle text-xs" />
                          </Tag>
                        </div>

                        <div class="flex flex-wrap gap-1 mt-1">
                          <!-- Action -->
                          <Tag
                            v-for="typeCode in (item.type || []).filter(
                              Boolean,
                            )"
                            :key="typeCode"
                            severity="info"
                            class="!rounded-full text-xs border"
                          >
                            <template #default>
                              <span class="inline-flex items-center gap-2">
                                <i
                                  :class="typeIcon({ type: typeCode })"
                                  class="text-xs"
                                />
                                <span class="text-xs">{{
                                  typeLabelValue(typeCode)
                                }}</span>
                              </span>
                            </template>
                          </Tag>
                        </div>

                        <p
                          v-if="item.location"
                          class="text-xs opacity-70 truncate mt-1"
                        >
                          <span class="inline-flex items-center gap-2">
                            <i class="pi pi-map-marker text-xs opacity-70" />
                            <span class="truncate">{{ item.location }}</span>
                          </span>
                        </p>
                      </div>

                      <div
                        class="flex items-center gap-2 flex-shrink-0 edit-button"
                      >
                        <Button
                          v-if="canWriteAgenda"
                          icon="pi pi-pencil"
                          severity="secondary"
                          outlined
                          v-tooltip.top="t('admin.agenda.tooltip_edit')"
                          rounded
                          size="small"
                          @click="openEditDialog(item)"
                        />
                      </div>
                    </div>
                  </template>

                  <template #content>
                    <div class="space-y-3 text-sm">
                      <!-- Intervenants -->
                      <div
                        v-if="item.ownerTags?.length"
                        class="flex flex-wrap gap-1"
                      >
                        <Tag
                          v-for="ownerTag in item.ownerTags"
                          :key="ownerTag"
                          class="rounded-full"
                          :style="ownerTagStyle(ownerTag)"
                        >
                          <template #default>
                            <span class="text-xs">{{
                              ownerTagLabel(ownerTag)
                            }}</span>
                          </template>
                        </Tag>
                      </div>

                      <!-- Participants -->
                      <div
                        v-if="(item.participants || []).length"
                        class="flex flex-wrap gap-1"
                      >
                        <Tag
                          v-for="p in item.participants || []"
                          :key="p"
                          class="rounded-full text-xs"
                          :style="ownerTagStyle(p)"
                        >
                          <template #default>
                            <span class="text-xs">{{ guestLabel(p) }}</span>
                          </template>
                        </Tag>
                      </div>

                      <!-- Musiques -->
                      <div v-if="item.trackRefs?.length" class="space-y-1">
                        <p class="text-xs font-semibold opacity-80">
                          {{ t("admin.agenda.label_music") }}
                        </p>
                        <div
                          v-for="tr in item.trackRefs"
                          :key="tr.id"
                          class="text-xs"
                        >
                          <span class="font-semibold">{{
                            tr.title || "—"
                          }}</span>
                          <span v-if="tr.artist" class="opacity-70">
                            — {{ tr.artist }}
                          </span>
                        </div>
                      </div>

                      <!-- Notes -->
                      <div
                        v-if="String(item.notes || '').trim()"
                        class="space-y-1"
                      >
                        <p class="text-xs font-semibold opacity-80">
                          {{ t("admin.agenda.label_notes") }}
                        </p>
                        <p class="text-xs opacity-90 whitespace-pre-line">
                          {{ item.notes }}
                        </p>
                      </div>
                    </div>
                  </template>
                </Card>
              </template>
            </Timeline>

            <ContentViewer
              v-else
              class="my-3"
              :show-no-results="hasTimelineFiltersActive"
              :no-results-text="t('admin.agenda.no_results')"
              :empty-text="t('admin.agenda.no_data')"
            />
          </div>
        </div>
      </template>
    </Card>

    <!-- TEMPLATES DIALOG -->
    <Dialog
      v-if="canWriteAgenda"
      v-model:visible="showTemplates"
      modal
      :header="t('admin.agenda.templates_dialog_title')"
      :style="{ width: '720px', maxWidth: '92vw' }"
    >
      <div class="space-y-3 text-sm">
        <p class="opacity-80">
          {{ t("admin.agenda.templates_dialog_helper") }}
        </p>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div
            v-for="tpl in templatesUi"
            :key="tpl.key"
            class="rounded-2xl border p-3 bg-white"
          >
            <div class="flex items-start justify-between gap-3">
              <div class="min-w-0">
                <div class="flex items-center gap-2">
                  <i :class="tpl.icon" class="text-sm opacity-80" />
                  <p class="font-semibold truncate">{{ tpl.title }}</p>
                </div>
              </div>

              <Button
                :label="t('admin.agenda.templates_add')"
                icon="pi pi-plus"
                size="small"
                @click="seed(tpl.key)"
                :style="{
                  backgroundColor: 'var(--accent-color)',
                  borderColor: 'var(--accent-color)',
                  color: 'white',
                }"
              />
            </div>

            <div class="mt-3 space-y-1 text-xs">
              <div
                v-for="(it, idx) in tpl.items"
                :key="`${tpl.key}-${idx}`"
                class="flex items-center justify-between gap-2"
              >
                <span class="font-mono opacity-70 w-14 shrink-0">{{
                  it.time
                }}</span>
                <span class="truncate flex-1">{{ it.title }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Dialog>

    <!-- CREATE / EDIT AGENDA ITEM DIALOG -->
    <Dialog
      v-if="canWriteAgenda"
      v-model:visible="showEditDialog"
      modal
      :header="editDialogHeader"
      :style="{ width: '720px', maxWidth: '96vw' }"
      :breakpoints="{ '960px': '98vw', '640px': '100vw' }"
    >
      <div v-if="draft" class="space-y-3">
        <div class="grid grid-cols-2 gap-2">
          <!-- HEURE -->
          <div>
            <label class="font-semibold text-sm">{{
              t("admin.agenda.field_time")
            }}</label>
            <InputMask
              v-model="draft.time"
              mask="99:99"
              :placeholder="t('admin.agenda.placeholder_time')"
              class="w-full"
            />
          </div>

          <!-- DURÉE -->
          <div>
            <label class="font-semibold text-sm">{{
              t("admin.agenda.field_duration")
            }}</label>
            <InputNumber
              v-model="draft.durationMin"
              class="w-full"
              :min="0"
              :max="600"
            />
          </div>
        </div>

        <!-- TITRE -->
        <div>
          <label class="font-semibold text-sm">
            {{ t("admin.agenda.field_title") }}
          </label>
          <InputText
            v-model="draft.title"
            class="w-full"
            :placeholder="t('admin.agenda.placeholder_title')"
          />
        </div>

        <!-- TYPE -->
        <div>
          <label class="font-semibold text-sm">{{
            t("admin.agenda.field_type")
          }}</label>

          <AutoComplete
            ref="typeAcRef"
            v-model="draft.type"
            :suggestions="typeSuggestions"
            dropdown
            multiple
            :force-selection="false"
            :complete-on-focus="true"
            class="w-full"
            :placeholder="t('admin.agenda.placeholder_type')"
            @complete="searchTypes"
            @item-select="onTypeSelected"
            :pt="{ input: { onKeydown: onTypeKeydown } }"
          >
            <!-- Dropdown items -->
            <template #option="{ option }">
              <Tag severity="info" class="!rounded-full text-xs border">
                <span class="inline-flex items-center gap-2">
                  <i :class="typeIcon({ type: option })" class="text-xs" />
                  <span>{{ typeLabelValue(option) }}</span>
                </span>
              </Tag>
            </template>

            <!-- Chips sélectionnées -->
            <template #chip="{ value, removeCallback }">
              <Tag
                v-if="String(value || '').trim()"
                severity="info"
                class="!rounded-full text-xs border"
              >
                <span class="inline-flex items-center gap-2">
                  <i :class="typeIcon({ type: value })" class="text-xs" />
                  <span>{{ typeLabelValue(value) }}</span>
                  <button
                    type="button"
                    class="opacity-80 hover:opacity-100"
                    @click.stop="removeCallback"
                  >
                    <i class="pi pi-times text-[10px]" />
                  </button>
                </span>
              </Tag>
            </template>
          </AutoComplete>

          <p class="text-[11px] opacity-60 mt-1">
            {{ t("admin.agenda.hint_type") }}
          </p>
        </div>

        <!-- ENDROIT -->
        <div>
          <label class="font-semibold text-sm">
            {{ t("admin.agenda.field_location") }}
          </label>
          <InputText
            v-model="draft.location"
            class="w-full"
            :placeholder="t('admin.agenda.placeholder_location')"
          />
        </div>

        <!-- INTERVENANTS -->
        <div>
          <label class="font-semibold text-sm">{{
            t("admin.agenda.field_owners")
          }}</label>

          <AutoComplete
            v-model="draft.ownerTags"
            :suggestions="ownerTagSuggestions"
            dropdown
            multiple
            :force-selection="false"
            :complete-on-focus="true"
            class="w-full"
            :placeholder="t('admin.agenda.placeholder_owners')"
            @complete="searchOwnerTags"
            :pt="{ input: { onKeydown: onOwnerTagKeydown } }"
          >
            <template #option="{ option }">
              <Tag
                :value="ownerTagLabel(option)"
                class="rounded-full text-xs"
                :style="ownerTagStyle(option)"
              />
            </template>

            <template #chip="{ value, removeCallback }">
              <Tag class="rounded-full text-xs" :style="ownerTagStyle(value)">
                <span class="inline-flex items-center gap-2">
                  <span>{{ ownerTagLabel(value) }}</span>
                  <button
                    type="button"
                    class="opacity-80 hover:opacity-100"
                    @click.stop="removeCallback"
                  >
                    <i class="pi pi-times text-[10px]" />
                  </button>
                </span>
              </Tag>
            </template>
          </AutoComplete>

          <p class="text-[11px] opacity-60 mt-1">
            {{ t("admin.agenda.hint_owners") }}
          </p>
        </div>

        <!-- PARTICIPANTS -->
        <div>
          <label class="font-semibold text-sm">{{
            t("admin.agenda.field_participants")
          }}</label>

          <AutoComplete
            v-model="draft.participants"
            :suggestions="participantSuggestions"
            option-label="label"
            dropdown
            multiple
            :force-selection="false"
            :complete-on-focus="true"
            class="w-full"
            :placeholder="t('admin.agenda.placeholder_participants')"
            @complete="searchParticipants"
            @item-select="onParticipantSelected"
            :pt="{ input: { onKeydown: onParticipantKeydown } }"
          >
            <!-- Dropdown items -->
            <template #option="{ option }">
              <Tag severity="secondary" class="!rounded-full text-xs border">
                <span>{{ option?.label || "—" }}</span>
              </Tag>
            </template>

            <!-- Chips sélectionnées (FIX) -->
            <template #chip="{ value, removeCallback }">
              <Tag severity="secondary" class="!rounded-full text-xs border">
                <span class="inline-flex items-center gap-2">
                  <span>{{ participantChipLabel(value) }}</span>
                  <button
                    type="button"
                    class="opacity-80 hover:opacity-100"
                    @click.stop="removeCallback"
                  >
                    <i class="pi pi-times text-[10px]" />
                  </button>
                </span>
              </Tag>
            </template>
          </AutoComplete>

          <p class="text-[11px] opacity-60 mt-1">
            {{ t("admin.agenda.hint_participants") }}
          </p>
        </div>

        <!-- MUSIQUE -->
        <div>
          <label class="font-semibold text-sm">
            {{ t("admin.agenda.field_music") }}
          </label>

          <div class="space-y-2">
            <div
              v-for="(tr, idx) in draft.trackRefs"
              :key="tr._localId || `${tr.source}:${tr.id}`"
              class="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-2 py-2"
            >
              <!-- Cover + Play -->
              <div
                class="relative w-12 h-12 rounded-lg overflow-hidden bg-gray-100 flex items-center justify-center flex-shrink-0"
              >
                <img
                  v-if="tr.artworkUrl"
                  :src="tr.artworkUrl"
                  alt=""
                  class="w-full h-full object-cover"
                  loading="lazy"
                />
                <i v-else class="pi pi-wave-pulse text-gray-400 text-xs"></i>

                <button
                  v-if="tr.previewUrl"
                  type="button"
                  class="absolute inset-0 flex items-center justify-center bg-black/15 hover:bg-black/30 transition"
                  @click.stop="togglePreview(tr.previewUrl)"
                  :aria-label="
                    isPreviewPlaying(tr.previewUrl) ? 'Pause' : 'Play'
                  "
                >
                  <span
                    class="inline-flex items-center justify-center w-7 h-7 rounded-full bg-white/75"
                  >
                    <i
                      class="pi"
                      :class="
                        isPreviewPlaying(tr.previewUrl) ? 'pi-pause' : 'pi-play'
                      "
                    ></i>
                  </span>
                </button>
              </div>

              <!-- Texte -->
              <div class="flex-1 min-w-0">
                <p class="text-sm font-semibold truncate">
                  {{ tr.title || "—" }}
                </p>
                <p class="text-xs opacity-70 truncate">{{ tr.artist || "" }}</p>
                <p v-if="tr.album" class="text-[11px] opacity-60 truncate">
                  {{ tr.album }}
                </p>
              </div>

              <!-- Remove -->
              <Button
                icon="pi pi-times"
                severity="secondary"
                rounded
                size="small"
                @click="removeTrack(idx)"
              />
            </div>

            <Button
              size="small"
              :label="t('admin.agenda.add_music')"
              icon="pi pi-plus"
              severity="secondary"
              class="w-full"
              @click="openTrackPicker()"
            />
          </div>
        </div>

        <!-- NOTES -->
        <div>
          <label class="font-semibold text-sm">
            {{ t("admin.agenda.field_notes") }}
          </label>
          <Textarea v-model="draft.notes" class="w-full" rows="4" auto-resize />
        </div>

        <div
          v-if="draft.id && agenda.conflictFor(draft.id)"
          class="p-3 rounded-2xl border border-red-200 bg-red-50"
        >
          <p class="text-sm font-semibold">
            {{ t("admin.agenda.conflict_title") }}
          </p>
          <p class="text-xs opacity-80">
            {{
              t("admin.agenda.conflict_body", {
                count: agenda.conflictFor(draft.id).overlaps.length,
              })
            }}
          </p>
        </div>

        <div class="flex justify-end gap-2 pt-2">
          <Button
            size="small"
            :label="t('admin.agenda.btn_cancel')"
            icon="pi pi-times"
            severity="secondary"
            @click="closeEditDialog()"
          />
          <Button
            size="small"
            :label="t('admin.agenda.btn_save')"
            :style="{
              backgroundColor: 'var(--accent-color)',
              borderColor: 'var(--accent-color)',
              color: 'white',
            }"
            icon="pi pi-save"
            @click="saveDraft()"
          />
        </div>
      </div>

      <audio
        ref="agendaAudioRef"
        class="hidden"
        @ended="onAgendaAudioEnded"
      ></audio>
    </Dialog>

    <!-- DELETE CONFIRM DIALOG -->
    <Dialog
      v-if="canWriteAgenda"
      v-model:visible="showDelete"
      modal
      :header="t('admin.agenda.delete_dialog_title')"
      :style="{ width: '520px', maxWidth: '92vw' }"
    >
      <div class="space-y-3 text-sm">
        <p>
          {{
            t("admin.agenda.delete_confirm", {
              title: deleteTarget?.title || "—",
            })
          }}
        </p>
        <div class="flex justify-end gap-2">
          <Button
            size="small"
            :label="t('admin.agenda.btn_cancel')"
            icon="pi pi-times"
            severity="secondary"
            @click="showDelete = false"
          />
          <Button
            size="small"
            :label="t('admin.agenda.btn_delete')"
            icon="pi pi-trash"
            severity="danger"
            @click="doDelete()"
          />
        </div>
      </div>
    </Dialog>

    <AgendaTrackPickerDialog
      v-if="canWriteAgenda"
      v-model:visible="showTrackPicker"
      @pick="addTrackToDraft"
    />

    <AgendaPrintManager
      v-model:visible="showPrint"
      :items="agenda.sortedItems"
      :guest-label="guestLabel"
      :owner-tag-style="ownerTagStyle"
      :owner-tag-label="ownerTagLabel"
    />

    <!-- NOTE DIALOG -->
    <Dialog
      v-model:visible="showNoteDialog"
      modal
      :header="t('admin.agenda.note_dialog_title')"
      :style="{ width: '520px', maxWidth: '92vw' }"
    >
      <div class="space-y-2">
        <p class="text-sm font-semibold truncate">
          {{ noteTarget?.time ? `${noteTarget.time} — ` : ""
          }}{{ noteTarget?.title || "—" }}
        </p>
        <p class="text-sm whitespace-pre-line opacity-90">
          {{ noteTarget?.notes || "" }}
        </p>
      </div>
    </Dialog>
  </div>
</template>

<script setup>
import { computed, onMounted, onBeforeUnmount, ref, watch } from "vue";

import Card from "primevue/card";
import Button from "primevue/button";
import DataTable from "primevue/datatable";
import Column from "primevue/column";
import Dialog from "primevue/dialog";
import Select from "primevue/select";
import Tag from "primevue/tag";
import InputText from "primevue/inputtext";
import InputMask from "primevue/inputmask";
import InputNumber from "primevue/inputnumber";
import Textarea from "primevue/textarea";
import Timeline from "primevue/timeline";
import AutoComplete from "primevue/autocomplete";
import MultiSelect from "primevue/multiselect";
import SelectButton from "primevue/selectbutton";
import Tooltip from "primevue/tooltip";
import IconField from "primevue/iconfield";
import InputIcon from "primevue/inputicon";
import Message from "primevue/message";
import { useToast } from "primevue/usetoast";
import { FilterService } from "@primevue/core/api";

import AgendaPrintManager from "@/components/admin/agenda/AgendaPrintManager.vue";
import AgendaTrackPickerDialog from "@/components/admin/agenda/AgendaTrackPickerDialog.vue";
import ContentViewer from "@/components/utils/ContentViewer.vue";
import { useAgendaStore } from "@/stores/agendaStore";
import { useGuestDirectoryStore } from "@/stores/guestDirectoryStore";
import { useLang } from "@/composables/useLang";
import { useMeStore } from "@/stores/meStore";
import {
  typeIcon,
  typeColor,
  agendaTypeOptions,
  typeLabelFromMeta,
} from "../../../../shared/agendaTypes";
import {
  ownerTagStyle,
  ownerLabelFromMeta,
  agendaOwnerKeys,
  getOwnerMeta,
} from "../../../../shared/agendaOwners";
import { showApiError } from "@/utils/showApiError";

const agenda = useAgendaStore();
const guestDir = useGuestDirectoryStore();
const me = useMeStore();
const { t, loadLanguage, dict } = useLang();
const toast = useToast();
const vTooltip = Tooltip;
const showSkeleton = computed(
  () => agenda.loading && !(agenda.items || []).length,
);

const selectedRow = ref(null);
const showTemplates = ref(false);
const showPrint = ref(false);
const showDelete = ref(false);
const deleteTarget = ref(null);
const showNoteDialog = ref(false);
const noteTarget = ref(null);
const showEditDialog = ref(false);
const editMode = ref("create"); // create | edit
const draft = ref(null);
const AGENDA_HELP_STORAGE_KEY = "help:agenda:main";

function getInitialHelpVisibility() {
  if (typeof window === "undefined") return true;
  try {
    return window.localStorage.getItem(AGENDA_HELP_STORAGE_KEY) !== "hidden";
  } catch {
    return true;
  }
}

const showHelper = ref(getInitialHelpVisibility());
const showTrackPicker = ref(false);
const viewMode = ref("list"); // list | timeline
const timelineSearch = ref("");
const timelineTag = ref(null);
const timelineType = ref(null);
const isMobile = ref(false);
const agendaAudioRef = ref(null);
const currentAgendaPreviewUrl = ref(null);
const listTableScrollHeight = computed(() =>
  isMobile.value ? "60vh" : "68vh",
);

function closeHelper() {
  showHelper.value = false;
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(AGENDA_HELP_STORAGE_KEY, "hidden");
  } catch {
    // ignore localStorage failures
  }
}

function openHelper() {
  showHelper.value = true;
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(AGENDA_HELP_STORAGE_KEY);
  } catch {
    // ignore localStorage failures
  }
}

const canReadAgenda = computed(() => me.canRead("agenda"));
const canWriteAgenda = computed(() => me.canWrite("agenda"));

if (!FilterService.filters.arrayAny) {
  FilterService.filters.arrayAny = (value, filter) => {
    const needle = String(filter ?? "")
      .trim()
      .toLowerCase();
    if (!needle) return true;
    const arr = Array.isArray(value) ? value : [];
    return arr.some((item) =>
      String(item ?? "")
        .toLowerCase()
        .includes(needle),
    );
  };
}

if (!FilterService.filters.typeAny) {
  FilterService.filters.typeAny = (value, filter) => {
    const selected = Array.isArray(filter) ? filter.filter(Boolean) : [];
    if (!selected.length) return true;
    const types = Array.isArray(value) ? value.filter(Boolean) : [];
    if (!types.length) return false;
    return selected.some((code) => types.includes(code));
  };
}

if (!FilterService.filters.tagAny) {
  FilterService.filters.tagAny = (value, filter) => {
    const selected = Array.isArray(filter) ? filter.filter(Boolean) : [];
    if (!selected.length) return true;
    const tags = Array.isArray(value) ? value.filter(Boolean) : [];
    if (!tags.length) return false;
    return selected.some((code) => tags.includes(code));
  };
}

const visibleRows = computed(() =>
  (agenda.filteredItems || []).filter(Boolean),
);
const hasListSourceRows = computed(() => (agenda.items || []).length > 0);
const hasListFiltersActive = computed(() => !!(agenda.search || "").trim());

const viewModeOptions = computed(() => [
  { label: t("admin.agenda.view_list"), value: "list", icon: "pi pi-list" },
  {
    label: t("admin.agenda.view_timeline"),
    value: "timeline",
    icon: "pi pi-calendar",
  },
]);

const typeOptions = computed(() =>
  agendaTypeOptions({ includeOther: false, t }),
);

function createInitialListTableFilters() {
  return {
    type: { value: null, matchMode: "typeAny" },
    ownerTags: { value: null, matchMode: "tagAny" },
    participants: { value: null, matchMode: "tagAny" },
  };
}

const listTableFilters = ref(createInitialListTableFilters());

const hasListColumnFiltersActive = computed(() => {
  const f = listTableFilters.value || {};
  return Object.values(f).some((m) => {
    const value = m?.value;
    if (Array.isArray(value)) return value.length > 0;
    if (typeof value === "string") return value.trim().length > 0;
    return value !== null && value !== undefined;
  });
});

// owners/tags
const ownerTagSuggestions = ref([]);
const ownerTagQuery = ref("");

const ownerTagAll = computed(() => {
  const set = new Set((agendaOwnerKeys?.() || []).map((x) => String(x).trim()));

  (agenda.items || []).forEach((it) =>
    (it.ownerTags || []).forEach((tag) => set.add(String(tag).trim())),
  );

  (draft.value?.ownerTags || []).forEach((tag) => set.add(String(tag).trim()));

  return Array.from(set)
    .map((x) => String(x).trim())
    .filter(Boolean);
});

function ownerTagLabel(code) {
  return ownerLabelFromMeta(code, t);
}

const tagOptions = computed(() =>
  ownerTagAll.value
    .map((value) => {
      const meta = getOwnerMeta(value);
      return {
        value,
        label: ownerTagLabel(value),
        order: meta.order ?? 999,
      };
    })
    .sort((a, b) => a.order - b.order || a.label.localeCompare(b.label)),
);

async function withApiToast(fn) {
  try {
    return await fn();
  } catch (e) {
    console.error(e);

    // éviter double toast si ça repasse par un catch au-dessus
    if (!e?._toastShown) {
      showApiError(t, toast, e);
      try {
        e._toastShown = true;
      } catch {}
    }

    throw e;
  }
}

// participants
const participantSuggestions = ref([]);
const participantQuery = ref("");

const attendingGuestOptions = computed(() => {
  const rows = guestDir.items || [];
  return rows
    .filter((r) => r.attending === true)
    .map((r) => ({
      label: r.fullName || "—",
      value: r.guestId,
    }))
    .sort((a, b) => a.label.localeCompare(b.label));
});

const attendingGuestLabelMap = computed(() => {
  const m = new Map();
  attendingGuestOptions.value.forEach((o) => m.set(o.value, o.label));
  return m;
});

function guestLabel(idOrName) {
  const s = String(idOrName || "").trim();
  if (!s) return "—";

  if (s.startsWith("name:")) return s.slice(5).trim() || "—";

  if (attendingGuestLabelMap.value.has(s))
    return attendingGuestLabelMap.value.get(s);

  return s; // fallback
}

function normalizeParticipantToOption(v) {
  if (!v) return null;

  // string libre tapée
  if (typeof v === "string") {
    const s = v.trim();
    if (!s) return null;

    if (s.startsWith("name:")) {
      const label = s.slice(5).trim();
      if (!label) return null;
      return {
        label,
        value: `name:${label}`,
        __key: `name:${label.toLowerCase()}`,
      };
    }

    // si c'est un guestId connu, garde id
    if (attendingGuestLabelMap.value.has(s)) {
      return { label: guestLabel(s), value: s, __key: `id:${s}` };
    }

    // sinon texte libre -> name:
    return { label: s, value: `name:${s}`, __key: `name:${s.toLowerCase()}` };
  }

  // objet PrimeVue {label,value}
  if (typeof v === "object") {
    const value = String(v.value ?? "").trim();
    const label = String(v.label ?? "").trim();

    if (value) {
      // si value est un guestId
      if (!value.startsWith("name:")) {
        return {
          label: label || guestLabel(value),
          value,
          __key: `id:${value}`,
        };
      }
      // value est déjà name:...
      const cleanLabel = value.slice(5).trim() || label;
      if (!cleanLabel) return null;
      return {
        label: cleanLabel,
        value: `name:${cleanLabel}`,
        __key: `name:${cleanLabel.toLowerCase()}`,
      };
    }

    // si pas de value, on retombe sur label -> name:
    if (!label) return null;
    return {
      label,
      value: `name:${label}`,
      __key: `name:${label.toLowerCase()}`,
    };
  }

  return null;
}

const participantAll = computed(() => {
  const map = new Map(); // key -> {label,value}

  // 1) RSVP "oui" -> value = guestId, label = nom
  (attendingGuestOptions.value || []).forEach((o) => {
    const id = String(o.value || "").trim();
    const label = String(o.label || "").trim();
    if (!id) return;
    map.set(`id:${id}`, { label, value: id });
  });

  // 2) déjà en DB (id ou name:...)
  (agenda.items || []).forEach((it) => {
    (it.participants || []).forEach((p) => {
      const s = String(p || "").trim();
      if (!s) return;

      if (s.startsWith("name:")) {
        const label = s.slice(5).trim();
        if (!label) return;
        map.set(`name:${label.toLowerCase()}`, {
          label,
          value: `name:${label}`,
        });
      } else {
        // supposé être un guestId
        const id = s;
        const label = guestLabel(id);
        map.set(`id:${id}`, { label, value: id });
      }
    });
  });

  // 3) déjà dans draft
  (draft.value?.participants || []).forEach((p) => {
    const opt = normalizeParticipantToOption(p);
    if (!opt) return;
    map.set(opt.__key, { label: opt.label, value: opt.value });
  });

  return Array.from(map.values()).sort((a, b) =>
    a.label.localeCompare(b.label),
  );
});

// types autocomplete
const typeSuggestions = ref([]);
const typeQuery = ref("");

function typeLabelValue(v) {
  const code = String(v || "").trim();
  return typeLabelFromMeta(code, t) || code || "—";
}

function pickTypeString(v) {
  if (typeof v === "string") return v;
  if (v && typeof v === "object") return v.value ?? v.label ?? "";
  return "";
}

function normalizeTypes(arr) {
  const raw = Array.isArray(arr) ? arr : [];
  const normalized = raw
    .map((x) => String(pickTypeString(x) ?? "").trim())
    .filter((x) => x && x !== "-" && x !== "—");

  // dédoublonnage case-insensitive
  const map = new Map();
  for (const x of normalized) map.set(x.toLowerCase(), x);
  return Array.from(map.values());
}

const typeStandard = computed(() =>
  (agendaTypeOptions({ includeOther: false, t }) || [])
    .map((o) => String(o.value).trim())
    .filter(Boolean),
);

const typeAll = computed(() => {
  const set = new Set(typeStandard.value);

  (agenda.items || []).forEach((it) => {
    (Array.isArray(it.type) ? it.type : []).forEach((tp) =>
      set.add(String(tp).trim()),
    );
  });

  (draft.value?.type || []).forEach((tp) =>
    set.add(String(pickTypeString(tp)).trim()),
  );

  return Array.from(set)
    .filter(Boolean)
    .sort((a, b) => typeLabelValue(a).localeCompare(typeLabelValue(b)));
});

// --- table interactions
function onRowSelect(e) {
  if (!canWriteAgenda.value) return;
  const row = e?.data;
  if (row?.id) openEditDialog(row);
}

async function onRowReorder(e) {
  if (!canWriteAgenda.value) return;
  if (!agenda.isReorderEnabled) return;

  const newRows = Array.isArray(e.value) ? e.value : [];
  const orderedIds = newRows.map((x) => x?.id).filter(Boolean);
  await agenda.reorderVisible(orderedIds);
}

// --- delete
function confirmDelete(row) {
  if (!canWriteAgenda.value) return;

  deleteTarget.value = row;
  showDelete.value = true;
}

async function doDelete() {
  if (!deleteTarget.value?.id) return;

  const deletingId = deleteTarget.value.id;
  const deletingTitle = deleteTarget.value?.title || "—";

  showDelete.value = false;
  deleteTarget.value = null;
  if (selectedRow.value?.id === deletingId) selectedRow.value = null;

  try {
    await withApiToast(() => agenda.deleteItem(deletingId));
    toast.add({
      severity: "success",
      summary: t("admin.toast.deleted_title"),
      detail: t("admin.toast.agenda_deleted", { title: deletingTitle }),
      life: 2500,
    });
  } catch (e) {
    console.error("doDelete error:", e);
  }
}

// --- ajoute templates
async function seed(key) {
  if (!canWriteAgenda.value) return;

  try {
    await withApiToast(() => agenda.seedTemplate(key, t));
    showTemplates.value = false;

    toast.add({
      severity: "success",
      summary: t("admin.toast.saved_title"),
      detail: t("admin.toast.agenda_template_added"),
      life: 2500,
    });
  } catch (e) {
    // withApiToast a déjà affiché le toast d’erreur
    console.error("seed template failed:", e);
  }
}

// --- timeline
const timelineItems = computed(() => {
  const q = String(timelineSearch.value || "")
    .trim()
    .toLowerCase();

  return (agenda.sortedItems || []).filter((it) => {
    if (timelineType.value) {
      const types = Array.isArray(it.type) ? it.type : [];
      if (!types.includes(timelineType.value)) return false;
    }
    if (
      timelineTag.value &&
      !(it.ownerTags || []).includes(timelineTag.value)
    ) {
      return false;
    }

    if (!q) return true;

    const hay = [
      it.time,
      it.title,
      ...(Array.isArray(it.type) ? it.type : []),
      it.location,
      it.notes,
      ...(it.ownerTags || []),
      ...(it.participants || []),
      ...(it.trackRefs || []).map(
        (tr) => `${tr.title || ""} ${tr.artist || ""}`,
      ),
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    return hay.includes(q);
  });
});
const hasTimelineRows = computed(() => timelineItems.value.length > 0);
const hasTimelineSourceRows = computed(
  () => (agenda.sortedItems || []).length > 0,
);
const hasTimelineFiltersActive = computed(
  () =>
    !!(
      (timelineSearch.value || "").trim() ||
      timelineType.value ||
      timelineTag.value
    ),
);

// --- dialogs create/edit
const editDialogHeader = computed(() =>
  editMode.value === "create"
    ? t("admin.agenda.edit_create_title")
    : t("admin.agenda.edit_edit_title"),
);

function makeEmptyDraft() {
  return {
    id: null,
    time: "",
    durationMin: null,
    title: "",
    type: [],
    location: "",
    notes: "",
    ownerTags: [],
    trackRefs: [],
    participants: [],
  };
}

function normalizeDraft(obj) {
  const d = JSON.parse(JSON.stringify(obj || {}));

  d.time = d.time || "";
  d.durationMin =
    typeof d.durationMin === "number" ? d.durationMin : (d.durationMin ?? null);
  d.title = d.title || "";
  d.type = normalizeTypes(Array.isArray(d.type) ? d.type : []);
  d.location = d.location || "";
  d.notes = d.notes || "";

  d.ownerTags = Array.isArray(d.ownerTags) ? d.ownerTags : [];
  d.trackRefs = Array.isArray(d.trackRefs) ? d.trackRefs : [];

  d.participants = normalizeParticipants(d.participants);

  return d;
}

function openCreateDialog() {
  if (!canWriteAgenda.value) return;

  editMode.value = "create";
  draft.value = makeEmptyDraft();
  showEditDialog.value = true;
}

function openEditDialog(row) {
  if (!canWriteAgenda.value) return;

  editMode.value = "edit";
  draft.value = normalizeDraft(row);
  showEditDialog.value = true;
}

function closeEditDialog() {
  showEditDialog.value = false;
  draft.value = null;
}

watch(
  () => showEditDialog.value,
  (vis) => {
    if (!vis) draft.value = null;
  },
);

async function saveDraft() {
  if (!canWriteAgenda.value) return;
  if (!draft.value) return;

  const payload = {
    time: draft.value.time,
    durationMin: draft.value.durationMin,
    title: draft.value.title,
    type: normalizeTypes(draft.value.type),
    notes: draft.value.notes,
    trackRefs: draft.value.trackRefs || [],
    location: draft.value.location || "",
    ownerTags: (draft.value.ownerTags || [])
      .map((x) =>
        String(typeof x === "string" ? x : (x?.value ?? x?.label ?? ""))
          .trim()
          .toUpperCase(),
      )
      .filter(Boolean),
    participants: (draft.value.participants || [])
      .map((x) => normalizeParticipantToOption(x))
      .filter(Boolean)
      .map((o) => o.value),
  };

  try {
    if (editMode.value === "create") {
      const newId = await withApiToast(() => agenda.createItem(payload));

      selectedRow.value =
        (agenda.items || []).find((x) => x?.id === newId) || null;

      toast.add({
        severity: "success",
        summary: t("admin.toast.saved_title"),
        detail: t("admin.toast.agenda_created"),
        life: 2500,
      });
    } else {
      if (!draft.value.id) return;
      await withApiToast(() => agenda.updateItem(draft.value.id, payload));
      selectedRow.value =
        (agenda.items || []).find((x) => x?.id === draft.value.id) || null;

      toast.add({
        severity: "success",
        summary: t("admin.toast.saved_title"),
        detail: t("admin.toast.agenda_updated"),
        life: 2500,
      });
    }

    showEditDialog.value = false;
  } catch (e) {
    console.error("saveDraft error:", e);
  }
}

// --- note dialog
function openNoteDialog(row) {
  noteTarget.value = row || null;
  showNoteDialog.value = true;
}

watch(
  () => showNoteDialog.value,
  (vis) => {
    if (!vis) noteTarget.value = null;
  },
);

// --- owners autocomplete (free text)
function searchOwnerTags(e) {
  ownerTagQuery.value = String(e?.query || "").trim();
  const q = ownerTagQuery.value.toLowerCase();

  const list = !q
    ? ownerTagAll.value
    : ownerTagAll.value.filter((t) => t.toLowerCase().includes(q));

  ownerTagSuggestions.value = list.slice(0, 12);
}

function commitOwnerTagFree(text) {
  const v = String(text || "")
    .trim()
    .toUpperCase();
  if (!v || !draft.value) return;

  const current = Array.isArray(draft.value.ownerTags)
    ? draft.value.ownerTags
    : [];
  const normalized = current.map((x) => String(x).trim()).filter(Boolean);

  const exists = normalized.some((x) => x.toLowerCase() === v.toLowerCase());
  if (!exists) normalized.push(v);

  draft.value.ownerTags = normalized;
  ownerTagSuggestions.value = ownerTagAll.value.slice(0, 12);
  ownerTagQuery.value = "";
}

function onOwnerTagKeydown(ev) {
  if (ev.key !== "Enter") return;
  ev.preventDefault();
  ev.stopPropagation();

  const raw = ownerTagQuery.value || ev?.target?.value;
  commitOwnerTagFree(raw);

  if (ev?.target) ev.target.value = "";
}

// --- participants autocomplete (free text)
function searchParticipants(e) {
  participantQuery.value = String(e?.query || "").trim();
  const q = participantQuery.value.toLowerCase();

  const list = participantAll.value || [];

  participantSuggestions.value = !q
    ? list.slice(0, 15)
    : list.filter((o) => o.label.toLowerCase().includes(q)).slice(0, 15);
}

function onParticipantSelected() {
  participantQuery.value = "";
}

function commitParticipantFree(text) {
  const v = String(text || "").trim();
  if (!v || !draft.value) return;

  const arr = Array.isArray(draft.value.participants)
    ? draft.value.participants
    : [];
  const normalized = arr.map((x) => String(x).trim()).filter(Boolean);

  const exists = normalized.some((x) => x.toLowerCase() === v.toLowerCase());
  if (!exists) normalized.push(v);

  draft.value.participants = normalized;
  participantSuggestions.value = participantAll.value.slice(0, 15);
  participantQuery.value = "";
}

function onParticipantKeydown(ev) {
  if (ev.key !== "Enter") return;
  ev.preventDefault();
  ev.stopPropagation();

  const raw = participantQuery.value || ev?.target?.value;
  commitParticipantFree(raw);

  if (ev?.target) ev.target.value = "";
}

// --- types autocomplete (free text)
function searchTypes(e) {
  typeQuery.value = String(e?.query || "").trim();
  const q = typeQuery.value.toLowerCase();

  if (!q) {
    typeSuggestions.value = typeAll.value.slice(0, 12);
    return;
  }

  typeSuggestions.value = typeAll.value
    .filter((tp) => typeLabelValue(tp).toLowerCase().includes(q))
    .slice(0, 12);
}

function onTypeSelected() {
  typeQuery.value = "";
  if (draft.value) draft.value.type = normalizeTypes(draft.value.type);
}

function commitTypeFree(text) {
  const v = String(text || "").trim();
  if (!v || !draft.value) return;

  const current = Array.isArray(draft.value.type) ? draft.value.type : [];
  draft.value.type = normalizeTypes([...current, v]);

  typeSuggestions.value = typeAll.value.slice(0, 12);
  typeQuery.value = "";
}

function onTypeKeydown(ev) {
  if (ev.key !== "Enter") return;
  ev.preventDefault();
  ev.stopPropagation();

  const raw = typeQuery.value || ev?.target?.value;
  if (!String(raw || "").trim()) return;

  commitTypeFree(raw);

  if (ev?.target) ev.target.value = "";
}

// --- templates UI
function getDictValue(path) {
  const parts = String(path || "")
    .split(".")
    .filter(Boolean);
  let cur = dict.value;
  for (const p of parts) {
    if (cur && typeof cur === "object" && p in cur) {
      cur = cur[p];
    } else {
      return undefined;
    }
  }
  return cur;
}

function getPresetItems(key) {
  const raw = getDictValue(`admin.agenda.presets.${key}.items`);
  if (!Array.isArray(raw)) return [];
  return raw
    .map((row) => ({
      time: String(row?.time || "").trim(),
      title: String(row?.title || "").trim(),
    }))
    .filter((it) => it.time || it.title);
}

const templatesUi = computed(() => [
  {
    key: "CEREMONY",
    title: t("admin.agenda.presets.CEREMONY.title"),
    icon: "pi pi-heart",
    items: getPresetItems("CEREMONY"),
  },
  {
    key: "COCKTAIL",
    title: t("admin.agenda.presets.COCKTAIL.title"),
    icon: "pi pi-trophy",
    items: getPresetItems("COCKTAIL"),
  },
  {
    key: "DINNER",
    title: t("admin.agenda.presets.DINNER.title"),
    icon: "pi pi-apple",
    items: getPresetItems("DINNER"),
  },
  {
    key: "PARTY",
    title: t("admin.agenda.presets.PARTY.title"),
    icon: "pi pi-star",
    items: getPresetItems("PARTY"),
  },
]);

// --- audio preview controls
function isPreviewPlaying(url) {
  return !!url && currentAgendaPreviewUrl.value === url;
}

function stopPreview() {
  const audio = agendaAudioRef.value;
  if (!audio) return;
  audio.pause();
  audio.removeAttribute("src");
  audio.load();
  currentAgendaPreviewUrl.value = null;
}

function togglePreview(url) {
  if (!url) return;
  const audio = agendaAudioRef.value;
  if (!audio) return;

  if (currentAgendaPreviewUrl.value === url && !audio.paused) {
    stopPreview();
    return;
  }

  currentAgendaPreviewUrl.value = url;
  audio.src = url;
  audio.play().catch(() => {
    currentAgendaPreviewUrl.value = null;
  });
}

function onAgendaAudioEnded() {
  currentAgendaPreviewUrl.value = null;
}

watch(
  () => showEditDialog.value,
  (vis) => {
    if (!vis) stopPreview();
  },
);

function removeTrack(idx) {
  if (!draft.value) return;

  const arr = Array.isArray(draft.value.trackRefs) ? draft.value.trackRefs : [];
  const removed = arr[idx];

  if (removed?.previewUrl && isPreviewPlaying(removed.previewUrl))
    stopPreview();

  arr.splice(idx, 1);
  draft.value.trackRefs = arr;
}

function openTrackPicker() {
  showTrackPicker.value = true;
}

function addTrackToDraft(trackRef) {
  if (!draft.value) return;
  const arr = Array.isArray(draft.value.trackRefs) ? draft.value.trackRefs : [];
  const exists = arr.some(
    (t) => String(t.id) === String(trackRef.id) && t.source === trackRef.source,
  );
  if (!exists) arr.push(trackRef);
  draft.value.trackRefs = arr;
}

// --- responsive + lifecycle
function updateIsMobile() {
  isMobile.value = window.matchMedia("(max-width: 960px)").matches;
}

function pickParticipantString(v) {
  if (typeof v === "string") return v;
  if (v && typeof v === "object") return v.value ?? v.label ?? "";
  return "";
}

function normalizeParticipants(arr) {
  const raw = Array.isArray(arr) ? arr : [];
  const out = raw
    .map((x) => String(pickParticipantString(x) || "").trim())
    .filter(Boolean);

  // dédoublonnage case-insensitive
  const m = new Map();
  for (const x of out) m.set(x.toLowerCase(), x);
  return Array.from(m.values());
}

function participantChipLabel(v) {
  const opt = normalizeParticipantToOption(v);
  if (opt?.label) return opt.label;

  // fallback (si jamais)
  return guestLabel(typeof v === "string" ? v : "");
}

const timelineAlign = computed(() => (isMobile.value ? "left" : "alternate"));

watch(
  () => viewMode.value,
  (mode) => {
    if (mode === "timeline") timelineSearch.value = agenda.search || "";
  },
);

onMounted(async () => {
  try {
    await loadLanguage();
    if (canReadAgenda.value || canWriteAgenda.value) {
      // pour agenda, tu veux juste ceux qui peuvent être participants
      await guestDir.load({ scope: "ONLY_ATTENDING" });
    }
    if (!agenda.items?.length) await agenda.loadAgenda();
  } catch (e) {
    console.error("[AgendaSection] mounted failed:", e);
  }
});

onMounted(() => {
  updateIsMobile();
  window.addEventListener("resize", updateIsMobile);

  // legacy list filters (moved to column filters)
  agenda.filterType = null;
  agenda.filterTag = null;
});

onBeforeUnmount(() => {
  window.removeEventListener("resize", updateIsMobile);
});
</script>

<style scoped>
@media screen and (max-width: 960px) {
  :deep(.customized-timeline) .p-timeline-event-content {
    min-width: 0;
  }

  :deep(.customized-timeline) .p-timeline-event-content .p-card {
    width: 100%;
    max-width: 100%;
    overflow: hidden;
  }
  :deep(.p-timeline-event-opposite),
  .edit-button {
    display: none !important;
  }
  :deep(.p-card-title) {
    font-size: small;
  }
}

:deep(.admin-datatable.is-writable .p-datatable-tbody > tr) {
  cursor: pointer;
}

:deep(.admin-datatable.is-readonly .p-datatable-tbody > tr) {
  cursor: default;
}

:deep(.admin-datatable.is-writable .p-datatable-tbody > tr:hover) {
  background-color: rgba(0, 0, 0, 0.03);
}

:deep(.admin-datatable.is-readonly .p-datatable-tbody > tr:hover) {
  background-color: transparent;
}

:deep(.admin-datatable .p-datatable-tbody > tr:hover) {
  background-color: rgba(0, 0, 0, 0.03);
}

:deep(.p-card) {
  box-shadow: none !important;
  border: 2px solid var(--accent-color);
}

:deep(.agenda-filter-multiselect .p-multiselect-label) {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.25rem;
  white-space: normal;
}

:deep(.agenda-filter-multiselect .p-multiselect-token) {
  width: 100%;
  max-width: 100%;
}
</style>
