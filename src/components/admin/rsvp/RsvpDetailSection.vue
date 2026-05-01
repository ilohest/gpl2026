<!-- src/pages/admin/rsvp/RsvpDetailSection.vue -->
<template>
  <div class="max-w-5xl mx-auto p-4 md:p-6 space-y-6">
    <div class="flex items-center gap-2">
      <Button
        size="small"
        icon="pi pi-arrow-left"
        severity="secondary"
        @click="goBack"
        class="p-button-text"
        :label="t('admin.back')"
      />
    </div>

    <Card :style="{ border: '1px solid var(--accent-color)' }">
      <template #title>
        <div class="flex flex-col gap-4 mb-4">
          <div class="flex items-center text-left gap-2 min-w-0">
            <p class="admin-bento-title truncate">
              <i class="pi pi-envelope text-sm" aria-hidden="true" />
              {{ t("admin.responses.detail_title") }}
            </p>

            <!-- ✅ Petit badge "Modifications" -->
            <span
              v-if="showEditDialog && isDirty"
              class="ml-2 inline-flex items-center rounded-full px-2 py-0.5 text-[11px] bg-amber-50 text-amber-800 border border-amber-200"
            >
              {{ t("common.unsaved_changes") }}
            </span>
          </div>

          <div class="flex items-center justify-end gap-2">
            <Button
              v-if="canEdit"
              size="small"
              icon="pi pi-pencil"
              outlined
              severity="secondary"
              :label="t('admin.responses.edit_mode')"
              @click="toggleEdit"
            />
          </div>
        </div>
      </template>

      <template #content>
        <div
          v-if="loading"
          class="space-y-3"
        >
          <Skeleton width="12rem" height="1.1rem" />
          <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Skeleton width="100%" height="6.5rem" />
            <Skeleton width="100%" height="6.5rem" />
          </div>
          <div class="grid grid-cols-1 xl:grid-cols-2 gap-4">
            <Skeleton width="100%" height="12rem" />
            <Skeleton width="100%" height="12rem" />
          </div>
        </div>

        <div
          v-else-if="!groupDoc && !isWeddingCouple"
          class="space-y-3"
        >
          <p class="text-sm">{{ t("admin.responses.not_found") }}</p>
        </div>

        <div
          v-else
          class="space-y-6"
        >
          <!-- Infos groupe (cachées pour les mariés) -->
          <div
            v-if="!isWeddingCouple"
            class="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm"
          >
            <div
              class="rounded-xl border border-[rgba(15,23,42,0.08)] bg-[var(--surface-soft)] p-3"
            >
              <p class="text-xs font-semibold opacity-70 mb-2">
                {{ t("admin.responses.group_people") }}
              </p>
              <div class="space-y-1">
                <p class="flex justify-between gap-2">
                  <span>{{ t("admin.stats.total_people") }}</span>
                  <strong>{{ groupTotalGuests }}</strong>
                </p>
                <p class="flex justify-between gap-2">
                  <span>{{ t("admin.responses.role_primary") }}</span>
                  <strong>{{ groupPrimaryGuests }}</strong>
                </p>
                <p class="flex justify-between gap-2">
                  <span>{{ t("admin.responses.role_plus_one") }}</span>
                  <strong>{{ groupPlusOnes }}</strong>
                </p>
                <p class="flex justify-between gap-2">
                  <span>{{ t("admin.responses.is_child") }}</span>
                  <strong>{{ groupChildren }}</strong>
                </p>
              </div>
            </div>

            <div
              class="rounded-xl border border-[rgba(15,23,42,0.08)] bg-[var(--surface-soft)] p-3"
            >
              <p class="text-xs font-semibold opacity-70 mb-1">
                {{ t("admin.responses.created_at") }}
              </p>
              <p class="font-medium">{{ formattedCreatedAt }}</p>
            </div>
          </div>

          <!-- Personnes du groupe -->
          <div class="space-y-3">
            <p
              v-if="!isWeddingCouple"
              class="admin-bento-title"
            >
              <i class="pi pi-users text-sm" aria-hidden="true" />
              {{ t("admin.responses.group_people") }}
            </p>

            <div
              v-if="people.length"
              class="grid grid-cols-1 xl:grid-cols-2 gap-4 text-left"
            >
              <div
                v-for="(persona, idx) in people"
                :key="persona.guestId || idx"
                class="rounded-xl border border-[rgba(15,23,42,0.08)] p-4 text-sm bg-white space-y-3 shadow-[0_6px_18px_rgba(15,23,42,0.06)]"
              >
                <div
                  class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"
                >
                  <div class="flex-1 min-w-0">
                    <template v-if="!isEditing">
                      <p class="font-semibold text-base">
                        {{
                          `${persona.firstName || ""} ${persona.lastName || ""}`.trim() ||
                            "—"
                        }}
                      </p>
                      <p class="text-xs text-gray-500 mt-0.5">
                        {{ persona.email || "—" }}
                      </p>
                    </template>

                    <template v-else>
                      <InputText
                        v-model="persona.firstName"
                        :placeholder="t('rsvp.form.name')"
                        class="w-full p-inputtext-sm mb-1"
                      />
                      <InputText
                        v-model="persona.lastName"
                        :placeholder="t('rsvp.form.surname')"
                        class="w-full p-inputtext-sm mb-1"
                      />
                      <InputText
                        v-model="persona.email"
                        :placeholder="t('rsvp.form.email_opt')"
                        class="w-full p-inputtext-sm"
                      />
                    </template>
                  </div>

                  <!-- Tags top-right -->
                  <div
                    class="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:flex-nowrap sm:flex-shrink-0 sm:justify-end"
                  >
                    <span
                      v-if="persona.isCouple"
                      class="inline-flex max-w-full items-center gap-1 rounded-full px-2 py-0.5 text-xs bg-amber-50 text-amber-800 border border-amber-200"
                    >
                      <img
                        :src="crownIcon"
                        alt="Couple"
                        class="w-4 h-4 object-contain"
                      />
                      <span class="uppercase tracking-wide text-[0.65rem]">
                        {{
                          persona.isPrimary
                            ? t("admin.responses.couple_bride")
                            : t("admin.responses.couple_groom")
                        }}
                      </span>
                    </span>

                    <span
                      v-else
                      class="inline-flex max-w-full items-center gap-1 rounded-full px-2 py-0.5 text-xs leading-tight"
                      :class="
                        persona.isPrimary
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-sky-50 text-sky-700 border border-sky-200'
                      "
                    >
                      <i
                        class="pi"
                        :class="
                          persona.isPrimary ? 'pi-star-fill' : 'pi-user-plus'
                        "
                      ></i>
                      <span class="whitespace-normal break-words">
                        {{
                          persona.isPrimary
                            ? t("admin.responses.role_primary")
                            : t("admin.responses.role_plus_one")
                        }}
                      </span>
                    </span>

                    <span
                      v-if="persona.isChild"
                      class="inline-flex max-w-full items-center gap-1 rounded-full px-2 py-0.5 text-xs border bg-indigo-50 text-indigo-700 border-indigo-200"
                    >
                      <i class="pi pi-star"></i>
                      {{ t("admin.responses.is_child") }}
                    </span>
                  </div>
                </div>

                <template v-if="!isEditing">
                  <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div class="space-y-3">
                      <div class="mt-1">
                        <p class="font-semibold text-xs mb-1">
                          {{ t("admin.responses.attending") }}
                        </p>
                        <span
                          class="inline-flex items-center rounded-full px-2 py-0.5 text-xs border"
                          :class="
                            isYes(persona.attending)
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-rose-50 text-rose-700 border-rose-200'
                          "
                        >
                          {{ ynLabel(persona.attending) }}
                        </span>
                      </div>

                      <div class="mt-1">
                        <p class="font-semibold text-xs mb-1">
                          {{ t("admin.responses.transport") }}
                        </p>
                        <span
                          v-if="
                            persona.transport !== undefined &&
                              persona.transport !== null
                          "
                          class="inline-flex items-center rounded-full px-2 py-0.5 text-xs border"
                          :class="
                            isYes(persona.transport)
                              ? 'bg-sky-50 text-sky-700 border-sky-200'
                              : 'bg-orange-50 text-orange-700 border-orange-200'
                          "
                        >
                          {{ ynLabel(persona.transport) }}
                        </span>
                        <span
                          v-else
                          class="text-xs opacity-60"
                        >—</span>
                      </div>
                    </div>

                    <div class="space-y-3">
                      <div class="mt-1">
                        <p class="font-semibold text-xs mb-1">
                          {{ t("admin.responses.wedding_event_parts") }}
                        </p>
                        <div
                          v-if="hasWeddingEventPartsForPerson(persona)"
                          class="flex flex-wrap gap-1"
                        >
                          <span
                            v-for="part in weddingEventPartLabelsForPerson(
                              persona,
                            )"
                            :key="part"
                            class="inline-flex items-center rounded-full px-2 py-0.5 text-xs border bg-violet-50 text-violet-700 border-violet-200"
                          >
                            {{ part }}
                          </span>
                        </div>
                        <span
                          v-else
                          class="text-xs opacity-60"
                        >—</span>
                      </div>

                      <div class="mt-2">
                        <p class="font-semibold text-xs mb-1">
                          {{ t("admin.responses.restrictions") }}
                        </p>
                        <div
                          v-if="hasDietForPerson(persona)"
                          class="flex flex-wrap gap-1"
                        >
                          <span
                            v-for="badge in getDietBadgesForPerson(persona)"
                            :key="badge.key"
                            class="inline-flex items-center gap-1 rounded-full px-2 py-0.5 bg-amber-50 text-amber-800 border border-amber-200 text-[11px]"
                          >
                            <img
                              :src="badge.icon"
                              alt=""
                              class="w-4 h-4 object-contain"
                            />
                            <span>{{ badge.label }}</span>
                          </span>
                        </div>
                        <p
                          v-else
                          class="text-xs opacity-60"
                        >
                          —
                        </p>
                      </div>
                    </div>
                  </div>
                </template>

                <RsvpFieldsDialog
                  v-else
                  v-model:attending="persona.attending"
                  v-model:wedding-event-parts="persona.weddingEventParts"
                  v-model:transport="persona.transport"
                  v-model:diet-codes="persona.dietCodes"
                  v-model:diet-other-text="persona.dietOtherText"
                  :yes-no-options="ynOptions"
                  :transport-options="ynOptions"
                  :wedding-part-options="weddingPartOptions"
                  :diet-options="dietOptions"
                  :select-pt="selectPt"
                  @attending-change="onAttendingChange(persona)"
                />

                <div
                  v-if="!isWeddingCouple"
                  class="pt-3 mt-3"
                >
                  <template v-if="!isEditing">
                    <div class="admin-rsvp-metric admin-rsvp-metric--boxed">
                      <span class="admin-rsvp-metric__label">{{
                        t("admin.responses.gift_amount", "Cadeau")
                      }}</span>
                      <strong class="admin-rsvp-metric__value">
                        {{
                          persona.giftAmount === 0 || persona.giftAmount
                            ? `${Number(persona.giftAmount).toFixed(2)} €`
                            : "—"
                        }}
                      </strong>
                    </div>
                  </template>

                  <template v-else>
                    <InputNumber
                      v-model="persona.giftAmount"
                      class="w-full max-w-[220px]"
                      input-class="w-full p-inputtext-sm"
                      :min="0"
                      :max-fraction-digits="2"
                      :use-grouping="false"
                      placeholder="—"
                    />
                  </template>
                </div>
              </div>
            </div>

            <ContentViewer
              v-else
              class="text-sm opacity-70"
              :empty-text="t('admin.responses.no_people')"
            />
          </div>

          <div
            v-if="!isWeddingCouple"
            class="grid grid-cols-1 xl:grid-cols-2 gap-4"
          >
            <!-- MESSAGE -->
            <div class="space-y-2">
              <p class="admin-bento-title">
                <i class="pi pi-comment text-sm" aria-hidden="true" />
                {{ t("admin.responses.message") }}
              </p>
              <div
                class="whitespace-pre-wrap text-left rounded-xl border border-[rgba(15,23,42,0.08)] p-3 text-sm bg-[var(--surface-soft)]"
              >
                {{
                  groupDoc?.message && String(groupDoc.message).trim()
                    ? groupDoc.message
                    : "—"
                }}
              </div>
            </div>

            <!-- SONGS -->
            <div class="space-y-2">
              <p class="admin-bento-title">
                <i class="pi pi-volume-up text-sm" aria-hidden="true" />
                {{ t("admin.responses.songs") }}
              </p>

              <div
                class="rounded-xl border text-left border-[rgba(15,23,42,0.08)] p-3 text-sm bg-[var(--surface-soft)]"
              >
                <template v-if="songs.length">
                  <ul class="space-y-2">
                    <li
                      v-for="(song, idx) in songs"
                      :key="idx"
                      class="flex items-center gap-3"
                    >
                      <div
                        class="relative w-15 h-15 rounded overflow-hidden shadow-[0_6px_18px_rgba(15,23,42,0.06)] flex-shrink-0 bg-gray-200 flex items-center justify-center"
                      >
                        <img
                          v-if="song.artworkUrl"
                          :src="song.artworkUrl"
                          alt=""
                          class="w-full h-full object-cover"
                          loading="lazy"
                        />
                        <span
                          v-else
                          class="text-lg text-gray-400 select-none"
                          role="img"
                          aria-label="Note de musique"
                        >
                          <i class="pi pi-wave-pulse text-gray-400 text-lg"></i>
                        </span>

                        <button
                          v-if="song.previewUrl"
                          type="button"
                          class="absolute inset-0 flex items-center justify-center bg-black/20 hover:bg-black/35 transition"
                          @click="togglePlay(song)"
                        >
                          <span
                            class="inline-flex items-center justify-center w-6 h-6 rounded-full bg-white/60"
                          >
                            <i
                              class="pi"
                              :class="
                                isSongPlaying(song) ? 'pi-pause' : 'pi-play'
                              "
                            ></i>
                          </span>
                        </button>
                      </div>

                      <div class="min-w-0 flex-1">
                        <p class="font-medium truncate">{{ song.display }}</p>
                        <p
                          v-if="song.album"
                          class="text-xs text-gray-500 truncate"
                        >
                          {{ song.album }}
                        </p>
                      </div>
                    </li>
                  </ul>
                </template>

                <template v-else><span>—</span></template>
              </div>
            </div>
          </div>

          <!-- COMMENTS -->
          <div
            v-if="!isWeddingCouple"
            class="space-y-2"
          >
            <p class="admin-bento-title">
              <i class="pi pi-comments text-sm" aria-hidden="true" />
              {{ t("admin.responses.comments") }}
            </p>
            <div
              class="whitespace-pre-wrap text-left rounded-xl border border-[rgba(15,23,42,0.08)] p-3 text-sm bg-[var(--surface-soft)]"
            >
              {{
                groupDoc?.comments && String(groupDoc.comments).trim()
                  ? groupDoc.comments
                  : "—"
              }}
            </div>
          </div>
        </div>
      </template>
    </Card>
  </div>

  <Dialog
    v-model:visible="showEditDialog"
    modal
    :style="{ width: '96vw', maxWidth: '920px' }"
    :breakpoints="{ '960px': '96vw', '640px': '100vw' }"
  >
    <template #header>
      <div class="flex items-center justify-between gap-2 w-full">
        <span>{{ t("admin.responses.edit_mode") }}</span>
        <Button
          v-if="!isWeddingCouple"
          size="small"
          icon="pi pi-user-plus"
          severity="secondary"
          text
          :label="t('common.add_guest')"
          @click="addEditingGuest"
        />
      </div>
    </template>

    <div class="space-y-4">
      <div class="space-y-3 max-h-[62vh] overflow-auto pr-1">
        <div
          v-for="(person, idx) in editingPeople"
          :key="person.guestId || person.localId || idx"
          class="rounded-md border border-[rgba(0,0,0,0.08)] p-3 space-y-3"
        >
          <div class="flex items-center justify-between gap-2">
            <p class="font-semibold text-sm">
              {{
                t("admin.responses.add_manual_group_person_n", { n: idx + 1 })
              }}
            </p>
            <div class="flex items-center gap-2">
              <span
                v-if="isWeddingCouple"
                class="inline-flex items-center gap-1 text-[0.7rem] uppercase tracking-wide px-2 py-0.5 rounded-full border bg-amber-50 text-amber-700 border-amber-200"
              >
                <img
                  :src="crownIcon"
                  alt=""
                  class="w-3.5 h-3.5 object-contain"
                />
                {{
                  person.isPrimary
                    ? t("admin.responses.couple_bride")
                    : t("admin.responses.couple_groom")
                }}
              </span>
              <span
                v-else
                class="text-[0.7rem] uppercase tracking-wide px-2 py-0.5 rounded-full"
                :class="
                  person.isPrimary
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : 'bg-sky-50 text-sky-700 border border-sky-200'
                "
              >
                {{
                  person.isPrimary
                    ? t("admin.responses.role_primary")
                    : t("admin.responses.role_plus_one")
                }}
              </span>
              <Button
                v-if="canRemoveEditingGuest(person)"
                icon="pi pi-times"
                severity="secondary"
                text
                rounded
                size="small"
                :aria-label="
                  t('admin.responses.add_manual_group_remove_person')
                "
                @click="removeEditingGuest(idx)"
              />
            </div>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div class="space-y-1">
              <label class="font-semibold text-sm">
                {{ t("admin.responses.first_name") }}
              </label>
              <InputText
                v-model="person.firstName"
                class="w-full"
              />
            </div>

            <div class="space-y-1">
              <label class="font-semibold text-sm">
                {{ t("admin.responses.last_name") }}
              </label>
              <InputText
                v-model="person.lastName"
                class="w-full"
              />
            </div>

            <div class="space-y-1">
              <label class="font-semibold text-sm">
                {{ t("admin.responses.email") }}
              </label>
              <InputText
                v-model="person.email"
                class="w-full"
              />
            </div>
          </div>

          <div
            v-if="!person.isPrimary && !person.isCouple"
            class="flex items-center gap-3"
          >
            <Checkbox
              :id="`edit-is-child-${person.guestId || idx}`"
              v-model="person.isChild"
              binary
              class="detail-child-checkbox"
            />
            <label
              :for="`edit-is-child-${person.guestId || idx}`"
              class="text-sm detail-child-label"
            >
              {{ t("rsvp.form.is_child") }}
            </label>
          </div>

          <RsvpFieldsDialog
            v-model:attending="person.attending"
            v-model:wedding-event-parts="person.weddingEventParts"
            v-model:transport="person.transport"
            v-model:diet-codes="person.dietCodes"
            v-model:diet-other-text="person.dietOtherText"
            :yes-no-options="ynOptions"
            :transport-options="ynOptions"
            :wedding-part-options="weddingPartOptions"
            :diet-options="dietOptions"
            :select-pt="selectPt"
            @attending-change="onAttendingChange(person)"
          />

          <div
            v-if="!isWeddingCouple"
            class="mt-2"
          >
            <p class="font-semibold text-xs mb-1">
              {{ t("admin.responses.gift_amount", "Cadeau") }}
            </p>
            <InputNumber
              v-model="person.giftAmount"
              class="w-full max-w-[220px]"
              input-class="w-full p-inputtext-sm"
              :min="0"
              :max-fraction-digits="2"
              :use-grouping="false"
              placeholder="—"
            />
          </div>
        </div>
      </div>
    </div>

    <template #footer>
      <div class="flex justify-end gap-2">
        <Button
          size="small"
          severity="secondary"
          icon="pi pi-times"
          :label="t('common.cancel')"
          :disabled="saving"
          @click="closeEditDialog"
        />
        <Button
          size="small"
          :label="t('common.save')"
          icon="pi pi-save"
          :disabled="!isDirty || saving"
          :loading="saving"
          class="btn-accent !bg-[var(--accent-color)] !border-[var(--accent-color)]"
          @click="saveChanges"
        />
      </div>
    </template>
  </Dialog>

  <audio
    ref="audioRef"
    class="hidden"
    @ended="onAudioEnded"
  ></audio>

  <AdminAiChat
    v-if="canUseAiChat"
    page-context="rsvp"
  />
