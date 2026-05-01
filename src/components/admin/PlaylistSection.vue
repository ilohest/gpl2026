<!-- src/components/admin/PlaylistSection.vue -->
<template>
  <Card :style="{ border: '1px solid var(--accent-color)' }">
    <template #title>
      <div class="flex md:justify-between flex-col md:flex-row items-start">
        <div class="flex items-center gap-2 min-w-0">
          <p class="admin-bento-title truncate">
            <i class="pi pi-volume-up text-sm" aria-hidden="true" />
            {{ t("admin.playlist.title") }}
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

        <!-- Toggle vue -->
        <SelectButton
          v-model="viewMode"
          :options="viewModeOptions"
          option-label="label"
          option-value="value"
          class="shrink-0"
          :pt="{
            root: {
              class: 'border border-gray-200 rounded-full overflow-hidden',
            },
            button: { class: '!px-2 !py-1 text-xs' },
          }"
        >
          <template #option="{ option }">
            <div class="inline-flex items-center gap-2 px-2">
              <i class="pi" :class="option.icon" />
              <span class="hidden md:inline">{{ option.label }}</span>
            </div>
          </template>
        </SelectButton>
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
        <div class="text-xs text-left space-y-2">
          <ul class="list-disc pl-4 space-y-1">
            <li>{{ t("admin.playlist.help_1") }}</li>
            <li>{{ t("admin.playlist.help_2") }}</li>
            <li>{{ t("admin.playlist.help_3") }}</li>
            <li>{{ t("admin.playlist.help_4") }}</li>
            <li>{{ t("admin.playlist.help_5") }}</li>
          </ul>
        </div>
      </Message>

      <div v-if="showSkeleton" class="flex flex-col gap-4 mt-6">
        <div class="flex items-center justify-between gap-3">
          <Skeleton width="9rem" height="2.25rem" border-radius="999px" />
          <div class="flex items-center gap-2">
            <Skeleton width="5rem" height="0.9rem" />
            <Skeleton width="7rem" height="2.25rem" border-radius="999px" />
            <Skeleton width="7rem" height="2.25rem" border-radius="999px" />
          </div>
        </div>

        <div
          class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-3"
        >
          <Skeleton
            v-for="n in 16"
            :key="n"
            width="100%"
            height="8.5rem"
            class="rounded-xl"
          />
        </div>
      </div>

      <div v-else class="flex flex-col gap-4 mt-6">
        <!-- Grille / liste des chansons -->
        <section class="flex flex-col gap-2">
          <div
            class="flex flex-col gap-2 sm:flex-row sm:items-center"
            :class="
              me.canWrite('playlist') ? 'sm:justify-between' : 'sm:justify-end'
            "
          >
            <Can module="playlist" mode="write">
              <Button
                class="w-full sm:w-auto justify-center"
                type="button"
                size="small"
                icon="pi pi-plus"
                :label="t('admin.playlist.add_button')"
                @click="openAddSongDialog"
                :style="{
                  backgroundColor: 'var(--accent-color)',
                  borderColor: 'var(--accent-color)',
                  color: 'white',
                }"
              />
            </Can>

            <div
              class="w-full sm:w-auto sm:ml-auto flex flex-col items-start gap-2 sm:flex-row sm:gap-3"
            >
              <p class="text-xs opacity-70 w-full sm:w-auto">
                {{ visibleSongs.length }}
                {{ t("admin.playlist.songs_count_label") }}
              </p>

              <!-- Sélection multiple -->
              <Can module="playlist" mode="write">
                <Button
                  class="w-full sm:w-auto justify-center"
                  type="button"
                  size="small"
                  severity="secondary"
                  icon="pi pi-check-square"
                  text
                  :label="
                    selectionMode
                      ? t('admin.playlist.selection_on')
                      : t('admin.playlist.selection_off')
                  "
                  @click="toggleSelectionMode"
                />
              </Can>

              <!-- Export Excel -->
              <Button
                class="w-full sm:w-auto justify-center"
                type="button"
                size="small"
                icon="pi pi-download"
                severity="secondary"
                :label="t('admin.playlist.export')"
                text
                @click="exportPlaylistExcel"
              />
            </div>
          </div>

          <!-- Bandeau actions sélection -->
          <div
            v-if="selectionMode"
            class="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between rounded-lg border border-amber-200 bg-amber-50 px-3 py-2"
          >
            <p class="text-xs text-amber-800">
              <span v-if="selectedCount">
                {{
                  t("admin.playlist.selection_count").replace(
                    "{count}",
                    selectedCount,
                  )
                }}
              </span>
              <span v-else>
                {{ t("admin.playlist.selection_hint") }}
              </span>
            </p>

            <div class="flex flex-wrap items-center gap-2 sm:justify-end">
              <Button
                type="button"
                size="small"
                severity="secondary"
                class="!text-xs"
                :label="t('admin.playlist.select_all')"
                @click="selectAllVisible"
              />
              <Button
                type="button"
                size="small"
                severity="secondary"
                class="!text-xs"
                :label="t('common.clear_selection')"
                @click="clearSelection"
              />
              <Button
                type="button"
                size="small"
                severity="danger"
                class="!text-xs"
                icon="pi pi-trash"
                :disabled="!selectedCount"
                :label="t('admin.playlist.bulk_delete')"
                @click="deleteSelectedSongs"
              />
            </div>
          </div>

          <div v-if="visibleSongs.length">
            <!-- GRID VUE -->
            <Draggable
              v-if="viewMode === 'grid'"
              v-model="visibleSongsModel"
              item-key="id"
              :disabled="selectionMode"
              handle=".drag-handle"
              @end="onDragEnd"
              class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-3"
            >
              <template #item="{ element: song }">
                <div
                  class="rounded-xl border border-gray-200 bg-white p-2 flex flex-col gap-2 shadow-sm"
                  :class="
                    selectionMode && isSelected(song)
                      ? 'ring-2 ring-[var(--accent-color)] ring-offset-1'
                      : ''
                  "
                >
                  <div
                    class="relative w-full aspect-square rounded-lg overflow-hidden bg-gray-100 flex items-center justify-center"
                  >
                    <button
                      v-if="!selectionMode"
                      type="button"
                      class="drag-handle absolute top-1 right-1 w-6 h-6 rounded bg-white/60 border border-none flex items-center justify-center z-20 cursor-grab"
                      :title="t('common.drag', 'Déplacer')"
                      @click.prevent
                    >
                      <i
                        class="pi pi-bars drag-handle text-[11px] text-gray-600"
                      />
                    </button>

                    <button
                      v-if="selectionMode"
                      type="button"
                      class="absolute top-1 left-1 w-5 h-5 rounded bg-white/90 border border-gray-300 flex items-center justify-center text-[10px] z-20"
                      @click.stop="toggleSongSelection(song.id)"
                    >
                      <i
                        class="pi"
                        :class="
                          isSelected(song)
                            ? 'pi-check-square text-[var(--accent-color)]'
                            : 'pi-square text-gray-400'
                        "
                      />
                    </button>

                    <img
                      v-if="song.artworkUrl"
                      :src="song.artworkUrl"
                      alt=""
                      class="w-full h-full object-cover"
                      loading="lazy"
                    />
                    <i v-else class="pi pi-wave-pulse text-gray-400 text-xs" />

                    <button
                      v-if="song.previewUrl && !selectionMode"
                      type="button"
                      class="absolute inset-0 flex items-center justify-center bg-black/20 hover:bg-black/35 cursor-pointer transition"
                      @click="togglePlay(song)"
                    >
                      <span
                        class="inline-flex items-center justify-center w-8 h-8 rounded-full bg-white/60"
                      >
                        <i
                          class="pi"
                          :class="isSongPlaying(song) ? 'pi-pause' : 'pi-play'"
                        />
                      </span>
                    </button>
                  </div>

                  <div class="min-w-0 text-left">
                    <p class="font-semibold text-[13px] truncate text-left">
                      {{ song.title || "—" }}
                    </p>
                    <p class="text-[11px] text-gray-600 truncate text-left">
                      {{ song.artist || "—" }}
                    </p>
                    <p
                      v-if="song.album"
                      class="text-[10px] text-gray-400 truncate mt-0.5 text-left"
                    >
                      {{ song.album }}
                    </p>
                  </div>

                  <div class="flex justify-between items-center mt-1">
                    <p class="text-[10px] text-gray-400 truncate max-w-[70%]">
                      <span v-if="song.proposedByName">
                        - {{ song.proposedByName }}
                      </span>
                      <span v-else>
                        - {{ t("admin.playlist.added_by_couple_long") }}
                      </span>
                    </p>
                  </div>
                </div>
              </template>
            </Draggable>

            <!-- LIST VUE -->
            <div
              v-else
              class="overflow-x-auto rounded-lg border border-gray-200 bg-white"
            >
              <div class="min-w-[860px]">
                <div
                  class="playlist-list-grid px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-gray-500 border-b border-gray-200"
                >
                  <div class="text-left">
                    {{ t("admin.playlist.col_title") }}
                  </div>
                  <div class="text-left">
                    {{ t("admin.playlist.col_artist") }}
                  </div>
                  <div class="text-left">
                    {{ t("admin.playlist.col_album") }}
                  </div>
                  <div class="text-left">
                    {{ t("admin.playlist.proposed_by") }}
                  </div>
                </div>

                <Draggable
                  v-model="visibleSongsModel"
                  item-key="id"
                  :disabled="selectionMode"
                  handle=".drag-handle"
                  @end="onDragEnd"
                  class="divide-y divide-gray-200"
                >
                  <template #item="{ element: song }">
                    <div
                      class="playlist-list-grid px-3 py-2 items-center text-sm"
                      :class="
                        selectionMode && isSelected(song)
                          ? 'bg-[var(--accent-color)]/10'
                          : ''
                      "
                    >
                      <div class="min-w-0 flex items-center gap-3">
                        <button
                          v-if="!selectionMode"
                          type="button"
                          class="drag-handle w-7 h-7 rounded border border-none bg-white flex items-center justify-center flex-shrink-0 cursor-grab"
                          :title="t('common.drag', 'Déplacer')"
                          @click.prevent
                        >
                          <i class="pi pi-bars text-[11px] text-gray-500" />
                        </button>

                        <button
                          v-if="selectionMode"
                          type="button"
                          class="w-5 h-5 rounded bg-white border border-gray-300 flex items-center justify-center text-[10px] flex-shrink-0"
                          @click.stop="toggleSongSelection(song.id)"
                        >
                          <i
                            class="pi"
                            :class="
                              isSelected(song)
                                ? 'pi-check-square text-[var(--accent-color)]'
                                : 'pi-square text-gray-400'
                            "
                          />
                        </button>

                        <div
                          class="relative w-10 h-10 rounded-md overflow-hidden bg-gray-100 flex-shrink-0 flex items-center justify-center"
                        >
                          <img
                            v-if="song.artworkUrl"
                            :src="song.artworkUrl"
                            alt=""
                            class="w-full h-full object-cover"
                            loading="lazy"
                          />
                          <i
                            v-else
                            class="pi pi-wave-pulse text-gray-400 text-xs"
                          />

                          <button
                            v-if="song.previewUrl && !selectionMode"
                            type="button"
                            class="absolute inset-0 flex items-center justify-center bg-black/15 hover:bg-black/30 transition"
                            @click="togglePlay(song)"
                          >
                            <span
                              class="inline-flex items-center justify-center w-6 h-6 rounded-full bg-white/75"
                            >
                              <i
                                class="pi text-[10px]"
                                :class="
                                  isSongPlaying(song) ? 'pi-pause' : 'pi-play'
                                "
                              />
                            </span>
                          </button>
                        </div>

                        <p class="font-semibold truncate">
                          {{ song.title || "—" }}
                        </p>
                      </div>

                      <p class="w-full truncate text-gray-700 text-left">
                        {{ song.artist || "—" }}
                      </p>

                      <p class="truncate text-gray-500 text-left">
                        {{ song.album || "—" }}
                      </p>

                      <p class="truncate text-gray-500 text-left">
                        {{
                          song.proposedByName ||
                            t("admin.playlist.added_by_couple_long")
                        }}
                      </p>
                    </div>
                  </template>
                </Draggable>
              </div>
            </div>
          </div>

          <ContentViewer
            v-else
            class="text-xs opacity-70"
            :empty-text="t('admin.playlist.empty_state')"
          />
        </section>
      </div>

      <audio ref="audioRef" class="hidden" @ended="onAudioEnded" />

      <!-- ADD SONG DIALOG -->
      <Dialog
        v-model:visible="showAddSongDialog"
        modal
        :draggable="false"
        :style="{ width: '92vw', maxWidth: '760px', height: '60vh' }"
        :content-style="{ height: 'calc(60vh - 120px)', overflow: 'visible' }"
        :breakpoints="{ '960px': '96vw', '640px': '100vw' }"
        :header="t('admin.playlist.add_dialog_title', 'Ajouter une chanson')"
        @hide="onAddSongDialogHide"
      >
        <div class="space-y-3">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
            <!-- Titre (avec suggestions) -->
            <div class="flex flex-col gap-1 relative">
              <label class="text-xs font-semibold">
                {{ t("admin.playlist.song_title") }}
              </label>
              <input
                ref="titleInputRef"
                v-model="newSong.title"
                type="text"
                class="form-input text-sm"
                :placeholder="t('admin.playlist.song_title_placeholder')"
                @focus="onTitleFocus"
                @blur="onTitleBlur"
              />

              <div
                v-if="newSong.suggestions.length"
                class="absolute left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-2xl shadow-md max-h-90 overflow-auto z-50 text-xs"
              >
                <button
                  v-for="s in newSong.suggestions"
                  :key="s.id"
                  type="button"
                  class="w-full text-left px-3 py-2 hover:bg-gray-50 flex items-center gap-2"
                  @mousedown.prevent="selectSuggestionForNewSong(s)"
                >
                  <img
                    v-if="s.artworkUrl"
                    :src="s.artworkUrl"
                    alt=""
                    class="w-8 h-8 rounded object-cover flex-shrink-0"
                    loading="lazy"
                  />
                  <div
                    v-else
                    class="w-8 h-8 rounded bg-gray-200 flex items-center justify-center flex-shrink-0"
                  >
                    <i class="pi pi-wave-pulse text-gray-400 text-[10px]" />
                  </div>

                  <div class="min-w-0">
                    <div class="font-medium truncate">{{ s.title }}</div>
                    <div class="text-[11px] text-gray-500 truncate">
                      {{ s.artist }}<span v-if="s.album"> · {{ s.album }}</span>
                    </div>
                  </div>
                </button>
              </div>
            </div>

            <!-- Artiste + album -->
            <div class="flex flex-col gap-1">
              <label class="text-xs font-semibold">
                {{ t("admin.playlist.song_artist") }}
              </label>
              <input
                v-model="newSong.artist"
                type="text"
                class="form-input text-sm"
                :placeholder="t('admin.playlist.song_artist_placeholder')"
              />

              <label class="text-xs font-semibold mt-2">
                {{ t("admin.playlist.song_album") }}
              </label>
              <input
                v-model="newSong.album"
                type="text"
                class="form-input text-sm"
                :placeholder="t('admin.playlist.song_album_placeholder')"
              />
            </div>
          </div>

          <Message v-if="addSongError" severity="warn" :closable="false">
            {{ addSongError }}
          </Message>
        </div>

        <template #footer>
          <div class="flex justify-end gap-2">
            <Button
              size="small"
              severity="secondary"
              icon="pi pi-times"
              :label="t('common.cancel')"
              @click="showAddSongDialog = false"
            />
            <Button
              size="small"
              icon="pi pi-plus"
              :label="t('admin.playlist.add_button')"
              :loading="addingSong"
              :disabled="!canAddNewSong"
              @click="submitAddSong"
              :style="{
                backgroundColor: 'var(--accent-color)',
                borderColor: 'var(--accent-color)',
                color: 'white',
              }"
            />
          </div>
        </template>
      </Dialog>
    </template>
  </Card>
