// backend/services/rsvps.service.ts
import { firestore, admin } from "../lib/firebase.js";
import weddingConfig from "../../shared/weddingConfig.js";
import {
  dietLabel,
  normalizeDietCodes,
  ensureOtherIfText,
} from "../../shared/dietTypes.js";
import { sendEmail, getInternalEmailTo } from "./email.service.js";
import { buildRsvpConfirmationEmail } from "../emails/templates/rsvpConfirmation.js";
import { buildRsvpInternalNotificationEmail } from "../emails/templates/rsvpInternalNotification.js";
import { verifyRecaptcha } from "./recaptcha.service.js";
import { badRequest, notFound } from "../utils/httpErrors.js";
import {
  loadActiveMenus,
  recomputeAssignmentForGuest,
  deleteAssignmentForGuestId,
} from "./menuAssignmentsAuto.service.js";

type Dict = Record<string, unknown>;
type GuestLike = Dict & {
  id?: string;
  guestId?: string;
  role?: string;
  isPrimary?: boolean;
  index?: unknown;
  firstName?: unknown;
  lastName?: unknown;
  email?: unknown;
  preferredLang?: unknown;
  attending?: unknown;
  transport?: unknown;
  dietCodes?: unknown;
  dietOtherText?: unknown;
  comments?: unknown;
  songs?: unknown;
};

type RsvpLike = Dict & {
  submitter?: Dict;
  songs?: unknown;
  comments?: unknown;
  email?: Dict;
};

type SendEmailInput = {
  to: string;
  subject: string;
  innerHtml: string;
};

const sendEmailFn = sendEmail as unknown as (
  input: SendEmailInput,
) => Promise<unknown>;

function asRecord(value: unknown): Dict {
  return value && typeof value === "object" ? (value as Dict) : {};
}

/* ---------------- small utils ---------------- */

function safeStr(v: unknown, max = 5000): string {
  const s = String(v ?? "").trim();
  return s.length > max ? s.slice(0, max) : s;
}

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i;
function safeEmail(v: unknown): string {
  const s = safeStr(v, 320).toLowerCase();
  return emailRegex.test(s) ? s : "";
}

function safeArr(v: unknown, maxLen = 20): string[] {
  if (!Array.isArray(v)) return [];
  return v
    .map((x) => safeStr(x, 80))
    .filter(Boolean)
    .slice(0, maxLen);
}

function normalizePreferredLang(v: unknown, fallback = "es"): string {
  const s = String(v ?? "")
    .trim()
    .toLowerCase();
  if (s === "en") return "en";
  if (s === "es") return "es";
  return fallback;
}

const WEDDING_EVENT_PARTS = new Set([
  "mass",
  "cocktailReception",
  "dinner",
  "party",
  "brunch",
]);

function normalizeWeddingEventParts(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  const out: string[] = [];
  const seen = new Set<string>();

  for (const raw of v) {
    const key = safeStr(raw, 80);
    if (!WEDDING_EVENT_PARTS.has(key)) continue;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(key);
  }

  return out.slice(0, 5);
}

function toBoolYesNo(v: unknown): boolean | null {
  // keep tolerant for "yes/no" inputs, but no Spanish legacy keys
  if (typeof v === "boolean") return v;
  const s = String(v ?? "")
    .trim()
    .toLowerCase();
  if (s === "yes" || s === "y" || s === "1" || s === "true") return true;
  if (s === "no" || s === "n" || s === "0" || s === "false") return false;
  return null;
}

function coerceMoney(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  if (!Number.isFinite(n) || n < 0) return null;
  return n;
}

function safeSongObj(s: unknown) {
  const song = asRecord(s);
  const title = String(song.title ?? "").trim();
  const artist = String(song.artist ?? "").trim();
  const album = String(song.album ?? "").trim();
  const artworkUrl = String(song.artworkUrl ?? "").trim();
  const previewUrl = String(song.previewUrl ?? "").trim();
  if (!title && !artist && !artworkUrl) return null;
  return { title, artist, album, artworkUrl, previewUrl };
}

/* ---------------- schema helpers ---------------- */

function buildRsvpDoc({
  data,
  createdAt,
  ip,
  ua,
  rc,
}: {
  data: Dict;
  createdAt: FirebaseFirestore.Timestamp;
  ip: unknown;
  ua: unknown;
  rc: Dict;
}): RsvpLike {
  const submitterEmail = safeEmail(data.email);
  const submitterFirstName = safeStr(data.firstName, 120);
  const submitterLastName = safeStr(data.lastName, 180);
  const submitterPreferredLang = normalizePreferredLang(data.preferredLang);

  const groupAttending = toBoolYesNo(data.attending);
  const weddingEventParts = normalizeWeddingEventParts(data.weddingEventParts);

  return {
    createdAt,
    updatedAt: createdAt,

    // group-level
    message: safeStr(data.message, 4000),
    comments: safeStr(data.comments, 4000),
    songs: Array.isArray(data.songs)
      ? data.songs.slice(0, 15).map(safeSongObj).filter(Boolean)
      : [],

    submitter: {
      email: submitterEmail,
      firstName: submitterFirstName,
      lastName: submitterLastName,
      preferredLang: submitterPreferredLang,
    },

    isCoupleGroup: !!data.isCoupleGroup,
    weddingEventParts: groupAttending === false ? [] : weddingEventParts,

    meta: {
      ip: safeStr(ip, 80),
      ua: safeStr(ua, 400),
      recaptchaScore: rc?.score ?? null,
    },
  };
}

