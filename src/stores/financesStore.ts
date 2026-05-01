// src/stores/financesStore.js
import { defineStore } from "pinia";
import { api } from "@/services/api";
import {
  ensureFirebase,
  doc,
  collection,
  onSnapshot,
  query,
  orderBy,
} from "@/services/firebaseClient";
import type { DocumentData, FirestoreError, Unsubscribe } from "firebase/firestore";

type Category = {
  id: string;
  label: string;
  order: number;
  createdAt: number;
  updatedAt: number;
};
type Payer = Category;
type Expense = {
  id: string;
  label: string;
  amount: number;
  category: string | null;
  payer: string | null;
  paid: boolean;
  note: string;
  date: number;
  createdAt: number;
  updatedAt: number;
};
type FinancesState = {
  budgetTotal: number;
  giftsTotal: number;
  presentTotal: number | null;
  categories: Category[];
  payers: Payer[];
  expenses: Expense[];
  loading: boolean;
  error: string;
  _unsubs: Unsubscribe[];
};

function num(v: unknown, d = 0): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : d;
}

function asString(v: unknown, d = ""): string {
  if (v === null || v === undefined) return d;
  return String(v);
}

function tsToMs(v: unknown): number {
  // Firestore Timestamp => toMillis()
  if (
    v &&
    typeof v === "object" &&
    typeof (v as { toMillis?: unknown }).toMillis === "function"
  ) {
    return (v as { toMillis: () => number }).toMillis();
  }
  // sinon: invalide
  return 0;
}

function cleanTrim(v: unknown): string {
  return asString(v, "").trim();
}

