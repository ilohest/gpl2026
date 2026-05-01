<template>
  <div class="w-full space-y-4">
    <Card class="w-full" :style="{ border: '1px solid var(--accent-color)' }">
      <template #title>
        <div class="flex items-center gap-2">
          <p class="admin-bento-title">
            <i class="pi pi-sparkles text-sm" aria-hidden="true" />
            {{ t("admin.planner.title") }}
          </p>
          <Button
            v-if="!showHelper"
            text
            rounded
            size="small"
            icon="pi pi-info-circle"
            severity="secondary"
            class="p-0"
            aria-label="Help"
            @click="openHelper"
          />
        </div>
      </template>

      <template #content>
        <Message
          v-if="showHelper"
          severity="info"
          closable
          @close="closeHelper"
          class="mb-3"
        >
          <div class="text-xs text-left">
            {{ t("admin.planner.helper") }}
          </div>
        </Message>

        <div v-if="canWritePlanner" class="space-y-3">
          <label class="opacity-70 uppercase text-sm block">
            {{ t("admin.planner.input_label") }}
          </label>
          <Textarea
            v-model="prompt"
            :class="[
              'w-full planner-prompt',
              { 'planner-prompt-loading': loadingPlan },
            ]"
            rows="4"
            auto-resize
            :placeholder="t('admin.planner.placeholder')"
            :disabled="!canWritePlanner"
          />

          <div class="flex flex-wrap items-center gap-2">
            <Button
              :label="t('admin.planner.generate')"
              icon="pi pi-bolt"
              :class="[
                'planner-generate-button',
                { 'planner-generate-button-loading': loadingPlan },
              ]"
              :loading="loadingPlan"
              :disabled="!canWritePlanner"
              @click="generatePlan"
            />
            <Button
              text
              severity="secondary"
              :label="t('admin.planner.clear')"
              icon="pi pi-times"
              :disabled="!prompt && !plan"
              @click="clearPlan"
            />
          </div>
        </div>

        <div v-if="plan && canWritePlanner" class="mt-5 space-y-4">
          <Divider class="my-2" />

          <div class="text-xs opacity-80">
            {{ t("admin.planner.edit_suggestions_hint") }}
          </div>

          <div class="space-y-3">
            <div
              v-for="(task, idx) in plan.tasks"
              :key="`${task.title}-${idx}`"
              class="rounded-xl border border-[var(--accent-color)] p-3"
            >
              <div class="flex items-center justify-between gap-2 mb-2">
                <p class="font-semibold">{{ idx + 1 }}</p>
                <Tag
                  :value="priorityLabel(task.priority)"
                  :severity="prioritySeverity(task.priority)"
                />
              </div>

              <input
                v-model="task.title"
                type="text"
                class="w-full border rounded-md px-2 py-2 text-sm mb-2"
                :placeholder="t('admin.planner.task_title_placeholder')"
              />

              <div class="grid grid-cols-1 md:grid-cols-2 gap-2 mb-2">
                <DatePicker
                  :model-value="toLocalDateTime(task.dueDate, task.dueTime)"
                  date-format="dd/mm/yy"
                  show-time
                  hour-format="24"
                  show-icon
                  class="w-full"
                  input-class="w-full"
                  @update:model-value="(d) => applyLocalDateTime(task, d)"
                />
                <select
                  v-model="task.priority"
                  class="w-full border rounded-md px-2 py-2 text-sm"
                >
                  <option
                    v-for="opt in priorityOptions"
                    :key="opt.value"
                    :value="opt.value"
                  >
                    {{ opt.label }}
                  </option>
                </select>
              </div>

              <input
                v-model="task.location"
                type="text"
                class="w-full border rounded-md px-2 py-2 text-sm mb-2"
                :placeholder="t('admin.planner.task_location_placeholder')"
              />

              <Textarea
                v-model="task.notes"
                class="w-full"
                rows="2"
                auto-resize
                :placeholder="t('admin.planner.task_note_placeholder')"
              />

              <div class="flex justify-end mt-2">
                <Button
                  size="small"
                  text
                  severity="danger"
                  icon="pi pi-times"
                  :label="t('admin.planner.reject_one')"
                  @click="removeSuggestedTask(idx)"
                />
              </div>
            </div>
          </div>

          <div class="flex flex-wrap gap-2">
            <Button
              v-if="canWritePlanner"
              text
              severity="secondary"
              :label="t('admin.planner.reject_all')"
              icon="pi pi-trash"
              :disabled="!plan.tasks?.length"
              @click="clearSuggestedTasks"
            />
            <Button
              v-if="canWritePlanner"
              :label="t('admin.planner.save_tasks')"
              icon="pi pi-save"
              class="planner-save-button"
              :loading="savingPlanTasks"
              :disabled="!plan.tasks?.length"
              @click="saveGeneratedTasks"
            />
          </div>
        </div>

        <div v-else-if="loadingPlan && canWritePlanner" class="mt-5 space-y-4">
          <Divider class="my-2" />
          <div class="space-y-3">
            <div class="rounded-xl border border-[var(--accent-color)] p-3">
              <div class="flex items-center justify-between gap-2 mb-3">
                <Skeleton width="2rem" height="1rem" />
                <Skeleton
                  width="4.5rem"
                  height="1.25rem"
                  border-radius="999px"
                />
              </div>

              <Skeleton width="100%" height="2.2rem" class="mb-2" />

              <div class="grid grid-cols-1 md:grid-cols-3 gap-2 mb-2">
                <Skeleton width="100%" height="2.2rem" />
                <Skeleton width="100%" height="2.2rem" />
                <Skeleton width="100%" height="2.2rem" />
              </div>

              <Skeleton width="100%" height="2.2rem" class="mb-2" />
              <Skeleton width="100%" height="3.2rem" />
            </div>
          </div>
        </div>

        <Divider class="my-4" />

        <Message
          v-if="!canReadPlanner"
          severity="warn"
          :closable="false"
          class="text-sm"
        >
          {{ t("errors.permission.read") }}
        </Message>

        <div v-else class="space-y-3">
          <div class="flex flex-wrap items-center justify-between gap-2 mb-2">
            <SelectButton
              v-model="savedView"
              :options="savedViewOptions"
              option-label="label"
              option-value="value"
            />
          </div>

          <div v-if="savedView === 'calendar'">
            <div class="flex flex-wrap items-center justify-between gap-2">
              <SelectButton
                v-model="calendarMode"
                :options="calendarModeOptions"
                option-label="label"
                option-value="value"
              />
              <div class="flex items-center gap-2">
                <Button
                  severity="secondary"
                  icon="pi pi-angle-left"
                  @click="goPrevPeriod"
                />
                <Button
                  severity="secondary"
                  text
                  :label="t('admin.planner.today')"
                  @click="goToday"
                />
                <Button
                  severity="secondary"
                  text
                  icon="pi pi-angle-right"
                  @click="goNextPeriod"
                />
              </div>
            </div>

            <div class="text-sm mt-1">{{ calendarTitle }}</div>

            <div class="grid grid-cols-7 gap-1 mt-2">
              <div
                v-for="d in weekDayLabels"
                :key="d"
                class="text-xs opacity-70 font-semibold px-1"
              >
                {{ d }}
              </div>
            </div>

            <div class="grid grid-cols-7 gap-1">
              <button
                v-for="day in calendarDays"
                :key="day.key"
                type="button"
                class="min-h-[45px] md:min-h-[130px] bg-[var(--surface-soft)] rounded-lg p-2 text-left"
                :class="{
                  'opacity-60': day.outsideMonth,
                  'ring-2 ring-[var(--accent-color)] border-[var(--accent-color)] bg-[color-mix(in_srgb,var(--accent-color)_12%,white)]':
                    day.isToday,
                  'bg-[color-mix(in_srgb,var(--accent-color)_14%,white)] border-[var(--accent-color)]':
                    selectedCalendarDate === day.iso,
                }"
                @click="selectCalendarDate(day.iso)"
              >
                <div class="flex flex-col items-start justify-between h-full">
                  <span class="text-xs font-semibold">{{ day.label }}</span>
                  <div
                    class="hidden md:block w-full mt-2 space-y-1"
                    @click.stop
                  >
                    <div
                      v-for="task in (tasksByDate[day.iso] || []).slice(0, 3)"
                      :key="`${day.iso}-${task.id}`"
                      class="planner-calendar-task w-full rounded px-1.5 py-1 text-[11px] leading-tight border truncate"
                      :class="task.isDone ? 'opacity-60 line-through' : ''"
                      @click.stop="onCalendarTaskClick(task)"
                    >
                      <span v-if="task.dueTime" class="font-semibold mr-1">
                        {{ task.dueTime }}
                      </span>
                      <span>{{ task.title }}</span>
                    </div>
                    <div
                      v-if="(tasksByDate[day.iso] || []).length > 3"
                      class="text-[11px] opacity-70"
                    >
                      +{{ (tasksByDate[day.iso] || []).length - 3 }}
                    </div>
                  </div>
                  <span
                    v-if="(tasksByDate[day.iso] || []).length"
                    class="w-2 h-2 rounded-full bg-[var(--accent-color)] md:hidden"
                  />
                </div>
              </button>
            </div>

            <div class="mt-3 md:hidden">
              <p class="text-sm uppercase text-left mb-2">
                {{ selectedDayLabel }}
              </p>
              <div v-if="selectedDayTasks.length" class="space-y-2">
                <div
                  v-for="task in selectedDayTasks"
                  :key="task.id"
                  class="w-full text-left rounded-md px-2 py-2 text-sm bg-[var(--surface-soft)] cursor-pointer"
                  :class="task.isDone ? 'opacity-60 line-through' : ''"
                  @click="openTaskDetail(task)"
                >
                  <p class="font-medium">{{ task.title }}</p>
                  <p class="text-xs opacity-75 mt-1">{{ formatWhen(task) }}</p>
                </div>
              </div>
              <ContentViewer
                v-else
                class="my-1"
                :empty-text="t('admin.planner.day_tasks_empty')"
              />
            </div>
          </div>

          <div v-else>
            <div v-if="loadingTasks" class="space-y-2 my-2">
              <div
                v-for="n in 5"
                :key="n"
                class="rounded-xl border border-[var(--accent-color)] p-3 bg-[var(--surface-soft)]"
              >
                <div class="flex items-start justify-between gap-2">
                  <div class="flex items-start gap-2 min-w-0 w-full">
                    <Skeleton width="1.25rem" height="1.25rem" />
                    <div class="min-w-0 w-full">
                      <Skeleton width="85%" height="1rem" class="mb-2" />
                      <Skeleton width="55%" height="0.9rem" />
                    </div>
                  </div>
                  <Skeleton
                    width="4.5rem"
                    height="1.25rem"
                    border-radius="999px"
                  />
                </div>
              </div>
            </div>

            <div v-else>
              <ContentViewer
                v-if="!pendingTasks.length && !doneTasks.length"
                class="my-2"
                :empty-text="t('admin.planner.todo_empty')"
              />

              <div v-if="pendingTasks.length" class="space-y-2">
                <p class="opacity-70 uppercase text-sm">
                  {{ t("admin.planner.todo_pending") }}
                </p>

                <Draggable
                  :list="pendingTasks"
                  item-key="id"
                  handle=".drag-handle"
                  :disabled="!canWritePlanner"
                  ghost-class="drag-ghost"
                  @end="onPendingReorder"
                >
                  <template #item="{ element: task }">
                    <div class="rounded-xl p-3 mb-3 bg-[var(--surface-soft)]">
                      <div class="flex items-start justify-between gap-2">
                        <div class="flex items-start gap-2 min-w-0">
                          <button
                            v-if="canWritePlanner"
                            class="drag-handle mt-1 opacity-60"
                          >
                            <i class="pi pi-bars" />
                          </button>
                          <div class="min-w-0 text-left">
                            <p class="font-semibold break-words text-sm">
                              {{ task.title }}
                            </p>
                            <p class="text-xs opacity-75 mt-1">
                              {{ formatWhen(task) }}
                            </p>
                            <p
                              v-if="task.location"
                              class="text-xs opacity-75 mt-1"
                            >
                              <i class="pi pi-map-marker mr-1" />{{
                                task.location
                              }}
                            </p>
                            <p
                              v-if="task.notes"
                              class="text-sm mt-1 break-words"
                            >
                              {{ task.notes }}
                            </p>
                          </div>
                        </div>
                        <Tag
                          :value="priorityLabel(task.priority)"
                          :severity="prioritySeverity(task.priority)"
                        />
                      </div>

                      <div
                        v-if="canWritePlanner"
                        class="flex flex-wrap gap-2 mt-2"
                      >
                        <Button
                          size="small"
                          outlined
                          icon="pi pi-check"
                          :label="t('admin.planner.mark_done')"
                          :disabled="
                            !canWritePlanner || patchingTaskId === task.id
                          "
                          :loading="patchingTaskId === task.id"
                          @click="toggleDone(task)"
                        />
                        <Button
                          size="small"
                          severity="secondary"
                          text
                          icon="pi pi-pencil"
                          :label="t('common.edit')"
                          @click="openEditTask(task)"
                        />
                        <Button
                          size="small"
                          text
                          severity="danger"
                          icon="pi pi-trash"
                          :label="t('common.delete')"
                          :disabled="
                            !canWritePlanner || deletingTaskId === task.id
                          "
                          :loading="deletingTaskId === task.id"
                          @click="removeTask(task)"
                        />
                      </div>
                    </div>
                  </template>
                </Draggable>
              </div>

              <div v-if="doneTasks.length" class="space-y-2 mt-8">
                <p class="opacity-70 uppercase text-sm">
                  {{ t("admin.planner.todo_done") }}
                </p>

                <div
                  v-for="task in doneTasks"
                  :key="task.id"
                  class="rounded-xl border p-3 opacity-70"
                >
                  <div class="flex items-start justify-between gap-2">
                    <div class="min-w-0 text-left">
                      <p class="font-semibold line-through break-words text-sm">
                        {{ task.title }}
                      </p>
                      <p class="text-xs opacity-75 mt-1">
                        {{ formatWhen(task) }}
                      </p>
                      <p v-if="task.location" class="text-xs opacity-75 mt-1">
                        <i class="pi pi-map-marker mr-1" />{{ task.location }}
                      </p>
                    </div>
                    <Tag
                      severity="success"
                      :value="t('admin.planner.done_label')"
                    />
                  </div>
                  <div v-if="canWritePlanner" class="flex flex-wrap gap-2 mt-2">
                    <Button
                      size="small"
                      outlined
                      icon="pi pi-undo"
                      :label="t('admin.planner.mark_todo')"
                      :disabled="!canWritePlanner || patchingTaskId === task.id"
                      :loading="patchingTaskId === task.id"
                      @click="toggleDone(task)"
                    />
                    <Button
                      size="small"
                      text
                      severity="secondary"
                      icon="pi pi-pencil"
                      :label="t('common.edit')"
                      @click="openEditTask(task)"
                    />
                    <Button
                      size="small"
                      text
                      severity="danger"
                      icon="pi pi-trash"
                      :label="t('common.delete')"
                      :disabled="!canWritePlanner || deletingTaskId === task.id"
                      :loading="deletingTaskId === task.id"
                      @click="removeTask(task)"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </template>
    </Card>

    <Dialog
      v-model:visible="detailDialogVisible"
      modal
      :header="t('admin.planner.task_details_title')"
      :style="{ width: '560px' }"
    >
      <div v-if="detailTask" class="space-y-3 text-left">
        <div>
          <p class="font-semibold break-words">{{ detailTask.title || "—" }}</p>
        </div>
        <div>
          <p class="text-sm opacity-80">{{ formatWhen(detailTask) }}</p>
        </div>
        <div v-if="detailTask.location">
          <p class="break-words text-sm">{{ detailTask.location }}</p>
        </div>
        <div>
          <Tag
            :value="priorityLabel(detailTask.priority)"
            :severity="prioritySeverity(detailTask.priority)"
          />
        </div>
        <div v-if="detailTask.notes">
          <p class="break-words whitespace-pre-wrap text-sm">
            {{ detailTask.notes }}
          </p>
        </div>
      </div>

      <template #footer>
        <Button
          severity="secondary"
          :label="t('common.cancel')"
          icon="pi pi-times"
          @click="detailDialogVisible = false"
        />
        <Button
          v-if="canWritePlanner"
          :label="t('common.edit')"
          icon="pi pi-pencil"
          @click="startEditFromDetail"
        />
      </template>
    </Dialog>

    <Dialog
      v-if="canWritePlanner"
      v-model:visible="editDialogVisible"
      modal
      :header="t('admin.planner.edit_task_title')"
      :style="{ width: '560px' }"
    >
      <div class="space-y-3">
        <input
          v-model="editDraft.title"
          type="text"
          class="w-full border rounded-md px-2 py-2 text-sm"
          :placeholder="t('admin.planner.task_title_placeholder')"
        />
        <div class="grid grid-cols-1 md:grid-cols-2 gap-2">
          <DatePicker
            v-model="editDraftDueAt"
            date-format="dd/mm/yy"
            show-time
            hour-format="24"
            show-icon
            class="w-full"
            input-class="w-full"
          />
          <Select
            v-model="editDraft.priority"
            :options="priorityOptions"
            option-label="label"
            option-value="value"
            append-to="body"
            class="w-full"
          />
        </div>
        <input
          v-model="editDraft.location"
          type="text"
          class="w-full border rounded-md px-2 py-2 text-sm"
          :placeholder="t('admin.planner.task_location_placeholder')"
        />
        <Textarea
          v-model="editDraft.notes"
          class="w-full"
          rows="3"
          auto-resize
          :placeholder="t('admin.planner.task_note_placeholder')"
        />
      </div>

      <template #footer>
        <Button
          severity="secondary"
          :label="t('common.cancel')"
          icon="pi pi-times"
          @click="editDialogVisible = false"
        />
        <Button
          :label="t('common.save')"
          :loading="savingEdit"
          icon="pi pi-save"
          @click="saveEditedTask"
        />
      </template>
    </Dialog>
  </div>
