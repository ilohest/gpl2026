<!-- src/components/admin/seating/SeatingSection.vue -->
<template>
  <div v-if="showSkeleton" class="flex flex-col gap-4">
    <div class="flex flex-wrap gap-2 justify-end">
      <Skeleton width="9rem" height="2.25rem" border-radius="999px" />
      <Skeleton width="9rem" height="2.25rem" border-radius="999px" />
      <Skeleton width="9rem" height="2.25rem" border-radius="999px" />
    </div>

    <Card :style="{ border: '1px solid var(--accent-color)' }">
      <template #title>
        <Skeleton width="12rem" height="1rem" />
      </template>
      <template #content>
        <Skeleton width="100%" height="2.75rem" class="mb-3" />
        <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Skeleton width="100%" height="10rem" />
          <Skeleton width="100%" height="10rem" />
        </div>
      </template>
    </Card>

    <Card :style="{ border: '1px solid var(--accent-color)' }">
      <template #title>
        <Skeleton width="10rem" height="1rem" />
      </template>
      <template #content>
        <Skeleton width="100%" height="18rem" />
      </template>
    </Card>
  </div>

  <div v-else class="flex flex-col gap-4">
    <div class="flex flex-wrap gap-2 justify-end">
      <Button
        icon="pi pi-download"
        size="small"
        :label="t('admin.seating.print_guests')"
        text
        @click="downloadPdf('guests')"
        class="!text-[var(--text-color)]"
      />
      <Button
        icon="pi pi-download"
        size="small"
        :label="t('admin.seating.print_layout')"
        text
        @click="downloadPdf('layout')"
        class="!text-[var(--text-color)]"
      />
      <Button
        icon="pi pi-download"
        size="small"
        :label="t('admin.seating.print_tables')"
        text
        @click="downloadPdf('tables')"
        class="!text-[var(--text-color)]"
      />
    </div>

    <!-- CARD 1 : Invités à placer -->
    <Card :style="{ border: '1px solid var(--accent-color)' }">
      <template #title>
        <div class="flex items-center gap-2">
          <div class="flex items-center gap-2 min-w-0">
            <p class="admin-bento-title truncate">
              <i class="pi pi-users text-sm" aria-hidden="true" />
              {{ t("admin.seating.guest_pool") }}
            </p>
            <Button
              v-if="!showHelp.guestPool"
              text
              rounded
              size="small"
              icon="pi pi-info-circle"
              severity="secondary"
              class="p-0"
              aria-label="Help"
              @click="openGuestPoolHelp"
            />
          </div>
        </div>
      </template>

      <template #content>
        <Message
          v-if="showHelp.guestPool"
          severity="info"
          :closable="true"
          class="mt-2"
          @close="closeGuestPoolHelp"
        >
          <div class="text-xs text-left">
            {{ t("admin.seating.guest_pool_help") }}
          </div>
        </Message>

        <div class="flex flex-col gap-3 mt-3">
          <!-- Ligne recherche + stats -->
          <div
            class="flex flex-col gap-2 md:flex-row md:items-center md:justify-between text-xs"
          >
            <!-- Stats -->
            <span class="opacity-70 text-right md:text-left">
              {{ unassignedGuests.length }}
              {{ t("admin.seating.guests_unassigned") }}
            </span>

            <!-- Champ recherche -->
            <div class="w-full md:w-72">
              <span class="p-input-icon-left w-full flex items-center gap-2">
                <i class="pi pi-search" />
                <InputText
                  v-model="searchQuery"
                  class="w-full custom-input !text-xs"
                  :placeholder="t('admin.seating.search_placeholder')"
                />
              </span>
            </div>
          </div>

          <!-- Liste des tags -->
          <div
            class="flex flex-wrap items-center gap-3 pr-2 overflow-y-auto"
            style="max-height: 220px"
          >
            <!-- GROUPES -->
            <div
              v-for="grp in unassignedGrouped.groups"
              :key="grp.groupId"
              class="flex w-max items-center gap-1 flex-wrap border border-dashed border-[var(--accent-color)] rounded-[10px] md:rounded-full px-2 py-1"
            >
              <template v-if="canWriteSeating">
                <Draggable
                  :model-value="grp.guestIds"
                  :item-key="(gid) => gid"
                  :group="{ name: 'tablesGuests', pull: 'clone', put: false }"
                  :sort="false"
                  :clone="(gid) => gid"
                  class="flex flex-wrap gap-1"
                >
                  <template #item="{ element: gid }">
                    <span
                      class="px-3 py-1 rounded-full text-xs border-2 border-[var(--accent-color)] hover:bg-[var(--accent-color)] hover:text-[var(--primary-color)] transition flex items-center gap-1 cursor-grab"
                      @click="handleAddGuestToActiveTable(gid)"
                    >
                      <img
                        v-if="guestById(gid)?.isCouple"
                        :src="crownIcon"
                        alt="Couple"
                        class="w-3 h-3 object-contain"
                      />

                      {{ guestLabel(gid) }}

                      <template
                        v-for="b in guestDietBadgesById(gid)"
                        :key="b.key"
                      >
                        <img
                          :src="b.icon"
                          :alt="b.label"
                          class="w-3 h-3 object-contain opacity-80"
                          v-tooltip.top="b.label"
                        />
                      </template>
                    </span>
                  </template>
                </Draggable>
              </template>

              <template v-else>
                <div class="flex flex-wrap gap-1">
                  <span
                    v-for="gid in grp.guestIds"
                    :key="gid"
                    class="px-3 py-1 rounded-full text-xs border-2 border-[var(--accent-color)] transition flex items-center gap-1 cursor-default"
                  >
                    <img
                      v-if="guestById(gid)?.isCouple"
                      :src="crownIcon"
                      alt="Couple"
                      class="w-3 h-3 object-contain"
                    />

                    <template
                      v-for="b in guestDietBadgesById(gid)"
                      :key="b.key"
                    >
                      <img
                        :src="b.icon"
                        :alt="b.label"
                        class="w-3 h-3 object-contain opacity-80"
                        v-tooltip.top="b.label"
                      />
                    </template>

                    {{ guestLabel(gid) }}
                  </span>
                </div>
              </template>
            </div>

            <!-- SINGLES -->
            <template v-if="canWriteSeating">
              <Draggable
                :model-value="unassignedGrouped.singleIds"
                :item-key="(gid) => gid"
                :group="{ name: 'tablesGuests', pull: 'clone', put: false }"
                :sort="false"
                :clone="(gid) => gid"
                class="flex flex-wrap gap-3"
              >
                <template #item="{ element: gid }">
                  <span
                    class="px-3 py-1 rounded-full text-xs border-2 border-[var(--accent-color)] hover:bg-[var(--accent-color)] hover:text-[var(--primary-color)] transition flex items-center gap-1 cursor-grab"
                    @click="handleAddGuestToActiveTable(gid)"
                  >
                    <img
                      v-if="guestById(gid)?.isCouple"
                      :src="crownIcon"
                      alt="Couple"
                      class="w-3 h-3 object-contain"
                    />

                    {{ guestLabel(gid) }}

                    <template
                      v-for="b in guestDietBadgesById(gid)"
                      :key="b.key"
                    >
                      <img
                        :src="b.icon"
                        :alt="b.label"
                        class="w-3 h-3 object-contain opacity-80"
                        v-tooltip.top="b.label"
                      />
                    </template>
                  </span>
                </template>
              </Draggable>
            </template>

            <template v-else>
              <div class="flex flex-wrap gap-3">
                <span
                  v-for="gid in unassignedGrouped.singleIds"
                  :key="gid"
                  class="px-3 py-1 rounded-full text-xs border-2 border-[var(--accent-color)] transition flex items-center gap-1 cursor-default"
                >
                  <img
                    v-if="guestById(gid)?.isCouple"
                    :src="crownIcon"
                    alt="Couple"
                    class="w-3 h-3 object-contain"
                  />

                  <template v-for="b in guestDietBadgesById(gid)" :key="b.key">
                    <img
                      :src="b.icon"
                      :alt="b.label"
                      class="w-3 h-3 object-contain opacity-80"
                      v-tooltip.top="b.label"
                    />
                  </template>

                  {{ guestLabel(gid) }}
                </span>
              </div>
            </template>

            <!-- Tous placés -->
            <ContentViewer
              v-if="!unassignedGuests.length"
              class="text-xs opacity-70"
              :empty-text="t('admin.seating.no_unassigned')"
            />

            <!-- Aucun résultat recherche -->
            <ContentViewer
              v-else-if="searchQuery && !filteredUnassignedGuests.length"
              class="text-xs opacity-70"
              :show-no-results="true"
              :no-results-text="t('admin.seating.no_search_match')"
            />
          </div>
        </div>
      </template>
    </Card>

    <div class="grid gap-4 md:grid-cols-2">
      <!-- CARD 2 : Création de table -->
      <Card
        v-if="canWriteSeating"
        :style="{ border: '1px solid var(--accent-color)' }"
      >
        <template #title>
          <div class="flex items-center gap-2">
            <p class="admin-bento-title">
              <i class="pi pi-plus text-sm" aria-hidden="true" />
              {{ t("admin.seating.create_table") }}
            </p>
            <Button
              v-if="!showHelp.tableCards"
              text
              rounded
              size="small"
              icon="pi pi-info-circle"
              severity="secondary"
              class="p-0"
              aria-label="Help"
              @click="openTableCardsHelp"
            />
          </div>
        </template>

        <template #content>
          <Message
            v-if="showHelp.tableCards"
            severity="info"
            :closable="true"
            class="mt-3"
            @close="closeTableCardsHelp"
          >
            <div class="text-xs text-left">
              {{ t("admin.seating.table_cards_help") }}
            </div>
          </Message>

          <div class="flex flex-col gap-4 mt-3">
            <div class="flex flex-col gap-3">
              <!-- Nom de la table-->
              <div>
                <label class="block text-left mb-1 text-sm">
                  {{ t("admin.seating.table_name") }}
                </label>
                <InputText v-model="newTable.name" class="w-full" />
              </div>

              <!-- Capacité éditable seulement si table ronde -->
              <div
                v-if="newTable.shape !== 'square'"
                class="flex flex-col w-full"
              >
                <label class="block text-left mb-1 whitespace-nowrap text-sm">
                  {{ t("admin.seating.capacity") }}
                </label>

                <InputNumber
                  v-model="newTable.capacity"
                  :min="1"
                  :show-buttons="true"
                  class="w-full"
                  input-class="w-full"
                />
              </div>

              <!-- Capacité auto (somme des côtés) si table rectangulaire -->
              <div v-else>
                <label class="block text-left mb-1 whitespace-nowrap text-sm">
                  {{ t("admin.seating.capacity") }}
                </label>

                <div
                  class="h-[45px] w-full flex items-center justify-start text-xl"
                >
                  {{ newSquareCapacity }}
                </div>
              </div>
            </div>

            <!-- Forme de table -->
            <div class="space-y-2">
              <label class="text-left block mb-1 text-sm">
                {{ t("admin.seating.shape") }}
              </label>

              <div class="flex gap-3">
                <Button
                  v-for="shape in shapes"
                  :key="shape.value"
                  :label="shape.label"
                  :outlined="newTable.shape !== shape.value"
                  class="flex-1"
                  :class="
                    newTable.shape === shape.value
                      ? '!bg-[var(--accent-color)] !border-[var(--accent-color)] !text-[var(--primary-color)]'
                      : '!bg-transparent !border-[var(--accent-color)] !text-[var(--accent-color)]'
                  "
                  @click="newTable.shape = shape.value"
                  size="small"
                />
              </div>
            </div>

            <!-- Si carré : nb de personnes par côté -->
            <div v-if="newTable.shape === 'square'" class="space-y-2">
              <label class="text-left block mb-1 text-sm">
                {{ t("admin.seating.square_sides") }}
              </label>

              <div
                class="grid grid-cols-1 min-[1025px]:grid-cols-2 gap-3 text-xs"
              >
                <div class="flex flex-col">
                  <span class="block text-left mb-1">{{
                    t("admin.seating.side_top")
                  }}</span>
                  <InputNumber
                    v-model="newTable.seatsPerSide.top"
                    :min="0"
                    :show-buttons="true"
                  />
                </div>
                <div class="flex flex-col">
                  <span class="block text-left mb-1">
                    {{ t("admin.seating.side_right") }}
                  </span>
                  <InputNumber
                    v-model="newTable.seatsPerSide.right"
                    :min="0"
                    :show-buttons="true"
                  />
                </div>
                <div class="flex flex-col">
                  <span class="block text-left mb-1">
                    {{ t("admin.seating.side_bottom") }}
                  </span>
                  <InputNumber
                    v-model="newTable.seatsPerSide.bottom"
                    :min="0"
                    :show-buttons="true"
                  />
                </div>
                <div class="flex flex-col">
                  <span class="block text-left mb-1">
                    {{ t("admin.seating.side_left") }}
                  </span>
                  <InputNumber
                    v-model="newTable.seatsPerSide.left"
                    :min="0"
                    :show-buttons="true"
                  />
                </div>
              </div>
            </div>

            <!-- Bouton création -->
            <div class="flex justify-end">
              <Button
                icon="pi pi-plus"
                :label="t('admin.seating.add_table')"
                :disabled="!canCreateTable"
                @click="createTable"
                size="small"
                class="btn-accent"
              />
            </div>
          </div>
        </template>
      </Card>

      <!-- CARD 3 : Organisation des tables -->
      <Card
        class="h-full"
        :class="!canWriteSeating ? 'md:col-span-2' : ''"
        :style="{ border: '1px solid var(--accent-color)' }"
        :pt="{
          root: { class: 'h-full flex flex-col' },
          body: { class: 'flex-1 flex flex-col' },
          content: { class: 'flex-1 flex flex-col' },
        }"
      >
        <template #title>
          <div
            class="flex items-start md:items-center justify-between flex-col md:flex-row gap-2"
          >
            <div class="flex items-center gap-2 min-w-0">
              <div class="flex items-center text-left gap-2 min-w-0">
                <p class="admin-bento-title truncate">
                  <i class="pi pi-map text-sm" aria-hidden="true" />
                  {{ t("admin.seating.layout_title") }}
                </p>
                <Button
                  v-if="!showHelp.layout"
                  text
                  rounded
                  size="small"
                  icon="pi pi-info-circle"
                  severity="secondary"
                  class="p-0"
                  aria-label="Help"
                  @click="openLayoutHelp"
                />
              </div>
            </div>
          </div>
        </template>

        <template #content>
          <div class="h-full flex flex-col">
            <div class="flex-1">
              <Message
                v-if="showHelp.layout"
                severity="info"
                :closable="true"
                class="mt-2"
                @close="closeLayoutHelp"
              >
                <div class="text-xs text-left">
                  {{ t("admin.seating.layout_help") }}
                </div>
              </Message>

              <div
                v-if="sortedTables.length"
                class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 mt-6"
              >
                <div
                  v-for="(table, idx) in sortedTables"
                  :key="table.id"
                  class="relative flex flex-col items-center gap-1 text-xs p-2 -m-2"
                  @dragover.prevent="
                    canWriteSeating && onTableTileDragOver(table.id)
                  "
                  @dragleave.prevent="
                    canWriteSeating && onTableTileDragLeave(table.id)
                  "
                  @drop.prevent="canWriteSeating && onTableTileDrop(table)"
                >
                  <div
                    :class="[
                      'flex items-center justify-center schema-table ',
                      'w-14 h-14 md:w-16 md:h-16  transition',
                      canWriteSeating ? 'cursor-pointer' : 'cursor-default',
                      table.shape === 'square' ? 'rounded-md' : 'rounded-full',
                      (canWriteSeating && activeTableId === table.id) ||
                        hoverTileTableId === table.id
                        ? 'ring-2 ring-[var(--accent-color)] border-[var(--accent-color)]'
                        : 'border-[var(--text-color)]',
                      hoverTileTableId === table.id
                        ? 'bg-[var(--accent-color)]/10'
                        : '',
                    ]"
                    @click.stop="canWriteSeating && setActiveTable(table.id)"
                  >
                    <span
                      class="text-[11px] font-semibold text-center leading-tight"
                    >
                      #{{ idx + 1 }}
                      <br />
                      {{ getTableTileLabel(table, idx) }}
                    </span>
                  </div>

                  <!-- Nombre d'invités -->
                  <div class="text-[11px] opacity-80">
                    {{ table.guestIds?.length || 0 }}
                    {{ t("admin.seating.guests_short") }}
                  </div>
                </div>
              </div>

              <ContentViewer
                v-else
                class="text-xs opacity-60 mt-6"
                :empty-text="t('admin.seating.no_tables_yet')"
              />
            </div>

            <div class="mt-auto pt-3">
              <!-- Desktop: bouton -->
              <div class="hidden md:block">
                <Button
                  size="small"
                  icon="pi pi-th-large"
                  :label="t('admin.seating.open_layout')"
                  class="btn-accent mt-2 w-full text-sm"
                  @click.stop="showLayoutDialog = true"
                />
              </div>

              <!-- Mobile: message -->
              <p class="md:hidden text-xs text-left opacity-70">
                {{ t("admin.seating.layout_desktop_only") }}
              </p>
            </div>
          </div>
        </template>
      </Card>
    </div>

    <!-- CARDS 4+ : liste des tables -->
    <div class="grid gap-4 md:grid-cols-3">
      <Card
        v-for="(table, idx) in sortedTables"
        :key="table.id"
        class="seating-table-card"
        :class="[
          canWriteSeating ? 'cursor-pointer' : 'cursor-default',
          { 'is-selected': canWriteSeating && activeTableId === table.id },
        ]"
        :style="cardStyle(table.id)"
        @click="canWriteSeating && setActiveTable(table.id)"
      >
        <template #title>
          <div class="flex items-start justify-between gap-2">
            <div class="min-w-0 w-full">
              <!-- Ligne: # + input -->
              <div class="flex items-center gap-2">
                <span class="text-xs opacity-70 shrink-0">#{{ idx + 1 }}</span>

                <InputText
                  v-if="canWriteSeating"
                  v-model="tableLocalNames[table.id]"
                  class="w-full custom-input !text-sm"
                  @click.stop
                  @keydown.stop
                  @blur="saveTableName(table)"
                />

                <p
                  v-else
                  class="w-full text-sm font-semibold truncate text-left"
                >
                  {{ getTableTileLabel(table, idx) }}
                </p>
              </div>

              <div class="text-xs opacity-70 mt-1">
                {{
                  t("admin.seating.table_card_counts", {
                    count: table.guestIds?.length || 0,
                    capacity: getCapacity(table),
                  })
                }}
              </div>
            </div>

            <div class="flex items-center gap-1 shrink-0">
              <Button
                :icon="canWriteSeating ? 'pi pi-pencil' : 'pi pi-eye'"
                size="small"
                text
                severity="secondary"
                v-tooltip.top="
                  canWriteSeating ? t('common.edit') : t('common.view', 'Voir')
                "
                @click.stop="openTableDetailsDialog(table.id)"
              />

              <Button
                v-if="canWriteSeating"
                icon="pi pi-trash"
                size="small"
                text
                severity="danger"
                v-tooltip.top="t('common.delete')"
                @click.stop="deleteTable(table.id)"
              />
            </div>
          </div>
        </template>

        <template #content>
          <div
            class="pr-1 rounded-md"
            :class="
              (table.guestIds?.length || 0) === 0
                ? 'border border-dashed border-[var(--accent-color)] p-2'
                : ''
            "
          >
            <Draggable
              :model-value="table.guestIds || []"
              :item-key="(gid) => gid"
              :group="
                canWriteSeating
                  ? { name: 'tablesGuests', pull: true, put: true }
                  : { name: 'tablesGuests', pull: false, put: false }
              "
              :disabled="!canWriteSeating"
              handle=".drag-handle"
              :move="(evt) => canWriteSeating && canMoveToTable(evt, table)"
              @update:model-value="
                (next) => canWriteSeating && onUpdateGuestIds(table.id, next)
              "
              class="min-h-[40px]"
            >
              <template #item="{ element: gid }">
                <div class="flex items-center justify-between gap-2 py-1">
                  <div class="flex items-center gap-2 min-w-0">
                    <span
                      v-if="canWriteSeating"
                      class="drag-handle cursor-grab opacity-40 select-none"
                    >
                      ⋮⋮
                    </span>

                    <!-- ✅ Nom + icônes restrictions -->
                    <span
                      class="text-sm truncate flex items-center gap-2 min-w-0"
                    >
                      <!-- ✅ Couronne si couple -->
                      <img
                        v-if="guestById(gid)?.isCouple"
                        :src="crownIcon"
                        alt="Couple"
                        class="w-3 h-3 object-contain shrink-0"
                      />

                      <div class="flex items-center gap-2 min-w-0">
                        <span class="text-sm truncate">{{
                          guestLabel(gid)
                        }}</span>

                        <span
                          class="inline-flex items-center justify-center w-6 h-6 rounded-full border opacity-80 shrink-0"
                          :class="guestMenuChipClass(gid)"
                          v-tooltip.top="guestMenuLabel(gid)"
                        >
                          <i class="pi pi-info-circle text-[12px]" />
                        </span>
                      </div>

                      <!-- ✅ Badges restrictions -->
                      <span class="flex items-center gap-1 shrink-0">
                        <img
                          v-for="badge in dietBadgesForGuest(gid)"
                          :key="badge.key"
                          :src="badge.icon"
                          :alt="t(badge.i18nKey, badge.key)"
                          class="w-4 h-4 object-contain opacity-80"
                          v-tooltip.top="dietBadgeTooltip(badge)"
                        />
                      </span>
                    </span>
                  </div>

                  <Button
                    v-if="canWriteSeating"
                    icon="pi pi-times"
                    text
                    rounded
                    severity="danger"
                    size="small"
                    @click.stop="removeGuestFromTable(gid, table.id)"
                  />
                </div>
              </template>
            </Draggable>

            <div class="mt-2 flex flex-wrap gap-2">
              <span
                v-for="it in tableMenuStats(table).byMenuList.slice(0, 4)"
                :key="it.menuId"
                class="inline-flex items-center gap-2 rounded-full px-2 py-0.5 text-xs border bg-gray-50"
              >
                <span class="font-semibold">{{ it.name }}</span>
                <span class="opacity-70">{{ it.count }}</span>
              </span>

              <span
                v-if="tableMenuStats(table).needsReview"
                class="inline-flex items-center gap-2 rounded-full px-2 py-0.5 text-xs border bg-amber-50 text-amber-800 border-amber-200"
              >
                <span class="font-semibold">
                  {{ t("admin.menus.needs_review") }}
                </span>
                <span class="opacity-70">{{
                  tableMenuStats(table).needsReview
                }}</span>
              </span>

              <span
                v-if="tableMenuStats(table).byMenuList.length > 4"
                class="inline-flex items-center rounded-full px-2 py-0.5 text-xs border bg-white opacity-70"
              >
                +{{ tableMenuStats(table).byMenuList.length - 4 }}
              </span>
            </div>

            <ContentViewer
              v-if="(table.guestIds?.length || 0) === 0"
              class="text-xs opacity-60 mt-1"
              :empty-text="t('admin.seating.no_guests_table')"
            />
          </div>
        </template>
      </Card>
    </div>
  </div>

  <TablesLayoutDialog
    v-model:visible="showLayoutDialog"
    :tables="sortedTables"
    :can-write="canWriteSeating"
    @layout-change="onLayoutChange"
  />

  <SeatingPrintManager ref="printManager" />

  <TableDetailsDialog
    v-model:visible="detailsOpen"
    :table-id="detailsTableId"
    @update:table-id="(id) => (detailsTableId = id)"
    :tables="sortedTables"
    :table-name="detailsTableId ? tableLocalNames[detailsTableId] : ''"
    :guests-index="guestsIndex"
    :can-write="canWriteSeating"
  />
