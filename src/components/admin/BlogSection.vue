<!-- src/components/admin/BlogSection.vue -->
<template>
  <div class="space-y-6">
    <Card :style="{ border: '1px solid var(--accent-color)' }">
      <template #title>
        <div class="flex items-center text-left gap-2 min-w-0">
          <p class="admin-bento-title truncate">
            <i class="pi pi-image text-sm" aria-hidden="true" />
            {{ t("admin.blog.title1") }}
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

      <template #content>
        <Message
          v-if="showHelp"
          severity="info"
          :closable="true"
          class="mt-3"
          @close="closeHelp"
        >
          <div class="text-xs text-left">
            {{ t("admin.blog.helper") }}
          </div>
        </Message>

        <!-- Header -->
        <div class="flex items-center justify-end my-4">
          <Button
            v-if="canWrite"
            icon="pi pi-plus"
            :label="t('admin.blog.new')"
            class="ml-auto btn-accent"
            size="small"
            @click="openCreateDialog"
          />
        </div>

        <div
          v-if="blogJob"
          class="mb-4 p-3 rounded-xl border"
          :class="blogJobCardClass"
        >
          <div class="flex items-center justify-between gap-4">
            <div class="min-w-0">
              <p class="text-sm font-semibold truncate">
                {{ blogJobStatusLabel }}
              </p>
              <p class="text-xs opacity-70 mt-1">
                {{
                  t("admin.email_blast.job_progress")
                    .replace(
                      "{done}",
                      String((blogJob.ok || 0) + (blogJob.ko || 0)),
                    )
                    .replace("{total}", String(blogJob.total || 0))
                }}
                <span v-if="blogJob.lastError"> · {{ blogJob.lastError }}</span>
              </p>
            </div>

            <div class="text-right text-xs opacity-70 whitespace-nowrap">
              <div>OK: {{ blogJob.ok || 0 }}</div>
              <div>KO: {{ blogJob.ko || 0 }}</div>
            </div>
          </div>

          <ProgressBar
            class="mt-3"
            :value="blogProgressPct"
            :show-value="true"
          />
        </div>

        <!-- Loader -->
        <div
          v-if="loadingPosts"
          class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 py-2"
        >
          <div
            v-for="n in 6"
            :key="n"
            class="flex flex-col gap-2 justify-between rounded-xl border border-[var(--accent-color)] bg-white p-3"
          >
            <div class="flex flex-col gap-2">
              <Skeleton width="100%" height="10rem" class="rounded-lg" />
              <div class="space-y-2">
                <Skeleton width="100%" height="0.9rem" />
                <Skeleton width="92%" height="0.9rem" />
                <Skeleton width="70%" height="0.9rem" />
              </div>
              <div class="mt-1 flex items-center justify-between">
                <Skeleton width="3.25rem" height="0.9rem" />
                <Skeleton width="7rem" height="0.9rem" />
              </div>
            </div>
            <div class="mt-2 flex justify-end gap-2">
              <Skeleton width="5rem" height="2rem" border-radius="999px" />
              <Skeleton width="5rem" height="2rem" border-radius="999px" />
            </div>
          </div>
        </div>

        <!-- Grid des posts -->
        <div
          v-else
          class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
        >
          <!-- Carte + -->
          <button
            v-if="canWrite"
            type="button"
            class="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-[var(--accent-color)] bg-[#fdf5f5] p-4 text-center hover:bg-[#fbeaea] transition"
            @click="openCreateDialog"
          >
            <span
              class="flex h-12 w-12 items-center justify-center rounded-full border border-[var(--accent-color)]"
            >
              <i class="pi pi-plus text-xl"></i>
            </span>
            <span class="text-sm font-medium">
              {{ t("admin.blog.new_short") }}
            </span>
            <span class="text-xs opacity-60">
              {{
                t(
                  "admin.blog.new_hint",
                  "Pulsa para crear una nueva publicación en el blog",
                )
              }}
            </span>
          </button>

          <!-- Posts existants -->
          <article
            v-for="p in posts"
            :key="p.id"
            class="flex flex-col gap-2 justify-between rounded-xl border border-[var(--accent-color)] bg-white p-3"
          >
            <div class="flex flex-col gap-2">
              <img
                v-if="p.image"
                :src="p.image"
                alt=""
                class="aspect-[4/3] w-full rounded-lg object-cover"
              />

              <p class="whitespace-pre-wrap text-sm text-left">
                {{ getPostPreview(p) }}
              </p>

              <div
                class="mt-1 flex items-center justify-between text-xs opacity-70"
              >
                <span>👍 {{ p.likes || 0 }}</span>

                <span v-if="p.createdAt">
                  {{ formatDateTime(p.createdAt) }}
                </span>
              </div>
            </div>

            <div class="mt-2 flex justify-end gap-2">
              <Button
                icon="pi pi-pencil"
                size="small"
                text
                :label="t('common.edit')"
                @click="openEditDialog(p)"
              />
              <Button
                icon="pi pi-trash"
                size="small"
                text
                severity="danger"
                :label="t('common.delete')"
                @click="confirmDelete(p)"
              />
            </div>
          </article>
        </div>

        <!-- CREATE / EDIT BLOG DIALOG -->
        <Dialog
          v-model:visible="dialogVisible"
          :modal="true"
          :style="{ width: 'min(540px, 100%)' }"
          :header="
            editingId ? t('admin.blog.edit_title') : t('admin.blog.new_title')
          "
        >
          <form class="space-y-3" @submit.prevent="handleSubmit">
            <!-- Upload image -->
            <FileUpload
              name="image"
              accept="image/*"
              :multiple="false"
              :max-file-size="2_000_000"
              :auto="false"
              :show-upload-button="false"
              :show-cancel-button="false"
              :preview-width="120"
              :choose-label="t('admin.blog.upload_image')"
              @select="onDialogPickImage"
              @remove="onDialogRemoveImage"
              @clear="onDialogClearImage"
              :style="{
                backgroundColor: 'var(--accent-color)',
                borderColor: 'var(--accent-color)',
              }"
            >
              <template #empty>
                <ContentViewer
                  class="text-center text-sm opacity-70"
                  :empty-text="t('admin.blog.drop_hint')"
                />
              </template>
            </FileUpload>

            <!-- Preview image actuelle -->
            <div v-if="formImagePreview" class="mt-2">
              <p class="mb-1 text-xs opacity-70">
                {{ t("admin.blog.preview") }}
              </p>
              <img
                :src="formImagePreview"
                alt="preview"
                class="max-h-64 w-full rounded-lg object-cover"
              />
            </div>

            <!-- Texte ES -->
            <div class="space-y-1">
              <p class="text-xs font-semibold">
                {{ t("admin.blog.text_es") }}
              </p>
              <Textarea
                v-model="formTextEs"
                rows="3"
                auto-resize
                :placeholder="t('admin.blog.image_text_es')"
              />
              <span class="flex justify-end text-xs opacity-60">
                {{ remainingCharsEs }}
              </span>
            </div>

            <!-- Texte EN -->
            <div class="space-y-1">
              <p class="text-xs font-semibold">
                {{ t("admin.blog.text_en") }}
              </p>
              <Textarea
                v-model="formTextEn"
                rows="3"
                auto-resize
                :placeholder="t('admin.blog.image_text_en')"
              />
              <span class="flex justify-end text-xs opacity-60">
                {{ remainingCharsEn }}
              </span>
            </div>

            <p v-if="dialogError" class="text-sm text-red-500">
              {{ dialogError }}
            </p>

            <div
              class="mt-4 flex items-center justify-end gap-2 flex-col-reverse sm:flex-row"
            >
              <Button
                size="small"
                type="button"
                icon="pi pi-times"
                :label="t('common.cancel')"
                severity="secondary"
                @click="closeDialog"
              />

              <Button
                size="small"
                type="submit"
                icon="pi pi-save"
                :loading="blogBusy"
                :label="
                  editingId ? t('admin.blog.update') : t('admin.blog.submit')
                "
                class="btn-accent"
              />
            </div>
          </form>
        </Dialog>
      </template>
    </Card>

    <EmailJobsHistory
      v-if="canReadEmailHistory"
      ref="historyRef"
      type="blog-notification"
      :rows="10"
      :title="t('admin.blog.history_title')"
      :empty-text="t('admin.blog.history_empty')"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from "vue";
