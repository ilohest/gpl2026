// backend/services/aiChat.service.ts
import { firestore } from "../lib/firebase.js";
import { badRequest } from "../utils/httpErrors.js";
import { DIET_TYPES } from "../../shared/dietTypes.js";
import { INTENT_PERMISSION, canRunIntent } from "./aiChat.permissions.js";
import { buildGeneralSummary } from "./aiChat.generalSummary.js";

type Locale = "en" | "es" | "fr";
type UnknownRecord = Record<string, unknown>;
type ChatHistoryItem = { role?: string; text?: string };
type IntentResult = { intent: string; params: UnknownRecord };

const OPENAI_MODEL = String(
  process.env.OPENAI_PLANNER_MODEL || "gpt-5-mini",
).trim();

const SUPPORTED_LOCALES = new Set<Locale>(["en", "es", "fr"]);

const L10N: Record<Locale, Record<string, string>> = {
  en: {
    permissionDenied:
      'You do not have permission to access data in section "{section}". Contact an administrator for access.',
  },
  es: {
    permissionDenied:
      'No tienes permisos para acceder a los datos de la sección "{section}". Contacta con un administrador para solicitar acceso.',
  },
  fr: {
    permissionDenied:
      'Vous n\'avez pas les permissions nécessaires pour accéder aux données de la section "{section}". Contactez un administrateur pour obtenir les accès requis.',
  },
};

function normalizeLocale(locale: unknown): Locale {
  const base = String(locale || "")
    .trim()
    .toLowerCase()
    .split("-")[0];
  if (SUPPORTED_LOCALES.has(base as Locale)) return base as Locale;
  return "en";
}

function tr(locale: unknown, key: string, params: UnknownRecord = {}): string {
  const loc = normalizeLocale(locale);
  let text = L10N[loc]?.[key] || L10N.en?.[key] || key;
  for (const [k, v] of Object.entries(params || {})) {
    text = text.replaceAll(`{${k}}`, String(v));
  }
  return text;
}

const DIET_ES_BY_CODE = new Map(DIET_TYPES.map((d) => [d.code, d.fallbackEs]));
const DIET_EN_BY_CODE = new Map([
  ["vegetarian", "Vegetarian"],
  ["vegan", "Vegan"],
  ["gluten_free", "Gluten-free"],
  ["lactose_free", "Lactose-free"],
  ["nuts_allergy", "Nut allergy"],
  ["pregnant", "Pregnancy"],
  ["other", "Other"],
]);
const DIET_FR_BY_CODE = new Map([
  ["vegetarian", "Végétarien"],
  ["vegan", "Vegan"],
  ["gluten_free", "Sans gluten"],
  ["lactose_free", "Sans lactose"],
  ["nuts_allergy", "Allergie aux fruits à coque"],
  ["pregnant", "Grossesse"],
  ["other", "Autre"],
]);

const AGENDA_OWNER_LABELS: Record<Locale, Record<string, string>> = {
  en: {
    DJ: "DJ",
    CATERER: "Caterer",
    PHOTOGRAPHER: "Photographer",
    OFFICIANT: "Officiant",
    WITNESSES: "Witnesses",
    FAMILY: "Family",
    WEDDING_PLANNER: "GPL 2026 planner",
    COORDINATION: "Coordination",
    SOUND_LIGHT: "Sound & light",
  },
  es: {
    DJ: "DJ",
    CATERER: "Catering",
    PHOTOGRAPHER: "Fotógrafo",
    OFFICIANT: "Oficiante",
    WITNESSES: "Testigos",
    FAMILY: "Familia",
    WEDDING_PLANNER: "GPL 2026 planner",
    COORDINATION: "Coordinación",
    SOUND_LIGHT: "Sonido e iluminación",
  },
  fr: {
    DJ: "DJ",
    CATERER: "Traiteur",
    PHOTOGRAPHER: "Photographe",
    OFFICIANT: "Officiant",
    WITNESSES: "Témoins",
    FAMILY: "Famille",
    WEDDING_PLANNER: "GPL 2026 planner",
    COORDINATION: "Coordination",
    SOUND_LIGHT: "Son & lumière",
  },
};

function agendaTagLabel(tag: unknown, locale: unknown = "en"): string {
  const lang = normalizeLocale(locale);
  const key = String(tag || "").trim().toUpperCase();
  return AGENDA_OWNER_LABELS[lang]?.[key] || key;
}

function prettifyToken(token: unknown): string {
  return String(token || "")
    .replace(/[_-]+/g, " ")
    .trim()
    .replace(/\b\w/g, (m) => m.toUpperCase());
}

function participantLabel(value: unknown, locale: unknown = "en"): string {
  const lang = normalizeLocale(locale);
  const v = String(value || "").trim();
  const key = v.toLowerCase();
  const map: Record<string, Record<Locale, string>> = {
    "couple__primary": { en: "Primary participant", es: "Participante principal", fr: "Mariée" },
    "couple__bride": { en: "Primary participant", es: "Participante principal", fr: "Mariée" },
    "couple__groom": { en: "Companion", es: "Acompañante", fr: "Marié" },
  };
  if (map[key]) return map[key][lang];
  if (/[a-z]+__[a-z0-9_]+/i.test(v)) return prettifyToken(v);
  return v;
}

function ownerTagAliases(tag: unknown): string[] {
  const t = String(tag || "").trim().toUpperCase();
  if (!t) return [];
  const map: Record<string, string[]> = {
    DJ: ["DJ"],
    CATERER: ["CATERER", "CATERING", "TRAITEUR", "TRAITEURS"],
    PHOTOGRAPHER: ["PHOTOGRAPHER", "FOTOGRAFO", "PHOTOGRAPHE"],
    OFFICIANT: ["OFFICIANT", "OFICIANTE"],
    WITNESSES: ["WITNESSES", "WITNESS", "TESTIGOS", "TEMOINS", "TEMOIN"],
    FAMILY: ["FAMILY", "FAMILIA", "FAMILLE"],
    WEDDING_PLANNER: ["WEDDING_PLANNER", "WEDDINGPLANNER", "PLANNER"],
    COORDINATION: ["COORDINATION", "COORDINACION"],
    SOUND_LIGHT: ["SOUND_LIGHT", "SONIDO", "LUMIERE", "LIGHT", "SOUND"],
  };
  const aliases = map[t] || [t];
  return Array.from(new Set(aliases.map((x) => String(x).trim().toUpperCase())));
}

/* ------------------------------------------------------------------ */
/*  Intent → required permission mapping                               */
/* ------------------------------------------------------------------ */

const INTENT_SECTION_LABEL: Record<string, string> = {
  count_diet: "RSVP / Invités",
  count_attending: "RSVP / Invités",
  count_children: "RSVP / Invités",
  count_couples: "RSVP / Invités",
  wedding_parts_attendance: "RSVP / Invités",
  list_attending: "RSVP / Invités",
  count_not_responded: "RSVP / Invités",
  count_transport: "RSVP / Invités",
  guest_lookup: "RSVP / Invités",
  seating_stats: "Plan de table",
  menu_stats: "Menus",
  budget_summary: "Finances",
  latest_blog_post: "Blog",
  playlist_stats: "Playlist",
  playlist_search: "Playlist",
  agenda_stats: "Agenda",
  planner_stats: "GPL 2026 Planner",
  users_permissions: "Superadmin / Utilisateurs",
  invites_summary: "Superadmin / Invitations",
  invite_lookup: "Superadmin / Invitations",
};

const VALID_INTENTS = Object.keys(INTENT_PERMISSION);

