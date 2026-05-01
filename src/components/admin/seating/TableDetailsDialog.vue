<!-- src/components/admin/seating/TableDetailsDialog.vue -->
<template>
  <Dialog
    :visible="visible"
    modal
    :style="{ width: '86vw', maxWidth: '1100px' }"
    :breakpoints="{ '960px': '98vw', '640px': '100vw' }"
    @update:visible="(v) => emit('update:visible', v)"
  >
    <template #header>
      <div class="w-full flex items-center justify-between gap-3">
        <div class="min-w-0">
          <p class="font-semibold truncate">{{ headerTitle }}</p>
          <p
            class="text-xs opacity-70 truncate"
            v-if="table"
          >
            {{
              t(
                table.shape === "square"
                  ? "admin.seating.shape_square"
                  : "admin.seating.shape_round"
              )
            }}
          </p>
        </div>

        <div class="flex items-center gap-2">
          <Button
            v-if="!showHelp.tableDetails"
            icon="pi pi-info-circle"
            severity="secondary"
            text
            rounded
            size="small"
            aria-label="Help"
            @click.stop="openTableDetailsHelp"
          />
          <Button
            icon="pi pi-chevron-left"
            severity="secondary"
            rounded
            size="small"
            :disabled="!canNavigate"
            @click.stop="goPrev"
          />
          <Button
            icon="pi pi-chevron-right"
            severity="secondary"
            rounded
            size="small"
            :disabled="!canNavigate"
            @click.stop="goNext"
          />
        </div>
      </div>
    </template>

    <div
      v-if="table"
      class="space-y-6"
    >
      <div class="pt-4">
        <Message
          v-if="showHelp.tableDetails"
          severity="info"
          :closable="true"
          class="-mt-2"
          @close="closeTableDetailsHelp"
        >
          <div class="text-xs text-left space-y-2">
            <ul class="list-disc pl-4 space-y-1">
              <li>{{ t("admin.seating.table_details_help_reorder") }}</li>
              <li>{{ t("admin.seating.table_details_help_capacity") }}</li>
              <li>{{ t("admin.seating.table_details_help_clockwise") }}</li>
              <li v-if="canNavigate">
                {{ t("admin.seating.table_details_help_arrows") }}
              </li>
            </ul>
          </div>
        </Message>
      </div>

      <div class="grid gap-6 md:grid-cols-2">
        <!-- LEFT: liste (draggable classique) -->
        <div class="space-y-3">
          <div class="flex items-center justify-between">
            <div class="text-sm opacity-80">
              {{ t("admin.seating.capacity") }} :
              <strong>{{ computedCapacity }}</strong>
            </div>
            <div class="text-xs opacity-70">
              {{
                t("admin.seating.guests_count", {
                  count: table.guestIds?.length || 0,
                })
              }}
            </div>
          </div>

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
                props.canWrite
                  ? { name: 'tablesGuests', pull: true, put: true }
                  : { name: 'tablesGuests', pull: false, put: false }
              "
              :disabled="!props.canWrite"
              handle=".drag-handle"
              :move="(evt) => props.canWrite && canMoveToTable(evt, table)"
              @update:model-value="
                (next) => props.canWrite && onUpdateGuestIds(next)
              "
              class="min-h-[40px]"
            >
              <template #item="{ element: gid }">
                <div class="flex items-center justify-between gap-2 py-1">
                  <div class="flex items-center gap-2 min-w-0">
                    <span
                      v-if="props.canWrite"
                      class="drag-handle cursor-grab opacity-40 select-none"
                    >⋮⋮</span>
                    <span
                      class="text-sm truncate flex items-center gap-2 min-w-0"
                    >
                      <span class="truncate">{{ guestLabel(gid) }}</span>

                      <span class="inline-flex items-center gap-1 shrink-0">
                        <img
                          v-if="props.guestsIndex?.[gid]?.isCouple"
                          :src="crownIcon"
                          alt="Novios"
                          class="w-3 h-3 object-contain"
                        />
                        <template
                          v-for="b in dietBadgesForGuestId(gid)"
                          :key="b.key"
                        >
                          <img
                            v-if="b.icon"
                            :src="b.icon"
                            :alt="t(b.i18nKey, b.key)"
                            class="w-3 h-3 object-contain opacity-80"
                            v-tooltip.top="dietBadgeTooltip(b)"
                          />
                        </template>
                      </span>
                    </span>
                  </div>

                  <Button
                    v-if="props.canWrite"
                    icon="pi pi-times"
                    text
                    rounded
                    severity="danger"
                    size="small"
                    @click.stop="removeGuest(gid)"
                  />
                </div>
              </template>
            </Draggable>

            <ContentViewer
              v-if="(table.guestIds?.length || 0) === 0"
              class="text-xs opacity-60 mt-1"
              :empty-text="t('admin.seating.table_details_empty')"
            />
          </div>
        </div>

        <!-- RIGHT: paramètres autosave -->
        <Card
          v-if="props.canWrite"
          :style="{ border: '1px solid var(--accent-color)' }"
        >
          <template #title>
            <div class="flex items-center gap-2">
              <p class="admin-bento-title">
                <i
                  class="pi pi-sliders-h text-sm"
                  aria-hidden="true"
                />
                {{ t("admin.seating.settings") }}
              </p>
            </div>
          </template>

          <template #content>
            <div class="space-y-4 mt-2">
              <div class="text-sm">
                {{ t("admin.seating.shape") }} :
                <strong>{{
                  t(table.shape === "square"
                    ? "admin.seating.shape_square"
                    : "admin.seating.shape_round")
                }}</strong>
              </div>

              <!-- ROUND -->
              <div
                v-if="table.shape !== 'square'"
                class="space-y-2"
              >
                <label class="block text-left mb-1 text-sm opacity-80">{{
                  t("admin.seating.capacity_total")
                }}</label>
                <InputNumber
                  v-model="localRoundCapacity"
                  :disabled="!props.canWrite"
                  :min="1"
                  :show-buttons="true"
                />
              </div>

              <!-- SQUARE -->
              <div
                v-else
                class="space-y-2"
              >
                <label class="block text-left mb-1 text-sm opacity-80">{{
                  t("admin.seating.seats_per_side")
                }}</label>

                <div class="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  <div class="flex flex-col">
                    <span class="block text-left mb-1">{{
                      t("admin.seating.side_top")
                    }}</span>
                    <InputNumber
                      v-model="localSeatsPerSide.top"
                      :min="0"
                      :show-buttons="true"
                    />
                  </div>
                  <div class="flex flex-col">
                    <span class="block text-left mb-1">{{
                      t("admin.seating.side_right")
                    }}</span>
                    <InputNumber
                      v-model="localSeatsPerSide.right"
                      :min="0"
                      :show-buttons="true"
                    />
                  </div>
                  <div class="flex flex-col">
                    <span class="block text-left mb-1">{{
                      t("admin.seating.side_bottom")
                    }}</span>
                    <InputNumber
                      v-model="localSeatsPerSide.bottom"
                      :min="0"
                      :show-buttons="true"
                    />
                  </div>
                  <div class="flex flex-col">
                    <span class="block text-left mb-1">{{
                      t("admin.seating.side_left")
                    }}</span>
                    <InputNumber
                      v-model="localSeatsPerSide.left"
                      :min="0"
                      :show-buttons="true"
                    />
                  </div>
                </div>

                <div class="text-sm opacity-80">
                  {{ t("admin.seating.capacity_total") }}
                  <strong>{{ localSquareCapacity }}</strong>
                </div>
              </div>
            </div>
          </template>
        </Card>
      </div>

      <!-- FULL WIDTH: schéma (slots + swap/move) -->
      <Card :style="{ border: '1px solid var(--accent-color)' }">
        <template #title>
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <p class="admin-bento-title">
                <i
                  class="pi pi-sitemap text-sm"
                  aria-hidden="true"
                />
                {{ t("admin.seating.schema") }}
              </p>
            </div>
          </div>
        </template>

        <template #content>
          <div class="schema-container">
            <div
              class="schema-table"
              :class="table.shape === 'square' ? 'is-square' : 'is-round'"
              :style="
                table.shape === 'square' ? squareRectStyle : roundTableStyle
              "
            />

            <!-- slots = capacité (même vides) -->
            <div
              v-for="slot in schemaSlots"
              :key="slot.index"
              class="schema-seat"
              :style="slot.style"
              @dragover.prevent="props.canWrite && onSchemaDragOver(slot.index)"
              @dragleave="props.canWrite && onSchemaDragLeave(slot.index)"
              @drop.prevent="props.canWrite && onSchemaDrop(slot.index)"
              :class="{
                'is-drop-target':
                  schemaDropTargetIndex === slot.index &&
                  schemaDragFromIndex !== null,
              }"
            >
              <div
                v-if="slot.gid"
                class="schema-pill"
                :draggable="props.canWrite"
                @dragstart="props.canWrite && onSchemaDragStart(slot.index)"
                v-tooltip.top="guestLabel(slot.gid)"
              >
                <span class="truncate">{{ guestInitialsById(slot.gid) }}</span>
              </div>

              <div
                v-else
                class="schema-empty"
              />
            </div>
          </div>
        </template>
      </Card>
    </div>

    <ContentViewer
      v-else
      class="text-sm opacity-70"
      :empty-text="t('admin.seating.table_not_found')"
    />
  </Dialog>