</template>

<script setup>
import { ref, onMounted, computed, onBeforeUnmount } from "vue";
import { api } from "@/services/api";
import { useRoute, useRouter } from "vue-router";

import Dialog from "primevue/dialog";
import Card from "primevue/card";
import Button from "primevue/button";
import InputText from "primevue/inputtext";
import InputNumber from "primevue/inputnumber";
import Checkbox from "primevue/checkbox";
import { useToast } from "primevue/usetoast";

import { useMeStore } from "@/stores/meStore";
import { useLang } from "@/composables/useLang";
import {
  ensureFirebase,
  doc,
  collection,
  onSnapshot,
  query,
  where,
} from "@/services/firebaseClient";

import { showApiError } from "@/utils/showApiError";
import { getDietBadges } from "@/shared/dietIcons";
import ContentViewer from "@/components/utils/ContentViewer.vue";
import RsvpFieldsDialog from "@/components/admin/rsvp/RsvpFieldsDialog.vue";
import {
  dietOptions as buildDietOptions,
  normalizeDietCodes,
  ensureOtherIfText,
} from "../../../../shared/dietTypes";

import crownIcon from "@/assets/icons/crown.png";
import AdminAiChat from "@/components/admin/AdminAiChat.vue";

const route = useRoute();
const router = useRouter();
const toast = useToast();
const { t } = useLang();
const me = useMeStore();

