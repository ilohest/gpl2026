// src/stores/_helpers/withApiError.js
import { showApiError } from "../../utils/showApiError.js";
import type { ToastServiceMethods } from "primevue/toastservice";

type Translator = (key: string, fallback?: string) => string;
type WithApiErrorOptions = {
  showToast?: boolean;
  toast?: ToastServiceMethods;
  t?: Translator;
};

export async function withApiError<T>(
  fn: () => Promise<T>,
  { showToast = false, toast, t }: WithApiErrorOptions = {},
): Promise<T> {
  try {
    return await fn();
  } catch (e: unknown) {
    if (showToast) {
      if (!toast || !t) {
        // évite un crash silencieux
        console.warn("[withApiError] Missing toast or t for showToast=true");
      } else {
        showApiError(t, toast, e);
      }
    }
    throw e;
  }
}
