import test from "node:test";
import assert from "node:assert/strict";
import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { createRequireFirebaseAuthHono, requirePermissionHono } from "../hono/middleware/auth.core.js";
import { rsvpsListQuerySchema } from "../hono/schemas/rsvp.schema.js";
import { financesBudgetBodySchema } from "../hono/schemas/finances.schema.js";
import { setGuestMenuSchema } from "../hono/schemas/menusSeating.schema.js";
import { createListRsvpsHandler } from "../hono/controllers/rsvp.controller.js";
import { createPatchFinancesBudgetHandler } from "../hono/controllers/finances.controller.js";
import { createSetGuestMenuHandler } from "../hono/controllers/menusSeating.controller.js";
import { badRequest } from "../utils/httpErrors.js";

function createAuth(permissions: string[]) {
  return createRequireFirebaseAuthHono({
    verifyIdToken: async () =>
      ({
        uid: "admin-1",
        email: "admin@example.com",
        permissions,
      }) as never,
    loadUserDocPermissions: async () => [],
    warn: () => {},
    error: () => {},
  });
}

test("GET /rsvps validates query and forwards coerced limit to the service", async () => {
  const calls: Array<Record<string, unknown>> = [];
  const app = new Hono();
  app.get(
    "/rsvps",
    createAuth(["rsvp:read"]),
    requirePermissionHono("rsvp:read"),
    zValidator("query", rsvpsListQuerySchema),
    createListRsvpsHandler({
      listRsvps: async (input) => {
        calls.push(input as Record<string, unknown>);
        return [{ id: "rsvp-1" }] as never;
      },
    }),
  );

  const response = await app.request("http://local/rsvps?limit=42", {
    headers: { authorization: "Bearer valid-token" },
  });

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { ok: true, items: [{ id: "rsvp-1" }] });
  assert.deepEqual(calls, [{ limit: 42 }]);
});

test("GET /rsvps rejects invalid query values before the service runs", async () => {
  let called = false;
  const app = new Hono();
  app.get(
    "/rsvps",
    createAuth(["rsvp:read"]),
    requirePermissionHono("rsvp:read"),
    zValidator("query", rsvpsListQuerySchema),
    createListRsvpsHandler({
      listRsvps: async () => {
        called = true;
        return [] as never;
      },
    }),
  );

  const response = await app.request("http://local/rsvps?limit=0", {
    headers: { authorization: "Bearer valid-token" },
  });

  assert.equal(response.status, 400);
  assert.equal(called, false);
});

test("PATCH /finances/budget validates permission and returns normalized payload", async () => {
  const budgets: number[] = [];
  const app = new Hono();
  app.patch(
    "/finances/budget",
    createAuth(["finances:write"]),
    requirePermissionHono("finances:write"),
    zValidator("json", financesBudgetBodySchema),
    createPatchFinancesBudgetHandler({
      patchBudgetTotal: async (budgetTotal) => {
        budgets.push(budgetTotal);
      },
    }),
  );

  const response = await app.request("http://local/finances/budget", {
    method: "PATCH",
    headers: {
      authorization: "Bearer valid-token",
      "content-type": "application/json",
    },
    body: JSON.stringify({ budgetTotal: "1500" }),
  });

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { ok: true, budgetTotal: 1500 });
  assert.deepEqual(budgets, [1500]);
});

test("PATCH /finances/budget maps domain validation errors to HTTP 400", async () => {
  const app = new Hono();
  app.patch(
    "/finances/budget",
    createAuth(["finances:write"]),
    requirePermissionHono("finances:write"),
    zValidator("json", financesBudgetBodySchema),
    createPatchFinancesBudgetHandler({
      patchBudgetTotal: async () => {
        throw badRequest("bad_budget_total");
      },
    }),
  );

  const response = await app.request("http://local/finances/budget", {
    method: "PATCH",
    headers: {
      authorization: "Bearer valid-token",
      "content-type": "application/json",
    },
    body: JSON.stringify({ budgetTotal: 100 }),
  });

  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), {
    ok: false,
    error: "bad_request",
    code: "bad_budget_total",
    message: "bad_budget_total",
    meta: null,
  });
});

test("PUT /menu-assignments/:guestId validates body and applies defaults before calling service", async () => {
  const calls: Array<Record<string, unknown>> = [];
  let refreshes = 0;
  const app = new Hono();
  app.put(
    "/menu-assignments/:guestId",
    createAuth(["menus_seating:write"]),
    requirePermissionHono("menus_seating:write"),
    zValidator("json", setGuestMenuSchema),
    createSetGuestMenuHandler({
      setGuestMenu: async (guestId, payload) => {
        calls.push({ guestId, ...payload });
      },
      triggerAdminDashboardSummaryRefresh: () => {
        refreshes += 1;
      },
    }),
  );

  const response = await app.request("http://local/menu-assignments/guest-42", {
    method: "PUT",
    headers: {
      authorization: "Bearer valid-token",
      "content-type": "application/json",
    },
    body: JSON.stringify({ menuId: "menu-1" }),
  });

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { ok: true });
  assert.deepEqual(calls, [
    { guestId: "guest-42", menuId: "menu-1", locked: true, status: "manual" },
  ]);
  assert.equal(refreshes, 1);
});

test("PUT /menu-assignments/:guestId rejects invalid body before service execution", async () => {
  let called = false;
  const app = new Hono();
  app.put(
    "/menu-assignments/:guestId",
    createAuth(["menus_seating:write"]),
    requirePermissionHono("menus_seating:write"),
    zValidator("json", setGuestMenuSchema),
    createSetGuestMenuHandler({
      setGuestMenu: async () => {
        called = true;
      },
      triggerAdminDashboardSummaryRefresh: () => {},
    }),
  );

  const response = await app.request("http://local/menu-assignments/guest-42", {
    method: "PUT",
    headers: {
      authorization: "Bearer valid-token",
      "content-type": "application/json",
    },
    body: JSON.stringify({ menuId: "" }),
  });

  assert.equal(response.status, 400);
  assert.equal(called, false);
});