</template>

<script setup>
import {
  computed,
  reactive,
  ref,
  watch,
  onMounted,
  onBeforeUnmount,
} from "vue";

import Card from "primevue/card";
import InputText from "primevue/inputtext";
import InputNumber from "primevue/inputnumber";
import Button from "primevue/button";
import Message from "primevue/message";
import { useToast } from "primevue/usetoast";
import { useConfirm } from "primevue/useconfirm";
import Draggable from "vuedraggable";

import { getDietBadges } from "@/shared/dietIcons";
import crownIcon from "@/assets/icons/crown.png";

import TablesLayoutDialog from "@/components/admin/seating/TablesLayoutDialog.vue";
import SeatingPrintManager from "@/components/admin/seating/SeatingPrintManager.vue";
import TableDetailsDialog from "@/components/admin/seating/TableDetailsDialog.vue";
import ContentViewer from "@/components/utils/ContentViewer.vue";

import { useLang } from "@/composables/useLang";
import { useSeatingStore } from "@/stores/seatingStore";
import { useGuestDirectoryStore } from "@/stores/guestDirectoryStore";
import { useMenusStore } from "@/stores/menusStore";
import { useMeStore } from "@/stores/meStore";
import { showApiError } from "@/utils/showApiError";

const { t } = useLang();
const seatingStore = useSeatingStore();
const guestDir = useGuestDirectoryStore();
const menusStore = useMenusStore();
const me = useMeStore();
const showSkeleton = computed(
  () =>
    seatingStore.loading &&
    !Object.keys(seatingStore.tables || {}).length &&
    !Object.keys(seatingStore.guestsIndex || {}).length,
);

