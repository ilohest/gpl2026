import type { MiddlewareHandler } from "hono";
import type { DecodedIdToken } from "firebase-admin/auth";
import { forbidden } from "../../utils/httpErrors.js";
import { jsonHttpError } from "../httpErrors.js";
import type { HonoClaims, HonoUser } from "../context.js";
import {
  hasAnyPermission,
  hasPermission,
  isSuperadminAuthorized,
  permissionsFromDecodedClaims,
  uniqPermissions,
} from "../authz.js";

type VerifyIdToken = (token: string) => Promise<DecodedIdToken>;
type LoadUserDocPermissions = (uid: string) => Promise<unknown[]>;
type Logger = (...args: unknown[]) => void;

type AuthDeps = {
  verifyIdToken: VerifyIdToken;
  loadUserDocPermissions: LoadUserDocPermissions;
  warn?: Logger;
  error?: Logger;
};

export function createRequireFirebaseAuthHono({
  verifyIdToken,
  loadUserDocPermissions,
  warn = console.warn,
  error = console.error,
}: AuthDeps): MiddlewareHandler {
  return async (c, next) => {
    try {
      const authHeader = c.req.header("authorization") || "";
      const m = authHeader.match(/^Bearer\s+(.+)$/i);
      const token = m ? m[1] : null;
      if (!token) {
        return c.json({ ok: false, error: "unauthorized" }, 401);
      }

      const decoded = await verifyIdToken(token);
      const fromClaims = permissionsFromDecodedClaims(decoded);

      let fromUserDoc: string[] = [];
      try {
        fromUserDoc = uniqPermissions(await loadUserDocPermissions(decoded.uid));
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err ?? "");
        warn("[auth] cannot read user doc permissions:", msg);
      }

      const permissions = uniqPermissions([...fromClaims, ...fromUserDoc]);
      const claims: HonoClaims = decoded as unknown as HonoClaims;
      const user: HonoUser = {
        uid: decoded.uid,
        email: decoded.email || "",
        claims,
        permissions,
        permissionsFromClaims: fromClaims,
        permissionsFromUserDoc: fromUserDoc,
      };

      c.set("claims", claims);
      c.set("user", user);

      await next();
    } catch (err) {
      error("[auth] verify failed", err);
      return c.json({ ok: false, error: "unauthorized" }, 401);
    }
  };
}

export function requirePermissionHono(need: string): MiddlewareHandler {
  return async (c, next) => {
    const perms = c.get("user")?.permissions || [];
    if (hasPermission(perms, need)) {
      await next();
      return;
    }
    return jsonHttpError(
      c,
      forbidden("missing_permission", {
        need,
        alsoOk: need.endsWith(":read") ? need.replace(/:read$/, ":write") : null,
        got: perms,
      }),
    );
  };
}

export function requireAnyPermissionHono(needs: string[] | string): MiddlewareHandler {
  const list = Array.isArray(needs) ? needs : [needs];
  return async (c, next) => {
    const perms = c.get("user")?.permissions || [];
    if (hasAnyPermission(perms, list)) {
      await next();
      return;
    }
    return jsonHttpError(
      c,
      forbidden("missing_permission", {
        anyOf: list,
        alsoOk: list
          .map((need) => (need.endsWith(":read") ? need.replace(/:read$/, ":write") : null))
          .filter(Boolean),
        got: perms,
      }),
    );
  };
}

export const requireSuperadminHono: MiddlewareHandler = async (c, next) => {
  const claims = c.get("claims") || {};
  const perms = c.get("user")?.permissions || [];
  const ok = isSuperadminAuthorized(claims, perms);
  if (!ok) {
    return c.json(
      {
        ok: false,
        error: "forbidden",
        reason: "requires_superadmin",
      },
      403,
    );
  }
  await next();
};
