<!-- src/components/admin/menus/MenusSection.vue -->
<template>
  <Card
    v-if="canReadMenus"
    :style="{ border: '1px solid var(--accent-color)' }"
  >
    <template #title>
      <div class="flex items-center gap-2">
        <p class="admin-bento-title">
          <i class="pi pi-list text-sm" aria-hidden="true" />
          {{ t("admin.menus.title") }}
        </p>
      </div>
    </template>

    <template #content>
      <div v-if="showSkeleton" class="space-y-4">
        <div class="flex flex-wrap gap-2 justify-end mb-4">
          <Skeleton width="10rem" height="2.25rem" border-radius="999px" />
          <Skeleton width="10rem" height="2.25rem" border-radius="999px" />
        </div>

        <div class="grid grid-cols-1 md:grid-cols-5 gap-3 mb-4">
          <Skeleton v-for="n in 5" :key="n" width="100%" height="5.75rem" />
        </div>

        <Skeleton width="100%" height="8rem" class="mb-4" />
        <Skeleton width="100%" height="20rem" />
      </div>

      <div v-else>
        <div class="flex flex-wrap gap-2 justify-end mb-4">
          <Button
            size="small"
            icon="pi pi-download"
            :label="t('admin.menuspfd.button')"
            text
            severity="secondary"
            @click="menusPrintRef?.downloadMenusPdf?.()"
            class="!text-[var(--text-color)]"
          />

          <Button
            icon="pi pi-download"
            size="small"
            severity="secondary"
            :label="t('admin.dietpdf.button')"
            text
            @click="downloadDietPdf"
            class="!text-[var(--text-color)]"
          />
        </div>

        <!-- SUMMARY -->
        <div class="grid grid-cols-1 md:grid-cols-5 gap-3 mb-4">
          <Card class="admin-kpi-card">
            <template #content>
              <p class="text-xs opacity-70 mb-2 uppercase">
                {{ t("admin.menus.summary_attending") }}
              </p>
              <p class="text-2xl">{{ attendingRows.length }}</p>
            </template>
          </Card>

          <Card class="admin-kpi-card">
            <template #content>
              <p class="text-xs opacity-70 mb-2 uppercase">
                {{ t("admin.diet.dialog_with_diet") }}
              </p>
              <p class="text-2xl">{{ attendeesWithDiet }}</p>
            </template>
          </Card>

          <Card class="admin-kpi-card">
            <template #content>
              <p class="text-xs opacity-70 mb-2 uppercase">
                {{ t("admin.menus.summary_assigned") }}
              </p>
              <p class="text-2xl">{{ totalMenusAssigned }}</p>
            </template>
          </Card>

          <Card class="admin-kpi-card">
            <template #content>
              <p class="text-xs opacity-70 mb-2 uppercase">
                {{ t("admin.menus.summary_unassigned") }}
              </p>
              <p class="text-2xl">{{ counts.unassigned }}</p>
            </template>
          </Card>

          <Card class="admin-kpi-card">
            <template #content>
              <p class="text-xs opacity-70 mb-2 uppercase">
                {{ t("admin.menus.summary_review") }}
              </p>
              <p class="text-2xl">{{ counts.needsReview }}</p>
            </template>
          </Card>
        </div>

        <!-- BY MENU -->
        <Card
          ref="byMenuCardEl"
          :style="{ border: '1px solid var(--accent-color)' }"
          class="mb-4 transition"
          :class="
            byMenuIsHighlighted
              ? 'ring-2 ring-[var(--accent-color)] shadow-sm'
              : ''
          "
        >
          <template #title>
            <div class="flex items-center justify-between gap-3">
              <p class="admin-bento-title">
                <i class="pi pi-list" aria-hidden="true"></i>
                {{ t("admin.menus.summary_by_menu") }}
              </p>

              <Button
                v-if="assignFilters.menuFilterKey.value"
                size="small"
                severity="secondary"
                text
                icon="pi pi-times"
                :label="t('common.clear', 'Limpiar')"
                @click="clearMenuFilter()"
              />
            </div>
          </template>
          <template #content>
            <div v-if="!menuCountsList.length" class="text-sm opacity-70">
              —
            </div>

            <div v-else class="admin-menus-metrics">
              <div
                v-for="it in menuCountsList"
                :key="it.id"
                class="admin-rsvp-metric cursor-pointer select-none transition"
                role="button"
                tabindex="0"
                :class="
                  it.id === assignFilters.menuFilterKey.value
                    ? 'ring-2 ring-[var(--accent-color)] bg-white'
                    : ''
                "
                @click="onClickMenuChip(it.id)"
                @keydown.enter.prevent="onClickMenuChip(it.id)"
                @keydown.space.prevent="onClickMenuChip(it.id)"
              >
                <span class="admin-rsvp-metric__label">{{ it.name }}</span>
                <strong class="admin-rsvp-metric__value">{{ it.count }}</strong>
              </div>
            </div>
          </template>
        </Card>

        <Tabs v-model:value="tabValue">
          <TabList>
            <Tab value="assign">{{ t("admin.menus.assign") }}</Tab>
            <Tab value="menus">{{ t("admin.menus.menus") }}</Tab>
            <Tab value="tables">{{ t("admin.menus.tables") }}</Tab>
            <Tab value="diet"> {{ t("admin.menus.diet") }}</Tab>
          </TabList>

          <TabPanels>
            <!-- ASSIGN -->
            <TabPanel value="assign">
              <div v-if="!showAssignHelp" class="flex justify-end">
                <Button
                  text
                  rounded
                  size="small"
                  icon="pi pi-info-circle"
                  severity="secondary"
                  class="p-0"
                  aria-label="Help"
                  @click="openAssignHelp"
                />
              </div>
              <Message
                v-if="showAssignHelp"
                severity="info"
                closable
                @close="closeAssignHelp"
              >
                <div class="text-xs text-left space-y-2">
                  <p>
                    {{
                      t(
                        "admin.menus.assign_hint",
                        "Gestiona la asignación de menús por invitado. Primero crea los menús y las restricciones que cubren en la pestaña Menús; luego se asignan automáticamente a los invitados. Usa los filtros para revisar casos especiales y ajustar manualmente.",
                      )
                    }}
                  </p>
                </div>
              </Message>

              <div
                class="flex flex-col md:flex-row gap-2 md:items-center md:justify-between my-4"
              >
                <Select
                  v-model="tableFilter"
                  :options="tableFilterOptions"
                  option-label="label"
                  option-value="value"
                  show-clear
                  class="w-full md:w-72"
                  :placeholder="t('admin.menus.filter_by_table')"
                />
              </div>

              <DataTable
                v-model:filters="assignFilters"
                :value="tableScopedRows"
                data-key="guestId"
                :show-headers="tableScopedRows.length > 0"
                paginator
                :rows="assignTableRows"
                :rows-per-page-options="assignRowsPerPageOptions"
                filter-display="row"
                responsive-layout="scroll"
                size="small"
                class="admin-datatable"
                @page="onAssignTablePage"
              >
                <!-- Name -->
                <Column
                  field="fullName"
                  :header="t('admin.responses.name')"
                  sortable
                  filter
                  filter-match-mode="contains"
                  :show-filter-menu="false"
                >
                  <template #body="{ data }">
                    <div class="text-sm">
                      {{ data.fullName || "—" }}
                    </div>
                  </template>
                  <template #filter="{ filterModel, filterCallback }">
                    <InputText
                      v-model="filterModel.value"
                      class="w-full text-sm"
                      :placeholder="t('admin.responses.name')"
                      @input="filterCallback()"
                    />
                  </template>
                </Column>

                <!-- Diet -->
                <Column
                  field="dietCodesNormalized"
                  :header="t('admin.responses.restrictions')"
                  style="min-width: 260px"
                  filter
                  filter-match-mode="dietAny"
                  :show-filter-menu="false"
                >
                  <template #body="{ data }">
                    <div v-if="hasDiet(data)" class="flex flex-wrap gap-1">
                      <span
                        v-for="b in getDietBadgesForRow(data)"
                        :key="b.key"
                        class="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[0.7rem] bg-amber-50 text-amber-800 border border-amber-200"
                        :title="b.key === 'other' ? b.label : ''"
                      >
                        <img
                          v-if="b.icon"
                          :src="b.icon"
                          alt=""
                          class="w-4 h-4 object-contain"
                        />
                        <span class="truncate max-w-[180px]">{{
                          b.label
                        }}</span>
                      </span>
                    </div>
                    <span v-else class="text-sm opacity-60">—</span>
                  </template>
                  <template #filter="{ filterModel, filterCallback }">
                    <MultiSelect
                      v-model="filterModel.value"
                      :options="dietFilterOptions"
                      option-label="label"
                      option-value="value"
                      show-clear
                      display="chip"
                      class="w-full menus-diet-filter"
                      :placeholder="t('admin.responses.restrictions')"
                      @update:model-value="filterCallback()"
                    >
                      <template #option="{ option }">
                        <div class="flex items-center gap-2 w-full">
                          <span
                            class="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[0.7rem] bg-amber-50 text-amber-800 border border-amber-200"
                          >
                            <img
                              v-if="option.icon"
                              :src="option.icon"
                              alt=""
                              class="w-4 h-4 object-contain"
                            />
                            <span class="truncate">{{ option.label }}</span>
                          </span>
                        </div>
                      </template>

                      <template #chip="{ value, removeCallback }">
                        <span
                          class="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[0.7rem] bg-amber-50 text-amber-800 border border-amber-200"
                        >
                          <img
                            v-if="
                              dietFilterOptionByValue.get(String(value))?.icon
                            "
                            :src="
                              dietFilterOptionByValue.get(String(value))?.icon
                            "
                            alt=""
                            class="w-4 h-4 object-contain"
                          />
                          <span class="truncate max-w-[160px]">{{
                            dietFilterOptionByValue.get(String(value))?.label ||
                              String(value)
                          }}</span>
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
                    </MultiSelect>
                  </template>
                </Column>

                <!-- Menu -->
                <Column
                  field="menuFilterKey"
                  :header="t('admin.menus.menu', 'Menú')"
                  style="min-width: 220px"
                  filter
                  filter-match-mode="equals"
                  :show-filter-menu="false"
                >
                  <template #body="{ data }">
                    <div class="flex items-center gap-2" @click.stop>
                      <template v-if="canWriteMenus">
                        <Select
                          :model-value="assignmentFor(data)?.menuId ?? null"
                          :options="menuOptions"
                          option-label="label"
                          option-value="value"
                          class="w-full"
                          :placeholder="t('admin.menus.select_menu')"
                          @update:model-value="(val) => onMenuChange(data, val)"
                        />
                      </template>

                      <template v-else>
                        <span class="text-sm opacity-80">
                          {{
                            (() => {
                              const a = assignmentFor(data);
                              const m = a?.menuId
                                ? menusStore.menuById(a.menuId)
                                : null;
                              return m?.name || "—";
                            })()
                          }}
                        </span>
                      </template>
                    </div>
                  </template>
                  <template #filter="{ filterModel, filterCallback }">
                    <Select
                      v-model="filterModel.value"
                      :options="menuColumnFilterOptions"
                      option-label="label"
                      option-value="value"
                      show-clear
                      append-to="body"
                      class="w-full"
                      :placeholder="t('admin.menus.menu', 'Menú')"
                      @update:model-value="filterCallback()"
                    >
                      <template #value="{ value, placeholder }">
                        <span v-if="!value" class="opacity-60">{{
                          placeholder
                        }}</span>

                        <span
                          v-else
                          class="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[0.7rem] bg-amber-50 text-amber-800 border border-amber-200 w-full justify-between"
                        >
                          <span class="truncate">
                            {{ menuFilterLabelByValue(value) }}
                          </span>
                        </span>
                      </template>

                      <template #option="{ option }">
                        <span
                          class="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[0.7rem] bg-amber-50 text-amber-800 border border-amber-200"
                        >
                          <span class="truncate">{{ option.label }}</span>
                        </span>
                      </template>
                    </Select>
                  </template>
                </Column>

                <!-- Status -->
                <Column
                  field="assignmentStatus"
                  :header="t('admin.menus.status')"
                  style="width: 200px"
                  filter
                  filter-match-mode="equals"
                  :show-filter-menu="false"
                >
                  <template #body="{ data }">
                    <template
                      v-if="assignmentFor(data)?.status === 'needs_review'"
                    >
                      <span
                        class="flex flex-col gap-1 px-2 rounded py-0.5 text-xs border"
                        :class="statusClass(assignmentFor(data))"
                      >
                        {{ statusLabel(assignmentFor(data)) }}
                        <span class="opacity-70">
                          {{ reviewReasonLabel(assignmentFor(data)?.reason) }}
                        </span>
                      </span>
                    </template>

                    <template v-else>
                      <span
                        class="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs border"
                        :class="statusClass(assignmentFor(data))"
                      >
                        {{ statusLabel(assignmentFor(data)) }}
                      </span>
                    </template>
                  </template>
                  <template #filter="{ filterModel, filterCallback }">
                    <Select
                      v-model="filterModel.value"
                      :options="statusFilterOptions"
                      option-label="label"
                      option-value="value"
                      show-clear
                      append-to="body"
                      class="w-full"
                      :placeholder="t('admin.menus.status')"
                      @update:model-value="filterCallback()"
                    >
                      <template #value="{ value, placeholder }">
                        <span v-if="!value" class="opacity-60">{{
                          placeholder
                        }}</span>

                        <span
                          v-else
                          class="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs border w-full justify-between"
                          :class="statusClass({ status: value })"
                        >
                          <span class="truncate">
                            {{ statusLabel({ status: value }) }}
                          </span>
                        </span>
                      </template>

                      <template #option="{ option }">
                        <span
                          class="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs border"
                          :class="statusClass({ status: option.value })"
                        >
                          <span class="truncate">{{ option.label }}</span>
                        </span>
                      </template>
                    </Select>
                  </template>
                </Column>

                <template #empty>
                  <ContentViewer
                    class="my-3"
                    :show-no-results="assignHasActiveFilters"
                    :no-results-text="t('common.no_results')"
                    :empty-text="
                      t(
                        'admin.menus.assign_empty',
                        'No hay invitados para mostrar.',
                      )
                    "
                  />
                </template>
              </DataTable>
            </TabPanel>

            <!-- MENUS -->
            <TabPanel value="menus">
              <div v-if="!showMenusHelp" class="flex justify-end">
                <Button
                  text
                  rounded
                  size="small"
                  icon="pi pi-info-circle"
                  severity="secondary"
                  class="p-0"
                  aria-label="Help"
                  @click="openMenusHelp"
                />
              </div>
              <Message
                v-if="showMenusHelp"
                severity="info"
                closable
                @close="closeMenusHelp"
              >
                <div class="text-xs text-left space-y-2">
                  <p>
                    {{ t("admin.menus.menus_hint") }}
                  </p>
                </div>
              </Message>

              <div
                class="flex items-center justify-end gap-2 my-4"
                v-if="canWriteMenus"
              >
                <Button
                  icon="pi pi-plus"
                  size="small"
                  :label="t('admin.menus.add_menu')"
                  :style="{
                    backgroundColor: 'var(--accent-color)',
                    borderColor: 'var(--accent-color)',
                    color: 'white',
                  }"
                  @click="openMenuEditor(null)"
                />
              </div>

              <DataTable
                :value="menusStore.menus"
                data-key="id"
                :show-headers="(menusStore.menus || []).length > 0"
                responsive-layout="scroll"
                size="small"
              >
                <Column field="name" :header="t('admin.menus.name')" sortable>
                  <template #body="{ data }">
                    <div class="text-sm">
                      {{ data.name || "—" }}
                    </div>
                  </template>
                </Column>

                <Column
                  :header="t('admin.menus.covers')"
                  style="min-width: 260px"
                >
                  <template #body="{ data }">
                    <div class="flex flex-wrap gap-1">
                      <span
                        v-for="b in getDietBadgesForMenu(data)"
                        :key="b.key"
                        class="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[0.7rem] bg-amber-50 text-amber-800 border border-amber-200"
                      >
                        <img
                          v-if="b.icon"
                          :src="b.icon"
                          alt=""
                          class="w-4 h-4 object-contain"
                        />
                        <span class="truncate max-w-[180px]">{{
                          t(b.i18nKey)
                        }}</span>
                      </span>

                      <span
                        v-if="!(data.covers || []).length"
                        class="text-xs opacity-60"
                      >
                        —
                      </span>
                    </div>
                  </template>
                </Column>

                <Column
                  field="priority"
                  :header="t('admin.menus.priority')"
                  sortable
                  style="width: 120px"
                  class="text-xs"
                >
                  <template #body="{ data }">
                    <div class="text-sm">
                      {{ data.priority ?? "—" }}
                    </div>
                  </template>
                </Column>

                <Column
                  :header="t('admin.menus.active')"
                  style="width: 120px"
                  sortable
                >
                  <template #body="{ data }">
                    <Tag
                      class="rounded-full text-xs"
                      :severity="
                        data.active === false ? 'secondary' : 'success'
                      "
                      :value="
                        data.active === false ? t('common.no') : t('common.yes')
                      "
                    />
                  </template>
                </Column>

                <Column :header="t('admin.menus.note')" style="width: 4rem">
                  <template #body="{ data }">
                    <Button
                      v-if="String(data.note || '').trim()"
                      icon="pi pi-file"
                      severity="secondary"
                      rounded
                      text
                      size="small"
                      v-tooltip.top="t('common.view')"
                      @click.stop="openMenuNoteDialog(data)"
                    />
                    <span v-else class="text-xs opacity-60">—</span>
                  </template>
                </Column>

                <Column
                  v-if="canWriteMenus"
                  :header="t('common.actions')"
                  style="width: 180px"
                >
                  <template #body="{ data }">
                    <div class="flex items-center gap-2">
                      <Button
                        icon="pi pi-pencil"
                        size="small"
                        severity="secondary"
                        :label="t('common.edit')"
                        @click="openMenuEditor(data)"
                      />
                      <Button
                        icon="pi pi-trash"
                        size="small"
                        severity="danger"
                        :label="t('common.delete')"
                        @click="confirmDeleteMenu(data)"
                      />
                    </div>
                  </template>
                </Column>

                <template #empty>
                  <ContentViewer
                    class="my-3"
                    :empty-text="t('admin.menus.no_menus_yet')"
                  />
                </template>
              </DataTable>
            </TabPanel>

            <!-- TABLES -->
            <TabPanel value="tables">
              <div v-if="!showTablesHelp" class="flex justify-end">
                <Button
                  text
                  rounded
                  size="small"
                  icon="pi pi-info-circle"
                  severity="secondary"
                  class="p-0"
                  aria-label="Help"
                  @click="openTablesHelp"
                />
              </div>
              <Message
                v-if="showTablesHelp"
                severity="info"
                closable
                @close="closeTablesHelp"
              >
                <div class="text-xs text-left space-y-2">
                  <p>
                    {{ t("admin.menus.tables_hint") }}
                  </p>
                </div>
              </Message>

              <div class="flex items-center justify-end my-4">
                <Button
                  icon="pi pi-external-link"
                  size="small"
                  severity="secondary"
                  :label="t('admin.seating.open_plan')"
                  @click="goToSeating"
                />
              </div>

              <ContentViewer
                v-if="!tablesMenuStats.length"
                :empty-text="t('admin.seating.no_tables_yet')"
              />

              <div
                v-else
                class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3"
              >
                <Card
                  v-for="(tb, idx) in tablesMenuStats"
                  :key="tb.id"
                  :style="{ border: '1px solid var(--accent-color)' }"
                  class="cursor-pointer"
                  @click="openTableInAssignTab(tb.id)"
                >
                  <template #content>
                    <div class="flex items-start justify-between gap-2">
                      <div class="min-w-0">
                        <p class="font-semibold truncate">
                          #{{ idx + 1 }} · {{ tb.label }}
                        </p>
                        <div
                          class="mt-1 text-xs opacity-70 flex flex-wrap gap-x-3 gap-y-1"
                        >
                          <span>
                            {{ tb.stats.attending }}
                            {{ t("admin.seating.guests_short") }}
                          </span>
                          <span v-if="tb.stats.unassigned">
                            — {{ tb.stats.unassigned }}
                          </span>
                          <span v-if="tb.stats.needsReview">
                            ⚠︎ {{ tb.stats.needsReview }}
                          </span>
                        </div>
                      </div>

                      <Button
                        size="small"
                        severity="secondary"
                        text
                        icon="pi pi-eye"
                        v-tooltip.top="t('common.view', 'Ver detalle')"
                        @click.stop="openTableInAssignTab(tb.id)"
                      />
                    </div>

                    <div class="mt-3 flex flex-wrap gap-2">
                      <span
                        v-for="it in topMenuChips(tb.stats.byMenuList, 4)"
                        :key="it.menuId"
                        class="inline-flex items-center gap-2 rounded-full px-2 py-0.5 text-xs border bg-gray-50"
                      >
                        <span class="font-semibold">{{ it.name }}</span>
                        <span class="opacity-70">{{ it.count }}</span>
                      </span>

                      <span
                        v-if="tb.stats.unassigned"
                        class="inline-flex items-center gap-2 rounded-full px-2 py-0.5 text-xs border bg-amber-50 text-amber-800 border-amber-200"
                      >
                        <span class="font-semibold">—</span>
                        <span class="opacity-70">{{
                          tb.stats.unassigned
                        }}</span>
                      </span>

                      <span
                        v-if="tb.stats.byMenuList.length > 4"
                        class="inline-flex items-center rounded-full px-2 py-0.5 text-xs border bg-white opacity-70"
                      >
                        +{{ tb.stats.byMenuList.length - 4 }}
                      </span>
                    </div>
                  </template>
                </Card>
              </div>
            </TabPanel>

            <!-- DIET -->
            <TabPanel value="diet">
              <div v-if="!showDietHelp" class="flex justify-end">
                <Button
                  text
                  rounded
                  size="small"
                  icon="pi pi-info-circle"
                  severity="secondary"
                  class="p-0"
                  aria-label="Help"
                  @click="openDietHelp"
                />
              </div>
              <Message
                v-if="showDietHelp"
                severity="info"
                closable
                @close="closeDietHelp"
              >
                <div class="text-xs text-left space-y-2">
                  <p>
                    {{ t("admin.menus.diet_hint") }}
                  </p>
                </div>
              </Message>

              <MenusDietTab />
            </TabPanel>
          </TabPanels>
        </Tabs>

        <!-- EDIT MENU DIALOG -->
        <Dialog
          v-if="canWriteMenus"
          v-model:visible="showMenuEditor"
          modal
          :style="{ width: '92vw', maxWidth: '560px' }"
          :breakpoints="{ '960px': '96vw', '640px': '100vw' }"
          :header="
            editingMenu?.id
              ? t('admin.menus.edit_menu')
              : t('admin.menus.new_menu')
          "
        >
          <div class="space-y-3">
            <div class="space-y-1">
              <label class="font-semibold text-sm">{{
                t("admin.menus.name", "Nombre")
              }}</label>
              <InputText v-model="menuDraft.name" class="w-full" />
            </div>

            <div class="space-y-1">
              <label class="font-semibold text-sm">{{
                t("admin.menus.covers")
              }}</label>
              <MultiSelect
                v-model="menuDraft.covers"
                :options="dietOptionsForCrud"
                option-label="label"
                option-value="value"
                class="w-full"
                :placeholder="t('admin.menus.select_restrictions')"
                display="chip"
                filter
              />
              <p class="text-xs opacity-70">
                {{ t("admin.menus.covers_hint") }}
              </p>
            </div>

            <div class="space-y-1">
              <label class="font-semibold text-sm">{{
                t("admin.menus.priority")
              }}</label>
              <InputNumber
                v-model="menuDraft.priority"
                class="w-full"
                :use-grouping="false"
              />
              <p class="text-xs opacity-70">
                {{ t("admin.menus.priority_hint") }}
              </p>
            </div>

            <div class="space-y-1">
              <label class="font-semibold text-sm">{{
                t("admin.menus.note")
              }}</label>
              <Textarea
                v-model="menuDraft.note"
                class="w-full"
                rows="4"
                auto-resize
              />
            </div>

            <div class="flex items-center gap-2">
              <ToggleSwitch v-model="menuDraft.active" />
              <span class="text-sm">{{ t("admin.menus.active") }}</span>
            </div>

            <Message v-if="menuEditorError" severity="warn" :closable="false">
              {{ menuEditorError }}
            </Message>
          </div>

          <template #footer>
            <div class="flex justify-end gap-2">
              <Button
                size="small"
                severity="secondary"
                icon="pi pi-times"
                :label="t('common.cancel')"
                @click="showMenuEditor = false"
              />
              <Button
                size="small"
                icon="pi pi-save"
                :label="t('common.save')"
                :loading="savingMenu"
                @click="saveMenu"
                :style="{
                  backgroundColor: 'var(--accent-color)',
                  borderColor: 'var(--accent-color)',
                }"
              />
            </div>
          </template>
        </Dialog>

        <!-- NOTE DIALOG -->
        <Dialog
          v-model:visible="showMenuNoteDialog"
          modal
          :header="t('admin.menus.note_dialog_title')"
          :style="{ width: '520px', maxWidth: '92vw' }"
        >
          <div class="space-y-2">
            <p class="text-sm font-semibold truncate">
              {{ menuNoteTarget?.name || "—" }}
            </p>
            <p class="text-sm whitespace-pre-line opacity-90">
              {{ menuNoteTarget?.note || "" }}
            </p>
          </div>
        </Dialog>

        <MenusPrintManager ref="menusPrintRef" />
        <DietPrintManager ref="dietPrintRef" />
      </div>
    </template>
  </Card>
