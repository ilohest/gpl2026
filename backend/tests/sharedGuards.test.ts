import test from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";
import {
  normalizeDisplayName,
  normalizeEmailLower,
  normalizePermissions,
} from "../domain/normalizers.js";
import { errorToI18n } from "../../src/utils/errorText.js";
import { hasPermission } from "../../src/utils/permissions.js";
import {
  parseTrustedRichText,
  richTextToPlainText,
} from "../../src/utils/richText.js";

type DomGlobals = {
  DOMParser?: typeof globalThis.DOMParser;
  Node?: typeof globalThis.Node;
  Element?: typeof globalThis.Element;
};

function withDom<T>(run: () => T): T {
  const dom = new JSDOM("");
  const previous: DomGlobals = {
    DOMParser: globalThis.DOMParser,
    Node: globalThis.Node,
    Element: globalThis.Element,
  };

  Object.assign(globalThis, {
    DOMParser: dom.window.DOMParser,
    Node: dom.window.Node,
    Element: dom.window.Element,
  });

  try {
    return run();
  } finally {
    Object.assign(globalThis, previous);
  }
}

test("normalizers trim, sanitize and de-duplicate user identity fields", () => {
  assert.equal(normalizeEmailLower("  Alice.Example@Email.COM "), "alice.example@email.com");
  assert.equal(normalizeEmailLower("   "), null);
  assert.equal(normalizeDisplayName("  Alice Example  "), "Alice Example");
  assert.equal(normalizeDisplayName(""), null);

  assert.deepEqual(
    normalizePermissions([
      " guests:read ",
      { value: "guests:read" },
      { value: " guests:write " },
      { value: 42 },
      null,
      "",
    ]),
    ["guests:read", "guests:write"],
  );
});

test("permission helper supports explicit, inherited and wildcard permissions", () => {
  assert.equal(hasPermission(["finances:write"], "finances:read"), true);
  assert.equal(hasPermission(["playlist:read"], "playlist:read"), true);
  assert.equal(hasPermission(["superadmin:all"], "blog:write"), true);
  assert.equal(hasPermission(["*"], "agenda:write"), true);
  assert.equal(hasPermission(["playlist:read"], "playlist:write"), false);
});

test("API error mapping chooses the right translation key for each failure mode", () => {
  const calls: string[] = [];
  const t = (key: string) => {
    calls.push(key);
    return key;
  };

  assert.equal(
    errorToI18n(t, { status: 403, data: { meta: { need: "rsvp:read" } } }),
    "errors.permission.read",
  );
  assert.equal(
    errorToI18n(t, { data: { status: 403, need: "emails:send" } }),
    "errors.permission.send",
  );
  assert.equal(
    errorToI18n(t, { status: 400, code: "validation_error" }),
    "errors.validation",
  );
  assert.equal(errorToI18n(t, { status: 404 }), "errors.not_found");
  assert.equal(errorToI18n(t, new Error("Forbidden")), "errors.permission.generic");
  assert.equal(errorToI18n(t, { status: 500 }), "errors.generic");

  assert.deepEqual(calls, [
    "errors.permission.read",
    "errors.permission.send",
    "errors.validation",
    "errors.not_found",
    "errors.permission.generic",
    "errors.generic",
  ]);
});

test("rich text parser keeps semantic strong text and normalized line breaks", () => {
  const tokens = withDom(() =>
    parseTrustedRichText(`
      <p>Hello <strong>dear</strong> guest</p>
      <div>Second<br/>line</div>
    `),
  );

  assert.deepEqual(tokens, [
    { type: "text", text: "Hello " },
    { type: "strong", text: "dear" },
    { type: "text", text: " guest" },
    { type: "br" },
    { type: "text", text: "Second" },
    { type: "br" },
    { type: "text", text: "line" },
  ]);

  const plainText = withDom(() =>
    richTextToPlainText("<section>Alpha</section><section><b>Beta</b></section>"),
  );

  assert.equal(plainText, "Alpha\nBeta");
});