const loading = ref(true);
const saving = ref(false);
const isEditing = ref(false);
const showEditDialog = ref(false);

const rsvpId = ref(null);
const groupDoc = ref(null); // rsvps/{id}
const people = ref([]); // guests docs
const editingPeople = ref([]);

const _originalPeopleById = new Map();

let _unsubGroup = null;
let _unsubGuests = null;

/* ---------- Audio ---------- */

const audioRef = ref(null);
const currentSongKey = ref(null);

const isWeddingCouple = computed(() => rsvpId.value === "couple");

function songKey(song) {
  return (
    song?.previewUrl ||
    `${song?.title || ""}__${song?.artist || ""}__${song?.album || ""}__${song?.display || ""}`
  );
}

function isSongPlaying(song) {
  const el = audioRef.value;
  if (!el) return false;
  return currentSongKey.value === songKey(song) && !el.paused;
}

function stopAudio() {
  const el = audioRef.value;
  if (!el) return;
  try {
    el.pause();
    el.currentTime = 0;
  } catch {}
  currentSongKey.value = null;
}

function onAudioEnded() {
  currentSongKey.value = null;
}

async function togglePlay(song) {
  const el = audioRef.value;
  if (!el) return;

  const url = String(song?.previewUrl || "").trim();
  if (!url) return;

  const key = songKey(song);

  if (currentSongKey.value === key) {
    if (el.paused) {
      try {
        await el.play();
      } catch {}
    } else {
      el.pause();
    }
    return;
  }

  try {
    el.pause();
  } catch {}

  try {
    el.src = url;
    el.currentTime = 0;
    currentSongKey.value = key;
    await el.play();
  } catch (e) {
    console.error("[AdminRsvpDetail] audio play failed", e);
    currentSongKey.value = null;
  }
}