// realtime handled by blogStore
import { api } from "@/services/api";

import Card from "primevue/card";
import FileUpload from "primevue/fileupload";
import Textarea from "primevue/textarea";
import Button from "primevue/button";
import Dialog from "primevue/dialog";
import Message from "primevue/message";
import { useToast } from "primevue/usetoast";
import { useConfirm } from "primevue/useconfirm";
import ProgressBar from "primevue/progressbar";

import { useLang } from "@/composables/useLang";
import { useBlogStore } from "@/stores/blogStore.ts";
import weddingConfig from "../../../shared/weddingConfig.ts";
import { showApiError } from "@/utils/showApiError";
import { useMeStore } from "@/stores/meStore";
import EmailJobsHistory from "@/components/admin/EmailJobsHistory.vue";
import ContentViewer from "@/components/utils/ContentViewer.vue";

const blogStore = useBlogStore();
const { t, lang } = useLang();
const emit = defineEmits(["blog-sent"]);
const me = useMeStore();
const historyRef = ref(null);

const toast = useToast();
const confirm = useConfirm();

const canWrite = computed(() => me.canWrite("blog"));
const canReadEmailHistory = computed(() => me.canReadEmail);

const BLOG_HELP_STORAGE_KEY = "help:blog:section";

function getInitialHelpVisibility() {
  if (typeof window === "undefined") return true;
  try {
    return window.localStorage.getItem(BLOG_HELP_STORAGE_KEY) !== "hidden";
  } catch {
    return true;
  }
}