</template>

<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount } from "vue";
import { api } from "@/services/api";
import * as XLSX from "xlsx";

import Card from "primevue/card";
import Draggable from "vuedraggable";
import Button from "primevue/button";
import Message from "primevue/message";
import Dialog from "primevue/dialog";
import SelectButton from "primevue/selectbutton";
import { useConfirm } from "primevue/useconfirm";
import { useToast } from "primevue/usetoast";

import { useLang } from "@/composables/useLang";
import { usePlaylistStore } from "@/stores/playlistStore";
import { showApiError } from "@/utils/showApiError";
import { useMeStore } from "@/stores/meStore";
import ContentViewer from "@/components/utils/ContentViewer.vue";

const toast = useToast();
const confirm = useConfirm();
const { t } = useLang();
const playlistStore = usePlaylistStore();
const me = useMeStore();
const showSkeleton = computed(
  () =>
    playlistStore.loading &&
    !(playlistStore.songs || []).length &&
    !(playlistStore.visibleSongs || []).length,
);

const PLAYLIST_HELP_STORAGE_KEY = "help:playlist:section";

function getInitialHelpVisibility() {
  if (typeof window === "undefined") return true;
  try {
    return window.localStorage.getItem(PLAYLIST_HELP_STORAGE_KEY) !== "hidden";
  } catch {
    return true;
  }
}

