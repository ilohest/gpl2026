// src/stores/menusStore.js
import { defineStore } from "pinia";
import {
  ensureFirebase,
  collection,
  query,
  orderBy,
  onSnapshot,
} from "@/services/firebaseClient";
import { documentId, where } from "firebase/firestore";
import { api } from "@/services/api";
import { withApiError } from "@/stores/_helpers/withApiError";
import type { DocumentData, FirestoreError, Unsubscribe } from "firebase/firestore";

const MENUS_COL = "menus";
const ASSIGN_COL = "menuAssignments";

type MenuRowLike = { guestId?: string };
type MenuItem = { id: string; name?: string; priority?: number; active?: boolean; [k: string]: unknown };
type Assignment = { menuId?: string | null; status?: string; locked?: boolean; reason?: string | null; [k: string]: unknown };
type MenusState = {
  menus: MenuItem[];
  assignments: Record<string, Assignment>;
  loading: boolean;
  _unsubMenus: Unsubscribe | null;
  _unsubAssign: (() => void) | null;
  _assignIdsKey: string;
};

export const useMenusStore = defineStore("adminMenus", {
  state: (): MenusState => ({
    menus: [],
    assignments: {},
    loading: false,

    _unsubMenus: null,
    _unsubAssign: null,
    _assignIdsKey: "",
  }),

  getters: {
    activeMenus(state) {
      return (state.menus || []).filter((m) => m?.active !== false);
    },

    menuById(state) {
      const map = new Map((state.menus || []).map((m) => [m.id, m]));
      return (id: string) => map.get(id) || null;
    },
  },

  actions: {
    async initRealtime({ guestIds = [] as string[] } = {}) {
      this.loading = true;
      const { fs } = await ensureFirebase();

      if (!this._unsubMenus) {
        const menusQ = query(
          collection(fs, MENUS_COL),
          orderBy("priority", "desc"),
        );
        this._unsubMenus = onSnapshot(
          menusQ,
          (snap) => {
            const arr: MenuItem[] = snap.docs.map((d) => ({
              id: d.id,
              ...((d.data() || {}) as DocumentData),
            }));
            arr.sort((a, b) => {
              const pa = Number(a?.priority || 0);
              const pb = Number(b?.priority || 0);
              if (pb !== pa) return pb - pa;
              return String(a?.name || "").localeCompare(String(b?.name || ""));
            });

            this.menus = arr;
            this.loading = false;
          },
          (err: FirestoreError) => {
            console.error("menus snapshot error", err);
            this.loading = false;
          },
        );
      }

      if (Array.isArray(guestIds) && guestIds.length) {
        await this.initAssignmentsRealtime(guestIds);
      } else {
        this.disposeAssignmentsRealtime();
      }
    },

    async initAssignmentsRealtime(guestIds: string[] = []) {
      const ids = Array.isArray(guestIds)
        ? guestIds.map((x) => String(x || "").trim()).filter(Boolean)
        : [];

      const idsKey = ids.join("|");
      if (idsKey && idsKey === this._assignIdsKey && this._unsubAssign) return;

      this.disposeAssignmentsRealtime();
      if (!ids.length) return;

      const { fs } = await ensureFirebase();
      const chunks = [];
      const size = 30;
      for (let i = 0; i < ids.length; i += size) {
        chunks.push(ids.slice(i, i + size));
      }

      const assignments: Record<string, Assignment> = {};
      const unsubs: Unsubscribe[] = [];

      chunks.forEach((c) => {
        const q = query(
          collection(fs, ASSIGN_COL),
          where(documentId(), "in", c),
        );

        const unsub = onSnapshot(
          q,
          (snap) => {
            const present = new Set();
            snap.forEach((d) => {
              present.add(d.id);
              assignments[d.id] = (d.data() || {}) as Assignment;
            });

            // remove missing ids for this chunk
            c.forEach((id) => {
              if (!present.has(id)) delete assignments[id];
            });

            this.assignments = { ...assignments };
          },
          (err: FirestoreError) => console.error("assignments snapshot error", err),
        );

        unsubs.push(unsub);
      });

      this._assignIdsKey = idsKey;
      this._unsubAssign = () => unsubs.forEach((u) => u());
    },

    disposeAssignmentsRealtime() {
      if (this._unsubAssign) this._unsubAssign();
      this._unsubAssign = null;
      this._assignIdsKey = "";
      this.assignments = {};
    },

    disposeRealtime() {
      if (this._unsubMenus) this._unsubMenus();
      this._unsubMenus = null;
      this.disposeAssignmentsRealtime();
    },

    async upsertMenu(menu: Record<string, unknown>) {
      return await withApiError(async () => {
        const res = (await api.upsertMenu({ ...menu })) as { id?: string };
        return res.id;
      });
    },

    async deleteMenu(menuId: string) {
      return await withApiError(() => api.deleteMenu(menuId));
    },

    async setGuestMenu({
      guestId,
      menuId,
      locked = true,
      status = "manual",
    }: {
      guestId: string;
      menuId?: string | null;
      locked?: boolean;
      status?: string;
    }) {
      if (!guestId) return;
      return await withApiError(() =>
        api.setGuestMenu(guestId, {
          menuId: menuId ?? null,
          locked: !!locked,
          status,
        }),
      );
    },

    computeMenuCounts(rows: MenuRowLike[]) {
      const list = Array.isArray(rows) ? rows : [];
      const counts = new Map();

      let unassigned = 0;
      let needsReview = 0;

      for (const r of list) {
        const guestId = r?.guestId;
        if (!guestId) continue;

        const a = this.assignments?.[guestId] || null;
        const menuId = a?.menuId ?? null;

        if (!menuId) unassigned++;
        else counts.set(menuId, (counts.get(menuId) || 0) + 1);

        if ((a?.status || "") === "needs_review") needsReview++;
      }

      return { counts, unassigned, needsReview };
    },

    getAssignmentForGuest(guestId: string) {
      return this.assignments?.[guestId] || null;
    },
  },
});

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    try {
      const store = useMenusStore();
      store.disposeRealtime?.();
    } catch {}
  });
}