const toast = useToast();
const confirm = useConfirm();

const showLayoutDialog = ref(false);
const searchQuery = ref("");
const hoverTileTableId = ref(null);
const printManager = ref(null);
const detailsOpen = ref(false);
const detailsTableId = ref(null);

const shapes = computed(() => [
  { value: "round", label: t("admin.seating.shape_round") },
  { value: "square", label: t("admin.seating.shape_square") },
]);

const canReadSeating = computed(() => me.canRead("menus_seating"));
const canWriteSeating = computed(() => me.canWrite("menus_seating"));

const newTable = reactive({
  name: "",
  capacity: null,
  shape: "round",
  seatsPerSide: { top: null, right: null, bottom: null, left: null },
});

const SEATING_HELP_GUEST_POOL_KEY = "help:seating:guest_pool";
const SEATING_HELP_LAYOUT_KEY = "help:seating:layout";
const SEATING_HELP_TABLE_CARDS_KEY = "help:seating:table_cards";

function getInitialHelpVisibility(key) {
  if (typeof window === "undefined") return true;
  try {
    return window.localStorage.getItem(key) !== "hidden";
  } catch {
    return true;
  }
}

const showHelp = reactive({
  guestPool: getInitialHelpVisibility(SEATING_HELP_GUEST_POOL_KEY),
  layout: getInitialHelpVisibility(SEATING_HELP_LAYOUT_KEY),
  tableCards: getInitialHelpVisibility(SEATING_HELP_TABLE_CARDS_KEY),
});

