// backend/domain/permissions.ts
export const ALLOWED_PERMISSIONS = new Set([
  "rsvp:read",
  "rsvp:write",
  "blog:write",
  "menus_seating:read",
  "menus_seating:write",
  "finances:read",
  "finances:write",
  "playlist:read",
  "playlist:write",
  "agenda:read",
  "agenda:write",
  "planner:read",
  "planner:write",
  "emails:send",
  "emails:read",
  "ai_chat:use",
  "superadmin:all",
]);

export function filterAllowedPermissions(perms: unknown): string[] {
  const list = (Array.isArray(perms) ? perms : []).map((p) =>
    String(p || "").trim(),
  );
  return list.filter((p) =>
    ALLOWED_PERMISSIONS.has(p)
  );
}

export function uniq(arr: unknown[]): string[] {
  return Array.from(
    new Set((arr || []).map((v) => String(v || "").trim()).filter(Boolean)),
  );
}
