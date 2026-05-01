<!-- src/components/admin/EmailJobsHistory.vue -->
<template>
  <div>
    <Card :style="{ border: '1px solid var(--accent-color)' }">
      <template #title>
        <div class="flex items-center justify-between gap-3">
          <div class="flex items-center gap-2 min-w-0">
            <p class="admin-bento-title truncate">
              <i class="pi pi-history text-sm" aria-hidden="true" />
              {{ titleText }}
            </p>
          </div>
        </div>
      </template>

      <template #content>
        <div class="mt-4">
          <div v-if="historyBusy" class="text-xs opacity-70">
            {{ t("common.loading", "Loading...") }}
          </div>

          <ContentViewer
            v-else-if="!jobs.length"
            class="text-sm opacity-70"
            :empty-text="emptyText"
          />

          <DataTable
            v-else
            :value="jobs"
            data-key="id"
            responsive-layout="scroll"
            class="p-datatable-sm"
            :row-hover="true"
            paginator
            :rows="historyTableRows"
            :rows-per-page-options="historyRowsPerPageOptions"
            selection-mode="single"
            @row-select="onSelectJob"
            :meta-key-selection="false"
            sort-field="createdAt"
            :sort-order="-1"
            @page="onHistoryTablePage"
          >
            <!-- Sujet -->
            <Column :header="t('common.subject')" style="min-width: 280px">
              <template #body="{ data }">
                <div class="min-w-0">
                  <div class="text-sm truncate">
                    {{ data.subject || t("admin.email_blast.no_subject") }}
                  </div>
                  <div class="text-xs opacity-70 truncate mt-1">
                    {{ jobSnippet(data) }}
                  </div>
                </div>
              </template>
            </Column>

            <!-- Heure -->
            <Column :header="t('common.date')" style="width: 130px">
              <template #body="{ data }">
                <span class="text-xs opacity-70 whitespace-nowrap">
                  {{ formatDate(data.createdAt || data.updatedAt) }}
                </span>
              </template>
            </Column>

            <!-- Heure -->
            <Column :header="t('common.time')" style="width: 90px">
              <template #body="{ data }">
                <span class="text-xs opacity-70 whitespace-nowrap">
                  {{ formatTime(data.createdAt || data.updatedAt) }}
                </span>
              </template>
            </Column>

            <!-- Statut -->
            <Column :header="t('common.status')" style="width: 130px">
              <template #body="{ data }">
                <span
                  class="text-xs px-2 py-1 rounded-full border"
                  :class="statusPillClass(data)"
                >
                  {{ statusLabel(data) }}
                </span>
              </template>
            </Column>
          </DataTable>

          <p v-if="helpText" class="text-xs opacity-70 mt-3">
            {{ helpText }}
          </p>
        </div>
      </template>
    </Card>

    <!-- CAMPAIN DETAIL DIALOG -->
    <Dialog
      v-model:visible="detailsVisible"
      :modal="true"
      :style="{ width: 'min(980px, 100%)' }"
      :header="t('admin.email_blast.details_title')"
    >
      <div class="space-y-3">
        <div v-if="detailsBusy" class="text-xs opacity-70">
          {{ t("common.loading", "Loading...") }}
        </div>

        <ContentViewer
          v-else-if="!activeJobDetails"
          class="text-sm opacity-70"
          :empty-text="t('common.no_data', 'No data.')"
        />

        <template v-else>
          <!-- Titre -->
          <div class="bg-[var(--surface-soft)] rounded-xl p-3">
            <div class="flex items-start justify-between gap-3">
              <div class="min-w-0">
                <p class="font-medium truncate">
                  {{
                    activeJobDetails.subject ||
                      t("admin.email_blast.no_subject")
                  }}
                </p>
                <p class="text-xs opacity-70 mt-1">
                  {{
                    formatDateTime(
                      activeJobDetails.createdAt || activeJobDetails.updatedAt,
                    )
                  }}
                  ·
                  <span
                    class="text-xs px-2 py-1 rounded-full border"
                    :class="statusPillClass(activeJobDetails)"
                  >
                    {{ statusLabel(activeJobDetails) }}
                  </span>
                  · Total: {{ activeJobDetails.total || 0 }} · OK:
                  {{ activeJobDetails.ok || 0 }} · KO:
                  {{ activeJobDetails.ko || 0 }}
                  <span v-if="activeJobDetails.lastError">
                    · {{ activeJobDetails.lastError }}
                  </span>
                </p>
              </div>
            </div>
          </div>

          <!-- Aperçu contenu -->
          <div class="border rounded-xl p-3">
            <p class="text-sm font-medium opacity-70 mb-2 uppercase">
              {{ t("admin.email_blast.preview") }}
            </p>

            <ContentViewer
              v-if="!activeJobHtml"
              class="text-sm opacity-70"
              :empty-text="t('admin.email_blast.preview_unavailable')"
            />

            <!-- sandbox iframe: affichage HTML sans v-html direct -->
            <iframe
              v-else
              class="w-full"
              style="height: 380px"
              sandbox=""
              :srcdoc="activeJobHtml"
            />
          </div>

          <!-- Destinataires -->
          <div class="rounded-xl p-3">
            <div class="flex items-center justify-between gap-2 mb-2">
              <p class="text-sm font-medium opacity-70 mb-2 uppercase">
                {{ t("admin.email_blast.deliveries_title") }}
              </p>
            </div>

            <div class="flex items-center gap-2 mb-3">
              <InputText
                v-model="deliveriesSearch"
                class="w-full"
                :placeholder="t('common.search', 'Search…')"
              />
            </div>

            <div v-if="deliveriesBusy" class="text-xs opacity-70">
              {{ t("common.loading", "Loading...") }}
            </div>

            <ContentViewer
              v-else-if="!filteredDeliveries.length"
              class="text-sm opacity-70"
              :show-no-results="!!(deliveriesSearch || '').trim()"
              :no-results-text="
                t('common.no_results', 'Aucun résultat pour votre recherche.')
              "
              :empty-text="t('admin.email_blast.deliveries_empty')"
            />

            <DataTable
              v-else
              :value="filteredDeliveries"
              data-key="id"
              responsive-layout="scroll"
              class="p-datatable-sm"
            >
              <Column
                field="sentAt"
                :header="t('common.date')"
                style="width: 180px"
              >
                <template #body="{ data }">
                  <div class="text-xs">
                    {{ formatDateTime(data.sentAt) }}
                  </div>
                </template>
              </Column>

              <Column field="to" :header="t('common.email')">
                <template #body="{ data }">
                  <div class="text-sm">
                    {{ data.to || "—" }}
                  </div>
                </template>
              </Column>

              <Column
                field="name"
                :header="t('common.name')"
                style="width: 180px"
              >
                <template #body="{ data }">
                  <div class="text-sm">
                    {{ data.name || "—" }}
                  </div>
                </template>
              </Column>

              <Column
                field="status"
                :header="t('common.status')"
                style="width: 110px"
              >
                <template #body="{ data }">
                  <span
                    class="text-xs px-2 py-1 rounded-full border"
                    :class="
                      data.status === 'ok'
                        ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                        : 'border-rose-200 bg-rose-50 text-rose-700'
                    "
                  >
                    {{ data.status }}
                  </span>
                </template>
              </Column>

              <Column
                field="error"
                :header="t('common.error')"
                style="min-width: 240px"
              >
                <template #body="{ data }">
                  <span class="text-xs opacity-70">{{
                    data.error || "—"
                  }}</span>
                </template>
              </Column>
            </DataTable>
          </div>
        </template>
      </div>
    </Dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from "vue";