function normalizeForMatch(text: unknown): string {
  return String(text || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");
}

function extractRequestedTopN(message: unknown, fallback = 5, max = 25): number {
  const m = String(message || "").match(/\b(?:top|first|premiers?|primeros?)\s*(\d{1,2})\b/i);
  if (!m) return fallback;
  const n = Number(m[1]);
  if (!Number.isFinite(n) || n <= 0) return fallback;
  return Math.min(max, n);
}

function messageWantsAnomalies(message: unknown): boolean {
  const norm = normalizeForMatch(message);
  return (
    norm.includes("anomal") ||
    norm.includes("problem") ||
    norm.includes("warning") ||
    norm.includes("doublon") ||
    norm.includes("double") ||
    norm.includes("duplicate") ||
    norm.includes("a verifier") ||
    norm.includes("a revoir")
  );
}

function messageWantsDetails(message: unknown): boolean {
  const norm = normalizeForMatch(message);
  return (
    norm.includes("detail") ||
    norm.includes("details") ||
    norm.includes("liste") ||
    norm.includes("list") ||
    norm.includes("qui") ||
    norm.includes("nombre") ||
    norm.includes("nombres") ||
    norm.includes("who are") ||
    norm.includes("quien") ||
    norm.includes("quienes") ||
    norm.includes("cuales son") ||
    norm.includes("que invitados") ||
    norm.includes("que invitado") ||
    norm.includes("que personas")
  );
}

function isShortAffirmative(message: unknown): boolean {
  const norm = normalizeForMatch(message)
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .trim();
  if (!norm) return false;
  const tokens = norm.split(/\s+/).filter(Boolean);
  if (tokens.length > 4) return false;
  const text = tokens.join(" ");
  const yesPhrases = new Set([
    "si",
    "sí",
    "yes",
    "oui",
    "ok",
    "okay",
    "claro",
    "vale",
    "dale",
    "por favor",
    "please",
    "go ahead",
    "vas y",
  ]);
  return yesPhrases.has(text);
}

function resolveFollowUpContext({
  message,
  history = [],
}: {
  message: unknown;
  history?: ChatHistoryItem[];
}): { effectiveMessage: string; forceIncludeDetails: boolean } {
  const current = String(message || "").trim();
  if (!isShortAffirmative(current)) {
    return { effectiveMessage: current, forceIncludeDetails: false };
  }

  const prevUser = [...(Array.isArray(history) ? history : [])]
    .reverse()
    .find((m) => String(m?.role || "") === "user" && String(m?.text || "").trim());

  if (!prevUser) {
    return { effectiveMessage: current, forceIncludeDetails: true };
  }

  const previousQuestion = String(prevUser.text || "").trim();
  if (!previousQuestion) {
    return { effectiveMessage: current, forceIncludeDetails: true };
  }

  return {
    effectiveMessage: `${previousQuestion}\nShow the requested details and names.`,
    forceIncludeDetails: true,
  };
}

function extractAgendaQueryHints(message: unknown): { query: string; ownerTag: string } {
  const norm = normalizeForMatch(message);
  const hints = {
    query: "",
    ownerTag: "",
  };

  if (/\bdj\b/.test(norm)) {
    hints.query = "dj";
    hints.ownerTag = "DJ";
    return hints;
  }
  if (/\bphotograph|fotografo|photographe\b/.test(norm)) {
    hints.query = "photograph";
    hints.ownerTag = "PHOTOGRAPHER";
    return hints;
  }
  if (/\bcater|traiteur|catering\b/.test(norm)) {
    hints.query = "cater";
    hints.ownerTag = "CATERER";
    return hints;
  }
  if (/\btestig|temoin|temoins|witness\b/.test(norm)) {
    hints.query = "testigos";
    hints.ownerTag = "WITNESSES";
    return hints;
  }

  const quoted = String(message || "").match(/["“](.+?)["”]/);
  if (quoted?.[1]) {
    hints.query = String(quoted[1]).trim().toLowerCase();
  }

  return hints;
}

function normalizeWeddingPartCode(raw: unknown): string {
  const v = normalizeForMatch(String(raw || "").trim());
  if (!v) return "";
  if (
    v.includes("misa") ||
    v.includes("iglesia") ||
    v.includes("mass") ||
    v.includes("ceremon")
  ) {
    return "mass";
  }
  if (v.includes("cocktail") || v.includes("coctel") || v.includes("aperitif")) {
    return "cocktailReception";
  }
  if (v.includes("cena") || v.includes("dinner") || v.includes("banquete")) {
    return "dinner";
  }
  if (v.includes("fiesta") || v.includes("party") || v.includes("pista")) {
    return "party";
  }
  if (v.includes("brunch")) {
    return "brunch";
  }
  return "";
}

function extractWeddingPartHint(message: unknown): string {
  return normalizeWeddingPartCode(message);
}

function weddingPartLabel(code: unknown, locale: unknown = "en"): string {
  const lang = normalizeLocale(locale);
  const codeKey = String(code || "");
  const labels: Record<string, Record<Locale, string>> = {
    mass: { es: "misa", en: "mass", fr: "messe" },
    cocktailReception: { es: "cóctel", en: "cocktail reception", fr: "cocktail" },
    dinner: { es: "cena", en: "dinner", fr: "dîner" },
    party: { es: "fiesta", en: "party", fr: "soirée" },
    brunch: { es: "brunch", en: "brunch", fr: "brunch" },
  };
  return labels[codeKey]?.[lang] || codeKey;
}

function dietLabelByLang(code: unknown, locale: unknown = "en"): string {
  const c = String(code || "").trim().toLowerCase();
  if (!c) return "";
  const lang = normalizeLocale(locale);
  if (lang === "en") return DIET_EN_BY_CODE.get(c) || c;
  if (lang === "es") return DIET_ES_BY_CODE.get(c) || c;
  return DIET_FR_BY_CODE.get(c) || DIET_ES_BY_CODE.get(c) || c;
}

function yesNoLabel(value: unknown, locale: unknown = "en"): string {
  const lang = normalizeLocale(locale);
  if (lang === "es") return value ? "sí" : "no";
  if (lang === "fr") return value ? "oui" : "non";
  return value ? "yes" : "no";
}

function attendanceLabel(value: unknown, locale: unknown = "en"): string {
  const lang = normalizeLocale(locale);
  if (lang === "es") {
    if (value === true) return "confirmado";
    if (value === false) return "declinado";
    return "sin respuesta";
  }
  if (lang === "fr") {
    if (value === true) return "confirmé";
    if (value === false) return "décliné";
    return "sans réponse";
  }
  if (value === true) return "confirmed";
  if (value === false) return "declined";
  return "no response";
}

/* ------------------------------------------------------------------ */
/*  OpenAI helpers                                                     */
/* ------------------------------------------------------------------ */

function extractOutputText(payload: unknown): string {
  const body = payload && typeof payload === "object"
    ? (payload as UnknownRecord)
    : {};
  if (typeof body.output_text === "string" && body.output_text.trim()) {
    return body.output_text.trim();
  }
  const chunks = Array.isArray(body.output) ? body.output : [];
  const texts: string[] = [];
  for (const chunk of chunks) {
    const block = chunk && typeof chunk === "object"
      ? (chunk as UnknownRecord)
      : {};
    const content = Array.isArray(block.content) ? block.content : [];
    for (const part of content) {
      const piece = part && typeof part === "object"
        ? (part as UnknownRecord)
        : {};
      if (typeof piece.text === "string" && piece.text.trim()) {
        texts.push(piece.text.trim());
      }
    }
  }
  return texts.join("\n").trim();
}

async function callOpenAI({
  system,
  user,
}: {
  system: string;
  user: string;
}): Promise<string> {
  const apiKey = String(process.env.OPENAI_API_KEY || "").trim();
  if (!apiKey) {
    throw badRequest("openai_not_configured", { env: "OPENAI_API_KEY" });
  }

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      input: [
        { role: "system", content: [{ type: "input_text", text: system }] },
        { role: "user", content: [{ type: "input_text", text: user }] },
      ],
    }),
  });

  const raw = (await response.json().catch(() => null)) as UnknownRecord | null;
  if (!response.ok) {
    const status = response.status;
    const msg =
      ((raw?.error as UnknownRecord | undefined)?.message as string | undefined) ||
      (raw?.message as string | undefined) ||
      `openai_http_error_${status}`;
    throw badRequest("ai_chat_failed", { status, message: msg });
  }

  return extractOutputText(raw || "");
}

/* ------------------------------------------------------------------ */
/*  Phase 1: Intent classification                                     */
/* ------------------------------------------------------------------ */

const CLASSIFY_SYSTEM = [
  "You are an intent classifier for a wedding management app.",
  "Given a user message, return ONLY valid JSON: { \"intent\": string, \"params\": object }",
  "",
  "Available intents:",
  "- count_diet: questions about dietary restrictions/allergies (params: { dietCode?: string })",
  "  dietCode values: vegetarian, vegan, gluten_free, lactose_free, nuts_allergy, pregnant, other",
  "- count_attending: how many people are attending",
  "- count_children: questions about children/kids attending (uses guests.isChild)",
  "- count_couples: how many couples are attending",
  "- wedding_parts_attendance: who attends a specific wedding part (mass/ceremony, cocktail, dinner, party, brunch) (params: { weddingPart?: string })",
  "- list_attending: who is attending (names)",
  "- count_not_responded: how many haven't responded yet",
  "- count_transport: how many need transport",
  "- guest_lookup: looking up a specific guest by name (params: { name: string })",
  "- seating_stats: questions about seating tables, capacity (params: { perTable?: number })",
  "- menu_stats: questions about menu assignments/popularity",
  "- budget_summary: questions about budget, expenses, remaining money",
  "- latest_blog_post: questions about the latest/last published blog post",
  "- playlist_stats: questions about the playlist / songs",
  "- playlist_search: check if a song or artist is in the playlist (params: { query: string })",
  "- agenda_stats: questions about agenda timeline, next events",
  "- planner_stats: questions about planner tasks, pending/completed, next task",
  "- users_permissions: questions about users and their permissions (params: { email?: string, permission?: string })",
  "- invites_summary: questions about invitation stats/statuses",
  "- invite_lookup: lookup invitations by email (params: { email: string })",
  "- general: anything else, greetings, or unclear intent",
  "",
  "Rules:",
  "- Return ONLY JSON, no markdown, no explanation.",
  "- If unsure, use intent \"general\" with empty params {}.",
  "- For diet questions, try to map to a dietCode. If generic diet question, omit dietCode.",
].join("\n");

async function classifyIntent(message: string): Promise<IntentResult> {
  const text = await callOpenAI({
    system: CLASSIFY_SYSTEM,
    user: message,
  });

  try {
    const parsed = JSON.parse(text) as UnknownRecord;
    const intentValue = String(parsed?.intent || "");
    const intent = VALID_INTENTS.includes(intentValue)
      ? intentValue
      : "general";
    return {
      intent,
      params:
        parsed?.params && typeof parsed.params === "object"
          ? (parsed.params as UnknownRecord)
          : {},
    };
  } catch {
    // Try to extract JSON from response
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    if (start >= 0 && end > start) {
      try {
        const parsed = JSON.parse(text.slice(start, end + 1)) as UnknownRecord;
        const intentValue = String(parsed?.intent || "");
        const intent = VALID_INTENTS.includes(intentValue)
          ? intentValue
          : "general";
        return {
          intent,
          params:
            parsed?.params && typeof parsed.params === "object"
              ? (parsed.params as UnknownRecord)
              : {},
        };
      } catch {
        // fallback
      }
    }
    return { intent: "general", params: {} };
  }
}

/* ------------------------------------------------------------------ */
/*  Phase 2: Firestore queries per intent                              */
/* ------------------------------------------------------------------ */