/* ---------- UI options ---------- */

const ynOptions = computed(() => [
  { label: t("rsvp.form.yes"), value: "yes" },
  { label: t("rsvp.form.no"), value: "no" },
]);

const canEdit = computed(() => me.canWrite?.("rsvp") || false);
const canUseAiChat = computed(() => !!me.canUseAiChat);
const dietOptions = computed(() => buildDietOptions(t));

const selectPt = {
  root: { class: "w-full bg-transparent border-0 shadow-none" },
  button: { class: "flex-1 px-3 py-1 border rounded-2xl text-xs" },
};

/* ---------- Derived flags ---------- */

/* ---------- Conversions ---------- */

function isYes(v) {
  const s = String(v ?? "").toLowerCase();
  return s === "yes" || s === "true" || s === "1";
}

function ynLabel(val) {
  if (val === undefined || val === null || val === "") return "—";
  const v = String(val).toLowerCase();
  if (v === "yes" || v === "true") return t("common.yes");
  if (v === "no" || v === "false") return t("common.no");
  return val;
}

function normalizeGuest(docId, data) {
  const g = data || {};

  const firstName = String(g.firstName || "").trim();
  const lastName = String(g.lastName || "").trim();
  const email = String(g.email || "").trim();

  const otherText = String(g.dietOtherText || "").trim();
  let dietCodes = Array.isArray(g.dietCodes) ? g.dietCodes : [];
  dietCodes = normalizeDietCodes(dietCodes, { dropUnknown: true });
  dietCodes = ensureOtherIfText(dietCodes, otherText);

  // UI uses yes/no
  const attendingUi = g.attending === true ? "yes" : "no";
  const transportUi = g.transport === true ? "yes" : "no";

  return {
    guestId: docId,

    // identity
    firstName,
    lastName,
    email,

    // RSVP UI fields
    attending: attendingUi,
    weddingEventParts: normalizeWeddingEventParts(g.weddingEventParts),
    transport: transportUi,
    dietCodes,
    dietOtherText: otherText,
    giftAmount:
      g.giftAmount === 0 || g.giftAmount ? Number(g.giftAmount) : null,

    // meta
    rsvpId: g.rsvpId || null,
    role: g.role || (g.isPrimary ? "PRIMARY" : "PLUS_ONE"),
    isPrimary: !!g.isPrimary,
    isChild: !!g.isChild,
    parentGuestId: g.parentGuestId || null,
    index: Number.isFinite(Number(g.index)) ? Number(g.index) : 0,
    isCouple: !!g.isCouple,
  };
}

