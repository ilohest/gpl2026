// backend/hono/controllers/agenda.controller.ts
import type { Context } from "hono";
import {
  createAgendaItem,
  deleteAgendaItem,
  patchAgendaItem,
  reorderAgendaItems,
  seedAgendaTemplate,
} from "../../services/agenda.service.js";
import { jsonHttpError } from "../httpErrors.js";
import { triggerAdminDashboardSummaryRefresh } from "../../services/adminDashboardSummary.service.js";

function reqValid<T>(c: Context, target: "json" | "param" | "query"): T {
  return (c.req as { valid: (t: string) => T }).valid(target);
}

export async function createAgendaItemHandler(c: Context) {
  try {
    const payload = reqValid<Record<string, unknown>>(c, "json");
    const id = await createAgendaItem(payload, c.get("user"));
    triggerAdminDashboardSummaryRefresh();
    return c.json({ ok: true, id });
  } catch (err) {
    return jsonHttpError(c, err, "agenda.create");
  }
}

export async function patchAgendaItemHandler(c: Context) {
  try {
    const id = String(c.req.param("id") || "").trim();
    const patch = reqValid<Record<string, unknown>>(c, "json");
    await patchAgendaItem(id, patch, c.get("user"));
    triggerAdminDashboardSummaryRefresh();
    return c.json({ ok: true });
  } catch (err) {
    return jsonHttpError(c, err, "agenda.patch");
  }
}

export async function deleteAgendaItemHandler(c: Context) {
  try {
    const id = String(c.req.param("id") || "").trim();
    await deleteAgendaItem(id, c.get("user"));
    triggerAdminDashboardSummaryRefresh();
    return c.json({ ok: true });
  } catch (err) {
    return jsonHttpError(c, err, "agenda.delete");
  }
}

export async function reorderAgendaItemsHandler(c: Context) {
  try {
    const { orderedIds = [], setTimeById = {} } = reqValid<{
      orderedIds?: string[];
      setTimeById?: Record<string, string>;
    }>(c, "json");
    await reorderAgendaItems(
      {
        orderedIds: orderedIds as never[],
        setTimeById,
      },
      c.get("user"),
    );
    triggerAdminDashboardSummaryRefresh();
    return c.json({ ok: true });
  } catch (err) {
    return jsonHttpError(c, err, "agenda.reorder");
  }
}

export async function seedAgendaTemplateHandler(c: Context) {
  try {
    const { key } = reqValid<{ key: string }>(c, "json");
    await seedAgendaTemplate(key, c.get("user"));
    triggerAdminDashboardSummaryRefresh();
    return c.json({ ok: true });
  } catch (err) {
    return jsonHttpError(c, err, "agenda.seed");
  }
}