</template>

<script setup>
import { computed, ref, watch, onBeforeUnmount } from "vue";
import { useRouter } from "vue-router";

import Dialog from "primevue/dialog";
import Tag from "primevue/tag";
import Tabs from "primevue/tabs";
import TabList from "primevue/tablist";
import Tab from "primevue/tab";
import TabPanels from "primevue/tabpanels";
import TabPanel from "primevue/tabpanel";
import Card from "primevue/card";
import DataTable from "primevue/datatable";
import Column from "primevue/column";
import Button from "primevue/button";
import InputText from "primevue/inputtext";
import Textarea from "primevue/textarea";
import Select from "primevue/select";
import Message from "primevue/message";
import MultiSelect from "primevue/multiselect";
import InputNumber from "primevue/inputnumber";
import ToggleSwitch from "primevue/toggleswitch";
import { useToast } from "primevue/usetoast";
import { useConfirm } from "primevue/useconfirm";
import { FilterService } from "@primevue/core/api";

import { useMenusStore } from "@/stores/menusStore";
import { useSeatingStore } from "@/stores/seatingStore";
import { useMeStore } from "@/stores/meStore";
import { useGuestDirectoryStore } from "@/stores/guestDirectoryStore";

import { getDietBadges } from "@/shared/dietIcons";
import {
  dietOptions as buildDietOptions,
  normalizeDietCodes,
  ensureOtherIfText,
} from "../../../../shared/dietTypes";
import { useLang } from "@/composables/useLang";
import MenusDietTab from "@/components/admin/menus/MenusDietTab.vue";
import DietPrintManager from "@/components/admin/menus/DietPrintManager.vue";
import MenusPrintManager from "@/components/admin/menus/MenusPrintManager.vue";
import ContentViewer from "@/components/utils/ContentViewer.vue";
import { showApiError } from "@/utils/showApiError";

