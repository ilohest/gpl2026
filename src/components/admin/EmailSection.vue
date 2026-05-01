<!-- src/components/admin/EmailSection.vue -->
<template>
  <!-- SEND EMAIL -->
  <Card
    v-if="canSendEmail"
    :style="{ border: '1px solid var(--accent-color)' }"
  >
    <template #title>
      <div class="flex items-center justify-between gap-3">
        <div class="flex items-center gap-2 min-w-0">
          <p class="admin-bento-title truncate">
            <i class="pi pi-inbox text-sm" aria-hidden="true" />
            {{ t("admin.email_blast.title") }}
          </p>
        </div>
      </div>
    </template>

    <template #content>
      <div v-if="showSkeleton" class="space-y-4 mt-4">
        <Skeleton width="100%" height="2.75rem" />
        <Skeleton width="100%" height="16.5rem" />
        <Skeleton width="100%" height="2.75rem" />
        <Skeleton width="12rem" height="0.9rem" />
        <div class="flex gap-2 justify-end my-4">
          <Skeleton width="9rem" height="2.25rem" border-radius="999px" />
          <Skeleton width="9rem" height="2.25rem" border-radius="999px" />
        </div>
      </div>

      <div v-else class="space-y-4 mt-4">
        <!-- Envoi en cours -->
        <div
          v-if="job"
          class="p-3 rounded-xl border"
          :class="
            job.status === 'error'
              ? 'border-rose-200 bg-rose-50'
              : 'border-emerald-200 bg-emerald-50'
          "
        >
          <div class="flex items-center justify-between gap-4">
            <div class="min-w-0">
              <p class="text-sm font-semibold truncate">
                {{
                  job.status === "queued"
                    ? t("admin.email_blast.job_queued")
                    : job.status === "running"
                      ? t("admin.email_blast.job_running")
                      : job.status === "done"
                        ? t("admin.email_blast.job_done")
                        : t("admin.email_blast.job_error")
                }}
              </p>
              <p class="text-xs opacity-70 mt-1">
                {{
                  t("admin.email_blast.job_progress")
                    .replace("{done}", String((job.ok || 0) + (job.ko || 0)))
                    .replace("{total}", String(job.total || 0))
                }}
                <span v-if="job.lastError"> · {{ job.lastError }}</span>
              </p>
            </div>

            <div class="text-right text-xs opacity-70 whitespace-nowrap">
              <div>OK: {{ job.ok || 0 }}</div>
              <div>KO: {{ job.ko || 0 }}</div>
            </div>
          </div>

          <ProgressBar class="mt-3" :value="progressPct" :show-value="true" />
        </div>

        <!-- Formulaire -->
        <div class="space-y-3">
          <InputText
            v-model="emailSubject"
            :placeholder="t('admin.email_blast.subject_label')"
            class="w-full"
            :disabled="isJobActive"
          />

          <Editor
            v-model="emailHtml"
            editor-style="height: 260px"
            :modules="modules"
            :formats="formats"
            class="w-full"
            :disabled="isJobActive"
          />

          <Select
            v-model="sendMode"
            :options="modeOptions"
            option-label="label"
            option-value="value"
            class="w-full"
            :disabled="isJobActive"
          />

          <MultiSelect
            v-if="sendMode === 'MANUAL'"
            v-model="selectedRecipients"
            :options="manualOptions"
            option-label="name"
            option-value="email"
            filter
            class="w-full"
            :placeholder="t('admin.email_blast.manual_placeholder')"
            :disabled="isJobActive"
          >
            <template #option="{ option }">
              <div class="flex items-center justify-between w-full gap-3">
                <div class="min-w-0">
                  <div class="font-medium truncate">{{ option.name }}</div>
                  <div class="text-xs opacity-70 truncate">
                    {{ option.email }}
                  </div>
                </div>

                <span
                  class="text-xs px-2 py-1 rounded-full border whitespace-nowrap"
                  :class="
                    option.attending
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : 'bg-rose-50 text-rose-700 border-rose-200'
                  "
                >
                  {{ option.attending ? t("common.yes") : t("common.no") }}
                </span>
              </div>
            </template>
          </MultiSelect>

          <p class="text-xs opacity-70">
            <span v-if="sendMode === 'ONLY_ATTENDING'">
              {{
                t("admin.email_blast.recipients_count_yes").replace(
                  "{count}",
                  String(sendCount),
                )
              }}
            </span>

            <span v-else-if="sendMode === 'ALL_RESPONDED'">
              {{
                t("admin.email_blast.recipients_count_all")
                  .replace("{all}", String(countAll))
                  .replace("{yes}", String(countYes))
                  .replace("{no}", String(countNo))
              }}
            </span>

            <span v-else>
              {{
                t("admin.email_blast.recipients_count_manual").replace(
                  "{count}",
                  String(sendCount),
                )
              }}
            </span>
          </p>

          <div class="flex gap-2 justify-end my-4 flex-col md:flex-row">
            <Button
              size="small"
              :loading="emailBusy"
              :disabled="isJobActive"
              icon="pi pi-send"
              :label="t('admin.email_blast.send_all')"
              @click="confirmSend"
              class="btn-accent"
            />
            <Button
              size="small"
              :loading="emailBusy"
              icon="pi pi-send"
              :label="t('admin.email_blast.send_test')"
              severity="secondary"
              @click="openTestDialog"
            />
          </div>

          <p v-if="emailStatus" class="text-sm mt-1">
            {{ emailStatus }}
          </p>

          <p v-if="isJobActive" class="text-xs opacity-70">
            {{
              t(
                "admin.email_blast.refresh_safe",
                "Vous pouvez quitter ou rafraîchir cette page : l’envoi continue côté serveur.",
              )
            }}
          </p>
        </div>
      </div>
    </template>
  </Card>

  <EmailJobsHistory
    ref="historyRef"
    class="mt-6"
    type="custom-email"
    :rows="10"
    :title="t('admin.email_blast.history_title')"
    :empty-text="t('admin.email_blast.history_empty')"
  />

  <!-- EMAIL TEST DIALOG -->
  <Dialog
    v-model:visible="testDialogVisible"
    :modal="true"
    :style="{ width: 'min(420px, 100%)' }"
    :header="t('admin.email_blast.test_dialog_title')"
  >
    <div class="space-y-3">
      <p class="text-sm opacity-70">
        {{ t("admin.email_blast.test_dialog_help") }}
      </p>

      <InputText
        v-model="testEmail"
        type="email"
        class="w-full"
        :placeholder="t('admin.email_blast.test_email_placeholder')"
      />

      <div class="flex justify-end gap-2 mt-4">
        <Button
          size="small"
          type="button"
          icon="pi pi-times"
          :label="t('common.cancel')"
          severity="secondary"
          @click="testDialogVisible = false"
        />
        <Button
          size="small"
          type="button"
          icon="pi pi-send"
          :loading="emailBusy"
          :label="t('admin.blog.confirm_yes')"
          @click="onConfirmTestDialog"
        />
      </div>
    </div>
  </Dialog>
