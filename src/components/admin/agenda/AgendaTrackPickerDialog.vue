<!-- src/components/admin/agenda/AgendaTrackPickerDialog.vue -->
<template>
  <Dialog
    v-model:visible="localVisible"
    modal
    :maximizable="true"
    class="track-picker-dialog"
    :style="{ width: '82vw', height: '85vh' }"
    :breakpoints="{ '960px': '98vw', '640px': '100vw' }"
  >
    <template #header>
      <div class="flex flex-col gap-1">
        <p class="font-semibold">{{ t("admin.agenda.trackPicker.title") }}</p>
        <p class="text-xs opacity-70">
          {{ t("admin.agenda.trackPicker.subtitle") }}
        </p>
      </div>
    </template>

    <div class="space-y-3 mt-2">
      <div class="flex items-center justify-between gap-2">
        <div class="flex gap-2">
          <Button
            type="button"
            size="small"
            severity="secondary"
            :text="tab !== 'playlist'"
            icon="pi pi-music"
            :label="t('admin.agenda.trackPicker.tabs.playlist')"
            @click="tab = 'playlist'"
          />
          <Button
            type="button"
            size="small"
            severity="secondary"
            :text="tab !== 'itunes'"
            icon="pi pi-search"
            :label="t('admin.agenda.trackPicker.tabs.itunes')"
            @click="tab = 'itunes'"
          />
        </div>
      </div>

      <!-- FILTER (uniquement playlist) -->
      <div
        v-if="tab === 'playlist'"
        class="grid grid-cols-1 md:grid-cols-3 gap-2"
      >
        <div class="md:col-span-2">
          <InputText
            v-model="q"
            class="w-full"
            :placeholder="t('admin.agenda.trackPicker.filter_placeholder')"
          />
        </div>
        <div class="flex items-center gap-2">
          <Button
            type="button"
            size="small"
            severity="secondary"
            text
            icon="pi pi-times"
            :label="t('common.clear')"
            @click="q = ''"
          />
          <span class="text-xs opacity-70 ml-auto">
            {{ countLabel }}
          </span>
        </div>
      </div>

      <!-- PLAYLIST TAB -->
      <div
        v-if="tab === 'playlist'"
        class="space-y-2"
      >
        <div
          v-if="loading"
          class="text-xs opacity-70"
        >
          {{ t("common.loading") }}
        </div>

        <div
          v-else-if="filteredPlaylist.length"
          class="space-y-2"
        >
          <div
            v-for="song in filteredPlaylist"
            :key="song.id"
            class="flex items-center gap-3 rounded-lg border border-gray-200 bg-white px-3 py-2"
          >
            <div
              class="relative w-12 h-12 rounded-lg overflow-hidden bg-gray-100 flex items-center justify-center flex-shrink-0"
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
              ></i>

              <!-- Play/Pause overlay -->
              <button
                v-if="song.previewUrl"
                type="button"
                class="absolute inset-0 flex items-center justify-center bg-black/15 hover:bg-black/30 transition cursor-pointer"
                @click.stop="togglePlay(song.previewUrl)"
                :aria-label="
                  isPreviewPlaying(song.previewUrl)
                    ? t('common.pause')
                    : t('common.play')
                "
              >
                <span
                  class="inline-flex items-center justify-center w-7 h-7 rounded-full bg-white/75"
                >
                  <i
                    class="pi"
                    :class="
                      isPreviewPlaying(song.previewUrl) ? 'pi-pause' : 'pi-play'
                    "
                  ></i>
                </span>
              </button>
            </div>

            <div class="min-w-0 flex-1">
              <p class="font-semibold truncate">{{ song.title || "—" }}</p>
              <p class="text-xs text-gray-600 truncate">
                {{ song.artist || "—" }}
              </p>
              <p
                v-if="song.album"
                class="text-[11px] text-gray-400 truncate"
              >
                {{ song.album }}
              </p>
              <p
                class="text-[11px] text-gray-400 truncate"
                v-if="song.proposedByName"
              >
                {{
                  t("admin.agenda.trackPicker.proposed_by", {
                    name: song.proposedByName,
                  })
                }}
              </p>
            </div>

            <div class="flex items-center gap-2">
              <template v-if="isAddedTrack(toTrackRefFromPlaylist(song))">
                <span
                  class="text-xs text-green-700 inline-flex items-center gap-1"
                >
                  <i class="pi pi-check" />
                  {{ t("common.added") }}
                </span>
              </template>

              <Button
                v-else
                type="button"
                size="small"
                severity="secondary"
                icon="pi pi-plus"
                :label="t('common.add')"
                @click="pickFromPlaylist(song)"
              />
            </div>
          </div>
        </div>

        <ContentViewer
          v-else
          class="text-xs opacity-70"
          :empty-text="
            playlistError
              ? t('admin.agenda.trackPicker.playlist_unavailable')
              : t('admin.agenda.trackPicker.empty_playlist')
          "
        />
      </div>

      <!-- ITUNES TAB -->
      <div
        v-else
        class="space-y-2"
      >
        <!-- Recherche (sans dropdown suggestions) -->
        <div class="flex gap-2">
          <InputText
            v-model="itunesQuery"
            class="w-full"
            :placeholder="t('admin.agenda.trackPicker.itunes_placeholder')"
          />

          <Button
            size="small"
            type="button"
            icon="pi pi-refresh"
            severity="secondary"
            :label="t('common.reset')"
            @click="resetItunes()"
          />
        </div>

        <!-- Compteur (itunes) -->
        <div class="flex items-center justify-end">
          <span class="text-xs opacity-70">{{ countLabel }}</span>
        </div>

        <div
          v-if="itunesLoading"
          class="text-xs opacity-70"
        >
          {{ t("admin.agenda.trackPicker.searching") }}
        </div>

        <!-- Résultats iTunes (ils remplacent les “suggestions”) -->
        <div
          v-else-if="itunesResults.length"
          class="space-y-2"
        >
          <div
            v-for="tr in itunesResults"
            :key="tr.id"
            class="flex items-center gap-3 rounded-lg border border-gray-200 bg-white px-3 py-2"
          >
            <div
              class="relative w-12 h-12 rounded-lg overflow-hidden bg-gray-100 flex items-center justify-center flex-shrink-0"
            >
              <img
                v-if="tr.artworkUrl"
                :src="tr.artworkUrl"
                alt=""
                class="w-full h-full object-cover"
                loading="lazy"
              />
              <i
                v-else
                class="pi pi-wave-pulse text-gray-400 text-xs"
              ></i>

              <!-- Play/Pause overlay -->
              <button
                v-if="tr.previewUrl"
                type="button"
                class="absolute inset-0 flex items-center justify-center bg-black/15 hover:bg-black/30 transition cursor-pointer"
                @click.stop="togglePlay(tr.previewUrl)"
                :aria-label="
                  isPreviewPlaying(tr.previewUrl)
                    ? t('common.pause')
                    : t('common.play')
                "
              >
                <span
                  class="inline-flex items-center justify-center w-7 h-7 rounded-full bg-white/75"
                >
                  <i
                    class="pi"
                    :class="
                      isPreviewPlaying(tr.previewUrl) ? 'pi-pause' : 'pi-play'
                    "
                  ></i>
                </span>
              </button>
            </div>

            <div class="min-w-0 flex-1">
              <p class="font-semibold truncate">{{ tr.title || "—" }}</p>
              <p class="text-xs text-gray-600 truncate">
                {{ tr.artist || "—" }}
              </p>
              <p
                v-if="tr.album"
                class="text-[11px] text-gray-400 truncate"
              >
                {{ tr.album }}
              </p>
            </div>

            <div class="flex items-center gap-2">
              <template v-if="isAddedTrack({ id: tr.id, source: 'api' })">
                <span
                  class="text-xs text-green-700 inline-flex items-center gap-1"
                >
                  <i class="pi pi-check" />
                  {{ t("common.added") }}
                </span>
              </template>

              <Button
                v-else
                type="button"
                size="small"
                severity="secondary"
                icon="pi pi-plus"
                :label="t('common.add')"
                @click="pickFromItunes(tr)"
              />
            </div>
          </div>
        </div>

        <p
          v-else
          class="text-xs opacity-70"
        >
          {{ t("admin.agenda.trackPicker.min_chars") }}
        </p>
      </div>
    </div>

    <audio
      ref="audioRef"
      class="hidden"
      @ended="onAudioEnded"
    ></audio>
  </Dialog>