async function queryCountDiet({
  dietCode,
  topN = 8,
  includeAnomalies = false,
  includeDetails = false,
  locale = "en",
}: {
  dietCode?: string;
  topN?: number;
  includeAnomalies?: boolean;
  includeDetails?: boolean;
  locale?: unknown;
}): Promise<string> {
  const lang = normalizeLocale(locale);
  const labels =
    lang === "es"
      ? {
          heading: "restricción",
          detailsOther: 'Detalles de "otra"',
          noOtherText: 'No hay detalle de texto para "otra".',
          examples: "Ejemplos",
          anomalies: "Anomalías",
          guests: "invitados",
          confirmed: "confirmados",
          total: "total",
          top: "Restricciones más frecuentes",
        }
      : lang === "fr"
        ? {
            heading: "restriction",
            detailsOther: 'Détails de "autre"',
            noOtherText: 'Aucun détail texte pour "autre".',
            examples: "Exemples",
            anomalies: "Anomalies",
            guests: "invités",
            confirmed: "confirmés",
            total: "total",
            top: "Top restrictions",
          }
        : {
            heading: "restriction",
            detailsOther: 'Details for "other"',
            noOtherText: 'No text detail is set for "other".',
            examples: "Examples",
            anomalies: "Anomalies",
            guests: "guests",
            confirmed: "confirmed",
            total: "total",
            top: "Top restrictions",
          };

  const snap = await firestore.collection("guests").get();
  let total = 0;
  let attending = 0;
  let withDiet = 0;
  const dietBreakdown: Record<string, number> = {};
  const namesByDiet = new Map<string, string[]>();
  const otherDetails: Array<{ name: string; detail: string; attending: boolean }> = [];
  let inconsistentDietCount = 0;

  snap.forEach((doc) => {
    const g = doc.data() || {};
    total++;
    if (g.attending === true) attending++;
    const codes = Array.isArray(g.dietCodes) ? g.dietCodes : [];
    const otherText = String(g.dietOtherText || "").trim();

    if (codes.length > 0 || otherText) {
      withDiet++;
      for (const c of codes) {
        dietBreakdown[c] = (dietBreakdown[c] || 0) + 1;
        const arr = namesByDiet.get(c) || [];
        const nm =
          String(g.fullName || "").trim() ||
          `${String(g.firstName || "")} ${String(g.lastName || "")}`.trim() ||
          "Inconnu";
        if (arr.length < topN) arr.push(nm);
        namesByDiet.set(c, arr);
      }
      if (otherText) {
        const nm =
          String(g.fullName || "").trim() ||
          `${String(g.firstName || "")} ${String(g.lastName || "")}`.trim() ||
          "Inconnu";
        otherDetails.push({
          name: nm,
          detail: otherText,
          attending: g.attending === true,
        });
      }
    }
    if (g.attending === true && String(g.dietOtherText || "").trim() && codes.length === 0) {
      inconsistentDietCount++;
    }
  });

  if (dietCode) {
    const normalizedDietCode = String(dietCode || "").trim().toLowerCase();
    const count = dietBreakdown[normalizedDietCode] || 0;
    const sample = (namesByDiet.get(normalizedDietCode) || []).slice(0, topN).join(", ");
    const isOther = normalizedDietCode === "other";
    const dietLabel = dietLabelByLang(normalizedDietCode, locale);
    let otherDetailText = "";
    if (isOther) {
      const withText = otherDetails.filter((x) => x.detail).slice(0, topN);
      if (withText.length > 0) {
        otherDetailText = ` ${labels.detailsOther}: ${withText
          .map((x) => `${x.name} (${x.detail})`)
          .join(", ")}.`;
      } else {
        otherDetailText = ` ${labels.noOtherText}`;
      }
    }
    const anomalyText =
      includeAnomalies && inconsistentDietCount > 0
        ? ` ${labels.anomalies}: ${inconsistentDietCount} ${labels.guests} avec détail libre sans code diet.`
        : "";
    if (lang === "es") {
      return `Hay ${count} invitados con la ${labels.heading} "${dietLabel}" sobre ${attending} ${labels.confirmed} (${total} ${labels.guests} en ${labels.total}). ${labels.examples}: ${sample || "ninguno"}.${otherDetailText}${anomalyText}`;
    }
    if (lang === "en") {
      return `There are ${count} guests with "${dietLabel}" ${labels.heading} out of ${attending} ${labels.confirmed} (${total} ${labels.guests} in ${labels.total}). ${labels.examples}: ${sample || "none"}.${otherDetailText}${anomalyText}`;
    }
    return `Il y a ${count} invité(s) avec la ${labels.heading} "${dietLabel}" sur ${attending} ${labels.confirmed} (${total} ${labels.guests} au ${labels.total}). ${labels.examples}: ${sample || "aucun"}.${otherDetailText}${anomalyText}`;
  }

  const ranked = Object.entries(dietBreakdown)
    .sort((a, b) => b[1] - a[1])
    .slice(0, topN)
    .map(([k, v]) => `${dietLabelByLang(k, locale)}: ${v}`)
    .join(", ");
  const anomalyText =
    includeAnomalies && inconsistentDietCount > 0
      ? ` Anomalies: ${inconsistentDietCount} invité(s) avec détail libre sans code diet.`
      : "";
  const otherPreview = includeDetails
    ? (() => {
        const topOther = otherDetails.slice(0, Math.max(1, Math.min(topN, 5)));
        if (topOther.length === 0) return "";
        return ` ${labels.detailsOther}: ${topOther
          .map((x) => `${x.name} (${x.detail})`)
          .join(", ")}${otherDetails.length > topOther.length ? ", ..." : ""}.`;
      })()
    : "";
  if (lang === "es") {
    return `Sobre ${total} invitados (${attending} confirmados), ${withDiet} tienen restricciones alimentarias. ${labels.top}: ${ranked || "ninguna"}.${otherPreview}${anomalyText}`;
  }
  if (lang === "en") {
    return `Out of ${total} guests (${attending} confirmed), ${withDiet} have dietary restrictions. ${labels.top}: ${ranked || "none"}.${otherPreview}${anomalyText}`;
  }
  return `Sur ${total} invités (${attending} confirmés), ${withDiet} ont des restrictions alimentaires. ${labels.top}: ${ranked || "aucune"}.${otherPreview}${anomalyText}`;
}

async function queryCountAttending({ topN = 8 }: { topN?: number }): Promise<string> {
  const snap = await firestore.collection("guests").get();
  let total = 0;
  let attending = 0;
  let declined = 0;
  let noResponse = 0;
  const recentAttendingNames: string[] = [];

  snap.forEach((doc) => {
    const g = doc.data() || {};
    total++;
    if (g.attending === true) {
      attending++;
      if (recentAttendingNames.length < topN) {
        const nm =
          String(g.fullName || "").trim() ||
          `${String(g.firstName || "")} ${String(g.lastName || "")}`.trim() ||
          "Inconnu";
        recentAttendingNames.push(nm);
      }
    }
    else if (g.attending === false) declined++;
    else noResponse++;
  });

  return `${attending} personnes ont confirmé leur présence, ${declined} ont décliné, ${noResponse} n'ont pas encore répondu. Total: ${total} invités. Exemples de confirmés: ${recentAttendingNames.join(", ") || "aucun"}.`;
}

async function queryCountChildren({
  topN = 20,
  includeDetails = false,
}: {
  topN?: number;
  includeDetails?: boolean;
}): Promise<string> {
  const snap = await firestore.collection("guests").get();
  let total = 0;
  let attending = 0;
  let childrenAttending = 0;
  let childrenDeclined = 0;
  let childrenNoResponse = 0;
  const childrenNames: string[] = [];

  snap.forEach((doc) => {
    const g = doc.data() || {};
    total++;
    if (g.attending === true) attending++;
    if (g.isChild !== true) return;

    const name =
      String(g.fullName || "").trim() ||
      `${String(g.firstName || "")} ${String(g.lastName || "")}`.trim() ||
      "—";

    if (g.attending === true) {
      childrenAttending++;
      if (includeDetails && childrenNames.length < topN) childrenNames.push(name);
      return;
    }
    if (g.attending === false) {
      childrenDeclined++;
      return;
    }
    childrenNoResponse++;
  });

  const totalChildren = childrenAttending + childrenDeclined + childrenNoResponse;
  const base = `Enfants (isChild=true): ${totalChildren} au total. ${childrenAttending} confirmés, ${childrenDeclined} ont décliné, ${childrenNoResponse} sans réponse. Total invités: ${total}, confirmés: ${attending}.`;
  if (!includeDetails) return base;
  if (!childrenAttending) return `${base} Aucun enfant confirmé à lister.`;
  const extra = Math.max(0, childrenAttending - childrenNames.length);
  return `${base} Enfants confirmés: ${childrenNames.join(", ")}${extra > 0 ? ` (et ${extra} autre(s))` : ""}.`;
}

async function queryListAttending(): Promise<string> {
  const snap = await firestore.collection("guests").get();
  const names: string[] = [];
  let attendingCount = 0;

  snap.forEach((doc) => {
    const g = doc.data() || {};
    if (g.attending === true) {
      attendingCount++;
      const name =
        String(g.fullName || "").trim() ||
        `${String(g.firstName || "")} ${String(g.lastName || "")}`.trim() ||
        "Inconnu";
      names.push(name);
    }
  });

  if (names.length === 0) return "Personne n'a encore confirmé sa présence.";
  if (names.length > 200) {
    // Trop de noms, on coupe
    return `Il y a ${attendingCount} personnes confirmées. Voici les 100 premiers: ${names.slice(0, 100).join(", ")}...`;
  }
  return `Il y a ${attendingCount} personnes confirmées: ${names.join(", ")}.`;
}

async function queryCountNotResponded({ topN = 20 }: { topN?: number }): Promise<string> {
  const snap = await firestore.collection("guests").get();
  let total = 0;
  let noResponse = 0;
  const names: string[] = [];

  snap.forEach((doc) => {
    const g = doc.data() || {};
    total++;
    if (g.attending == null) {
      noResponse++;
      const name =
        String(g.fullName || "").trim() ||
        `${String(g.firstName || "")} ${String(g.lastName || "")}`.trim() ||
        "—";
      if (names.length < topN) names.push(name);
    }
  });

  const namesList =
    names.length > 0
      ? ` Parmi eux: ${names.join(", ")}${noResponse > topN ? ` (et ${noResponse - topN} autres)` : ""}.`
      : "";
  return `${noResponse} invité(s) sur ${total} n'ont pas encore répondu.${namesList}`;
}

async function queryCountTransport({
  topN = 25,
  includeDetails = false,
}: {
  topN?: number;
  includeDetails?: boolean;
}): Promise<string> {
  const snap = await firestore.collection("guests").get();
  let attending = 0;
  let needTransport = 0;
  const names: string[] = [];

  snap.forEach((doc) => {
    const g = doc.data() || {};
    if (g.attending === true) {
      attending++;
      if (g.transport === true) {
        needTransport++;
        if (includeDetails && names.length < topN) {
          const name =
            String(g.fullName || "").trim() ||
            `${String(g.firstName || "")} ${String(g.lastName || "")}`.trim() ||
            "—";
          names.push(name);
        }
      }
    }
  });

  const base = `${needTransport} invité(s) confirmé(s) ont besoin de transport (sur ${attending} confirmés).`;
  if (!includeDetails) return base;
  if (needTransport === 0) return `${base} Aucun nom à afficher.`;

  const extra = Math.max(0, needTransport - names.length);
  return `${base} Noms: ${names.join(", ")}${extra > 0 ? ` (et ${extra} autre(s))` : ""}.`;
}

