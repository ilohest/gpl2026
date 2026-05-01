<!-- src/components/admin/seating/TablesLayoutDialog.vue -->
<template>
  <Dialog
    v-model:visible="localVisible"
    modal
    :style="dialogStyle"
    :maximizable="true"
    @maximize="isPlanFullscreen = true"
    @unmaximize="isPlanFullscreen = false"
  >
    <template #header>
      <div class="flex items-center text-left gap-2">
        <i class="pi pi-map text-sm" />
        <p class="font-bold">
          {{ t("admin.seating.layout_dialog_title") }}
        </p>
        <Button
          v-if="!showHelp"
          text
          rounded
          size="small"
          icon="pi pi-info-circle"
          severity="secondary"
          class="p-0"
          aria-label="Help"
          @click="openHelp"
        />
      </div>
    </template>

    <div class="pt-2">
      <Message
        v-if="showHelp"
        severity="info"
        :closable="true"
        @close="closeHelp"
      >
        <div class="space-y-1">
          <ul class="list-disc pl-4 !text-xs">
            <li>
              {{ t("admin.seating.layout_help_drag") }}
            </li>
            <li>
              {{ t("admin.seating.layout_help_rotate") }}
            </li>
            <li>
              {{ t("admin.seating.layout_help_door") }}
            </li>
            <li>
              {{ t("admin.seating.layout_help_hover") }}
            </li>
          </ul>
        </div>
      </Message>
    </div>

    <div
      ref="layoutContainerRef"
      class="relative mx-auto border-2 rounded-xl bg-[var(--surface-ground)] overflow-hidden aspect-[16/9] w-full mt-3"
    >
      <ContentViewer
        v-if="!tables.length"
        class="text-xs opacity-60 absolute inset-0 flex items-center justify-center"
        :empty-text="t('admin.seating.layout_no_tables')"
      />

      <!-- PORTE DRAGGABLE -->
      <div
        class="absolute flex items-center justify-center"
        :class="props.canWrite ? 'cursor-move' : 'cursor-default opacity-70'"
        :style="doorStyle"
        @mousedown.prevent="props.canWrite && startDoorDrag($event)"
      >
        <img
          :src="doorImg"
          alt="Porte"
          class="w-full h-full object-contain pointer-events-none"
          :style="doorImageStyle"
        />
      </div>

      <!-- Mini tables draggables -->
      <div
        v-for="(table, idx) in tables"
        :key="'layout-' + table.id"
        class="absolute flex flex-col items-center text-[11px] select-none"
        :class="props.canWrite ? 'cursor-move' : 'cursor-default'"
        :style="getLayoutTableStyle(table.id, idx)"
        @mousedown.prevent="props.canWrite && startTableDrag($event, table.id)"
        @mouseenter="onTableHoverEnter(table.id, $event)"
        @mousemove="onTableHoverMove($event)"
        @mouseleave="onTableHoverLeave"
      >
        <!-- Boîte relative = schéma de la table (c’est elle qui tourne) -->
        <div
          class="relative flex items-center justify-center schema-table bg-white"
          :class="table.shape === 'square' ? 'rounded-md' : 'rounded-full'"
          :style="[
            getMiniTableDimensions(table),
            getSchemaRotationStyle(table.id),
          ]"
        >
          <!-- Handle rotation (write-only) -->
          <div
            v-if="props.canWrite"
            class="absolute -top-5 -right-5 flex flex-col items-center"
            @mousedown.stop.prevent="startRotateDrag($event, table.id)"
            v-tooltip.top="t('admin.seating.rotate_table')"
          >
            <div class="rounded-full flex items-center justify-center">
              <span class="text-[22px] text-[var(--accent-color)]">↻</span>
            </div>
          </div>

          <!-- Titre de la table -->
          <div
            class="absolute inset-0 flex items-center justify-center pointer-events-none"
            :style="getLabelCounterRotationStyle(table.id)"
          >
            <span
              class="text-[11px] font-semibold text-center leading-tight pointer-events-none"
            >
              #{{ getTableIndex(table.id) + 1 }}
              <br />
              {{ getTableLabel(table) }}
            </span>
          </div>

          <!-- petits points / icônes pour les invités -->
          <div
            v-for="(gid, gIndex) in table.guestIds || []"
            :key="gid"
            class="absolute"
            :style="getSeatDotStyle(table, gIndex, table.guestIds.length)"
            @mouseenter.stop="onSeatHoverEnter(table.id, gid, $event)"
            @mousemove.stop="onSeatHoverMove($event)"
            @mouseleave.stop="onSeatHoverLeave"
          >
            <!-- MARIÉS : couronne + éventuels badges de régime -->
            <template v-if="isCoupleSeat(gid)">
              <div
                class="inline-flex justify-center"
                :class="
                  getCoupleSeatContainerClass(
                    table,
                    gIndex,
                    table.guestIds.length,
                  )
                "
              >
                <img
                  :src="crownIcon"
                  alt="Mariés"
                  class="w-6 h-6 object-contain shrink-0"
                />

                <div
                  v-if="seatHasDiet(gid)"
                  class="inline-flex"
                  :class="
                    getSeatBadgesDirectionClass(
                      table,
                      gIndex,
                      table.guestIds.length,
                    )
                  "
                >
                  <img
                    v-for="badge in getSeatBadges(gid)"
                    :key="badge.key"
                    :src="badge.icon"
                    alt=""
                    class="w-5 h-5 object-contain shrink-0"
                  />
                </div>
              </div>
            </template>

            <!-- Invités avec restriction : uniquement badges -->
            <template v-else-if="seatHasDiet(gid)">
              <div
                class="inline-flex justify-center"
                :class="
                  getSeatBadgesDirectionClass(
                    table,
                    gIndex,
                    table.guestIds.length,
                  )
                "
              >
                <img
                  v-for="badge in getSeatBadges(gid)"
                  :key="badge.key"
                  :src="badge.icon"
                  alt=""
                  class="w-5 h-5 object-contain shrink-0"
                />
              </div>
            </template>

            <!-- Invités sans rien : point noir -->
            <template v-else>
              <span
                class="block w-3.5 h-3.5 rounded-full bg-[var(--text-color)]"
              ></span>
            </template>
          </div>
        </div>

        <div class="text-[11px] opacity-80 mt-5">
          {{ table.guestIds?.length || 0 }}
          {{ t("admin.seating.guests_short", "invités") }}
        </div>
      </div>

      <Teleport to="body">
        <div
          v-if="hoverPopover.visible"
          class="fixed z-[9999] pointer-events-none"
          :style="{
            left: hoverPopover.x + 'px',
            top: hoverPopover.y + 'px',
          }"
        >
          <div
            class="bg-white border border-black/10 rounded-xl shadow-lg px-3 py-2 w-[240px]"
          >
            <p class="text-xs font-semibold mb-1">{{ hoverPopover.title }}</p>

            <!-- LISTE : uniquement en mode table -->
            <ul
              v-if="hoverPopover.mode === 'table'"
              class="text-xs space-y-1 max-h-[320px] overflow-auto pr-1"
            >
              <li
                v-for="g in hoverPopover.guests"
                :key="g.id"
                class="flex items-center justify-between gap-2"
              >
                <span class="text-left break-words">{{ g.label }}</span>

                <span
                  v-if="g.badges?.length"
                  class="inline-flex items-center gap-1 shrink-0"
                >
                  <img
                    v-for="b in g.badges"
                    :key="b.key"
                    :src="b.icon"
                    :alt="b.tooltip || ''"
                    class="w-4 h-4 object-contain"
                  />
                </span>
              </li>
            </ul>

            <!-- "+N" : uniquement en mode table -->
            <p
              v-if="hoverPopover.mode === 'table' && hoverPopover.moreCount > 0"
              class="text-[11px] opacity-60 mt-1"
            >
              +{{ hoverPopover.moreCount }}
              {{ t("admin.seating.guests_short", "invités") }}
            </p>

            <!-- EMPTY STATE : uniquement en mode table -->
            <ContentViewer
              v-if="
                hoverPopover.mode === 'table' &&
                  hoverPopover.guests.length === 0
              "
              class="text-[11px] opacity-60"
              :empty-text="
                t(
                  'admin.seating.no_guests_table',
                  'Aucun invité pour cette table.',
                )
              "
            />
          </div>
        </div>
      </Teleport>
    </div>
  </Dialog>
