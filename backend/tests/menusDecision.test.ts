import test from "node:test";
import assert from "node:assert/strict";
import { getDecisionForGuest } from "../utils/menusDecision.js";

test("menus decision requests review when no active menu is available", () => {
  assert.deepEqual(getDecisionForGuest({}, { menus: [] }), {
    status: "needs_review",
    menuId: null,
    reason: "no_menus",
  });

  assert.deepEqual(
    getDecisionForGuest({}, { menus: [{ id: "archived", active: false }] }),
    {
      status: "needs_review",
      menuId: null,
      reason: "no_menus",
    },
  );
});

test("menus decision forces manual review when free-text dietary notes are present", () => {
  const result = getDecisionForGuest(
    { dietCodes: ["vegetarian"], dietOtherText: "No onion please" },
    {
      menus: [{ id: "vegetarian", covers: ["vegetarian"] }],
    },
  );

  assert.deepEqual(result, {
    status: "needs_review",
    menuId: null,
    reason: "has_other_text",
  });
});

test("menus decision prefers the safest default menu for guests without restrictions", () => {
  const result = getDecisionForGuest(
    {},
    {
      menus: [
        { id: "broad", covers: ["vegetarian"], priority: 10 },
        { id: "default-high", covers: [], priority: 20 },
        { id: "default-low", covers: [], priority: 1 },
      ],
    },
  );

  assert.deepEqual(result, {
    status: "auto",
    menuId: "default-high",
    reason: null,
  });
});

test("menus decision flags ambiguous unrestricted ties instead of guessing", () => {
  const result = getDecisionForGuest(
    {},
    {
      menus: [
        { id: "menu-a", covers: [], priority: 5 },
        { id: "menu-b", covers: [], priority: 5 },
      ],
    },
  );

  assert.deepEqual(result, {
    status: "needs_review",
    menuId: null,
    reason: "ambiguous_tie",
  });
});

test("menus decision chooses the compatible menu with the fewest extra restrictions", () => {
  const result = getDecisionForGuest(
    { dietCodes: ["vegetarian"] },
    {
      menus: [
        { id: "exact", covers: ["vegetarian"], priority: 1 },
        { id: "broader", covers: ["vegetarian", "gluten_free"], priority: 99 },
      ],
    },
  );

  assert.deepEqual(result, {
    status: "auto",
    menuId: "exact",
    reason: null,
  });
});

test("menus decision normalizes diet aliases and falls back to priority on exact ties", () => {
  const result = getDecisionForGuest(
    { dietCodes: ["otro", "vegan"] },
    {
      menus: [
        { id: "vegan-low", covers: ["other", "vegan"], priority: 1 },
        { id: "vegan-high", covers: ["other", "vegan"], priority: 10 },
        { covers: ["other", "vegan"], priority: 100 },
      ],
    },
  );

  assert.deepEqual(result, {
    status: "auto",
    menuId: "vegan-high",
    reason: null,
  });
});

test("menus decision reports no match when no menu fully covers guest restrictions", () => {
  const result = getDecisionForGuest(
    { dietCodes: ["vegan", "gluten_free"] },
    {
      menus: [
        { id: "vegan-only", covers: ["vegan"] },
        { id: "gluten-only", covers: ["gluten_free"] },
      ],
    },
  );

  assert.deepEqual(result, {
    status: "needs_review",
    menuId: null,
    reason: "no_match",
  });
});
