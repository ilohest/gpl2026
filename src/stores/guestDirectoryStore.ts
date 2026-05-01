// src/stores/guestDirectoryStore.js
import { defineStore } from "pinia";
import { api } from "@/services/api";
import { ensureFirebase } from "@/services/firebaseClient";
import {
  collection,
  documentId,
  onSnapshot,
  query,
  where,
} from "firebase/firestore";
import type {
  Firestore,
  FirestoreError,
  Unsubscribe,
  DocumentData,
} from "firebase/firestore";

/* -----------------------------
   Types
----------------------------- */

type GuestDirectoryItem = {
  guestId: string;
  rsvpId: string | null;
  firstName: string;
  lastName: string;
  fullName: string;
  attending: boolean | null;
  email: string;
  dietCodes: string[];
  dietOtherText: string;
  role: string | null;
  isCouple: boolean;
};

type GuestDirectoryState = {
  items: GuestDirectoryItem[];
  loaded: boolean;
  loading: boolean;
  error: unknown;
  _lastKey: string;
  _menusRT_enabled: boolean;
  _menusRT_idsKey: string;
  _menusRT_timer: ReturnType<typeof setTimeout> | null;
  _menusRT_resubscribing: boolean;
  _menusRT_unsub: (() => void) | null;
};

/* -----------------------------
   Helpers (NEW SCHEMA ONLY)
----------------------------- */

function safeEmail(v: unknown): string {
  const s = String(v ?? "")
    .trim()
    .toLowerCase();
  return s.includes("@") ? s : "";
}

function toBoolOrNull(v: unknown): boolean | null {
  if (typeof v === "boolean") return v;
  return null;
}

function buildFullName({
  firstName,
  lastName,
  fullName,
}: {
  firstName?: unknown;
  lastName?: unknown;
  fullName?: unknown;
}): string {
  const f = String(firstName || "").trim();
  const l = String(lastName || "").trim();
  const fromParts = `${f} ${l}`.trim();
  const fromFull = String(fullName || "").trim();
  return fromFull || fromParts || "—";
}

function normItems(items: unknown): GuestDirectoryItem[] {
  const arr = Array.isArray(items) ? items : [];
  return arr
    .map((x) => {
      const row = (x || {}) as Record<string, unknown>;
      const guestId = String(row.guestId || "").trim();
      if (!guestId) return null;

      const firstName = String(row.firstName || "").trim();
      const lastName = String(row.lastName || "").trim();
      const fullName = buildFullName({
        firstName,
        lastName,
        fullName: row.fullName,
      });

      const attending = toBoolOrNull(row.attending);
      const dietCodes = Array.isArray(row.dietCodes)
        ? row.dietCodes.map((d) => String(d || "")).filter(Boolean)
        : [];
      const dietOtherText = String(row.dietOtherText || "").trim();

      return {
        guestId,
        rsvpId: String(row.rsvpId || "").trim() || null,
        firstName,
        lastName,
        fullName,
        attending,
        email: safeEmail(row.email),
        dietCodes,
        dietOtherText,
        role: String(row.role || "").trim() || null,
        isCouple: !!row.isCouple,
      };
    })
    .filter((x): x is GuestDirectoryItem => !!x);
}

function uniq(arr: string[]): string[] {
  return Array.from(new Set((arr || []).filter(Boolean)));
}

