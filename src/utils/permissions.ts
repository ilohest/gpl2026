// src/utils/permissions.js
export function hasPermission(perms: unknown, need: string): boolean {
  const p = Array.isArray(perms) ? perms : [];
  const clean = p.map((x) => String(x || ""));

  if (clean.includes("*") || clean.includes("superadmin:all")) return true;
  if (clean.includes(need)) return true;

  // read couvert par write
  if (
    need.endsWith(":read") &&
    clean.includes(need.replace(/:read$/, ":write"))
  )
    return true;

  return false;
}