</template>

<script setup>
import { computed, ref, watch, onBeforeUnmount } from "vue";

import Dialog from "primevue/dialog";
import Button from "primevue/button";
import Card from "primevue/card";
import InputNumber from "primevue/inputnumber";
import Draggable from "vuedraggable";
import Message from "primevue/message";
import { useToast } from "primevue/usetoast";

import { useLang } from "@/composables/useLang";
import { useSeatingStore } from "@/stores/seatingStore";
import { getDietBadges } from "@/shared/dietIcons";
import { ensureOtherIfText } from "../../../../shared/dietTypes";
import crownIcon from "@/assets/icons/crown.png";
import { showApiError } from "@/utils/showApiError";
import ContentViewer from "@/components/utils/ContentViewer.vue";

const props = defineProps({
  visible: { type: Boolean, default: false },
  tableId: { type: String, default: null },
  tableName: { type: String, default: "" },
  guestsIndex: { type: Object, default: () => ({}) },
  tables: { type: Array, default: () => [] },
  canWrite: { type: Boolean, default: false },
});

const emit = defineEmits(["update:visible", "update:tableId"]);

const { t } = useLang();
const toast = useToast();
const seatingStore = useSeatingStore();

const TABLE_DETAILS_HELP_STORAGE_KEY = "help:seating:table_details_dialog";