const sortedTables = computed(() => seatingStore.sortedTables);
const guestsIndex = computed(() => seatingStore.guestsIndex);
const unassignedGuests = computed(() => seatingStore.unassignedGuests);

function openTableDetailsDialog(tableId) {
  detailsTableId.value = tableId;
  detailsOpen.value = true;
}

function closeGuestPoolHelp() {
  showHelp.guestPool = false;
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(SEATING_HELP_GUEST_POOL_KEY, "hidden");
  } catch {
    // ignore localStorage failures
  }
}

function openGuestPoolHelp() {
  showHelp.guestPool = true;
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(SEATING_HELP_GUEST_POOL_KEY);
  } catch {
    // ignore localStorage failures
  }
}

function closeTableCardsHelp() {
  showHelp.tableCards = false;
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(SEATING_HELP_TABLE_CARDS_KEY, "hidden");
  } catch {
    // ignore localStorage failures
  }
}

function openTableCardsHelp() {
  showHelp.tableCards = true;
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(SEATING_HELP_TABLE_CARDS_KEY);
  } catch {
    // ignore localStorage failures
  }
}

function closeLayoutHelp() {
  showHelp.layout = false;
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(SEATING_HELP_LAYOUT_KEY, "hidden");
  } catch {
    // ignore localStorage failures
  }
}