import Card from "primevue/card";
import DataTable from "primevue/datatable";
import Column from "primevue/column";
import Dialog from "primevue/dialog";
import InputText from "primevue/inputtext";
import { useToast } from "primevue/usetoast";

import { useLang } from "@/composables/useLang";
import { api } from "@/services/api";
import { showApiError } from "@/utils/showApiError";
import ContentViewer from "@/components/utils/ContentViewer.vue";

const props = defineProps({
  type: { type: String, default: "" },
  title: { type: String, default: "" },
  emptyText: { type: String, default: "" },
  helpText: { type: String, default: "" },
  limit: { type: Number, default: 50 },
  rows: { type: Number, default: 10 },
  storageKey: { type: String, default: "" },
});

const { t } = useLang();
const toast = useToast();

const historyBusy = ref(false);
const jobs = ref([]);

const detailsVisible = ref(false);
const detailsBusy = ref(false);
const activeJobDetails = ref(null);
const activeJobHtml = ref("");

const deliveriesBusy = ref(false);
const deliveries = ref([]);
const deliveriesSearch = ref("");
const historyRowsPerPageOptions = [10, 20, 50];
const historyTableRows = ref(
  getInitialPageSize(
    getHistoryRowsStorageKey(),
    props.rows,
    historyRowsPerPageOptions,
  ),
);