</template>

<script setup>
import { computed, onMounted, ref, watch } from "vue";
import Draggable from "vuedraggable";
import Dialog from "primevue/dialog";
import SelectButton from "primevue/selectbutton";
import Select from "primevue/select";
import Message from "primevue/message";
import Textarea from "primevue/textarea";
import DatePicker from "primevue/datepicker";
import Divider from "primevue/divider";
import Tag from "primevue/tag";
import Skeleton from "primevue/skeleton";
import { useToast } from "primevue/usetoast";
import { useLang } from "@/composables/useLang";
import { useMeStore } from "@/stores/meStore";
import { api } from "@/services/api";
import { showApiError } from "@/utils/showApiError";
import ContentViewer from "@/components/utils/ContentViewer.vue";
import weddingConfig from "../../../shared/weddingConfig.ts";

const { t, lang } = useLang();
const me = useMeStore();
const toast = useToast();

const prompt = ref("");
const loadingPlan = ref(false);
const savingPlanTasks = ref(false);
const plan = ref(null);
const planRequestId = ref(0);
const PLANNER_HELP_STORAGE_KEY = "help:planner:main";

const loadingTasks = ref(false);
const pendingTasks = ref([]);
const doneTasks = ref([]);
const patchingTaskId = ref("");
const deletingTaskId = ref("");