function openLayoutHelp() {
  showHelp.layout = true;
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(SEATING_HELP_LAYOUT_KEY);
  } catch {
    // ignore localStorage failures
  }
}

/**
 * IMPORTANT:
 * - source de vérité = store
 * - ce ref est juste pour l’UI (sélection locale)
 */
const activeTableId = ref(null);
watch(
  () => seatingStore.activeTableId,
  (id) => {
    activeTableId.value = id || null;
  },
  { immediate: true },
);

// Desktop detection (safe cleanup, no ref hacks)
const isDesktop = ref(false);
let _mq = null;
let _mqHandler = null;

onMounted(() => {
  _mq = window.matchMedia("(min-width: 768px)");
  _mqHandler = (e) => (isDesktop.value = !!e.matches);
  _mqHandler(_mq);

  if (_mq.addEventListener) _mq.addEventListener("change", _mqHandler);
  else _mq.addListener(_mqHandler);
});

onBeforeUnmount(() => {
  // ⚠️ Si ces stores sont partagés globalement ailleurs, évite destroy ici.
  seatingStore.destroy?.();
  menusStore.destroy?.();

  if (_mq && _mqHandler) {
    if (_mq.removeEventListener) _mq.removeEventListener("change", _mqHandler);
    else _mq.removeListener(_mqHandler);
  }

  _mq = null;
  _mqHandler = null;
});

