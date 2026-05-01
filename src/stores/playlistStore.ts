// src/stores/playlistStore.js
import { defineStore } from "pinia";
import { ref, computed } from "vue";
import {
  ensureFirebase,
  collection,
  query,
  orderBy,
  onSnapshot,
} from "@/services/firebaseClient";
import type { Unsubscribe, DocumentData } from "firebase/firestore";

type PlaylistSong = {
  id: string;
  title: string;
  artist: string;
  album: string;
  artworkUrl: string;
  previewUrl: string;
  createdAt: unknown;
  removed: boolean;
  proposedByName: string;
  proposedByRsvpId: string | null;
  order: number;
};

function normalizeSong(id: string, d: DocumentData): PlaylistSong {
  return {
    id,
    title: String(d.title ?? "").trim(),
    artist: String(d.artist ?? "").trim(),
    album: String(d.album ?? "").trim(),
    artworkUrl: String(d.artworkUrl ?? "").trim(),
    previewUrl: String(d.previewUrl ?? "").trim(),
    createdAt: d.createdAt ?? null,
    removed: !!d.removed,
    proposedByName: String(d.proposedByName ?? "").trim(),
    proposedByRsvpId: d.proposedByRsvpId ?? null,
    order: typeof d.order === "number" ? d.order : 0,
  };
}

export const usePlaylistStore = defineStore("playlist", () => {
  const loading = ref(false);
  const error = ref("");
  const songs = ref<PlaylistSong[]>([]);

  let _unsub: Unsubscribe | null = null;

  const visibleSongs = computed(() =>
    songs.value
      .filter((s) => !s.removed)
      .slice()
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
  );

  async function subscribe() {
    if (_unsub) return;
    loading.value = true;
    error.value = "";

    try {
      const { fs } = await ensureFirebase();
      const q = query(collection(fs, "playlistSongs"), orderBy("order", "asc"));

      _unsub = onSnapshot(
        q,
        (snap) => {
          songs.value = snap.docs.map((doc) =>
            normalizeSong(doc.id, doc.data() || {})
          );
          loading.value = false;
        },
        (e) => {
          console.error("playlistStore(fs): onSnapshot error", e);
          error.value = "SUBSCRIBE_ERROR";
          songs.value = [];
          loading.value = false;
        }
      );
    } catch (e: unknown) {
      console.error("playlistStore(fs): subscribe error", e);
      error.value = "SUBSCRIBE_ERROR";
      songs.value = [];
      loading.value = false;
    }
  }

  function unsubscribe() {
    if (_unsub) _unsub();
    _unsub = null;
  }

  return { songs, visibleSongs, loading, error, subscribe, unsubscribe };
});

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    try {
      const store = usePlaylistStore();
      store.unsubscribe?.();
    } catch {}
  });
}