const { t } = useLang();
const guestDir = useGuestDirectoryStore();
const menusStore = useMenusStore();
const seatingStore = useSeatingStore();
const router = useRouter();
const me = useMeStore();
const showSkeleton = computed(
  () => menusStore.loading && !(menusStore.menus || []).length,
);

const toast = useToast();
const confirm = useConfirm();

const dietPrintRef = ref(null);
const menusPrintRef = ref(null);
const MENUS_HELP_ASSIGN_KEY = "help:menus:assign";
const MENUS_HELP_MENUS_KEY = "help:menus:menus";
const MENUS_HELP_TABLES_KEY = "help:menus:tables";
const MENUS_HELP_DIET_KEY = "help:menus:diet";
const MENUS_ASSIGN_TABLE_ROWS_STORAGE_KEY = "datatable:menus:assign:rows";
const assignRowsPerPageOptions = [10, 20, 50, 100];

function getInitialHelpVisibility(key) {
  if (typeof window === "undefined") return true;
  try {
    return window.localStorage.getItem(key) !== "hidden";
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

const showAssignHelp = ref(getInitialHelpVisibility(MENUS_HELP_ASSIGN_KEY));
const showMenusHelp = ref(getInitialHelpVisibility(MENUS_HELP_MENUS_KEY));
const showTablesHelp = ref(getInitialHelpVisibility(MENUS_HELP_TABLES_KEY));
const showDietHelp = ref(getInitialHelpVisibility(MENUS_HELP_DIET_KEY));
const assignTableRows = ref(
  getInitialPageSize(
    MENUS_ASSIGN_TABLE_ROWS_STORAGE_KEY,
    10,
    assignRowsPerPageOptions,
  ),
);
const showMenuNoteDialog = ref(false);
const menuNoteTarget = ref(null);
const tableFilter = ref("all");
const tabValue = ref("assign");
const byMenuCardEl = ref(null);
const byMenuIsHighlighted = ref(false);
let byMenuFlashTimer = null;

function onAssignTablePage(event) {
  const nextSize = Number(event?.rows);
  if (!assignRowsPerPageOptions.includes(nextSize)) return;
  assignTableRows.value = nextSize;
  persistPageSize(
    MENUS_ASSIGN_TABLE_ROWS_STORAGE_KEY,
    nextSize,
    assignRowsPerPageOptions,
  );
}

function closeAssignHelp() {
  showAssignHelp.value = false;
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(MENUS_HELP_ASSIGN_KEY, "hidden");
  } catch {
    // ignore localStorage failures
  }
}

function openAssignHelp() {
  showAssignHelp.value = true;
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(MENUS_HELP_ASSIGN_KEY);
  } catch {
    // ignore localStorage failures
  }
}

