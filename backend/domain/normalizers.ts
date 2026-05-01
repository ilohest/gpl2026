// backend/domain/normalizers.ts
type PermissionLike = string | { value?: unknown } | null | undefined;

export function normalizeEmailLower(email: unknown): string | null {
  const s = String(email || "")
    .trim()
    .toLowerCase();
  return s || null;
}

export function normalizeDisplayName(name: unknown): string | null {
  const s = String(name || "").trim();
  return s || null;
}

export function normalizePermissions(perms: unknown): string[] {
  if (!Array.isArray(perms)) return [];

  const out = (perms as PermissionLike[])
    .map((p) => {
      if (typeof p === "string") return p.trim();
      if (p && typeof p === "object" && typeof p.value === "string")
        return p.value.trim();
      return "";
    })
    .filter(Boolean);

  // unique, stable
  return Array.from(new Set(out));
}
