// backend/hono/controllers/finances.controller.ts
import type { Context } from "hono";
import { admin, firestore } from "../../lib/firebase.js";
import { badRequest } from "../../utils/httpErrors.js";
import { jsonHttpError } from "../httpErrors.js";

function reqValid<T>(c: Context, target: "json" | "param" | "query"): T {
  return (c.req as { valid: (t: string) => T }).valid(target);
}

function financesMetaRef() {
  return firestore.collection("financesMeta").doc("main");
}

function financesSummaryRef() {
  return firestore.collection("adminDashboard").doc("summary");
}

function financeNowTS() {
  return admin.firestore.Timestamp.now();
}

function financeCleanStr(value: unknown, max = 140): string {
  const s = String(value ?? "").trim();
  return s.length > max ? s.slice(0, max) : s;
}

function financeNum(value: unknown): number | null {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function financeInt(value: unknown, fallback = 0): number {
  const n = Number.parseInt(String(value ?? ""), 10);
  return Number.isFinite(n) ? n : fallback;
}

function financeNumOr(value: unknown, fallback = 0): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function buildFinancesSummary({
  summarySnap,
  metaSnap,
  spentDelta = 0,
  budgetTotalOverride = null,
}: {
  summarySnap?: FirebaseFirestore.DocumentSnapshot<FirebaseFirestore.DocumentData>;
  metaSnap?: FirebaseFirestore.DocumentSnapshot<FirebaseFirestore.DocumentData>;
  spentDelta?: number;
  budgetTotalOverride?: number | null;
} = {}) {
  const summaryFin = summarySnap?.exists ? summarySnap.data()?.finances || {} : {};
  const meta = metaSnap?.exists ? metaSnap.data() || {} : {};

  const budgetTotal =
    budgetTotalOverride !== null
      ? financeNumOr(budgetTotalOverride, 0)
      : financeNumOr(meta.budgetTotal, financeNumOr(summaryFin.budgetTotal, 0));

  const giftsTotal = financeNumOr(meta.giftsTotal, financeNumOr(summaryFin.giftsTotal, 0));
  const spentBase = financeNumOr(summaryFin.spentTotal, 0);
  const spentTotal = Math.max(0, spentBase + financeNumOr(spentDelta, 0));
  const remaining = Math.max(0, budgetTotal - spentTotal);
  const percentUsed = budgetTotal
    ? Math.min(100, Math.round((spentTotal / budgetTotal) * 100))
    : 0;

  return {
    budgetTotal,
    giftsTotal,
    spentTotal,
    remaining,
    percentUsed,
  };
}

async function patchDashboardFinancesInTx(
  tx: FirebaseFirestore.Transaction,
  {
    spentDelta = 0,
    budgetTotalOverride = null,
  }: { spentDelta?: number; budgetTotalOverride?: number | null } = {},
) {
  const [summarySnap, metaSnap] = await Promise.all([
    tx.get(financesSummaryRef()),
    tx.get(financesMetaRef()),
  ]);

  const finances = buildFinancesSummary({
    summarySnap,
    metaSnap,
    spentDelta,
    budgetTotalOverride,
  });

  tx.set(
    financesSummaryRef(),
    {
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      finances,
    },
    { merge: true },
  );
}

export async function getFinancesStatsHandler(c: Context) {
  try {
    const attendingGuestsSnap = await firestore
      .collection("guests")
      .where("attending", "==", true)
      .get();

    return c.json({
      ok: true,
      presentTotal: attendingGuestsSnap.size || 0,
    });
  } catch (err) {
    return jsonHttpError(c, err, "finances.stats");
  }
}

export async function patchFinancesBudgetHandler(c: Context) {
  return createPatchFinancesBudgetHandler({
    patchBudgetTotal: async (n: number) => {
      await firestore.runTransaction(async (tx) => {
        await patchDashboardFinancesInTx(tx, { budgetTotalOverride: n });
        tx.set(financesMetaRef(), { budgetTotal: n, updatedAt: financeNowTS() }, { merge: true });
      });
    },
  })(c);
}

export function createPatchFinancesBudgetHandler({
  patchBudgetTotal,
}: {
  patchBudgetTotal: (budgetTotal: number) => Promise<void>;
}) {
  return async function patchFinancesBudgetHandler(c: Context) {
    try {
      const body = reqValid<Record<string, unknown>>(c, "json");
      const n = financeNum(body.budgetTotal);
      if (n === null || n < 0) throw badRequest("bad_budget_total");

      await patchBudgetTotal(n);

      return c.json({ ok: true, budgetTotal: n });
    } catch (err) {
      return jsonHttpError(c, err, "finances.budget.patch");
    }
  };
}

export async function createFinancesExpenseHandler(c: Context) {
  try {
    const body = reqValid<Record<string, unknown>>(c, "json");
    const label = financeCleanStr(body.label ?? body.title, 140);
    const amount = financeNum(body.amount);
    if (!label) throw badRequest("bad_label");
    if (amount === null || amount < 0) throw badRequest("bad_amount");

    const dateMs = financeNum(body.date);
    const date = dateMs !== null ? admin.firestore.Timestamp.fromMillis(dateMs) : null;

    const category = financeCleanStr(body.category ?? body.categoryId, 80) || null;
    const payer = financeCleanStr(body.payer ?? body.paidBy, 80) || null;
    const paid = !!body.paid;
    const note = financeCleanStr(body.note, 2000) || "";

    const ref = firestore.collection("financesExpenses").doc();
    const now = financeNowTS();

    await firestore.runTransaction(async (tx) => {
      await patchDashboardFinancesInTx(tx, { spentDelta: amount });
      tx.set(ref, {
        label,
        amount,
        category,
        payer,
        paid,
        note,
        date,
        createdAt: now,
        updatedAt: now,
      });
    });

    return c.json({ ok: true, id: ref.id });
  } catch (err) {
    return jsonHttpError(c, err, "finances.expenses.create");
  }
}

export async function patchFinancesExpenseHandler(c: Context) {
  try {
    const { id } = reqValid<{ id: string }>(c, "param");
    const patch = reqValid<Record<string, unknown>>(c, "json");
    const out: Record<string, unknown> = {};

    if ("label" in patch || "title" in patch) {
      out.label = financeCleanStr(patch.label ?? patch.title, 140);
      if (!out.label) throw badRequest("bad_label");
    }

    if ("amount" in patch) {
      const amount = financeNum(patch.amount);
      if (amount === null || amount < 0) throw badRequest("bad_amount");
      out.amount = amount;
    }

    if ("category" in patch || "categoryId" in patch) {
      out.category = financeCleanStr(patch.category ?? patch.categoryId, 80) || null;
    }

    if ("payer" in patch || "paidBy" in patch) {
      out.payer = financeCleanStr(patch.payer ?? patch.paidBy, 80) || null;
    }

    if ("paid" in patch) out.paid = !!patch.paid;

    if ("note" in patch) out.note = financeCleanStr(patch.note, 2000) || "";

    if ("date" in patch) {
      const dateMs = financeNum(patch.date);
      out.date = dateMs !== null ? admin.firestore.Timestamp.fromMillis(dateMs) : null;
    }

    if (!Object.keys(out).length) throw badRequest("no_allowed_fields");

    out.updatedAt = financeNowTS();

    const expenseRef = firestore.collection("financesExpenses").doc(id);
    await firestore.runTransaction(async (tx) => {
      const prevSnap = await tx.get(expenseRef);
      const prevAmount = financeNumOr(prevSnap.data()?.amount, 0);
      const nextAmount = out.amount !== undefined ? financeNumOr(out.amount, prevAmount) : prevAmount;
      const spentDelta = nextAmount - prevAmount;

      if (spentDelta !== 0) {
        await patchDashboardFinancesInTx(tx, { spentDelta });
      }

      tx.set(expenseRef, out, { merge: true });
    });

    return c.json({ ok: true, id });
  } catch (err) {
    return jsonHttpError(c, err, "finances.expenses.patch");
  }
}

export async function deleteFinancesExpenseHandler(c: Context) {
  try {
    const { id } = reqValid<{ id: string }>(c, "param");
    const expenseRef = firestore.collection("financesExpenses").doc(id);

    await firestore.runTransaction(async (tx) => {
      const prevSnap = await tx.get(expenseRef);
      const prevAmount = financeNumOr(prevSnap.data()?.amount, 0);

      if (prevAmount !== 0) {
        await patchDashboardFinancesInTx(tx, { spentDelta: -prevAmount });
      }

      tx.delete(expenseRef);
    });

    return c.json({ ok: true, id });
  } catch (err) {
    return jsonHttpError(c, err, "finances.expenses.delete");
  }
}

export async function createFinancesCategoryHandler(c: Context) {
  try {
    const body = reqValid<Record<string, unknown>>(c, "json");
    const label = financeCleanStr(body.label, 80);
    if (!label) throw badRequest("bad_label");

    const ref = firestore.collection("financesCategories").doc();
    const now = financeNowTS();
    await ref.set({
      label,
      order: financeInt(body.order, 0),
      createdAt: now,
      updatedAt: now,
    });

    const { triggerAdminDashboardSummaryRefresh } = await import(
      "../../services/adminDashboardSummary.service.js"
    );
    triggerAdminDashboardSummaryRefresh();
    return c.json({ ok: true, id: ref.id });
  } catch (err) {
    return jsonHttpError(c, err, "finances.categories.create");
  }
}

export async function patchFinancesCategoryHandler(c: Context) {
  try {
    const { id } = reqValid<{ id: string }>(c, "param");
    const patch = reqValid<Record<string, unknown>>(c, "json");
    const out: Record<string, unknown> = {};

    if ("label" in patch) {
      const label = financeCleanStr(patch.label, 80);
      if (!label) throw badRequest("bad_label");
      out.label = label;
    }
    if ("order" in patch) out.order = financeInt(patch.order, 0);

    if (!Object.keys(out).length) throw badRequest("no_allowed_fields");
    out.updatedAt = financeNowTS();

    await firestore.collection("financesCategories").doc(id).set(out, { merge: true });

    const { triggerAdminDashboardSummaryRefresh } = await import(
      "../../services/adminDashboardSummary.service.js"
    );
    triggerAdminDashboardSummaryRefresh();
    return c.json({ ok: true, id });
  } catch (err) {
    return jsonHttpError(c, err, "finances.categories.patch");
  }
}

export async function deleteFinancesCategoryHandler(c: Context) {
  try {
    const { id } = reqValid<{ id: string }>(c, "param");
    await firestore.collection("financesCategories").doc(id).delete();
    const { triggerAdminDashboardSummaryRefresh } = await import(
      "../../services/adminDashboardSummary.service.js"
    );
    triggerAdminDashboardSummaryRefresh();
    return c.json({ ok: true, id });
  } catch (err) {
    return jsonHttpError(c, err, "finances.categories.delete");
  }
}

export async function createFinancesPayerHandler(c: Context) {
  try {
    const body = reqValid<Record<string, unknown>>(c, "json");
    const label = financeCleanStr(body.label, 80);
    if (!label) throw badRequest("bad_label");

    const ref = firestore.collection("financesPayers").doc();
    const now = financeNowTS();
    await ref.set({
      label,
      order: financeInt(body.order, 0),
      createdAt: now,
      updatedAt: now,
    });

    const { triggerAdminDashboardSummaryRefresh } = await import(
      "../../services/adminDashboardSummary.service.js"
    );
    triggerAdminDashboardSummaryRefresh();
    return c.json({ ok: true, id: ref.id });
  } catch (err) {
    return jsonHttpError(c, err, "finances.payers.create");
  }
}

export async function patchFinancesPayerHandler(c: Context) {
  try {
    const { id } = reqValid<{ id: string }>(c, "param");
    const patch = reqValid<Record<string, unknown>>(c, "json");
    const out: Record<string, unknown> = {};

    if ("label" in patch) {
      const label = financeCleanStr(patch.label, 80);
      if (!label) throw badRequest("bad_label");
      out.label = label;
    }
    if ("order" in patch) out.order = financeInt(patch.order, 0);

    if (!Object.keys(out).length) throw badRequest("no_allowed_fields");
    out.updatedAt = financeNowTS();

    await firestore.collection("financesPayers").doc(id).set(out, { merge: true });

    const { triggerAdminDashboardSummaryRefresh } = await import(
      "../../services/adminDashboardSummary.service.js"
    );
    triggerAdminDashboardSummaryRefresh();
    return c.json({ ok: true, id });
  } catch (err) {
    return jsonHttpError(c, err, "finances.payers.patch");
  }
}

export async function deleteFinancesPayerHandler(c: Context) {
  try {
    const { id } = reqValid<{ id: string }>(c, "param");
    await firestore.collection("financesPayers").doc(id).delete();
    const { triggerAdminDashboardSummaryRefresh } = await import(
      "../../services/adminDashboardSummary.service.js"
    );
    triggerAdminDashboardSummaryRefresh();
    return c.json({ ok: true, id });
  } catch (err) {
    return jsonHttpError(c, err, "finances.payers.delete");
  }
}
