// src/utils/errorText.js

type Translator = (key: string, fallback?: string) => string;
type ApiErrorLike = {
  status?: number;
  code?: string;
  message?: string;
  data?: {
    status?: number;
    code?: string;
    meta?: { need?: string };
    need?: string;
  };
};

export function errorToI18n(t: Translator, err: unknown): string {
  const e = (err || {}) as ApiErrorLike;
  const status = e.status ?? e.data?.status ?? null;
  const data = e.data || {};
  const code = data.code || e.code || null;
  const message = String(e.message || "").toLowerCase();

  // 403 => permission (même si code absent)
  if (status === 403 || message === "forbidden") {
    const need = data?.meta?.need || data?.need || "";
    if (need.endsWith(":read")) return t("errors.permission.read");
    if (need.endsWith(":write")) return t("errors.permission.write");
    if (need.includes(":send") || need.endsWith(":send"))
      return t("errors.permission.send");
    return t("errors.permission.generic");
  }

  if (status === 404) return t("errors.not_found");
  if (
    status === 400 &&
    (code === "validation_error" || message === "validation_error")
  )
    return t("errors.validation");

  return t("errors.generic");
}