/* ---------- Group fields ---------- */

const formattedCreatedAt = computed(() => {
  const ts = groupDoc.value?.createdAt;
  if (!ts) return "—";
  const d = ts?.toDate ? ts.toDate() : new Date(ts);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleString();
});


const songs = computed(() => {
  const raw = groupDoc.value?.songs ?? groupDoc.value?.groupSongs ?? [];
  if (!raw) return [];

  if (typeof raw === "string") {
    const s = raw.trim();
    return s ? [{ display: s }] : [];
  }

  if (Array.isArray(raw)) {
    return raw
      .map((s) => {
        const title = String(s?.title || "").trim();
        const artist = String(s?.artist || "").trim();
        const album = String(s?.album || "").trim();
        const artworkUrl = String(s?.artworkUrl || "").trim();
        const previewUrl = String(s?.previewUrl || "").trim();

        const display =
          title && artist ? `${title} — ${artist}` : title || artist;

        if (!display && !artworkUrl) return null;

        return { title, artist, album, artworkUrl, previewUrl, display };
      })
      .filter(Boolean);
  }

  return [];
});


function normalizeWeddingEventParts(parts) {
  const allowed = new Set([
    "mass",
    "cocktailReception",
    "dinner",
    "party",
    "brunch",
  ]);
  if (!Array.isArray(parts)) return [];
  return parts.map((x) => String(x || "").trim()).filter((x) => allowed.has(x));
}