</template>

<script setup>
import { computed, reactive, ref, onBeforeUnmount, onMounted } from "vue";
import { api } from "@/services/api";
import { ensureFirebase, doc, onSnapshot } from "@/services/firebaseClient";

import Dialog from "primevue/dialog";
import Message from "primevue/message";
import { useToast } from "primevue/usetoast";

import { useLang } from "@/composables/useLang";
import { useSeatingStore } from "@/stores/seatingStore";
import { getDietBadges } from "@/shared/dietIcons";
import { ensureOtherIfText } from "../../../../shared/dietTypes";
import doorImg from "@/assets/icons/door.png";
import crownIcon from "@/assets/icons/crown.png";
import { showApiError } from "@/utils/showApiError";
import ContentViewer from "@/components/utils/ContentViewer.vue";

const toast = useToast();

const { t } = useLang();
const seatingStore = useSeatingStore();
const guestsIndex = computed(() => seatingStore.guestsIndex);

const props = defineProps({
  visible: { type: Boolean, default: false },
  tables: { type: Array, default: () => [] },
  canWrite: { type: Boolean, default: false },
});

const emit = defineEmits(["update:visible", "layout-change"]);

const isPlanFullscreen = ref(false);
const localVisible = computed({
  get: () => props.visible,
  set: (val) => emit("update:visible", val),
});
const SEATING_LAYOUT_DIALOG_HELP_KEY = "help:seating:layout_dialog";

