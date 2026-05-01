import test from "node:test";
import assert from "node:assert/strict";
import {
  hasAnyPermission,
  hasPermission,
  isSuperadminAuthorized,
  permissionsFromDecodedClaims,
  uniqPermissions,
} from "../hono/authz.js";

test("authz normalizes and de-duplicates permission arrays", () => {
  assert.deepEqual(
    uniqPermissions([" rsvp:read ", "rsvp:read", "", null, "playlist:write"]),
    ["rsvp:read", "playlist:write"],
  );
});

test("authz extracts permissions from decoded claims and promotes superadmin flag", () => {
  const decoded = {
    uid: "user-1",
    superadmin: true,
    permissions: [" rsvp:read ", "playlist:write", "playlist:write"],
  };

  assert.deepEqual(permissionsFromDecodedClaims(decoded as never), [
    "superadmin:all",
    "rsvp:read",
    "playlist:write",
  ]);
});

test("authz permission matcher allows write to satisfy read but not the reverse", () => {
  assert.equal(hasPermission(["rsvp:write"], "rsvp:read"), true);
  assert.equal(hasPermission(["rsvp:read"], "rsvp:write"), false);
  assert.equal(hasPermission(["superadmin:all"], "planner:write"), true);
  assert.equal(hasPermission(["*"], "emails:send"), true);
});

test("authz any-of matcher succeeds as soon as one permission matches", () => {
  assert.equal(hasAnyPermission(["agenda:write"], ["rsvp:read", "agenda:read"]), true);
  assert.equal(hasAnyPermission(["playlist:read"], ["agenda:read", "emails:send"]), false);
});

test("authz superadmin gate accepts claim and permission-based elevation", () => {
  assert.equal(isSuperadminAuthorized({ superadmin: true }, []), true);
  assert.equal(isSuperadminAuthorized({}, ["superadmin:all"]), true);
  assert.equal(isSuperadminAuthorized({}, ["*"]), true);
  assert.equal(isSuperadminAuthorized({}, ["rsvp:write"]), false);
});