function getInitialTableDetailsHelpVisibility() {
  if (typeof window === "undefined") return true;
  try {
    return (
      window.localStorage.getItem(TABLE_DETAILS_HELP_STORAGE_KEY) !== "hidden"
    );
  } catch {
    return true;
  }
}

const showHelp = ref({ tableDetails: getInitialTableDetailsHelpVisibility() });

function closeTableDetailsHelp() {
  showHelp.value.tableDetails = false;
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(TABLE_DETAILS_HELP_STORAGE_KEY, "hidden");
  } catch {
    // ignore localStorage failures
  }
}

function openTableDetailsHelp() {
  showHelp.value.tableDetails = true;
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(TABLE_DETAILS_HELP_STORAGE_KEY);
  } catch {
    // ignore localStorage failures
  }
}

/* table */
const table = computed(() => {
  if (!props.tableId) return null;
  return seatingStore.tables?.[props.tableId] || null;
});

const headerTitle = computed(() => {
  if (props.tableName) return props.tableName;
  if (!table.value) return t("admin.seating.table", "Table");
  return table.value.name || t("admin.seating.table", "Table");
});

/* nav */
const navTables = computed(() => {
  const passed = props.tables || [];
  return passed.length ? passed : seatingStore.sortedTables || [];
});
const canNavigate = computed(() => navTables.value.length >= 2);

const currentIndex = computed(() => {
  if (!props.tableId) return -1;
  return navTables.value.findIndex((tt) => tt.id === props.tableId);
});

function goPrev() {
  if (!canNavigate.value) return;
  const list = navTables.value;
  const idx = currentIndex.value;
  const nextIdx = idx <= 0 ? list.length - 1 : idx - 1;
  emit("update:tableId", list[nextIdx].id);
}

function goNext() {
  if (!canNavigate.value) return;
  const list = navTables.value;
  const idx = currentIndex.value;
  const nextIdx = idx >= list.length - 1 ? 0 : idx + 1;
  emit("update:tableId", list[nextIdx].id);
}