function buildGuestDocs({
  rsvpId,
  data,
  createdAt,
}: {
  rsvpId: string;
  data: Dict;
  createdAt: FirebaseFirestore.Timestamp;
}): GuestLike[] {
  const rawGuests = Array.isArray(data.guests) ? data.guests.slice(0, 10) : [];
  const groupPreferredLang = normalizePreferredLang(data.preferredLang);

  // optional global fallback inside ENGLISH MODEL only
  const groupAttending = toBoolYesNo(data.attending);

  return rawGuests.map((g, idx) => {
    const guest = asRecord(g);
    const firstName = safeStr(guest.firstName, 120);
    const lastName = safeStr(guest.lastName, 180);

    // prefer per-guest email, fallback submitter email
    const email = safeEmail(guest.email || data.email);

    const attending = toBoolYesNo(guest.attending);
    const attendingFinal =
      attending !== null
        ? attending
        : groupAttending !== null
          ? groupAttending
          : false;

    const transport = toBoolYesNo(guest.transport);
    const transportFinal = attendingFinal ? (transport ?? false) : false;
    const weddingEventParts = attendingFinal
      ? normalizeWeddingEventParts(
          Array.isArray(guest.weddingEventParts) ? guest.weddingEventParts : [],
        )
      : [];

    const otherDietText = safeStr(guest.dietOtherText, 400);

    const rawDiet = safeArr(guest.dietCodes, 20);
    let dietCodes = normalizeDietCodes(
      ensureOtherIfText(rawDiet, otherDietText),
      { dropUnknown: true },
    );

    if (!attendingFinal) dietCodes = [];

    const role =
      String(guest.role || "").toUpperCase() === "PLUS_ONE"
        ? "PLUS_ONE"
        : "PRIMARY";

    const preferredLang = normalizePreferredLang(
      guest.preferredLang,
      groupPreferredLang,
    );

    return {
      rsvpId,
      role,
      isPrimary: role !== "PLUS_ONE",

      parentGuestId: guest.parentGuestId || null,
      index: Number.isFinite(Number(guest.index)) ? Number(guest.index) : idx,

      firstName,
      lastName,
      email,
      preferredLang,

      attending: attendingFinal,
      weddingEventParts,
      transport: transportFinal,
      dietCodes,
      dietOtherText: attendingFinal ? otherDietText : "",
      giftAmount: coerceMoney(guest.giftAmount),

      isCouple: !!guest.isCouple,
      isChild: !!guest.isChild,

      createdAt,
      updatedAt: createdAt,
    };
  });
}

function isPrimaryGuestLike(g: unknown): boolean {
  const guest = asRecord(g);
  return (
    guest.isPrimary === true ||
    String(guest.role || "").toUpperCase() === "PRIMARY"
  );
}

function computeGroupFlagsFromGuests(guests: unknown[] = []) {
  const list = Array.isArray(guests) ? guests : [];
  const hasPrimary = list.some((g) => isPrimaryGuestLike(g));
  const hasCompanion = list.some((g) => !isPrimaryGuestLike(g));
  const hasPlusOne = hasCompanion;
  const isCoupleGroup = hasPrimary && hasCompanion;
  return { hasPlusOne, isCoupleGroup };
}

async function syncRsvpGroupFlagsFromGuests(rsvpId: unknown): Promise<void> {
  const id = String(rsvpId || "").trim();
  if (!id) return;

  const [rsvpSnap, guestsSnap] = await Promise.all([
    firestore.collection("rsvps").doc(id).get(),
    firestore.collection("guests").where("rsvpId", "==", id).get(),
  ]);
  if (!rsvpSnap.exists) return;

  const guests = guestsSnap.docs.map((d) => d.data() || {});
  const { hasPlusOne, isCoupleGroup } = computeGroupFlagsFromGuests(guests);
  await rsvpSnap.ref.set(
    {
      hasPlusOne,
      isCoupleGroup,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    },
    { merge: true },
  );
}

/* ---------------- submit public ---------------- */

