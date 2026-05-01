<!-- src/components/admin/seating/SeatingPrintManager.vue -->
<template>
  <!-- TEMPLATES PDF -->
  <div class="fixed -left-[9999px] top-0">
    <!-- PDF 1 : liste des invités présents -->
    <div
      ref="guestListPdfRef"
      class="print-page print-page-portrait print-with-footer"
    >
      <div class="print-content">
        <p class="print-title uppercase">
          {{
            t("admin.seating.print_guests_title", "Liste des invités présents")
          }}
        </p>

        <table class="print-table">
          <thead>
            <tr>
              <th class="col-index">#</th>
              <th class="col-name">
                {{ t("admin.seating.col_last_name", "Nom") }}
              </th>
              <th class="col-name">
                {{ t("admin.seating.col_first_name", "Prénom") }}
              </th>
              <th class="col-table">
                {{ t("admin.seating.col_table", "Table") }}
              </th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="(g, idx) in pdfGuests"
              :key="g.id"
            >
              <td class="col-index">{{ idx + 1 }}</td>
              <td class="col-name">{{ g.lastName }}</td>
              <td class="col-name">{{ g.firstName }}</td>
              <td class="col-table">
                {{ g.tableLabel || "—" }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="print-footer">
        {{ printedAt }}
      </div>
    </div>

    <!-- PDF 2 : plan de salle global (PAYSAGE) -->
    <div
      ref="layoutPdfRef"
      class="print-page print-page-landscape"
    >
      <div class="print-content">
        <p class="print-title uppercase">
          {{ t("admin.seating.print_layout_title", "Plan de salle") }}
        </p>

        <div class="layout-box">
          <!-- PORTE -->
          <div
            class="layout-door"
            :style="doorStyleForPdf"
          >
            <img
              :src="doorImg"
              :alt="t('admin.seating.door_alt', 'Door')"
              class="layout-door-img"
              :style="doorImageStyleForPdf"
            />
          </div>

          <div
            v-for="(table, idx) in sortedTables"
            :key="table.id"
            class="layout-table"
            :style="getLayoutTableStyleForPdf(table, idx)"
          >
            <div
              class="layout-table-inner"
              :class="
                table.shape === 'square'
                  ? 'layout-table-inner-square'
                  : 'layout-table-inner-round'
              "
              :style="getLayoutTableDimensionsForPdf(table)"
            >
              <div
                class="layout-table-schema"
                :style="getLayoutRotationStyleForPdf(table)"
              >
                <div
                  class="layout-table-shape"
                  :class="
                    table.shape === 'square'
                      ? 'layout-table-shape-rect'
                      : 'layout-table-shape-round'
                  "
                ></div>

                <!-- sièges numérotés (PDF 2) -->
                <div
                  v-for="(gid, seatIndex) in table.guestIds || []"
                  :key="gid"
                  class="layout-seat"
                  :style="
                    getSeatStyleForPdf(
                      table,
                      seatIndex,
                      getTableCapacity(table),
                    )
                  "
                >
                  <!-- wrapper qui tourne (tangente / côté) -->
                  <div class="layout-seat-upright">
                    <!-- ✅ numéro centré, ne bouge jamais -->
                    <span class="layout-seat-num">{{ seatIndex + 1 }}</span>

                    <!-- ✅ icônes en ABSOLU sur l’axe radial (extérieur), ne prennent pas de place -->
                    <span
                      v-if="seatHasDiet(gid)"
                      class="layout-seat-icons-radial"
                      aria-hidden="true"
                    >
                      <img
                        v-for="badge in getSeatBadges(gid)"
                        :key="badge.key"
                        :src="badge.icon"
                        alt=""
                        class="layout-seat-icon"
                      />
                    </span>
                  </div>
                </div>

                <div
                  class="layout-table-label"
                  :style="getLayoutLabelCounterRotationStyleForPdf(table)"
                >
                  <span class="layout-table-label-index"> #{{ idx + 1 }} </span>
                  <span class="layout-table-label-name">
                    {{
                      table.name ||
                        t("admin.seating.default_table_name", "Table") +
                        " " +
                        (idx + 1)
                    }}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="print-footer">
        {{ printedAt }}
      </div>
    </div>

    <!-- PDF 3 : tables détaillées + schéma (PORTRAIT) -->
    <div
      ref="tablesDetailPdfRef"
      class="print-page print-page-portrait"
    >
      <div class="print-content">
        <p class="print-title uppercase">
          {{ t("admin.seating.print_tables_title", "Détail des tables") }}
        </p>

        <div
          v-for="(table, idx) in sortedTables"
          :key="table.id"
          class="table-detail-block"
        >
          <p class="table-detail-title">
            {{ t("admin.seating.table_label", "Table") + " " + (idx + 1) }}
            –
            {{
              table.name ||
                t("admin.seating.default_table_name", "Table") + " " + (idx + 1)
            }}
            <span class="table-detail-meta">
              ({{ table.guestIds?.length || 0 }} /
              {{ getTableCapacity(table) || "—" }}
              {{ t("admin.seating.persons_short", "pers.") }})
            </span>
          </p>

          <div class="table-detail-content">
            <div class="table-detail-list-wrapper">
              <ul class="table-detail-list">
                <!-- IMPORTANT : même numérotation que PDF2 = seatIndex+1 dans l'ordre guestIds -->
                <li
                  v-for="(gid, seatIndex) in table.guestIds || []"
                  :key="gid"
                >
                  <span class="guest-line-num">{{ seatIndex + 1 }}</span>

                  <span class="guest-line-name">
                    {{ guestsIndex[gid]?.firstName }}
                    {{ guestsIndex[gid]?.lastName }}
                  </span>

                  <span class="guest-line-sep"> - </span>

                  <span class="guest-line-menu">
                    <span class="guest-line-menu-label">{{
                      guestMenuLabelForPdf(gid)
                    }}</span>
                    <span
                      v-if="guestMenuNeedsReview(gid)"
                      class="guest-line-menu-flag"
                    >
                      ⚠︎</span>
                  </span>

                  <span
                    v-if="seatHasDiet(gid)"
                    class="guest-line-diet"
                  >
                    (
                    <span
                      v-for="badge in getSeatBadges(gid)"
                      :key="badge.key"
                      class="guest-line-diet-badge"
                    >
                      <img
                        :src="badge.icon"
                        alt=""
                        class="guest-line-diet-icon"
                      />
                    </span>
                    <span class="guest-line-diet-text">{{
                      getSeatDietText(gid)
                    }}</span>
                    )
                  </span>
                </li>

                <li v-if="!table.guestIds?.length">
                  {{
                    t(
                      "admin.seating.no_guests_table",
                      "Aucun invité pour cette table.",
                    )
                  }}
                </li>
              </ul>
            </div>

            <!-- schéma PDF3 -->
            <div class="table-schema-wrapper">
              <div class="table-schema">
                <div
                  class="schema-inner"
                  :class="
                    table.shape === 'square'
                      ? 'schema-inner-square'
                      : 'schema-inner-round'
                  "
                  :style="getTableDetailSchemaDimensionsForPdf(table)"
                >
                  <div
                    class="schema-table-shape"
                    :class="
                      table.shape === 'square'
                        ? 'schema-table-rect'
                        : 'schema-table-round'
                    "
                  ></div>

                  <div
                    v-for="slot in getPdfSlotsForTable(table)"
                    :key="slot.index"
                    class="schema-seat"
                    :class="{ 'is-empty': !slot.gid }"
                    :style="slot.style"
                  >
                    <template v-if="slot.gid">
                      <span class="schema-seat-name">
                        {{ slot.index + 1 }}
                      </span>

                      <template v-if="seatHasDiet(slot.gid)">
                        <span class="schema-seat-badges">
                          <span
                            v-for="badge in getSeatBadges(slot.gid)"
                            :key="badge.key"
                          >
                            <img
                              :src="badge.icon"
                              class="schema-seat-badge-icon"
                            />
                          </span>
                        </span>
                      </template>
                    </template>

                    <template v-else>
                      <span class="schema-seat-empty" />
                    </template>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div class="print-footer">
            {{ printedAt }}
          </div>
        </div>

        <hr class="table-detail-separator" />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, nextTick, onMounted, onBeforeUnmount } from "vue";