</template>

<script setup>
import { computed, ref, watch, onBeforeUnmount } from "vue";

import Dialog from "primevue/dialog";
import Button from "primevue/button";
import InputText from "primevue/inputtext";

import { usePlaylistStore } from "@/stores/playlistStore";
import { useLang } from "@/composables/useLang";
import ContentViewer from "@/components/utils/ContentViewer.vue";

const tab = ref("playlist");
const q = ref("");
const audioRef = ref(null);
const currentPreviewUrl = ref(null);
const { t } = useLang();

const playlistStore = usePlaylistStore();

const props = defineProps({
  visible: { type: Boolean, default: false },
});

const emit = defineEmits(["update:visible", "pick"]);

const localVisible = computed({
  get: () => props.visible,
  set: (v) => emit("update:visible", v),
});

const loading = computed(() => playlistStore.loading);
const playlistError = computed(() => playlistStore.error);
const playlist = computed(() => playlistStore.visibleSongs);

// Abonnement uniquement quand le dialog est ouvert
watch(
  () => localVisible.value,
  (vis) => {
    if (vis) playlistStore.subscribe();
    else playlistStore.unsubscribe();
  },
  { immediate: true }
);

const filteredPlaylist = computed(() => {
  const needle = q.value.trim().toLowerCase();
  if (!needle) return playlist.value;
  return playlist.value.filter((s) => {
    const hay =
      `${s.title} ${s.artist} ${s.album} ${s.proposedByName}`.toLowerCase();
    return hay.includes(needle);
  });
});

