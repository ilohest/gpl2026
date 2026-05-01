<!-- src/components/admin/menus/MenusPrintManager.vue -->
<template>
  <!-- TEMPLATE PDF -->
  <div class="fixed -left-[9999px] top-0">
    <div
      ref="menusPdfRef"
      class="print-page print-page-landscape"
    >
      <div class="print-content">
        <p class="print-title uppercase">
          {{ t("admin.menuspfd.title", "Menús · resumen") }}
        </p>

        <p class="print-subtitle">
          {{ t("admin.menuspfd.total_attendees", "Invitados") }} :
          <strong>{{ totalAttendees }}</strong>
          —
          {{ t("admin.menuspfd.total_assigned", "Menús asignados") }} :
          <strong>{{ totalMenusAssigned }}</strong>
          —
          {{ t("admin.menuspfd.total_unassigned", "Sin menú asignado") }} :
          <strong>{{ totalUnassigned }}</strong>
        </p>

        <!-- GLOBAL -->
        <div class="block">
          <p class="block-title">
            {{ t("admin.menuspfd.by_menu", "Total por menú") }}
          </p>

          <div
            v-if="globalByMenuList.length"
            class="chips"
          >
            <div
              v-for="it in globalByMenuList"
              :key="it.menuId"
              class="chip"
            >
              <span class="chip-name">{{ it.name }}</span>
              <span class="chip-count">{{ it.count }}</span>
            </div>
          </div>
          <p
            v-else
            class="empty"
          >
            —
          </p>
        </div>

        <!-- BY TABLE -->
        <div class="block">
          <p class="block-title">
            {{ t("admin.menuspfd.by_table", "Por mesa") }}
          </p>

          <div
            v-if="tablesStats.length"
            class="tables"
          >
            <div
              v-for="tb in tablesStats"
              :key="tb.id"
              class="table"
            >
              <div class="table-header">
                <span class="table-title">{{ tb.label }}</span>
                <span class="table-meta">
                  {{ t("admin.menuspfd.attending", "Invitados") }}:
                  <strong>{{ tb.attending }}</strong>
                  <span v-if="tb.unassigned">
                    — {{ t("admin.menuspfd.unassigned", "Sin asignar") }}:
                    <strong>{{ tb.unassigned }}</strong>
                  </span>
                </span>
              </div>

              <div
                v-if="tb.byMenuList.length"
                class="chips"
              >
                <div
                  v-for="it in tb.byMenuList"
                  :key="it.menuId"
                  class="chip"
                >
                  <span class="chip-name">{{ it.name }}</span>
                  <span class="chip-count">{{ it.count }}</span>
                </div>
              </div>
              <p
                v-else
                class="empty"
              >
                —
              </p>
            </div>
          </div>

          <p
            v-else
            class="empty"
          >
            —
          </p>
        </div>
      </div>

      <div class="print-footer">
        {{ printedAt }}
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, nextTick } from "vue";
import html2pdf from "html2pdf.js";
import { useLang } from "@/composables/useLang";
import { useGuestDirectoryStore } from "@/stores/guestDirectoryStore";
import { useMenusStore } from "@/stores/menusStore";
import { useSeatingStore } from "@/stores/seatingStore";
import { usePrintTimestamp } from "@/composables/usePrintTimestamp";

const { t } = useLang();
const guestDir = useGuestDirectoryStore();
const menusStore = useMenusStore();
const seatingStore = useSeatingStore();
const { printedAt, stampNow } = usePrintTimestamp({
  prefix: "Printed on",
});

const menusPdfRef = ref(null);

function isRowAttending(row) {
  return row?.attending === true;
}

const totalAttendees = computed(() => {
  return (guestDir.items || []).filter(isRowAttending).length;
});

const totalMenusAssigned = computed(() => {
  // total des présents - non assignés
  return Math.max(0, totalAttendees.value - totalUnassigned.value);
});

const menuNameById = computed(() => {
  const map = new Map();
  for (const m of menusStore.menus || []) map.set(m.id, m.name || m.id);
  return map;
});

function assignmentMenuIdForGuest(guestId) {
  const a = menusStore.getAssignmentForGuest(guestId);
  return a?.menuId ?? null;
}

