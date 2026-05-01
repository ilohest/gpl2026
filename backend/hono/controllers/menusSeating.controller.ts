// backend/hono/controllers/menusSeating.controller.ts
import type { Context } from "hono";
import { admin, firestore } from "../../lib/firebase.js";
import { badRequest, HttpError } from "../../utils/httpErrors.js";
import { jsonHttpError } from "../httpErrors.js";

type SeatingSummaryPatch = {
  totalTables?: number;
  unassignedCount?: number;
};

function reqValid<T>(c: Context, target: "json" | "param" | "query"): T {
  return (c.req as { valid: (t: string) => T }).valid(target);
}

function numOr(value: unknown, fallback = 0): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function seatingTablesCol() {
  return firestore.collection("seatingTables");
}

function seatingSummaryRef() {
  return firestore.collection("adminDashboard").doc("summary");
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function cleanSeatingString(v: unknown): string | null {
  const s = String(v ?? "").trim();
  return s || null;
}

function summaryTotalTables(
  snap: FirebaseFirestore.DocumentSnapshot<FirebaseFirestore.DocumentData>,
): number {
  if (!snap.exists) return 0;
  return numOr(snap.data()?.seating?.totalTables, 0);
}

function summaryUnassignedCount(
  snap: FirebaseFirestore.DocumentSnapshot<FirebaseFirestore.DocumentData>,
): number {
  if (!snap.exists) return 0;
  return numOr(snap.data()?.seating?.unassignedCount, 0);
}

function mergedSeating(
  summarySnap: FirebaseFirestore.DocumentSnapshot<FirebaseFirestore.DocumentData>,
  patch: SeatingSummaryPatch,
): Record<string, unknown> {
  const current = isRecord(summarySnap.data()?.seating) ? summarySnap.data()?.seating : {};
  return {
    ...current,
    ...patch,
  };
}

function cleanSeatsPerSide(
  shape: string,
  seatsPerSide: unknown,
): { top: number; right: number; bottom: number; left: number } | null {
  if (shape !== "square") return null;
  const s = isRecord(seatsPerSide) ? seatsPerSide : {};
  return {
    top: numOr(s.top, 0),
    right: numOr(s.right, 0),
    bottom: numOr(s.bottom, 0),
    left: numOr(s.left, 0),
  };
}

export async function listMenusHandler(c: Context) {
  try {
    const { listMenus } = await import("../../services/menus.service.js");
    const items = await listMenus();
    return c.json({ items });
  } catch (err) {
    return jsonHttpError(c, err, "menus.list");
  }
}

export async function listMenuAssignmentsHandler(c: Context) {
  try {
    const { listAssignments } = await import("../../services/menus.service.js");
    const assignments = await listAssignments();
    return c.json({ assignments });
  } catch (err) {
    return jsonHttpError(c, err, "menus.assignments.list");
  }
}

export async function upsertMenuHandler(c: Context) {
  try {
    const payload = reqValid<Record<string, unknown>>(c, "json");
    const { upsertMenu } = await import("../../services/menus.service.js");
    const { triggerAdminDashboardSummaryRefresh } = await import(
      "../../services/adminDashboardSummary.service.js"
    );
    const id = await upsertMenu(payload);
    triggerAdminDashboardSummaryRefresh();
    return c.json({ ok: true, id });
  } catch (err) {
    return jsonHttpError(c, err, "menus.upsert");
  }
}

export async function deleteMenuHandler(c: Context) {
  try {
    const menuId = c.req.param("menuId");
    const { deleteMenu } = await import("../../services/menus.service.js");
    const { triggerAdminDashboardSummaryRefresh } = await import(
      "../../services/adminDashboardSummary.service.js"
    );
    await deleteMenu(menuId);
    triggerAdminDashboardSummaryRefresh();
    return c.json({ ok: true });
  } catch (err) {
    return jsonHttpError(c, err, "menus.delete");
  }
}

export async function setGuestMenuHandler(c: Context) {
  const { setGuestMenu } = await import("../../services/menus.service.js");
  const { triggerAdminDashboardSummaryRefresh } = await import(
    "../../services/adminDashboardSummary.service.js"
  );
  return createSetGuestMenuHandler({
    setGuestMenu,
    triggerAdminDashboardSummaryRefresh,
  })(c);
}

export function createSetGuestMenuHandler({
  setGuestMenu,
  triggerAdminDashboardSummaryRefresh,
}: {
  setGuestMenu: (
    guestId: string,
    payload: { menuId: string | null; locked: boolean; status: string },
  ) => Promise<unknown>;
  triggerAdminDashboardSummaryRefresh: () => void;
}) {
  return async function setGuestMenuHandler(c: Context) {
    try {
      const guestId = c.req.param("guestId");
      const payload = reqValid<{ menuId?: string | null; locked?: boolean; status?: string }>(c, "json");
      await setGuestMenu(guestId, {
        menuId: payload.menuId ?? null,
        locked: payload.locked ?? true,
        status: payload.status ?? "manual",
      });
      triggerAdminDashboardSummaryRefresh();
      return c.json({ ok: true });
    } catch (err) {
      return jsonHttpError(c, err, "menus.assignment.set");
    }
  };
}

export async function autoAssignMenusHandler(c: Context) {
  try {
    const { assignmentsMap } = reqValid<{ assignmentsMap: Record<string, unknown> }>(c, "json");
    const { autoAssignBulk } = await import("../../services/menus.service.js");
    const { triggerAdminDashboardSummaryRefresh } = await import(
      "../../services/adminDashboardSummary.service.js"
    );
    await autoAssignBulk(assignmentsMap as Record<string, Record<string, unknown>>);
    triggerAdminDashboardSummaryRefresh();
    return c.json({
      ok: true,
      written: Object.keys(assignmentsMap || {}).length,
    });
  } catch (err) {
    return jsonHttpError(c, err, "menus.assignment.auto");
  }
}

export async function createSeatingTableHandler(c: Context) {
  try {
    const payload = reqValid<{
      shape: "round" | "square" | "rect";
      capacity?: unknown;
      name?: unknown;
      seatsPerSide?: unknown;
    }>(c, "json");
    const shape = payload.shape;
    const capacity = numOr(payload.capacity, 0);
    const name = cleanSeatingString(payload.name);
    const seatsPerSide = cleanSeatsPerSide(shape, payload.seatsPerSide);

    const col = seatingTablesCol();
    const snap = await col.orderBy("order", "desc").limit(1).get();
    const maxOrder = snap.empty ? 0 : numOr(snap.docs[0]?.data()?.order, 0);
    const order = maxOrder + 1;

    const docRef = col.doc();
    const tableData = {
      name,
      shape,
      capacity,
      order,
      guestIds: [] as string[],
      seatsPerSide,
      layoutConfig: {
        type: shape === "round" ? "round" : "rect",
        seatsPerSide,
      },
      position: { x: 0.5, y: 0.5 },
      layoutRotationDeg: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await firestore.runTransaction(async (tx) => {
      const summarySnap = await tx.get(seatingSummaryRef());
      const totalTables = summaryTotalTables(summarySnap) + 1;

      tx.set(docRef, tableData);
      tx.set(
        seatingSummaryRef(),
        {
          updatedAt: new Date(),
          seating: mergedSeating(summarySnap, {
            totalTables: Math.max(0, totalTables),
          }),
        },
        { merge: true },
      );
    });

    return c.json({ ok: true, id: docRef.id, table: tableData });
  } catch (err) {
    return jsonHttpError(c, err, "seating.tables.create");
  }
}

export async function patchSeatingTableHandler(c: Context) {
  try {
    const { tableId } = reqValid<{ tableId: string }>(c, "param");
    const payload = reqValid<Record<string, unknown>>(c, "json");
    const ref = seatingTablesCol().doc(tableId);
    const snap = await ref.get();
    if (!snap.exists) throw new HttpError(404, "not_found");

    const prev = snap.data() || {};
    const next: Record<string, unknown> = { ...payload };

    if ("name" in next) next.name = cleanSeatingString(next.name);
    if ("capacity" in next) next.capacity = numOr(next.capacity, numOr(prev.capacity, 0));
    if ("order" in next) next.order = numOr(next.order, numOr(prev.order, 0));

    if ("seatsPerSide" in next || "shape" in next) {
      const shape = String(next.shape ?? prev.shape ?? "").trim();
      next.seatsPerSide = cleanSeatsPerSide(shape, next.seatsPerSide ?? prev.seatsPerSide);
      next.layoutConfig = {
        ...(isRecord(prev.layoutConfig) ? prev.layoutConfig : {}),
        type: shape === "round" ? "round" : "rect",
        seatsPerSide: next.seatsPerSide,
      };
    }

    next.updatedAt = new Date();
    delete next.guestIds;

    await ref.set(next, { merge: true });
    return c.json({ ok: true });
  } catch (err) {
    return jsonHttpError(c, err, "seating.tables.patch");
  }
}

export async function deleteSeatingTableHandler(c: Context) {
  try {
    const { tableId } = reqValid<{ tableId: string }>(c, "param");
    const ref = seatingTablesCol().doc(tableId);
    const snap = await ref.get();
    if (!snap.exists) throw new HttpError(404, "not_found");

    await firestore.runTransaction(async (tx) => {
      const [tableSnap, summarySnap] = await Promise.all([
        tx.get(ref),
        tx.get(seatingSummaryRef()),
      ]);
      const guestIds = Array.isArray(tableSnap.data()?.guestIds) ? tableSnap.data()?.guestIds : [];

      const totalTables = Math.max(0, summaryTotalTables(summarySnap) - 1);
      const unassignedCount = Math.max(0, summaryUnassignedCount(summarySnap) + guestIds.length);

      tx.delete(ref);
      tx.set(
        seatingSummaryRef(),
        {
          updatedAt: new Date(),
          seating: mergedSeating(summarySnap, { totalTables, unassignedCount }),
        },
        { merge: true },
      );
    });

    return c.json({ ok: true });
  } catch (err) {
    return jsonHttpError(c, err, "seating.tables.delete");
  }
}

export async function setSeatingTableGuestIdsHandler(c: Context) {
  try {
    const { tableId } = reqValid<{ tableId: string }>(c, "param");
    const { guestIds } = reqValid<{ guestIds: unknown[] }>(c, "json");
    const clean = Array.from(new Set(guestIds.map((x) => String(x || "").trim()).filter(Boolean)));

    const col = seatingTablesCol();
    const tableRef = col.doc(tableId);

    const result = await firestore.runTransaction(async (tx) => {
      const [tableSnap, summarySnap] = await Promise.all([
        tx.get(tableRef),
        tx.get(seatingSummaryRef()),
      ]);
      if (!tableSnap.exists) {
        return { status: 404 as const, payload: { error: "not_found" } };
      }

      const table = tableSnap.data() || {};
      const capacity = numOr(table.capacity, 0);
      const exceeded = !!capacity && clean.length > capacity;
      const finalIds = capacity ? clean.slice(0, capacity) : clean;

      const allSnap = await tx.get(col);
      const oldPlaced = new Set<string>();
      const newPlaced = new Set<string>();

      allSnap.docs.forEach((d) => {
        const id = d.id;
        const data = d.data() || {};
        const gids = Array.isArray(data.guestIds) ? data.guestIds : [];
        gids.forEach((gid) => oldPlaced.add(String(gid)));

        let next = gids.map((gid) => String(gid));

        if (id === tableId) {
          next = finalIds;
        } else {
          next = next.filter((gid) => !finalIds.includes(gid));
        }

        next.forEach((gid) => newPlaced.add(String(gid)));
        if (next.length !== gids.length) {
          tx.set(d.ref, { guestIds: next, updatedAt: new Date() }, { merge: true });
        } else if (id === tableId) {
          const same = next.length === gids.length && next.every((gid, i) => gid === String(gids[i]));
          if (!same) {
            tx.set(d.ref, { guestIds: next, updatedAt: new Date() }, { merge: true });
          }
        }
      });

      const placedDelta = newPlaced.size - oldPlaced.size;
      const unassignedCount = Math.max(0, summaryUnassignedCount(summarySnap) - placedDelta);

      tx.set(
        seatingSummaryRef(),
        {
          updatedAt: new Date(),
          seating: mergedSeating(summarySnap, { unassignedCount }),
        },
        { merge: true },
      );

      return { status: 200 as const, payload: { ok: true, exceeded } };
    });

    return c.json(result.payload, result.status);
  } catch (err) {
    return jsonHttpError(c, err, "seating.tables.guest-ids");
  }
}

export async function patchSeatingPlanConfigHandler(c: Context) {
  try {
    const { door } = reqValid<{ door?: unknown }>(c, "json");
    if (!door || !isRecord(door)) {
      throw badRequest("missing_door");
    }

    const side = String(door.side || "");
    const offset = Number(door.offset);
    const allowedSides = ["top", "right", "bottom", "left"] as const;

    if (!allowedSides.includes(side as (typeof allowedSides)[number])) {
      throw badRequest("invalid_door_side", {
        allowed: allowedSides,
        got: side || null,
      });
    }
    if (!Number.isFinite(offset) || offset < 0 || offset > 1) {
      throw badRequest("invalid_door_offset", {
        min: 0,
        max: 1,
        got: Number.isFinite(offset) ? offset : null,
      });
    }

    await firestore.collection("seatingPlanConfig").doc("default").set(
      {
        door: { side, offset },
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true },
    );

    return c.json({ ok: true });
  } catch (err) {
    return jsonHttpError(c, err, "seating.plan-config.patch");
  }
}