</template>

<script setup>
import Card from "primevue/card";
import ProgressBar from "primevue/progressbar";
import Editor from "primevue/editor";
import Button from "primevue/button";
import InputText from "primevue/inputtext";
import Dialog from "primevue/dialog";
import Select from "primevue/select";
import MultiSelect from "primevue/multiselect";
import EmailJobsHistory from "@/components/admin/EmailJobsHistory.vue";

import { ref, computed, onMounted, onBeforeUnmount } from "vue";
import { useLang } from "@/composables/useLang";
import { useEmailStore } from "@/stores/emailStore";
import { useGuestDirectoryStore } from "@/stores/guestDirectoryStore";
import { useMeStore } from "@/stores/meStore";

import { useToast } from "primevue/usetoast";
import { useConfirm } from "primevue/useconfirm";

import { showApiError } from "@/utils/showApiError";

const { t } = useLang();
const toast = useToast();
const confirm = useConfirm();

const emailStore = useEmailStore();
const guestDir = useGuestDirectoryStore();
const me = useMeStore();

/* ----------------
   SEND FORM
---------------- */
const emailSubject = ref("");
const emailHtml = ref("");
const emailStatus = ref("");
const emailBusy = ref(false);
const sendMode = ref("ONLY_ATTENDING");
const selectedRecipients = ref([]);
const testDialogVisible = ref(false);
const testEmail = ref("");

const canSendEmail = computed(() => me.canSendEmail);
const showSkeleton = computed(
  () => guestDir.loading && !(guestDir.items || []).length,
);

const modules = computed(() => ({
  toolbar: [
    ["bold", "italic", "underline", "strike"],
    [{ list: "ordered" }, { list: "bullet" }],
    [{ align: [] }],
    ["link"],
  ],
}));