async function queryCountCouples({
  topN = 20,
  includeDetails = false,
}: {
  topN?: number;
  includeDetails?: boolean;
}): Promise<string> {
  const snap = await firestore.collection("guests").get();
  const groups = new Map<string, { primaries: string[]; companions: string[] }>();

  snap.forEach((doc) => {
    const g = doc.data() || {};
    if (g.attending !== true) return;
    if (g.isCouple === true) return; // exclude the event seed data
    const rsvpId = String(g.rsvpId || g.groupId || "").trim();
    if (!rsvpId) return;

    const row = groups.get(rsvpId) || { primaries: [], companions: [] };
    const name =
      String(g.fullName || "").trim() ||
      `${String(g.firstName || "")} ${String(g.lastName || "")}`.trim() ||
      "—";
    const isPrimary = g.isPrimary === true || String(g.role || "").toUpperCase() === "PRIMARY";
    if (isPrimary) row.primaries.push(name);
    else row.companions.push(name);
    groups.set(rsvpId, row);
  });

  const couples: Array<{ primary: string; companion: string }> = [];
  for (const [, row] of groups.entries()) {
    if (!row.primaries.length || !row.companions.length) continue;
    couples.push({
      primary: row.primaries[0] ?? "—",
      companion: row.companions[0] ?? "—",
    });
  }

  const base = `${couples.length} attending couple(s) found.`;
  if (!includeDetails || couples.length === 0) return base;
  const preview = couples
    .slice(0, Math.max(1, topN))
    .map((c) => `${c.primary} + ${c.companion}`)
    .join(", ");
  const extra = Math.max(0, couples.length - Math.max(1, topN));
  return `${base} Couples: ${preview}${extra > 0 ? ` (and ${extra} more)` : ""}.`;
}

async function queryWeddingPartsAttendance({
  weddingPart = "",
  topN = 25,
  includeDetails = false,
  locale = "en",
}: {
  weddingPart?: string;
  topN?: number;
  includeDetails?: boolean;
  locale?: unknown;
}): Promise<string> {
  const lang = normalizeLocale(locale);
  const selectedPart = normalizeWeddingPartCode(weddingPart);
  const [guestsSnap, rsvpsSnap] = await Promise.all([
    firestore.collection("guests").get(),
    firestore.collection("rsvps").get(),
  ]);

  const groupPartsById = new Map<string, string[]>();
  rsvpsSnap.forEach((doc) => {
    const v = doc.data() || {};
    const parts = Array.isArray(v.weddingEventParts)
      ? v.weddingEventParts.map((x) => normalizeWeddingPartCode(x)).filter(Boolean)
      : [];
    groupPartsById.set(doc.id, parts);
  });

  const perPart = new Map<string, string[]>([
    ["mass", []],
    ["cocktailReception", []],
    ["dinner", []],
    ["party", []],
    ["brunch", []],
  ]);

  guestsSnap.forEach((doc) => {
    const g = doc.data() || {};
    if (g.attending !== true) return;
    if (g.isCouple === true) return;
    const name =
      String(g.fullName || "").trim() ||
      `${String(g.firstName || "")} ${String(g.lastName || "")}`.trim() ||
      "—";
    const guestPartsRaw = Array.isArray(g.weddingEventParts) ? g.weddingEventParts : [];
    let guestParts = guestPartsRaw
      .map((x) => normalizeWeddingPartCode(x))
      .filter(Boolean);
    if (!guestParts.length) {
      const rid = String(g.rsvpId || g.groupId || "").trim();
      if (rid && groupPartsById.has(rid)) guestParts = groupPartsById.get(rid) || [];
    }
    guestParts.forEach((part) => {
      const list = perPart.get(part);
      if (list) list.push(name);
    });
  });

  if (selectedPart) {
    const names = perPart.get(selectedPart) || [];
    const partName = weddingPartLabel(selectedPart, lang);
    if (names.length === 0) {
      if (lang === "es") return `No hay invitados confirmados marcados para ${partName}.`;
      if (lang === "fr") return `Aucun invité confirmé n'est indiqué pour ${partName}.`;
      return `No confirmed guests are marked for ${partName}.`;
    }
    const uniqueNames = Array.from(new Set(names));
    const base =
      lang === "es"
        ? `${uniqueNames.length} invitado(s) confirmado(s) irán a ${partName}.`
        : lang === "fr"
          ? `${uniqueNames.length} invité(s) confirmé(s) iront à ${partName}.`
          : `${uniqueNames.length} confirmed guest(s) will attend ${partName}.`;
    if (!includeDetails) return base;
    const shown = uniqueNames.slice(0, Math.max(1, topN));
    const extra = Math.max(0, uniqueNames.length - shown.length);
    return `${base} ${shown.join(", ")}${extra > 0 ? ` (${lang === "es" ? `y ${extra} más` : lang === "fr" ? `et ${extra} autres` : `and ${extra} more`})` : ""}.`;
  }

  const summary = Array.from(perPart.entries())
    .map(([part, names]) => `${weddingPartLabel(part, lang)}: ${Array.from(new Set(names)).length}`)
    .join(", ");
  if (lang === "es") return `Asistencia por parte de la evento: ${summary}.`;
  if (lang === "fr") return `Participation par partie du mariage: ${summary}.`;
  return `Attendance by wedding part: ${summary}.`;
}

async function queryGuestLookup({
  name,
  locale = "en",
}: {
  name?: string;
  locale?: unknown;
}): Promise<string> {
  const lang = normalizeLocale(locale);
  const searchName = String(name || "")
    .trim()
    .toLowerCase();
  if (!searchName) {
    if (lang === "es") return "No se proporcionó ningún nombre para la búsqueda.";
    if (lang === "fr") return "Aucun nom fourni pour la recherche.";
    return "No name was provided for lookup.";
  }

  const snap = await firestore.collection("guests").get();
  const matches: string[] = [];

  // Fetch RSVPs map to get messages/comments efficiently
  const rsvpsSnap = await firestore.collection("rsvps").get();
  const rsvpMap = new Map<string, UnknownRecord>();
  rsvpsSnap.forEach((doc) => {
    rsvpMap.set(doc.id, doc.data() || {});
  });

  snap.forEach((doc) => {
    const g = doc.data() || {};
    const fullName =
      String(g.fullName || "").trim() ||
      `${String(g.firstName || "")} ${String(g.lastName || "")}`.trim();
    
    const emailLower = String(g.email || "").trim().toLowerCase();
    if (fullName.toLowerCase().includes(searchName) || emailLower.includes(searchName)) {
      const attending = attendanceLabel(g.attending, lang);
      
      const dietCodes = Array.isArray(g.dietCodes) ? g.dietCodes : [];
      let dietInfo = "";
      if (dietCodes.length > 0) {
        dietInfo += dietCodes.map((code) => dietLabelByLang(code, lang)).join(", ");
      }
      if (g.dietOtherText) {
        const detailsLabel =
          lang === "es" ? "Detalles" : lang === "fr" ? "Détails" : "Details";
        dietInfo += ` (${detailsLabel}: ${g.dietOtherText})`;
      }
      if (dietInfo) {
        const dietLabelText =
          lang === "es" ? "Dieta" : lang === "fr" ? "Régime" : "Diet";
        dietInfo = `, ${dietLabelText}: ${dietInfo}`;
      }

      const transportText =
        lang === "es" ? "Transporte" : lang === "fr" ? "Transport" : "Transport";
      const transport = `, ${transportText}: ${yesNoLabel(g.transport === true, lang)}`;
      const emailLabel = lang === "es" ? "Email" : lang === "fr" ? "Email" : "Email";
      const email = g.email ? `, ${emailLabel}: ${g.email}` : "";
      
      // Get RSVP group details (message, comments, songs)
      let rsvpDetails = "";
      const rsvpId = String(g.rsvpId || "").trim();
      if (rsvpId && rsvpMap.has(rsvpId)) {
        const r = rsvpMap.get(rsvpId);
        if (!r) return;
        if (r.message) {
          const messageLabel =
            lang === "es"
              ? "Mensaje a GPL 2026"
              : lang === "fr"
                ? "Message aux mariés"
                : "Message to GPL 2026";
          rsvpDetails += `\n   - ${messageLabel}: "${r.message}"`;
        }
        if (r.comments) {
          const commentsLabel =
            lang === "es" ? "Comentarios" : lang === "fr" ? "Commentaires" : "Comments";
          rsvpDetails += `\n   - ${commentsLabel}: "${r.comments}"`;
        }
        if (Array.isArray(r.songs) && r.songs.length > 0) {
          const songs = r.songs
            .map((s: unknown) => {
              const song = s && typeof s === "object" ? (s as UnknownRecord) : {};
              return `${song.title as string} (${song.artist as string})`;
            })
            .join(", ");
          const songsLabel =
            lang === "es"
              ? "Canciones sugeridas"
              : lang === "fr"
                ? "Chansons suggérées"
                : "Suggested songs";
          rsvpDetails += `\n   - ${songsLabel}: ${songs}`;
        }
      }

      matches.push(
        `${fullName} [${attending}]${dietInfo}${transport}${email}${rsvpDetails}`,
      );
    }
  });

  if (matches.length === 0) {
    if (lang === "es") return `No se encontró ningún invitado con el nombre "${name}".`;
    if (lang === "fr") return `Aucun invité trouvé avec le nom "${name}".`;
    return `No guest found with the name "${name}".`;
  }
  return matches.join("\n");
}

