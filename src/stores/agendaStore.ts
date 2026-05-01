import { defineStore } from "pinia";
import {
  ensureFirebase,
  collection,
  query,
  orderBy,
  onSnapshot,
} from "@/services/firebaseClient";
import { api } from "@/services/api";
import { useMeStore } from "@/stores/meStore";

type Translator = (key: string, vars?: Record<string, unknown>) => string;
type Unsubscribe = () => void;

type AgendaConflict = {
  overlaps: string[];
};

type AgendaTrackRef = {
  id?: string;
  source?: string;
  title?: string;
  artist?: string;
  artworkUrl?: string;
};

type AgendaItem = Record<string, unknown> & {
  id: string;
  time: string;
  timeMinutes: number;
  durationMin: number;
  title: string;
  type: string[];
  notes: string;
  participants: string[];
  trackRefs: AgendaTrackRef[];
  location: string;
  ownerTags: string[];
  order: number;
};

type AgendaCreatePayload = Partial<Omit<AgendaItem, "id">> &
  Record<string, unknown>;
type AgendaPatchPayload = Partial<Omit<AgendaItem, "id">> &
  Record<string, unknown>;

type SetTimeByIdInput = Record<string, unknown>;

type AgendaState = {
  loading: boolean;
  unsub: Unsubscribe | null;
  items: AgendaItem[];
  conflictsById: Map<string, AgendaConflict>;
  filterTag: string | null;
  filterType: string | null;
  search: string;
};

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object") return {};
  return value as Record<string, unknown>;
}

function safeString(value: unknown): string {
  return String(value ?? "").trim();
}

function safeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((entry) => safeString(entry))
    .filter(Boolean);
}

function safeTrackRefs(value: unknown): AgendaTrackRef[] {
  if (!Array.isArray(value)) return [];
  return value.map((entry) => {
    const rec = asRecord(entry);
    const track: AgendaTrackRef = {};
    const id = safeString(rec.id);
    const source = safeString(rec.source);
    const title = safeString(rec.title);
    const artist = safeString(rec.artist);
    const artworkUrl = safeString(rec.artworkUrl);
    if (id) track.id = id;
    if (source) track.source = source;
    if (title) track.title = title;
    if (artist) track.artist = artist;
    if (artworkUrl) track.artworkUrl = artworkUrl;
    return track;
  });
}

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function normalizeParticipants(arr: unknown): string[] {
  const raw = Array.isArray(arr) ? arr : [];
  const out = raw
    .map((x) => String(x ?? "").trim())
    .filter(Boolean)
    .map((s) => (s.startsWith("name:") ? s : s));

  const m = new Map<string, string>();
  for (const s of out) m.set(s.toLowerCase(), s);
  return Array.from(m.values());
}

function normalizeTimeHHmm(s: unknown): string {
  if (!s) return "";
  const m = String(s)
    .trim()
    .match(/^(\d{1,2}):(\d{1,2})$/);
  if (!m) return "";
  const hh = Math.max(0, Math.min(23, Number.parseInt(m[1] ?? "0", 10)));
  const mm = Math.max(0, Math.min(59, Number.parseInt(m[2] ?? "0", 10)));
  return `${pad2(hh)}:${pad2(mm)}`;
}

function timeToMinutes(hhmm: unknown): number | null {
  const m = String(hhmm ?? "").match(/^(\d{2}):(\d{2})$/);
  if (!m) return null;
  return Number.parseInt(m[1] ?? "0", 10) * 60 + Number.parseInt(m[2] ?? "0", 10);
}

function toFiniteNumberOr(value: unknown, fallback: number): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function sortKey(item: Pick<AgendaItem, "timeMinutes" | "time" | "order">): {
  t: number;
  order: number;
} {
  const t = Number.isFinite(Number(item.timeMinutes))
    ? Number(item.timeMinutes)
    : (timeToMinutes(item.time) ?? 999999);

  const order = Number.isFinite(Number(item.order))
    ? Number(item.order)
    : 999999999;

  return { t, order };
}

