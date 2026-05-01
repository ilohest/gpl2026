import test from "node:test";
import assert from "node:assert/strict";
import {
  canAccessDashboard,
  canAccessEmail,
  canReadEmail,
  canReadModule,
  canSendEmail,
  canUseAiChat,
  canWriteModule,
  claimSuperadmin,
  hasPerm,
  isSuperadminLike,
  uniqPermissions,
} from "../../src/stores/meStore.helpers.js";

const baseState = {
  claims: {},
  permissions: [] as string[],
};

test("meStore helpers normalize permission lists consistently", () => {
  assert.deepEqual(
    uniqPermissions([" rsvp:read ", "rsvp:read", null, "", "planner:write"]),
    ["rsvp:read", "planner:write"],
  );
});

test("meStore helpers detect superadmin from claims and permissions", () => {
  assert.equal(claimSuperadmin({ superadmin: true }), true);
  assert.equal(isSuperadminLike({ claims: {}, permissions: ["superadmin:all"] }), true);
  assert.equal(isSuperadminLike({ claims: {}, permissions: ["*"] }), true);
  assert.equal(isSuperadminLike(baseState), false);
});

test("meStore helpers model module read/write rules correctly", () => {
  const state = { claims: {}, permissions: ["finances:write", "playlist:read"] };
  assert.equal(canReadModule(state, "finances"), true);
  assert.equal(canWriteModule(state, "finances"), true);
  assert.equal(canReadModule(state, "playlist"), true);
  assert.equal(canWriteModule(state, "playlist"), false);
  assert.equal(hasPerm(state, "playlist:read"), true);
  assert.equal(hasPerm(state, "playlist:write"), false);
});

test("meStore helpers keep email capabilities distinct", () => {
  assert.equal(canReadEmail({ claims: {}, permissions: ["emails:read"] }), true);
  assert.equal(canSendEmail({ claims: {}, permissions: ["emails:send"] }), true);
  assert.equal(canAccessEmail({ claims: {}, permissions: ["emails:send"] }), true);
  assert.equal(canAccessEmail(baseState), false);
});

test("meStore helpers expose dashboard and AI chat access safely", () => {
  assert.equal(canAccessDashboard(baseState), false);
  assert.equal(canAccessDashboard({ claims: {}, permissions: ["agenda:read"] }), true);
  assert.equal(canUseAiChat(baseState), false);
  assert.equal(canUseAiChat({ claims: {}, permissions: ["ai_chat:use"] }), true);
  assert.equal(canUseAiChat({ claims: { superadmin: true }, permissions: [] }), true);
});