const savedView = ref("todo");
const calendarMode = ref("week");
const calendarCursor = ref(new Date());
const selectedCalendarDate = ref(toIsoDate(new Date()));

const detailDialogVisible = ref(false);
const detailTask = ref(null);

const editDialogVisible = ref(false);
const editDraft = ref({
  id: "",
  title: "",
  dueDate: "",
  dueTime: "",
  location: "",
  priority: "medium",
  notes: "",
});
const savingEdit = ref(false);

const canReadPlanner = computed(() => me.canRead("planner"));
const canWritePlanner = computed(() => me.canWrite("planner"));

function isoDateToLocalDate(iso) {
  const s = String(iso || "").trim();
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  if (!Number.isFinite(y) || !Number.isFinite(mo) || !Number.isFinite(d))
    return null;
  return new Date(y, mo - 1, d);
}

function safeTimeParts(v) {
  const s = String(v || "").trim();
  const m = s.match(/^(\d{2}):(\d{2})$/);
  if (!m) return null;
  const hh = Number(m[1]);
  const mm = Number(m[2]);
  if (!Number.isFinite(hh) || !Number.isFinite(mm)) return null;
  if (hh < 0 || hh > 23 || mm < 0 || mm > 59) return null;
  return { hh, mm };
}

function localDateToIsoDate(d) {
  if (!(d instanceof Date) || Number.isNaN(d.getTime())) return "";
  const y = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, "0");
  const da = String(d.getDate()).padStart(2, "0");
  return `${y}-${mo}-${da}`;
}