import html2pdf from "html2pdf.js";
import { ensureFirebase, doc, onSnapshot } from "@/services/firebaseClient";

import { useSeatingStore } from "@/stores/seatingStore";
import { useMenusStore } from "@/stores/menusStore";
import { useLang } from "@/composables/useLang";
import { getDietBadges } from "@/shared/dietIcons";
import doorImg from "@/assets/icons/door.png";
import { usePrintTimestamp } from "@/composables/usePrintTimestamp";

const { t } = useLang();

// Stores
const seatingStore = useSeatingStore();
const menusStore = useMenusStore();

const sortedTables = computed(() => seatingStore.sortedTables || []);
const guestsIndex = computed(() => seatingStore.guestsIndex || {});

const guestListPdfRef = ref(null);
const layoutPdfRef = ref(null);
const tablesDetailPdfRef = ref(null);
const doorState = ref({ side: "bottom", offset: 0.5 });

let doorUnsub = null;

const { printedAt, stampNow } = usePrintTimestamp({
  locale: "fr-BE",
  prefix: "Printed on",
});

// mapping invité -> table (via store)
const tableByGuestId = computed(() => {
  const map = {};
  (sortedTables.value || []).forEach((table, index) => {
    (table.guestIds || []).forEach((gid) => {
      map[gid] = { ...table, index };
    });
  });
  return map;
});

