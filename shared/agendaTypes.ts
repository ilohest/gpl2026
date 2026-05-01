// shared/agendaTypes.js

type Translator = (key: string, fallback?: string) => string;
type AgendaItemLike = { type?: string | null } | string | null | undefined;
type TypeMeta = {
  icon: string;
  color: string;
  labelKey: string;
  order: number;
};

export const DEFAULT_TYPE_META: TypeMeta = {
  icon: "pi pi-tag",
  color: "var(--p-slate-500)",
  labelKey: "admin.agenda.types.default",
  order: 999,
};

export const AGENDA_TYPE_META = {
  LOGISTICS: {
    labelKey: "admin.agenda.types.LOGISTICS",
    icon: "pi pi-wrench",
    color: "var(--p-indigo-500)",
    order: 10,
  },
  SETUP: {
    labelKey: "admin.agenda.types.SETUP",
    icon: "pi pi-cog",
    color: "var(--p-indigo-400)",
    order: 11,
  },
  CLEANUP: {
    labelKey: "admin.agenda.types.CLEANUP",
    icon: "pi pi-trash",
    color: "var(--p-slate-600)",
    order: 12,
  },

  CEREMONY: {
    labelKey: "admin.agenda.types.CEREMONY",
    icon: "pi pi-heart",
    color: "var(--p-pink-500)",
    order: 20,
  },
  COCKTAIL: {
    labelKey: "admin.agenda.types.COCKTAIL",
    icon: "pi pi-trophy",
    color: "var(--p-amber-500)",
    order: 21,
  },
  DINNER: {
    labelKey: "admin.agenda.types.DINNER",
    icon: "pi pi-apple",
    color: "var(--p-emerald-500)",
    order: 22,
  },
  PARTY: {
    labelKey: "admin.agenda.types.PARTY",
    icon: "pi pi-star",
    color: "var(--p-violet-500)",
    order: 23,
  },

  SPEECH: {
    labelKey: "admin.agenda.types.SPEECH",
    icon: "pi pi-megaphone",
    color: "var(--p-orange-500)",
    order: 30,
  },
  PHOTO: {
    labelKey: "admin.agenda.types.PHOTO",
    icon: "pi pi-camera",
    color: "var(--p-sky-500)",
    order: 31,
  },
  VIDEO: {
    labelKey: "admin.agenda.types.VIDEO",
    icon: "pi pi-video",
    color: "var(--p-cyan-600)",
    order: 32,
  },

  MUSIC_CUE: {
    labelKey: "admin.agenda.types.MUSIC_CUE",
    icon: "pi pi-volume-up",
    color: "var(--p-purple-500)",
    order: 40,
  },
  LIGHT_SOUND: {
    labelKey: "admin.agenda.types.LIGHT_SOUND",
    icon: "pi pi-sun",
    color: "var(--p-fuchsia-500)",
    order: 41,
  },

  TRANSPORT: {
    labelKey: "admin.agenda.types.TRANSPORT",
    icon: "pi pi-car",
    color: "var(--p-teal-600)",
    order: 50,
  },
  VENDOR: {
    labelKey: "admin.agenda.types.VENDOR",
    icon: "pi pi-briefcase",
    color: "var(--p-slate-500)",
    order: 51,
  },

  BREAK: {
    labelKey: "admin.agenda.types.BREAK",
    icon: "pi pi-clock",
    color: "var(--p-slate-400)",
    order: 60,
  },

  OTHER: {
    labelKey: "admin.agenda.types.OTHER",
    icon: "pi pi-ellipsis-h",
    color: "var(--p-slate-500)",
    order: 999,
  },
} as const satisfies Record<string, TypeMeta>;

type AgendaTypeCode = keyof typeof AGENDA_TYPE_META;

function getType(itemOrType: AgendaItemLike): string {
  return String(
    typeof itemOrType === "string" ? itemOrType : itemOrType?.type || "",
  ).trim();
}

export function getTypeMeta(itemOrType: AgendaItemLike): TypeMeta {
  const type = getType(itemOrType);
  if (!type) return DEFAULT_TYPE_META;
  return AGENDA_TYPE_META[type as AgendaTypeCode] || DEFAULT_TYPE_META;
}

export function typeIcon(itemOrType: AgendaItemLike): string {
  return getTypeMeta(itemOrType).icon;
}

export function typeColor(itemOrType: AgendaItemLike): string {
  return getTypeMeta(itemOrType).color;
}

// t est optionnel: si absent => fallback FR "hardcodé" via key ou via le code brut
export function typeLabelFromMeta(itemOrType: AgendaItemLike, t?: Translator): string {
  const type = getType(itemOrType);
  const key = String(type || "").trim();
  if (!key) return "—";

  const meta = AGENDA_TYPE_META[key as AgendaTypeCode];
  if (!meta) return key;

  if (typeof t === "function") return t(meta.labelKey);

  // fallback si pas de t (au pire on montre le code)
  return key;
}

// Options dropdown (source unique)
export function agendaTypeOptions(
  { includeOther = true, t }: { includeOther?: boolean; t?: Translator } = {},
): Array<{ value: string; label: string }> {
  const entries = Object.entries(AGENDA_TYPE_META)
    .filter(([key]) => (includeOther ? true : key !== "OTHER"))
    .map(([value, meta]) => ({
      value,
      label: typeof t === "function" ? t(meta.labelKey) : value,
      order: meta.order ?? 999,
      icon: meta.icon,
    }))
    .sort((a, b) => a.order - b.order || a.label.localeCompare(b.label));

  return entries.map(({ value, label }) => ({ value, label }));
}