watch(showLayoutDialog, (val) => {
  if (val && !isDesktop.value) showLayoutDialog.value = false;
});

const canCreateTable = computed(() => {
  if (!newTable.shape) return false;
  if (newTable.shape === "square") return newSquareCapacity.value > 0;
  return Number(newTable.capacity) > 0;
});

// Pour éditer le nom localement sans lag
const tableLocalNames = ref({});
watch(
  sortedTables,
  (tables) => {
    const next = { ...(tableLocalNames.value || {}) };

    (tables || []).forEach((table, idx) => {
      const fallback = `${t("admin.seating.default_table_name", "Table")} ${
        idx + 1
      }`;

      // Ne pas écraser ce que l’utilisateur tape
      if (next[table.id] == null || next[table.id] === "") {
        next[table.id] = table.name || fallback;
      }
    });

    // purge ids supprimés
    const ids = new Set((tables || []).map((t) => t.id));
    Object.keys(next).forEach((id) => {
      if (!ids.has(id)) delete next[id];
    });

    tableLocalNames.value = next;
  },
  { immediate: true },
);

const filteredUnassignedGuests = computed(() => {
  const q = searchQuery.value.trim().toLowerCase();
  const list = unassignedGuests.value || [];
  if (!q) return list;

  return list.filter((guest) => {
    const label = `${guest.firstName || ""} ${
      guest.lastName || ""
    }`.toLowerCase();
    return label.includes(q);
  });
});

const unassignedGrouped = computed(() => {
  const groupsMap = new Map();
  const singles = [];

  for (const guest of filteredUnassignedGuests.value) {
    const groupId = guest.rsvpId;

    if (!groupId) {
      singles.push(guest);
      continue;
    }

    if (!groupsMap.has(groupId)) groupsMap.set(groupId, []);
    groupsMap.get(groupId).push(guest);
  }

  const groups = [];
  for (const [groupId, guests] of groupsMap.entries()) {
    if (guests.length === 1) singles.push(guests[0]);
    else {
      groups.push({
        groupId,
        guests,
        guestIds: guests.map((g) => g.id),
      });
    }
  }

  return {
    groups,
    singles,
    singleIds: singles.map((g) => g.id),
  };
});

function computeSquareCapacity(seatsPerSide) {
  if (!seatsPerSide) return 0;
  const { top = 0, right = 0, bottom = 0, left = 0 } = seatsPerSide;
  return (
    Number(top || 0) +
    Number(right || 0) +
    Number(bottom || 0) +
    Number(left || 0)
  );
}

const newSquareCapacity = computed(() => {
  if (newTable.shape !== "square") return Number(newTable.capacity || 0);
  return computeSquareCapacity(newTable.seatsPerSide);
});

async function createTable() {
  if (!canWriteSeating.value) return;

  try {
    const seatsPerSideSquare =
      newTable.shape === "square"
        ? {
            top: Number(newTable.seatsPerSide.top || 0),
            right: Number(newTable.seatsPerSide.right || 0),
            bottom: Number(newTable.seatsPerSide.bottom || 0),
            left: Number(newTable.seatsPerSide.left || 0),
          }
        : null;

    await seatingStore.createTable({
      name: newTable.name?.trim() || null,
      capacity:
        newTable.shape === "square"
          ? computeSquareCapacity(seatsPerSideSquare)
          : Number(newTable.capacity || 0),
      shape: newTable.shape,
      seatsPerSide: seatsPerSideSquare,
    });

    // reset form
    newTable.name = "";
    newTable.capacity = null;
    newTable.shape = "round";
    newTable.seatsPerSide.top = null;
    newTable.seatsPerSide.right = null;
    newTable.seatsPerSide.bottom = null;
    newTable.seatsPerSide.left = null;
  } catch (err) {
    console.error("Erreur création table:", err);
    showApiError(t, toast, err);
  }
}

async function saveTableName(table) {
  if (!canWriteSeating.value) return;

  const name = (tableLocalNames.value?.[table.id] || "").trim() || null;
  try {
    await seatingStore.updateTableMeta(table.id, { name });
  } catch (e) {
    showApiError(t, toast, e);
  }
}

