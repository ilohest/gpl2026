// backend/services/audit.service.ts
import { firestore, admin } from "../lib/firebase.js";

const nowTs = () => admin.firestore.Timestamp.now();

export async function writeAudit({
  type,
  actorUid,
  actorEmail,
  targetUid = null,
  targetEmail = null,
  inviteId = null,
  meta = {},
}: {
  type: string;
  actorUid?: string | null;
  actorEmail?: string | null;
  targetUid?: string | null;
  targetEmail?: string | null;
  inviteId?: string | null;
  meta?: Record<string, unknown>;
}) {
  await firestore.collection("auditLogs").add({
    type,
    at: nowTs(),
    actorUid: actorUid || null,
    actorEmail: actorEmail || null,
    targetUid,
    targetEmail,
    inviteId,
    meta,
  });
}
