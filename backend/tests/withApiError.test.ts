import test from "node:test";
import assert from "node:assert/strict";
import { withApiError } from "../../src/stores/_helpers/withApiError.js";

test("withApiError rethrows errors unchanged when toast feedback is disabled", async () => {
  const error = new Error("boom");

  await assert.rejects(
    () =>
      withApiError(async () => {
        throw error;
      }),
    (caught) => caught === error,
  );
});

test("withApiError shows a toast when translator and toast are provided", async () => {
  const calls: Array<Record<string, unknown>> = [];
  const toast = {
    add(payload: Record<string, unknown>) {
      calls.push(payload);
    },
  };
  const t = (key: string, fallback?: string) => fallback ?? key;
  const error = { status: 404 };

  await assert.rejects(
    () =>
      withApiError(
        async () => {
          throw error;
        },
        { showToast: true, toast: toast as never, t },
      ),
    (caught) => caught === error,
  );

  assert.deepEqual(calls, [
    {
      severity: "error",
      summary: "Error",
      detail: "errors.not_found",
      life: 4500,
    },
  ]);
});

test("withApiError warns instead of crashing when toast dependencies are missing", async () => {
  const warnings: string[] = [];
  const originalWarn = console.warn;
  console.warn = (...args: unknown[]) => {
    warnings.push(args.map((part) => String(part)).join(" "));
  };

  try {
    await assert.rejects(
      () =>
        withApiError(
          async () => {
            throw new Error("boom");
          },
          { showToast: true },
        ),
      /boom/,
    );
  } finally {
    console.warn = originalWarn;
  }

  assert.equal(warnings.length, 1);
  assert.match(warnings[0] ?? "", /\[withApiError\] Missing toast or t/);
});