function getInitialHelpVisibility() {
  if (typeof window === "undefined") return true;
  try {
    return (
      window.localStorage.getItem(SEATING_LAYOUT_DIALOG_HELP_KEY) !== "hidden"
    );
  } catch {
    return true;
  }
}

const showHelp = ref(getInitialHelpVisibility());
const layoutContainerRef = ref(null);
let doorUnsubscribe = null;

function closeHelp() {
  showHelp.value = false;
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(SEATING_LAYOUT_DIALOG_HELP_KEY, "hidden");
  } catch {
    // ignore localStorage failures
  }
}

function openHelp() {
  showHelp.value = true;
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(SEATING_LAYOUT_DIALOG_HELP_KEY);
  } catch {
    // ignore localStorage failures
  }
}

const layoutState = reactive({
  draggingTableId: null,
  offsetX: 0,
  offsetY: 0,
  positions: {}, // tableId -> { x, y }
  rotations: {}, // tableId -> angle en degrés
  rotatingTableId: null,
  rotateStartAngleRad: 0,
  rotateBaseDeg: 0,
});

// PORTE
const doorState = reactive({
  side: "bottom",
  offset: 0.5,
  dragging: false,
});

const dialogStyle = computed(() =>
  isPlanFullscreen.value
    ? { width: "95vw", maxWidth: "1400px" }
    : { width: "80vw", maxWidth: "1100px" },
);

function getTableIndex(tableId) {
  return (props.tables || []).findIndex((t) => t.id === tableId);
}

function getTableLabel(table) {
  const fallback =
    t("admin.seating.default_table_name", "Table") +
    " " +
    (getTableIndex(table.id) + 1);
  return table.name && table.name.trim() ? table.name : fallback;
}

/* ===== taille mini-table ===== */

function getMiniTableDimensions(table) {
  const BASE = 86;
  const MIN = 64;
  const MAX = 300;

  // Tables rondes : taille standard
  if (table.shape !== "square") {
    return { width: BASE + "px", height: BASE + "px" };
  }

  const { top, right, bottom, left } = getGuestCountsBySide(
    table,
    table.guestIds?.length || 0,
  );

  const hMax = Math.max(top, bottom);
  const vMax = Math.max(left, right);

  if (!hMax && !vMax) {
    return { width: BASE + "px", height: BASE + "px" };
  }

  // largeur/hauteur proportionnelles au nombre d'invités par côté
  const SEAT_PITCH = 34;
  let width = Math.max(BASE, (hMax + 1) * SEAT_PITCH);
  let height = Math.max(BASE, (vMax + 1) * SEAT_PITCH);

  width = Math.max(MIN, Math.min(width, MAX));
  height = Math.max(MIN, Math.min(height, MAX));

  return { width: width + "px", height: height + "px" };
}