async function querySeatingStats({
  perTable,
  includeAnomalies = false,
  topN = 8,
}: {
  perTable?: number;
  includeAnomalies?: boolean;
  topN?: number;
}): Promise<string> {
  const [guestsSnap, tablesSnap] = await Promise.all([
    firestore.collection("guests").get(),
    firestore.collection("seatingTables").get(),
  ]);

  let attendingCount = 0;
  guestsSnap.forEach((doc) => {
    const g = doc.data() || {};
    if (g.attending === true) attendingCount++;
  });

  let totalTables = 0;
  let placedCount = 0;
  const tableDetails: Array<{ name: string; seats: number; capacity: number }> = [];
  let overloadedTables = 0;
  let emptyTables = 0;

  tablesSnap.forEach((doc) => {
    const t = doc.data() || {};
    totalTables++;
    const guestIds = Array.isArray(t.guestIds) ? t.guestIds : [];
    placedCount += guestIds.length;
    tableDetails.push({
      name: String(t.label || t.name || doc.id),
      seats: guestIds.length,
      capacity: Number(t.capacity) || 0,
    });
    if (Number(t.capacity) > 0 && guestIds.length > Number(t.capacity)) overloadedTables++;
    if (guestIds.length === 0) emptyTables++;
  });

  const unplaced = Math.max(0, attendingCount - placedCount);
  const capacity = Number(perTable) || 12;
  const tablesNeeded = Math.ceil(attendingCount / capacity);

  let summary = `${attendingCount} invités confirmés, ${totalTables} tables existantes, ${placedCount} placés, ${unplaced} non placés.`;
  summary += ` Pour des tables de ${capacity} personnes, il faudrait ${tablesNeeded} tables.`;

  if (tableDetails.length > 0) {
    summary += ` Tables actuelles: ${tableDetails
      .slice(0, Math.max(1, topN))
      .map((t) => `${t.name} (${t.seats} placés/${t.capacity || "?"})`)
      .join(", ")}${tableDetails.length > topN ? ", ..." : ""}.`;
  }
  if (includeAnomalies) {
    summary += ` Anomalies: ${overloadedTables} table(s) surchargée(s), ${emptyTables} table(s) vide(s).`;
  }

  return summary;
}

async function queryMenuStats({
  topN = 8,
  includeAnomalies = false,
  locale = "en",
}: {
  topN?: number;
  includeAnomalies?: boolean;
  locale?: unknown;
}): Promise<string> {
  const [menusSnap, assignmentsSnap, guestsSnap] = await Promise.all([
    firestore.collection("menus").get(),
    firestore.collection("menuAssignments").get(),
    firestore.collection("guests").get(),
  ]);

  const menuById = new Map<string, string>();
  const menuCoversById = new Map<string, string[]>();
  menusSnap.forEach((doc) => {
    const v = doc.data() || {};
    menuById.set(doc.id, String(v.name || doc.id));
    menuCoversById.set(
      doc.id,
      Array.isArray(v.covers)
        ? v.covers
            .map((x) => String(x || "").trim().toLowerCase())
            .filter(Boolean)
        : [],
    );
  });

  const assignmentsByGuestId = new Map<string, { menuId: unknown; status: string }>();
  assignmentsSnap.forEach((doc) => {
    const a = doc.data() || {};
    assignmentsByGuestId.set(doc.id, {
      menuId: a.menuId ?? null,
      status: String(a.status || ""),
    });
  });

  const menuCounts = new Map<string, number>();
  let needsReview = 0;
  let unassignedCount = 0;
  let attendingGuests = 0;

  guestsSnap.forEach((doc) => {
    const g = doc.data() || {};
    if (g.attending !== true) return;
    attendingGuests++;
    const assignment = assignmentsByGuestId.get(doc.id) || null;
    const menuId = assignment?.menuId ?? null;
    if (menuId) {
      const menuKey = String(menuId);
      menuCounts.set(menuKey, (menuCounts.get(menuKey) || 0) + 1);
    }
    else unassignedCount++;
    if (assignment?.status === "needs_review") needsReview++;
  });

  const ranked = Array.from(menuCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, topN)
    .map(([menuId, count]) => `${menuById.get(menuId) || menuId}: ${count}`)
    .join(", ");

  const restrictionsByMenu = Array.from(menuById.entries())
    .map(([menuId, menuName]) => {
      const covers = menuCoversById.get(menuId) || [];
      const labels = covers.map((c) => dietLabelByLang(c, locale));
      return `${menuName}: ${labels.length ? labels.join(", ") : "aucune restriction spécifique"}`;
    })
    .join(" | ");

  let summary = `${menusSnap.size} menus configurés, ${attendingGuests} invité(s) confirmé(s). ${needsReview} affectation(s) à revoir. ${unassignedCount} invité(s) confirmé(s) sans menu. Répartition: ${ranked || "aucune affectation"}. Restrictions couvertes par menu: ${restrictionsByMenu || "aucune donnée"}.`;
  if (includeAnomalies) {
    summary += ` Anomalies: ${needsReview} affectation(s) à revoir, ${unassignedCount} invité(s) confirmé(s) sans menu.`;
  }
  return summary;
}

async function queryBudgetSummary({
  topN = 5,
  includeAnomalies = false,
}: {
  topN?: number;
  includeAnomalies?: boolean;
}): Promise<string> {
  const [metaSnap, expensesSnap] = await Promise.all([
    firestore.collection("financesMeta").doc("main").get(),
    firestore.collection("financesExpenses").get(),
  ]);

  let budgetTotal = 0;
  let giftsTotal = 0;
  if (metaSnap.exists) {
    const v = metaSnap.data() || {};
    budgetTotal = Number(v.budgetTotal || 0);
    giftsTotal = Number(v.giftsTotal || 0);
  }

  let spentTotal = 0;
  const byCategory = new Map<string, number>();
  const expenses: Array<{ label: string; amount: number; category: string }> = [];
  expensesSnap.forEach((doc) => {
    const v = doc.data() || {};
    const amount = Number(v.amount);
    if (Number.isFinite(amount)) {
      spentTotal += amount;
      const cat = String(v.categoryId || v.category || "uncategorized");
      byCategory.set(cat, (byCategory.get(cat) || 0) + amount);
      expenses.push({
        label: String(v.label || v.title || doc.id),
        amount,
        category: cat,
      });
    }
  });

  const remaining = Math.max(0, budgetTotal - spentTotal);
  const percentUsed = budgetTotal
    ? Math.min(100, Math.round((spentTotal / budgetTotal) * 100))
    : 0;

  const topCategories = Array.from(byCategory.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, topN)
    .map(([cat, amount]) => `${cat}: ${Math.round(amount)}€`)
    .join(", ");
  const topExpenses = expenses
    .sort((a, b) => b.amount - a.amount)
    .slice(0, topN)
    .map((e) => `${e.label} (${Math.round(e.amount)}€)`)
    .join(", ");
  let summary = `Budget total: ${budgetTotal}€, dépensé: ${spentTotal}€ (${percentUsed}%), restant: ${remaining}€. Cadeaux/contributions: ${giftsTotal}€. Nombre de dépenses: ${expensesSnap.size}. Top catégories: ${topCategories || "n/a"}. Top dépenses: ${topExpenses || "n/a"}.`;
  if (includeAnomalies) {
    const uncategorized = byCategory.get("uncategorized") || 0;
    if (uncategorized > 0) summary += ` Anomalies: dépenses non catégorisées (${Math.round(uncategorized)}€).`;
  }
  return summary;
}

function formatFirestoreDate(ts: unknown, locale: unknown = "en"): string | null {
  const outLocale =
    normalizeLocale(locale) === "es"
      ? "es-ES"
      : normalizeLocale(locale) === "fr"
        ? "fr-FR"
        : "en-US";
  try {
    if (!ts) return null;
    if (
      ts &&
      typeof ts === "object" &&
      "toDate" in ts &&
      typeof (ts as { toDate?: unknown }).toDate === "function"
    ) {
      const d = (ts as { toDate: () => Date }).toDate();
      if (d instanceof Date && !Number.isNaN(d.getTime())) {
        return d.toLocaleString(outLocale);
      }
    }
    if (typeof ts === "string") {
      const d = new Date(ts);
      if (!Number.isNaN(d.getTime())) return d.toLocaleString(outLocale);
    }
    return null;
  } catch {
    return null;
  }
}

async function queryLatestBlogPost({ locale = "en" }: { locale?: unknown } = {}): Promise<string> {
  const snap = await firestore
    .collection("blogPosts")
    .orderBy("createdAt", "desc")
    .limit(1)
    .get();

  if (snap.empty) {
    return "Aucun post de blog n'est disponible.";
  }

  const doc = snap.docs[0];
  if (!doc) {
    return "Aucun post de blog n'est disponible.";
  }
  const v = doc.data() || {};
  const texts = v.texts && typeof v.texts === "object" ? v.texts : {};
  const title =
    String(texts.es || "").trim() ||
    String(texts.en || "").trim() ||
    String(texts.fr || "").trim() ||
    "(sans titre)";
  const createdAtLabel = formatFirestoreDate(v.createdAt, locale);

  return `Dernier post: ${title}. ${createdAtLabel ? `Publié le ${createdAtLabel}.` : ""} ID: ${doc.id}.`;
}

async function queryPlaylistStats({
  topN = 8,
  includeAnomalies = false,
}: {
  topN?: number;
  includeAnomalies?: boolean;
}): Promise<string> {
  const snap = await firestore.collection("playlistSongs").get();
  let total = 0;
  let active = 0;
  const byArtist = new Map<string, number>();
  const seenKey = new Set<string>();
  const duplicateSamples: string[] = [];
  let duplicates = 0;

  snap.forEach((doc) => {
    const v = doc.data() || {};
    total++;
    if (v.removed !== true) {
      active++;
      const artist = String(v.artist || "Inconnu").trim();
      const title = String(v.title || "").trim();
      byArtist.set(artist, (byArtist.get(artist) || 0) + 1);
      const key = `${title.toLowerCase()}::${artist.toLowerCase()}`;
      if (seenKey.has(key)) {
        duplicates++;
        if (duplicateSamples.length < topN) {
          duplicateSamples.push(
            `${title || "(sans titre)"} — ${artist || "Inconnu"}`,
          );
        }
      } else {
        seenKey.add(key);
      }
    }
  });

  const topArtists = Array.from(byArtist.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, topN)
    .map(([a, c]) => `${a}: ${c}`)
    .join(", ");
  let summary = `La playlist contient ${active} chansons actives (${total} au total, ${total - active} supprimées). Top artistes: ${topArtists || "n/a"}.`;
  if (includeAnomalies) {
    summary += ` Anomalies: ${duplicates} doublon(s) titre+artiste détecté(s).`;
    if (duplicates > 0) {
      summary += ` Exemples: ${duplicateSamples.join(", ")}.`;
    }
  }
  return summary;
}

