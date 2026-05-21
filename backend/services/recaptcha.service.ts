// backend/services/recaptcha.service.ts

type RecaptchaSuccess = {
  ok: true;
  score: number | null;
  data: Record<string, unknown> | null;
};

type RecaptchaFailure = {
  ok: false;
  error:
    | "missing_token"
    | "missing_secret"
    | "recaptcha_failed"
    | "recaptcha_bad_action"
    | "recaptcha_low_score";
  data?: Record<string, unknown> | null;
};

function safeStr(v: unknown, max = 6000): string {
  const s = String(v ?? "").trim();
  return s.length > max ? s.slice(0, max) : s;
}

/**
 * Verify reCAPTCHA v3 token.
 * Returns: { ok: true, score, data } or { ok: false, error, data }
 */
export async function verifyRecaptcha(
  recaptchaToken: unknown,
  action = "submit",
): Promise<RecaptchaSuccess | RecaptchaFailure> {
  const secret = process.env.RECAPTCHA_SECRET_KEY;
  const token = safeStr(recaptchaToken, 6000);

  if (!token) return { ok: false, error: "missing_token" };
  if (!secret) return { ok: false, error: "missing_secret" };

  const body = new URLSearchParams({ secret, response: token });

  const resp = await fetch("https://www.google.com/recaptcha/api/siteverify", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  const data = (await resp.json().catch(() => null)) as Record<string, unknown> | null;
  if (!data?.success) {
    console.warn("[recaptcha] verification failed", {
      errorCodes: data?.["error-codes"] || null,
      hostname: data?.hostname || null,
      action: data?.action || null,
    });
    return { ok: false, error: "recaptcha_failed", data };
  }

  const score = typeof data.score === "number" ? data.score : null;
  const act = typeof data.action === "string" ? data.action : null;
  const minScore = Number(process.env.RECAPTCHA_MIN_SCORE || 0.5);

  if (act && action && act !== action)
    return { ok: false, error: "recaptcha_bad_action", data };

  if (score !== null && score < minScore)
    return { ok: false, error: "recaptcha_low_score", data };

  return { ok: true, score, data };
}