/* capacity */
function computeSquareCapacity(seatsPerSide = {}) {
  return (
    Number(seatsPerSide.top || 0) +
    Number(seatsPerSide.right || 0) +
    Number(seatsPerSide.bottom || 0) +
    Number(seatsPerSide.left || 0)
  );
}

const computedCapacity = computed(() => {
  if (!table.value) return 0;
  if (table.value.shape === "square") {
    return computeSquareCapacity(table.value.seatsPerSide || {});
  }
  return Number(table.value.capacity || 0);
});

/* autosave locals */
const localRoundCapacity = ref(null);
const localSeatsPerSide = ref({ top: 0, right: 0, bottom: 0, left: 0 });
const isHydrating = ref(false);
const autosaveTimer = ref(null);

/* anti-spam toast */
const lastToastAt = ref(0);
const TOAST_COOLDOWN_MS = 1500;

function withCooldown(fn) {
  const now = Date.now();
  const canToast = now - lastToastAt.value > TOAST_COOLDOWN_MS;

  return Promise.resolve()
    .then(fn)
    .catch((e) => {
      if (canToast) showApiError(t, toast, e);
      throw e;
    })
    .finally(() => {
      if (canToast) lastToastAt.value = Date.now();
    });
}

watch(
  table,
  (tt) => {
    if (!tt) return;
    isHydrating.value = true;

    if (tt.shape === "square") {
      const s = tt.seatsPerSide || {};
      localSeatsPerSide.value = {
        top: Number(s.top || 0),
        right: Number(s.right || 0),
        bottom: Number(s.bottom || 0),
        left: Number(s.left || 0),
      };
      localRoundCapacity.value = null;
    } else {
      localRoundCapacity.value = Number(tt.capacity || 0) || 1;
      localSeatsPerSide.value = { top: 0, right: 0, bottom: 0, left: 0 };
    }

    queueMicrotask(() => (isHydrating.value = false));
  },
  { immediate: true }
);

const localSquareCapacity = computed(() =>
  computeSquareCapacity(localSeatsPerSide.value)
);

function scheduleAutosave(fn) {
  if (autosaveTimer.value) clearTimeout(autosaveTimer.value);
  autosaveTimer.value = setTimeout(async () => {
    autosaveTimer.value = null;
    await withCooldown(fn); // ✅ (et plus runWithToastCooldown)
  }, 350);
}

watch(localRoundCapacity, (v) => {
  if (!table.value || isHydrating.value) return;
  if (table.value.shape === "square") return;

  const nextCap = Number(v || 0);
  if (nextCap < 1) return;
  if (nextCap === Number(table.value.capacity || 0)) return;

  scheduleAutosave(async () => {
    await seatingStore.updateTableMeta(props.tableId, { capacity: nextCap });

    const gids = table.value?.guestIds || [];
    if (gids.length > nextCap) {
      await seatingStore.setTableGuestIds(
        props.tableId,
        gids.slice(0, nextCap)
      );
    }
  });
});

watch(
  localSeatsPerSide,
  (s) => {
    if (!table.value || isHydrating.value) return;
    if (table.value.shape !== "square") return;

    const seatsPerSide = {
      top: Number(s.top || 0),
      right: Number(s.right || 0),
      bottom: Number(s.bottom || 0),
      left: Number(s.left || 0),
    };

    const current = table.value.seatsPerSide || {};
    const same =
      Number(current.top || 0) === seatsPerSide.top &&
      Number(current.right || 0) === seatsPerSide.right &&
      Number(current.bottom || 0) === seatsPerSide.bottom &&
      Number(current.left || 0) === seatsPerSide.left;

    if (same) return;

    scheduleAutosave(async () => {
      const capacity = computeSquareCapacity(seatsPerSide);

      await seatingStore.updateTableMeta(props.tableId, {
        seatsPerSide,
        capacity,
      });

      const gids = table.value?.guestIds || [];
      if (gids.length > capacity) {
        await seatingStore.setTableGuestIds(
          props.tableId,
          gids.slice(0, capacity)
        );
      }
    });
  },
  { deep: true }
);

/* labels + diet */
function guestLabel(gid) {
  const g = props.guestsIndex?.[gid];
  if (!g) return gid;
  return `${g.firstName || ""} ${g.lastName || ""}`.trim() || gid;
}