function weddingEventPartLabel(code) {
  switch (code) {
    case "mass":
      return t("rsvp.form.wedding_part_mass");
    case "cocktailReception":
      return t("rsvp.form.wedding_part_cocktail_reception");
    case "dinner":
      return t("rsvp.form.wedding_part_dinner");
    case "party":
      return t("rsvp.form.wedding_part_party");
    case "brunch":
      return t("rsvp.form.wedding_part_brunch");
    default:
      return code;
  }
}

const weddingPartOptions = computed(() => [
  { label: t("rsvp.form.wedding_part_mass"), value: "mass" },
  {
    label: t("rsvp.form.wedding_part_cocktail_reception"),
    value: "cocktailReception",
  },
  { label: t("rsvp.form.wedding_part_dinner"), value: "dinner" },
  { label: t("rsvp.form.wedding_part_party"), value: "party" },
  { label: t("rsvp.form.wedding_part_brunch"), value: "brunch" },
]);

function hasWeddingEventPartsForPerson(person) {
  return normalizeWeddingEventParts(person?.weddingEventParts).length > 0;
}

function weddingEventPartLabelsForPerson(person) {
  return normalizeWeddingEventParts(person?.weddingEventParts).map(
    weddingEventPartLabel,
  );
}

const groupTotalGuests = computed(() => people.value.length);
const groupPrimaryGuests = computed(
  () => people.value.filter((p) => !!p.isPrimary).length,
);
const groupChildren = computed(
  () => people.value.filter((p) => !!p.isChild).length,
);
const groupPlusOnes = computed(
  () =>
    people.value.filter((p) => !p.isPrimary && !p.isChild && !p.isCouple)
      .length,
);

/* ---------- UI handlers ---------- */

function goBack() {
  router.push({ path: "/admin", query: { section: "rsvp" } });
}

function onAttendingChange(person) {
  if (String(person.attending || "").toLowerCase() === "no") {
    person.weddingEventParts = [];
    person.transport = "no";
    person.dietCodes = [];
    person.dietOtherText = "";
    person.giftAmount = null;
  }
}

function newEditingGuest() {
  const primary =
    editingPeople.value.find((p) => p.isPrimary) ||
    people.value.find((p) => p.isPrimary) ||
    null;
  const localId = `new-${Date.now()}-${Math.random()}`;
  return {
    guestId: null,
    localId,
    firstName: "",
    lastName: String(primary?.lastName || "").trim(),
    email: "",
    attending: "yes",
    weddingEventParts: [],
    transport: "no",
    dietCodes: [],
    dietOtherText: "",
    giftAmount: null,
    rsvpId: rsvpId.value || null,
    role: "PLUS_ONE",
    isPrimary: false,
    isChild: false,
    parentGuestId: String(primary?.guestId || ""),
    index: editingPeople.value.length,
    isCouple: false,
  };
}

