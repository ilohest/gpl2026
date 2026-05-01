<!-- src/components/admin/agenda/AgendaPrintManager.vue -->
<template>
  <Dialog
    :visible="visible"
    modal
    :header="t('admin.agenda.print.dialog_title')"
    :style="{ width: '860px', maxWidth: '96vw' }"
    @update:visible="(v) => emit('update:visible', v)"
  >
    <div class="space-y-4 text-sm">
      <Button
        size="small"
        :label="t('admin.agenda.print.download_full')"
        icon="pi pi-download"
        @click="downloadPdf('FULL')"
        :style="{
          backgroundColor: 'var(--accent-color)',
          borderColor: 'var(--accent-color)',
          color: 'white',
        }"
      />

      <div class="flex flex-col md:flex-row md:items-end gap-2">
        <div class="flex-1">
          <label class="text-xs opacity-70">
            {{ t("admin.agenda.print.by_vendor") }}</label>
          <Select
            v-model="selectedTag"
            :options="tagOptions"
            :placeholder="t('admin.agenda.print.tag_placeholder')"
            show-clear
            class="w-full"
          >
            <template #value="{ value, placeholder }">
              <span
                v-if="!value"
                class="opacity-60"
              >{{ placeholder }}</span>
              <Tag
                v-else
                :value="value"
                class="rounded-full text-xs"
                :style="ownerTagStyle(value)"
              />
            </template>

            <template #option="{ option }">
              <Tag
                :value="option"
                class="rounded-full text-xs"
                :style="ownerTagStyle(option)"
              />
            </template>
          </Select>
        </div>

        <Button
          size="small"
          :label="t('admin.agenda.print.download_for_vendor')"
          icon="pi pi-download"
          severity="secondary"
          :disabled="!selectedTag"
          @click="downloadPdf('TAG')"
        />
      </div>
    </div>

    <!-- TEMPLATES PDF (hidden) -->
    <div class="fixed -left-[9999px] top-0">
      <div
        ref="pdfRef"
        class="print-page print-page-portrait"
      >
        <div class="print-content">
          <p class="print-title uppercase">{{ headerTitle }}</p>

          <table class="print-table mt-4">
            <thead>
              <tr>
                <th class="col-time">
                  {{ t("admin.agenda.print.cols.time") }}
                </th>
                <th class="col-dur">
                  {{ t("admin.agenda.print.cols.duration") }}
                </th>
                <th class="col-action">
                  {{ t("admin.agenda.print.cols.action") }}
                </th>
                <th class="col-who">{{ t("admin.agenda.print.cols.who") }}</th>
                <th class="col-music">
                  {{ t("admin.agenda.print.cols.music") }}
                </th>
              </tr>
            </thead>

            <tbody>
              <template
                v-for="it in printItems"
                :key="it.id"
              >
                <!-- Ligne principale -->
                <tr class="row-avoid-break">
                  <td class="col-time nowrap">{{ it.time || "—" }}</td>

                  <td class="col-dur nowrap">
                    {{ it.durationMin ? `${it.durationMin}m` : "—" }}
                  </td>

                  <td class="col-action">
                    <div class="font-semibold">{{ it.title || "—" }}</div>

                    <!-- Types (pills bleu clair / bord bleu) -->
                    <div
                      v-if="normalizedTypes(it).length"
                      class="pill-wrap mt-1"
                    >
                      <span
                        v-for="typeCode in normalizedTypes(it)"
                        :key="typeCode"
                        class="pill pill-type"
                      >
                        <span class="pill-text">{{ typeLabelValue(typeCode) }}</span>
                      </span>
                    </div>

                    <!-- Lieu -->
                    <div
                      class="muted mt-1"
                      v-if="String(it.location || '').trim()"
                    >
                      <span class="loc-line">
                        <i class="pi pi-map-marker loc-icon" />
                        <span class="loc-text">{{ it.location }}</span>
                      </span>
                    </div>
                  </td>

                  <td class="col-who">
                    <!-- Intervenants -->
                    <div
                      v-if="(it.ownerTags || []).length"
                      class="mb-2"
                    >
                      <div class="who-title">
                        {{ t("admin.agenda.print.sections.vendors") }}
                      </div>
                      <div class="pill-wrap">
                        <span
                          v-for="ownerTag in it.ownerTags"
                          :key="ownerTag"
                          class="pill pill-owner"
                          :style="resolveOwnerTagStyle(ownerTag)"
                        >
                          <span class="pill-text">{{ ownerTagLabel(ownerTag) }}</span>
                        </span>
                      </div>
                    </div>

                    <!-- Participants -->
                    <div v-if="(it.participants || []).length">
                      <div class="who-title">
                        {{ t("admin.agenda.print.sections.participants") }}
                      </div>
                      <div class="who-list">
                        <div
                          v-for="p in it.participants"
                          :key="p"
                        >
                          {{ guestLabel(p) }}
                        </div>
                      </div>
                    </div>

                    <div
                      v-if="
                        !(it.ownerTags || []).length &&
                          !(it.participants || []).length
                      "
                      class="muted"
                    >
                      —
                    </div>
                  </td>

                  <!-- Musique -->
                  <td class="col-music">
                    <div v-if="it.trackRefs?.length">
                      <div
                        v-for="tr in it.trackRefs.slice(0, 4)"
                        :key="tr.id"
                      >
                        <span class="font-semibold">{{ tr.title }}</span>
                        <span v-if="tr.artist"> — {{ tr.artist }}</span>
                      </div>
                      <div
                        v-if="it.trackRefs.length > 4"
                        class="muted"
                      >
                        +{{ it.trackRefs.length - 4 }}
                      </div>
                    </div>
                    <div
                      v-else
                      class="muted"
                    >
                      —
                    </div>
                  </td>
                </tr>

                <!-- Notes -->
                <tr
                  v-if="String(it.notes || '').trim()"
                  class="row-avoid-break notes-row"
                >
                  <td
                    colspan="5"
                    class="notes-cell"
                  >
                    <div class="notes-label">
                      {{ t("admin.agenda.print.sections.notes") }}
                    </div>
                    <div class="notes">{{ it.notes }}</div>
                  </td>
                </tr>
              </template>
            </tbody>
          </table>
        </div>

        <div class="print-footer">
          {{ printedAt }}
        </div>
      </div>
    </div>
  </Dialog>
