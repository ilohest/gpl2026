// backend/services/invites.service.ts
import { firestore, admin } from "../lib/firebase.js";
import { sha256, randomToken } from "../utils/crypto.js";
import { conflict } from "../utils/httpErrors.js";

type InviteDoc = {
  tokenHash: string;
  tokenPrefix: string;
  emailLower: string;
  displayName: string;
  permissions: string[];
  createdAt: FirebaseFirestore.Timestamp;
  createdByUid: string;
  createdByEmail: string | null;
  revokedAt: FirebaseFirestore.Timestamp | null;
  revokedByUid: string | null;
  acceptedAt: FirebaseFirestore.Timestamp | null;
  acceptedByUid: string | null;
  acceptedByEmail: string | null;
  expiresAt: FirebaseFirestore.Timestamp;
};

type CreateInviteInput = {
  emailLower: string;
  displayName: string;
  permissions: string[];
  actorUid: string;
  actorEmail?: string | null;
};

type RevokeInviteInput = {
  inviteId: string;
  actorUid: string;
};

const nowTs = () => admin.firestore.Timestamp.now();
const INVITE_EXPIRES_DAYS = Number(process.env.INVITE_EXPIRES_DAYS || 30);
const USER_EMAILS_COLLECTION = "userEmails";

function computeExpiresAt() {
  return admin.firestore.Timestamp.fromDate(
    new Date(Date.now() + INVITE_EXPIRES_DAYS * 24 * 60 * 60 * 1000)
  );
}

function userEmailRef(emailLower: string) {
  return firestore.collection(USER_EMAILS_COLLECTION).doc(emailLower);
}

async function authUserExistsByEmail(emailLower: string): Promise<boolean> {
  try {
    await admin.auth().getUserByEmail(emailLower);
    return true;
  } catch (e: unknown) {
    const err = e as { code?: string };
    if (err.code === "auth/user-not-found") return false;
    throw e;
  }
}

async function firestoreUserExistsByEmail(emailLower: string): Promise<boolean> {
  const snap = await firestore
    .collection("users")
    .where("emailLower", "==", emailLower)
    .limit(1)
    .get();

  return !snap.empty;
}

export async function isEmailAlreadyRegistered(emailLower: string): Promise<boolean> {
  if (!emailLower) return false;

  const lockSnap = await userEmailRef(emailLower).get();
  if (lockSnap.exists) return true;

  if (await firestoreUserExistsByEmail(emailLower)) return true;
  return authUserExistsByEmail(emailLower);
}

export async function listInvites({ limit = 200 }: { limit?: number } = {}) {
  const snap = await firestore
    .collection("invites")
    .orderBy("createdAt", "desc")
    .limit(limit)
    .get();

  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function createInvite({
  emailLower,
  displayName,
  permissions,
  actorUid,
  actorEmail,
}: CreateInviteInput) {
  if (await isEmailAlreadyRegistered(emailLower)) {
    throw conflict("email_already_registered");
  }

  const token = randomToken();
  const tokenHash = sha256(token);
  const tokenPrefix = token.slice(0, 8);
  const expiresAt = computeExpiresAt();
  const createdAt = nowTs();
  const inviteRef = firestore.collection("invites").doc();

  const payload: InviteDoc = {
    tokenHash,
    tokenPrefix,
    emailLower,
    displayName,
    permissions,
    createdAt,
    createdByUid: actorUid,
    createdByEmail: actorEmail || null,
    revokedAt: null,
    revokedByUid: null,
    acceptedAt: null,
    acceptedByUid: null,
    acceptedByEmail: null,
    expiresAt,
  };

  await firestore.runTransaction(async (tx) => {
    const [emailLockSnap, usersByEmailSnap, invitesByEmailSnap] =
      await Promise.all([
        tx.get(userEmailRef(emailLower)),
        tx.get(
          firestore
            .collection("users")
            .where("emailLower", "==", emailLower)
            .limit(1)
        ),
        tx.get(
          firestore.collection("invites").where("emailLower", "==", emailLower)
        ),
      ]);

    if (emailLockSnap.exists || !usersByEmailSnap.empty) {
      throw conflict("email_already_registered");
    }

    for (const doc of invitesByEmailSnap.docs) {
      const data = doc.data();
      if (data.revokedAt || data.acceptedAt) continue;

      tx.update(doc.ref, {
        revokedAt: createdAt,
        revokedByUid: actorUid,
      });
    }

    tx.set(inviteRef, payload);
  });

  return {
    token,
    invite: {
      id: inviteRef.id,
      emailLower,
      displayName,
      permissions,
      tokenPrefix,
      expiresAt,
    },
    raw: { id: inviteRef.id, ...payload },
  };
}

export async function revokeInvite({ inviteId, actorUid }: RevokeInviteInput) {
  const ref = firestore.collection("invites").doc(inviteId);
  const snap = await ref.get();
  if (!snap.exists) return { ok: false, code: "not_found" };

  const data = snap.data() as Partial<InviteDoc> | undefined;
  if (!data) return { ok: false, code: "not_found" as const };
  if (data.revokedAt)
    return { ok: true, already: true, tokenPrefix: data.tokenPrefix };

  await ref.update({
    revokedAt: nowTs(),
    revokedByUid: actorUid,
  });

  return { ok: true, tokenPrefix: data.tokenPrefix || null };
}

export async function findInviteByToken(token: unknown) {
  const cleanToken = String(token || "");
  const tokenHash = sha256(cleanToken);
  const q = await firestore
    .collection("invites")
    .where("tokenHash", "==", tokenHash)
    .limit(1)
    .get();

  if (q.empty) return null;
  const first = q.docs[0];
  if (!first) return null;
  return { ref: first.ref, id: first.id, data: first.data() as InviteDoc };
}