export const useFinancesStore = defineStore("adminFinances", {
  state: (): FinancesState => ({
    // DATA
    budgetTotal: 0,
    giftsTotal: 0,
    presentTotal: null,
    categories: [],
    payers: [],
    expenses: [],

    // UI
    loading: false,
    error: "",

    // realtime
    _unsubs: [],
  }),

  getters: {
    spentTotal: (s) =>
      (s.expenses || []).reduce((sum, e) => sum + num(e.amount), 0),

    netSpentTotal: (s) =>
      Math.max(
        0,
        (s.expenses || []).reduce((sum, e) => sum + num(e.amount), 0) -
          num(s.giftsTotal),
      ),

    remaining: (s) =>
      Math.max(
        0,
        num(s.budgetTotal) -
          (s.expenses || []).reduce((sum, e) => sum + num(e.amount), 0),
      ),

    percentUsed: (s) => {
      const b = num(s.budgetTotal);
      if (!b) return 0;
      const spent = (s.expenses || []).reduce((sum, e) => sum + num(e.amount), 0);
      return Math.min(100, Math.round((spent / b) * 100));
    },
  },

  actions: {
    stop() {
      this._unsubs.forEach((fn) => {
        try {
          fn?.();
        } catch {}
      });
      this._unsubs = [];
      this.loading = false;
      this.error = "";
    },

    async subscribe() {
      if (this._unsubs.length) return;

      this.loading = true;
      this.error = "";

      try {
        const { fs } = await ensureFirebase();
        this.refreshStats().catch((err) => {
          console.warn("[finances] stats refresh failed", err);
        });

        // 1) META
        const metaRef = doc(fs, "financesMeta", "main");
        const unsubMeta = onSnapshot(
          metaRef,
          (snap) => {
            const v = (snap.data() || {}) as DocumentData;
            this.budgetTotal = num(v.budgetTotal, 0);
            this.giftsTotal = num(v.giftsTotal, 0);
          },
          (err: FirestoreError) => {
            console.error("[finances] meta snapshot error", err);
            this.error = "FINANCES_META_SUBSCRIBE_ERROR";
          }
        );

        // 2) CATEGORIES
        const catQ = query(
          collection(fs, "financesCategories"),
          orderBy("order", "asc")
        );
        const unsubCats = onSnapshot(
          catQ,
          (snap) => {
            this.categories = snap.docs.map((d) => {
              const v = (d.data() || {}) as DocumentData;
              return {
                id: d.id,
                label: cleanTrim(v.label),
                order: num(v.order, 0),
                createdAt: tsToMs(v.createdAt),
                updatedAt: tsToMs(v.updatedAt),
              };
            });
          },
          (err: FirestoreError) => {
            console.error("[finances] categories snapshot error", err);
            this.error = "FINANCES_CATEGORIES_SUBSCRIBE_ERROR";
          }
        );

        // 3) PAYERS
        const payQ = query(
          collection(fs, "financesPayers"),
          orderBy("order", "asc")
        );
        const unsubPayers = onSnapshot(
          payQ,
          (snap) => {
            this.payers = snap.docs.map((d) => {
              const v = (d.data() || {}) as DocumentData;
              return {
                id: d.id,
                label: cleanTrim(v.label),
                order: num(v.order, 0),
                createdAt: tsToMs(v.createdAt),
                updatedAt: tsToMs(v.updatedAt),
              };
            });
          },
          (err: FirestoreError) => {
            console.error("[finances] payers snapshot error", err);
            this.error = "FINANCES_PAYERS_SUBSCRIBE_ERROR";
          }
        );

        // 4) EXPENSES
        // On trie sur createdAt (Timestamp). Si tu as des vieux docs sans createdAt, ça plantera le query.
        // Dans ce cas: supprime ces docs (pas de migration) ou change temporairement l'orderBy.
        const expQ = query(
          collection(fs, "financesExpenses"),
          orderBy("createdAt", "desc")
        );

        const unsubExpenses = onSnapshot(
          expQ,
          (snap) => {
            const out: Expense[] = [];

            for (const d of snap.docs) {
              const v = (d.data() || {}) as DocumentData;

              // strict: uniquement le modèle canonique
              const label = cleanTrim(v.label);
              const amount = num(v.amount, NaN); // NaN => invalide
              const category = cleanTrim(v.category) || null;

              // garde-fous: si doc invalide => on skip (sinon ton UI meurt)
              if (!label || !Number.isFinite(amount) || amount < 0) {
                console.warn("[finances] skip invalid expense doc", d.id, v);
                continue;
              }

              out.push({
                id: d.id,
                label,
                amount,
                category,
                payer: cleanTrim(v.payer) || null,
                paid: !!v.paid,
                note: asString(v.note, ""),
                date: tsToMs(v.date), // 0 si null
                createdAt: tsToMs(v.createdAt),
                updatedAt: tsToMs(v.updatedAt),
              });
            }

            this.expenses = out;
            this.loading = false;
          },
          (err: FirestoreError) => {
            console.error("[finances] expenses snapshot error", err);
            this.error = "FINANCES_EXPENSES_SUBSCRIBE_ERROR";
            this.loading = false;
          }
        );

        this._unsubs = [unsubMeta, unsubCats, unsubPayers, unsubExpenses];
      } catch (e: unknown) {
        console.error("[finances] subscribe crash", e);
        this.error = "FINANCES_INIT_ERROR";
        this.loading = false;
      }
    },

    // WRITES => backend (canonique)
    async setBudgetTotal(budgetTotal: number) {
      return api.setFinancesBudget({ budgetTotal });
    },

    async refreshStats() {
      const out = (await api.getFinancesStats()) as { presentTotal?: unknown };
      this.presentTotal = num(out.presentTotal, 0);
      return out;
    },

    async addExpense(payload: Record<string, unknown>) {
      // payload doit matcher backend: label, amount, category, payer, paid, note, date(ms)
      return api.createFinancesExpense(payload);
    },

    async updateExpense(id: string, patch: Record<string, unknown>) {
      return api.patchFinancesExpense(id, patch);
    },

    async removeExpense(id: string) {
      return api.deleteFinancesExpense(id);
    },

    async createCategory(payload: Record<string, unknown>) {
      return api.createFinancesCategory(payload);
    },
    async patchCategory(id: string, patch: Record<string, unknown>) {
      return api.patchFinancesCategory(id, patch);
    },
    async deleteCategory(id: string) {
      return api.deleteFinancesCategory(id);
    },

    async createPayer(payload: Record<string, unknown>) {
      return api.createFinancesPayer(payload);
    },
    async patchPayer(id: string, patch: Record<string, unknown>) {
      return api.patchFinancesPayer(id, patch);
    },
    async deletePayer(id: string) {
      return api.deleteFinancesPayer(id);
    },
  },
});

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    try {
      const store = useFinancesStore();
      store.stop?.();
    } catch {}
  });
}
