import test from "node:test";
import assert from "node:assert/strict";
import { Hono } from "hono";
import { createRequireFirebaseAuthHono, requirePermissionHono, requireSuperadminHono } from "../hono/middleware/auth.core.js";

function createAuthApp({
  verifyIdToken,
  loadUserDocPermissions = async () => [],
}: {
  verifyIdToken: (token: string) => Promise<{ uid: string; email?: string; permissions?: unknown; superadmin?: boolean }>;
  loadUserDocPermissions?: (uid: string) => Promise<unknown[]>;
}) {
  const app = new Hono();
  const requireAuth = createRequireFirebaseAuthHono({
    verifyIdToken: verifyIdToken as never,
    loadUserDocPermissions,
    warn: () => {},
    error: () => {},
  });

  app.get("/me", requireAuth, (c) => {
    const user = c.get("user");
    return c.json({
      ok: true,
      uid: user.uid,
      email: user.email,
      permissions: user.permissions,
      permissionsFromClaims: user.permissionsFromClaims,
      permissionsFromUserDoc: user.permissionsFromUserDoc,
    });
  });

  app.get("/planner", requireAuth, requirePermissionHono("planner:read"), (c) =>
    c.json({ ok: true, uid: c.get("user").uid }),
  );

  app.get("/superadmin", requireAuth, requireSuperadminHono, (c) =>
    c.json({ ok: true, uid: c.get("user").uid }),
  );

  return app;
}

test("Hono auth route rejects requests without bearer token", async () => {
  const app = createAuthApp({
    verifyIdToken: async () => ({ uid: "u-1" }),
  });

  const response = await app.request("http://local/me");
  assert.equal(response.status, 401);
  assert.deepEqual(await response.json(), { ok: false, error: "unauthorized" });
});

test("Hono auth route merges claim and user-doc permissions for downstream handlers", async () => {
  const app = createAuthApp({
    verifyIdToken: async (token) => {
      assert.equal(token, "valid-token");
      return {
        uid: "u-1",
        email: "admin@example.com",
        permissions: ["planner:read", "planner:read", " ai_chat:use "],
      };
    },
    loadUserDocPermissions: async (uid) => {
      assert.equal(uid, "u-1");
      return ["planner:write", "", null];
    },
  });

  const response = await app.request("http://local/me", {
    headers: { authorization: "Bearer valid-token" },
  });

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    ok: true,
    uid: "u-1",
    email: "admin@example.com",
    permissions: ["planner:read", "ai_chat:use", "planner:write"],
    permissionsFromClaims: ["planner:read", "ai_chat:use"],
    permissionsFromUserDoc: ["planner:write"],
  });
});

test("Hono permission route accepts write permission for read-protected endpoints", async () => {
  const app = createAuthApp({
    verifyIdToken: async () => ({ uid: "u-1", permissions: ["planner:write"] }),
  });

  const response = await app.request("http://local/planner", {
    headers: { authorization: "Bearer valid-token" },
  });

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { ok: true, uid: "u-1" });
});

test("Hono permission route returns structured 403 payload when permission is missing", async () => {
  const app = createAuthApp({
    verifyIdToken: async () => ({ uid: "u-1", permissions: ["rsvp:read"] }),
  });

  const response = await app.request("http://local/planner", {
    headers: { authorization: "Bearer valid-token" },
  });

  assert.equal(response.status, 403);
  assert.deepEqual(await response.json(), {
    ok: false,
    error: "forbidden",
    code: "missing_permission",
    message: "missing_permission",
    meta: {
      need: "planner:read",
      alsoOk: "planner:write",
      got: ["rsvp:read"],
    },
  });
});

test("Hono superadmin route accepts elevation from claims or wildcard permissions", async () => {
  const claimApp = createAuthApp({
    verifyIdToken: async () => ({ uid: "u-claim", superadmin: true }),
  });
  const wildcardApp = createAuthApp({
    verifyIdToken: async () => ({ uid: "u-star", permissions: ["*"] }),
  });

  const claimResponse = await claimApp.request("http://local/superadmin", {
    headers: { authorization: "Bearer claim-token" },
  });
  const wildcardResponse = await wildcardApp.request("http://local/superadmin", {
    headers: { authorization: "Bearer star-token" },
  });

  assert.equal(claimResponse.status, 200);
  assert.deepEqual(await claimResponse.json(), { ok: true, uid: "u-claim" });
  assert.equal(wildcardResponse.status, 200);
  assert.deepEqual(await wildcardResponse.json(), { ok: true, uid: "u-star" });
});

test("Hono auth route degrades gracefully when user-doc permission lookup fails", async () => {
  const app = createAuthApp({
    verifyIdToken: async () => ({ uid: "u-1", permissions: ["planner:read"] }),
    loadUserDocPermissions: async () => {
      throw new Error("firestore unavailable");
    },
  });

  const response = await app.request("http://local/me", {
    headers: { authorization: "Bearer valid-token" },
  });

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    ok: true,
    uid: "u-1",
    email: "",
    permissions: ["planner:read"],
    permissionsFromClaims: ["planner:read"],
    permissionsFromUserDoc: [],
  });
});