function detectConflicts(sortedItems: AgendaItem[]): Map<string, AgendaConflict> {
  const conflictsById = new Map<string, AgendaConflict>();
  for (let i = 0; i < sortedItems.length; i += 1) {
    const a = sortedItems[i];
    if (!a) continue;
    const aStart = timeToMinutes(a.time);
    if (aStart == null) continue;
    const aDur = Number(a.durationMin) || 0;
    const aEnd = aStart + Math.max(0, aDur);

    for (let j = i + 1; j < sortedItems.length; j += 1) {
      const b = sortedItems[j];
      if (!b) continue;
      const bStart = timeToMinutes(b.time);
      if (bStart == null) continue;
      const bDur = Number(b.durationMin) || 0;
      const bEnd = bStart + Math.max(0, bDur);

      if (bStart >= aEnd) break;

      if (bStart < aEnd && bEnd > aStart) {
        const aEntry = conflictsById.get(a.id) || { overlaps: [] };
        const bEntry = conflictsById.get(b.id) || { overlaps: [] };
        aEntry.overlaps.push(b.id);
        bEntry.overlaps.push(a.id);
        conflictsById.set(a.id, aEntry);
        conflictsById.set(b.id, bEntry);
      }
    }
  }
  return conflictsById;
}

function normalizeAgendaItem(raw: Record<string, unknown>): AgendaItem {
  const time = normalizeTimeHHmm(raw.time) || String(raw.time ?? "");
  const timeMinutes = Number.isFinite(Number(raw.timeMinutes))
    ? Number(raw.timeMinutes)
    : (timeToMinutes(time) ?? 999999);

  return {
    ...raw,
    id: String(raw.id ?? ""),
    time,
    timeMinutes,
    durationMin: toFiniteNumberOr(raw.durationMin, 0),
    title: String(raw.title ?? ""),
    type: safeStringArray(raw.type),
    notes: String(raw.notes ?? ""),
    participants: normalizeParticipants(raw.participants),
    trackRefs: safeTrackRefs(raw.trackRefs),
    location: String(raw.location ?? ""),
    ownerTags: safeStringArray(raw.ownerTags),
    order: toFiniteNumberOr(raw.order, 0),
  };
}

function extractId(value: unknown): string | undefined {
  const rec = asRecord(value);
  const id = rec.id;
  return typeof id === "string" && id ? id : undefined;
}