function getGuestCountsBySide(table, totalGuests) {
  const s = table?.seatsPerSide || {};
  const topCap = Number(s.top || 0);
  const rightCap = Number(s.right || 0);
  const bottomCap = Number(s.bottom || 0);
  const leftCap = Number(s.left || 0);

  let remaining = Math.max(0, Number(totalGuests || 0));
  const top = Math.min(topCap, remaining);
  remaining -= top;
  const right = Math.min(rightCap, remaining);
  remaining -= right;
  const bottom = Math.min(bottomCap, remaining);
  remaining -= bottom;
  const left = Math.min(leftCap, remaining);

  return { top, right, bottom, left };
}

/* ===== rotation / style schéma ===== */

function getRotation(tableId) {
  const local = layoutState.rotations[tableId];
  if (typeof local === "number") return local;

  const table = (props.tables || []).find((t) => t.id === tableId);
  const fromDb =
    table && typeof table.layoutRotationDeg === "number"
      ? table.layoutRotationDeg
      : 0;
  layoutState.rotations[tableId] = fromDb;
  return fromDb;
}

function getSchemaRotationStyle(tableId) {
  const rotation = getRotation(tableId);
  return {
    transform: `rotate(${rotation}deg)`,
    transformOrigin: "50% 50%",
  };
}

function getLabelCounterRotationStyle(tableId) {
  const rotation = getRotation(tableId);
  return {
    transform: `rotate(${-rotation}deg)`,
  };
}

/* ===== position globale de la table (sans rotation) ===== */

function getLayoutTableStyle(tableId, idx) {
  let existing = layoutState.positions[tableId];

  if (!existing) {
    const table = (props.tables || []).find((t) => t.id === tableId);
    if (
      table &&
      table.layoutPosition &&
      typeof table.layoutPosition.x === "number" &&
      typeof table.layoutPosition.y === "number"
    ) {
      existing = { x: table.layoutPosition.x, y: table.layoutPosition.y };
    } else {
      const cols = 4;
      const col = idx % cols;
      const row = Math.floor(idx / cols);

      const paddingX = 0.1;
      const paddingY = 0.1;

      const totalTables = props.tables?.length || 1;
      const rows = Math.max(1, Math.ceil(totalTables / cols));

      const usableWidth = 1 - paddingX * 2;
      const usableHeight = 1 - paddingY * 2;

      const stepX = cols > 1 ? usableWidth / (cols - 1) : 0;
      const stepY = rows > 1 ? usableHeight / (rows - 1) : 0;

      existing = {
        x: paddingX + stepX * col,
        y: paddingY + stepY * row,
      };
    }

    layoutState.positions[tableId] = existing;
  }

  return {
    left: `${existing.x * 100}%`,
    top: `${existing.y * 100}%`,
    transform: "translate(-50%, -50%)",
  };
}

/* ===== drag table (position) ===== */

function startTableDrag(event, tableId) {
  if (!props.canWrite) return;
  hoverPopover.visible = false;

  const container = layoutContainerRef.value;
  if (!container) return;

  const rect = container.getBoundingClientRect();
  const width = rect.width || 1;
  const height = rect.height || 1;

  const pos = layoutState.positions[tableId] || { x: 0.1, y: 0.1 };
  const currentX = pos.x * width;
  const currentY = pos.y * height;

  layoutState.draggingTableId = tableId;
  layoutState.offsetX = event.clientX - (rect.left + currentX);
  layoutState.offsetY = event.clientY - (rect.top + currentY);

  window.addEventListener("mousemove", onTableDrag);
  window.addEventListener("mouseup", stopTableDrag);
}

function onTableDrag(event) {
  const container = layoutContainerRef.value;
  const tableId = layoutState.draggingTableId;
  if (!container || !tableId) return;

  const table = (props.tables || []).find((t) => t.id === tableId);
  const { w, h } = table ? getMiniSizePx(table) : { w: 80, h: 80 };

  const rect = container.getBoundingClientRect();
  const width = rect.width || 1;
  const height = rect.height || 1;

  let xPx = event.clientX - rect.left - layoutState.offsetX;
  let yPx = event.clientY - rect.top - layoutState.offsetY;

  xPx = Math.max(0, Math.min(xPx, width - w));
  yPx = Math.max(0, Math.min(yPx, height - h));

  layoutState.positions[tableId] = { x: xPx / width, y: yPx / height };
}