const showHelp = ref(getInitialHelpVisibility());
const showAddSongDialog = ref(false);
const addingSong = ref(false);
const addSongError = ref("");
const titleInputRef = ref(null);
const viewMode = ref("grid");
const selectionMode = ref(false);
const selectedSongIds = ref([]);
const saving = ref(false);
const saveError = ref(false);

function closeHelp() {
  showHelp.value = false;
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(PLAYLIST_HELP_STORAGE_KEY, "hidden");
  } catch {
    // ignore localStorage failures
  }
}

function openHelp() {
  showHelp.value = true;
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(PLAYLIST_HELP_STORAGE_KEY);
  } catch {
    // ignore localStorage failures
  }
}

const selectedCount = computed(() => selectedSongIds.value.length);

/* ---------------- état de sauvegarde (API) ---------------- */

async function withSaving(fn) {
  saving.value = true;
  saveError.value = false;
  try {
    await fn();
  } catch (e) {
    console.error(e);
    saveError.value = true;
    showApiError(t, toast, e);
  } finally {
    saving.value = false;
  }
}

/* ---------------- UI: vue / sélection ---------------- */

function toggleSelectionMode() {
  selectionMode.value = !selectionMode.value;
  if (!selectionMode.value) selectedSongIds.value = [];
}

function isSelected(song) {
  return selectedSongIds.value.includes(song.id);
}