</template>

<script setup>
import { computed, ref, nextTick } from "vue";
import html2pdf from "html2pdf.js";

import Dialog from "primevue/dialog";
import Button from "primevue/button";
import Select from "primevue/select";
import Tag from "primevue/tag";

import { usePrintTimestamp } from "@/composables/usePrintTimestamp";
import { useLang } from "@/composables/useLang";
import { typeLabelFromMeta } from "../../../../shared/agendaTypes";

const props = defineProps({
  visible: { type: Boolean, default: false },
  items: { type: Array, default: () => [] },
  guestLabel: { type: Function, required: true },
  ownerTagStyle: { type: Function, required: true },
  ownerTagLabel: { type: Function, required: true },
});

const emit = defineEmits(["update:visible"]);

const { printedAt, stampNow } = usePrintTimestamp({
  locale: "es-ES",
  prefix: "Printed on",
});

const selectedTag = ref(null);
const mode = ref("FULL"); // FULL | TAG
const pdfRef = ref(null);
const { t } = useLang();

const tagOptions = computed(() => {
  const set = new Set();

  (props.items || []).forEach((it) =>
    (it.ownerTags || []).forEach((tag) => set.add(String(tag).trim()))
  );

  return Array.from(set)
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b));
});

// --- Types utils
function pickTypeString(v) {
  if (typeof v === "string") return v;
  if (v && typeof v === "object") return v.value ?? v.label ?? "";
  return "";
}

function normalizeTypes(arr) {
  const raw = Array.isArray(arr) ? arr : [];
  const normalized = raw
    .map((x) => String(pickTypeString(x) ?? "").trim())
    .filter((t) => t && t !== "-" && t !== "—");
  const map = new Map();
  for (const t of normalized) map.set(t.toLowerCase(), t);
  return Array.from(map.values());
}

function typeLabelValue(v) {
  const code = String(v || "").trim();
  return typeLabelFromMeta(code, t) || code || "—";
}

function normalizedTypes(it) {
  return normalizeTypes(it?.type || []);
}

const headerTitle = computed(() => {
  if (mode.value === "TAG") {
    return t("admin.agenda.print.header_tag", { tag: selectedTag.value || "" });
  }
  return t("admin.agenda.print.header_full");
});

const printItems = computed(() => {
  const all = props.items || [];
  if (mode.value === "TAG" && selectedTag.value) {
    return all.filter((it) => (it.ownerTags || []).includes(selectedTag.value));
  }
  return all;
});

async function downloadPdf(m) {
  mode.value = m;

  stampNow();
  mode.value = m;
  await nextTick();

  await nextTick();

  const element = pdfRef.value;
  if (!element) return;

  const filename =
    m === "TAG"
      ? t("admin.agenda.print.filename_tag", {
          tag: String(selectedTag.value || "tag").toLowerCase(),
        })
      : t("admin.agenda.print.filename_full");

  const opt = {
    margin: [6, 6, 6, 6], // au lieu de 10
    filename,
    image: { type: "jpeg", quality: 0.98 },
    html2canvas: { scale: 2, useCORS: true },
    jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
    pagebreak: { mode: ["css", "legacy"], avoid: ["tr", ".row-avoid-break"] },
  };

  try {
    await html2pdf().set(opt).from(element).save();
  } catch (err) {
    console.error("Erreur génération PDF agenda:", err);
    window.alert("Impossible de générer le PDF. Regarde la console.");
  }
}

