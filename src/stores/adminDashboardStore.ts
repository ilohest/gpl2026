// src/stores/adminDashboardStore.js
import { defineStore } from "pinia";
import { ensureFirebase, doc, onSnapshot } from "@/services/firebaseClient";
import { api } from "@/services/api";
import type { FirestoreError, Unsubscribe } from "firebase/firestore";

const EMPTY_SUMMARY = {
  rsvp: {
    attending: 0,
    plusOnes: 0,
    declinedCount: 0,
    transport: 0,
    dietYes: 0,
    lastResponse: null,
  },
  finances: {
    budgetTotal: 0,
    giftsTotal: 0,
    spentTotal: 0,
    remaining: 0,
    percentUsed: 0,
    recentExpenses: [],
  },
  menus: {
    activeCount: 0,
    needsReview: 0,
    totalAssignments: 0,
    top: [],
  },
  seating: {
    totalGuests: 0,
    totalTables: 0,
    unassignedCount: 0,
  },
  email: {
    lastMassEmailAt: null,
    lastMassEmailSubject: null,
    lastMassEmailPreview: null,
  },
  blog: {
    lastPostAt: null,
    lastImage: null,
  },
  playlist: {
    totalCount: 0,
  },
  agenda: {
    totalCount: 0,
    next: null,
    first: null,
    last: null,
    upcoming: [],
  },
  planner: {
    totalCount: 0,
    pendingCount: 0,
    next: null,
    upcoming: [],
  },
  updatedAt: null,
};

type SummarySliceKey = Exclude<keyof typeof EMPTY_SUMMARY, "updatedAt">;

const MODULE_CONFIG = {
  rsvp: { docId: "rsvp", key: "rsvp" },
  finances: { docId: "finances", key: "finances" },
  menus: { docId: "menus", key: "menus" },
  seating: { docId: "seating", key: "seating" },
  emails: { docId: "emails", key: "email" },
  blog: { docId: "blog", key: "blog" },
  playlist: { docId: "playlist", key: "playlist" },
  agenda: { docId: "agenda", key: "agenda" },
  planner: { docId: "planner", key: "planner" },
} as const satisfies Record<string, { docId: string; key: SummarySliceKey }>;

type SummaryModuleName = keyof typeof MODULE_CONFIG;
type SummaryDocId = (typeof MODULE_CONFIG)[SummaryModuleName]["docId"];

export const useAdminDashboardStore = defineStore("adminDashboard", {
  state: () => ({
    loading: false,
    error: null as FirestoreError | Error | null,
    summary: { ...EMPTY_SUMMARY },
    _unsubs: {} as Partial<Record<SummaryDocId, Unsubscribe>>,
    _modulesKey: "",
  }),

  getters: {
    hasSummary: (s) => !!s.summary,
  },

  actions: {
    stop() {
      Object.values(this._unsubs || {}).forEach((unsub) => {
        try {
          unsub?.();
        } catch {}
      });
      this._unsubs = {};
      this._modulesKey = "";
      this.loading = false;
      this.error = null;
      this.summary = { ...EMPTY_SUMMARY };
    },

    async refresh() {
      try {
        await api.refreshAdminDashboardSummary();
      } catch (e: unknown) {
        // best-effort: don't block UI
        const msg = e instanceof Error ? e.message : String(e ?? "");
        console.warn("[adminDashboard] refresh failed:", msg || e);
      }
    },

    async subscribeSummary({ modules = [] as string[] } = {}) {
      const normalized = [
        ...new Set(
          (Array.isArray(modules) ? modules : [])
            .map((m) => String(m || "").trim())
            .filter((m) => !!MODULE_CONFIG[m as SummaryModuleName]),
        ),
      ].sort();
      const modulesKey = normalized.join("|");
      if (modulesKey && modulesKey === this._modulesKey) return;

      this.stop();
      this.loading = true;
      this.error = null;
      this.summary = { ...EMPTY_SUMMARY };

      if (!normalized.length) {
        this.loading = false;
        return;
      }

      try {
        const { fs } = await ensureFirebase();
        let remainingInitial = normalized.length;

        normalized.forEach((moduleName) => {
          const cfg = MODULE_CONFIG[moduleName as SummaryModuleName];
          let firstEvent = true;
          const ref = doc(fs, "adminDashboard", cfg.docId);

          const markInitialLoaded = () => {
            if (!firstEvent) return;
            firstEvent = false;
            remainingInitial = Math.max(0, remainingInitial - 1);
            if (remainingInitial === 0) this.loading = false;
          };

          this._unsubs[cfg.docId] = onSnapshot(
            ref,
            (snap) => {
              const payload = snap.exists() ? (snap.data() || {}) : {};
              this.summary = {
                ...this.summary,
                [cfg.key]: {
                  ...EMPTY_SUMMARY[cfg.key],
                  ...payload,
                },
              };
              markInitialLoaded();
            },
            (err: FirestoreError) => {
              console.error(`[adminDashboard] onSnapshot error (${cfg.docId})`, err);
              this.error = err;
              markInitialLoaded();
            },
          );
        });
        this._modulesKey = modulesKey;

        // populate doc if empty/outdated (best-effort)
        this.refresh();
      } catch (e: unknown) {
        console.error("[adminDashboard] subscribeSummary failed", e);
        this.error = e instanceof Error ? e : new Error(String(e ?? "unknown_error"));
        this.loading = false;
      }
    },
  },
});

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    try {
      const store = useAdminDashboardStore();
      store.stop?.();
    } catch {}
  });
}