const showHelp = ref(getInitialHelpVisibility());

function closeHelp() {
  showHelp.value = false;
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(BLOG_HELP_STORAGE_KEY, "hidden");
  } catch {
    // ignore localStorage failures
  }
}

function openHelp() {
  showHelp.value = true;
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(BLOG_HELP_STORAGE_KEY);
  } catch {
    // ignore localStorage failures
  }
}

/* ---------------- Posts (Firestore realtime) ---------------- */

const posts = computed(() => blogStore.posts || []);
const loadingPosts = computed(() => blogStore.loading);

/* ---------------- Blog email job polling ---------------- */

const blogJobId = ref(localStorage.getItem("blogJobId") || "");
const blogJob = ref(null);
let blogPollTimer = null;

function startBlogPolling(id) {
  stopBlogPolling();
  blogPollTimer = setInterval(async () => {
    try {
      const out = await api.getBlogNotificationJob(id);
      const job = out?.job || null;
      blogJob.value = job;

      if (
        job?.status === "done" ||
        job?.status === "error" ||
        job?.status === "skipped"
      ) {
        localStorage.removeItem("blogJobId");
        blogJobId.value = "";
        stopBlogPolling();
        await historyRef.value?.refresh?.();
      }
    } catch (e) {
      // ⬇️ uniforme
      showApiError(t, toast, e, { life: 7000 });
      stopBlogPolling();
      blogJob.value = { ...(blogJob.value || { id }), status: "error" };
      localStorage.removeItem("blogJobId");
      blogJobId.value = "";
    }
  }, 2000);
}

function stopBlogPolling() {
  if (blogPollTimer) clearInterval(blogPollTimer);
  blogPollTimer = null;
}

const blogProgressPct = computed(() => {
  const j = blogJob.value;
  if (!j || !j.total) return 0;
  const done = Number(j.ok || 0) + Number(j.ko || 0);
  return Math.min(100, Math.round((done / Number(j.total || 1)) * 100));
});

function isNoRecipientsJob(job) {
  return (
    String(job?.status || "") === "done" &&
    Number(job?.total || 0) === 0 &&
    Number(job?.ok || 0) === 0 &&
    Number(job?.ko || 0) === 0
  );
}