function chunk(arr: string[], size: number): string[][] {
  const out: string[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

/* -----------------------------
   Store
----------------------------- */

const IN_LIMIT = 30;

export const useGuestDirectoryStore = defineStore("guestDirectory", {
  state: (): GuestDirectoryState => ({
    items: [],
    loaded: false,
    loading: false,
    error: null,
    _lastKey: "",

    _menusRT_enabled: false,
    _menusRT_idsKey: "",
    _menusRT_timer: null,
    _menusRT_resubscribing: false,
    _menusRT_unsub: null,
  }),

  getters: {
    attending(state) {
      return (state.items || []).filter((x) => x.attending === true);
    },

    labelByGuestId(state) {
      const m = new Map<string, string>();
      for (const r of state.items || []) m.set(r.guestId, r.fullName || "—");
      return m;
    },
  },

  actions: {
    async load({
      scope = "ONLY_ATTENDING",
      fields = [] as string[],
      force = false,
    } = {}) {
      if (this.loading) return;

      const f = Array.isArray(fields) ? fields : [];
      const key = `${String(scope || "")
        .trim()
        .toUpperCase()}::${f.join(",")}`;

      if (!force && this.loaded && this._lastKey === key) return;

      this.loading = true;
      this.error = null;
      this._lastKey = key;

      try {
        const out = (await api.getGuestDirectory({ scope, fields })) as {
          items?: unknown;
        };
        this.items = normItems(out.items);
        this.loaded = true;

        this._menusRT_enabled = f.includes("menus");
        if (this._menusRT_enabled) this.scheduleMenusRealtimeSync(0);
        else this.disposeMenusRealtime();
      } catch (e: unknown) {
        this.error = e;
        this.items = [];
        this.loaded = false;
        this.disposeMenusRealtime();
        throw e;
      } finally {
        this.loading = false;
      }
    },

    reset() {
      this.disposeMenusRealtime();
      this.items = [];
      this.loaded = false;
      this.loading = false;
      this.error = null;
      this._lastKey = "";
      this._menusRT_enabled = false;
    },

    stopMenusRealtime() {
      if (this._menusRT_timer) {
        clearTimeout(this._menusRT_timer);
        this._menusRT_timer = null;
      }
      if (this._menusRT_unsub) {
        this._menusRT_unsub();
        this._menusRT_unsub = null;
      }
    },

    disposeMenusRealtime() {
      this.stopMenusRealtime();
      this._menusRT_idsKey = "";
      this._menusRT_resubscribing = false;
    },

    scheduleMenusRealtimeSync(delayMs = 250) {
      if (!this._menusRT_enabled) return;

      if (this._menusRT_timer) clearTimeout(this._menusRT_timer);
      this._menusRT_timer = setTimeout(
        () => {
          this._menusRT_timer = null;
          this.syncMenusRealtimeNow().catch((e: unknown) =>
            console.error("[guestDirectoryStore] syncMenusRealtimeNow failed", e),
          );
        },
        Math.max(0, Number(delayMs) || 0),
      );
    },

    async syncMenusRealtimeNow() {
      if (!this._menusRT_enabled) return;
      if (this._menusRT_resubscribing) return;

      this._menusRT_resubscribing = true;

      try {
        const ids = uniq((this.items || []).map((x) => x.guestId));
        const idsKey = ids.join("|");

        if (!ids.length) {
          this.disposeMenusRealtime();
          return;
        }

        if (idsKey === this._menusRT_idsKey && this._menusRT_unsub) return;

        const { fs } = await ensureFirebase();
        if (!fs) {
          throw new Error("[guestDirectoryStore] Firestore fs is missing");
        }

        this._menusRT_idsKey = idsKey;
        this.stopMenusRealtime();
        this._menusRT_unsub = this._startMenusRealtime(fs, ids);
      } finally {
        this._menusRT_resubscribing = false;
      }
    },

    _startMenusRealtime(fs: Firestore, ids: string[]): () => void {
      const chunks = chunk(ids, IN_LIMIT);
      const unsubs: Unsubscribe[] = [];

      const indexByGuestId = () => {
        const m = new Map<string, number>();
        (this.items || []).forEach((x, i) => m.set(x.guestId, i));
        return m;
      };

      for (const c of chunks) {
        const q = query(collection(fs, "guests"), where(documentId(), "in", c));

        const unsub = onSnapshot(
          q,
          (snap) => {
            const map = indexByGuestId();

            for (const ch of snap.docChanges()) {
              const d = (ch.doc.data() || {}) as DocumentData;
              const guestId = String(ch.doc.id || d.guestId || "").trim();
              const idx = map.get(guestId);
              if (idx == null) continue;
              const current = this.items[idx];
              if (!current) continue;

              const next =
                ch.type === "removed"
                  ? {
                      ...current,
                      dietCodes: [],
                      dietOtherText: "",
                    }
                  : {
                      ...current,
                      dietCodes: Array.isArray(d.dietCodes)
                        ? d.dietCodes.map((x) => String(x || "")).filter(Boolean)
                        : [],
                      dietOtherText: String(d.dietOtherText || "").trim(),
                    };

              this.items.splice(idx, 1, next);
            }
          },
          (err: FirestoreError) => {
            console.error("[guestDirectoryStore] menus realtime error", err);
            this.stopMenusRealtime();
          },
        );

        unsubs.push(unsub);
      }

      return () => unsubs.forEach((u) => u());
    },
  },
});

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    try {
      const store = useGuestDirectoryStore();
      store.disposeMenusRealtime?.();
    } catch {}
  });
}
