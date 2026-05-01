// shared/agendaOwners.js

type Translator = (key: string, fallback?: string) => string;
type OwnerStyle = {
  backgroundColor: string;
  color: string;
  border: string;
};

type OwnerMeta = {
  labelKey: string;
  style: OwnerStyle;
  order: number;
};

export const DEFAULT_OWNER_META: OwnerMeta = {
  // plutôt que "admin.agenda.owners.default" (inexistant),
  // on réutilise un libellé existant
  labelKey: "admin.agenda.filter_owner_placeholder",
  style: {
    backgroundColor: "var(--p-slate-100)",
    color: "var(--p-slate-900)",
    border: "1px solid var(--p-slate-300)",
  },
  order: 999,
};

export const AGENDA_OWNER_META = {
  DJ: {
    labelKey: "admin.agenda.ownerTags.DJ",
    style: {
      backgroundColor: "var(--p-slate-900)",
      color: "white",
      border: "1px solid var(--p-slate-900)",
    },
    order: 10,
  },
  CATERER: {
    labelKey: "admin.agenda.ownerTags.CATERER",
    style: {
      backgroundColor: "var(--p-emerald-700)",
      color: "white",
      border: "1px solid var(--p-emerald-700)",
    },
    order: 20,
  },
  PHOTOGRAPHER: {
    labelKey: "admin.agenda.ownerTags.PHOTOGRAPHER",
    style: {
      backgroundColor: "var(--p-sky-700)",
      color: "white",
      border: "1px solid var(--p-sky-700)",
    },
    order: 30,
  },
  OFFICIANT: {
    labelKey: "admin.agenda.ownerTags.OFFICIANT",
    style: {
      backgroundColor: "var(--p-violet-700)",
      color: "white",
      border: "1px solid var(--p-violet-700)",
    },
    order: 40,
  },
  WITNESSES: {
    labelKey: "admin.agenda.ownerTags.WITNESSES",
    style: {
      backgroundColor: "var(--p-amber-700)",
      color: "white",
      border: "1px solid var(--p-amber-700)",
    },
    order: 50,
  },
  FAMILY: {
    labelKey: "admin.agenda.ownerTags.FAMILY",
    style: {
      backgroundColor: "var(--p-orange-700)",
      color: "white",
      border: "1px solid var(--p-orange-700)",
    },
    order: 60,
  },
  WEDDING_PLANNER: {
    labelKey: "admin.agenda.ownerTags.WEDDING_PLANNER",
    style: {
      backgroundColor: "var(--p-pink-700)",
      color: "white",
      border: "1px solid var(--p-pink-700)",
    },
    order: 70,
  },
  COORDINATION: {
    labelKey: "admin.agenda.ownerTags.COORDINATION",
    style: {
      backgroundColor: "var(--p-teal-700)",
      color: "white",
      border: "1px solid var(--p-teal-700)",
    },
    order: 80,
  },
  SOUND_LIGHT: {
    labelKey: "admin.agenda.ownerTags.SOUND_LIGHT",
    style: {
      backgroundColor: "var(--p-slate-700)",
      color: "white",
      border: "1px solid var(--p-slate-700)",
    },
    order: 90,
  },
} as const satisfies Record<string, OwnerMeta>;

type AgendaOwnerCode = keyof typeof AGENDA_OWNER_META;

function normalizeOwner(code: unknown): string {
  return String(code || "")
    .trim()
    .toUpperCase();
}

export function getOwnerMeta(code: unknown): OwnerMeta {
  const k = normalizeOwner(code);
  if (!k) return DEFAULT_OWNER_META;
  return AGENDA_OWNER_META[k as AgendaOwnerCode] || DEFAULT_OWNER_META;
}

export function ownerTagStyle(code: unknown): OwnerStyle {
  return getOwnerMeta(code).style || DEFAULT_OWNER_META.style;
}

export function ownerLabelFromMeta(code: unknown, t?: Translator): string {
  const k = normalizeOwner(code);
  if (!k) return "—";

  const meta = AGENDA_OWNER_META[k as AgendaOwnerCode];
  if (!meta) return k;

  if (typeof t === "function") return t(meta.labelKey);
  return k;
}

export function agendaOwnerOptions(
  { t }: { t?: Translator } = {},
): Array<{ value: string; label: string }> {
  const entries = Object.entries(AGENDA_OWNER_META)
    .map(([value, meta]) => ({
      value,
      label: typeof t === "function" ? t(meta.labelKey) : value,
      order: meta.order ?? 999,
    }))
    .sort((a, b) => a.order - b.order || a.label.localeCompare(b.label));

  return entries.map(({ value, label }) => ({ value, label }));
}

export function agendaOwnerKeys(): AgendaOwnerCode[] {
  return Object.keys(AGENDA_OWNER_META) as AgendaOwnerCode[];
}
