// src/utils/showAuthError.js
import type { ToastServiceMethods } from "primevue/toastservice";

type Translator = (key: string, fallback?: string) => string;
type AuthErrorLike = { code?: string };
type ShowAuthErrorOptions = { life?: number };

export function authErrorToI18n(t: Translator, err: unknown): string {
  const code = String((err as AuthErrorLike)?.code || "");

  if (code === "auth/invalid-credential") {
    // Firebase v9+ (souvent) : email ou mot de passe incorrect
    return t(
      "access.login_invalid_credential",
      "Email o contraseña incorrectos."
    );
  }

  if (code === "auth/wrong-password") {
    return t("access.login_wrong_password", "Contraseña incorrecta.");
  }

  if (code === "auth/user-not-found") {
    return t(
      "access.login_user_not_found",
      "No existe una cuenta con este email."
    );
  }

  if (code === "auth/too-many-requests") {
    return t(
      "access.login_too_many_requests",
      "Demasiados intentos. Inténtalo de nuevo más tarde."
    );
  }

  if (code === "auth/invalid-email") {
    return t("access.login_invalid_email", "Email no válido.");
  }

  return t("access.login_generic", "No se pudo iniciar sesión.");
}

export function showAuthError(
  t: Translator,
  toast: ToastServiceMethods,
  err: unknown,
  opts: ShowAuthErrorOptions = {},
): string {
  const life = opts.life ?? 4500;
  const detail = authErrorToI18n(t, err);

  toast.add({
    severity: "error",
    summary: t("access.toast_login_fail", "No se pudo iniciar sesión."),
    detail,
    life,
  });

  return detail;
}