const countLabel = computed(() => {
  if (tab.value === "playlist") {
    return t("admin.agenda.trackPicker.count_playlist", {
      n: filteredPlaylist.value.length,
    });
  }
  return t("admin.agenda.trackPicker.count_itunes", {
    n: itunesResults.value.length,
  });
});

// --- Ajouté
const addedKeys = ref(new Set());
function trackKey(tr) {
  return `${tr?.source || ""}:${String(tr?.id || "")}`;
}
function markAdded(trackRef) {
  const next = new Set(addedKeys.value);
  next.add(trackKey(trackRef));
  addedKeys.value = next;
}
function isAddedTrack(trackRef) {
  return addedKeys.value.has(trackKey(trackRef));
}

function toTrackRefFromPlaylist(song) {
  return {
    id: song.id,
    source: "playlist",
    title: song.title || "",
    artist: song.artist || "",
    album: song.album || "",
    artworkUrl: song.artworkUrl || "",
    previewUrl: song.previewUrl || "",
  };
}

function pickFromPlaylist(song) {
  const ref = toTrackRefFromPlaylist(song);
  emit("pick", ref);
  markAdded(ref);
}

/* ---- iTunes: identique à ton code actuel ---- */
const ITUNES_ENDPOINT = "https://itunes.apple.com/search";
const itunesQuery = ref("");
const itunesLoading = ref(false);
const itunesResults = ref([]);
let itunesDebounce = null;

function resetItunes() {
  stopPreview();
  itunesQuery.value = "";
  itunesResults.value = [];
}

watch(
  () => itunesQuery.value,
  (val) => {
    if (tab.value !== "itunes") return;

    if (itunesDebounce) clearTimeout(itunesDebounce);

    const qq = String(val || "").trim();
    if (qq.length < 2) {
      itunesResults.value = [];
      return;
    }

    itunesDebounce = setTimeout(async () => {
      const full = await fetchItunes(qq, 15);
      itunesResults.value = full;
    }, 300);
  }
);

async function fetchItunes(query, limit = 15) {
  itunesLoading.value = true;
  try {
    const url = `${ITUNES_ENDPOINT}?term=${encodeURIComponent(
      query
    )}&entity=song&limit=${limit}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error("ITUNES_HTTP_ERROR");
    const json = await res.json();

    return (json.results || []).map((track) => {
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
  } catch (e) {
    console.error("AgendaTrackPicker: iTunes error", e);
    return [];
  } finally {
    itunesLoading.value = false;
  }
}

function pickFromItunes(tr) {
  const ref = {
    id: tr.id,
    source: "api",
    title: tr.title || "",
    artist: tr.artist || "",
    album: tr.album || "",
    artworkUrl: tr.artworkUrl || "",
    previewUrl: tr.previewUrl || "",
  };
  emit("pick", ref);
  markAdded(ref);
}

function isPreviewPlaying(url) {
  return !!url && currentPreviewUrl.value === url;
}

function stopPreview() {
  const audio = audioRef.value;
  if (!audio) return;
  audio.pause();
  audio.removeAttribute("src");
  audio.load();
  currentPreviewUrl.value = null;
}

function togglePlay(url) {
  if (!url) return;
  const audio = audioRef.value;
  if (!audio) return;

  // pause si même url
  if (currentPreviewUrl.value === url && !audio.paused) {
    stopPreview();
    return;
  }

  currentPreviewUrl.value = url;
  audio.src = url;
  audio.play().catch(() => {
    currentPreviewUrl.value = null;
  });
}

function onAudioEnded() {
  currentPreviewUrl.value = null;
}

watch(
  () => localVisible.value,
  (vis) => {
    if (!vis) stopPreview();
  }
);

watch(
  () => tab.value,
  () => {
    stopPreview();
  }
);

onBeforeUnmount(() => {
  playlistStore.unsubscribe();
  stopPreview();
});
</script>

<style scoped>
:deep(.track-picker-dialog.p-dialog.p-dialog-maximized) {
  width: 100vw !important;
  max-width: 100vw !important;
  height: 100vh !important;
  top: 0 !important;
  left: 0 !important;
}
</style>
