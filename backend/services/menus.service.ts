// backend/services/menus.service.ts
import { admin, firestore } from "../lib/firebase.js";
import { recomputeAllAssignments } from "./menuAssignmentsAuto.service.js";
import type { DocumentData } from "firebase-admin/firestore";

const MENUS_COL = "menus";
const ASSIGN_COL = "menuAssignments";

type MenuListItem = { id: string } & DocumentData;
type AssignmentsMap = Record<string, DocumentData>;

interface UpsertMenuInput {
  id?: unknown;
  name?: unknown;
  priority?: unknown;
  active?: unknown;
  note?: unknown;
  covers?: unknown;
}

interface GuestMenuPayloadInput {
  menuId?: unknown;
  locked?: unknown;
  status?: unknown;
}

type AssignmentPatchMap = Record<string, unknown>;

interface MenuWritePayload {
  name: string;
  priority: number;
  active: boolean;
  note: string;
  updatedAt: FirebaseFirestore.FieldValue;
  covers?: string[];
}

function normCode(c: unknown): string {
  return String(c ?? "")
    .trim()
    .toLowerCase();
}

function uniq(arr: unknown[]): string[] {
  return Array.from(new Set(arr.map(normCode).filter(Boolean)));
}

let recomputeTimer: NodeJS.Timeout | null = null;

function scheduleRecomputeAll() {
  if (recomputeTimer) clearTimeout(recomputeTimer);
  recomputeTimer = setTimeout(async () => {
    recomputeTimer = null;
    console.log("[menus-auto] recomputeAll START");
    try {
      const res = await recomputeAllAssignments();
      console.log("[menus-auto] recomputeAll DONE", res);
    } catch (e) {
      console.error("[menus-auto] recomputeAll ERROR", e);
    }
  }, 500);
}

export async function listMenus(): Promise<MenuListItem[]> {
  const snap = await firestore.collection(MENUS_COL).get();
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function listAssignments(): Promise<AssignmentsMap> {
  const snap = await firestore.collection(ASSIGN_COL).get();
  const out: AssignmentsMap = {};
  for (const d of snap.docs) out[d.id] = d.data();
  return out;
}

export async function upsertMenu(menu: UpsertMenuInput): Promise<string> {
  const id =
    String(menu?.id || "").trim() || firestore.collection(MENUS_COL).doc().id;

  const hasCoversProp = Object.prototype.hasOwnProperty.call(
    menu || {},
    "covers"
  );
  const coversArr = Array.isArray(menu?.covers) ? uniq(menu.covers) : [];

  const payload: MenuWritePayload = {
    name: String(menu?.name || "").trim(),
    priority: Number(menu?.priority || 0),
    active: menu?.active !== false,
    note: String(menu?.note || ""),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  };

  if (hasCoversProp) payload.covers = coversArr; // [] autorisé

  await firestore.collection(MENUS_COL).doc(id).set(payload, { merge: true });

  // best-effort (ne bloque pas la réponse)
  scheduleRecomputeAll();
  return id;
}

export async function deleteMenu(menuId: string): Promise<void> {
  await firestore.collection(MENUS_COL).doc(String(menuId)).delete();

  scheduleRecomputeAll();
}

export async function setGuestMenu(
  guestId: string,
  { menuId, locked, status }: GuestMenuPayloadInput
): Promise<void> {
  const payload = {
    menuId: menuId ?? null,
    locked: !!locked,
    status: status || "manual",
    reason: null,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  };

  await firestore
    .collection(ASSIGN_COL)
    .doc(String(guestId))
    .set(payload, { merge: true });
}

export async function autoAssignBulk(
  assignmentsMap: AssignmentPatchMap
): Promise<void> {
  const batch = firestore.batch();
  const col = firestore.collection(ASSIGN_COL);

  for (const [guestId, data] of Object.entries(assignmentsMap || {})) {
    const safeData =
      data && typeof data === "object"
        ? (data as Record<string, unknown>)
        : {};
    batch.set(
      col.doc(guestId),
      {
        ...safeData,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
  }

  await batch.commit();
}