function closeMenusHelp() {
  showMenusHelp.value = false;
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(MENUS_HELP_MENUS_KEY, "hidden");
  } catch {
    // ignore localStorage failures
  }
}

function openMenusHelp() {
  showMenusHelp.value = true;
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(MENUS_HELP_MENUS_KEY);
  } catch {
    // ignore localStorage failures
  }
}

function closeTablesHelp() {
  showTablesHelp.value = false;
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(MENUS_HELP_TABLES_KEY, "hidden");
  } catch {
    // ignore localStorage failures
  }
}

function openTablesHelp() {
  showTablesHelp.value = true;
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(MENUS_HELP_TABLES_KEY);
  } catch {
    // ignore localStorage failures
  }
}

function closeDietHelp() {
  showDietHelp.value = false;
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(MENUS_HELP_DIET_KEY, "hidden");
  } catch {
    // ignore localStorage failures
  }
}

function openDietHelp() {
  showDietHelp.value = true;
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(MENUS_HELP_DIET_KEY);
  } catch {
    // ignore localStorage failures
  }
}

const canReadMenus = computed(() => me.canRead("menus_seating"));
const canWriteMenus = computed(() => me.canWrite("menus_seating"));

/* -----------------------------
   Data (NEW GUEST DIRECTORY SCHEMA)
----------------------------- */

