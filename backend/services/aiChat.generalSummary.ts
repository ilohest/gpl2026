import { userHasPermission } from "./aiChat.permissions.js";

type Locale = "en" | "es" | "fr";
type UnknownRecord = Record<string, unknown>;

function normalizeLocale(locale: unknown): Locale {
  const base = String(locale || "")
    .trim()
    .toLowerCase()
    .split("-")[0];
  if (base === "es" || base === "fr") return base;
  return "en";
}

export function buildGeneralSummary({
  data,
  permissions = [],
  locale = "en",
  formatDate,
}: {
  data: Record<string, UnknownRecord>;
  permissions?: unknown;
  locale?: unknown;
  formatDate?: (value: unknown, locale: unknown) => string | null;
}): string {
  const lang = normalizeLocale(locale);
  const perms = Array.isArray(permissions) ? permissions : [];
  const parts: string[] = [];

  if (data.rsvp && userHasPermission(perms, "rsvp:read")) {
    parts.push(
      `RSVP: ${data.rsvp.attending || 0} confirmés, ${data.rsvp.plusOnes || 0} +1, ${data.rsvp.transport || 0} transport, ${data.rsvp.dietYes || 0} avec régime`,
    );
  }
  if (data.finances && userHasPermission(perms, "finances:read")) {
    parts.push(
      `Finances: budget ${data.finances.budgetTotal || 0}€, dépensé ${data.finances.spentTotal || 0}€, restant ${data.finances.remaining || 0}€`,
    );
  }
  if (data.seating && userHasPermission(perms, "menus_seating:read")) {
    parts.push(
      `Plan de table: ${data.seating.totalTables || 0} tables, ${data.seating.unassignedCount || 0} non placés`,
    );
  }
  if (data.playlist && userHasPermission(perms, "playlist:read")) {
    parts.push(`Playlist: ${data.playlist.totalCount || 0} chansons`);
  }
  if (data.agenda && userHasPermission(perms, "agenda:read")) {
    const next =
      data.agenda?.next && typeof data.agenda.next === "object"
        ? (data.agenda.next as UnknownRecord)
        : {};
    const nextTitle = String(next.title || "").trim();
    const nextTime = String(next.time || "").trim();
    parts.push(
      `Agenda: ${data.agenda.totalCount || 0} élément(s), prochain: ${nextTime ? `${nextTime} ` : ""}${nextTitle || "n/a"}`,
    );
  }
  if (data.planner && userHasPermission(perms, "planner:read")) {
    parts.push(
      `Planner: ${data.planner.pendingCount || 0} tâches en cours sur ${data.planner.totalCount || 0}`,
    );
  }
  if (data.blog && userHasPermission(perms, "blog:write")) {
    const lastPost = formatDate ? formatDate(data.blog.lastPostAt, locale) : null;
    parts.push(`Blog: dernier post ${lastPost || "n/a"}`);
  }
  if (data.emails && userHasPermission(perms, "emails:read")) {
    const lastMass = formatDate ? formatDate(data.emails.lastMassEmailAt, locale) : null;
    parts.push(`Emails: dernier envoi ${lastMass || "n/a"}`);
  }

  if (!parts.length) {
    if (lang === "es") return "No hay datos del panel accesibles con tus permisos actuales.";
    if (lang === "fr") {
      return "Aucune donnée du tableau de bord n'est accessible avec vos permissions actuelles.";
    }
    return "No dashboard data is accessible with your current permissions.";
  }

  return parts.join(". ");
}