function guestInitialsById(gid) {
  const g = props.guestsIndex?.[gid];
  if (!g) return gid;
  const first = (g.firstName || "").trim();
  const last = (g.lastName || "").trim();
  const lastInitial = last ? last.charAt(0).toUpperCase() + "." : "";
  return `${first} ${lastInitial}`.trim() || gid;
}

function dietBadgesForGuestId(gid) {
  const g = props.guestsIndex?.[gid];
  if (!g) return [];
  try {
    const rawCodes = Array.isArray(g.dietCodes)
      ? g.dietCodes
      : typeof g.dietCodes === "string"
        ? g.dietCodes
            .split(",")
            .map((x) => String(x || "").trim())
            .filter(Boolean)
        : [];
    const otherText = String(g.dietOtherText || "").trim();
    const normalizedCodes = ensureOtherIfText(rawCodes, otherText);

    return getDietBadges(normalizedCodes, otherText);
  } catch {
    return [];
  }
}

function dietBadgeTooltip(badge) {
  return badge.tooltip ? badge.tooltip : t(badge.i18nKey, badge.key);
}

/* capacity gate */
function getCapacity(tt) {
  if (!tt) return 0;
  if (tt.shape === "square")
    return computeSquareCapacity(tt.seatsPerSide || {});
  return Number(tt.capacity || 0);
}

function canMoveToTable(evt, targetTable) {
  const dragged = evt?.draggedContext;
  const related = evt?.relatedContext;
  if (!dragged || !related) return true;

  const gid = dragged.element;

  // reorder interne
  if (gid && (targetTable.guestIds || []).includes(gid)) return true;

  // capacity check
  const capacity = getCapacity(targetTable);
  if (!capacity) return true;

  const currentCount = targetTable.guestIds?.length || 0;
  return currentCount < capacity;
}

/* guestIds updates (liste) */
async function onUpdateGuestIds(nextGuestIds) {
  if (!props.tableId) return;
  await withCooldown(() =>
    seatingStore.setTableGuestIds(props.tableId, nextGuestIds)
  );
}

async function removeGuest(gid) {
  if (!props.tableId || !table.value) return;
  const next = (table.value.guestIds || []).filter((x) => x !== gid);
  await withCooldown(() => seatingStore.setTableGuestIds(props.tableId, next));
}

/* ====== SCHÉMA: slots + DnD swap/move ====== */
const schemaDragFromIndex = ref(null);
const schemaDropTargetIndex = ref(null);

const schemaSlots = computed(() => {
  if (!table.value) return [];
  const capacity = getCapacity(table.value);
  const gids = table.value.guestIds || [];
  const positions = Array.from({ length: capacity }, (_, i) => gids[i] ?? null);

  return positions.map((gid, i) => ({
    index: i,
    gid,
    style: getSeatStyleClockwise(table.value, i, capacity),
  }));
});

function onSchemaDragStart(fromIndex) {
  schemaDragFromIndex.value = fromIndex;
}

function onSchemaDragOver(overIndex) {
  schemaDropTargetIndex.value = overIndex;
}

function onSchemaDragLeave(overIndex) {
  if (schemaDropTargetIndex.value === overIndex)
    schemaDropTargetIndex.value = null;
}

async function onSchemaDrop(toIndex) {
  if (!table.value) return;

  const fromIndex = schemaDragFromIndex.value;
  schemaDragFromIndex.value = null;
  schemaDropTargetIndex.value = null;

  if (fromIndex == null || toIndex == null) return;
  if (fromIndex === toIndex) return;

  const capacity = getCapacity(table.value);
  const gids = table.value.guestIds || [];
  const positions = Array.from({ length: capacity }, (_, i) => gids[i] ?? null);

  const fromGid = positions[fromIndex];
  const toGid = positions[toIndex];
  if (!fromGid) return;

  if (toGid) {
    positions[fromIndex] = toGid;
    positions[toIndex] = fromGid;
  } else {
    positions[fromIndex] = null;
    positions[toIndex] = fromGid;
  }

  const nextGuestIds = positions.filter(Boolean);

  await withCooldown(() =>
    seatingStore.setTableGuestIds(props.tableId, nextGuestIds)
  );
}