defineExpose({ downloadPdf });

function resolveOwnerTagStyle(tag) {
  return props.ownerTagStyle(tag);
}
</script>

<style scoped>
/* Base */
.print-page {
  box-sizing: border-box;
  background: #ffffff;
  color: #111;
  font-family: Arial, Helvetica, sans-serif;
}

.print-title {
  text-align: center;
  font-weight: 700;
  font-size: 13pt;
  margin: 0 0 2mm 0;
  letter-spacing: 0.06em;
}

/* Table */
.print-table {
  width: 100%;
  border-collapse: collapse;
  table-layout: fixed;
  page-break-inside: auto;
}

.print-table thead {
  display: table-header-group;
}

.print-table tr {
  page-break-inside: avoid;
  page-break-after: auto;
}

.print-table th,
.print-table td {
  border: 0.2mm solid #e0e0e0;
  padding: 1.8mm 2mm;
  text-align: left;
  vertical-align: top;
  overflow: visible;
  white-space: normal;
  word-break: break-word;
  font-size: 9pt;
}

.print-table thead th {
  background: #f5f5f5;
  font-weight: 700;
  font-size: 8pt;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.print-table th,
.print-table td {
  padding-bottom: 4mm; /* bottom plus grand */
}

.nowrap {
  white-space: nowrap;
}

/* Colonnes */
.col-time {
  width: 14mm;
}
.col-dur {
  width: 12mm;
}
.col-action {
  width: 62mm;
}
.col-who {
  width: 48mm;
}
.col-music {
  width: 54mm;
}

.muted {
  opacity: 0.7;
  font-size: 8pt;
  margin-top: 1mm;
}

.font-semibold {
  font-weight: 700;
}

/* Pills */
.pill-wrap {
  display: flex;
  flex-wrap: wrap;
  gap: 1.2mm;
}

.pill {
  display: inline-grid;
  place-items: center;
  vertical-align: middle;
  min-height: 7mm;
  padding: 0 2.8mm;
  border-radius: 999px;
  font-size: 8pt;
  font-weight: 600;
  line-height: 1;
}

.pill-text {
  display: block;
  line-height: 1;
  text-align: center;
  white-space: nowrap;
  text-decoration: none !important;
  text-shadow: none;
  transform: translateY(-0.4mm);
}

/* Types: bleu clair + bord bleu */
.pill-type {
  background: #eaf2ff;
  border: 0.35mm solid #1f5fbf;
  color: #1f5fbf;
}

/* Intervenants: couleurs via ownerTagStyle */
.pill-owner {
  border: 0;
  color: #fff;
}

/* Qui */
.who-title {
  font-size: 7.3pt;
  font-weight: 700;
  opacity: 0.7;
  letter-spacing: 0.05em;
  margin-bottom: 1mm;
}

.who-list {
  font-size: 8.6pt;
  line-height: 1.2;
}

/* Lieu */
.loc-line {
  display: inline-flex;
  align-items: center;
  gap: 1.2mm;
}

.loc-icon {
  font-size: 8pt;
  opacity: 0.7;
}

.loc-text {
  white-space: normal;
  word-break: break-word;
}

.notes-row td {
  background: #fafafa;
}

.notes-cell {
  padding: 2.2mm 2.4mm 4.5mm; /* bottom plus grand */
}

.notes {
  padding-bottom: 4mm; /* espace après le texte */
  line-height: 1.25; /* optionnel */
}

.notes-label {
  font-size: 7.3pt;
  font-weight: 700;
  opacity: 0.7;
  letter-spacing: 0.05em;
  margin-bottom: 1mm;
}

.notes {
  white-space: pre-line;
  line-height: 1.2;
}

.print-subtitle {
  text-align: center;
  font-size: 8.5pt;
  opacity: 0.7;
  margin: 0 0 3mm 0;
}

.print-page-portrait {
  position: relative;
  width: 198mm; /* 210 - (6mm*2) */
  min-height: 285mm; /* 297 - (6mm*2) */
  margin: 0 auto;
  padding: 0; /* IMPORTANT: pas de padding qui ferait dépasser */
  box-sizing: border-box;
}

.print-content {
  padding: 0;
  padding-bottom: 10mm; /* place pour le footer */
  box-sizing: border-box;
}

.print-footer {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  padding: 2mm 0;
  font-size: 8pt;
  opacity: 0.7;
  text-align: center;
  box-sizing: border-box;
}
</style>