export async function submitPublicRsvp({
  body,
  ip,
  ua,
}: {
  body?: Dict;
  ip: unknown;
  ua: unknown;
}) {
  const data = asRecord(body?.data);
  const preferredLang = normalizePreferredLang(data.preferredLang);

  const rc = (await verifyRecaptcha(body?.recaptchaToken, "submit")) as Dict & {
    ok?: boolean;
    error?: string;
    score?: number;
  };
  if (!rc.ok) throw badRequest(String(rc.error || "invalid_recaptcha"));

  // minimum: submitter (english only)
  const email = safeEmail(data.email);
  const firstName = safeStr(data.firstName, 120);
  const lastName = safeStr(data.lastName, 180);
  if (!email || !firstName || !lastName) throw badRequest("missing_fields");

  const rsvpRef = firestore.collection("rsvps").doc();
  const rsvpId = rsvpRef.id;
  const now = admin.firestore.Timestamp.now();

  const rsvpDoc = buildRsvpDoc({ data, createdAt: now, ip, ua, rc });
  // force submitter from validated values
  rsvpDoc.submitter = { email, firstName, lastName, preferredLang };

  const guests = buildGuestDocs({ rsvpId, data, createdAt: now });
  if (!guests.length) throw badRequest("missing_guests");
  const { hasPlusOne, isCoupleGroup } = computeGroupFlagsFromGuests(guests);
  rsvpDoc.hasPlusOne = hasPlusOne;
  rsvpDoc.isCoupleGroup = isCoupleGroup;

  const giftsTotal = guests.reduce(
    (s, g) => s + (Number(g.giftAmount) || 0),
    0,
  );

  const batch = firestore.batch();
  batch.set(rsvpRef, rsvpDoc);

  if (giftsTotal !== 0) {
    const metaRef = firestore.collection("financesMeta").doc("main");
    batch.set(
      metaRef,
      {
        giftsTotal: admin.firestore.FieldValue.increment(giftsTotal),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
  }

  mirrorPlaylistSongsBatch(batch, { rsvpId, rsvpDoc, createdAt: now });

  // guests at root
  const guestRefs: FirebaseFirestore.DocumentReference<FirebaseFirestore.DocumentData>[] =
    [];
  for (const g of guests) {
    const guestRef = firestore.collection("guests").doc();
    const guestId = guestRef.id;
    guestRefs.push(guestRef);

    batch.set(guestRef, {
      guestId,
      ...g,
    });
  }

  await batch.commit();

  // best-effort: menu auto assignment
  try {
    const menus = await loadActiveMenus();
    await Promise.allSettled(
      guestRefs.map(async (ref) => {
        const snap = await ref.get();
        if (!snap.exists) return;
        await recomputeAssignmentForGuest(snap.data(), { menus });
      }),
    );
  } catch (e) {
    console.error("[menus-auto] recompute after submitPublicRsvp failed", e);
  }

  sendRsvpConfirmationEmail(rsvpId).catch((err) => {
    console.error("[sendRsvpConfirmationEmail] failed", {
      rsvpId,
      code: err?.message || "unknown",
      stack: err?.stack,
    });
  });

  return { rsvpId };
}

function mirrorPlaylistSongsBatch(
  batch: FirebaseFirestore.WriteBatch,
  {
    rsvpId,
    rsvpDoc,
    createdAt,
  }: {
    rsvpId: string;
    rsvpDoc: RsvpLike;
    createdAt: FirebaseFirestore.Timestamp;
  },
) {
  const proposerName = [
    rsvpDoc?.submitter?.firstName,
    rsvpDoc?.submitter?.lastName,
  ]
    .filter(Boolean)
    .join(" ")
    .trim();

  const createdAtMs =
    typeof createdAt?.toMillis === "function"
      ? createdAt.toMillis()
      : Date.now();

  const songs = Array.isArray(rsvpDoc?.songs) ? rsvpDoc.songs.slice(0, 15) : [];

  songs.forEach((raw, idx) => {
    const song = safeSongObj(raw);
    if (!song) return;

    const songId = `${rsvpId}_${idx}`;
    const songRef = firestore.collection("playlistSongs").doc(songId);

    batch.set(
      songRef,
      {
        ...song,
        proposedByName: proposerName,
        proposedByRsvpId: rsvpId,
        removed: false,
        order: -(createdAtMs * 100 + idx),
        createdAt,
        updatedAt: createdAt,
        createdByUid: null,
      },
      { merge: true },
    );
  });
}

/* ---------------- admin list ---------------- */

export async function listRsvps({ limit = 300 }: { limit?: number }) {
  const snap = await firestore
    .collection("rsvps")
    .orderBy("createdAt", "desc")
    .limit(Math.min(Math.max(limit, 1), 1000))
    .get();

  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

/* ---------------- admin patch guest ---------------- */

export async function patchGuest({
  guestId,
  patch = {},
}: {
  guestId: string;
  patch?: Dict;
}) {
  const allowed = [
    "firstName",
    "lastName",
    "email",
    "preferredLang",
    "giftAmount",
    "attending",
    "weddingEventParts",
    "transport",
    "dietCodes",
    "dietOtherText",
    "isChild",
  ];

  const updates: Dict = {};
  for (const k of allowed) {
    if (patch[k] !== undefined) updates[k] = patch[k];
  }
  if (!Object.keys(updates).length) throw badRequest("no_allowed_fields");

  if (updates.firstName !== undefined)
    updates.firstName = safeStr(updates.firstName, 120);
  if (updates.lastName !== undefined)
    updates.lastName = safeStr(updates.lastName, 180);

  if (updates.email !== undefined) {
    const email = safeEmail(updates.email);
    if (String(updates.email || "").trim() && !email)
      throw badRequest("invalid_email");
    updates.email = email;
  }

  if (updates.preferredLang !== undefined) {
    updates.preferredLang = normalizePreferredLang(updates.preferredLang);
  }

  if (updates.attending !== undefined) {
    const b = toBoolYesNo(updates.attending);
    if (b === null) throw badRequest("invalid_attending");
    updates.attending = b;
  }

  if (updates.transport !== undefined) {
    const b = toBoolYesNo(updates.transport);
    if (b === null) throw badRequest("invalid_transport");
    updates.transport = b;
  }

  if (updates.weddingEventParts !== undefined) {
    updates.weddingEventParts = normalizeWeddingEventParts(
      updates.weddingEventParts,
    );
  }

  if (updates.dietOtherText !== undefined) {
    updates.dietOtherText = safeStr(updates.dietOtherText, 400);
  }

  if (updates.dietCodes !== undefined) {
    if (!Array.isArray(updates.dietCodes))
      throw badRequest("invalid_dietCodes");

    const otherText =
      updates.dietOtherText !== undefined ? updates.dietOtherText : "";

    let codes = normalizeDietCodes(updates.dietCodes, { dropUnknown: true });
    codes = ensureOtherIfText(codes, otherText);
    updates.dietCodes = codes;
  }

  if (updates.isChild !== undefined) {
    updates.isChild = !!updates.isChild;
  }

  if (updates.giftAmount !== undefined) {
    const n =
      updates.giftAmount === null ? null : coerceMoney(updates.giftAmount);
    if (updates.giftAmount !== null && n === null)
      throw badRequest("invalid_giftAmount");
    updates.giftAmount = n;
  }

  const guestRef = firestore.collection("guests").doc(String(guestId));
  const metaRef = firestore.collection("financesMeta").doc("main");
  let touchedRsvpId = "";

  await firestore.runTransaction(async (tx) => {
    const snap = await tx.get(guestRef);
    if (!snap.exists) throw notFound("guest_not_found");

    const current = snap.data() || {};
    touchedRsvpId = String(current.rsvpId || "");
    const prevGift = Number(current.giftAmount) || 0;
    const attendingFinal =
      updates.attending !== undefined ? updates.attending : !!current.attending;

    if (!attendingFinal) {
      updates.attending = false;
      updates.weddingEventParts = [];
      updates.transport = false;
      updates.dietCodes = [];
      updates.dietOtherText = "";
      // keep giftAmount untouched unless you want strict reset:
      // updates.giftAmount = null;
    }

    tx.set(
      guestRef,
      { ...updates, updatedAt: admin.firestore.FieldValue.serverTimestamp() },
      { merge: true },
    );

    const nextGift =
      updates.giftAmount !== undefined
        ? Number(updates.giftAmount) || 0
        : prevGift;
    const giftDelta = nextGift - prevGift;

    if (giftDelta !== 0) {
      tx.set(
        metaRef,
        {
          giftsTotal: admin.firestore.FieldValue.increment(giftDelta),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true },
      );
    }
  });

  // ✅ recompute menu assignment best-effort
  try {
    const guestSnap = await guestRef.get();
    if (guestSnap.exists) {
      const menus = await loadActiveMenus();
      await recomputeAssignmentForGuest(guestSnap.data(), {
        menus,
        docSnap: guestSnap,
      });
    }
  } catch (e) {
    console.error("[menus-auto] recompute after patchGuest failed", e);
  }

  if (touchedRsvpId) {
    syncRsvpGroupFlagsFromGuests(touchedRsvpId).catch((e) =>
      console.error("[rsvp] sync group flags after patchGuest failed", e),
    );
  }

  return { ok: true };
}

/* ---------------- admin delete cascade ---------------- */

export async function deleteRsvpCascade({ rsvpId }: { rsvpId: string }) {
  const rsvpRef = firestore.collection("rsvps").doc(String(rsvpId));
  const metaRef = firestore.collection("financesMeta").doc("main");

  const guestsSnap = await firestore
    .collection("guests")
    .where("rsvpId", "==", String(rsvpId))
    .get();

  let giftsTotal = 0;
  const guestIds: string[] = [];

  for (const d of guestsSnap.docs) {
    const g = d.data() || {};
    giftsTotal += Number(g.giftAmount) || 0;
    guestIds.push(String(g.guestId || d.id));
  }

  let batch = firestore.batch();
  let op = 0;

  for (const d of guestsSnap.docs) {
    batch.delete(d.ref);
    op++;
    if (op >= 450) {
      await batch.commit();
      batch = firestore.batch();
      op = 0;
    }
  }

  if (giftsTotal !== 0) {
    batch.set(
      metaRef,
      {
        giftsTotal: admin.firestore.FieldValue.increment(-giftsTotal),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
    op++;
  }

  batch.delete(rsvpRef);
  op++;

  if (op) await batch.commit();

  await Promise.allSettled(
    guestIds.map((id) => deleteAssignmentForGuestId(id)),
  );
}

/* ---------------- admin delete guest ---------------- */

export async function deleteGuest({ guestId }: { guestId: string }) {
  const guestRef = firestore.collection("guests").doc(String(guestId));
  const metaRef = firestore.collection("financesMeta").doc("main");

  let assignmentIdToDelete = String(guestId);
  let rsvpId: string | null = null;

  await firestore.runTransaction(async (tx) => {
    const guestSnap = await tx.get(guestRef);
    if (!guestSnap.exists) throw notFound("guest_not_found");

    const guestData = guestSnap.data() || {};
    rsvpId = String(guestData.rsvpId || "");
    assignmentIdToDelete = String(guestData.guestId || guestId);

    const gift = Number(guestData.giftAmount) || 0;

    tx.delete(guestRef);

    if (gift !== 0) {
      tx.set(
        metaRef,
        {
          giftsTotal: admin.firestore.FieldValue.increment(-gift),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true },
      );
    }
  });

  if (rsvpId) {
    const remaining = await firestore
      .collection("guests")
      .where("rsvpId", "==", rsvpId)
      .limit(1)
      .get();

    if (remaining.empty) {
      await firestore
        .collection("rsvps")
        .doc(rsvpId)
        .delete()
        .catch(() => {});
    } else {
      syncRsvpGroupFlagsFromGuests(rsvpId).catch((e) =>
        console.error("[rsvp] sync group flags after deleteGuest failed", e),
      );
    }
  }

  deleteAssignmentForGuestId(assignmentIdToDelete).catch((e) =>
    console.error("[menus-auto] deleteAssignment after deleteGuest failed", e),
  );
}

/* ---------------- email confirmation ---------------- */

const { brideFirstName, groomFirstName, initials } = weddingConfig.couple;
const { dateDisplayShort } = weddingConfig.event;
const { mapUrl: celebrationMapUrl } = weddingConfig.celebration;

let rawSiteUrl = process.env.SITE_URL || "https://www.gpl2026.com";
if (!/^https?:\/\//i.test(rawSiteUrl)) rawSiteUrl = "https://" + rawSiteUrl;
const SITE_URL = rawSiteUrl;

const WEBSITE_PASSWORD_HINT = process.env.SECURE_PASSWORD;

async function loadRsvpAndGuests(
  rsvpId: unknown,
): Promise<{ rsvp: RsvpLike; guests: GuestLike[] }> {
  const rsvpRef = firestore.collection("rsvps").doc(String(rsvpId));
  const rsvpSnap = await rsvpRef.get();
  if (!rsvpSnap.exists) throw new Error("RSVP_NOT_FOUND");

  const guestsSnap = await firestore
    .collection("guests")
    .where("rsvpId", "==", String(rsvpId))
    .get();
  if (guestsSnap.empty) throw new Error("GUESTS_NOT_FOUND");

  return {
    rsvp: { id: rsvpSnap.id, ...(rsvpSnap.data() || {}) },
    guests: guestsSnap.docs.map((d) => ({ id: d.id, ...(d.data() || {}) })),
  };
}

function pickPrimaryGuest(guests: GuestLike[], rsvp: RsvpLike) {
  const primary =
    guests.find((g) => g?.role === "PRIMARY") ||
    guests.find((g) => g?.isPrimary) ||
    guests[0] ||
    {};

  const sub = rsvp?.submitter || {};

  return {
    firstName: String(primary.firstName || sub.firstName || "").trim(),
    lastName: String(primary.lastName || sub.lastName || "").trim(),
    email: safeEmail(primary.email || sub.email || ""),
    preferredLang: normalizePreferredLang(
      primary.preferredLang || sub.preferredLang,
    ),
  };
}

function guestDisplayName(g: GuestLike): string {
  return [g?.firstName, g?.lastName].filter(Boolean).join(" ").trim() || "—";
}

async function sendRsvpConfirmationEmail(rsvpId: string) {
  const rsvpRef = firestore.collection("rsvps").doc(String(rsvpId));

  const stSnap = await rsvpRef.get();
  if (!stSnap.exists) return;

  const existingStatus = stSnap.data()?.email?.confirmation?.status;
  if (existingStatus === "sent") return;

  await rsvpRef.set(
    { email: { confirmation: { status: "queued" } } },
    { merge: true },
  );

  try {
    const { rsvp, guests } = await loadRsvpAndGuests(rsvpId);
    const primary = pickPrimaryGuest(guests, rsvp);

    const attendingSummary = guests
      .map((g) => `${guestDisplayName(g)}: ${g.attending ? "Yes" : "No"}`)
      .join(" · ");

    const to = safeEmail(primary.email);
    if (!to) {
      await rsvpRef.set(
        {
          email: {
            confirmation: {
              status: "skipped_invalid_email",
              skippedAt: admin.firestore.FieldValue.serverTimestamp(),
            },
          },
        },
        { merge: true },
      );
      return;
    }

    const guestFirstName = safeStr(primary.firstName, 120);
    const guestLastName = safeStr(primary.lastName, 180);
    const preferredLang = normalizePreferredLang(primary.preferredLang);

    const attendingYes = guests.some((g) => !!g.attending);

    const transportSummary = guests
      .map((g) => `${guestDisplayName(g)}: ${g.transport ? "Yes" : "No"}`)
      .join(" · ");

    const dietSummary = guests
      .map((g) => {
        const arrRaw = Array.isArray(g?.dietCodes) ? g.dietCodes : [];
        const other = String(g?.dietOtherText || "").trim();

        const withOther = ensureOtherIfText(arrRaw, other);
        const arr = normalizeDietCodes(withOther, { dropUnknown: true });

        const nice = arr
          .map((c) => dietLabel(c))
          .filter(Boolean)
          .join(", ");
        if (!nice && !other) return null;

        return `${guestDisplayName(g)}: ${nice || ""}${
          other ? (nice ? " " : "") + `(${other})` : ""
        }`;
      })
      .filter(Boolean)
      .join(" · ");

    const songsText = Array.isArray(rsvp?.songs)
      ? rsvp.songs
          .map((s) => [s?.title, s?.artist].filter(Boolean).join(" – "))
          .filter(Boolean)
          .join(", ")
      : "";

    const comments = safeStr(rsvp?.comments, 4000);

    // guest email
    const { subject: guestSubject, innerHtml: guestInnerHtml } =
      buildRsvpConfirmationEmail({
        attendingYes,
        guestFirstName,
        preferredLang,
        brideFirstName,
        groomFirstName,
        initials,
        dateDisplayShort,
        siteUrl: SITE_URL,
        mapUrl: celebrationMapUrl,
        ...(WEBSITE_PASSWORD_HINT
          ? { websitePasswordHint: WEBSITE_PASSWORD_HINT }
          : {}),
      });

    await sendEmailFn({ to, subject: guestSubject, innerHtml: guestInnerHtml });

    // internal email
    const internalTo = getInternalEmailTo();
    if (internalTo) {
      const { subject: internalSubject, innerHtml: internalInnerHtml } =
        buildRsvpInternalNotificationEmail({
          rsvpId,
          firstName: guestFirstName,
          lastName: guestLastName,
          email: to,
          guestsCount: guests?.length ?? 0,
          attendingSummary,
          transportSummary,
          dietSummary,
          songs: songsText,
          comments,
        });

      await sendEmailFn({
        to: internalTo,
        subject: internalSubject,
        innerHtml: internalInnerHtml,
      });
    }

    await rsvpRef.set(
      {
        email: {
          confirmation: {
            status: "sent",
            sentAt: admin.firestore.FieldValue.serverTimestamp(),
          },
        },
      },
      { merge: true },
    );
  } catch (err: unknown) {
    await rsvpRef.set(
      {
        email: {
          confirmation: {
            status: "failed",
            error: safeStr(
              (err as { message?: string })?.message || "unknown",
              500,
            ),
            failedAt: admin.firestore.FieldValue.serverTimestamp(),
          },
        },
      },
      { merge: true },
    );
    throw err;
  }
}

export async function sendConfirmationEmailForRsvp(rsvpId: string) {
  const id = String(rsvpId || "").trim();
  if (!id) throw new Error("RSVP_ID_REQUIRED");
  await sendRsvpConfirmationEmail(id);
  return { ok: true, id };
}

/* ---------------- admin: create manual rsvp ---------------- */

export async function createManualRsvp({
  body,
  createdByUid,
}: {
  body: Record<string, unknown>;
  createdByUid?: string | null;
}) {
  const oneGuest = {
    firstName: body.firstName,
    lastName: body.lastName,
    email: body.email,
    attending: body.attending,
    weddingEventParts: body.weddingEventParts,
    transport: body.transport,
    dietCodes: body.dietCodes,
    dietOtherText: body.dietOtherText,
    giftAmount: body.giftAmount,
  };
  return createManualRsvpGroup({
    body: {
      preferredLang: body.preferredLang,
      weddingEventParts: body.weddingEventParts,
      guests: [oneGuest],
    },
    createdByUid: createdByUid ?? null,
  });
}

export async function createManualCoupleRsvp({
  body,
  createdByUid,
}: {
  body: Record<string, unknown>;
  createdByUid?: string | null;
}) {
  return createManualRsvpGroup({
    body: {
      preferredLang: body.preferredLang,
      weddingEventParts: body.weddingEventParts,
      guests: [
        {
          firstName: body.primaryFirstName,
          lastName: body.primaryLastName,
          email: body.primaryEmail,
          attending: body.attending,
          weddingEventParts: body.weddingEventParts,
          transport: body.transport,
          dietCodes: body.dietCodes,
          dietOtherText: body.dietOtherText,
          role: "PRIMARY",
        },
        {
          firstName: body.partnerFirstName,
          lastName: body.partnerLastName,
          email: body.partnerEmail,
          attending: body.attending,
          weddingEventParts: body.weddingEventParts,
          transport: body.transport,
          dietCodes: body.dietCodes,
          dietOtherText: body.dietOtherText,
          role: "PLUS_ONE",
        },
      ],
    },
    createdByUid: createdByUid ?? null,
  });
}

export async function createManualRsvpGroup({
  body,
  createdByUid,
}: {
  body: Record<string, unknown>;
  createdByUid?: string | null;
}) {
  const preferredLang = normalizePreferredLang(body.preferredLang);
  const guestsIn = Array.isArray(body.guests) ? body.guests.slice(0, 20) : [];
  if (!guestsIn.length) throw badRequest("missing_guests");

  const normalizedGuests = guestsIn.map((g, idx) => {
    const guest = asRecord(g);
    const firstName = safeStr(guest.firstName, 120);
    const lastName = safeStr(guest.lastName, 180);
    if (!firstName || !lastName) throw badRequest("missing_fields");

    const email = safeEmail(guest.email);
    const attending = toBoolYesNo(guest.attending);
    const attendingFinal = attending !== null ? attending : true;
    const transport = toBoolYesNo(guest.transport);
    const transportFinal = attendingFinal ? (transport ?? false) : false;
    const weddingEventParts = attendingFinal
      ? normalizeWeddingEventParts(
          Array.isArray(guest.weddingEventParts) ? guest.weddingEventParts : [],
        )
      : [];

    const dietOtherText = safeStr(guest.dietOtherText, 400);
    let dietCodes = normalizeDietCodes((guest.dietCodes as unknown[]) || [], {
      dropUnknown: true,
    });
    dietCodes = ensureOtherIfText(dietCodes, dietOtherText);
    if (!attendingFinal) dietCodes = [];

    const giftAmount = coerceMoney(guest.giftAmount);
    const roleRaw = String(guest.role || "").toUpperCase();
    const role =
      idx === 0 ? "PRIMARY" : roleRaw === "PRIMARY" ? "PLUS_ONE" : "PLUS_ONE";

    return {
      firstName,
      lastName,
      email,
      preferredLang,
      attending: attendingFinal,
      weddingEventParts,
      transport: transportFinal,
      dietCodes: attendingFinal ? dietCodes : [],
      dietOtherText: attendingFinal ? dietOtherText : "",
      giftAmount,
      role,
      isPrimary: role === "PRIMARY",
      isCouple: false,
      isChild: !!guest.isChild,
      index: idx,
    };
  });

  const rsvpRef = firestore.collection("rsvps").doc();
  const rsvpId = rsvpRef.id;
  const now = admin.firestore.Timestamp.now();

  const guestRefs: FirebaseFirestore.DocumentReference<FirebaseFirestore.DocumentData>[] =
    normalizedGuests.map(() => firestore.collection("guests").doc());
  const firstGuestRef = guestRefs[0];
  if (!firstGuestRef) throw badRequest("missing_guests");
  const primaryGuestId = firstGuestRef.id;

  const guestDocs = normalizedGuests.map((g, idx) => ({
    guestId: guestRefs[idx]?.id || "",
    rsvpId,
    role: idx === 0 ? "PRIMARY" : "PLUS_ONE",
    isPrimary: idx === 0,
    parentGuestId: idx === 0 ? null : primaryGuestId,
    index: idx,
    firstName: g.firstName,
    lastName: g.lastName,
    email: g.email,
    preferredLang: g.preferredLang,
    attending: g.attending,
    weddingEventParts: g.weddingEventParts,
    transport: g.transport,
    dietCodes: g.dietCodes,
    dietOtherText: g.dietOtherText,
    giftAmount: g.giftAmount,
    isCouple: false,
    isChild: !!g.isChild,
    createdAt: now,
    updatedAt: now,
  }));

  const { hasPlusOne, isCoupleGroup } = computeGroupFlagsFromGuests(guestDocs);
  const primary = guestDocs[0];
  const rsvpDoc = {
    createdAt: now,
    updatedAt: now,
    message: "",
    comments: "",
    songs: [],
    submitter: {
      email: primary?.email || "",
      firstName: primary?.firstName || "",
      lastName: primary?.lastName || "",
      preferredLang,
    },
    isCoupleGroup,
    weddingEventParts: normalizeWeddingEventParts(body?.weddingEventParts),
    hasPlusOne,
    meta: { ip: "", ua: "admin_manual_group", recaptchaScore: null },
    admin: {
      createdByUid: createdByUid || null,
      createdAt: now,
      source: "manual_group",
    },
  };

  const batch = firestore.batch();
  batch.set(rsvpRef, rsvpDoc);
  guestDocs.forEach((doc, idx) => {
    const ref = guestRefs[idx];
    if (!ref) return;
    batch.set(ref, doc);
  });

  const giftsTotal = guestDocs.reduce(
    (sum, g) => sum + (Number(g.giftAmount) || 0),
    0,
  );
  if (giftsTotal !== 0) {
    const metaRef = firestore.collection("financesMeta").doc("main");
    batch.set(
      metaRef,
      {
        giftsTotal: admin.firestore.FieldValue.increment(giftsTotal),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
  }

  await batch.commit();

  try {
    const menus = await loadActiveMenus();
    await Promise.all(
      guestDocs.map((g) => recomputeAssignmentForGuest(g, { menus })),
    );
  } catch (e) {
    console.error(
      "[menus-auto] recompute after createManualRsvpGroup failed",
      e,
    );
  }

  return { rsvpId };
}

export async function addGuestToRsvp({
  rsvpId,
  guest = {},
  createdByUid = null,
}: {
  rsvpId: string;
  guest?: Record<string, unknown>;
  createdByUid?: string | null;
}) {
  const id = String(rsvpId || "").trim();
  if (!id) throw badRequest("missing_rsvpId");

  const firstName = safeStr(guest?.firstName, 120);
  const lastName = safeStr(guest?.lastName, 180);
  if (!firstName || !lastName) throw badRequest("missing_fields");

  const email = safeEmail(guest?.email);
  const preferredLang = normalizePreferredLang(guest?.preferredLang);
  const attending = toBoolYesNo(guest?.attending);
  const attendingFinal = attending !== null ? attending : true;
  const transport = toBoolYesNo(guest?.transport);
  const transportFinal = attendingFinal ? (transport ?? false) : false;
  const weddingEventParts = attendingFinal
    ? normalizeWeddingEventParts(guest?.weddingEventParts)
    : [];

  const dietOtherText = safeStr(guest?.dietOtherText, 400);
  let dietCodes = normalizeDietCodes(guest?.dietCodes || [], {
    dropUnknown: true,
  });
  dietCodes = ensureOtherIfText(dietCodes, dietOtherText);
  if (!attendingFinal) dietCodes = [];

  const giftAmount = coerceMoney(guest?.giftAmount);
  const isChild = !!guest?.isChild;

  const rsvpRef = firestore.collection("rsvps").doc(id);
  const guestRef = firestore.collection("guests").doc();
  const metaRef = firestore.collection("financesMeta").doc("main");
  const now = admin.firestore.Timestamp.now();

  let guestDocForPostOps: Dict | null = null;

  await firestore.runTransaction(async (tx) => {
    const rsvpSnap = await tx.get(rsvpRef);
    if (!rsvpSnap.exists) throw notFound("rsvp_not_found");

    const guestsSnap = await tx.get(
      firestore.collection("guests").where("rsvpId", "==", id),
    );
    const guests = guestsSnap.docs.map((d) => ({
      id: d.id,
      ...(d.data() || {}),
    })) as GuestLike[];

    const primary =
      guests.find(
        (g) =>
          g.isPrimary === true ||
          String(g.role || "").toUpperCase() === "PRIMARY",
      ) || null;

    const hasPrimary = !!primary;
    const maxIndex = guests.reduce(
      (max, g) => Math.max(max, Number(g?.index) || 0),
      -1,
    );
    const nextIndex = maxIndex + 1;

    const role = hasPrimary ? "PLUS_ONE" : "PRIMARY";
    const isPrimary = !hasPrimary;
    const parentGuestId = isPrimary
      ? null
      : String(primary?.guestId || primary?.id || "");

    const guestId = guestRef.id;
    const newDoc = {
      guestId,
      rsvpId: id,
      role,
      isPrimary,
      parentGuestId,
      index: nextIndex,
      firstName,
      lastName,
      email,
      preferredLang,
      attending: attendingFinal,
      weddingEventParts,
      transport: transportFinal,
      dietCodes: attendingFinal ? dietCodes : [],
      dietOtherText: attendingFinal ? dietOtherText : "",
      giftAmount,
      isCouple: false,
      isChild,
      createdAt: now,
      updatedAt: now,
    };

    tx.set(guestRef, newDoc);
    tx.set(
      rsvpRef,
      {
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedByUid: createdByUid || null,
      },
      { merge: true },
    );

    if ((Number(giftAmount) || 0) !== 0) {
      tx.set(
        metaRef,
        {
          giftsTotal: admin.firestore.FieldValue.increment(
            Number(giftAmount) || 0,
          ),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true },
      );
    }

    guestDocForPostOps = newDoc;
  });

  try {
    const menus = await loadActiveMenus();
    if (guestDocForPostOps) {
      await recomputeAssignmentForGuest(guestDocForPostOps, { menus });
    }
  } catch (e) {
    console.error("[menus-auto] recompute after addGuestToRsvp failed", e);
  }

  syncRsvpGroupFlagsFromGuests(id).catch((e) =>
    console.error("[rsvp] sync group flags after addGuestToRsvp failed", e),
  );

  return { guestId: guestRef.id };
}

/* ---------------- admin patch rsvp ---------------- */

export async function patchRsvp({
  rsvpId,
  patch = {},
  updatedByUid = null,
}: {
  rsvpId: string;
  patch?: Record<string, unknown>;
  updatedByUid?: string | null;
}) {
  const allowed = [
    "message",
    "comments",
    "songs",
    "isCoupleGroup",
    "weddingEventParts",
  ];
  const updates: Dict = {};

  for (const k of allowed) {
    if (patch[k] !== undefined) updates[k] = patch[k];
  }
  if (!Object.keys(updates).length) throw badRequest("no_allowed_fields");

  if (updates.message !== undefined)
    updates.message = safeStr(updates.message, 4000);
  if (updates.comments !== undefined)
    updates.comments = safeStr(updates.comments, 4000);
  if (updates.isCoupleGroup !== undefined)
    updates.isCoupleGroup = !!updates.isCoupleGroup;

  if (updates.songs !== undefined) {
    if (!Array.isArray(updates.songs)) throw badRequest("invalid_songs");
    updates.songs = updates.songs.slice(0, 15).map(safeSongObj).filter(Boolean);
  }

  if (updates.weddingEventParts !== undefined) {
    updates.weddingEventParts = normalizeWeddingEventParts(
      updates.weddingEventParts,
    );
  }

  const rsvpRef = firestore.collection("rsvps").doc(String(rsvpId));
  const snap = await rsvpRef.get();
  if (!snap.exists) throw notFound("rsvp_not_found");

  await rsvpRef.set(
    {
      ...updates,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedByUid,
    },
    { merge: true },
  );

  return { ok: true };
}