const globalStats = computed(() => {
  const byMenu = new Map(); // menuId -> count
  let unassigned = 0;

  for (const r of guestDir.items || []) {
    if (!isRowAttending(r)) continue;
    const menuId = assignmentMenuIdForGuest(r.guestId);
    if (!menuId) unassigned++;
    else byMenu.set(menuId, (byMenu.get(menuId) || 0) + 1);
  }

  const byMenuList = Array.from(byMenu.entries())
    .map(([menuId, count]) => ({
      menuId,
      count,
      name: menuNameById.value.get(menuId) || menuId,
    }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));

  return { unassigned, byMenuList };
});

const totalUnassigned = computed(() => globalStats.value.unassigned);
const globalByMenuList = computed(() => globalStats.value.byMenuList);

const tablesStats = computed(() => {
  const tables = seatingStore.sortedTables || [];
  const guestsIndex = seatingStore.guestsIndex || {};

  return (
    tables
      .map((tb, idx) => {
        const guestIds = Array.isArray(tb.guestIds) ? tb.guestIds : [];
        const byMenu = new Map();
        let attending = 0;
        let unassigned = 0;

        for (const gid of guestIds) {
          const g = guestsIndex[gid];
          if (!g?.attending) continue; // cohérent avec ton seatingStore
          attending++;

          const menuId = assignmentMenuIdForGuest(gid);
          if (!menuId) unassigned++;
          else byMenu.set(menuId, (byMenu.get(menuId) || 0) + 1);
        }

        const byMenuList = Array.from(byMenu.entries())
          .map(([menuId, count]) => ({
            menuId,
            count,
            name: menuNameById.value.get(menuId) || menuId,
          }))
          .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));

        const label =
          tb.name ||
          `${t("admin.seating.default_table_name", "Mesa")} ${idx + 1}`;

        return { id: tb.id, label, attending, unassigned, byMenuList };
      })
      // optionnel: ne montrer que les tables avec au moins 1 présent
      .filter((x) => x.attending > 0)
  );
});

async function downloadMenusPdf() {
  const element = menusPdfRef.value;
  if (!element) return;

  stampNow();
  await nextTick();

  const opt = {
    margin: 10,
    filename: t("admin.menuspfd.filename", "menus-resumen.pdf"),
    image: { type: "jpeg", quality: 0.98 },
    html2canvas: { scale: 2, useCORS: true },
    jsPDF: { unit: "mm", format: "a4", orientation: "landscape" },
  };

  try {
    await html2pdf().set(opt).from(element).save();
  } catch (err) {
    console.error("Erreur génération PDF menus:", err);
    window.alert(t("admin.menuspfd.error", "Error al generar el PDF."));
  }
}

defineExpose({ downloadMenusPdf });
</script>

<style scoped>
.print-page {
  box-sizing: border-box;
  background: #ffffff;
  color: #000000;
  font-family: Arial, Helvetica, sans-serif;
  font-size: 10pt;
  position: relative;
}

.print-page-landscape {
  width: 277mm;
  min-height: 190mm;
  padding: 10mm;
}

.print-content {
  padding-bottom: 10mm;
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

.print-title {
  text-align: center;
  font-weight: 700;
  font-size: 13pt;
  margin: 0 0 4mm 0;
}

.print-subtitle {
  margin: 0 0 6mm 0;
  font-size: 9.5pt;
  color: #222;
  text-align: center;
}

.block {
  margin-top: 6mm;
}

.block-title {
  font-weight: 700;
  margin: 0 0 3mm 0;
}

.chips {
  display: flex;
  flex-wrap: wrap;
  gap: 2.5mm;
}

.chip {
  border: 0.25mm solid #e0e0e0;
  border-radius: 999px;
  padding: 1.5mm 3mm;
  display: inline-flex;
  align-items: baseline;
  gap: 3mm;
  background: #fafafa;
}

.chip-name {
  font-weight: 700;
  font-size: 9.5pt;
}

.chip-count {
  font-weight: 700;
  font-size: 9.5pt;
}

.tables {
  display: flex;
  flex-direction: column;
  gap: 4mm;
}

.table {
  border: 0.25mm solid #e0e0e0;
  border-radius: 3mm;
  padding: 4mm;
}

.table-header {
  display: flex;
  justify-content: space-between;
  gap: 6mm;
  margin-bottom: 3mm;
  align-items: baseline;
}

.table-title {
  font-weight: 700;
}

.table-meta {
  font-size: 9pt;
  color: #222;
}

.empty {
  opacity: 0.7;
  margin: 0;
}
</style>