function toggleSongSelection(songId) {
  const arr = selectedSongIds.value;
  const idx = arr.indexOf(songId);
  if (idx === -1) arr.push(songId);
  else arr.splice(idx, 1);
}

function selectAllVisible() {
  selectedSongIds.value = visibleSongs.value.map((s) => s.id);
}

function clearSelection() {
  selectedSongIds.value = [];
}

const viewModeOptions = computed(() => [
  {
    label: t("admin.playlist.view_grid"),
    value: "grid",
    icon: "pi-th-large",
  },
  {
    label: t("admin.playlist.view_list"),
    value: "list",
    icon: "pi-list",
  },
]);

/* ---------------- Store bindings (READ ONLY realtime) ---------------- */

const visibleSongs = computed(() => playlistStore.visibleSongs);
const visibleSongsModel = ref([]);

watch(
  () => visibleSongs.value,
  (arr) => {
    visibleSongsModel.value = Array.isArray(arr) ? arr.slice() : [];
  },
  { immediate: true },
);

async function onDragEnd() {
  if (selectionMode.value) return;
  const orderedIds = visibleSongsModel.value.map((s) => s.id);
  await withSaving(() => api.reorderPlaylistSongs(orderedIds));
}

/* ---------------- Subscribe / unsubscribe (component lifetime) ---------------- */

