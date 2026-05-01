// backend/hono/httpErrors.ts
import type { Context } from "hono";
import { HttpError } from "../utils/httpErrors.js";

function statusToError(status: number): string {
  if (status === 400) return "bad_request";
  if (status === 401) return "unauthorized";
  if (status === 403) return "forbidden";
  if (status === 404) return "not_found";
  if (status === 409) return "conflict";
  if (status === 410) return "gone";
  return "internal_error";
}

export function jsonHttpError(c: Context, err: unknown, fallbackCtx?: string) {
  if (err instanceof HttpError) {
    return c.json(
      {
        ok: false,
        error: statusToError(err.status),
        code: err.code,
        message: err.code,
        meta: err.meta || null,
      },
      err.status as 400 | 401 | 403 | 404 | 409 | 410,
    );
  }

  if (fallbackCtx) {
    console.error(`[${fallbackCtx}] internal error`, err);
  } else {
    console.error("[hono] internal error", err);
  }

  return c.json(
    {
      ok: false,
      error: "internal_error",
      code: "internal_error",
      message: "internal_error",
      meta: null,
    },
    500,
  );
}