function localDateToTimeStr(d) {
  if (!(d instanceof Date) || Number.isNaN(d.getTime())) return "";
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

function toLocalDateTime(isoDate, timeStr) {
  const base = isoDateToLocalDate(isoDate);
  if (!base) return null;
  const t = safeTimeParts(timeStr);
  if (t) {
    base.setHours(t.hh, t.mm, 0, 0);
  } else {
    base.setHours(0, 0, 0, 0);
  }
  return base;
}

function applyLocalDateTime(target, d) {
  if (!target) return;
  if (!(d instanceof Date) || Number.isNaN(d.getTime())) {
    target.dueDate = "";
    target.dueTime = "";
    return;
  }
  target.dueDate = localDateToIsoDate(d);
  const nextTime = localDateToTimeStr(d);
  const hadTime = !!safeTimeParts(target.dueTime);
  target.dueTime = !hadTime && nextTime === "00:00" ? "" : nextTime;
}

const editDraftDueAt = computed({
  get: () =>
    toLocalDateTime(editDraft.value?.dueDate, editDraft.value?.dueTime),
  set: (d) => applyLocalDateTime(editDraft.value, d),
});

function getInitialHelpVisibility() {
  if (typeof window === "undefined") return true;
  try {
    return window.localStorage.getItem(PLANNER_HELP_STORAGE_KEY) !== "hidden";
  } catch {
    return true;
  }
}

const showHelper = ref(getInitialHelpVisibility());

function closeHelper() {
  showHelper.value = false;
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(PLANNER_HELP_STORAGE_KEY, "hidden");
  } catch {
    // ignore localStorage failures
  }
}

