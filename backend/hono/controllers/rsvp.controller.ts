// backend/hono/controllers/rsvp.controller.ts
import type { Context } from "hono";
import type {} from "../context.js";
import { jsonHttpError } from "../httpErrors.js";

function reqValid<T>(c: Context, target: "json" | "param" | "query"): T {
  return (c.req as { valid: (t: string) => T }).valid(target);
}

export async function submitRsvpHandler(c: Context) {
  try {
    const body = reqValid<Record<string, unknown>>(c, "json");
    const ip = String(c.req.header("x-forwarded-for") || "")
      .split(",")[0]
      ?.trim() || "";
    const ua = c.req.header("user-agent") || "";
    const { submitPublicRsvp } = await import("../../services/rsvps.service.js");
    const { triggerAdminDashboardSummaryRefresh } = await import(
      "../../services/adminDashboardSummary.service.js"
    );
    const result = await submitPublicRsvp({ body, ip, ua });
    triggerAdminDashboardSummaryRefresh();
    return c.json({ ok: true, id: result.rsvpId });
  } catch (err) {
    return jsonHttpError(c, err, "rsvp.submit");
  }
}

export async function sendConfirmationEmailHandler(c: Context) {
  try {
    const { rsvpId } = reqValid<{ rsvpId: string }>(c, "json");
    const { sendConfirmationEmailForRsvp } = await import("../../services/rsvps.service.js");
    const out = await sendConfirmationEmailForRsvp(rsvpId);
    return c.json(out);
  } catch (err) {
    return jsonHttpError(c, err, "rsvp.send-confirmation-email");
  }
}

export function createListRsvpsHandler({
  listRsvps,
}: {
  listRsvps: (input: { limit: number }) => Promise<unknown>;
}) {
  return async function listRsvpsHandler(c: Context) {
    try {
      const { limit = 300 } = reqValid<{ limit?: number }>(c, "query");
      const items = await listRsvps({ limit });
      return c.json({ ok: true, items });
    } catch (err) {
      return jsonHttpError(c, err, "rsvps.list");
    }
  };
}

const defaultListRsvps = async ({ limit }: { limit: number }) => {
  const { listRsvps } = await import("../../services/rsvps.service.js");
  return listRsvps({ limit });
};

export async function patchGuestHandler(c: Context) {
  try {
    const { guestId } = reqValid<{ guestId: string }>(c, "param");
    const patch = reqValid<Record<string, unknown>>(c, "json");
    const { patchGuest } = await import("../../services/rsvps.service.js");
    const { triggerAdminDashboardSummaryRefresh } = await import(
      "../../services/adminDashboardSummary.service.js"
    );
    await patchGuest({ guestId, patch });
    triggerAdminDashboardSummaryRefresh();
    return c.json({ ok: true });
  } catch (err) {
    return jsonHttpError(c, err, "rsvps.patch-guest");
  }
}

export async function deleteGuestHandler(c: Context) {
  try {
    const { guestId } = reqValid<{ guestId: string }>(c, "param");
    const { deleteGuest } = await import("../../services/rsvps.service.js");
    const { triggerAdminDashboardSummaryRefresh } = await import(
      "../../services/adminDashboardSummary.service.js"
    );
    await deleteGuest({ guestId });
    triggerAdminDashboardSummaryRefresh();
    return c.json({ ok: true });
  } catch (err) {
    return jsonHttpError(c, err, "rsvps.delete-guest");
  }
}

export async function deleteRsvpHandler(c: Context) {
  try {
    const { id } = reqValid<{ id: string }>(c, "param");
    const { deleteRsvpCascade } = await import("../../services/rsvps.service.js");
    const { triggerAdminDashboardSummaryRefresh } = await import(
      "../../services/adminDashboardSummary.service.js"
    );
    await deleteRsvpCascade({ rsvpId: id });
    triggerAdminDashboardSummaryRefresh();
    return c.json({ ok: true });
  } catch (err) {
    return jsonHttpError(c, err, "rsvps.delete");
  }
}