// Liste plate des invités présents
const pdfGuests = computed(() => {
  const guestsMap = guestsIndex.value;
  const tableMap = tableByGuestId.value;

  const result = [];

  for (const [gidRaw, guest] of Object.entries(guestsMap || {})) {
    const gid = String(gidRaw || "").trim();
    if (!gid) continue;

    // Only attending guests are printed
    if (guest?.attending !== true) continue;

    const table = tableMap[gid];

    const tableLabel = table
      ? table.name && table.name.trim()
        ? table.name
        : `${t("admin.seating.default_table_name", "Table")} ${table.index + 1}`
      : null;

    result.push({
      id: gid,
      lastName: guest?.lastName ?? "",
      firstName: guest?.firstName ?? "",
      tableLabel,
    });
  }

  // tri Nom + Prénom
  result.sort((a, b) =>
    `${a.lastName || ""} ${a.firstName || ""}`.localeCompare(
      `${b.lastName || ""} ${b.firstName || ""}`,
    ),
  );

  return result;
});

// --------- Helpers schéma de table / invités ----------

function _getGuestInitials(guest) {
  if (!guest) return "";
  const first = guest.firstName || "";
  const last = guest.lastName || "";
  const lastInitial = last.charAt(0) ? last.charAt(0).toUpperCase() + "." : "";
  return `${first} ${lastInitial}`.trim();
}

function seatHasDiet(guestId) {
  return getSeatBadges(guestId).length > 0;
}

function getSeatDietText(guestId) {
  const badges = getSeatBadges(guestId);
  if (!badges.length) return "";

  const labels = [];

  badges.forEach((b) => {
    if (b.key === "other" && b.tooltip) {
      // pour "other", on n'affiche QUE le détail saisi
      labels.push(b.tooltip);
    } else {
      // pour les autres, on garde la traduction i18n
      labels.push(t(b.i18nKey));
    }
  });

  return labels.join(" · ");
}

function getTableCapacity(table) {
  if (!table) return 0;
  if (table.shape === "square")
    return computeSquareCapacity(table.seatsPerSide || {});
  return Number(table.capacity || 0);
}

function getLayoutTableDimensionsForPdf(table) {
  // base en mm (équivalent "mini table")
  const BASE = 20; // taille de base
  const MIN = 16;
  const MAX = 40;

  if (table.shape !== "square") {
    return { width: BASE + "mm", height: BASE + "mm" };
  }

  const s = table.seatsPerSide || {};
  const topCount = Number(s.top || 0);
  const rightCount = Number(s.right || 0);
  const bottomCount = Number(s.bottom || 0);
  const leftCount = Number(s.left || 0);

  const hMax = Math.max(topCount, bottomCount);
  const vMax = Math.max(leftCount, rightCount);

  if (!hMax && !vMax) {
    return { width: BASE + "mm", height: BASE + "mm" };
  }

  // on allonge les côtés si beaucoup d'invités
  const EXTRA_PER_SEAT = 2; // mm par siège au-delà de 4

  let width = BASE + Math.max(0, hMax - 4) * EXTRA_PER_SEAT;
  let height = BASE + Math.max(0, vMax - 4) * EXTRA_PER_SEAT;

  width = Math.max(MIN, Math.min(width, MAX));
  height = Math.max(MIN, Math.min(height, MAX));

  return { width: width + "mm", height: height + "mm" };
}