function stopTableDrag() {
  const tableId = layoutState.draggingTableId;

  if (tableId) {
    const pos = layoutState.positions[tableId];
    const rotation = getRotation(tableId);

    if (pos) {
      emit("layout-change", {
        tableId,
        position: { x: pos.x, y: pos.y },
        rotationDeg: rotation,
      });
    }
  }

  layoutState.draggingTableId = null;
  window.removeEventListener("mousemove", onTableDrag);
  window.removeEventListener("mouseup", stopTableDrag);
}

/* ===== drag pour rotation ===== */

function startRotateDrag(event, tableId) {
  if (!props.canWrite) return;
  hoverPopover.visible = false;

  const container = layoutContainerRef.value;
  if (!container) return;

  const rect = container.getBoundingClientRect();
  const width = rect.width || 1;
  const height = rect.height || 1;

  const pos =
    layoutState.positions[tableId] ||
    (() => {
      const table = (props.tables || []).find((t) => t.id === tableId);
      if (
        table &&
        table.layoutPosition &&
        typeof table.layoutPosition.x === "number" &&
        typeof table.layoutPosition.y === "number"
      ) {
        return table.layoutPosition;
      }
      return { x: 0.5, y: 0.5 };
    })();

  const centerX = rect.left + pos.x * width;
  const centerY = rect.top + pos.y * height;

  const dx = event.clientX - centerX;
  const dy = event.clientY - centerY;
  const startAngle = Math.atan2(dy, dx);

  layoutState.rotatingTableId = tableId;
  layoutState.rotateStartAngleRad = startAngle;
  layoutState.rotateBaseDeg = getRotation(tableId);

  window.addEventListener("mousemove", onRotateDrag);
  window.addEventListener("mouseup", stopRotateDrag);
}

function getTablePos01(tableId) {
  return (
    layoutState.positions[tableId] ||
    (() => {
      const table = (props.tables || []).find((t) => t.id === tableId);
      if (
        table?.layoutPosition &&
        typeof table.layoutPosition.x === "number" &&
        typeof table.layoutPosition.y === "number"
      ) {
        return table.layoutPosition;
      }
      return { x: 0.5, y: 0.5 };
    })()
  );
}

function onRotateDrag(event) {
  const container = layoutContainerRef.value;
  const tableId = layoutState.rotatingTableId;
  if (!container || !tableId) return;

  const rect = container.getBoundingClientRect();
  const width = rect.width || 1;
  const height = rect.height || 1;

  const pos = getTablePos01(tableId);

  const centerX = rect.left + pos.x * width;
  const centerY = rect.top + pos.y * height;

  const dx = event.clientX - centerX;
  const dy = event.clientY - centerY;
  const currentAngle = Math.atan2(dy, dx);

  const deltaRad = currentAngle - layoutState.rotateStartAngleRad;
  const deltaDeg = (deltaRad * 180) / Math.PI;

  let next = layoutState.rotateBaseDeg + deltaDeg;
  next = ((next % 360) + 360) % 360;

  layoutState.rotations[tableId] = next;
}

function stopRotateDrag() {
  const tableId = layoutState.rotatingTableId;
  if (tableId) {
    const pos = layoutState.positions[tableId];
    const rotation = getRotation(tableId);

    if (pos) {
      emit("layout-change", {
        tableId,
        position: { x: pos.x, y: pos.y },
        rotationDeg: rotation,
      });
    }
  }

  layoutState.rotatingTableId = null;
  window.removeEventListener("mousemove", onRotateDrag);
  window.removeEventListener("mouseup", stopRotateDrag);
}

/* ===== sièges / icônes ===== */

