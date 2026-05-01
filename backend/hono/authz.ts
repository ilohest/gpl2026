import type { DecodedIdToken } from "firebase-admin/auth";

export function uniqPermissions(arr: unknown[]): string[] {
  return Array.from(
    new Set((arr || []).map((x) => String(x || "").trim()).filter(Boolean)),
  );
}

export function permissionsFromDecodedClaims(decoded: DecodedIdToken): string[] {
  const out: string[] = [];
  if ((decoded as DecodedIdToken & { superadmin?: unknown })?.superadmin === true) {
    out.push("superadmin:all");
  }
  const permissions = (decoded as DecodedIdToken & { permissions?: unknown }).permissions;
  if (Array.isArray(permissions)) {
    out.push(...permissions.map((p) => String(p || "").trim()).filter(Boolean));
  }
  return uniqPermissions(out);
}

export function hasPermission(perms: string[], need: string): boolean {
  const alsoOk =
    typeof need === "string" && need.endsWith(":read")
      ? need.replace(/:read$/, ":write")
      : null;
  return (
    perms.includes("*") ||
    perms.includes("superadmin:all") ||
    perms.includes(need) ||
    (alsoOk ? perms.includes(alsoOk) : false)
  );
}

export function hasAnyPermission(perms: string[], needs: string[] | string): boolean {
  const list = Array.isArray(needs) ? needs : [needs];
  return list.some((need) => hasPermission(perms, need));
}

export function isSuperadminAuthorized(
  claims: Record<string, unknown> | null | undefined,
  perms: string[],
): boolean {
  return (
    (claims?.superadmin === true) ||
    perms.includes("superadmin:all") ||
    perms.includes("*")
  );
}