function addEditingGuest() {
  editingPeople.value.push(newEditingGuest());
}

function removeEditingGuest(index) {
  const person = editingPeople.value[index];
  if (!person || person.isPrimary || person.guestId) return;
  if (!isEditingGuestPristine(person)) return;
  editingPeople.value.splice(index, 1);
}

function isEditingGuestPristine(person) {
  const firstName = String(person?.firstName || "").trim();
  const lastName = String(person?.lastName || "").trim();
  const email = String(person?.email || "").trim();
  const dietOtherText = String(person?.dietOtherText || "").trim();
  const attending = String(person?.attending || "yes").toLowerCase();
  const transport = String(person?.transport || "no").toLowerCase();
  const weddingEventParts = normalizeWeddingEventParts(
    person?.weddingEventParts,
  );
  const dietCodes = normalizeDietCodes(person?.dietCodes, {
    dropUnknown: true,
  });
  const giftAmount = person?.giftAmount;

  return (
    !firstName &&
    !lastName &&
    !email &&
    !person?.isChild &&
    attending === "yes" &&
    transport === "no" &&
    weddingEventParts.length === 0 &&
    dietCodes.length === 0 &&
    !dietOtherText &&
    (giftAmount === null || giftAmount === undefined || giftAmount === "")
  );
}

function canRemoveEditingGuest(person) {
  return (
    !person?.isPrimary && !person?.guestId && isEditingGuestPristine(person)
  );
}

function normGift(v) {
  const n = v === "" || v === undefined ? null : v;
  const num = n === null ? null : Number(n);
  return Number.isFinite(num) ? num : null;
}

/* ---------- Diet UI helpers ---------- */

function hasDietForPerson(person) {
  const otherText = String(person?.dietOtherText || "").trim();
  const codes = normalizeDietCodes(person?.dietCodes, { dropUnknown: true });
  return codes.length > 0 || otherText.length > 0;
}

function getDietBadgesForPerson(person) {
  const otherText = String(person?.dietOtherText || "").trim();
  let codes = normalizeDietCodes(person?.dietCodes, { dropUnknown: true });
  codes = ensureOtherIfText(codes, otherText);

  const rawBadges = getDietBadges(codes, otherText);
  return rawBadges
    .map((b) => ({
      ...b,
      label: b.key === "other" ? otherText : t(b.i18nKey),
    }))
    .filter((b) => b.key !== "other" || otherText);
}

/* ---------- Diff + Save ---------- */

function diffGuest(original, current) {
  const patch = {};

  // identity
  if ((original?.firstName ?? "") !== (current?.firstName ?? ""))
    patch.firstName = String(current?.firstName ?? "").trim();

  if ((original?.lastName ?? "") !== (current?.lastName ?? ""))
    patch.lastName = String(current?.lastName ?? "").trim();

  if ((original?.email ?? "") !== (current?.email ?? ""))
    patch.email = String(current?.email ?? "").trim();

  // RSVP booleans stored in DB
  if ((original?.attending ?? "") !== (current?.attending ?? ""))
    patch.attending = String(current?.attending || "").toLowerCase() === "yes";

  if ((original?.transport ?? "") !== (current?.transport ?? ""))
    patch.transport = String(current?.transport || "").toLowerCase() === "yes";

  const oWeddingParts = normalizeWeddingEventParts(original?.weddingEventParts);
  const cWeddingParts = normalizeWeddingEventParts(current?.weddingEventParts);
  if (JSON.stringify(oWeddingParts) !== JSON.stringify(cWeddingParts))
    patch.weddingEventParts = cWeddingParts;

  if (!!original?.isChild !== !!current?.isChild)
    patch.isChild = !!current?.isChild;

  // diet
  const oCodes = Array.isArray(original?.dietCodes) ? original.dietCodes : [];
  const cCodes = Array.isArray(current?.dietCodes) ? current.dietCodes : [];
  if (JSON.stringify(oCodes) !== JSON.stringify(cCodes))
    patch.dietCodes = cCodes;

  const oOther = String(original?.dietOtherText ?? "");
  const cOther = String(current?.dietOtherText ?? "");
  if (oOther !== cOther) patch.dietOtherText = cOther;

  // gift
  const oGift = normGift(original?.giftAmount);
  const cGift = normGift(current?.giftAmount);
  if (oGift !== cGift) patch.giftAmount = cGift;

  // rule: if not attending, wipe dependent fields
  if (String(current?.attending || "").toLowerCase() !== "yes") {
    patch.attending = false;
    patch.weddingEventParts = [];
    patch.transport = false;
    patch.dietCodes = [];
    patch.dietOtherText = "";
    patch.giftAmount = null;
  }

  return patch;
}

