// backend/services/emailJobs.service.ts
import { firestore } from "../lib/firebase.js";

const JOBS_COLLECTION = "emailJobs";

type JobRow = Record<string, unknown> & { id: string };

export async function listJobs({
  limit = 30,
  type = "",
}: {
  limit?: number;
  type?: string;
} = {}): Promise<JobRow[]> {
  const lim = Math.min(100, Math.max(1, Number(limit || 30)));
  const t = String(type || "").trim();

  // Fast path: no type filter, keep direct indexed query.
  if (!t) {
    const snap = await firestore
      .collection(JOBS_COLLECTION)
      .orderBy("createdAt", "desc")
      .limit(lim)
      .get();
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as JobRow);
  }

  // Type + createdAt may require a composite index.
  // To avoid runtime 500 when index is missing, query recent jobs then filter in memory.
  const fetchLim = Math.min(100, Math.max(lim * 3, 30));
  const snap = await firestore
    .collection(JOBS_COLLECTION)
    .orderBy("createdAt", "desc")
    .limit(fetchLim)
    .get();

  const items = snap.docs
    .map((d) => ({ id: d.id, ...d.data() }) as JobRow)
    .filter((x) => String(x?.type || "") === t);

  return items.slice(0, lim);
}

export async function readJob(jobId: unknown): Promise<JobRow | null> {
  const id = String(jobId || "").trim();
  if (!id) return null;
  const snap = await firestore.collection(JOBS_COLLECTION).doc(id).get();
  if (!snap.exists) return null;
  return { id: snap.id, ...snap.data() } as JobRow;
}

export async function listDeliveries({
  jobId,
  limit = 100,
}: {
  jobId?: unknown;
  limit?: number;
} = {}): Promise<JobRow[] | null> {
  const id = String(jobId || "").trim();
  if (!id) return null;

  const lim = Math.min(500, Math.max(1, Number(limit || 100)));

  const jobSnap = await firestore.collection(JOBS_COLLECTION).doc(id).get();
  if (!jobSnap.exists) return null;

  const snap = await firestore
    .collection(JOBS_COLLECTION)
    .doc(id)
    .collection("deliveries")
    .orderBy("sentAt", "desc")
    .limit(lim)
    .get();

  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as JobRow);
}