function getSeatDotStyle(table, index, total) {
  if (!total) return {};

  // Tables rondes → déjà en dehors avec radius 65
  if (table.shape !== "square") {
    const angle = (2 * Math.PI * index) / total - Math.PI / 2;
    const radius = 75; // avant 65 → invités plus loin
    const top = 50 + radius * Math.sin(angle);
    const left = 50 + radius * Math.cos(angle);

    return {
      top: `${top}%`,
      left: `${left}%`,
      transform: "translate(-50%, -50%)",
    };
  }

  // Tables carrées
  const {
    top: topUsed,
    right: rightUsed,
    bottom: bottomUsed,
    left: leftUsed,
  } = getGuestCountsBySide(table, total);
  const totalSides = topUsed + rightUsed + bottomUsed + leftUsed;

  // Si pas de config de côtés → fallback circulaire
  if (!totalSides) {
    const angle = (2 * Math.PI * index) / total - Math.PI / 2;
    const radius = 65;
    const top = 50 + radius * Math.sin(angle);
    const left = 50 + radius * Math.cos(angle);

    return {
      top: `${top}%`,
      left: `${left}%`,
      transform: "translate(-50%, -50%)",
    };
  }

  // On travaille plein bord (0–100), puis on pousse vers l’extérieur
  const baseMin = 8;
  const baseMax = 92;
  const span = baseMax - baseMin;
  const outerOffset = 14;

  const posOnSide = (i, count) => {
    if (count <= 1) return baseMin + span / 2;
    return baseMin + (i * span) / (count - 1);
  };
  const transformForSide = (side) => {
    if (side === "top") return "translate(-50%, -100%)";
    if (side === "right") return "translate(0%, -50%)";
    if (side === "bottom") return "translate(-50%, 0%)";
    if (side === "left") return "translate(-100%, -50%)";
    return "translate(-50%, -50%)";
  };

  // 1) haut (de gauche à droite)
  if (index < topUsed) {
    return {
      top: `${baseMin - outerOffset}%`,
      left: `${posOnSide(index, topUsed)}%`,
      transform: transformForSide("top"),
    };
  }

  let offset = topUsed;

  // 2) droite (de haut en bas)
  if (index < offset + rightUsed) {
    const i = index - offset;
    return {
      top: `${posOnSide(i, rightUsed)}%`,
      left: `${baseMax + outerOffset}%`,
      transform: transformForSide("right"),
    };
  }

  offset += rightUsed;

  // 3) bas (de gauche à droite)
  if (index < offset + bottomUsed) {
    const i = index - offset;
    return {
      top: `${baseMax + outerOffset}%`,
      left: `${posOnSide(i, bottomUsed)}%`,
      transform: transformForSide("bottom"),
    };
  }

  offset += bottomUsed;

  // 4) gauche (de haut en bas)
  if (index < offset + leftUsed) {
    const i = index - offset;
    return {
      top: `${posOnSide(i, leftUsed)}%`,
      left: `${baseMin - outerOffset}%`,
      transform: transformForSide("left"),
    };
  }

  // sécurité
  const angle = (2 * Math.PI * index) / total - Math.PI / 2;
  const radius = 65;
  const top = 50 + radius * Math.sin(angle);
  const left = 50 + radius * Math.cos(angle);

  return {
    top: `${top}%`,
    left: `${left}%`,
    transform: "translate(-50%, -50%)",
  };
}

function getSeatSide(table, index, total) {
  if (table.shape !== "square") return "round";

  const {
    top: topUsed,
    right: rightUsed,
    bottom: bottomUsed,
    left: leftUsed,
  } = getGuestCountsBySide(table, total);
  const totalSides = topUsed + rightUsed + bottomUsed + leftUsed;
  if (!totalSides) return "round";

  if (index < topUsed) return "top";
  let offset = topUsed;
  if (index < offset + rightUsed) return "right";
  offset += rightUsed;
  if (index < offset + bottomUsed) return "bottom";
  offset += bottomUsed;
  if (index < offset + leftUsed) return "left";
  return "round";
}

function getSeatBadgesDirectionClass(table, index, total) {
  const side = getSeatSide(table, index, total);

  // Côté horizontal (haut/bas) => badges empilés verticalement
  if (side === "top" || side === "bottom") {
    return "flex-col items-center gap-[2px]";
  }

  // Côté vertical (gauche/droite) ou table ronde => badges en ligne
  return "flex-row items-center gap-[3px]";
}

function getCoupleSeatContainerClass(table, index, total) {
  const side = getSeatSide(table, index, total);
  if (side === "top" || side === "bottom") {
    return "flex-col items-center gap-[2px]";
  }
  return "flex-row items-center gap-[3px]";
}

function seatHasDiet(guestId) {
  return getSeatBadges(guestId).length > 0;
}

/* ===== PORTE ===== */

