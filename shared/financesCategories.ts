// shared/financesCategories.js

type Translator = (key: string, fallback?: string) => string;
type CategoryMeta = { labelKey: string; order: number };
type CategoryLike = { category?: string | null } | string | null | undefined;

export const DEFAULT_CATEGORY_META: CategoryMeta = {
  labelKey: "admin.finances.categories.default",
  order: 999,
};

export const FINANCE_CATEGORY_META = {
  VENUE: { labelKey: "admin.finances.categories.VENUE", order: 10 },
  CATERING: { labelKey: "admin.finances.categories.CATERING", order: 11 },
  DRINKS: { labelKey: "admin.finances.categories.DRINKS", order: 12 },
  CAKE: { labelKey: "admin.finances.categories.CAKE", order: 13 },

  PHOTO_VIDEO: { labelKey: "admin.finances.categories.PHOTO_VIDEO", order: 20 },
  MUSIC: { labelKey: "admin.finances.categories.MUSIC", order: 21 },
  DECOR: { labelKey: "admin.finances.categories.DECOR", order: 22 },
  FLOWERS: { labelKey: "admin.finances.categories.FLOWERS", order: 23 },
  OUTFITS: { labelKey: "admin.finances.categories.OUTFITS", order: 24 },
  BEAUTY: { labelKey: "admin.finances.categories.BEAUTY", order: 25 },

  TRANSPORT: { labelKey: "admin.finances.categories.TRANSPORT", order: 30 },
  LODGING: { labelKey: "admin.finances.categories.LODGING", order: 31 },
  STATIONERY: { labelKey: "admin.finances.categories.STATIONERY", order: 32 },
  GIFTS: { labelKey: "admin.finances.categories.GIFTS", order: 33 },

  FEES: { labelKey: "admin.finances.categories.FEES", order: 40 },
  MISC: { labelKey: "admin.finances.categories.MISC", order: 999 },
} as const satisfies Record<string, CategoryMeta>;

type FinanceCategoryCode = keyof typeof FINANCE_CATEGORY_META;

function getCategory(itemOrCategory: CategoryLike): string {
  return String(
    typeof itemOrCategory === "string" ? itemOrCategory : itemOrCategory?.category || "",
  ).trim();
}

export function getCategoryMeta(itemOrCategory: CategoryLike): CategoryMeta {
  const cat = getCategory(itemOrCategory);
  if (!cat) return DEFAULT_CATEGORY_META;
  return FINANCE_CATEGORY_META[cat as FinanceCategoryCode] || DEFAULT_CATEGORY_META;
}

// même pattern que typeLabelFromMeta
export function categoryLabelFromMeta(itemOrCategory: CategoryLike, t?: Translator): string {
  const code = String(getCategory(itemOrCategory) || "").trim();
  if (!code) return "—";

  const meta = FINANCE_CATEGORY_META[code as FinanceCategoryCode];
  if (!meta) return code; // si jamais tu as un code inconnu, on montre le code

  if (typeof t === "function") return t(meta.labelKey);

  return code;
}

// Options dropdown (source unique)
export function financeCategoryOptions(
  { includeMisc = true, t }: { includeMisc?: boolean; t?: Translator } = {},
): Array<{ value: string; label: string }> {
  const entries = Object.entries(FINANCE_CATEGORY_META)
    .filter(([key]) => (includeMisc ? true : key !== "MISC"))
    .map(([value, meta]) => ({
      value,
      label: typeof t === "function" ? t(meta.labelKey) : value,
      order: meta.order ?? 999,
    }))
    .sort((a, b) => a.order - b.order || a.label.localeCompare(b.label));

  return entries.map(({ value, label }) => ({ value, label }));
}