const formats = [
  "bold",
  "italic",
  "underline",
  "strike",
  "list",
  "align",
  "link",
];

const modeOptions = computed(() => [
  {
    label: t("admin.email_blast.mode_only_attending"),
    value: "ONLY_ATTENDING",
  },
  { label: t("admin.email_blast.mode_manual"), value: "MANUAL" },
  { label: t("admin.email_blast.mode_all_responded"), value: "ALL_RESPONDED" },
]);

function safeEmail(v) {
  const s = String(v || "")
    .trim()
    .toLowerCase();
  if (!s) return "";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)) return "";
  if (s.endsWith("@example.com")) return "";
  return s;
}

function buildName(x) {
  return (
    String(x?.fullName || "").trim() ||
    `${String(x?.firstName || "").trim()} ${String(x?.lastName || "").trim()}`.trim() ||
    "Invitado"
  );
}

// base items from guest directory
const dirItems = computed(() =>
  Array.isArray(guestDir.items) ? guestDir.items : [],
);

// de-dup par email (comme backend resolveRecipients)
const dedupByEmail = computed(() => {
  const byEmail = new Map();

  for (const x of dirItems.value) {
    const email = safeEmail(x?.email);
    if (!email) continue;

    const arr = byEmail.get(email) || [];
    arr.push(x);
    byEmail.set(email, arr);
  }

  const pickBest = (arr) => {
    // score: attending true > attending false > null
    // + bonus si role principal
    const score = (g) => {
      const a = g?.attending;
      const attendingScore = a === true ? 200 : a === false ? 100 : 0;

      const role = String(g?.role || "").toUpperCase();
      const isPrimary =
        role === "PRIMARY" ||
        role === "MAIN" ||
        role === "PRINCIPAL" ||
        role === "GUEST_MAIN";

      const primaryBonus = isPrimary ? 10 : 0;
      return attendingScore + primaryBonus;
    };

    return [...arr].sort((a, b) => score(b) - score(a))[0];
  };

  const emailAttending = (arr) => {
    if (arr.some((g) => g?.attending === true)) return true;
    if (arr.some((g) => g?.attending === false)) return false;
    return null;
  };

  const out = [];
  for (const [email, arr] of byEmail.entries()) {
    const best = pickBest(arr);
    const attendingAgg = emailAttending(arr);

    out.push({
      email,
      name: buildName(best),
      attending: attendingAgg === true, // pour le badge UI
      responded: attendingAgg !== null, // true si true OU false
      // optionnel, utile pour debug/tooltip:
      _guests: arr.map((g) => ({
        guestId: g.guestId,
        name: buildName(g),
        attending: g.attending,
        role: g.role,
        rsvpId: g.rsvpId,
      })),
    });
  }

  // tri stable (facultatif)
  out.sort((a, b) => a.name.localeCompare(b.name));

  return out;
});

const manualOptions = computed(() => dedupByEmail.value);

// Counts alignés avec les modes backend:
// - ONLY_ATTENDING => attending == "si"
// - ALL_RESPONDED => attending in ["si","no"]
const countAll = computed(
  () => dedupByEmail.value.filter((x) => x.responded).length,
);
const countYes = computed(
  () => dedupByEmail.value.filter((x) => x.attending).length,
);
const countNo = computed(() => Math.max(0, countAll.value - countYes.value));

const sendCount = computed(() => {
  if (sendMode.value === "MANUAL") return selectedRecipients.value.length;
  if (sendMode.value === "ONLY_ATTENDING") return countYes.value;
  if (sendMode.value === "ALL_RESPONDED") return countAll.value;
  return 0;
});

const job = computed(() => emailStore.job);
const isJobActive = computed(() => emailStore.isJobActive);
const progressPct = computed(() => emailStore.progressPct);

/* ----------------
   HISTORY (mailbox)
---------------- */
const historyRef = ref(null);

/* ----------------
   HELPERS
---------------- */
function toastError(detail, summary = t("errors.title", "Error")) {
  toast.add({ severity: "error", summary, detail, life: 5500 });
}

/* ----------------
   SEND actions
---------------- */
function validateEmailForm({ forTest = false } = {}) {
  if (!emailSubject.value.trim()) {
    toastError(t("admin.email_blast.err_subject_required"));
    return false;
  }
  const html = (emailHtml.value || "").trim();
  if (!html || html === "<p><br></p>") {
    toastError(t("admin.email_blast.err_message_empty"));
    return false;
  }
  if (
    !forTest &&
    sendMode.value === "MANUAL" &&
    !selectedRecipients.value.length
  ) {
    toastError(t("admin.email_blast.err_manual_empty"));
    return false;
  }
  return true;
}

