// src/utils/showApiError.js
import { errorToI18n } from "./errorText.js";
import type { ToastServiceMethods } from "primevue/toastservice";

type Translator = (key: string, fallback?: string) => string;
type ShowApiErrorOptions = { life?: number };

/**
 * Affiche une erreur API de manière uniforme (toast + i18n)
 *
 * @param {Function} t - fonction de traduction (useLang().t)
 * @param {Object} toast - instance PrimeVue toast (useToast())
 * @param {Error} err - erreur levée par api.js
 * @param {Object} [opts]
 * @param {number} [opts.life=4500]
 */
export function showApiError(
  t: Translator,
  toast: ToastServiceMethods,
  err: unknown,
  opts: ShowApiErrorOptions = {},
): void {
  const life = opts.life ?? 4500;

  const detail = errorToI18n(t, err);

  toast.add({
    severity: "error",
    summary: t("errors.title", "Error"),
    detail,
    life,
  });
}
