// src/stores/seatingStore.js
import { defineStore } from "pinia";
import {
  ensureFirebase,
  collection,
  query,
  orderBy,
  onSnapshot,
} from "@/services/firebaseClient";
import { withApiError } from "@/stores/_helpers/withApiError";
import { api } from "@/services/api";
import type { DocumentData, Unsubscribe } from "firebase/firestore";

type SeatingTable = {
  order?: number;
  guestIds?: string[];
  capacity?: number;
  layoutConfig?: {
    seatsPerSide?: { top?: number; right?: number; bottom?: number; left?: number };
  };
  seatsPerSide?: { top: number; right: number; bottom: number; left: number } | null;
  [k: string]: unknown;
};

type GuestRow = {
  guestId?: string;
  id?: string;
  rsvpId?: string;
  parentId?: string;
  role?: string;
  firstName?: string;
  lastName?: string;
  fullName?: string;
  attending?: boolean | null;
  dietCodes?: string[];
  dietOtherText?: string;
  isCouple?: boolean;
};

type GuestIndexItem = {
  guestId: string;
  rsvpId: string | null;
  parentId: string | null;
  type: string;
  firstName: string;
  lastName: string;
  fullName: string | null;
  attending: boolean | null;
  dietCodes: string[];
  dietOtherText: string;
  isCouple: boolean;
};

type SeatingState = {
  loading: boolean;
  loaded: boolean;
  error: string;
  guestsIndex: Record<string, GuestIndexItem>;
  tables: Record<string, SeatingTable>;
  activeTableId: string | null;
  _unsubTables: Unsubscribe | null;
};

