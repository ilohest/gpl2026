// backend/services/me.service.ts
import admin from "firebase-admin";
import { firestore } from "../lib/firebase.js";

type MePayloadInput = {
  uid: string;
  email?: string | null;
  permissionsEffective?: unknown;
  claims?: {
    permissions?: unknown;
    superadmin?: boolean;
    [key: string]: unknown;
  } | null;
};

type UserDocData = {
  displayName?: string;
  permissions?: unknown;
  [key: string]: unknown;
};

function normalizePerms(v: unknown): string[] {
  return Array.isArray(v)
    ? v
        .map(String)
        .map((s) => s.trim())
        .filter(Boolean)
    : [];
}

function unionPerms(a: unknown, b: unknown): string[] {
  const set = new Set([...normalizePerms(a), ...normalizePerms(b)]);
  return [...set];
}

export async function getMePayload({
  uid,
  email,
  permissionsEffective,
  claims,
}: MePayloadInput) {
  const emailLower = String(email || "").toLowerCase();
  const userRef = firestore.collection("users").doc(uid);

  const snap = await userRef.get();
  const existing = (snap.exists ? snap.data() : null) as UserDocData | null;

  const permsDb = normalizePerms(existing?.permissions);
  const permsClaims = normalizePerms(claims?.permissions);

  // ✅ permissions "effective" :
  // - si ton middleware fournit déjà req.user.permissions, on la respecte
  // - sinon on fait union DB + claims
  const permissions = normalizePerms(permissionsEffective).length
    ? normalizePerms(permissionsEffective)
    : unionPerms(permsDb, permsClaims);

  const isSuperadmin =
    permissions.includes("superadmin:all") ||
    claims?.superadmin === true ||
    permissions.includes("*");

  // ✅ écriture “safe” : on ne remplace pas permissions si pas présentes en DB
  const payloadToWrite: {
    uid: string;
    emailLower: string;
    email: string | null;
    lastSeenAt: admin.firestore.Timestamp;
    updatedAt: admin.firestore.Timestamp;
    displayName?: string;
    permissions?: string[];
  } = {
    uid,
    emailLower,
    email: email || null,
    lastSeenAt: admin.firestore.Timestamp.now(),
    updatedAt: admin.firestore.Timestamp.now(),
  };

  if (existing?.displayName) payloadToWrite.displayName = existing.displayName;

  // garde ta règle : n'écris permissions que si déjà présentes en DB
  if (Array.isArray(existing?.permissions)) {
    payloadToWrite.permissions = permsDb;
  }

  await userRef.set(payloadToWrite, { merge: true });

  return {
    ok: true,
    uid,
    email: emailLower,
    permissions,
    isSuperadmin,
    role: isSuperadmin ? "superadmin" : "admin",
    // debug utile (tu peux l’enlever en prod)
    meta: {
      hasUserDoc: snap.exists,
      permsDb,
      permsClaims,
      superadminClaim: !!claims?.superadmin,
    },
  };
}