function deleteTable(tableId) {
  if (!canWriteSeating.value) return;

  confirm.require({
    message: t("admin.seating.confirm_delete"),
    header: t("admin.seating.confirm_delete_header"),
    icon: "pi pi-exclamation-triangle",
    acceptLabel: t("admin.seating.delete"),
    acceptIcon: "pi pi-trash",
    acceptClass: "p-button-danger",
    rejectLabel: t("admin.seating.cancel"),
    rejectIcon: "pi pi-times",
    rejectClass: "p-button-secondary",
    accept: async () => {
      try {
        await seatingStore.deleteTable(tableId);
        toast.add({
          severity: "success",
          summary: t("admin.seating.delete_ok"),
          life: 2500,
        });
      } catch (err) {
        console.error("Erreur suppression table:", err);
        showApiError(t, toast, err);
      }
    },
  });
}

function setActiveTable(id) {
  if (!canWriteSeating.value) return;
  activeTableId.value = id;
  seatingStore.setActiveTable?.(id);
}

function onTableTileDragOver(tableId) {
  if (!canWriteSeating.value) return;
  if (!dragState.value.source) return;
  hoverTileTableId.value = tableId;
}

function onTableTileDragLeave(tableId) {
  if (hoverTileTableId.value === tableId) hoverTileTableId.value = null;
}

async function handleAddGuestToActiveTable(guestId) {
  if (!canWriteSeating.value) return;
  if (!activeTableId.value) return;

  const tableId = activeTableId.value;
  const current = seatingStore.tables?.[tableId]?.guestIds || [];
  const next = [...current, guestId];

  try {
    const ok = await seatingStore.setTableGuestIds(tableId, next);
    if (!ok) toastTableFull();
  } catch (e) {
    showApiError(t, toast, e);
  }
}

async function onTableTileDrop(table) {
  if (!canWriteSeating.value) return;

  const { guestId } = dragState.value;
  if (!guestId) return;

  hoverTileTableId.value = null;

  dragState.value = {
    source: null,
    guestId: null,
    fromTableId: null,
    fromIndex: null,
    overTableId: null,
    overIndex: null,
  };

  const current = seatingStore.tables?.[table.id]?.guestIds || [];
  const next = [...current, guestId];

  try {
    const ok = await seatingStore.setTableGuestIds(table.id, next);
    if (!ok) toastTableFull();
  } catch (e) {
    showApiError(t, toast, e);
  }
}

async function onUpdateGuestIds(tableId, nextGuestIds) {
  if (!canWriteSeating.value) return;

  try {
    const ok = await seatingStore.setTableGuestIds(tableId, nextGuestIds);
    if (!ok) toastTableFull();
  } catch (e) {
    showApiError(t, toast, e);
  }
}

async function removeGuestFromTable(gid, tableId) {
  if (!canWriteSeating.value) return;

  const table = seatingStore.tables?.[tableId];
  if (!table) return;

  const next = (table.guestIds || []).filter((x) => x !== gid);

  try {
    await seatingStore.setTableGuestIds(tableId, next);
  } catch (e) {
    showApiError(t, toast, e);
  }
}

function getCapacity(table) {
  if (table.shape === "square") {
    const s = table.seatsPerSide || {};
    return (
      Number(s.top || 0) +
      Number(s.right || 0) +
      Number(s.bottom || 0) +
      Number(s.left || 0)
    );
  }
  return Number(table.capacity || 0);
}

function getTableTileLabel(table, idx) {
  const fallback = `${t("admin.seating.default_table_name", "Table")} ${
    idx + 1
  }`;
  return tableLocalNames.value?.[table.id] || table.name || fallback;
}

async function onLayoutChange({ tableId, position, rotationDeg }) {
  if (!canWriteSeating.value) return;

  try {
    const patch = { layoutPosition: position };
    if (typeof rotationDeg === "number") patch.layoutRotationDeg = rotationDeg;
    await seatingStore.updateTableMeta(tableId, patch);
  } catch (e) {
    console.error("Erreur sauvegarde layoutPosition:", e);
    showApiError(t, toast, e);
  }
}

function downloadPdf(type) {
  if (printManager.value?.downloadPdf) printManager.value.downloadPdf(type);
}

function canMoveToTable(evt, targetTable) {
  const dragged = evt?.draggedContext;
  const related = evt?.relatedContext;

  if (!dragged || !related) return true;

  const fromList = dragged.list;
  const toList = related.list;

  // tri interne => OK même si table full
  if (fromList === toList) return true;

  const capacity = getCapacity(targetTable);
  if (!capacity) return true;

  const currentCount = targetTable.guestIds?.length || 0;
  const gid = dragged.element;

  if (gid && (targetTable.guestIds || []).includes(gid)) return true;

  if (currentCount >= capacity) {
    toastTableFull();
    return false;
  }

  return true;
}

function guestById(gid) {
  return guestsIndex.value?.[gid] || null;
}

function guestLabel(gid) {
  const g = guestsIndex.value?.[gid];
  if (!g) return gid;
  return `${g.firstName || ""} ${g.lastName || ""}`.trim() || gid;
}

// Diet badges
function guestDietBadgesById(gid) {
  const g = guestsIndex.value?.[gid];
  if (!g) return [];
  try {
    return getDietBadges(
      Array.isArray(g.dietCodes) ? g.dietCodes : [],
      String(g.dietOtherText || "").trim(),
    );
  } catch {
    return [];
  }
}

function _guestDietBadgesByGuest(guest) {
  if (!guest) return [];
  try {
    return getDietBadges(
      Array.isArray(guest.dietCodes) ? guest.dietCodes : [],
      String(guest.dietOtherText || "").trim(),
    );
  } catch {
    return [];
  }
}

