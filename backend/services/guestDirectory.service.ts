// backend/services/guestDirectory.service.ts
// Liste un annuaire d'invités découplé des permissions RSVP.
// Source de vérité: collection Firestore root "guests"
import { firestore } from "../lib/firebase.js";
import { HttpError, badRequest } from "../utils/httpErrors.js";

type GuestDirectoryScope = "ALL" | "RESPONDED" | "ONLY_ATTENDING" | "WITH_EMAIL";
type GuestDirectoryField = "menus";
type PreferredLang = "en" | "es";
type GuestAttending = boolean | null;

interface GuestDirectoryOptions {
  scope?: GuestDirectoryScope;
  fields?: GuestDirectoryField[];
  includeEmails?: boolean;
}

interface GuestDirectoryItemBase {
  guestId: string;
  rsvpId: string | null;
  role: string | null;
  isCouple: boolean;
  firstName: string | null;
  lastName: string | null;
  fullName: string;
  attending: GuestAttending;
  email: string | null;
  preferredLang: PreferredLang;
}

interface GuestDirectoryMenusFields {
  dietCodes: unknown[];
  dietOtherText: string;
}

type GuestDirectoryItem = GuestDirectoryItemBase & Partial<GuestDirectoryMenusFields>;

interface ManualRecipientInput {
  email?: unknown;
  name?: unknown;
  fullName?: unknown;
}

type ResolveRecipientsMode = "ONLY_ATTENDING" | "ALL_RESPONDED" | "MANUAL";

interface ResolveRecipientsOptions {
  mode?: ResolveRecipientsMode | string;
  manualRecipients?: unknown;
}

interface ResolvedRecipient {
  email: string;
  name: string;
  preferredLang?: PreferredLang;
}

function safeEmail(v: unknown): string {
  const s = String(v ?? "")
    .trim()
    .toLowerCase();
  if (!s) return "";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i.test(s)) return "";
  if (s.endsWith("@example.com")) return "";
  return s;
}

function safeStr(v: unknown): string {
  return String(v ?? "").trim();
}

function safeBool(v: unknown): GuestAttending {
  if (typeof v === "boolean") return v;
  if (v === 1 || v === "1") return true;
  if (v === 0 || v === "0") return false;
  // n'accepte pas "si/no" ici: on veut un modèle cohérent.
  return null;
}

function normalizePreferredLang(v: unknown, fallback: PreferredLang = "es"): PreferredLang {
  const s = String(v ?? "")
    .trim()
    .toLowerCase();
  if (s === "en") return "en";
  if (s === "es") return "es";
  return fallback;
}

function sortByName(a: GuestDirectoryItemBase, b: GuestDirectoryItemBase): number {
  return String(a.fullName || "").localeCompare(String(b.fullName || ""));
}