async function saveChanges() {
  saving.value = true;
  try {
    const guestPatches = [];
    const guestCreates = [];

    for (const p of editingPeople.value) {
      const original = _originalPeopleById.get(p.guestId);
      if (!original) {
        guestCreates.push(p);
        continue;
      }
      const patch = diffGuest(original, p);
      if (Object.keys(patch).length)
        guestPatches.push({ guestId: p.guestId, patch });
    }

    if (guestPatches.length) {
      await Promise.all(
        guestPatches.map(({ guestId, patch }) =>
          api.patchGuest(String(guestId), patch),
        ),
      );
    }

    if (guestCreates.length) {
      if (!rsvpId.value) throw new Error("missing_rsvpId");

      for (const p of guestCreates) {
        const firstName = String(p?.firstName || "").trim();
        const lastName = String(p?.lastName || "").trim();
        if (!firstName || !lastName) throw new Error("missing_fields");

        const attendingYes = String(p?.attending || "").toLowerCase() === "yes";

        await api.addGuestToRsvp(String(rsvpId.value), {
          firstName,
          lastName,
          email: String(p?.email || "").trim(),
          isChild: !!p?.isChild,
          attending: attendingYes,
          weddingEventParts: attendingYes
            ? normalizeWeddingEventParts(p?.weddingEventParts)
            : [],
          transport:
            attendingYes && String(p?.transport || "").toLowerCase() === "yes",
          dietCodes: attendingYes
            ? normalizeDietCodes(p?.dietCodes, { dropUnknown: true })
            : [],
          dietOtherText: attendingYes
            ? String(p?.dietOtherText || "").trim()
            : "",
          giftAmount: normGift(p?.giftAmount),
        });
      }
    }

    const persisted = editingPeople.value.map((p) =>
      JSON.parse(JSON.stringify(p)),
    );
    people.value = persisted;
    _originalPeopleById.clear();
    persisted.forEach((p) =>
      _originalPeopleById.set(p.guestId, JSON.parse(JSON.stringify(p))),
    );

    toast.add({
      severity: "success",
      summary: t("common.saved"),
      detail: t("admin.responses.save_ok"),
      life: 2500,
    });

    showEditDialog.value = false;
  } catch (e) {
    console.error(e);
    showApiError(t, toast, e, { life: 5000 });
  } finally {
    saving.value = false;
  }
}

const isDirty = computed(() => {
  if (!showEditDialog.value) return false;

  for (const p of editingPeople.value) {
    const original = _originalPeopleById.get(p.guestId);
    if (!original) return true;
    const patch = diffGuest(original, p);
    if (Object.keys(patch).length) return true;
  }
  return false;
});

function resetEdits() {
  editingPeople.value = people.value.map((p) => JSON.parse(JSON.stringify(p)));
}

function closeEditDialog() {
  if (isDirty.value) resetEdits();
  showEditDialog.value = false;
  isEditing.value = false;
}

function toggleEdit() {
  editingPeople.value = people.value.map((p) => JSON.parse(JSON.stringify(p)));
  showEditDialog.value = true;
  isEditing.value = false;
}

/* ---------- Firestore listeners ---------- */

onMounted(async () => {
  const id = route.params.id;
  if (!id) {
    loading.value = false;
    return;
  }

  rsvpId.value = String(id);

  const { fs } = await ensureFirebase();

  // rsvps/{id}
  const groupRef = doc(fs, "rsvps", rsvpId.value);
  _unsubGroup = onSnapshot(
    groupRef,
    (snap) => {
      if (snap.exists()) {
        groupDoc.value = { id: snap.id, ...snap.data() };
        return;
      }

      if (rsvpId.value === "couple") {
        groupDoc.value = { id: "couple", isCoupleGroup: true };
      } else {
        groupDoc.value = null;
      }
    },
    (err) => {
      console.error("[AdminRsvpDetail] group listen error", err);
      showApiError(t, toast, err);
    },
  );

  // guests
  const guestsRef = collection(fs, "guests");

  // couple stored with groupId:"couple" (your current data model)
  const guestsQuery =
    rsvpId.value === "couple"
      ? query(guestsRef, where("groupId", "==", "couple"))
      : query(guestsRef, where("rsvpId", "==", rsvpId.value));

  _unsubGuests = onSnapshot(
    guestsQuery,
    (snap) => {
      const list = [];
      snap.forEach((d) => {
        list.push(normalizeGuest(d.id, d.data()));
      });

      list.sort((a, b) => (a.index ?? 0) - (b.index ?? 0));

      if (!showEditDialog.value) {
        people.value = list;

        _originalPeopleById.clear();
        list.forEach((p) =>
          _originalPeopleById.set(p.guestId, JSON.parse(JSON.stringify(p))),
        );
      }

      loading.value = false;
    },
    (err) => {
      console.error("[AdminRsvpDetail] guests listen error", err);
      loading.value = false;
      showApiError(t, toast, err);
    },
  );
});

onBeforeUnmount(() => {
  stopAudio();
  try {
    _unsubGroup?.();
  } catch {}
  try {
    _unsubGuests?.();
  } catch {}
});
</script>

<style scoped>
:deep(.detail-child-checkbox.p-checkbox-checked .p-checkbox-box) {
  background: var(--accent-color) !important;
  border-color: var(--accent-color) !important;
}

.detail-child-label {
  margin-left: 0.45rem;
}
</style>
