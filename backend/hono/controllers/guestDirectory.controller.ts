// backend/hono/controllers/guestDirectory.controller.ts
import type { Context } from "hono";
import type {} from "../context.js";
import { listGuestDirectory } from "../../services/guestDirectory.service.js";
import { badRequest } from "../../utils/httpErrors.js";
import { jsonHttpError } from "../httpErrors.js";

type GuestDirectoryScope = "ALL" | "RESPONDED" | "ONLY_ATTENDING" | "WITH_EMAIL";

const ALLOWED_SCOPES = new Set<GuestDirectoryScope>([
  "ALL",
  "RESPONDED",
  "ONLY_ATTENDING",
  "WITH_EMAIL",
]);

function reqValid<T>(c: Context, target: "json" | "param" | "query"): T {
  return (c.req as { valid: (t: string) => T }).valid(target);
}

function parseGuestDirectoryFields(value: string | undefined): string[] {
  if (value === undefined || value === "") return [];
  const raw = String(value)
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  const allowed = new Set(["menus"]);
  const out: string[] = [];
  const seen = new Set<string>();
  for (const field of raw) {
    if (!allowed.has(field)) throw badRequest("bad_fields");
    if (!seen.has(field)) {
      seen.add(field);
      out.push(field);
    }
  }
  return out;
}

export async function listGuestDirectoryHandler(c: Context) {
  try {
    const { scope, fields } = reqValid<{ scope?: string; fields?: string }>(c, "query");
    const normalizedScope = String(scope || "ALL").trim().toUpperCase() as GuestDirectoryScope;
    if (!ALLOWED_SCOPES.has(normalizedScope)) throw badRequest("bad_scope");

    const parsedFields = parseGuestDirectoryFields(fields);
    const items = await listGuestDirectory({
      scope: normalizedScope,
      fields: parsedFields as never[],
    });
    return c.json({ ok: true, items });
  } catch (err) {
    return jsonHttpError(c, err, "guest-directory.list");
  }
}
