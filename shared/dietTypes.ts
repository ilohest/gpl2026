// shared/dietTypes.js

type Translator = (key: string, fallback?: string) => string;
type DietType = {
  code: string;
  i18nKey: string;
  fallbackEs: string;
};

export const DIET_TYPES: DietType[] = [
  {
    code: "vegetarian",
    i18nKey: "rsvp.diet.vegetarian",
    fallbackEs: "Vegetariana",
  },
  { code: "vegan", i18nKey: "rsvp.diet.vegan", fallbackEs: "Vegana" },
  {
    code: "gluten_free",
    i18nKey: "rsvp.diet.gluten_free",
    fallbackEs: "Sin gluten",
  },
  {
    code: "lactose_free",
    i18nKey: "rsvp.diet.lactose_free",
    fallbackEs: "Sin lactosa",
  },
  {
    code: "nuts_allergy",
    i18nKey: "rsvp.diet.nuts_allergy",
    fallbackEs: "Alergia a frutos secos",
  },
  {
    code: "pregnant",
    i18nKey: "rsvp.diet.pregnant",
    fallbackEs: "Embarazo",
  },
  {
    code: "other",
    i18nKey: "rsvp.diet.other",
    fallbackEs: "Otra (especificar)",
  },
];

export const DIET_CODE_SET = new Set(DIET_TYPES.map((x) => x.code));
export const DIET_DEF_BY_CODE = new Map(DIET_TYPES.map((d) => [d.code, d]));

export function normalizeDietCode(code: unknown): string {
  const c = String(code || "")
    .trim()
    .toLowerCase();
  if (!c) return "";
  if (c === "otro") return "other";
  return c;
}

export function normalizeDietCodes(
  codes: unknown,
  { dropUnknown = false }: { dropUnknown?: boolean } = {},
): string[] {
  const arr = Array.isArray(codes) ? codes : [];
  const out = arr.map(normalizeDietCode).filter(Boolean);
  const filtered = dropUnknown ? out.filter((c) => DIET_CODE_SET.has(c)) : out;
  return [...new Set(filtered)];
}

export function ensureOtherIfText(codes: unknown, otherText: unknown): string[] {
  const t = String(otherText || "").trim();
  if (!t) return normalizeDietCodes(codes);
  const set = new Set(normalizeDietCodes(codes));
  set.add("other");
  return Array.from(set);
}

export function dietOptions(t: Translator): Array<{ label: string; value: string }> {
  return DIET_TYPES.map((d) => ({
    label: t(d.i18nKey, d.fallbackEs),
    value: d.code,
  }));
}

export function dietLabel(code: unknown, t?: Translator): string {
  const c = normalizeDietCode(code);
  const def = DIET_DEF_BY_CODE.get(c);
  if (!def) return String(code ?? "");
  return t ? t(def.i18nKey, def.fallbackEs) : def.fallbackEs;
}