async function queryPlaylistLookup({ query }: { query?: string }): Promise<string> {
  const q = String(query || "").toLowerCase().trim();
  const snap = await firestore
    .collection("playlistSongs")
    .where("removed", "==", false)
    .get();

  const matches: string[] = [];
  snap.forEach((doc) => {
    const s = doc.data() || {};
    const title = String(s.title || "").toLowerCase();
    const artist = String(s.artist || "").toLowerCase();
    
    // If no query, return everything (capped). If query, filter.
    if (!q || title.includes(q) || artist.includes(q)) {
      matches.push(`${s.title} (${s.artist})`);
    }
  });

  if (matches.length === 0) return `Aucune chanson trouvée pour "${query}".`;
  
  const totalMatches = matches.length;
  const displayMatches = matches.slice(0, 50).join(", ");
  
  if (totalMatches > 50) {
    return `J'ai trouvé ${totalMatches} chansons correspondant à "${query}". Voici les 50 premières : ${displayMatches}...`;
  }
  return `J'ai trouvé ${totalMatches} chansons : ${displayMatches}.`;
}

async function queryAgendaStats({
  topN = 5,
  includeAnomalies = false,
  query = "",
  ownerTag = "",
  locale = "en",
}: {
  topN?: number;
  includeAnomalies?: boolean;
  query?: string;
  ownerTag?: string;
  locale?: unknown;
}): Promise<string> {
  const snap = await firestore.collection("agendaItems").get();
  const items: Array<{
    time: string;
    title: string;
    notes: string;
    location: string;
    participants: string[];
    ownerTags: string[];
    order: number;
    timeMinutes: number;
  }> = [];

  snap.forEach((doc) => {
    const v = doc.data() || {};
    const time = String(v.time || "").trim();
    const title = String(v.title || "").trim() || "—";
    const notes = String(v.notes || "").trim();
    const location = String(v.location || "").trim();
    const participants = Array.isArray(v.participants)
      ? v.participants.map((x) => String(x || "").trim()).filter(Boolean)
      : [];
    const ownerTags = Array.isArray(v.ownerTags)
      ? v.ownerTags.map((x) => String(x || "").trim().toUpperCase()).filter(Boolean)
      : [];
    const order = Number.isFinite(Number(v.order)) ? Number(v.order) : 999999;
    const timeMinutes = Number.isFinite(Number(v.timeMinutes))
      ? Number(v.timeMinutes)
      : 999999;
    items.push({
      time,
      title,
      notes,
      location,
      participants,
      ownerTags,
      order,
      timeMinutes,
    });
  });

  items.sort((a, b) => {
    if (a.timeMinutes !== b.timeMinutes) return a.timeMinutes - b.timeMinutes;
    if (a.order !== b.order) return a.order - b.order;
    return a.title.localeCompare(b.title);
  });

  const withTime = items.filter((it) => it.time.includes(":"));
  const nextItems = withTime.slice(0, topN);
  const nextText =
    nextItems.length > 0
      ? nextItems.map((it) => `${it.time} ${it.title}`).join(", ")
      : "aucun horaire renseigné";

  const lang = normalizeLocale(locale);
  const labels = {
    en: {
      total: "agenda entries in total",
      withTime: "with time",
      next: "Next items",
      search: "Search",
      matching: "matching entries",
      none: "no matching entries",
      participants: "Participants",
      tags: "Tags",
      anomalies: "Anomalies",
      withoutTime: "items without time",
    },
    es: {
      total: "entradas de agenda en total",
      withTime: "con horario",
      next: "Próximos elementos",
      search: "Búsqueda",
      matching: "entradas coincidentes",
      none: "sin entradas coincidentes",
      participants: "Participantes",
      tags: "Intervinientes",
      anomalies: "Anomalías",
      withoutTime: "elementos sin horario",
    },
    fr: {
      total: "entrée(s) agenda au total",
      withTime: "avec horaire",
      next: "Prochains éléments",
      search: "Recherche",
      matching: "entrée(s) correspondante(s)",
      none: "aucune entrée correspondante",
      participants: "Participants",
      tags: "Intervenants",
      anomalies: "Anomalies",
      withoutTime: "élément(s) sans horaire",
    },
  }[lang];

  let summary = `${items.length} ${labels.total}, ${withTime.length} ${labels.withTime}. ${labels.next}: ${nextText}.`;

  const q = String(query || "").trim().toLowerCase();
  const tag = String(ownerTag || "").trim().toUpperCase();
  const tagAliases = ownerTagAliases(tag);
  if (q || tag) {
    const matches = items.filter((it) => {
      const itemTags = Array.isArray(it.ownerTags) ? it.ownerTags : [];
      const itemTagNorm = itemTags.map((t) => String(t || "").trim().toUpperCase());
      const itemTagLabels = itemTags.map((t) =>
        normalizeForMatch(agendaTagLabel(t, lang)),
      );
      const haystack = [
        it.title,
        it.notes,
        it.location,
        ...(Array.isArray(it.participants) ? it.participants : []),
        ...itemTags,
        ...itemTagLabels,
      ]
        .join(" ")
        .toLowerCase();
      const textMatch = q ? haystack.includes(q) : false;
      const tagMatch = tag
        ? tagAliases.some((a) =>
            itemTagNorm.some(
              (t) => t === a || t.includes(a) || a.includes(t),
            ),
          )
        : false;
      return textMatch || tagMatch;
    });

    if (matches.length > 0) {
      const preview = matches
        .slice(0, topN)
        .map((it) => {
          const actors = it.participants?.length
            ? ` [${labels.participants}: ${it.participants
                .map((p) => participantLabel(p, lang))
                .join(", ")}]`
            : "";
          const tags = it.ownerTags?.length
            ? ` [${labels.tags}: ${it.ownerTags
                .map((t) => agendaTagLabel(t, lang))
                .join(", ")}]`
            : "";
          return `${it.time || "—"} ${it.title}${actors}${tags}`;
        })
        .join(" | ");
      summary += ` ${labels.search} "${q || tag}": ${matches.length} ${labels.matching}. ${preview}.`;
    } else {
      summary += ` ${labels.search} "${q || tag}": ${labels.none}.`;
    }
  }

  if (includeAnomalies) {
    const withoutTime = items.length - withTime.length;
    summary += ` ${labels.anomalies}: ${withoutTime} ${labels.withoutTime}.`;
  }
  return summary;
}

async function queryPlannerStats({
  topN = 5,
  includeAnomalies = false,
}: {
  topN?: number;
  includeAnomalies?: boolean;
}): Promise<string> {
  const snap = await firestore.collection("weddingPlannerTasks").get();
  const tasks: Array<{
    title: string;
    isDone: boolean;
    priority: string;
    dueDate: string;
    dueTime: string;
    dueMs: number;
    order: number;
  }> = [];

  snap.forEach((doc) => {
    const v = doc.data() || {};
    const title = String(v.title || "").trim() || "—";
    const isDone = v.isDone === true;
    const priority = String(v.priority || "").trim().toLowerCase() || "medium";
    const dueDate = String(v.dueDate || "").trim();
    const dueTime = String(v.dueTime || "").trim();
    const order = Number.isFinite(Number(v.order)) ? Number(v.order) : 999999;
    const dueMs =
      /^\d{4}-\d{2}-\d{2}$/.test(dueDate) && /^\d{2}:\d{2}$/.test(dueTime)
        ? new Date(`${dueDate}T${dueTime}:00`).getTime()
        : /^\d{4}-\d{2}-\d{2}$/.test(dueDate)
          ? new Date(`${dueDate}T09:00:00`).getTime()
          : Number.POSITIVE_INFINITY;
    tasks.push({ title, isDone, priority, dueDate, dueTime, dueMs, order });
  });

  const pending = tasks.filter((t) => !t.isDone);
  const done = tasks.length - pending.length;
  const urgentOrHigh = pending.filter(
    (t) => t.priority === "urgent" || t.priority === "high",
  ).length;

  pending.sort((a, b) => {
    if (a.dueMs !== b.dueMs) return a.dueMs - b.dueMs;
    if (a.order !== b.order) return a.order - b.order;
    return a.title.localeCompare(b.title);
  });

  const nextTasks = pending.slice(0, topN).map((t) => {
    const when = t.dueDate
      ? `${t.dueDate}${t.dueTime ? ` ${t.dueTime}` : ""}`
      : "sans date";
    return `${t.title} (${when})`;
  });

  let summary = `${tasks.length} tâche(s) planner au total, ${pending.length} en attente, ${done} terminée(s), ${urgentOrHigh} prioritaire(s). Prochaines tâches: ${nextTasks.join(", ") || "aucune"}.`;
  if (includeAnomalies) {
    const noDatePending = pending.filter((t) => !t.dueDate).length;
    summary += ` Anomalies: ${noDatePending} tâche(s) en attente sans date.`;
  }
  return summary;
}

function normalizePermissionKey(value: unknown): string {
  const v = String(value || "").trim().toLowerCase();
  if (!v) return "";
  const aliases: Record<string, string> = {
    rsvp: "rsvp:read",
    blog: "blog:write",
    playlist: "playlist:read",
    menus: "menus_seating:read",
    seating: "menus_seating:read",
    finances: "finances:read",
    finance: "finances:read",
    agenda: "agenda:read",
    planner: "planner:read",
    email: "emails:read",
    emails: "emails:read",
    chat: "ai_chat:use",
    ai_chat: "ai_chat:use",
  };
  return aliases[v] || v;
}

