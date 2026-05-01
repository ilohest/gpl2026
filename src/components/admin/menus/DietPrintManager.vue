<!-- src/components/admin/menus/DietPrintManager.vue -->
<template>
  <!-- TEMPLATE PDF -->
  <div class="fixed -left-[9999px] top-0">
    <div
      ref="dietPdfRef"
      class="print-page print-page-portrait"
    >
      <div class="print-content">
        <p class="print-title uppercase">
          {{ t("admin.dietpdf.title") }}
        </p>

        <p class="print-subtitle">
          {{ t("admin.dietpdf.total_attendees") }} :
          <strong>{{ totalAttendees }}</strong>
          —
          {{ t("admin.dietpdf.total_with_diet") }} :
          <strong>{{ attendeesWithDiet }}</strong>
        </p>

        <div
          v-if="dietGroups.length"
          class="diet-groups"
        >
          <div
            v-for="group in dietGroups"
            :key="group.key"
            class="diet-group"
          >
            <div class="diet-group-header">
              <div class="diet-group-header">
                <div class="diet-group-title-wrap">
                  <img
                    v-if="group.icon"
                    :src="group.icon"
                    alt=""
                    class="diet-icon"
                    crossorigin="anonymous"
                  />
                  <span class="diet-group-title">{{ group.label }}</span>
                </div>
              </div>

              <span class="diet-group-count">
                {{ group.count }}
              </span>
            </div>

            <ul class="diet-group-list">
              <li
                v-for="name in group.names"
                :key="name"
              >
                {{ name }}
              </li>
            </ul>
          </div>
        </div>

        <p
          v-else
          class="empty"
        >
          {{ t("admin.dietpdf.none") }}
        </p>
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
import { useGuestDirectoryStore } from "@/stores/guestDirectoryStore";
import { useLang } from "@/composables/useLang";
import { getDietBadges } from "@/shared/dietIcons";
import { usePrintTimestamp } from "@/composables/usePrintTimestamp";
import {
  normalizeDietCodes,
  ensureOtherIfText,
} from "../../../../shared/dietTypes";

const { t } = useLang();
const guestDir = useGuestDirectoryStore();
const { printedAt, stampNow } = usePrintTimestamp({
  prefix: "Printed on",
});

const dietPdfRef = ref(null);

// -------- helpers --------

function isRowAttending(row) {
  return row?.attending === true;
}

function fullNameFromRow(row) {
  const fromFull = String(row?.fullName || "").trim();
  if (fromFull) return fromFull;

  const first = String(row?.firstName || "").trim();
  const last = String(row?.lastName || "").trim();
  const merged = `${first} ${last}`.trim();
  return merged || "—";
}

// -------- stats --------

const totalAttendees = computed(() => {
  return (guestDir.items || []).filter(isRowAttending).length;
});

const attendeesWithDiet = computed(() => {
  return (guestDir.items || []).filter((r) => {
    if (!isRowAttending(r)) return false;

    const codes = Array.isArray(r.dietCodes) ? r.dietCodes : [];
    const otherText = String(r.dietOtherText || "").trim();

    return codes.length > 0 || otherText.length > 0;
  }).length;
});

// Grouping =
// - codes normaux groupés par code
// - "other" groupé par détail (donc "Sans ail" != "Sans gluten")
const dietGroups = computed(() => {
  const map = new Map();

  for (const r of guestDir.items || []) {
    if (!isRowAttending(r)) continue;

    const name = fullNameFromRow(r);

    const otherText = String(r.dietOtherText || "").trim();

    let codes = normalizeDietCodes(
      Array.isArray(r.dietCodes) ? r.dietCodes : [],
      {
        dropUnknown: true,
      },
    );

    codes = ensureOtherIfText(codes, otherText);

    const badges = getDietBadges(codes, otherText);

    for (const b of badges) {
      const isOther = b.key === "other";

      const label =
        isOther && b.tooltip
          ? b.tooltip
          : isOther
            ? t("admin.dietpdf.other_not_specified")
            : t(b.i18nKey);

      const key =
        isOther && b.tooltip
          ? `other:${String(b.tooltip).toLowerCase()}`
          : isOther
            ? "other:__empty__"
            : `code:${b.key}`;

      if (!map.has(key)) {
        map.set(key, {
          key,
          label,
          icon: b.icon,
          names: new Set(),
        });
      }

      map.get(key).names.add(name);
    }
  }

  return Array.from(map.values())
    .map((g) => ({
      ...g,
      names: Array.from(g.names).sort((a, b) => a.localeCompare(b)),
      count: g.names.size,
    }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
});

// -------- download --------

async function downloadDietPdf() {
  const element = dietPdfRef.value;
  if (!element) return;

  stampNow();
  await nextTick();

  const filename = t("admin.dietpdf.filename");

  const opt = {
    margin: 10,
    filename,
    image: { type: "jpeg", quality: 0.98 },
    html2canvas: { scale: 2, useCORS: true },
    jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
  };

  try {
    await html2pdf().set(opt).from(element).save();
  } catch (err) {
    console.error("Erreur génération PDF restrictions:", err);
    window.alert(t("admin.dietpdf.error"));
  }
}

defineExpose({
  downloadDietPdf,
});
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

.print-page-portrait {
  width: 190mm;
  min-height: 277mm;
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

.diet-groups {
  display: flex;
  flex-direction: column;
  gap: 5mm;
}

.diet-group {
  border: 0.25mm solid #e0e0e0;
  border-radius: 3mm;
  padding: 4mm;
}

.diet-group-header {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 6mm;
  margin-bottom: 2mm;
}

.diet-group-title {
  font-weight: 700;
  font-size: 10pt;
}

.diet-group-count {
  font-weight: 700;
  font-size: 10pt;
}

.diet-group-list {
  margin: 0;
  padding-left: 6mm;
  list-style-type: disc;
  font-size: 9pt;
}

.diet-group-list li {
  margin: 0 0 1mm 0;
}

.empty {
  margin-top: 10mm;
  text-align: center;
  opacity: 0.7;
}

.diet-group-title-wrap {
  display: flex;
  align-items: center;
  gap: 3mm;
  min-width: 0;
}

.diet-icon {
  width: 5mm;
  height: 5mm;
  object-fit: contain;
  flex-shrink: 0;
}
</style>