const attendingRows = computed(() => guestDir.items || []);

const counts = computed(() =>
  menusStore.computeMenuCounts(attendingRows.value),
);
const totalAttendees = computed(() => attendingRows.value.length);
const totalUnassigned = computed(() => counts.value.unassigned);
const totalMenusAssigned = computed(() =>
  Math.max(0, totalAttendees.value - totalUnassigned.value),
);

const menuOptions = computed(() => [
  { label: "—", value: null },
  ...menusStore.activeMenus.map((m) => ({
    label: m.name || "—",
    value: m.id,
  })),
]);

function assignmentFor(row) {
  return menusStore.getAssignmentForGuest(row.guestId);
}

const menuCountsList = computed(() => {
  const items = [];
  for (const [menuId, count] of counts.value.counts.entries()) {
    const m = menusStore.menuById(menuId);
    items.push({ id: menuId, name: m?.name || menuId, count });
  }
  items.sort((a, b) => b.count - a.count);
  return items;
});

const MENU_UNASSIGNED_KEY = "__unassigned__";

const menuColumnFilterOptions = computed(() => [
  {
    label: t("admin.menus.filter_menu_unassigned"),
    value: MENU_UNASSIGNED_KEY,
  },
  ...menusStore.activeMenus.map((m) => ({
    label: m.name || m.id,
    value: m.id,
  })),
]);