function getTableDetailSchemaDimensionsForPdf(table) {
  const BASE = 55;
  const MIN = 40;
  const MAX = 95;
  const SEAT_PITCH = 14;

  if (table.shape !== "square") {
    return { width: BASE + "mm", height: BASE + "mm" };
  }

  const { top, right, bottom, left } = getGuestCountsBySide(
    table,
    table.guestIds?.length || 0,
  );

  const hMax = Math.max(top, bottom);
  const vMax = Math.max(left, right);

  if (!hMax && !vMax) {
    return { width: BASE + "mm", height: BASE + "mm" };
  }

  let width = Math.max(BASE, (hMax + 1) * SEAT_PITCH);
  let height = Math.max(BASE, (vMax + 1) * SEAT_PITCH);

  width = Math.max(MIN, Math.min(width, MAX));
  height = Math.max(MIN, Math.min(height, MAX));

  return { width: width + "mm", height: height + "mm" };
}

function getLayoutRotationStyleForPdf(table) {
  const rotation =
    typeof table.layoutRotationDeg === "number" ? table.layoutRotationDeg : 0;

  return {
    transform: `rotate(${rotation}deg)`,
    transformOrigin: "50% 50%",
  };
}

function getLayoutLabelCounterRotationStyleForPdf(table) {
  const rotation =
    typeof table.layoutRotationDeg === "number" ? table.layoutRotationDeg : 0;

  return {
    transform: `rotate(${-rotation}deg)`,
  };
}

// Positionnement des tables dans le plan de salle global PDF
function getLayoutTableStyleForPdf(table, idx) {
  let x = 0.2;
  let y = 0.2;

  if (
    table.layoutPosition &&
    typeof table.layoutPosition.x === "number" &&
    typeof table.layoutPosition.y === "number"
  ) {
    x = table.layoutPosition.x;
    y = table.layoutPosition.y;
  } else {
    // fallback en grille
    const cols = 4;
    const col = idx % cols;
    const row = Math.floor(idx / cols);
    x = 0.15 + 0.2 * col;
    y = 0.2 + 0.2 * row;
  }

  return {
    left: `${x * 100}%`,
    top: `${y * 100}%`,
  };
}

async function downloadPdf(type) {
  let element;
  let filename;
  let jsPdfOptions;

  if (type === "guests") {
    element = guestListPdfRef.value;
    filename = t("admin.seating.pdf_guests_filename", "liste-invites.pdf");
    jsPdfOptions = { unit: "mm", format: "a4", orientation: "portrait" };
  } else if (type === "layout") {
    element = layoutPdfRef.value;
    filename = t("admin.seating.pdf_layout_filename", "plan-de-salle.pdf");
    jsPdfOptions = { unit: "mm", format: "a4", orientation: "landscape" };
  } else if (type === "tables") {
    element = tablesDetailPdfRef.value;
    filename = t("admin.seating.pdf_tables_filename", "tables-detaillees.pdf");
    jsPdfOptions = { unit: "mm", format: "a4", orientation: "portrait" };
  } else {
    return;
  }

  if (!element) return;

  stampNow();
  await nextTick();

  await nextTick();

  const opt = {
    margin: 10,
    filename,
    image: { type: "jpeg", quality: 0.98 },
    html2canvas: {
      scale: 2,
      useCORS: true,
    },
    jsPDF: jsPdfOptions,
  };

  try {
    await html2pdf().set(opt).from(element).save();
  } catch (err) {
    console.error("Erreur génération PDF:", err);
    window.alert(
      t(
        "admin.seating.pdf_error",
        "Impossible de générer le PDF. Regarde la console pour plus de détails.",
      ),
    );
  }
}

// Expose pour que le parent puisse appeler SeatingPrintManager.downloadPdf()
defineExpose({
  downloadPdf,
});