export async function createManualRsvpHandler(c: Context) {
  try {
    const body = reqValid<Record<string, unknown>>(c, "json");
    const uid = String(c.get("user")?.uid || "").trim();
    const createdByUid: string | null = uid || null;
    const { createManualRsvp } = await import("../../services/rsvps.service.js");
    const { triggerAdminDashboardSummaryRefresh } = await import(
      "../../services/adminDashboardSummary.service.js"
    );
    const result = await createManualRsvp({
      body,
      createdByUid,
    });
    triggerAdminDashboardSummaryRefresh();
    return c.json({ ok: true, id: result.rsvpId });
  } catch (err) {
    return jsonHttpError(c, err, "rsvps.manual");
  }
}

export async function createManualCoupleRsvpHandler(c: Context) {
  try {
    const body = reqValid<Record<string, unknown>>(c, "json");
    const createdByUid = String(c.get("user")?.uid || "").trim() || null;
    const { createManualCoupleRsvp } = await import("../../services/rsvps.service.js");
    const { triggerAdminDashboardSummaryRefresh } = await import(
      "../../services/adminDashboardSummary.service.js"
    );
    const result = await createManualCoupleRsvp({
      body,
      createdByUid,
    });
    triggerAdminDashboardSummaryRefresh();
    return c.json({ ok: true, id: result.rsvpId });
  } catch (err) {
    return jsonHttpError(c, err, "rsvps.manual-couple");
  }
}

export async function createManualRsvpGroupHandler(c: Context) {
  try {
    const body = reqValid<Record<string, unknown>>(c, "json");
    const createdByUid = String(c.get("user")?.uid || "").trim() || null;
    const { createManualRsvpGroup } = await import("../../services/rsvps.service.js");
    const { triggerAdminDashboardSummaryRefresh } = await import(
      "../../services/adminDashboardSummary.service.js"
    );
    const result = await createManualRsvpGroup({
      body,
      createdByUid,
    });
    triggerAdminDashboardSummaryRefresh();
    return c.json({ ok: true, id: result.rsvpId });
  } catch (err) {
    return jsonHttpError(c, err, "rsvps.manual-group");
  }
}

export async function addGuestToRsvpHandler(c: Context) {
  try {
    const { id } = reqValid<{ id: string }>(c, "param");
    const guest = reqValid<Record<string, unknown>>(c, "json");
    const uid = String(c.get("user")?.uid || "").trim();
    const createdByUid: string | null = uid || null;
    const { addGuestToRsvp } = await import("../../services/rsvps.service.js");
    const { triggerAdminDashboardSummaryRefresh } = await import(
      "../../services/adminDashboardSummary.service.js"
    );
    const result = await addGuestToRsvp({
      rsvpId: id,
      guest,
      createdByUid,
    });
    triggerAdminDashboardSummaryRefresh();
    return c.json({ ok: true, id: result.guestId });
  } catch (err) {
    return jsonHttpError(c, err, "rsvps.add-guest");
  }
}

export async function patchRsvpHandler(c: Context) {
  try {
    const { id } = reqValid<{ id: string }>(c, "param");
    const patch = reqValid<Record<string, unknown>>(c, "json");
    const uid = String(c.get("user")?.uid || "").trim();
    const updatedByUid: string | null = uid || null;
    const { patchRsvp } = await import("../../services/rsvps.service.js");
    const { triggerAdminDashboardSummaryRefresh } = await import(
      "../../services/adminDashboardSummary.service.js"
    );
    await patchRsvp({
      rsvpId: id,
      patch,
      updatedByUid,
    });
    triggerAdminDashboardSummaryRefresh();
    return c.json({ ok: true });
  } catch (err) {
    return jsonHttpError(c, err, "rsvps.patch");
  }
}

export const listRsvpsHandler = createListRsvpsHandler({ listRsvps: defaultListRsvps });
