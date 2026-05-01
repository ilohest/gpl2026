import test from "node:test";
import assert from "node:assert/strict";
import { Hono } from "hono";
import { createRequireFirebaseAuthHono } from "../hono/middleware/auth.core.js";
import { createGetMeHandler } from "../hono/controllers/me.controller.js";
import { createRefreshDashboardSummaryHandler } from "../hono/controllers/admin.controller.js";
import { forbidden } from "../utils/httpErrors.js";

function createAuthMiddleware(permissions: unknown = ["planner:read"]) {
  return createRequireFirebaseAuthHono({
    verifyIdToken: async () =>
      ({
        uid: "u-1",
        email: "admin@example.com",
        permissions,
      }) as never,
    loadUserDocPermissions: async () => [],
    warn: () => {},
    error: () => {},
  });
}

test("Hono /me route forwards authenticated user context to the injected service", async () => {
  const calls: Array<Record<string, unknown>> = [];
  const app = new Hono();
  app.get(
    "/me",
    createAuthMiddleware(["rsvp:read"]),
    createGetMeHandler({
      getMePayload: async (input) => {
        calls.push(input as Record<string, unknown>);
        return { ok: true, profile: "ok" } as never;
      },
    }),
  );

  const response = await app.request("http://local/me", {
    headers: { authorization: "Bearer valid-token" },
  });

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { ok: true, profile: "ok" });
  assert.deepEqual(calls, [
    {
      uid: "u-1",
      email: "admin@example.com",
      permissionsEffective: ["rsvp:read"],
      claims: {
        uid: "u-1",
        email: "admin@example.com",
        permissions: ["rsvp:read"],
      },
    },
  ]);
});

test("Hono /me route maps service HttpError responses to structured JSON", async () => {
  const app = new Hono();
  app.get(
    "/me",
    createAuthMiddleware(["rsvp:read"]),
    createGetMeHandler({
      getMePayload: async () => {
        throw forbidden("missing_permission", { need: "rsvp:read" });
      },
    }),
  );

  const response = await app.request("http://local/me", {
    headers: { authorization: "Bearer valid-token" },
  });

  assert.equal(response.status, 403);
  assert.deepEqual(await response.json(), {
    ok: false,
    error: "forbidden",
    code: "missing_permission",
    message: "missing_permission",
    meta: { need: "rsvp:read" },
  });
});

test("Hono dashboard refresh route succeeds for authenticated users with any permission", async () => {
  let called = 0;
  const app = new Hono();
  app.post(
    "/admin/dashboard-summary/refresh",
    createAuthMiddleware(["agenda:read"]),
    createRefreshDashboardSummaryHandler({
      recomputeAdminDashboardSummary: async () => {
        called += 1;
        return {} as never;
      },
      logError: () => {},
    }),
  );

  const response = await app.request("http://local/admin/dashboard-summary/refresh", {
    method: "POST",
    headers: { authorization: "Bearer valid-token" },
  });

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { ok: true });
  assert.equal(called, 1);
});

test("Hono dashboard refresh route blocks authenticated users that end up with zero permissions", async () => {
  const app = new Hono();
  app.post(
    "/admin/dashboard-summary/refresh",
    createAuthMiddleware([]),
    createRefreshDashboardSummaryHandler({
      recomputeAdminDashboardSummary: async () => {
        throw new Error("should not run");
      },
      logError: () => {},
    }),
  );

  const response = await app.request("http://local/admin/dashboard-summary/refresh", {
    method: "POST",
    headers: { authorization: "Bearer valid-token" },
  });

  assert.equal(response.status, 403);
  assert.deepEqual(await response.json(), { error: "forbidden" });
});

test("Hono dashboard refresh route returns 500 when recomputation fails", async () => {
  const logs: string[] = [];
  const app = new Hono();
  app.post(
    "/admin/dashboard-summary/refresh",
    createAuthMiddleware(["agenda:read"]),
    createRefreshDashboardSummaryHandler({
      recomputeAdminDashboardSummary: async () => {
        throw new Error("firestore down");
      },
      logError: (...args) => {
        logs.push(args.map((part) => String(part)).join(" "));
      },
    }),
  );

  const response = await app.request("http://local/admin/dashboard-summary/refresh", {
    method: "POST",
    headers: { authorization: "Bearer valid-token" },
  });

  assert.equal(response.status, 500);
  assert.deepEqual(await response.json(), { error: "summary_refresh_failed" });
  assert.equal(logs.length, 1);
  assert.match(logs[0] ?? "", /\[adminDashboard\] refresh summary failed/);
});
