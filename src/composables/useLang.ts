// src/composables/useLang.js
import { ref, computed } from "vue";

type DictValue = unknown;
type DictMap = Record<string, DictValue>;
type TranslateParams = Record<string, unknown>;

const currentLang = ref<string>(localStorage.getItem("lang") || "en");
const dict = ref<DictMap>({});

async function loadLanguage(lang = currentLang.value): Promise<void> {
  try {
    const messages = await import(`@/locales/${lang}.json`) as { default?: DictMap };
    dict.value = (messages.default || {}) as DictMap;
  } catch (e) {
    console.error("i18n load error:", e);
  }
}

async function setLang(lang: string): Promise<void> {
  currentLang.value = lang;
  try {
    localStorage.setItem("lang", lang);
  } catch {}
  await loadLanguage(lang);
}

function t(path: string, arg2?: string | TranslateParams, arg3?: TranslateParams): string {
  let params: TranslateParams = {};
  let fallback = "";

  if (typeof arg2 === "string" || arg2 === undefined) {
    fallback = arg2 ?? "";
    if (arg3 && typeof arg3 === "object") {
      params = arg3;
    }
  } else if (arg2 && typeof arg2 === "object") {
    params = arg2;
  }

  const parts = path.split(".");
  let cur: DictValue = dict.value;

  for (const p of parts) {
    if (cur && typeof cur === "object" && !Array.isArray(cur) && Object.prototype.hasOwnProperty.call(cur, p)) {
      cur = (cur as DictMap)[p];
    } else {
      cur = undefined;
      break;
    }
  }

  let res: string = typeof cur === "string" ? cur : (fallback || path);

  if (params) {
    for (const [key, value] of Object.entries(params)) {
      const re = new RegExp(`\\{${key}\\}`, "g");
      res = res.replace(re, String(value));
    }
  }

  return typeof res === "string" ? res : String(res);
}

const lang = computed(() => currentLang.value);

export function useLang() {
  return { lang, dict, t, loadLanguage, setLang };
}