export const useSeatingStore = defineStore("seating", {
  state: (): SeatingState => ({
    loading: false,
    loaded: false,
    error: "",

    // Index des invités (construit à partir de rsvpRows)
    guestsIndex: {}, // { [guestId]: { ... } }

    // Tables
    tables: {}, // { [tableId]: { ... } }

    activeTableId: null,

    _unsubTables: null,
  }),

  getters: {
    // Liste des tables triées par "order"
    sortedTables(state) {
      return Object.entries(state.tables)
        .sort(([, a], [, b]) => (a.order || 0) - (b.order || 0))
        .map(([id, table]) => ({ id, ...table }));
    },

    // Ensemble de tous les guests placés sur au moins une table
    placedGuestIds(state) {
      const ids = new Set<string>();
      Object.values(state.tables).forEach((table) => {
        (table.guestIds || []).forEach((gid) => ids.add(gid));
      });
      return ids;
    },

    // Invités non assignés à une table
    unassignedGuests(state) {
      const placed = new Set<string>();
      Object.values(state.tables).forEach((table) => {
        (table.guestIds || []).forEach((gid) => placed.add(gid));
      });
      return Object.entries(state.guestsIndex)
        .filter(([gid]) => !placed.has(gid))
        .map(([id, guest]) => ({ id, ...guest }));
    },
  },

  actions: {
    async initListeners() {
      if (this.loaded) return;

      this.loading = true;

      const { fs } = await ensureFirebase();

      const col = collection(fs, "seatingTables");
      const q = query(col, orderBy("order", "asc"));

      this._unsubTables?.();
      this._unsubTables = onSnapshot(
        q,
        (snap) => {
          const normalized: Record<string, SeatingTable> = {};

          snap.forEach((doc) => {
            const table = (doc.data() || {}) as DocumentData;
            let seatsPerSide = table.seatsPerSide || null;

            if (!seatsPerSide && table.layoutConfig?.seatsPerSide) {
              seatsPerSide = {
                top: Number(table.layoutConfig.seatsPerSide.top || 0),
                right: Number(table.layoutConfig.seatsPerSide.right || 0),
                bottom: Number(table.layoutConfig.seatsPerSide.bottom || 0),
                left: Number(table.layoutConfig.seatsPerSide.left || 0),
              };
            }

            normalized[doc.id] = { ...table, seatsPerSide };
          });

          this.tables = normalized;
          this.loading = false;
          this.loaded = true;
        },
        (err) => {
          console.error("[seating] onSnapshot failed", err);
          this.loading = false;
        },
      );
    },

    /**
     * À appeler depuis AdminPage / SeatingSection
     * une fois que adminStore.rsvpRows est chargé.
     */
    syncGuestsFromDirectory(rows: GuestRow[]) {
      if (!Array.isArray(rows) || !rows.length) {
        this.guestsIndex = {};
        return;
      }

      const index: Record<string, GuestIndexItem> = {};

      rows.forEach((row, i) => {
        const guestId =
          String(row?.guestId || row?.id || "").trim() || `guest-${i}`;
        if (!guestId) return;

        const rsvpId = String(row?.rsvpId || "").trim() || null;

        // NEW schema: attending is boolean|null
        const attending =
          typeof row?.attending === "boolean" ? row.attending : null;

        index[guestId] = {
          guestId,
          rsvpId,

          parentId: row?.parentId ?? null,
          type: row?.role ?? "GUEST",

          firstName: String(row?.firstName || "").trim(),
          lastName: String(row?.lastName || "").trim(),
          fullName: String(row?.fullName || "").trim() || null,

          attending, // boolean|null

          // ✅ NEW schema diet
          dietCodes: Array.isArray(row?.dietCodes)
            ? row.dietCodes.map((x) => String(x || "")).filter(Boolean)
            : [],
          dietOtherText: String(row?.dietOtherText || "").trim(),

          isCouple: !!row?.isCouple,
        };
      });

      this.guestsIndex = index;
    },

    setActiveTable(tableId: string | null) {
      this.activeTableId = tableId;
    },

    destroy() {
      this._unsubTables?.();
      this._unsubTables = null;
      this.loaded = false;
      this.loading = false;
    },

    async createTable({
      shape,
      capacity,
      name,
      seatsPerSide,
    }: {
      shape?: string;
      capacity?: number;
      name?: string;
      seatsPerSide?: { top?: number; right?: number; bottom?: number; left?: number };
    }) {
      return await withApiError(async () => {
        const payload = { shape, capacity, name, seatsPerSide };
        const res = (await api.createSeatingTable(payload)) as { id?: string };
        if (res.id) this.activeTableId = res.id;
        return res;
      });
    },

    async updateTableMeta(tableId: string, partial: Record<string, unknown>) {
      if (!this.tables[tableId]) return;

      const prev = this.tables[tableId];
      this.tables[tableId] = { ...prev, ...(partial || {}) };

      return await withApiError(async () => {
        try {
          await api.patchSeatingTable(tableId, partial || {});
        } catch (e: unknown) {
          // rollback si API refuse
          this.tables[tableId] = prev;
          throw e;
        }
      });
    },

    async deleteTable(tableId: string) {
      if (!this.tables[tableId]) return;

      // snapshot (référence vers l'ancien state)
      const prevTables = this.tables;
      const prevActive = this.activeTableId;

      // optimistic (copy-on-write)
      const nextTables = { ...this.tables };
      delete nextTables[tableId];

      this.tables = nextTables;
      if (this.activeTableId === tableId) this.activeTableId = null;

      return await withApiError(async () => {
        try {
          await api.deleteSeatingTable(tableId);
        } catch (e: unknown) {
          // rollback
          this.tables = prevTables;
          this.activeTableId = prevActive;
          throw e;
        }
      });
    },

    async setTableGuestIds(tableId: string, nextGuestIds: string[]) {
      const currentTable = this.tables[tableId];
      if (!currentTable) return false;

      // snapshot (référence vers l'ancien state)
      const prevTables = this.tables;

      const clean = Array.from(
        new Set((nextGuestIds || []).map((x) => String(x || "")).filter(Boolean)),
      );

      // capacity
      const capacity = Number(currentTable.capacity || 0);
      const exceededLocal = !!capacity && clean.length > capacity;
      const finalIds = capacity ? clean.slice(0, capacity) : clean;

      // optimistic (copy-on-write)
      const nextTables = { ...this.tables };

      // clone toutes les tables une fois (shallow) + guestIds array
      for (const [id, t] of Object.entries(nextTables)) {
        nextTables[id] = {
          ...t,
          guestIds: Array.isArray(t.guestIds) ? [...t.guestIds] : [],
        };
      }

      // enforce 1 table (enlève de toutes les autres)
      for (const [id, t] of Object.entries(nextTables)) {
        if (id === tableId) continue;
        if (!t.guestIds?.length) continue;
        t.guestIds = t.guestIds.filter((gid) => !finalIds.includes(gid));
      }

      // set sur la table cible
      nextTables[tableId] = {
        ...nextTables[tableId],
        guestIds: finalIds,
      };

      this.tables = nextTables;

      return await withApiError(async () => {
        try {
          const res = (await api.setSeatingTableGuestIds(tableId, finalIds)) as {
            exceeded?: boolean;
          };
          return !res.exceeded && !exceededLocal;
        } catch (e: unknown) {
          // rollback (remet l'ancien objet state)
          this.tables = prevTables;
          throw e;
        }
      });
    },
  },
});

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    try {
      const store = useSeatingStore();
      store.destroy?.();
    } catch {}
  });
}