const doorStyle = computed(() => {
  const SIZE = 40;
  const half = SIZE / 2;

  if (doorState.side === "top") {
    return {
      width: SIZE + "px",
      height: SIZE + "px",
      top: "1px",
      left: `calc(${doorState.offset * 100}% - ${half}px)`,
    };
  }
  if (doorState.side === "bottom") {
    return {
      width: SIZE + "px",
      height: SIZE + "px",
      bottom: "1px",
      left: `calc(${doorState.offset * 100}% - ${half}px)`,
    };
  }
  if (doorState.side === "left") {
    return {
      width: SIZE + "px",
      height: SIZE + "px",
      left: "1px",
      top: `calc(${doorState.offset * 100}% - ${half}px)`,
    };
  }
  return {
    width: SIZE + "px",
    height: SIZE + "px",
    right: "1px",
    top: `calc(${doorState.offset * 100}% - ${half}px)`,
  };
});

const doorImageStyle = computed(() => {
  const map = {
    top: "rotate(0deg)",
    right: "rotate(90deg)",
    bottom: "rotate(180deg)",
    left: "rotate(270deg)",
  };
  return { transform: map[doorState.side] || "none" };
});

function startDoorDrag(event) {
  if (!props.canWrite) return;
  hoverPopover.visible = false;

  const container = layoutContainerRef.value;
  if (!container) return;

  doorState.dragging = true;
  updateDoorFromEvent(event);

  window.addEventListener("mousemove", onDoorDrag);
  window.addEventListener("mouseup", stopDoorDrag);
}

function onDoorDrag(event) {
  if (!doorState.dragging) return;
  updateDoorFromEvent(event);
}

async function stopDoorDrag() {
  doorState.dragging = false;
  window.removeEventListener("mousemove", onDoorDrag);
  window.removeEventListener("mouseup", stopDoorDrag);

  try {
    await api.patchSeatingPlanConfig({
      side: doorState.side,
      offset: doorState.offset,
    });
  } catch (e) {
    showApiError(t, toast, e);
  }
}

function updateDoorFromEvent(event) {
  const container = layoutContainerRef.value;
  if (!container) return;

  const rect = container.getBoundingClientRect();

  const distTop = Math.abs(event.clientY - rect.top);
  const distBottom = Math.abs(rect.bottom - event.clientY);
  const distLeft = Math.abs(event.clientX - rect.left);
  const distRight = Math.abs(rect.right - event.clientX);

  const minDist = Math.min(distTop, distBottom, distLeft, distRight);

  let side = doorState.side;
  let offset = doorState.offset;

  if (minDist === distTop) {
    side = "top";
    offset = (event.clientX - rect.left) / rect.width;
  } else if (minDist === distBottom) {
    side = "bottom";
    offset = (event.clientX - rect.left) / rect.width;
  } else if (minDist === distLeft) {
    side = "left";
    offset = (event.clientY - rect.top) / rect.height;
  } else {
    side = "right";
    offset = (event.clientY - rect.top) / rect.height;
  }

  offset = Math.max(0, Math.min(offset, 1));
  doorState.side = side;
  doorState.offset = offset;
}

function isCoupleSeat(guestId) {
  const guest = guestsIndex.value?.[guestId];
  return !!guest?.isCouple;
}

onBeforeUnmount(() => {
  window.removeEventListener("mousemove", onTableDrag);
  window.removeEventListener("mouseup", stopTableDrag);
  window.removeEventListener("mousemove", onRotateDrag);
  window.removeEventListener("mouseup", stopRotateDrag);
  window.removeEventListener("mousemove", onDoorDrag);
  window.removeEventListener("mouseup", stopDoorDrag);

  if (doorUnsubscribe) {
    doorUnsubscribe();
    doorUnsubscribe = null;
  }
});

onMounted(async () => {
  const { fs } = await ensureFirebase();
  const d = doc(fs, "seatingPlanConfig", "default");

  doorUnsubscribe = onSnapshot(d, (snap) => {
    const val = snap.data();
    const door = val?.door;

    if (door && typeof door.offset === "number" && door.side) {
      doorState.side = door.side;
      doorState.offset = door.offset;
    }
  });
});

const hoverPopover = reactive({
  visible: false,
  mode: "table", // "table" | "seat"
  tableId: null,
  seatGuestId: null,
  x: 0,
  y: 0,
  title: "",
  guests: [],
  moreCount: 0,
});

const MAX_PREVIEW_GUESTS = Infinity;