const statusFilterOptions = computed(() => [
  { label: t("admin.menus.status_auto"), value: "auto" },
  { label: t("admin.menus.status_manual"), value: "manual" },
  { label: t("admin.menus.status_review"), value: "needs_review" },
]);

/* -----------------------------
   Diet badges (NEW FIELDS)
   row.dietCodes, row.dietOtherText
----------------------------- */

function hasDiet(row) {
  const hasCodes = Array.isArray(row.dietCodes) && row.dietCodes.length > 0;
  const hasOtherText = String(row.dietOtherText || "").trim().length > 0;
  return hasCodes || hasOtherText;
}

function getDietBadgesForRow(row) {
  const codes = Array.isArray(row.dietCodes) ? row.dietCodes : [];
  const otherText = String(row.dietOtherText || "").trim();

  const withOther = ensureOtherIfText(codes, otherText);
  const normalized = normalizeDietCodes(withOther);
  const rawBadges = getDietBadges(normalized, otherText);

  return rawBadges.map((b) => ({
    ...b,
    label: b.key === "other" && b.tooltip ? b.tooltip : t(b.i18nKey),
  }));
}

function getDietBadgesForMenu(menu) {
  const codes = Array.isArray(menu?.covers) ? menu.covers : [];
  const normalized = normalizeDietCodes(codes, { dropUnknown: true });
  return getDietBadges(normalized, "");
}

if (!FilterService.filters.dietAny) {
  FilterService.filters.dietAny = (value, filter) => {
    if (!Array.isArray(filter) || filter.length === 0) return true;
    if (!value) return false;

    const normalizedFilter = filter
      .map((x) =>
        String(x || "")
          .trim()
          .toLowerCase(),
      )
      .filter(Boolean);
    if (!normalizedFilter.length) return true;

    const values = Array.isArray(value) ? value : [value];
    const normalizedValues = values
      .map((x) =>
        String(x || "")
          .trim()
          .toLowerCase(),
      )
      .filter(Boolean);
    if (!normalizedValues.length) return false;

    return normalizedFilter.some((f) => normalizedValues.includes(f));
  };
}

function reviewReasonLabel(reason) {
  if (reason === "has_other_text") return t("admin.menus.review_free_text");
  if (reason === "no_std_menu") return t("admin.menus.review_no_std");
  if (reason === "ambiguous_tie") return t("admin.menus.review_tie");
  if (reason === "no_match") return t("admin.menus.review_no_match");
  return t("admin.menus.review_unknown");
}

/* -----------------------------
   Seating / tables
----------------------------- */

const currentTable = computed(() => {
  if (tableFilter.value === "all") return null;
  return seatingStore.tables?.[tableFilter.value] || null;
});

const currentTableGuestIds = computed(() => {
  const t = currentTable.value;
  return t ? new Set(t.guestIds || []) : null;
});

