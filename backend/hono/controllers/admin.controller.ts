// backend/hono/controllers/admin.controller.ts
import type { Context } from "hono";
import type {} from "../context.js";
import { jsonHttpError } from "../httpErrors.js";

type PlannerSuggestInput = {
  prompt: unknown;
  locale?: string;
  timezone?: string;
  weddingDate?: string;
};

function reqValid<T>(c: Context, target: "json" | "param" | "query"): T {
  return (c.req as { valid: (t: string) => T }).valid(target);
}

export function createRefreshDashboardSummaryHandler({
  recomputeAdminDashboardSummary: recomputeAdminDashboardSummaryImpl,
  logError = console.error,
}: {
  recomputeAdminDashboardSummary: () => Promise<unknown>;
  logError?: (...args: unknown[]) => void;
}) {
  return async function refreshDashboardSummaryHandler(c: Context) {
    try {
      const perms = c.get("user")?.permissions || [];
      if (!perms.length) return c.json({ error: "forbidden" }, 403);
      await recomputeAdminDashboardSummaryImpl();
      return c.json({ ok: true });
    } catch (err) {
      logError("[adminDashboard] refresh summary failed", err);
      return c.json({ error: "summary_refresh_failed" }, 500);
    }
  };
}

export const refreshDashboardSummaryHandler = createRefreshDashboardSummaryHandler({
  recomputeAdminDashboardSummary: async () => {
    const { recomputeAdminDashboardSummary } = await import(
      "../../services/adminDashboardSummary.service.js"
    );
    return recomputeAdminDashboardSummary();
  },
});

export async function suggestWeddingPlannerHandler(c: Context) {
  try {
    const permissions = c.get("user")?.permissions || [];
    if (!permissions.length) return c.json({ error: "forbidden" }, 403);

    const payload = reqValid<Record<string, unknown>>(c, "json");
    const plannerInput: PlannerSuggestInput = { prompt: payload.prompt };
    if (typeof payload.locale === "string")
      plannerInput.locale = payload.locale;
    if (typeof payload.timezone === "string")
      plannerInput.timezone = payload.timezone;
    if (typeof payload.weddingDate === "string")
      plannerInput.weddingDate = payload.weddingDate;

    const { generateWeddingPlannerSuggestions } = await import(
      "../../services/weddingPlanner.service.js"
    );
    const plan = await generateWeddingPlannerSuggestions(plannerInput);
    return c.json({ ok: true, plan });
  } catch (err) {
    return jsonHttpError(c, err, "wedding-planner.suggest");
  }
}

export async function listWeddingPlannerTasksHandler(c: Context) {
  try {
    const { listWeddingPlannerTasks } = await import("../../services/weddingPlanner.service.js");
    const items = await listWeddingPlannerTasks();
    return c.json({ ok: true, items });
  } catch (err) {
    return jsonHttpError(c, err, "wedding-planner.tasks.list");
  }
}

export async function createWeddingPlannerTaskHandler(c: Context) {
  try {
    const payload = reqValid<Record<string, unknown>>(c, "json");
    const { createWeddingPlannerTask } = await import("../../services/weddingPlanner.service.js");
    const { triggerAdminDashboardSummaryRefresh } = await import(
      "../../services/adminDashboardSummary.service.js"
    );
    const item = await createWeddingPlannerTask(payload, c.get("user"));
    triggerAdminDashboardSummaryRefresh();
    return c.json({ ok: true, item });
  } catch (err) {
    return jsonHttpError(c, err, "wedding-planner.tasks.create");
  }
}

export async function createWeddingPlannerTasksBulkHandler(c: Context) {
  try {
    const payload = reqValid<Record<string, unknown>>(c, "json");
    const { createWeddingPlannerTasksBulk } = await import(
      "../../services/weddingPlanner.service.js"
    );
    const { triggerAdminDashboardSummaryRefresh } = await import(
      "../../services/adminDashboardSummary.service.js"
    );
    const out = await createWeddingPlannerTasksBulk(payload, c.get("user"));
    triggerAdminDashboardSummaryRefresh();
    return c.json({ ok: true, ...out });
  } catch (err) {
    return jsonHttpError(c, err, "wedding-planner.tasks.bulk-create");
  }
}

export async function patchWeddingPlannerTaskHandler(c: Context) {
  try {
    const { id } = reqValid<{ id: string }>(c, "param");
    const payload = reqValid<Record<string, unknown>>(c, "json");
    const { patchWeddingPlannerTask } = await import("../../services/weddingPlanner.service.js");
    const { triggerAdminDashboardSummaryRefresh } = await import(
      "../../services/adminDashboardSummary.service.js"
    );
    const item = await patchWeddingPlannerTask(id, payload);
    triggerAdminDashboardSummaryRefresh();
    return c.json({ ok: true, item });
  } catch (err) {
    return jsonHttpError(c, err, "wedding-planner.tasks.patch");
  }
}

export async function deleteWeddingPlannerTaskHandler(c: Context) {
  try {
    const { id } = reqValid<{ id: string }>(c, "param");
    const { deleteWeddingPlannerTask } = await import("../../services/weddingPlanner.service.js");
    const { triggerAdminDashboardSummaryRefresh } = await import(
      "../../services/adminDashboardSummary.service.js"
    );
    await deleteWeddingPlannerTask(id);
    triggerAdminDashboardSummaryRefresh();
    return c.json({ ok: true });
  } catch (err) {
    return jsonHttpError(c, err, "wedding-planner.tasks.delete");
  }
}

export async function reorderWeddingPlannerTasksHandler(c: Context) {
  try {
    const payload = reqValid<{ orderedIds?: unknown[] }>(c, "json");
    const { reorderWeddingPlannerTasks } = await import(
      "../../services/weddingPlanner.service.js"
    );
    const { triggerAdminDashboardSummaryRefresh } = await import(
      "../../services/adminDashboardSummary.service.js"
    );
    await reorderWeddingPlannerTasks({
      orderedIds: payload.orderedIds as never[],
    });
    triggerAdminDashboardSummaryRefresh();
    return c.json({ ok: true });
  } catch (err) {
    return jsonHttpError(c, err, "wedding-planner.tasks.reorder");
  }
}

export async function aiChatHandler(c: Context) {
  try {
    const {
      message,
      history = [],
      scope,
      locale,
    } = reqValid<{
      message: string;
      history?: unknown[];
      scope?: string;
      locale?: string;
    }>(c, "json");
    const permissions = c.get("user")?.permissions || [];

    const { chat } = await import("../../services/aiChat.service.js");
    const chatFn = chat as unknown as (input: {
      message: string;
      history: unknown[];
      permissions: string[];
      scope: string;
      locale: string;
    }) => Promise<Record<string, unknown>>;

    const result = await chatFn({
      message,
      history: history as unknown[],
      permissions,
      scope: String(scope || "admin").toLowerCase(),
      locale: String(locale || "en"),
    });

    return c.json({ ok: true, ...result });
  } catch (err) {
    return jsonHttpError(c, err, "ai-chat");
  }
}