async function queryUsersPermissions({
  email,
  permission,
}: {
  email?: string;
  permission?: string;
}): Promise<string> {
  const perm = normalizePermissionKey(permission);
  const snap = await firestore.collection("users").get();

  const users: Array<{
    uid: string;
    email: string;
    displayName: string;
    permissions: string[];
  }> = [];
  snap.forEach((doc) => {
    const v = doc.data() || {};
    users.push({
      uid: doc.id,
      email: String(v.emailLower || v.email || "").trim() || "(sans email)",
      displayName: String(v.displayName || "").trim(),
      permissions: Array.isArray(v.permissions) ? v.permissions : [],
    });
  });

  const needle = String(email || "").trim().toLowerCase();
  if (needle) {
    const matches = users.filter((u) => u.email.toLowerCase().includes(needle));
    if (!matches.length) return `Aucun utilisateur trouvé pour "${email}".`;
    return matches
      .slice(0, 10)
      .map((u) => {
        const who = u.displayName ? `${u.displayName} <${u.email}>` : u.email;
        return `${who}: ${u.permissions.join(", ") || "aucune permission"}`;
      })
      .join("\n");
  }

  if (perm) {
    const matches = users.filter(
      (u) =>
        u.permissions.includes(perm) ||
        u.permissions.includes("superadmin:all") ||
        u.permissions.includes("*"),
    );
    if (!matches.length) {
      return `Aucun utilisateur n'a la permission "${perm}".`;
    }
    const names = matches
      .slice(0, 30)
      .map((u) => u.displayName || u.email || u.uid)
      .join(", ");
    return `${matches.length} utilisateur(s) ont "${perm}" (ou superadmin): ${names}${matches.length > 30 ? ", ..." : ""}.`;
  }

  const countByPerm = new Map<string, number>();
  for (const u of users) {
    for (const p of u.permissions) {
      countByPerm.set(p, (countByPerm.get(p) || 0) + 1);
    }
  }
  const top = Array.from(countByPerm.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([p, c]) => `${p}: ${c}`)
    .join(", ");
  return `${users.length} utilisateur(s). Répartition permissions: ${top || "aucune permission attribuée"}.`;
}

async function queryInvitesSummary(): Promise<string> {
  const snap = await firestore.collection("invites").get();
  let total = 0;
  let active = 0;
  let accepted = 0;
  let revoked = 0;
  let expired = 0;
  const now = Date.now();

  snap.forEach((doc) => {
    total++;
    const v = doc.data() || {};
    if (v.revokedAt) {
      revoked++;
      return;
    }
    if (v.acceptedAt) {
      accepted++;
      return;
    }
    const expMs: number | null =
      typeof v?.expiresAt?.toMillis === "function" ? v.expiresAt.toMillis() : null;
    if (expMs !== null && Number.isFinite(expMs) && expMs < now) {
      expired++;
      return;
    }
    active++;
  });

  return `Invitations: ${total} total, ${active} actives, ${accepted} acceptées, ${revoked} révoquées, ${expired} expirées.`;
}

async function queryInviteLookup({
  email,
  locale = "en",
}: {
  email?: string;
  locale?: unknown;
}): Promise<string> {
  const needle = String(email || "").trim().toLowerCase();
  if (!needle) return "Aucun email fourni pour rechercher une invitation.";

  const exactSnap = await firestore
    .collection("invites")
    .where("emailLower", "==", needle)
    .limit(20)
    .get();
  let docs = exactSnap.docs;
  if (!docs.length) {
    const broad = await firestore.collection("invites").get();
    docs = broad.docs.filter((d) =>
      String(d.data()?.emailLower || "")
        .trim()
        .toLowerCase()
        .includes(needle),
    );
  }
  if (!docs.length) return `Aucune invitation trouvée pour "${email}".`;

  const rows: string[] = [];
  docs.slice(0, 20).forEach((doc) => {
    const v = doc.data() || {};
    const status = v.revokedAt ? "REVOQUÉE" : v.acceptedAt ? "ACCEPTÉE" : "ACTIVE";
    const expiresAt = formatFirestoreDate(v.expiresAt, locale);
    const perms = Array.isArray(v.permissions) ? v.permissions.join(", ") : "";
    rows.push(
      `${String(v.emailLower || "").trim() || needle} [${status}]${expiresAt ? ` expire: ${expiresAt}` : ""}${perms ? ` permissions: ${perms}` : ""}`,
    );
  });
  return rows.join("\n");
}

async function queryGeneral({
  permissions = [],
  locale = "en",
}: {
  permissions?: unknown;
  locale?: unknown;
} = {}): Promise<string> {
  // Return a lightweight summary from the cached adminDashboard collection
  const snap = await firestore.collection("adminDashboard").get();
  const data: Record<string, UnknownRecord> = {};
  snap.forEach((doc) => {
    data[doc.id] = doc.data() || {};
  });

  return buildGeneralSummary({
    data,
    permissions,
    locale,
    formatDate: formatFirestoreDate,
  });
}

/* ------------------------------------------------------------------ */
/*  Intent → query dispatcher                                         */
/* ------------------------------------------------------------------ */

type QueryHandler = (params?: UnknownRecord) => Promise<string>;
type QueryInput = Record<string, unknown>;

function withParams<T extends QueryInput>(fn: (params: T) => Promise<string>): QueryHandler {
  return (params) => fn((params || {}) as T);
}

const QUERY_HANDLERS: Record<string, QueryHandler> = {
  count_diet: withParams(queryCountDiet),
  count_attending: withParams(queryCountAttending),
  count_children: withParams(queryCountChildren),
  count_couples: withParams(queryCountCouples),
  wedding_parts_attendance: withParams(queryWeddingPartsAttendance),
  list_attending: () => queryListAttending(),
  count_not_responded: withParams(queryCountNotResponded),
  count_transport: withParams(queryCountTransport),
  guest_lookup: withParams(queryGuestLookup),
  seating_stats: withParams(querySeatingStats),
  menu_stats: withParams(queryMenuStats),
  budget_summary: withParams(queryBudgetSummary),
  latest_blog_post: withParams(queryLatestBlogPost),
  playlist_stats: withParams(queryPlaylistStats),
  playlist_search: withParams(queryPlaylistLookup),
  agenda_stats: withParams(queryAgendaStats),
  planner_stats: withParams(queryPlannerStats),
  users_permissions: withParams(queryUsersPermissions),
  invites_summary: () => queryInvitesSummary(),
  invite_lookup: withParams(queryInviteLookup),
  general: () => queryGeneral(),
};

const INTENT_KEYWORDS: Record<string, string[]> = {
  count_diet: [
    "allerg",
    "diet",
    "régime",
    "regime",
    "gluten",
    "vegan",
    "veggie",
    "vegetar",
    "lactose",
    "nuts",
    "alerg",
  ],
  count_attending: ["combien", "attend", "confirm", "présen", "present", "going", "venir"],
  count_children: [
    "enfant",
    "enfants",
    "niño",
    "niños",
    "nino",
    "ninos",
    "kids",
    "kid",
    "child",
    "children",
    "mineur",
    "mineurs",
  ],
  count_couples: [
    "couple",
    "couples",
    "pareja",
    "parejas",
    "pair",
    "pairs",
    "duo",
    "cuantas parejas",
    "combien de couples",
  ],
  wedding_parts_attendance: [
    "misa",
    "iglesia",
    "ceremonia",
    "mass",
    "wedding part",
    "partes de la evento",
    "cocktail",
    "coctel",
    "dinner",
    "cena",
    "party",
    "fiesta",
    "brunch",
  ],
  list_attending: ["qui vient", "liste", "noms", "who is attending", "guest list"],
  count_not_responded: ["pas répondu", "no response", "not responded", "pending rsvp", "n'a pas encore"],
  count_transport: [
    "transport",
    "transporte",
    "trasporte",
    "transmorte",
    "shuttle",
    "navette",
    "carpool",
  ],
  guest_lookup: ["qui est", "trouve", "lookup", "guest", "invité", "invite", "email de"],
  seating_stats: ["table", "seating", "plac", "non plac", "capacity", "capacité"],
  menu_stats: [
    "menu",
    "menus",
    "plat",
    "meal",
    "assignment",
    "affectation",
    "restriction",
    "restrictions",
    "allerg",
    "couvre",
    "cover",
    "compatible",
  ],
  budget_summary: ["budget", "dépens", "depens", "expense", "cost", "remaining", "restant", "financ"],
  latest_blog_post: ["dernier post", "latest post", "last post", "blog", "publication", "publicación", "posté", "posted"],
  playlist_stats: ["playlist", "chanson", "song", "music", "musique"],
  playlist_search: ["cette chanson", "ce morceau", "is in playlist", "dans la playlist"],
  agenda_stats: ["agenda", "timeline", "planning du jour", "horaire", "schedule"],
  planner_stats: ["tâche", "tache", "todo", "planner", "to-do", "pending task"],
  users_permissions: ["permission", "permissions", "utilisateur", "user", "users", "qui a accès", "who has access"],
  invites_summary: ["invitation", "invitations", "invite", "revoked invite", "active invite", "accepted invite"],
  invite_lookup: ["invitation pour", "invitation de", "invite pour", "invite de", "email invitation"],
};

const SUPPLEMENTAL_SAFE_INTENTS = new Set([
  "count_diet",
  "count_attending",
  "count_children",
  "count_couples",
  "wedding_parts_attendance",
  "list_attending",
  "count_not_responded",
  "count_transport",
  "seating_stats",
  "menu_stats",
  "budget_summary",
  "latest_blog_post",
  "playlist_stats",
  "agenda_stats",
  "planner_stats",
  "users_permissions",
  "invites_summary",
  "invite_lookup",
]);

function scoreRelevantIntents(message: unknown): Array<{ intent: string; score: number }> {
  const norm = normalizeForMatch(message);
  const scored: Array<{ intent: string; score: number }> = [];
  for (const intent of VALID_INTENTS) {
    if (intent === "general") continue;
    const keys = INTENT_KEYWORDS[intent] || [];
    let score = 0;
    for (const k of keys) {
      const kn = normalizeForMatch(k);
      if (kn && norm.includes(kn)) score += 1;
    }
    if (score > 0) scored.push({ intent, score });
  }
  scored.sort((a, b) => b.score - a.score);
  return scored;
}