onMounted(() => {
  playlistStore.subscribe();
});

onBeforeUnmount(() => {
  playlistStore.unsubscribe();
});

/* ---------------- Ajout manuel + iTunes suggestions ---------------- */

const ITUNES_ENDPOINT = "https://itunes.apple.com/search";

const newSong = ref({
  title: "",
  artist: "",
  album: "",
  artworkUrl: "",
  previewUrl: "",
  suggestions: [],
  _debounce: null,
});

const isTitleFocused = ref(false);

function onTitleFocus() {
  isTitleFocused.value = true;
}

function onTitleBlur() {
  isTitleFocused.value = false;
  setTimeout(() => {
    if (!isTitleFocused.value) newSong.value.suggestions = [];
  }, 150);
}

const canAddNewSong = computed(
  () => newSong.value.title.trim() || newSong.value.artist.trim(),
);

watch(
  () => newSong.value.title,
  (val) => {
    if (!isTitleFocused.value) return;

    if (newSong.value._debounce) clearTimeout(newSong.value._debounce);

    const q = (val || "").trim();
    if (!q || q.length < 2) {
      newSong.value.suggestions = [];
      return;
    }

    newSong.value._debounce = setTimeout(() => {
      fetchSongSuggestionsForNewSong(q);
    }, 300);
  },
);