const tableFilterOptions = computed(() => {
  const tables = seatingStore.sortedTables || [];
  return [
    { label: t("admin.menus.filter_table_all"), value: "all" },
    ...tables.map((tb, idx) => ({
      label: tb.name || `${t("admin.seating.default_table_name")} ${idx + 1}`,
      value: tb.id,
    })),
  ];
});

const tablesMenuStats = computed(() => {
  const tables = seatingStore.sortedTables || [];
  const guestsIndex = seatingStore.guestsIndex || {};

  const menuNameById = new Map(
    (menusStore.activeMenus || []).map((m) => [m.id, m.name || m.id]),
  );

  return tables.map((tb, idx) => {
    const guestIds = Array.isArray(tb.guestIds) ? tb.guestIds : [];

    let attending = 0;
    let unassigned = 0;
    let needsReview = 0;

    const byMenu = new Map();

    for (const gid of guestIds) {
      const g = guestsIndex[gid];
      if (!g) continue;

      // NEW: attending is boolean|null
      if (g.attending !== true) continue;

      attending++;

      const a = menusStore.getAssignmentForGuest(gid);
      const menuId = a?.menuId ?? null;

      if (!menuId) unassigned++;
      else byMenu.set(menuId, (byMenu.get(menuId) || 0) + 1);

      if (a?.status === "needs_review") needsReview++;
    }

    const byMenuList = Array.from(byMenu.entries())
      .map(([menuId, count]) => ({
        menuId,
        count,
        name: menuNameById.get(menuId) || menuId,
      }))
      .sort((a, b) => b.count - a.count);

    return {
      id: tb.id,
      label: tb.name || `${t("admin.seating.default_table_name")} ${idx + 1}`,
      stats: { attending, unassigned, needsReview, byMenuList },
    };
  });
});

/* -----------------------------
   Assign table rows (DataTable filters + table selector)
----------------------------- */

function createInitialAssignFilters() {
  return {
    fullName: { value: null, matchMode: "contains" },
    dietCodesNormalized: { value: null, matchMode: "dietAny" },
    menuFilterKey: { value: null, matchMode: "equals" },
    assignmentStatus: { value: null, matchMode: "equals" },
  };
}

const assignFilters = ref(createInitialAssignFilters());

const assignRows = computed(() => {
  return (attendingRows.value || []).map((r) => {
    const a = menusStore.getAssignmentForGuest(r.guestId);
    const menuId = a?.menuId ?? null;
    const statusRaw = a?.status ?? "auto";
    const locked = !!a?.locked;
    const assignmentStatus =
      statusRaw === "needs_review"
        ? "needs_review"
        : locked || statusRaw === "manual"
          ? "manual"
          : "auto";

    const dietBadges = getDietBadgesForRow(r);
    const dietSearchText = dietBadges
      .map((b) => b.label)
      .join(" ")
      .trim();
    const dietCodesNormalized = dietBadges.map((b) => b.key);

    return {
      ...r,
      menuId,
      menuFilterKey: menuId ?? MENU_UNASSIGNED_KEY,
      assignmentStatus,
      dietSearchText,
      dietCodesNormalized,
    };
  });
});

const dietFilterOptions = computed(() => {
  const options = buildDietOptions(t);
  return options.map((o) => {
    const badge = getDietBadges([o.value], "")[0];
    return {
      ...o,
      icon: badge?.icon || null,
    };
  });
});

const dietFilterOptionByValue = computed(() => {
  const map = new Map();
  for (const o of dietFilterOptions.value || []) {
    map.set(String(o.value), o);
  }
  return map;
});

const menuFilterOptionByValue = computed(() => {
  const map = new Map();
  for (const o of menuColumnFilterOptions.value || []) {
    map.set(String(o.value), o);
  }
  return map;
});

function menuFilterLabelByValue(value) {
  return (
    menuFilterOptionByValue.value.get(String(value))?.label || String(value)
  );
}

const tableScopedRows = computed(() => {
  const ids = currentTableGuestIds.value;
  if (!ids) return assignRows.value;
  return assignRows.value.filter((r) => ids.has(r.guestId));
});

const assignHasActiveFilters = computed(() => {
  const f = assignFilters.value || {};
  const hasDataTableFilter = Object.values(f).some((m) => {
    const value = m?.value;
    if (Array.isArray(value)) return value.length > 0;
    if (typeof value === "string") return value.trim().length > 0;
    return value !== null && value !== undefined;
  });

  const hasTableFilter =
    tableFilter.value !== null &&
    tableFilter.value !== undefined &&
    String(tableFilter.value).trim() !== "" &&
    tableFilter.value !== "all";

  return hasDataTableFilter || hasTableFilter;
});

/* -----------------------------
   Persist change
----------------------------- */

async function onMenuChange(row, menuId) {
  if (!canWriteMenus.value) return;
  try {
    await menusStore.setGuestMenu({
      guestId: row.guestId,
      menuId: menuId || null,
      locked: true,
      status: "manual",
    });
  } catch (e) {
    showApiError(t, toast, e);
  }
}

// Triggers auto-assign
const _loadedOnce = ref(false);

watch(
  canReadMenus,
  async (canRead) => {
    if (!canRead || _loadedOnce.value) return;
    _loadedOnce.value = true;

    try {
      await guestDir.load({
        scope: "ONLY_ATTENDING",
        fields: ["menus"],
      });
      seatingStore.syncGuestsFromDirectory(guestDir.items);

      const ids = guestDir.items.map((x) => x.guestId).filter(Boolean);
      await menusStore.initRealtime({ guestIds: ids });
      await seatingStore.initListeners();
    } catch (e) {
      _loadedOnce.value = false;
      console.error("[MenusSection] load/init failed", e);
      showApiError(t, toast, e);
    }
  },
  { immediate: true },
);

/* -----------------------------
   Menu CRUD
----------------------------- */

const showMenuEditor = ref(false);
const editingMenu = ref(null);
const menuDraft = ref({
  id: null,
  name: "",
  covers: [],
  priority: 0,
  active: true,
  note: "",
});

const savingMenu = ref(false);
const menuEditorError = ref("");