/* ====== POSITIONNEMENT ====== */
function getSeatStyleClockwise(tt, index, capacity) {
  if (!tt || !capacity) return {};
  if (tt.shape !== "square") return getRoundSeatStyle(index, capacity);
  return getSquareSeatStyleClockwise(tt, index, capacity);
}

function getRoundSeatStyle(index, total) {
  const angle = (2 * Math.PI * index) / total - Math.PI / 2;
  const radius = 42;
  const top = 50 + radius * Math.sin(angle);
  const left = 50 + radius * Math.cos(angle);
  return { top: `${top}%`, left: `${left}%` };
}

function getSquareSeatStyleClockwise(tt, index, total) {
  const s = tt.seatsPerSide || {};
  const topCount = Number(s.top || 0);
  const rightCount = Number(s.right || 0);
  const bottomCount = Number(s.bottom || 0);
  const leftCount = Number(s.left || 0);

  const margin = 12;
  const min = margin;
  const max = 100 - margin;
  const span = max - min;

  const posForward = (i, count) => min + ((i + 1) * span) / (count + 1);
  const posReverse = (i, count) => max - ((i + 1) * span) / (count + 1);

  if (index < topCount)
    return { top: `${min}%`, left: `${posForward(index, topCount)}%` };

  let offset = topCount;

  if (index < offset + rightCount) {
    const i = index - offset;
    return { top: `${posForward(i, rightCount)}%`, left: `${max}%` };
  }

  offset += rightCount;

  if (index < offset + bottomCount) {
    const i = index - offset;
    return { top: `${max}%`, left: `${posReverse(i, bottomCount)}%` };
  }

  offset += bottomCount;

  if (index < offset + leftCount) {
    const i = index - offset;
    return { top: `${posReverse(i, leftCount)}%`, left: `${min}%` };
  }

  return getRoundSeatStyle(index, total);
}

/* table drawing */
const roundTableStyle = computed(() => ({
  width: "56%",
  height: "56%",
  top: "50%",
  left: "50%",
  transform: "translate(-50%, -50%)",
}));

const squareRectStyle = computed(() => {
  const BASE = 58;
  const MAX = 78;
  const MIN = 42;

  const s = table.value?.seatsPerSide || {};
  const hSeats = Number(s.top || 0) + Number(s.bottom || 0);
  const vSeats = Number(s.left || 0) + Number(s.right || 0);

  let width = BASE;
  let height = BASE;

  if (hSeats || vSeats) {
    const ratio = hSeats / (vSeats || 1);
    if (ratio > 1) width = BASE * Math.min(ratio, 2);
    else if (ratio < 1) height = BASE * Math.min(1 / ratio, 2);
  }

  width = Math.max(MIN, Math.min(width, MAX));
  height = Math.max(MIN, Math.min(height, MAX));

  return {
    width: width + "%",
    height: height + "%",
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)",
  };
});

onBeforeUnmount(() => {
  if (autosaveTimer.value) clearTimeout(autosaveTimer.value);
});
</script>

<style scoped>
.schema-container {
  position: relative;
  width: 100%;
  height: 520px;
  border-radius: 14px;
  background: white;
  overflow: hidden;
}

.schema-table {
  position: absolute;
  background: rgba(0, 0, 0, 0.04);
  border: 1px solid rgba(0, 0, 0, 0.08);
  z-index: 1;
}
.schema-table.is-round {
  border-radius: 999px;
}
.schema-table.is-square {
  border-radius: 10px;
}

.schema-seat {
  position: absolute;
  transform: translate(-50%, -50%);
  z-index: 2;
}

.schema-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  font-size: 12px;
  background: #fff;
  border: 1px solid rgba(0, 0, 0, 0.1);
  border-radius: 999px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.06);
  max-width: 180px;
  cursor: grab;
  user-select: none;
}
.schema-pill:active {
  cursor: grabbing;
}

.schema-empty {
  width: 90px;
  height: 28px;
  border-radius: 999px;
  border: 1px dashed rgba(0, 0, 0, 0.18);
  background: rgba(0, 0, 0, 0.02);
}

.schema-seat.is-drop-target .schema-pill,
.schema-seat.is-drop-target .schema-empty {
  outline: 2px solid var(--accent-color);
  box-shadow: 0 0 0 3px rgba(0, 0, 0, 0.06);
}
</style>