async function fetchSongSuggestionsForNewSong(query) {
  try {
    const url = `${ITUNES_ENDPOINT}?term=${encodeURIComponent(
      query,
    )}&entity=song&limit=5`;
    const res = await fetch(url);
    if (!res.ok) throw new Error("ITUNES_HTTP_ERROR");
    const json = await res.json();

    newSong.value.suggestions = (json.results || []).map((track) => {
      const rawArtwork =
        track.artworkUrl100 || track.artworkUrl60 || track.artworkUrl30 || "";
      const artworkUrl = rawArtwork
        ? rawArtwork.replace(/\/[0-9]+x[0-9]+bb\./, "/100x100bb.")
        : "";

      return {
        id: String(track.trackId),
        title: track.trackName,
        artist: track.artistName,
        album: track.collectionName,
        artworkUrl,
        previewUrl: track.previewUrl || "",
      };
    });
  } catch (err) {
    console.error("Erreur suggestions iTunes (playlist):", err);
    newSong.value.suggestions = [];
  }
}

function selectSuggestionForNewSong(s) {
  if (newSong.value._debounce) {
    clearTimeout(newSong.value._debounce);
    newSong.value._debounce = null;
  }

  newSong.value.title = s.title || "";
  newSong.value.artist = s.artist || "";
  newSong.value.album = s.album || "";
  newSong.value.artworkUrl = s.artworkUrl || "";
  newSong.value.previewUrl = s.previewUrl || "";

  newSong.value.suggestions = [];
  isTitleFocused.value = false;
}

async function addNewSongToPlaylist() {
  if (!canAddNewSong.value) return;

  const payload = {
    title: newSong.value.title.trim(),
    artist: newSong.value.artist.trim(),
    album: newSong.value.album.trim(),
    artworkUrl: newSong.value.artworkUrl.trim(),
    previewUrl: newSong.value.previewUrl.trim(),
    proposedByName: "",
    proposedByRsvpId: null,
    order: -Date.now(),
  };

  await withSaving(async () => {
    const r = await api.createPlaylistSong(payload);
    const newId = r?.id;
    if (newId) {
      const ordered = [newId, ...visibleSongs.value.map((s) => s.id)];
      await api.reorderPlaylistSongs(ordered);
    }
  });

  newSong.value = {
    title: "",
    artist: "",
    album: "",
    artworkUrl: "",
    previewUrl: "",
    suggestions: [],
    _debounce: null,
  };
}

/* ---------------- Lecture previews ---------------- */

const audioRef = ref(null);
const currentPreviewUrl = ref(null);

function isSongPlaying(song) {
  return currentPreviewUrl.value === song.previewUrl;
}