const dietOptionsForCrud = computed(() =>
  buildDietOptions(t).filter((o) => o?.value !== "other"),
);

function openMenuEditor(menu) {
  if (!canWriteMenus.value) return;
  menuEditorError.value = "";
  editingMenu.value = menu ? { ...menu } : null;

  menuDraft.value = {
    id: menu?.id || null,
    name: menu?.name || "",
    covers: Array.isArray(menu?.covers) ? [...menu.covers] : [],
    priority: Number(menu?.priority || 0),
    active: menu?.active !== false,
    note: menu?.note || "",
  };

  showMenuEditor.value = true;
}

async function saveMenu() {
  if (!canWriteMenus.value) return;
  menuEditorError.value = "";
  const name = String(menuDraft.value.name || "").trim();
  if (!name) {
    menuEditorError.value = t("admin.menus.error_name");
    return;
  }

  savingMenu.value = true;
  try {
    await menusStore.upsertMenu({ ...menuDraft.value, name });
    toast.add({
      severity: "success",
      summary: t("common.success"),
      detail: t("admin.menus.toast_saved"),
      life: 2500,
    });
    showMenuEditor.value = false;
  } catch (e) {
    console.error(e);
    showApiError(t, toast, e);
  } finally {
    savingMenu.value = false;
  }
}

function confirmDeleteMenu(menu) {
  if (!canWriteMenus.value) return;
  const menuName = String(menu?.name || t("admin.menus.unnamed")).trim();
  const msgTpl = t("admin.menus.confirm_delete");

  confirm.require({
    message: msgTpl.replace("{name}", menuName),
    header: t("common.confirm"),
    icon: "pi pi-exclamation-triangle",
    acceptLabel: t("common.delete"),
    rejectLabel: t("common.cancel"),
    acceptIcon: "pi pi-trash",
    acceptClass: "p-button-danger",
    rejectIcon: "pi pi-times",
    rejectClass: "p-button-outlined p-button-secondary",
    accept: async () => {
      try {
        await menusStore.deleteMenu(menu.id);
        toast.add({
          severity: "success",
          summary: t("common.deleted"),
          detail: t("admin.menus.deleted_success"),
          life: 3000,
        });
      } catch (e) {
        showApiError(t, toast, e);
      }
    },
  });
}

/* -----------------------------
   Status pills
----------------------------- */

function statusLabel(a) {
  const s = a?.status || "auto";
  if (s === "needs_review") return t("admin.menus.status_review");
  if (s === "manual") return t("admin.menus.status_manual");
  return t("admin.menus.status_auto");
}

function statusClass(a) {
  const s = a?.status || "auto";
  if (s === "needs_review")
    return "bg-amber-50 text-amber-800 border-amber-200";
  if (s === "manual" || a?.locked)
    return "bg-sky-50 text-sky-700 border-sky-200";
  return "bg-emerald-50 text-emerald-700 border-emerald-200";
}

/* -----------------------------
   UI helpers
----------------------------- */

function flashByMenuCard({ scroll = true } = {}) {
  byMenuIsHighlighted.value = true;
  if (byMenuFlashTimer) clearTimeout(byMenuFlashTimer);
  byMenuFlashTimer = setTimeout(() => {
    byMenuIsHighlighted.value = false;
  }, 900);

  if (scroll) {
    const el = byMenuCardEl.value?.$el || byMenuCardEl.value;
    el?.scrollIntoView?.({ behavior: "smooth", block: "start" });
  }
}

function onClickMenuChip(menuId) {
  assignFilters.value.menuFilterKey.value = menuId;
  flashByMenuCard({ scroll: false });
}

function clearMenuFilter() {
  assignFilters.value.menuFilterKey.value = null;
  flashByMenuCard({ scroll: false });
}

function topMenuChips(list, max = 4) {
  return (list || []).slice(0, max);
}

function openTableInAssignTab(tableId) {
  tabValue.value = "assign";
  tableFilter.value = tableId;
}

function goToSeating() {
  router.push({ path: "/admin", query: { section: "seating" } });
}

function downloadDietPdf() {
  dietPrintRef.value?.downloadDietPdf?.();
}

const attendeesWithDiet = computed(() => {
  return (attendingRows.value || []).filter((r) => {
    const hasCodes = Array.isArray(r.dietCodes) && r.dietCodes.length;
    const hasText = String(r.dietOtherText || "").trim().length > 0;
    return hasCodes || hasText;
  }).length;
});

/* -----------------------------
   Keep guest diet realtime in sync
----------------------------- */

watch(
  () => guestDir.items.map((x) => x.guestId).join("|"),
  () => {
    seatingStore.syncGuestsFromDirectory(guestDir.items);
    guestDir.scheduleMenusRealtimeSync?.(250);
    const ids = guestDir.items.map((x) => x.guestId).filter(Boolean);
    menusStore.initAssignmentsRealtime?.(ids);
  },
);

onBeforeUnmount(() => {
  guestDir.disposeMenusRealtime?.();
  menusStore.disposeRealtime?.();
});

function openMenuNoteDialog(menu) {
  menuNoteTarget.value = menu || null;
  showMenuNoteDialog.value = true;
}

watch(
  () => showMenuNoteDialog.value,
  (vis) => {
    if (!vis) menuNoteTarget.value = null;
  },
);
</script>

<style scoped>
:deep(.admin-datatable .p-datatable-tbody > tr) {
  cursor: default;
}

:deep(.p-message-text) {
  width: 100%;
}

:deep(.menus-diet-filter .p-multiselect-label) {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 0.25rem;
}

:deep(.menus-diet-filter .p-multiselect-chip-item) {
  display: block;
  width: 100%;
}

:deep(.menus-diet-filter .p-multiselect-chip-item > *) {
  width: 100%;
  justify-content: space-between;
}

@keyframes softFlash {
  0% {
    transform: translateY(0);
  }
  30% {
    transform: translateY(-1px);
  }
  100% {
    transform: translateY(0);
  }
}

.ring-2 {
  animation: softFlash 0.35s ease;
}
</style>
