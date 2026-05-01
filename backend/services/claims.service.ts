// backend/services/claims.service.ts
import { admin } from "../lib/firebase.js";

export function computeClaimsFromPermissions(permissions: unknown): {
  permissions: string[];
  superadmin: boolean;
  claimsVersion: number;
} {
  const perms = (Array.isArray(permissions) ? permissions : [])
    .map((p) => String(p || "").trim())
    .filter(Boolean);
  const isSuperadmin = perms.includes("superadmin:all") || perms.includes("*");

  return {
    permissions: perms,
    superadmin: isSuperadmin,
    claimsVersion: Date.now(),
  };
}

export async function setUserClaims(uid: string, permissions: unknown) {
  const base = computeClaimsFromPermissions(permissions);

  // ✅ preserve existing claims
  const user = await admin.auth().getUser(uid);
  const prev = (user.customClaims || {}) as Record<string, unknown>;

  const claims = { ...prev, ...base };

  await admin.auth().setCustomUserClaims(uid, claims);
  return claims;
}