function blogEffectiveStatus(job) {
  if (isNoRecipientsJob(job)) return "no_recipients";
  const s = String(job?.status || "")
    .trim()
    .toLowerCase();
  return s || "unknown";
}

const blogJobStatusLabel = computed(() => {
  const status = blogEffectiveStatus(blogJob.value);
  if (status === "queued") return t("admin.email_blast.job_queued");
  if (status === "running") return t("admin.email_blast.job_running");
  if (status === "done") return t("admin.email_blast.job_done");
  if (status === "error") return t("admin.email_blast.job_error");
  if (status === "skipped") return t("admin.email_blast.job_skipped");
  if (status === "no_recipients")
    return t("admin.email_blast.job_no_recipients");
  return blogJob.value?.status || "—";
});

const blogJobCardClass = computed(() => {
  const status = blogEffectiveStatus(blogJob.value);
  if (status === "error") return "border-rose-200 bg-rose-50";
  if (status === "skipped" || status === "no_recipients")
    return "border-amber-200 bg-amber-50";
  return "border-emerald-200 bg-emerald-50";
});

/* ---------------- Dialog state ---------------- */

const dialogVisible = ref(false);
const editingId = ref(null);

const formTextEs = ref("");
const formTextEn = ref("");

const formImageFile = ref(null);
const formImagePreview = ref("");

const dialogError = ref("");
const blogBusy = ref(false);

async function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

const remainingCharsEs = computed(() => 350 - (formTextEs.value?.length || 0));
const remainingCharsEn = computed(() => 350 - (formTextEn.value?.length || 0));

/* ---------------- Lifecycle ---------------- */

onMounted(async () => {
  if (blogJobId.value) startBlogPolling(blogJobId.value);
});

onBeforeUnmount(() => {
  stopBlogPolling();
});

/* ---------------- UI helpers ---------------- */

function openCreateDialog() {
  editingId.value = null;
  formTextEs.value = "";
  formTextEn.value = "";
  formImageFile.value = null;
  formImagePreview.value = "";
  dialogError.value = "";
  dialogVisible.value = true;
}

function openEditDialog(post) {
  editingId.value = post.id;
  formTextEs.value = post.texts?.es || "";
  formTextEn.value = post.texts?.en || "";
  formImageFile.value = null;
  formImagePreview.value = post.image || "";
  dialogError.value = "";
  dialogVisible.value = true;
}

function closeDialog() {
  if (blogBusy.value) return;
  dialogVisible.value = false;
  dialogError.value = "";
}

function onDialogPickImage(evt) {
  const file =
    evt?.files?.[0] ||
    evt?.currentFiles?.[0] ||
    evt?.target?.files?.[0] ||
    null;

  formImageFile.value = file;

  if (!file) return;

  fileToDataUrl(file)
    .then((dataUrl) => {
      formImagePreview.value = dataUrl;
    })
    .catch((e) => {
      dialogError.value = t("admin.blog.err_image");
      showApiError(t, toast, e, { life: 7000 });
    });
}

function onDialogRemoveImage() {
  formImageFile.value = null;
  formImagePreview.value = "";
}

function onDialogClearImage() {
  formImageFile.value = null;
  formImagePreview.value = "";
}

