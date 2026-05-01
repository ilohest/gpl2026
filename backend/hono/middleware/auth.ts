// backend/hono/middleware/auth.ts
import type { MiddlewareHandler } from "hono";
import type { DecodedIdToken } from "firebase-admin/auth";
import { admin, ensureFirebaseAdminInitialized, firestore } from "../../lib/firebase.js";
import {
  createRequireFirebaseAuthHono,
  requireAnyPermissionHono,
  requirePermissionHono,
  requireSuperadminHono,
} from "./auth.core.js";

async function loadUserDocPermissions(uid: string): Promise<unknown[]> {
  const snap = await firestore.collection("users").doc(uid).get();
  if (!snap.exists) return [];
  const data = snap.data() || {};
  return Array.isArray((data as { permissions?: unknown }).permissions)
    ? ((data as { permissions: unknown[] }).permissions || [])
    : [];
}

export const requireFirebaseAuthHono: MiddlewareHandler = createRequireFirebaseAuthHono({
  verifyIdToken: (token: string) => {
    ensureFirebaseAdminInitialized();
    return admin.auth().verifyIdToken(token) as Promise<DecodedIdToken>;
  },
  loadUserDocPermissions,
});

export {
  createRequireFirebaseAuthHono,
  requireAnyPermissionHono,
  requirePermissionHono,
  requireSuperadminHono,
};
