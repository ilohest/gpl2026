type Claims = Record<string, unknown>;
type PermissionState = {
  claims: Claims;
  permissions: string[];
};

export function uniqPermissions(arr: unknown): string[] {
  return [
    ...new Set(
      (Array.isArray(arr) ? arr : [])
        .map((x) => String(x || "").trim())
        .filter(Boolean),
    ),
  ];
}

export function claimSuperadmin(claims: Claims): boolean {
  return (claims as { superadmin?: unknown })?.superadmin === true;
}

export function isSuperadminLike(state: PermissionState): boolean {
  return (
    claimSuperadmin(state.claims) ||
    state.permissions.includes("*") ||
    state.permissions.includes("superadmin:all")
  );
}

export function hasPerm(state: PermissionState, perm: string): boolean {
  return isSuperadminLike(state) || state.permissions.includes(perm);
}

export function canReadModule(state: PermissionState, moduleName: string): boolean {
  return (
    isSuperadminLike(state) ||
    state.permissions.includes(`${moduleName}:read`) ||
    state.permissions.includes(`${moduleName}:write`)
  );
}

export function canWriteModule(state: PermissionState, moduleName: string): boolean {
  return isSuperadminLike(state) || state.permissions.includes(`${moduleName}:write`);
}

export function canReadEmail(state: PermissionState): boolean {
  return isSuperadminLike(state) || state.permissions.includes("emails:read");
}

export function canSendEmail(state: PermissionState): boolean {
  return isSuperadminLike(state) || state.permissions.includes("emails:send");
}

export function canAccessEmail(state: PermissionState): boolean {
  return isSuperadminLike(state) || canReadEmail(state) || canSendEmail(state);
}

export function canAccessDashboard(state: PermissionState): boolean {
  if (isSuperadminLike(state)) return true;
  return Array.isArray(state.permissions) && state.permissions.length > 0;
}

export function canUseAiChat(state: PermissionState): boolean {
  return isSuperadminLike(state) || state.permissions.includes("ai_chat:use");
}