function getGuestLabelById(gid) {
  const g = guestsIndex.value?.[gid];
  if (!g) return gid;
  return `${g.firstName || ""} ${g.lastName || ""}`.trim() || gid;
}

function buildTableHoverData(tableId) {
  const table = (props.tables || []).find((t) => t.id === tableId);
  if (!table) return { title: "", guests: [], moreCount: 0 };

  const tableName = getTableLabel(table);
  const idx = getTableIndex(tableId) + 1;
  const title = `#${idx} — ${tableName}`;

  const all = (table.guestIds || []).map((gid) => ({
    id: gid,
    label: getGuestLabelById(gid),
    badges: getSeatBadges(gid), // ✅
  }));

  const guests = all.slice(0, MAX_PREVIEW_GUESTS);
  const moreCount = 0;

  return { title, guests, moreCount };
}

function setPopoverPosFromEvent(e) {
  // décale un peu pour ne pas être sous la souris
  hoverPopover.x = e.clientX + 12;
  hoverPopover.y = e.clientY + 12;
}

function onTableHoverEnter(tableId, e) {
  if (
    layoutState.draggingTableId ||
    layoutState.rotatingTableId ||
    doorState.dragging
  )
    return;

  // si on est déjà en mode seat, ne pas remplacer
  if (hoverPopover.visible && hoverPopover.mode === "seat") return;

  hoverPopover.mode = "table";
  hoverPopover.tableId = tableId;

  const { title, guests, moreCount } = buildTableHoverData(tableId);
  hoverPopover.title = title;
  hoverPopover.guests = guests;
  hoverPopover.moreCount = moreCount;

  setPopoverPosFromEvent(e);
  hoverPopover.visible = true;
}

function onTableHoverMove(e) {
  if (!hoverPopover.visible) return;
  if (hoverPopover.mode === "seat") return; // laisse le seat gérer
  setPopoverPosFromEvent(e);
}

function onTableHoverLeave() {
  hoverPopover.visible = false;
  hoverPopover.tableId = null;
}

function getSeatBadges(guestId) {
  const guest = guestsIndex.value?.[guestId];
  if (!guest) return [];

  try {
    const rawCodes = Array.isArray(guest.dietCodes)
      ? guest.dietCodes
      : typeof guest.dietCodes === "string"
        ? guest.dietCodes
            .split(",")
            .map((x) => String(x || "").trim())
            .filter(Boolean)
        : [];
    const otherText = String(guest.dietOtherText || "").trim();
    const normalizedCodes = ensureOtherIfText(rawCodes, otherText);

    return getDietBadges(normalizedCodes, otherText);
  } catch {
    return [];
  }
}

function getMiniSizePx(table) {
  const d = getMiniTableDimensions(table);
  return {
    w: Number(String(d.width).replace("px", "")) || 80,
    h: Number(String(d.height).replace("px", "")) || 80,
  };
}

function onSeatHoverEnter(tableId, guestId, e) {
  if (
    layoutState.draggingTableId ||
    layoutState.rotatingTableId ||
    doorState.dragging
  )
    return;

  hoverPopover.mode = "seat";
  hoverPopover.tableId = tableId;
  hoverPopover.seatGuestId = guestId;

  hoverPopover.title = getGuestLabelById(guestId);
  hoverPopover.guests = [];
  hoverPopover.moreCount = 0;

  setPopoverPosFromEvent(e);
  hoverPopover.visible = true;
}

function onSeatHoverMove(e) {
  if (!hoverPopover.visible || hoverPopover.mode !== "seat") return;
  setPopoverPosFromEvent(e);
}

function onSeatHoverLeave() {
  // repasse automatiquement en preview table si la souris est toujours sur la table
  // (sinon ça disparaît au leave du wrapper)
  if (!hoverPopover.tableId) {
    hoverPopover.visible = false;
    return;
  }

  hoverPopover.mode = "table";
  hoverPopover.seatGuestId = null;

  const { title, guests, moreCount } = buildTableHoverData(
    hoverPopover.tableId,
  );
  hoverPopover.title = title;
  hoverPopover.guests = guests;
  hoverPopover.moreCount = moreCount;
}
</script>

<style scoped>
.schema-table {
  background: rgba(0, 0, 0, 0.04);
  border: 1px solid rgba(0, 0, 0, 0.08);
  z-index: 1;
}
</style>