onMounted(async () => {
  // 1) door config realtime
  try {
    const { fs } = await ensureFirebase();
    const cfgRef = doc(fs, "seatingPlanConfig", "default");

    doorUnsub = onSnapshot(
      cfgRef,
      (snap) => {
        const data = snap.exists() ? snap.data() : null;
        const door = data?.door || null;

        if (door && typeof door.offset === "number" && door.side) {
          doorState.value = { side: door.side, offset: door.offset };
        } else {
          doorState.value = { side: "bottom", offset: 0.5 };
        }
      },
      (err) => console.error("Firestore seatingPlanConfig listen error:", err),
    );
  } catch (e) {
    console.error("Firestore seatingPlanConfig init error:", e);
  }

  // 2) menus realtime (si nécessaire pour le PDF)
  try {
    await menusStore.initRealtime();
  } catch (e) {
    console.error("Erreur init menus (PDF):", e);
  }
});

onBeforeUnmount(() => {
  doorUnsub?.();
  doorUnsub = null;
});

const doorStyleForPdf = computed(() => {
  // taille en mm dans le PDF
  const SIZE_MM = 8;
  const half = SIZE_MM / 2;

  const { side, offset } = doorState.value || { side: "bottom", offset: 0.5 };

  if (side === "top") {
    return {
      width: `${SIZE_MM}mm`,
      height: `${SIZE_MM}mm`,
      top: "1mm",
      left: `calc(${offset * 100}% - ${half}mm)`,
    };
  }
  if (side === "bottom") {
    return {
      width: `${SIZE_MM}mm`,
      height: `${SIZE_MM}mm`,
      bottom: "1mm",
      left: `calc(${offset * 100}% - ${half}mm)`,
    };
  }
  if (side === "left") {
    return {
      width: `${SIZE_MM}mm`,
      height: `${SIZE_MM}mm`,
      left: "1mm",
      top: `calc(${offset * 100}% - ${half}mm)`,
    };
  }
  // right
  return {
    width: `${SIZE_MM}mm`,
    height: `${SIZE_MM}mm`,
    right: "1mm",
    top: `calc(${offset * 100}% - ${half}mm)`,
  };
});

const doorImageStyleForPdf = computed(() => {
  const side = doorState.value?.side || "bottom";
  const map = {
    top: "rotate(0deg)",
    right: "rotate(90deg)",
    bottom: "rotate(180deg)",
    left: "rotate(270deg)",
  };
  return { transform: map[side] || "none" };
});

function getPdfSlotsForTable(table) {
  const capacity = getTableCapacity(table);
  const gids = table?.guestIds || [];

  return Array.from({ length: capacity }, (_, i) => ({
    index: i,
    gid: gids[i] ?? null,
    style: getSeatStyleForPdf(table, i, capacity),
  }));
}

function getSeatBadges(guestId) {
  const guest = guestsIndex.value[guestId];
  if (!guest) return [];
  return getDietBadges(guest.dietCodes || [], guest.dietOtherText || "");
}