function togglePlay(song) {
  if (!song.previewUrl) return;

  const audio = audioRef.value;
  if (!audio) return;

  if (currentPreviewUrl.value === song.previewUrl && !audio.paused) {
    audio.pause();
    currentPreviewUrl.value = null;
    return;
  }

  currentPreviewUrl.value = song.previewUrl;
  audio.src = song.previewUrl;
  audio.play().catch((err) => {
    console.error("Erreur lecture preview:", err);
    currentPreviewUrl.value = null;
  });
}

function onAudioEnded() {
  currentPreviewUrl.value = null;
}

/* ---------------- Export Excel ---------------- */

function exportPlaylistExcel() {
  const songs = visibleSongs.value;
  if (!songs.length) return;

  const headers = [
    t("admin.playlist.col_title", "Titre"),
    t("admin.playlist.col_artist", "Artiste"),
    t("admin.playlist.col_album", "Album"),
  ];

  const rows = songs.map((s) => [s.title || "", s.artist || "", s.album || ""]);
  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);

  ws["!cols"] = headers.map((h, i) => {
    const maxLen = Math.max(
      String(h).length,
      ...rows.map((r) => String(r[i] ?? "").length),
    );
    return { wch: Math.min(Math.max(10, maxLen + 2), 60) };
  });

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Playlist");

  const ts = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  const filename = `playlist_${ts.getFullYear()}-${pad(
    ts.getMonth() + 1,
  )}-${pad(ts.getDate())}_${pad(ts.getHours())}${pad(ts.getMinutes())}.xlsx`;

  XLSX.writeFile(wb, filename);
}

/* ---------------- Suppression groupée ---------------- */

function deleteSelectedSongs() {
  if (!selectedSongIds.value.length) return;

  confirm.require({
    message: t("admin.playlist.bulk_delete_message"),
    header: t("admin.playlist.bulk_delete_title"),
    icon: "pi pi-exclamation-triangle",
    acceptLabel: t("common.delete"),
    rejectLabel: t("common.cancel"),
    acceptClass: "p-button-danger",
    rejectClass: "p-button-secondary",
    acceptIcon: "pi pi-check",
    rejectIcon: "pi pi-times",
    accept: async () => {
      const ids = selectedSongIds.value.slice();
      selectedSongIds.value = [];
      selectionMode.value = false;

      await withSaving(async () => {
        await api.bulkDeletePlaylistSongs(ids);
      });

      if (!saveError.value) {
        toast.add({
          severity: "success",
          summary: t("common.deleted"),
          detail:
            ids.length === 1
              ? t("admin.playlist.toast_song_deleted")
              : t("admin.playlist.toast_songs_deleted", { count: ids.length }),
          life: 2500,
        });
      }
    },
  });
}

function openAddSongDialog() {
  addSongError.value = "";
  showAddSongDialog.value = true;

  // focus input après ouverture
  setTimeout(() => titleInputRef.value?.focus?.(), 0);
}

function onAddSongDialogHide() {
  // on nettoie les suggestions quand on ferme
  newSong.value.suggestions = [];
  isTitleFocused.value = false;
  if (newSong.value._debounce) {
    clearTimeout(newSong.value._debounce);
    newSong.value._debounce = null;
  }
}

async function submitAddSong() {
  if (!canAddNewSong.value) return;

  addSongError.value = "";
  addingSong.value = true;

  try {
    await addNewSongToPlaylist(); // réutilise ton implémentation existante
    showAddSongDialog.value = false;
  } catch {
    // addNewSongToPlaylist appelle déjà withSaving + showApiError,
    // mais on garde un message local si tu veux.
    addSongError.value = t("errors.generic", "Une erreur est survenue.");
  } finally {
    addingSong.value = false;
  }
}
</script>

<style scoped>
.playlist-list-grid {
  display: grid;
  grid-template-columns:
    minmax(260px, 1.8fr) minmax(180px, 1fr) minmax(200px, 1fr)
    minmax(160px, 0.9fr);
  gap: 0.75rem;
}

.form-input {
  width: 100%;
  border: 1px solid #d1d5db;
  border-radius: 0.75rem;
  padding: 0.4rem 0.6rem;
  background: white;
}
</style>