function normalizeStorageSegment(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function getHistoryRowsStorageKey() {
  const explicitKey = String(props.storageKey || "").trim();
  if (explicitKey) return explicitKey;
  const typeSegment = normalizeStorageSegment(props.type) || "default";
  return `datatable:email-jobs-history:${typeSegment}:rows`;
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

function onHistoryTablePage(event) {
  const nextSize = Number(event?.rows);
  if (!historyRowsPerPageOptions.includes(nextSize)) return;
  historyTableRows.value = nextSize;
  persistPageSize(
    getHistoryRowsStorageKey(),
    nextSize,
    historyRowsPerPageOptions,
  );
}

const titleText = computed(() =>
  props.title ? props.title : t("admin.email_blast.history_title"),
);

const emptyText = computed(() =>
  props.emptyText ? props.emptyText : t("admin.email_blast.history_empty"),
);

const helpText = computed(() => (props.helpText ? props.helpText : ""));

const filteredDeliveries = computed(() => {
  const q = String(deliveriesSearch.value || "")
    .trim()
    .toLowerCase();
  if (!q) return deliveries.value;
  return deliveries.value.filter((d) => {
    return (
      String(d.to || "")
        .toLowerCase()
        .includes(q) ||
      String(d.name || "")
        .toLowerCase()
        .includes(q) ||
      String(d.status || "")
        .toLowerCase()
        .includes(q) ||
      String(d.error || "")
        .toLowerCase()
        .includes(q)
    );
  });
});

function isNoRecipientsJob(job) {
  return (
    String(job?.status || "") === "done" &&
    Number(job?.total || 0) === 0 &&
    Number(job?.ok || 0) === 0 &&
    Number(job?.ko || 0) === 0
  );
}

function effectiveStatus(job) {
  if (isNoRecipientsJob(job)) return "no_recipients";
  const s = String(job?.status || "")
    .trim()
    .toLowerCase();
  return s || "unknown";
}

function statusPillClass(job) {
  const status = effectiveStatus(job);
  if (status === "done")
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (status === "running" || status === "queued")
    return "border-sky-200 bg-sky-50 text-sky-700";
  if (status === "skipped" || status === "no_recipients")
    return "border-amber-200 bg-amber-50 text-amber-700";
  return "border-rose-200 bg-rose-50 text-rose-700";
}

function statusLabel(job) {
  const status = effectiveStatus(job);
  if (status === "queued") return t("admin.email_blast.job_queued");
  if (status === "running") return t("admin.email_blast.job_running");
  if (status === "done") return t("admin.email_blast.job_done");
  if (status === "error") return t("admin.email_blast.job_error");
  if (status === "skipped") return t("admin.email_blast.job_skipped");
  if (status === "no_recipients")
    return t("admin.email_blast.job_no_recipients");
  return job?.status || "—";
}

function toDateMaybe(ts) {
  if (!ts) return null;

  if (typeof ts?.toDate === "function") return ts.toDate();

  if (typeof ts === "object") {
    const secs = ts._seconds ?? ts.seconds ?? null;
    const nanos = ts._nanoseconds ?? ts.nanoseconds ?? 0;
    if (typeof secs === "number") {
      const d = new Date(secs * 1000 + Math.floor(Number(nanos || 0) / 1e6));
      return Number.isNaN(d.getTime()) ? null : d;
    }
  }

  if (typeof ts === "string" || typeof ts === "number") {
    const d = new Date(ts);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  return null;
}

function formatDateTime(ts) {
  const d = toDateMaybe(ts);
  if (!d) return "—";
  return d.toLocaleString();
}

function formatDate(ts) {
  const d = toDateMaybe(ts);
  if (!d) return "—";
  return d.toLocaleDateString();
}

function formatTime(ts) {
  const d = toDateMaybe(ts);
  if (!d) return "—";
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function stripHtmlToText(html) {
  const raw = String(html || "")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<\/p>/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .trim();

  // Decode common HTML entities (&nbsp;, &amp;, etc.) for readable history snippets.
  if (typeof document !== "undefined") {
    const el = document.createElement("textarea");
    el.innerHTML = raw;
    return el.value
      .replace(/\u00a0/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  return raw
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function jobSnippet(j) {
  const tpl =
    j?.campaign?.previewHtml ||
    j?.campaign?.previewInnerHtml ||
    j?.campaign?.htmlRendered ||
    j?.campaign?.htmlFinal ||
    j?.campaign?.htmlTemplate ||
    j?.campaign?.html ||
    "";

  const base = tpl ? stripHtmlToText(tpl) : j?.lastError || j?.type || "";
  if (!base) return "—";
  return base.length > 110 ? base.slice(0, 110) + "…" : base;
}

function wrapAsEmailSrcdoc(innerHtml) {
  const safeInner = String(innerHtml || "");
  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <style>
      html, body { margin:0; padding:0; }
      body { padding:12px; font-family:Arial,sans-serif; }
    </style>
  </head>
  <body>
    ${safeInner}
  </body>
</html>`;
}

function isFullHtmlDoc(html) {
  const s = String(html || "").toLowerCase();
  return s.includes("<!doctype") || s.includes("<html");
}

async function refreshHistory() {
  historyBusy.value = true;
  try {
    const out = await api.listEmailJobs({
      limit: props.limit,
      type: props.type || undefined,
    });
    jobs.value = Array.isArray(out?.items) ? out.items : [];
  } catch (err) {
    showApiError(t, toast, err);
  } finally {
    historyBusy.value = false;
  }
}

async function onSelectJob(ev) {
  const j = ev?.data;
  if (!j?.id) return;

  detailsVisible.value = true;
  deliveriesSearch.value = "";
  activeJobDetails.value = null;
  activeJobHtml.value = "";
  deliveries.value = [];

  await loadJobDetails(j.id);
}

async function loadJobDetails(jobId) {
  detailsBusy.value = true;
  try {
    const out = await api.getEmailJob(jobId);
    const job = out?.job || out;
    activeJobDetails.value = job || null;

    const raw =
      job?.campaign?.previewHtml ||
      job?.campaign?.previewInnerHtml ||
      job?.campaign?.htmlRendered ||
      job?.campaign?.htmlFinal ||
      job?.campaign?.htmlTemplate ||
      job?.campaign?.html ||
      "";

    activeJobHtml.value = raw
      ? isFullHtmlDoc(raw)
        ? raw
        : wrapAsEmailSrcdoc(raw)
      : "";

    await reloadDeliveries();
  } catch (err) {
    showApiError(t, toast, err);
  } finally {
    detailsBusy.value = false;
  }
}

async function reloadDeliveries() {
  const jobId = activeJobDetails.value?.id;
  if (!jobId) return;

  deliveriesBusy.value = true;
  try {
    const out = await api.getEmailJobDeliveries(jobId, { limit: 400 });
    deliveries.value = Array.isArray(out?.items) ? out.items : [];
  } catch (err) {
    showApiError(t, toast, err);
  } finally {
    deliveriesBusy.value = false;
  }
}

onMounted(async () => {
  await refreshHistory();
});

defineExpose({ refresh: refreshHistory });
</script>