function openHelper() {
  showHelper.value = true;
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(PLANNER_HELP_STORAGE_KEY);
  } catch {
    // ignore localStorage failures
  }
}

const savedViewOptions = computed(() => [
  { label: t("admin.planner.view_todo", "Todo"), value: "todo" },
  { label: t("admin.planner.view_calendar", "Calendario"), value: "calendar" },
]);

const priorityOptions = computed(() => [
  { value: "low", label: t("admin.planner.priority.low") },
  { value: "medium", label: t("admin.planner.priority.medium") },
  { value: "high", label: t("admin.planner.priority.high") },
  { value: "urgent", label: t("admin.planner.priority.urgent") },
]);

const calendarModeOptions = computed(() => [
  { label: t("admin.planner.view_week"), value: "week" },
  { label: t("admin.planner.view_month"), value: "month" },
]);

const allTasks = computed(() => [...pendingTasks.value, ...doneTasks.value]);

function toIsoDate(dateObj) {
  const y = dateObj.getFullYear();
  const m = String(dateObj.getMonth() + 1).padStart(2, "0");
  const d = String(dateObj.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function startOfWeek(dateObj) {
  const d = new Date(dateObj);
  const day = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - day);
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfWeek(dateObj) {
  const d = startOfWeek(dateObj);
  d.setDate(d.getDate() + 6);
  return d;
}

function formatWhen(task) {
  const date = task?.dueDate || t("admin.planner.unscheduled_date");
  const time = task?.dueTime || t("admin.planner.unscheduled_time");
  return `${date} · ${time}`;
}

function prioritySeverity(priority) {
  const p = String(priority || "").toLowerCase();
  if (p === "urgent") return "danger";
  if (p === "high") return "warn";
  if (p === "low") return "secondary";
  return "info";
}

function priorityLabel(priority) {
  const p = String(priority || "medium").toLowerCase();
  if (p === "low") return t("admin.planner.priority.low");
  if (p === "high") return t("admin.planner.priority.high");
  if (p === "urgent") return t("admin.planner.priority.urgent");
  return t("admin.planner.priority.medium");
}

function clampText(value, max = 140) {
  const s = String(value || "").trim();
  return s.length > max ? `${s.slice(0, max - 1)}...` : s;
}

function normalizeSuggestedTasks(rawTasks, sourceText) {
  const words = String(sourceText || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
  const maxTasks = words <= 18 ? 2 : 3;

  return (Array.isArray(rawTasks) ? rawTasks : [])
    .map((task) => ({
      title: String(task?.title || "").trim(),
      notes: clampText(task?.notes || "", 160),
      location: String(task?.location || "").trim(),
      dueDate: task?.date || null,
      dueTime: task?.time || null,
      priority: ["low", "medium", "high", "urgent"].includes(
        String(task?.priority || ""),
      )
        ? task.priority
        : "medium",
      questionsToAsk: Array.isArray(task?.questionsToAsk)
        ? task.questionsToAsk
            .map((x) => clampText(x, 100))
            .filter(Boolean)
            .slice(0, 3)
        : [],
    }))
    .filter((task) => !!task.title)
    .slice(0, maxTasks);
}

function normalizeLoadedTasks(items) {
  const list = Array.isArray(items) ? items : [];
  const pending = list.filter((x) => !x?.isDone);
  const done = list.filter((x) => !!x?.isDone);
  pendingTasks.value = pending;
  doneTasks.value = done;
}

async function loadTasks() {
  if (!canReadPlanner.value) return;
  loadingTasks.value = true;
  try {
    const out = await api.listWeddingPlannerTasks();
    normalizeLoadedTasks(out?.items);
  } catch (e) {
    showApiError(t, toast, e);
  } finally {
    loadingTasks.value = false;
  }
}

async function generatePlan() {
  const text = String(prompt.value || "").trim();
  if (!text) {
    toast.add({
      severity: "warn",
      summary: t("errors.title", "Error"),
      detail: t("admin.planner.validation_prompt"),
      life: 3500,
    });
    return;
  }

  const requestId = planRequestId.value + 1;
  planRequestId.value = requestId;
  loadingPlan.value = true;
  try {
    const out = await api.suggestWeddingPlanner({
      prompt: text,
      locale: lang.value,
      timezone:
        Intl.DateTimeFormat().resolvedOptions().timeZone || "Europe/Paris",
      weddingDate:
        weddingConfig?.event?.dateIso ||
        weddingConfig?.countdown?.targetDateTimeUtc ||
        "",
    });
    if (requestId !== planRequestId.value) return;

    const rawPlan = out?.plan || { tasks: [] };
    plan.value = {
      model: rawPlan.model || "gpt-5-mini",
      tasks: normalizeSuggestedTasks(rawPlan.tasks, text),
    };
  } catch (e) {
    if (requestId !== planRequestId.value) return;
    showApiError(t, toast, e);
  } finally {
    if (requestId === planRequestId.value) {
      loadingPlan.value = false;
    }
  }
}

function clearPlan() {
  planRequestId.value += 1;
  loadingPlan.value = false;
  plan.value = null;
  prompt.value = "";
}

function removeSuggestedTask(index) {
  if (!Array.isArray(plan.value?.tasks)) return;
  plan.value.tasks.splice(index, 1);
}

function clearSuggestedTasks() {
  plan.value = null;
}

async function saveGeneratedTasks() {
  const list = Array.isArray(plan.value?.tasks) ? plan.value.tasks : [];
  if (!list.length) return;

  savingPlanTasks.value = true;
  try {
    const payload = list
      .map((task) => ({
        title: String(task?.title || "").trim(),
        notes: String(task?.notes || "").trim(),
        location: String(task?.location || "").trim(),
        dueDate: task?.dueDate || null,
        dueTime: task?.dueTime || null,
        priority: task?.priority || "medium",
        questionsToAsk: Array.isArray(task?.questionsToAsk)
          ? task.questionsToAsk
          : [],
        source: "ai",
      }))
      .filter((task) => !!task.title);
    if (!payload.length) {
      toast.add({
        severity: "warn",
        summary: t("errors.title", "Error"),
        detail: t(
          "admin.planner.validation_task_title_required",
          "Each task must have a title before saving.",
        ),
        life: 3500,
      });
      return;
    }

    const out = await api.bulkCreateWeddingPlannerTasks(payload);
    const createdCount = Array.isArray(out?.created) ? out.created.length : 0;

    toast.add({
      severity: "success",
      summary: t("admin.planner.save_tasks_success_title"),
      detail: t("admin.planner.save_tasks_success_body", {
        count: createdCount,
      }),
      life: 3800,
    });
    clearSuggestedTasks();
    await loadTasks();
  } catch (e) {
    showApiError(t, toast, e);
  } finally {
    savingPlanTasks.value = false;
  }
}

async function persistOrder() {
  const orderedIds = [...pendingTasks.value, ...doneTasks.value]
    .map((x) => x?.id)
    .filter(Boolean);
  if (!orderedIds.length) return;
  await api.reorderWeddingPlannerTasks(orderedIds);
}

async function onPendingReorder() {
  try {
    await persistOrder();
  } catch (e) {
    showApiError(t, toast, e);
    await loadTasks();
  }
}

async function toggleDone(task) {
  if (!task?.id || !canWritePlanner.value) return;
  patchingTaskId.value = task.id;
  try {
    const out = await api.patchWeddingPlannerTask(task.id, {
      isDone: !task.isDone,
    });
    const item = out?.item || null;
    if (item) {
      if (item.isDone) {
        pendingTasks.value = pendingTasks.value.filter((x) => x.id !== item.id);
        doneTasks.value = [
          item,
          ...doneTasks.value.filter((x) => x.id !== item.id),
        ];
      } else {
        doneTasks.value = doneTasks.value.filter((x) => x.id !== item.id);
        pendingTasks.value = [
          ...pendingTasks.value.filter((x) => x.id !== item.id),
          item,
        ];
      }
      await persistOrder();
    } else {
      await loadTasks();
    }
  } catch (e) {
    showApiError(t, toast, e);
  } finally {
    patchingTaskId.value = "";
  }
}

async function removeTask(task) {
  if (!task?.id || !canWritePlanner.value) return;
  deletingTaskId.value = task.id;
  try {
    await api.deleteWeddingPlannerTask(task.id);
    pendingTasks.value = pendingTasks.value.filter((x) => x.id !== task.id);
    doneTasks.value = doneTasks.value.filter((x) => x.id !== task.id);
  } catch (e) {
    showApiError(t, toast, e);
  } finally {
    deletingTaskId.value = "";
  }
}

function openEditTask(task) {
  if (!canWritePlanner.value) return;
  editDraft.value = {
    id: task?.id || "",
    title: task?.title || "",
    dueDate: task?.dueDate || "",
    dueTime: task?.dueTime || "",
    location: task?.location || "",
    priority: task?.priority || "medium",
    notes: task?.notes || "",
  };
  editDialogVisible.value = true;
}

async function saveEditedTask() {
  const id = String(editDraft.value.id || "").trim();
  if (!id) return;
  savingEdit.value = true;
  try {
    const out = await api.patchWeddingPlannerTask(id, {
      title: editDraft.value.title,
      dueDate: editDraft.value.dueDate || null,
      dueTime: editDraft.value.dueTime || null,
      location: editDraft.value.location || "",
      priority: editDraft.value.priority || "medium",
      notes: editDraft.value.notes || "",
    });
    const item = out?.item || null;
    if (item) {
      if (item.isDone) {
        doneTasks.value = doneTasks.value.map((x) =>
          x.id === item.id ? item : x,
        );
      } else {
        pendingTasks.value = pendingTasks.value.map((x) =>
          x.id === item.id ? item : x,
        );
      }
    }
    editDialogVisible.value = false;
  } catch (e) {
    showApiError(t, toast, e);
  } finally {
    savingEdit.value = false;
  }
}

const tasksByDate = computed(() => {
  const map = {};
  allTasks.value.forEach((task) => {
    const date = String(task?.dueDate || "").trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return;
    if (!map[date]) map[date] = [];
    map[date].push(task);
  });
  Object.keys(map).forEach((dateKey) => {
    map[dateKey].sort((a, b) => {
      const ta = String(a?.dueTime || "");
      const tb = String(b?.dueTime || "");
      if (ta && tb) return ta.localeCompare(tb);
      if (ta) return -1;
      if (tb) return 1;
      return 0;
    });
  });
  return map;
});

const weekDayLabels = computed(() => {
  const base = startOfWeek(new Date("2024-01-01"));
  const out = [];
  for (let i = 0; i < 7; i += 1) {
    const d = new Date(base);
    d.setDate(base.getDate() + i);
    out.push(
      d.toLocaleDateString(lang.value === "en" ? "en-GB" : "es-ES", {
        weekday: "short",
      }),
    );
  }
  return out;
});

const calendarDays = computed(() => {
  const todayIso = toIsoDate(new Date());
  if (calendarMode.value === "week") {
    const start = startOfWeek(calendarCursor.value);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return {
        key: toIsoDate(d),
        iso: toIsoDate(d),
        label: String(d.getDate()),
        outsideMonth: false,
        isToday: toIsoDate(d) === todayIso,
      };
    });
  }

  const monthStart = new Date(
    calendarCursor.value.getFullYear(),
    calendarCursor.value.getMonth(),
    1,
  );
  const monthEnd = new Date(
    calendarCursor.value.getFullYear(),
    calendarCursor.value.getMonth() + 1,
    0,
  );
  const gridStart = startOfWeek(monthStart);
  const gridEnd = endOfWeek(monthEnd);
  const days = [];
  for (let d = new Date(gridStart); d <= gridEnd; d.setDate(d.getDate() + 1)) {
    days.push({
      key: toIsoDate(d),
      iso: toIsoDate(d),
      label: String(d.getDate()),
      outsideMonth: d.getMonth() !== calendarCursor.value.getMonth(),
      isToday: toIsoDate(d) === todayIso,
    });
  }
  return days;
});

const calendarTitle = computed(() => {
  const locale = lang.value === "en" ? "en-GB" : "es-ES";
  if (calendarMode.value === "week") {
    const start = startOfWeek(calendarCursor.value);
    const end = endOfWeek(calendarCursor.value);
    return `${start.toLocaleDateString(locale)} - ${end.toLocaleDateString(locale)}`;
  }
  return calendarCursor.value.toLocaleDateString(locale, {
    month: "long",
    year: "numeric",
  });
});

function formatDayLabel(isoDate) {
  if (!isoDate) return "";
  const [y, m, d] = String(isoDate).split("-").map(Number);
  const value = new Date(y, (m || 1) - 1, d || 1);
  return value.toLocaleDateString(lang.value === "en" ? "en-GB" : "es-ES", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

const selectedDayTasks = computed(
  () => tasksByDate.value[selectedCalendarDate.value] || [],
);

const selectedDayLabel = computed(() =>
  formatDayLabel(selectedCalendarDate.value),
);

function selectCalendarDate(isoDate) {
  selectedCalendarDate.value = isoDate;
}

function onCalendarTaskClick(task) {
  if (!task) return;
  if (task.dueDate) selectedCalendarDate.value = task.dueDate;
  openTaskDetail(task);
}

function openTaskDetail(task) {
  if (!task) return;
  detailTask.value = task;
  detailDialogVisible.value = true;
}

function startEditFromDetail() {
  if (!canWritePlanner.value || !detailTask.value) return;
  const task = detailTask.value;
  detailDialogVisible.value = false;
  openEditTask(task);
}

function goPrevPeriod() {
  const d = new Date(calendarCursor.value);
  if (calendarMode.value === "week") d.setDate(d.getDate() - 7);
  else d.setMonth(d.getMonth() - 1);
  calendarCursor.value = d;
}

function goNextPeriod() {
  const d = new Date(calendarCursor.value);
  if (calendarMode.value === "week") d.setDate(d.getDate() + 7);
  else d.setMonth(d.getMonth() + 1);
  calendarCursor.value = d;
}

function goToday() {
  const now = new Date();
  calendarCursor.value = now;
  selectedCalendarDate.value = toIsoDate(now);
}

onMounted(async () => {
  await loadTasks();
});

watch(
  () => canReadPlanner.value,
  async (ok) => {
    if (ok) await loadTasks();
  },
);

watch(
  calendarDays,
  (days) => {
    if (!Array.isArray(days) || !days.length) return;
    if (!days.some((d) => d.iso === selectedCalendarDate.value)) {
      selectedCalendarDate.value = days[0].iso;
    }
  },
  { immediate: true },
);
</script>

<style scoped>
:deep(textarea.planner-prompt)::placeholder {
  font-size: 0.75rem;
}

:deep(textarea.planner-prompt) {
  border: 1px solid var(--p-content-border-color, #d1d5db) !important;
  box-shadow: none !important;
  outline: none !important;
}

:deep(textarea.planner-prompt:focus),
:deep(textarea.planner-prompt:focus-visible),
:deep(textarea.planner-prompt.p-focus) {
  border: 1px solid transparent !important;
  background:
    linear-gradient(white, white) padding-box,
    linear-gradient(135deg, var(--accent-color) 0%, #4da3ff 100%) border-box !important;
  box-shadow: none !important;
  outline: none !important;
}

.planner-generate-button.p-button {
  background: linear-gradient(
    135deg,
    var(--accent-color) 0%,
    #4da3ff 100%
  ) !important;
  border-color: transparent !important;
  color: #ffffff !important;
  box-shadow: 0 8px 24px rgba(77, 163, 255, 0.35);
  background-size: 220% 220%;
}

.planner-generate-button.p-button:hover,
.planner-generate-button.p-button:focus {
  background: linear-gradient(
    135deg,
    var(--accent-color) 0%,
    #5ab1ff 100%
  ) !important;
  border-color: transparent !important;
  filter: brightness(1.02);
}

.planner-generate-button-loading.p-button {
  animation: plannerButtonBreathing 2.3s ease-in-out infinite;
  filter: none !important;
}

.planner-save-button.p-button {
  background: var(--accent-color) !important;
  border-color: var(--accent-color) !important;
  color: #ffffff !important;
}

.planner-save-button.p-button:hover,
.planner-save-button.p-button:focus {
  background: var(--accent-color) !important;
  border-color: var(--accent-color) !important;
  filter: brightness(0.96);
}

.planner-prompt-loading {
  background: linear-gradient(
    120deg,
    color-mix(in srgb, var(--accent-color) 18%, white) 0%,
    color-mix(in srgb, #4da3ff 22%, white) 50%,
    color-mix(in srgb, var(--accent-color) 18%, white) 100%
  );
  background-size: 220% 220%;
  animation: plannerBreathingGradient 2.6s ease-in-out infinite;
}

@keyframes plannerBreathingGradient {
  0% {
    background-position: 0% 50%;
    filter: saturate(0.95);
  }
  50% {
    background-position: 100% 50%;
    filter: saturate(1.08);
  }
  100% {
    background-position: 0% 50%;
    filter: saturate(0.95);
  }
}

@keyframes plannerButtonBreathing {
  0% {
    background-position: 0% 50%;
  }
  50% {
    background-position: 100% 50%;
  }
  100% {
    background-position: 0% 50%;
  }
}

.planner-calendar-task {
  cursor: pointer;
  transition:
    background-color 0.18s ease,
    border-color 0.18s ease,
    transform 0.18s ease,
    box-shadow 0.18s ease;
}

.planner-calendar-task:hover {
  background: color-mix(in srgb, var(--accent-color) 12%, white);
  border-color: var(--accent-color);
  transform: translateY(-1px);
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.08);
}
</style>
