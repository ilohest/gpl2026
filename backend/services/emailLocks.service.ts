// backend/services/emailLocks.service.ts
// services/emailLocks.service.js
import { firestore, admin } from "../lib/firebase.js";
import type { DocumentReference } from "firebase-admin/firestore";

const FV = admin.firestore.FieldValue;
export const LOCK_TTL_MS = Number(
  process.env.EMAIL_LOCK_TTL_MS || 15 * 60 * 1000,
);

interface LockPayload {
  lockRef: DocumentReference;
  jobId?: string;
  uid?: string | null | undefined;
}

interface LockError extends Error {
  status?: number;
  lockedUntil?: number;
  lockedJobId?: string | null;
}

interface LockDocData {
  lockedUntilMs?: unknown;
  lockedBy?: unknown;
  lockedJobId?: unknown;
}

export async function acquireLock({ lockRef, jobId, uid }: LockPayload): Promise<{ lockedUntil: number }> {
  if (!lockRef) throw new Error("MISSING_LOCK_REF");
  if (!jobId) throw new Error("MISSING_JOB_ID");

  const now = Date.now();
  const until = now + LOCK_TTL_MS;

  await firestore.runTransaction(async (tx) => {
    const snap = await tx.get(lockRef);
    const data = (snap.exists ? snap.data() : null) as LockDocData | null;

    const lockedUntilMs = Number(data?.lockedUntilMs || 0);

    if (lockedUntilMs > now) {
      const err = new Error("LOCKED") as LockError;
      err.status = 409;
      err.lockedUntil = lockedUntilMs;
      err.lockedJobId = String(data?.lockedJobId || "").trim() || null;
      throw err;
    }

    tx.set(
      lockRef,
      {
        lockedUntilMs: until,
        lockedBy: uid || null,
        lockedJobId: jobId || null,
        updatedAt: FV.serverTimestamp(),
      },
      { merge: true }
    );
  });

  return { lockedUntil: until };
}

export async function releaseLock({
  lockRef,
  jobId,
}: {
  lockRef: DocumentReference | null | undefined;
  jobId?: string;
}): Promise<void> {
  if (!lockRef) return;

  try {
    await firestore.runTransaction(async (tx) => {
      const snap = await tx.get(lockRef);
      if (!snap.exists) return;

      const data = (snap.data() || {}) as LockDocData;
      if (data.lockedJobId && jobId && String(data.lockedJobId) !== jobId) return;

      tx.set(
        lockRef,
        {
          lockedUntilMs: 0,
          lockedBy: null,
          lockedJobId: null,
          updatedAt: FV.serverTimestamp(),
        },
        { merge: true }
      );
    });
  } catch {
    // best effort
  }
}

export async function renewLock({
  lockRef,
  jobId,
  uid,
}: LockPayload): Promise<{ ok: boolean; lockedUntil?: number }> {
  if (!lockRef || !jobId) return { ok: false };

  const now = Date.now();
  const until = now + LOCK_TTL_MS;

  try {
    await firestore.runTransaction(async (tx) => {
      const snap = await tx.get(lockRef);
      if (!snap.exists) return;

      const data = (snap.data() || {}) as LockDocData;
      if (String(data.lockedJobId || "") !== String(jobId)) return;

      tx.set(
        lockRef,
        {
          lockedUntilMs: until,
          lockedBy: uid || String(data.lockedBy || "").trim() || null,
          lockedJobId: jobId,
          updatedAt: FV.serverTimestamp(),
        },
        { merge: true },
      );
    });

    return { ok: true, lockedUntil: until };
  } catch {
    return { ok: false };
  }
}