function dietBadgesForGuest(gid) {
  return guestDietBadgesById(gid);
}

function dietBadgeTooltip(badge) {
  if (badge.tooltip) return badge.tooltip;
  return t(badge.i18nKey, badge.key);
}

// Toast "table full" throttlé
const lastFullToastAt = ref(0);
function toastTableFull() {
  const now = Date.now();
  if (now - lastFullToastAt.value < 1200) return;
  lastFullToastAt.value = now;

  toast.add({
    severity: "warn",
    summary: t("admin.seating.table_full"),
    detail: t("admin.seating.table_full_detail"),
    life: 3000,
  });
}

// UI card style
function cardStyle(tableId) {
  const isActive = activeTableId.value === tableId;
  return {
    border: isActive
      ? "2px solid var(--accent-color)"
      : "1px solid var(--accent-color)",
    boxShadow: isActive ? "0 0 0 3px rgba(0,0,0,0.06)" : "none",
  };
}

// drag state (tiles / plan)
// NOTE: si tu veux que le drop sur les tiles marche, il faut alimenter dragState sur start/end des Draggable.
const dragState = ref({
  source: null, // 'POOL' | 'TABLE'
  guestId: null,
  fromTableId: null,
  fromIndex: null,
  overTableId: null,
  overIndex: null,
});

// menus stats
const menuNameById = computed(() => {
  const map = new Map();
  for (const m of menusStore.activeMenus || []) map.set(m.id, m.name || m.id);
  return map;
});

const tableMenuStatsMap = computed(() => {
  const res = new Map();

  for (const table of sortedTables.value || []) {
    const guestIds = Array.isArray(table?.guestIds) ? table.guestIds : [];
    const counts = new Map();
    let unassigned = 0;
    let needsReview = 0;

    for (const gid of guestIds) {
      const g = guestsIndex.value?.[gid];
      if (!g) continue;

      const a = menusStore.getAssignmentForGuest(gid);
      const menuId = a?.menuId ?? null;

      if (!menuId) unassigned++;
      else counts.set(menuId, (counts.get(menuId) || 0) + 1);

      if (a?.status === "needs_review") needsReview++;
    }

    const byMenuList = Array.from(counts.entries())
      .map(([menuId, count]) => ({
        menuId,
        count,
        name: menuNameById.value.get(menuId) || menuId,
      }))
      .sort((a, b) => b.count - a.count);

    res.set(table.id, { byMenuList, unassigned, needsReview });
  }

  return res;
});

function tableMenuStats(table) {
  return (
    tableMenuStatsMap.value.get(table?.id) || {
      byMenuList: [],
      unassigned: 0,
      needsReview: 0,
    }
  );
}

function guestMenuAssignment(gid) {
  return menusStore.getAssignmentForGuest(gid);
}

function guestMenuLabel(gid) {
  const a = guestMenuAssignment(gid);
  if (!a?.menuId) {
    if (a?.status === "needs_review") return t("admin.menus.needs_review");
    return t("admin.menus.unassigned");
  }
  const m = menusStore.menuById(a.menuId);
  return m?.name || a.menuId;
}

function guestMenuChipClass(gid) {
  const a = guestMenuAssignment(gid);
  if (a?.status === "needs_review")
    return "bg-amber-50 text-amber-800 border-amber-200";
  if (!a?.menuId) return "bg-gray-50 text-gray-700 border-gray-200";
  return "bg-gray-50 text-gray-900 border-gray-200";
}

const seatingGuestIds = computed(() =>
  Object.keys(guestsIndex.value || {})
    .map((id) => String(id || "").trim())
    .filter(Boolean),
);

async function syncMenuAssignmentsRealtime() {
  const ids = seatingGuestIds.value;
  await menusStore.initRealtime?.({ guestIds: ids });
}

const _loadedOnce = ref(false);

watch(
  canReadSeating,
  async (canRead) => {
    if (!canRead || _loadedOnce.value) return;
    _loadedOnce.value = true;

    try {
      await guestDir.load({
        scope: "ONLY_ATTENDING",
        fields: ["menus"],
      });

      seatingStore.syncGuestsFromDirectory(guestDir.items);

      await seatingStore.initListeners();

      await syncMenuAssignmentsRealtime();
    } catch (e) {
      _loadedOnce.value = false;
      console.error("[SeatingSection] load/init failed", e);
      showApiError(t, toast, e);
    }
  },
  { immediate: true },
);

watch(
  () => guestDir.items,
  async (rows) => {
    if (!rows?.length) return;
    seatingStore.syncGuestsFromDirectory(rows);
    try {
      await syncMenuAssignmentsRealtime();
    } catch (e) {
      console.error("[SeatingSection] sync menu assignments failed", e);
    }
  },
  { immediate: true },
);

onBeforeUnmount(() => {
  guestDir.disposeMenusRealtime?.();
  menusStore.disposeRealtime?.();
});
</script>

<style scoped>
.schema-table {
  background: rgba(0, 0, 0, 0.04);
  border: 1px solid rgba(0, 0, 0, 0.08);
  z-index: 1;
}

:global(.sortable-ghost) {
  opacity: 0.35 !important;
}

:global(.sortable-drag) {
  opacity: 1 !important;
}

:global(.sortable-fallback) {
  opacity: 1 !important;
}

:global(.drag-fallback-chip) {
  z-index: 999999 !important;
  opacity: 1 !important;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
  border-radius: 9999px;
  pointer-events: none; /* important */
}

:global(body.is-dragging) {
  user-select: none !important;
  -webkit-user-select: none !important;
}

:global(body.is-dragging *) {
  user-select: none !important;
  -webkit-user-select: none !important;
}
</style>
