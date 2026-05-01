import test from "node:test";
import assert from "node:assert/strict";
import { canRunIntent, INTENT_PERMISSION, userHasPermission } from "../services/aiChat.permissions.js";

test("permission matrix: intent access is denied without required permissions", () => {
  const noPerms: string[] = [];
  for (const [intent, need] of Object.entries(INTENT_PERMISSION)) {
    const allowed = canRunIntent(intent, noPerms);
    if (need === null) assert.equal(allowed, true, `intent ${intent} should be public`);
    else assert.equal(allowed, false, `intent ${intent} should require ${need}`);
  }
});

test("permission matrix: explicit permission grants access", () => {
  for (const [intent, need] of Object.entries(INTENT_PERMISSION)) {
    if (!need) continue;
    assert.equal(
      canRunIntent(intent, [need]),
      true,
      `intent ${intent} should be allowed with ${need}`,
    );
  }
});

test("permission matrix: write implies read", () => {
  assert.equal(userHasPermission(["rsvp:write"], "rsvp:read"), true);
  assert.equal(userHasPermission(["finances:write"], "finances:read"), true);
  assert.equal(userHasPermission(["planner:write"], "planner:read"), true);
});

test("permission matrix: superadmin wildcard grants all intents", () => {
  for (const intent of Object.keys(INTENT_PERMISSION)) {
    assert.equal(canRunIntent(intent, ["superadmin:all"]), true);
    assert.equal(canRunIntent(intent, ["*"]), true);
  }
});