function hasCompositeCue(message: unknown): boolean {
  const norm = normalizeForMatch(message);
  return (
    norm.includes(" et ") ||
    norm.includes(" and ") ||
    norm.includes(" aussi ") ||
    norm.includes(" ainsi que ") ||
    norm.includes(" + ") ||
    norm.includes(",")
  );
}

function chooseEffectiveIntent({
  classifiedIntent,
  message,
  permissions,
}: {
  classifiedIntent: string;
  message: string;
  permissions: unknown;
}): string | null {
  if (classifiedIntent === "general") {
    const relevant = scoreRelevantIntents(message)
      .filter((x) => x.score >= 1)
      .map((x) => x.intent);
    const fallback = relevant.find((intent) => canRunIntent(intent, permissions));
    if (fallback) return fallback;
    return "general";
  }
  if (canRunIntent(classifiedIntent, permissions)) return classifiedIntent;
  const relevant = scoreRelevantIntents(message)
    .filter((x) => x.score >= 1)
    .map((x) => x.intent);
  const fallback = relevant.find((intent) => canRunIntent(intent, permissions));
  if (fallback) return fallback;
  if (canRunIntent("general", permissions)) return "general";
  return null;
}

function computeSupplementalLimit({
  message,
  detectedCount,
  scope,
}: {
  message: unknown;
  detectedCount: number;
  scope: unknown;
}): number {
  let limit = 2;
  if (detectedCount >= 3) limit = 3;
  if (detectedCount >= 5) limit = 4;
  if (hasCompositeCue(message)) limit += 1;
  if (String(scope || "").toLowerCase() === "superadmin") limit += 1;
  return Math.min(6, Math.max(2, limit));
}

function mergeIntentParams({
  intent,
  params,
  message,
  locale,
  forceIncludeDetails = false,
}: {
  intent: string;
  params: unknown;
  message: string;
  locale: unknown;
  forceIncludeDetails?: boolean;
}): UnknownRecord {
  const base: UnknownRecord =
    params && typeof params === "object" ? ({ ...params } as UnknownRecord) : {};
  const includeAnomalies = messageWantsAnomalies(message);
  const includeDetails = forceIncludeDetails || messageWantsDetails(message);
  const defaultTopN =
    includeDetails &&
    (intent === "wedding_parts_attendance" ||
      intent === "list_attending" ||
      intent === "count_transport" ||
      intent === "count_couples")
      ? 3
      : 6;
  const topN = extractRequestedTopN(message, defaultTopN, 25);
  const agendaHints = extractAgendaQueryHints(message);
  const weddingPart = extractWeddingPartHint(message);

  return {
    ...base,
    topN,
    includeAnomalies,
    includeDetails,
    locale: normalizeLocale(locale),
    ...(intent === "agenda_stats"
      ? {
          query: base.query || agendaHints.query || "",
          ownerTag: base.ownerTag || agendaHints.ownerTag || "",
        }
      : {}),
    ...(intent === "wedding_parts_attendance"
      ? {
          weddingPart: base.weddingPart || weddingPart || "",
        }
      : {}),
    // keep intent-specific params if classifier provided them
    ...(intent === "invite_lookup" && !base.email ? { email: "" } : {}),
  };
}

async function buildDbContext({
  message,
  primaryIntent,
  params,
  permissions,
  scope = "admin",
  locale = "en",
  forceIncludeDetails = false,
}: {
  message: string;
  primaryIntent: string;
  params: UnknownRecord;
  permissions: string[];
  scope?: string;
  locale?: unknown;
  forceIncludeDetails?: boolean;
}): Promise<string> {
  const sections: string[] = [];
  const primaryHandler = QUERY_HANDLERS[primaryIntent] || queryGeneral;
  const primaryParams = mergeIntentParams({
    intent: primaryIntent,
    params,
    message,
    locale,
    forceIncludeDetails,
  });
  primaryParams.permissions = permissions;
  const primaryData = await primaryHandler(primaryParams);
  sections.push(`[${INTENT_SECTION_LABEL[primaryIntent] || primaryIntent}] ${primaryData}`);

  const detectedScores = scoreRelevantIntents(message);
  const detected = detectedScores.map((x) => x.intent);
  let supplemental = detected.filter(
    (intent) =>
      intent !== primaryIntent &&
      SUPPLEMENTAL_SAFE_INTENTS.has(intent) &&
      canRunIntent(intent, permissions),
  );

  if (supplemental.length === 0 && primaryIntent === "general") {
    const defaults =
      String(scope || "").toLowerCase() === "superadmin"
        ? ["users_permissions", "invites_summary", "count_attending", "budget_summary"]
        : [
            "count_attending",
            "budget_summary",
            "latest_blog_post",
            "seating_stats",
            "playlist_stats",
            "agenda_stats",
            "planner_stats",
          ];
    supplemental = defaults.filter((intent) => canRunIntent(intent, permissions));
  }

  const maxSupplemental = computeSupplementalLimit({
    message,
    detectedCount: detectedScores.length,
    scope,
  });
  const selectedSupplemental = supplemental.slice(0, maxSupplemental);
  if (selectedSupplemental.length > 0) {
    const extra = await Promise.all(
      selectedSupplemental.map(async (intent) => {
        const handler = QUERY_HANDLERS[intent];
        try {
          const intentParams = mergeIntentParams({
            intent,
            params: {},
            message,
            locale,
            forceIncludeDetails: false,
          });
          intentParams.permissions = permissions;
          const effectiveHandler = handler || queryGeneral;
          const data = await effectiveHandler(intentParams);
          return `[${INTENT_SECTION_LABEL[intent] || intent}] ${data}`;
        } catch {
          return "";
        }
      }),
    );
    for (const block of extra) {
      if (block) sections.push(block);
    }
  }

  return sections.join("\n\n");
}

/* ------------------------------------------------------------------ */
/*  Phase 3: Answer generation                                         */
/* ------------------------------------------------------------------ */

const ANSWER_SYSTEM = [
  "You are a helpful wedding planning assistant answering questions about the wedding database.",
  "You will receive the user's question and relevant data from the database.",
  "Rules:",
  "- Answer in the target locale provided by the system context.",
  "- Use ONLY the target locale. Do not mix languages in the same answer.",
  "- Be concise, friendly, and precise.",
  "- Use the provided data to answer. Do not invent data.",
  "- Do not introduce facts from previous conversation unless they are present in the current Database data block.",
  "- If the user asks about one area (example: RSVP), do not add cross-module notes (example: invitations, budget) unless the user explicitly asks for comparison.",
  "- If the data is insufficient, say so honestly.",
  "- Use numbers and names from the data.",
  "- Plain text only (no tables, no JSON).",
  "- For lists (3+ items), use one item per line with bullets or numbering.",
  "- For ranked lists, prefer numbering (1), 2), 3)...) with one item per line.",
  "- Add an empty line between two different sections when relevant.",
].join("\n");

function formatAnswerLayout(text: unknown): string {
  let out = String(text || "").trim();
  if (!out) return out;

  // Normalize line endings
  out = out.replace(/\r\n/g, "\n");

  // Split compact ranked lists like "1) ...; 2) ...; 3) ..."
  out = out.replace(/;\s*(?=\d+[).]\s)/g, "\n");

  // Add spacing between common section headers when compacted
  out = out.replace(/\.\s*(Top\s+\d+)/gi, ".\n\n$1");
  out = out.replace(/(\bAnomalies\s*:)/gi, "\n\n$1");

  // Remove excessive blank lines
  out = out.replace(/\n{3,}/g, "\n\n");
  return out.trim();
}

async function generateAnswer(
  message: string,
  history: ChatHistoryItem[],
  dbContext: string,
  locale: unknown = "en",
): Promise<string> {
  const historyText =
    history.length > 0
      ? "Previous conversation:\n" +
        history
          .map((m) => `${m.role === "user" ? "User" : "Assistant"}: ${m.text}`)
          .join("\n") +
        "\n\n"
      : "";

  const userPrompt = [
    `Target locale: ${normalizeLocale(locale)}`,
    historyText,
    `Database data:\n${dbContext}`,
    "",
    `User question: ${message}`,
  ].join("\n");

  return callOpenAI({
    system: ANSWER_SYSTEM,
    user: userPrompt,
  });
}

/* ------------------------------------------------------------------ */
/*  Main chat orchestrator                                             */
/* ------------------------------------------------------------------ */

export async function chat({
  message,
  history = [],
  permissions = [],
  scope = "admin",
  locale = "en",
}: {
  message: unknown;
  history?: ChatHistoryItem[];
  permissions?: string[];
  scope?: string;
  locale?: unknown;
}): Promise<{
  answer: string;
  intent: string;
  classifiedIntent: string;
  denied: boolean;
}> {
  const userMessage = String(message || "").trim();
  if (!userMessage) {
    throw badRequest("validation_error", { field: "message", reason: "empty" });
  }

  // Cap history to last 6 messages for token efficiency
  const recentHistory = history.slice(-6);
  const followUp = resolveFollowUpContext({
    message: userMessage,
    history: recentHistory,
  });
  const intentMessage = followUp.effectiveMessage || userMessage;

  // Phase 1: Classify intent
  const { intent: classifiedIntent, params } = await classifyIntent(intentMessage);
  const intent = chooseEffectiveIntent({
    classifiedIntent,
    message: intentMessage,
    permissions,
  });

  // Permission check
  if (!intent) {
    const section = INTENT_SECTION_LABEL[classifiedIntent] || classifiedIntent;
    return {
      answer: tr(locale, "permissionDenied", { section }),
      intent: classifiedIntent,
      classifiedIntent,
      denied: true,
    };
  }

  // Phase 2: Query Firestore
  const dbContext = await buildDbContext({
    message: intentMessage,
    primaryIntent: intent,
    params,
    permissions,
    scope,
    locale,
    forceIncludeDetails: followUp.forceIncludeDetails,
  });

  // Phase 3: Generate natural language answer
  const answer = await generateAnswer(
    userMessage,
    recentHistory,
    dbContext,
    locale,
  );
  const formattedAnswer = formatAnswerLayout(answer);

  return {
    answer: formattedAnswer,
    intent,
    classifiedIntent,
    denied: false,
  };
}