export const useAgendaStore = defineStore("agenda", {
  state: (): AgendaState => ({
    loading: false,
    unsub: null,

    items: [],
    conflictsById: new Map<string, AgendaConflict>(),

    filterTag: null,
    filterType: null,
    search: "",
  }),

  getters: {
    sortedItems(state): AgendaItem[] {
      const arr = (state.items || []).filter(Boolean).slice();
      return arr.sort((a, b) => {
        const ka = sortKey(a);
        const kb = sortKey(b);
        if (ka.t !== kb.t) return ka.t - kb.t;
        if (ka.order !== kb.order) return ka.order - kb.order;
        return String(a.title || "").localeCompare(String(b.title || ""));
      });
    },

    filteredItems(state): AgendaItem[] {
      const q = String(state.search || "")
        .trim()
        .toLowerCase();

      return this.sortedItems.filter((it) => {
        if (state.filterType) {
          const types = Array.isArray(it.type) ? it.type : [];
          if (!types.includes(state.filterType)) return false;
        }

        if (state.filterTag && !it.ownerTags.includes(state.filterTag)) {
          return false;
        }

        if (!q) return true;

        const hay = [
          it.time,
          it.title,
          ...it.type,
          it.location,
          it.notes,
          ...it.ownerTags,
          ...it.participants,
          ...it.trackRefs.map((t) => `${t.title || ""} ${t.artist || ""}`),
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        return hay.includes(q);
      });
    },

    conflictFor(): (id: string) => AgendaConflict | null {
      return (id: string) => this.conflictsById.get(id) || null;
    },

    canReorder(): boolean {
      const me = useMeStore();
      return me.canWrite("agenda");
    },

    isReorderEnabled(state): boolean {
      if (!this.canReorder) return false;

      const hasSearch = !!String(state.search || "").trim();
      const hasType = !!state.filterType;
      const hasTag = !!state.filterTag;

      return !(hasSearch || hasType || hasTag);
    },
  },

  actions: {
    async loadAgenda(): Promise<void> {
      if (this.unsub) this.unsub();

      this.loading = true;

      const { fs } = await ensureFirebase();

      const col = collection(fs, "agendaItems");
      const q = query(
        col,
        orderBy("timeMinutes", "asc"),
        orderBy("order", "asc"),
      );

      this.unsub = onSnapshot(
        q,
        (snap) => {
          let items: AgendaItem[] = snap.docs
            .map((d) => normalizeAgendaItem({ id: d.id, ...asRecord(d.data()) }))
            .filter((it) => Boolean(it.id));

          const needsOrder = items.some((it) => it.order == null);
          if (needsOrder) {
            const tmp = [...items].sort((a, b) => {
              const ta = Number.isFinite(Number(a.timeMinutes))
                ? Number(a.timeMinutes)
                : 999999;
              const tb = Number.isFinite(Number(b.timeMinutes))
                ? Number(b.timeMinutes)
                : 999999;
              if (ta !== tb) return ta - tb;

              const oa = Number.isFinite(Number(a.order))
                ? Number(a.order)
                : 999999;
              const ob = Number.isFinite(Number(b.order))
                ? Number(b.order)
                : 999999;
              return oa - ob;
            });

            tmp.forEach((it, idx) => {
              if (it.order == null) it.order = idx * 100;
            });

            const map = new Map<string, number>(tmp.map((x) => [x.id, x.order]));
            items = items.map((it) => ({ ...it, order: map.get(it.id) ?? it.order }));
          }

          this.items = items;
          this.conflictsById = detectConflicts(this.sortedItems);
          this.loading = false;
        },
        (err: unknown) => {
          console.error("[agenda] onSnapshot error", err);
          this.loading = false;
        },
      );
    },

    async createItem(partial: AgendaCreatePayload = {}): Promise<string | undefined> {
      const payload: AgendaCreatePayload = { ...partial };
      if ("time" in payload) {
        payload.time = normalizeTimeHHmm(payload.time) || "";
      }

      const out = await api.createAgendaItem(payload);
      return extractId(out);
    },

    async updateItem(
      id: string | null | undefined,
      patch: AgendaPatchPayload,
    ): Promise<void> {
      if (!id) return;
      const payload: AgendaPatchPayload = { ...patch };
      if ("time" in payload) {
        payload.time = normalizeTimeHHmm(payload.time) || "";
      }
      await api.patchAgendaItem(id, payload);
    },

    async deleteItem(id: string | null | undefined): Promise<void> {
      if (!id) return;
      await api.deleteAgendaItem(id);
    },

    async duplicateItem(
      id: string,
      t?: Translator,
    ): Promise<string | undefined> {
      const src = this.items.find((x) => x?.id === id);
      if (!src) return undefined;

      const tr = (k: string, vars?: Record<string, unknown>): string =>
        (typeof t === "function" ? t(k, vars) : k);

      const copy: AgendaCreatePayload = { ...src };
      delete copy.id;

      delete copy.createdAt;
      delete copy.updatedAt;

      copy.title = copy.title
        ? `${String(copy.title)} ${tr("admin.agenda.copy_suffix")}`
        : tr("admin.agenda.copy_fallback");

      return this.createItem(copy);
    },

    async reorderVisible(
      orderedIds: string[],
      { setTimeById = {} }: { setTimeById?: SetTimeByIdInput } = {},
    ): Promise<void> {
      if (!this.canReorder) {
        throw new Error("Forbidden: agenda reorder not allowed");
      }

      if (!this.isReorderEnabled) {
        throw new Error("Reorder disabled while filters/search are active");
      }

      if (!Array.isArray(orderedIds) || !orderedIds.length) return;

      const idToOrder = new Map<string, number>(
        orderedIds.map((id, idx) => [id, idx * 100]),
      );

      this.items = this.items.map((it) => {
        if (!idToOrder.has(it.id)) return it;

        const next: AgendaItem = { ...it, order: idToOrder.get(it.id) ?? it.order };

        if (Object.prototype.hasOwnProperty.call(setTimeById, it.id)) {
          const t = normalizeTimeHHmm(setTimeById[it.id]) || "";
          next.time = t;
          next.timeMinutes = t ? (timeToMinutes(t) ?? 999999) : 999999;
        }

        return next;
      });

      const cleanSetTimeById: Record<string, string> = {};
      Object.entries(setTimeById || {}).forEach(([id, time]) => {
        cleanSetTimeById[id] = normalizeTimeHHmm(time) || "";
      });

      await api.reorderAgendaItems({
        orderedIds,
        setTimeById: cleanSetTimeById,
      });
    },

    async seedTemplate(key: string, t?: Translator): Promise<void> {
      const tr = (k: string, vars?: Record<string, unknown>): string =>
        (typeof t === "function" ? t(k, vars) : k);

      const templates: Record<string, AgendaCreatePayload[]> = {
        CEREMONY: [
          {
            time: "16:00",
            durationMin: 10,
            type: ["CEREMONY"],
            title: tr("admin.agenda.template.ceremony.arrival_guests"),
            ownerTags: ["OFFICIANT"],
          },
          {
            time: "16:30",
            durationMin: 5,
            type: ["MUSIC_CUE"],
            title: tr("admin.agenda.template.ceremony.couple_entrance"),
            ownerTags: ["OFFICIANT"],
          },
          {
            time: "16:35",
            durationMin: 20,
            type: ["CEREMONY"],
            title: tr("admin.agenda.template.ceremony.ceremony"),
            ownerTags: ["OFFICIANT"],
          },
          {
            time: "16:55",
            durationMin: 10,
            type: ["PHOTO"],
            title: tr("admin.agenda.template.ceremony.exit_group_photo"),
            ownerTags: ["PHOTOGRAPHER"],
          },
        ],

        COCKTAIL: [
          {
            time: "17:15",
            durationMin: 60,
            type: ["COCKTAIL"],
            title: tr("admin.agenda.template.cocktail.cocktail"),
            ownerTags: ["CATERER"],
          },
          {
            time: "17:20",
            durationMin: 30,
            type: ["PHOTO"],
            title: tr("admin.agenda.template.cocktail.couple_photos"),
            ownerTags: ["PHOTOGRAPHER"],
          },
        ],

        DINNER: [
          {
            time: "19:00",
            durationMin: 10,
            type: ["DINNER"],
            title: tr("admin.agenda.template.dinner.open_room"),
            ownerTags: ["CATERER"],
          },
          {
            time: "19:45",
            durationMin: 5,
            type: ["MUSIC_CUE"],
            title: tr("admin.agenda.template.dinner.couple_entrance"),
            ownerTags: ["DJ"],
          },
          {
            time: "19:50",
            durationMin: 40,
            type: ["DINNER"],
            title: tr("admin.agenda.template.dinner.service_starter"),
            ownerTags: ["CATERER"],
          },
          {
            time: "20:30",
            durationMin: 15,
            type: ["SPEECH"],
            title: tr("admin.agenda.template.dinner.speech_bride_witnesses"),
            ownerTags: ["WITNESSES"],
          },
          {
            time: "20:45",
            durationMin: 15,
            type: ["SPEECH"],
            title: tr("admin.agenda.template.dinner.speech_groom_witnesses"),
            ownerTags: ["WITNESSES"],
          },
          {
            time: "21:00",
            durationMin: 40,
            type: ["DINNER"],
            title: tr("admin.agenda.template.dinner.service_main"),
            ownerTags: ["CATERER"],
          },
          {
            time: "21:30",
            durationMin: 15,
            type: ["SPEECH"],
            title: tr("admin.agenda.template.dinner.speech_parents"),
            ownerTags: ["FAMILY"],
          },
        ],

        PARTY: [
          {
            time: "22:30",
            durationMin: 10,
            type: ["MUSIC_CUE"],
            title: tr("admin.agenda.template.party.open_dancefloor"),
            ownerTags: ["DJ"],
          },
          {
            time: "23:30",
            durationMin: 15,
            type: ["DINNER"],
            title: tr("admin.agenda.template.party.cake_dessert"),
            ownerTags: ["CATERER"],
          },
        ],
      };

      const pack = templates[key] || [];

      const results = await Promise.allSettled(pack.map((it) => this.createItem(it)));
      const firstFailed = results.find(
        (r): r is PromiseRejectedResult => r.status === "rejected",
      );

      if (firstFailed) {
        throw firstFailed.reason || new Error("Template seed failed");
      }
    },

    dispose(): void {
      if (this.unsub) this.unsub();
      this.unsub = null;
    },
  },
});

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    try {
      const store = useAgendaStore();
      store.dispose?.();
    } catch {
      // no-op
    }
  });
}