function formatDateTime(ms) {
  if (!ms) return "";
  try {
    return new Date(ms).toLocaleString("es-ES", {
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

/* ---------------- Submit create / edit (backend) ---------------- */

function handleSubmit() {
  dialogError.value = "";

  if (!formTextEs.value.trim() && !formTextEn.value.trim()) {
    dialogError.value = t("admin.blog.err_text");
    return;
  }

  if (!formImagePreview.value) {
    dialogError.value = t("admin.blog.err_image");
    return;
  }

  if (!editingId.value) {
    confirm.require({
      header: t("common.confirm"),
      message: t("admin.blog.confirm_send"),
      icon: "pi pi-exclamation-triangle",
      rejectLabel: t("common.cancel"),
      acceptLabel: t("admin.blog.confirm_yes"),
      rejectClass: "p-button-secondary",
      acceptIcon: "pi pi-send",
      rejectIcon: "pi pi-times",
      accept: () => savePostCore(true),
    });
  } else {
    savePostCore(false);
  }
}

async function savePostCore(sendNotification) {
  blogBusy.value = true;
  dialogError.value = "";

  try {
    const es = (formTextEs.value || "").trim();
    const en = (formTextEn.value || "").trim();

    // 1) imageUrl
    let imageUrl = formImagePreview.value || "";
    const pickedNewFile = !!formImageFile.value;

    if (pickedNewFile) {
      const up = await api.adminUploadBlogImage(formImageFile.value);
      imageUrl = up?.imageUrl || "";
    }

    const payload = { imageUrl, texts: { es, en } };

    // 2) create/update
    if (editingId.value) {
      await api.adminUpdateBlogPost(editingId.value, payload);

      toast.add({
        severity: "success",
        summary: t("admin.toast.blog_update_ok"),
        life: 4000,
      });
    } else {
      // ✅ le backend déclenche (ou non) la notif et renvoie jobId
      const created = await api.adminCreateBlogPost({
        ...payload,
        sendNotification: !!sendNotification,
      });

      const postId = created?.id || created?.postId || null;
      const jobId = created?.jobId || null;

      // ✅ polling uniquement si jobId existe
      if (jobId) {
        toast.add({
          severity: "info",
          summary: t("admin.toast.blog_queued"),
          life: 4500,
        });

        blogJobId.value = jobId;
        localStorage.setItem("blogJobId", jobId);

        blogJob.value = {
          id: jobId,
          status: "queued",
          total: Number(created?.total || 0) || 0,
          ok: 0,
          ko: 0,
        };

        startBlogPolling(jobId);
        if (postId) blogStore.markBlogPostSent?.(postId);
        emit("blog-sent");
      } else {
        toast.add({
          severity: "success",
          summary: t("admin.toast.blog_created"),
          life: 4000,
        });
      }
    }

    dialogVisible.value = false;
    formTextEs.value = "";
    formTextEn.value = "";
    formImageFile.value = null;
    formImagePreview.value = "";
  } catch (e) {
    console.error("Blog save error:", e);
    showApiError(t, toast, e, { life: 7000 });
    dialogError.value = t("common.error_generic", "Error. Intenta de nuevo.");
  } finally {
    blogBusy.value = false;
  }
}

/* ---------------- Delete (backend) ---------------- */

function confirmDelete(post) {
  confirm.require({
    header: t("common.confirm"),
    message: t("admin.blog.confirm_delete"),
    icon: "pi pi-exclamation-triangle",
    rejectLabel: t("common.cancel"),
    acceptLabel: t("common.delete"),
    acceptClass: "p-button-danger",
    rejectClass: "p-button-secondary",
    acceptIcon: "pi pi-trash",
    rejectIcon: "pi pi-times",
    accept: () => deletePost(post.id),
  });
}

async function deletePost(postId) {
  try {
    await api.adminDeleteBlogPost(postId);
    toast.add({
      severity: "success",
      summary: t("admin.toast.blog_delete_ok"),
      life: 4000,
    });
  } catch (e) {
    console.error("Blog delete error:", e);
    // ✅ uniforme
    showApiError(t, toast, e, { life: 7000 });
  }
}

/* ---------------- Preview text ---------------- */

const currentLangKey = computed(() => {
  const all = weddingConfig.i18n?.languages || {};
  const defaultKey =
    weddingConfig.i18n?.defaultLang || Object.keys(all)[0] || "es";
  const code = lang.value;
  if (code && all[code]) return code;
  return defaultKey;
});

function getPostPreview(p) {
  const texts = p.texts || {};
  const fromCurrent = texts[currentLangKey.value];
  if (fromCurrent && fromCurrent.trim()) return fromCurrent;

  const all = weddingConfig.i18n?.languages || {};
  const defaultKey = weddingConfig.i18n?.defaultLang || Object.keys(all)[0];
  if (defaultKey && texts[defaultKey] && texts[defaultKey].trim())
    return texts[defaultKey];

  const any = Object.values(texts).find((s) => s && s.trim());
  return any || "";
}
</script>