function computeSquareCapacity(seatsPerSide = {}) {
  return (
    Number(seatsPerSide.top || 0) +
    Number(seatsPerSide.right || 0) +
    Number(seatsPerSide.bottom || 0) +
    Number(seatsPerSide.left || 0)
  );
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

// --- ROUND: position polaire + rotation tangente (deg) ---
function getRoundSeatStyle(index, total) {
  if (!total) return {};
  const angle = (2 * Math.PI * index) / total - Math.PI / 2;

  // un peu plus loin du plateau pour éviter l'effet “au hasard”
  const radius = 62; // %
  const top = 50 + radius * Math.sin(angle);
  const left = 50 + radius * Math.cos(angle);

  // rotation tangente (ex: comme ton image)
  const angleDeg = (angle * 180) / Math.PI;
  const tangentDeg = angleDeg + 90;

  return {
    top: `${top}%`,
    left: `${left}%`,
    "--seat-rot": `${tangentDeg}deg`,
  };
}

// --- SQUARE: positions strictement sur les côtés + rotation par côté ---
function getSquareSeatStyle(table, index, total) {
  const s = table.seatsPerSide || {};
  const topCount = Number(s.top || 0);
  const rightCount = Number(s.right || 0);
  const bottomCount = Number(s.bottom || 0);
  const leftCount = Number(s.left || 0);

  const totalSides = topCount + rightCount + bottomCount + leftCount;
  if (!totalSides) return getRoundSeatStyle(index, total);

  const PLATE_MIN = 10;
  const PLATE_MAX = 90;
  const PLATE_SPAN = PLATE_MAX - PLATE_MIN;

  // un poil plus “droit” = plus loin des coins, et sortie un peu plus grande
  const OUT = 9;

  const posForward = (i, count) =>
    PLATE_MIN + ((i + 1) * PLATE_SPAN) / (count + 1);
  const posReverse = (i, count) =>
    PLATE_MAX - ((i + 1) * PLATE_SPAN) / (count + 1);

  // TOP
  if (index < topCount) {
    return {
      top: `${PLATE_MIN - OUT}%`,
      left: `${posForward(index, topCount)}%`,
      "--seat-rot": `0deg`,
    };
  }

  let offset = topCount;

  // RIGHT
  if (index < offset + rightCount) {
    const i = index - offset;
    return {
      top: `${posForward(i, rightCount)}%`,
      left: `${PLATE_MAX + OUT}%`,
      "--seat-rot": `90deg`,
    };
  }

  offset += rightCount;

  // BOTTOM
  if (index < offset + bottomCount) {
    const i = index - offset;
    return {
      top: `${PLATE_MAX + OUT}%`,
      left: `${posReverse(i, bottomCount)}%`,
      "--seat-rot": `180deg`,
    };
  }

  offset += bottomCount;

  // LEFT
  if (index < offset + leftCount) {
    const i = index - offset;
    return {
      top: `${posReverse(i, leftCount)}%`,
      left: `${PLATE_MIN - OUT}%`,
      "--seat-rot": `270deg`,
    };
  }

  return getRoundSeatStyle(index, total);
}

function getSeatStyleForPdf(table, index, total) {
  if (!total) return {};
  if (table.shape === "square") return getSquareSeatStyle(table, index, total);
  return getRoundSeatStyle(index, total);
}

function guestMenuLabelForPdf(gid) {
  const a = menusStore.getAssignmentForGuest(gid);

  if (!a?.menuId) {
    if (a?.status === "needs_review")
      return t("admin.menus.needs_review", "À revoir");
    return t("admin.menus.unassigned", "—");
  }

  const m = menusStore.menuById(a.menuId);
  return m?.name || a.menuId;
}

function guestMenuNeedsReview(gid) {
  const a = menusStore.getAssignmentForGuest(gid);
  return a?.status === "needs_review";
}
</script>

<style scoped>
/* PAGE GÉNÉRIQUE (on travaille en mm pour coller à l'A4) */
.print-page {
  box-sizing: border-box;
  background: #ffffff;
  color: #000000;
  font-family: Arial, Helvetica, sans-serif;
  font-size: 10pt;
}

/* Portrait : A4 = 210 x 297 mm, marge de 10 mm → 190 x 277 mm utiles */
.print-page-portrait {
  width: 190mm;
  min-height: 277mm;
  padding: 10mm;
}

/* Paysage : A4 = 297 x 210 mm */
.print-page-landscape {
  width: 277mm;
  height: 190mm;
  padding: 5mm; /* au lieu de 10mm → plus près des bords */
  overflow: hidden;
}

.print-title {
  text-align: center;
  font-weight: 700;
  font-size: 13pt;
  margin: 0 0 6mm 0;
}

/* TABLE LISTE INVITÉS */
.print-table {
  width: 100%;
  border-collapse: collapse;
  table-layout: fixed; /* évite les débordements */
}

.print-table th,
.print-table td {
  border: 0.2mm solid #e0e0e0;
  padding: 1.5mm 2mm;
  text-align: left;
  vertical-align: middle;
  font-size: 9pt;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.print-table thead th {
  background: #f5f5f5;
  font-weight: 700;
}

/* colonnes pour ajuster la largeur */
.col-index {
  width: 8mm;
  text-align: center;
}
.col-name {
  width: 40%;
}
.col-table {
  width: 25%;
}

/* PLAN DE SALLE GLOBAL */
.layout-box {
  position: relative;
  margin: 0 auto;
  border: 0.3mm solid #000000;
  border-radius: 4mm;
  background: #ffffff;
  width: 250mm;
  height: 130mm; /* un peu moins que 140 pour laisser respirer */
  overflow: hidden;
}

.layout-table {
  position: absolute;
  transform: translate(-50%, -50%);
  display: flex;
  flex-direction: column; /* table + texte en dessous */
  align-items: center;
  gap: 1.5mm; /* espace entre table et compteur */
}

.layout-table-guests-count {
  font-size: 6pt;
  line-height: 1.2;
  text-align: center;
}

/* DÉTAIL DES TABLES */
.table-detail-block {
  break-inside: avoid;
  margin-bottom: 8mm;
}

.table-detail-title {
  font-size: 10pt;
  font-weight: 600;
  margin: 0 0 1.5mm 0;
}

.table-detail-meta {
  font-size: 8pt;
  font-weight: 400;
  margin-left: 2mm;
}

/* conteneur 2 colonnes : liste + schéma */
.table-detail-content {
  display: flex;
  gap: 8mm;
  align-items: flex-start;
}

/* la liste prend toute la largeur dispo */
.table-detail-list-wrapper {
  flex: 1 1 auto;
}

/* Liste texte */
.table-detail-list {
  margin: 0;
  padding-left: 6mm;
  list-style-type: disc;
  font-size: 9pt;
}

.table-detail-list li {
  margin-bottom: 0.8mm;
}

.table-detail-separator {
  border: none;
  border-top: 0.2mm dashed #cccccc;
  margin: 2mm 0 0 0;
}

/* conteneur liste + schéma (en colonne maintenant) */
.table-detail-content {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 4mm;
}

/* la liste prend toute la largeur dispo */
.table-detail-list-wrapper {
  flex: 0 0 auto;
}

/* Schéma centré sous la liste */
.table-schema-wrapper {
  flex: 0 0 auto;
  display: flex;
  justify-content: center; /* centre le schéma horizontalement sur la page */
  margin: 2mm 0 3mm 0;
}

.table-schema {
  /* plus besoin de flex ici pour le placer à droite */
  display: block;
}

.schema-inner {
  position: relative;
  width: 55mm;
  height: 55mm;
}

/* si table ronde */
.schema-table-round {
  border-radius: 50%;
}

.schema-seat-badge-icon {
  width: 3mm;
  height: 3mm;
  object-fit: contain;
}

/* Détails régimes dans la liste */
.guest-line-diet {
  display: inline-flex;
  align-items: center;
  gap: 1.5mm;
  margin-left: 2mm;
}

.guest-line-diet-icon {
  width: 3mm;
  height: 3mm;
  object-fit: contain;
}

.guest-line-diet-text {
  font-size: 8pt;
  color: #444444;
}

/* Mini tables du plan global (PDF 2) */
.layout-table-inner {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: visible; /* on laisse dépasser les pastilles si besoin */
}

.layout-table-inner-square {
  border-radius: 2mm;
  background: #ffffff;
}

.layout-table-inner-round {
  border-radius: 50%;
  background: #ffffff;
}

.layout-table-schema {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: visible; /* sécurité */
}

/* forme table (PDF2) */
.layout-table-shape {
  position: absolute;
  top: 10%;
  left: 10%;
  width: 80%;
  height: 80%;
  background: rgba(0, 0, 0, 0.04);
  border: 0.25mm solid rgba(0, 0, 0, 0.1);
  border-radius: 2mm;
  z-index: 1;
}

.layout-table-shape-round {
  border-radius: 50%;
}

/* conteneur de chaque siège (position) */
.layout-seat {
  position: absolute;
  transform: translate(-50%, -50%);
  z-index: 2;
}

/* pastille simple (aucune restriction) */
.layout-seat-dot {
  display: block;
  width: 2.5mm;
  height: 2.5mm;
  border-radius: 50%;
  background: #000000;
}

/* pastille avec icônes de régime */
.layout-seat-badge-wrapper {
  width: 5mm;
  height: 5mm;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0; /* pas besoin ici */
  overflow: visible;
}

.layout-seat-badge-icon {
  width: 3.5mm;
  height: 3.5mm;
  object-fit: contain;
}

/* label de la table au centre, lisible même après rotation */
.layout-table-label {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column; /* pile verticalement */
  align-items: center;
  justify-content: center;
  text-align: center;
  font-size: 6pt;
  line-height: 1.2;
  padding: 0 1mm;
  z-index: 3;
}

.layout-table-label-index {
  font-weight: 700;
  margin-bottom: 0.3mm;
}

.layout-table-label-name {
  font-weight: 600;
}

.layout-door {
  position: absolute;
  z-index: 5; /* au-dessus des tables */
  display: flex;
  align-items: center;
  justify-content: center;
}

.layout-door-img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

/* pastilles invités (PDF3) */
.schema-seat {
  position: absolute;
  transform: translate(-50%, -50%);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 1mm;
  min-width: 12mm;
  height: 5mm;
  padding: 0 3mm;
  padding-right: 6mm; /* réserve badges */
  border-radius: 999px;
  border: 0.25mm solid rgba(0, 0, 0, 0.12);
  background: #ffffff;
  font-size: 7pt;
  white-space: nowrap;
  text-align: center;
  line-height: 5mm;
}

.schema-seat.is-empty {
  padding: 0; /* override total */
  padding-right: 0; /* important */
}

.schema-seat-empty {
  display: block;
  width: 100%;
  height: 100%;
  border-radius: 999px;
  border: 0.25mm dashed rgba(0, 0, 0, 0.18);
  background: rgba(0, 0, 0, 0.02);
}

.schema-seat {
  position: absolute;
  justify-content: center;
  padding-right: 6mm; /* réserve la place des badges */
}

.schema-seat-badges {
  position: absolute;
  right: 2mm;
  display: inline-flex;
  gap: 1mm;
  align-items: center;
}

/* forme table (PDF3) */
.schema-table-shape {
  position: absolute;
  top: 10%;
  left: 10%;
  width: 80%;
  height: 80%;
  background: rgba(0, 0, 0, 0.04);
  border: 0.25mm solid rgba(0, 0, 0, 0.1);
  border-radius: 3mm; /* défaut rectangulaire */
}

/* IMPORTANT : rond = 50% */
.schema-table-shape.schema-table-round {
  border-radius: 50%;
}

/* (optionnel) rectangulaire explicite */
.schema-table-shape.schema-table-rect {
  border-radius: 3mm;
}

/* PDF2 : siège numéroté */
.layout-seat {
  position: absolute;
  transform: translate(-50%, -50%);
  z-index: 2;
}

/* “pill” compacte : numéro + icônes */
.layout-seat-pill {
  display: inline-flex;
  align-items: center;
  gap: 1mm;
  white-space: nowrap;
}

.layout-seat {
  position: absolute;
  transform: translate(-50%, -50%);
  z-index: 2;
}

.layout-seat-upright {
  position: relative; /* ✅ nécessaire pour positionner les icônes en absolu */
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 5mm; /* ✅ largeur = numéro, stable */
  height: 5mm; /* ✅ hauteur = numéro, stable */

  transform: rotate(var(--seat-rot, 0deg));
  transform-origin: 50% 50%;
}

/* numéro (inchangé mais on enlève toute dépendance layout) */
.layout-seat-num {
  width: 5mm;
  height: 5mm;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 6pt;
  line-height: 1;
  font-weight: 800;
}

/* ✅ icônes radial : au-dessus du numéro, le long du diamètre “extérieur” */
.layout-seat-icons-radial {
  position: absolute;
  left: 50%;
  top: 0;

  /* centre horizontal + “pousse” vers l’extérieur */
  transform: translate(-50%, -100%);

  display: inline-flex;
  gap: 0.6mm;
  align-items: center;
  white-space: nowrap;
  pointer-events: none;
}

/* option: si plusieurs icônes, elles restent petites */
.layout-seat-icon {
  width: 3.2mm;
  height: 3.2mm;
  object-fit: contain;
}

/* PDF3 : numéro dans la liste (correspondance PDF2) */
.guest-line-num {
  display: inline-flex;
  width: 5mm;
  height: 5mm;
  align-items: center;
  justify-content: center;
  font-size: 7pt;
  font-weight: 800;
  line-height: 1;
  margin-right: 2mm;
}

.print-with-footer {
  position: relative;
  padding-bottom: 14mm; /* réserve pour le footer */
}

.print-content {
  padding: 0;
  padding-bottom: 10mm; /* place pour le footer */
  box-sizing: border-box;
}

.print-footer {
  position: absolute;
  left: 10mm;
  right: 10mm;
  bottom: 6mm;
  font-size: 8pt;
  opacity: 0.7;
  text-align: center;
}

.print-page-landscape.print-with-footer .print-footer {
  left: 5mm;
  right: 5mm;
  bottom: 4mm;
}

.guest-line-menu {
  margin-left: 3mm;
  font-size: 8pt;
  color: #444;
}

.guest-line-menu-flag {
  margin-left: 1mm;
  font-size: 8pt;
}

.schema-seat-name {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-weight: 800;
  font-size: 7pt;
  line-height: 1;
}
</style>
