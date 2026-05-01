type IntentPermissionMap = Record<string, string | null>;

export const INTENT_PERMISSION: IntentPermissionMap = {
  count_diet: "rsvp:read",
  count_attending: "rsvp:read",
  count_children: "rsvp:read",
  count_couples: "rsvp:read",
  wedding_parts_attendance: "rsvp:read",
  list_attending: "rsvp:read",
  count_not_responded: "rsvp:read",
  count_transport: "rsvp:read",
  guest_lookup: "rsvp:read",
  seating_stats: "menus_seating:read",
  menu_stats: "menus_seating:read",
  budget_summary: "finances:read",
  latest_blog_post: "blog:write",
  playlist_stats: "playlist:read",
  playlist_search: "playlist:read",
  agenda_stats: "agenda:read",
  planner_stats: "planner:read",
  users_permissions: "superadmin:all",
  invites_summary: "superadmin:all",
  invite_lookup: "superadmin:all",
  general: null,
};

export function userHasPermission(permissions: unknown, need: string | null): boolean {
  if (!need) return true;
  const perms = Array.isArray(permissions) ? permissions : [];
  if (perms.includes("*") || perms.includes("superadmin:all")) return true;
  if (perms.includes(need)) return true;
  const writeVariant = need.replace(/:read$/, ":write");
  if (writeVariant !== need && perms.includes(writeVariant)) return true;
  return false;
}

export function canRunIntent(intent: string, permissions: unknown): boolean {
  const need = INTENT_PERMISSION[intent] ?? null;
  return userHasPermission(permissions, need);
}