function openTestDialog() {
  if (!validateEmailForm({ forTest: true })) return;
  testDialogVisible.value = true;
}

function onConfirmTestDialog() {
  const email = (testEmail.value || "").trim();
  if (!email) {
    toastError(t("admin.email_blast.err_test_email_required"));
    return;
  }
  sendTest();
}

function confirmSend() {
  if (isJobActive.value) return;
  if (!validateEmailForm()) return;

  confirm.require({
    header: t("common.confirm"),
    message: t("admin.email_blast.confirm_send_all"),
    icon: "pi pi-exclamation-triangle",
    rejectLabel: t("common.cancel"),
    acceptLabel: t("admin.blog.confirm_yes"),
    rejectClass: "p-button-secondary",
    acceptIcon: "pi pi-send",
    rejectIcon: "pi pi-times",
    accept: () => sendToAllCore(),
  });
}

async function sendToAllCore() {
  emailBusy.value = true;
  emailStatus.value = t("admin.email_blast.status_sending");

  try {
    const out = await emailStore.sendEmailBlast({
      subject: emailSubject.value.trim(),
      html: emailHtml.value,
      mode: sendMode.value,
      recipients:
        sendMode.value === "MANUAL" ? selectedRecipients.value : undefined,
      expectedTotal: sendCount.value,
    });

    if (out?.locked) {
      const untilLabel = out.lockedUntil
        ? new Date(out.lockedUntil).toLocaleTimeString()
        : "—";
      emailStatus.value = `Envoi verrouillé jusqu'à ${untilLabel}.`;
      toast.add({
        severity: "warn",
        summary: t("common.warning", "Warning"),
        detail: emailStatus.value,
        life: 5000,
      });
      return;
    }

    emailStatus.value = t("admin.email_blast.status_queued");
  } catch (err) {
    showApiError(t, toast, err);
    emailStatus.value = "";
  } finally {
    setTimeout(() => (emailStatus.value = ""), 5000);
    emailBusy.value = false;
  }
}

async function sendTest() {
  emailBusy.value = true;
  emailStatus.value = t("admin.email_blast.status_sending");
  try {
    const email = (testEmail.value || "").trim();

    const data = await emailStore.sendTestEmail({
      subject: emailSubject.value.trim(),
      html: emailHtml.value,
      testEmail: email,
    });

    const backendMessage = String(data?.message || "").trim();
    emailStatus.value =
      backendMessage === "test_sent"
        ? t("admin.email_blast.test_sent_ok").replace("{email}", email)
        : backendMessage || t("admin.email_blast.status_sent");
    testDialogVisible.value = false;
    toast.add({
      severity: "success",
      summary: t("common.success"),
      detail: t("admin.email_blast.test_sent_ok").replace("{email}", email),
      life: 4500,
    });
  } catch (err) {
    showApiError(t, toast, err);
    emailStatus.value = "";
  } finally {
    setTimeout(() => (emailStatus.value = ""), 5000);
    emailBusy.value = false;
  }
}

/* ----------------
   LIFECYCLE
---------------- */
onMounted(async () => {
  // emailMeta is Firestore-read guarded by `emails:read`
  if (me.canReadEmail) await emailStore.subscribeMeta();

  // ✅ seulement si on peut envoyer (sinon pas besoin des destinataires)
  if (canSendEmail.value) {
    await guestDir.load({ scope: "WITH_EMAIL" });
  }

  // polling utile pour suivre un job, même en read-only
  emailStore.resumePollingIfNeeded({
    onDone: async () => {
      await historyRef.value?.refresh?.();
    },
  });
});

onBeforeUnmount(() => {
  emailStore.stopPolling();
});
</script>

<style scoped>
:deep(.p-editor-container) {
  border-radius: 0.75rem;
  border-color: var(--accent-color);
}
:deep(.p-editor-toolbar) {
  border-top-left-radius: 0.75rem;
  border-top-right-radius: 0.75rem;
}
:deep(.p-editor-content) {
  min-height: 220px;
  font-size: 0.9rem;
}
:deep(.p-editor-toolbar) {
  display: none !important;
}
</style>
