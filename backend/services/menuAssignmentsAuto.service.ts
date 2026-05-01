// backend/services/menuAssignmentsAuto.service.ts
import { firestore, admin } from "../lib/firebase.js";
import { getDecisionForGuest } from "../utils/menusDecision.js";

const MENUS_COL = "menus";
const ASSIGN_COL = "menuAssignments";
const GUESTS_COL = "guests";
type MenuLike = { id?: string; active?: boolean; [key: string]: unknown };

/** NEW schema: attending is boolean|null */
function isAttending(guest: { attending?: boolean | null } | null | undefined) {
  return guest?.attending === true;
}

export async function loadActiveMenus() {
  const snap = await firestore.collection(MENUS_COL).get();
  return snap.docs
    .map((d) => ({ id: d.id, ...(d.data() || {}) }) as { id: string; active?: boolean })
    .filter((m) => m.active !== false);
}

export async function deleteAssignmentForGuestId(guestId: string | null | undefined) {
  if (!guestId) return;
  await firestore
    .collection(ASSIGN_COL)
    .doc(String(guestId))
    .delete()
    .catch(() => {});
}

/**
 * NEW schema ONLY:
 * - dietCodes (string[])
 * - dietOtherText (string)
 *
 * No spanish legacy fields.
 */
function normalizeGuestForMenusDecision(g: Record<string, unknown> | null | undefined) {
  const dietCodes = Array.isArray(g?.dietCodes) ? g.dietCodes : [];
  const dietOtherText = String(g?.dietOtherText ?? "").trim();
  return { ...(g || {}), dietCodes, dietOtherText };
}

/**
 * Recompute assignment for ONE guest doc (data)
 * - skip if locked
 * - if not attending => clear assignment (menuId null, status auto)
 */
export async function recomputeAssignmentForGuest(
  guest: Record<string, unknown> | undefined,
  {
    menus,
    docSnap,
  }: { menus?: MenuLike[]; docSnap?: { id?: string } } = {},
) {
  const guestData = guest || {};
  const guestId = canonicalGuestId(docSnap, guestData);
  if (!guestId) return { skipped: true, reason: "no_guestId" };

  const ref = firestore.collection(ASSIGN_COL).doc(guestId);
  const snap = await ref.get();
  const existing = snap.exists ? snap.data() || {} : null;

  if (existing?.locked) return { skipped: true, reason: "locked" };

  // guest not attending => clear assignment (no needs_review)
  if (!isAttending(guestData)) {
    await ref.set(
      {
        guestId,
        menuId: null,
        status: "auto",
        locked: false,
        reason: null,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true },
    );

    return { ok: true, guestId, status: "auto", menuId: null, cleared: true };
  }

  const decision = getDecisionForGuest(
    normalizeGuestForMenusDecision(guestData),
    menus ? { menus } : {},
  );

  const next =
    decision.status === "auto" && decision.menuId
      ? { menuId: decision.menuId, status: "auto", locked: false, reason: null }
      : {
          menuId: null,
          status: "needs_review",
          locked: false,
          reason: decision.reason || "needs_review",
        };

  await ref.set(
    {
      guestId,
      ...next,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    },
    { merge: true },
  );

  return { ok: true, guestId, status: next.status, menuId: next.menuId };
}

/** NEW schema: guests are in root collection "guests/{guestId}" */
function canonicalGuestId(
  docSnap: { id?: string } | null | undefined,
  data: { guestId?: unknown } | null | undefined,
) {
  const fromField = String(data?.guestId || "").trim();
  if (fromField) return fromField;

  const fromDocId = String(docSnap?.id || "").trim();
  return fromDocId || "";
}

/**
 * Recompute ALL guests (attending only), skip locked.
 */
export async function recomputeAllAssignments() {
  const menus = await loadActiveMenus();

  // locked map
  const assignSnap = await firestore.collection(ASSIGN_COL).get();
  const locked = new Set();
  for (const d of assignSnap.docs) {
    const a = d.data() as { locked?: boolean } | undefined;
    if (a?.locked) locked.add(d.id);
  }

  // NEW: fetch guests from ROOT collection
  const snap = await firestore.collection(GUESTS_COL).get();

  let batch = firestore.batch();
  let op = 0;
  let processed = 0;

  for (const d of snap.docs) {
    const g = (d.data() || {}) as Record<string, unknown>;
    const guestId = canonicalGuestId(d, g);
    if (!guestId) continue;

    if (locked.has(guestId)) continue;
    if (!isAttending(g)) continue;

    const decision = getDecisionForGuest(normalizeGuestForMenusDecision(g), {
      menus,
    });

    const next =
      decision.status === "auto" && decision.menuId
        ? {
            menuId: decision.menuId,
            status: "auto",
            locked: false,
            reason: null,
          }
        : {
            menuId: null,
            status: "needs_review",
            locked: false,
            reason: decision.reason || "needs_review",
          };

    batch.set(
      firestore.collection(ASSIGN_COL).doc(guestId),
      {
        guestId,
        ...next,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true },
    );

    processed++;
    op++;

    if (op >= 350) {
      await batch.commit();
      batch = firestore.batch();
      op = 0;
    }
  }

  if (op) await batch.commit();
  return { ok: true, processed, scanned: snap.size };
}
