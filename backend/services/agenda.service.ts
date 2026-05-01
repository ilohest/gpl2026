// backend/services/agenda.service.ts
import { firestore, admin } from "../lib/firebase.js";
import { badRequest } from "../utils/httpErrors.js";

const itemsCol = () => firestore.collection("agendaItems");

interface AgendaPayloadInput {
  time?: unknown;
  durationMin?: unknown;
  title?: unknown;
  type?: unknown;
  notes?: unknown;
  participants?: unknown;
  trackRefs?: unknown;
  location?: unknown;
  ownerTags?: unknown;
}

interface AgendaSanitizedPayload {
  time: string;
  timeMinutes: number;
  durationMin: number;
  title: string;
  type: string[];
  notes: string;
  participants: string[];
  trackRefs: unknown[];
  location: string;
  ownerTags: unknown[];
}

interface TimeComputation {
  time: string;
  timeMinutes: number;
}

interface ReorderPayloadInput {
  orderedIds?: unknown;
  setTimeById?: unknown;
}

interface AgendaPatchWrite extends AgendaSanitizedPayload {
  updatedAt: FirebaseFirestore.FieldValue;
  order?: number;
}

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function normalizeTimeHHmm(s: unknown): string {
  if (!s) return "";
  const m = String(s)
    .trim()
    .match(/^(\d{1,2}):(\d{1,2})$/);
  if (!m) return "";
  const hh = Math.max(0, Math.min(23, parseInt(m[1] ?? "0", 10)));
  const mm = Math.max(0, Math.min(59, parseInt(m[2] ?? "0", 10)));
  return `${pad2(hh)}:${pad2(mm)}`;
}

function timeToMinutes(hhmm: string): number | null {
  const m = String(hhmm || "").match(/^(\d{2}):(\d{2})$/);
  if (!m) return null;
  return parseInt(m[1] ?? "0", 10) * 60 + parseInt(m[2] ?? "0", 10);
}

function computeTimeMinutes(time: unknown): TimeComputation {
  const t = normalizeTimeHHmm(time);
  if (!t) return { time: "", timeMinutes: 999999 };
  const mins = timeToMinutes(t);
  return { time: t, timeMinutes: mins ?? 999999 };
}

function sanitizePayload(input: AgendaPayloadInput = {}): AgendaSanitizedPayload {
  const { time, timeMinutes } = computeTimeMinutes(input.time);

  return {
    time,
    timeMinutes,
    durationMin: Number.isFinite(Number(input.durationMin))
      ? Number(input.durationMin)
      : 10,
    title: String(input.title || "").slice(0, 300),
    type: Array.isArray(input.type)
      ? input.type.filter(Boolean).slice(0, 20)
      : [],
    notes: String(input.notes || "").slice(0, 5000),
    participants: Array.isArray(input.participants)
      ? input.participants
          .map((x) => String(x || "").trim())
          .filter(Boolean)
          .slice(0, 200)
      : [],
    trackRefs: Array.isArray(input.trackRefs)
      ? input.trackRefs.slice(0, 50)
      : [],
    location: String(input.location || "").slice(0, 300),
    ownerTags: Array.isArray(input.ownerTags)
      ? input.ownerTags.filter(Boolean).slice(0, 50)
      : [],
  };
}

async function computeNextOrder({
  timeMinutes,
}: {
  timeMinutes: number;
}): Promise<number> {
  // max global order
  const globalSnap = await itemsCol()
    .orderBy("order", "asc")
    .limitToLast(1)
    .get();

  const maxGlobal = globalSnap.empty
    ? -1
    : Number(globalSnap.docs[0]?.data()?.order ?? -1);

  if (timeMinutes === 999999) return maxGlobal + 100;

  // max order within bucket (same timeMinutes)
  const bucketSnap = await itemsCol()
    .where("timeMinutes", "==", timeMinutes)
    .orderBy("order", "asc")
    .limitToLast(1)
    .get();

  const maxBucket = bucketSnap.empty
    ? -1
    : Number(bucketSnap.docs[0]?.data()?.order ?? -1);

  return maxBucket + 100;
}

export async function createAgendaItem(
  payload: AgendaPayloadInput,
  _user: unknown
): Promise<string> {
  const clean = sanitizePayload(payload);

  if (!clean.title && clean.timeMinutes === 999999) {
    // optionnel : impose un minimum
    // throw badRequest("validation_error", { message: "title_or_time_required" });
  }

  const ref = itemsCol().doc();
  const order = await computeNextOrder({ timeMinutes: clean.timeMinutes });

  await ref.set({
    ...clean,
    order,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  return ref.id;
}

export async function patchAgendaItem(
  id: string,
  patch: AgendaPayloadInput,
  _user: unknown
): Promise<void> {
  if (!id) throw badRequest("validation_error", { message: "missing_id" });

  const ref = itemsCol().doc(id);
  const snap = await ref.get();
  if (!snap.exists) throw badRequest("not_found", { id });

  const prev = snap.data() || {};
  const wantsTimeChange = Object.prototype.hasOwnProperty.call(
    patch || {},
    "time"
  );

  const clean = sanitizePayload({ ...prev, ...patch });

  const out: AgendaPatchWrite = {
    ...clean,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  };

  // si l'heure change -> recalcule order pour le nouveau bucket
  if (wantsTimeChange) {
    const prevTimeMinutes = Number(prev.timeMinutes ?? 999999);
    const nextTimeMinutes = Number(clean.timeMinutes ?? 999999);
    if (nextTimeMinutes !== prevTimeMinutes) {
      out.order = await computeNextOrder({ timeMinutes: nextTimeMinutes });
    }
  }

  await ref.set(out, { merge: true });
}

export async function deleteAgendaItem(id: string, _user: unknown): Promise<void> {
  if (!id) throw badRequest("validation_error", { message: "missing_id" });
  await itemsCol().doc(id).delete();
}

export async function reorderAgendaItems(
  { orderedIds = [], setTimeById = {} }: ReorderPayloadInput,
  _user: unknown
): Promise<void> {
  if (!Array.isArray(orderedIds) || !orderedIds.length) return;

  const batch = firestore.batch();
  const ts = admin.firestore.FieldValue.serverTimestamp();

  orderedIds.forEach((id, idx) => {
    const ref = itemsCol().doc(String(id));
    batch.set(ref, { order: idx * 100, updatedAt: ts }, { merge: true });
  });

  const safeSetTimeById =
    setTimeById && typeof setTimeById === "object"
      ? (setTimeById as Record<string, unknown>)
      : {};

  Object.entries(safeSetTimeById).forEach(([id, time]) => {
    const { time: t, timeMinutes } = computeTimeMinutes(time);
    const ref = itemsCol().doc(id);
    batch.set(ref, { time: t, timeMinutes, updatedAt: ts }, { merge: true });
  });

  await batch.commit();
}

// si tu veux garder tes templates côté front, tu peux ne pas implémenter ceci.
// sinon: tu passes "key" et tu rebuild la liste côté backend.
export async function seedAgendaTemplate(key: string, _user: unknown): Promise<never> {
  if (!key) throw badRequest("validation_error", { message: "missing_key" });
  // minimal stub: à connecter à tes templates existants si tu veux centraliser côté backend
  throw badRequest("not_implemented", { key });
}
