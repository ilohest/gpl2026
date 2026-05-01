// backend/hono/controllers/me.controller.ts
import type { Context } from "hono";
import type {} from "../context.js";
import { jsonHttpError } from "../httpErrors.js";

type GetMePayloadFn = (input: {
  uid: string;
  email?: string | null;
  permissionsEffective?: unknown;
  claims?: {
    permissions?: unknown;
    superadmin?: boolean;
    [key: string]: unknown;
  } | null;
}) => Promise<unknown>;

export function createGetMeHandler({
  getMePayload: getMePayloadImpl,
}: {
  getMePayload: GetMePayloadFn;
}) {
  return async function getMeHandler(c: Context) {
    try {
      const user = c.get("user");
      if (!user?.uid) return c.json({ ok: false, error: "unauthorized" }, 401);
      const out = await getMePayloadImpl({
        uid: user.uid,
        email: user.email || null,
        permissionsEffective: user.permissions,
        claims: user.claims,
      });
      return c.json(out);
    } catch (err) {
      return jsonHttpError(c, err, "me");
    }
  };
}

export const getMeHandler = createGetMeHandler({
  getMePayload: async (input) => {
    const { getMePayload } = await import("../../services/me.service.js");
    return getMePayload(input);
  },
});