export async function listGuestDirectory({
  scope = "ALL",
  fields = [],
  includeEmails = false,
}: GuestDirectoryOptions = {}): Promise<GuestDirectoryItem[]> {
  const S = String(scope || "ALL")
    .trim()
    .toUpperCase() as GuestDirectoryScope;

  const allowedScopes = new Set<GuestDirectoryScope>([
    "ALL",
    "RESPONDED", // attending est boolean => responded = attending !== null
    "ONLY_ATTENDING",
    "WITH_EMAIL",
  ]);
  if (!allowedScopes.has(S)) throw badRequest("bad_scope");

  const F = Array.isArray(fields)
    ? fields
        .map((x) =>
          String(x || "")
            .trim()
            .toLowerCase(),
        )
        .filter(Boolean) as GuestDirectoryField[]
    : [];
  const allowedFields = new Set<GuestDirectoryField>(["menus"]);
  for (const f of F) if (!allowedFields.has(f)) throw badRequest("bad_fields");

  // "menus" = champs utiles à la section menus (diet codes + other text)
  const wantMenus = F.includes("menus");

  // ✅ Nouveau modèle: guests à la racine
  // NOTE: si volume important, on pourra paginer / indexer par attending/email.
  const snap = await firestore.collection("guests").get();

  const items: GuestDirectoryItem[] = [];

  snap.forEach((docSnap) => {
    const d = docSnap.data() || {};

    // ids
    const guestId = safeStr(d.guestId) || safeStr(docSnap.id);
    if (!guestId) return;

    const rsvpId = safeStr(d.rsvpId) || null;

    // identité (ENGLISH MODEL)
    const firstName = safeStr(d.firstName);
    const lastName = safeStr(d.lastName);

    const fullName =
      safeStr(d.fullName) ||
      safeStr(d.name) ||
      (firstName || lastName ? `${firstName} ${lastName}`.trim() : "") ||
      "—";

    // attending boolean | null (null = pas répondu)
    const attending = safeBool(d.attending);

    // scopes
    const respondedBool = attending !== null;

    if (S === "ONLY_ATTENDING" && attending !== true) return;
    if (S === "RESPONDED" && !respondedBool) return;

    // Only expose emails when explicitly requested.
    // This keeps least-privilege defaults for modules that only need names/attendance/diet.
    const shouldIncludeEmail = includeEmails || S === "WITH_EMAIL";
    const email = shouldIncludeEmail ? safeEmail(d.email) : "";
    if (shouldIncludeEmail && !email) return;

    const base: GuestDirectoryItem = {
      guestId,
      rsvpId,
      role: safeStr(d.role) || null,
      isCouple: !!d.isCouple || rsvpId === "couple",

      // noms (compat UI actuelle si tu veux afficher séparé)
      firstName: firstName || null,
      lastName: lastName || null,
      fullName,

      // attending (cohérent: boolean|null)
      attending, // true | false | null

      // email
      email: email || null,
      preferredLang: normalizePreferredLang(d.preferredLang),
    };

    if (wantMenus) {
      base.dietCodes = Array.isArray(d.dietCodes) ? d.dietCodes : [];
      base.dietOtherText = safeStr(d.dietOtherText) || "";
    }

    items.push(base);
  });

  items.sort(sortByName);
  return items;
}

export async function resolveRecipients({
  mode,
  manualRecipients,
}: ResolveRecipientsOptions = {}): Promise<ResolvedRecipient[]> {
  const m = String(mode || "")
    .trim()
    .toUpperCase() as ResolveRecipientsMode;

  const okModes = new Set<ResolveRecipientsMode>([
    "ONLY_ATTENDING",
    "ALL_RESPONDED",
    "MANUAL",
  ]);
  if (!okModes.has(m)) throw badRequest("bad_mode");

  // --------------------
  // MANUAL
  // --------------------
  if (m === "MANUAL") {
    if (!Array.isArray(manualRecipients) || manualRecipients.length === 0) {
      throw badRequest("missing_recipients");
    }

    const seen = new Set<string>();
    const out: ResolvedRecipient[] = [];
    const invalid: string[] = [];

    for (const raw of manualRecipients) {
      const item: string | ManualRecipientInput =
        typeof raw === "string"
          ? raw
          : raw && typeof raw === "object"
            ? (raw as ManualRecipientInput)
            : "";

      const email = safeEmail(typeof item === "string" ? item : item?.email);

      if (!email) {
        invalid.push(
          String(typeof item === "string" ? item : item?.email || ""),
        );
        continue;
      }

      if (seen.has(email)) continue;
      seen.add(email);

      const name =
        typeof item === "object" && item
          ? safeStr(item.name) || safeStr(item.fullName) || "Guest"
          : "Guest";

      out.push({ email, name });
    }

    if (invalid.length) {
      throw new HttpError(400, "invalid_recipients", { invalid });
    }

    return out;
  }

  // --------------------
  // ONLY_ATTENDING / ALL_RESPONDED
  // --------------------
  const scope = m === "ONLY_ATTENDING" ? "ONLY_ATTENDING" : "RESPONDED";
  const dir = await listGuestDirectory({ scope, includeEmails: true });

  const seen = new Set<string>();
  const out: ResolvedRecipient[] = [];

  for (const x of dir) {
    const email = safeEmail(x.email);
    if (!email) continue;
    if (seen.has(email)) continue;
    seen.add(email);

    const name = safeStr(x.fullName) || "Guest";
    const preferredLang = normalizePreferredLang(x.preferredLang);
    out.push({ email, name, preferredLang });
  }

  if (!out.length) throw new HttpError(404, "no_recipients");
  return out;
}
