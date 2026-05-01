// backend/services/seedCoupleRsvp.ts
import { firestore, admin } from "../lib/firebase.js";
import weddingConfig from "../../shared/weddingConfig.js";

const ALL_WEDDING_EVENT_PARTS = [
  "mass",
  "cocktailReception",
  "dinner",
  "party",
  "brunch",
 ] as const;

type StringRecord = Record<string, unknown>;

function safeStr(v: unknown, max = 200): string {
  const s = String(v ?? "").trim();
  return s.length > max ? s.slice(0, max) : s;
}

function buildFullName(firstName: unknown, lastName: unknown): string {
  return `${safeStr(firstName, 120)} ${safeStr(lastName, 180)}`
    .trim()
    .replace(/\s+/g, " ");
}

/**
 * Seeds a "system couple" group + 2 guests at root.
 *
 * Collections:
 * - rsvps/{groupId}
 * - guests/{guestId}     (root collection)
 *
 * No subcollection /rsvps/{id}/guests in the new model.
 */
export async function seedCoupleRsvpIfNeeded() {
  const { brideFirstName, brideLastName, groomFirstName, groomLastName } =
    weddingConfig.couple;

  const groupId = "couple";

  // stable guest IDs (root docs)
  const brideGuestId = `${groupId}__primary`;
  const groomGuestId = `${groupId}__groom`;

  const rsvpRef = firestore.collection("rsvps").doc(groupId);
  const brideGuestRef = firestore.collection("guests").doc(brideGuestId);
  const groomGuestRef = firestore.collection("guests").doc(groomGuestId);

  await firestore.runTransaction(async (tx) => {
    const now = admin.firestore.Timestamp.now();

    const [rsvpSnap, brideSnap, groomSnap] = await Promise.all([
      tx.get(rsvpRef),
      tx.get(brideGuestRef),
      tx.get(groomGuestRef),
    ]);

    // -------- group doc (minimal) --------
    if (!rsvpSnap.exists) {
      tx.set(rsvpRef, {
        groupType: "system_couple", // ✅ replaces isCoupleGroup
        source: "seed",

        createdAt: now,
        updatedAt: now,

        // optional: helpful for admin display/search
        displayName: buildFullName(brideFirstName, brideLastName),
      });
    } else {
      tx.set(
        rsvpRef,
        {
          groupType: "system_couple",
          source: "seed",
          updatedAt: now,
          displayName:
            (rsvpSnap.data() as StringRecord | undefined)?.displayName ||
            buildFullName(brideFirstName, brideLastName),
        },
        { merge: true },
      );
    }

    // -------- bride guest --------
    if (!brideSnap.exists) {
      tx.set(brideGuestRef, {
        guestId: brideGuestId,
        groupId, // points to rsvps/{groupId}

        kind: "person",
        role: "PRIMARY",
        isPrimary: true,

        isCouple: true,
        partnerGuestId: groomGuestId, // ✅ explicit couple link

        firstName: safeStr(brideFirstName, 120),
        lastName: safeStr(brideLastName, 180),
        fullName: buildFullName(brideFirstName, brideLastName),

        email: "",

        attending: true,
        weddingEventParts: ALL_WEDDING_EVENT_PARTS,
        transport: false,

        dietCodes: [],
        dietOtherText: "",

        createdAt: now,
        updatedAt: now,
      });
    } else {
      tx.set(
        brideGuestRef,
        {
          groupId,
          role: "PRIMARY",
          isPrimary: true,

          isCouple: true,
          partnerGuestId: groomGuestId,

          firstName:
            (brideSnap.data() as StringRecord | undefined)?.firstName || safeStr(brideFirstName, 120),
          lastName: (brideSnap.data() as StringRecord | undefined)?.lastName || safeStr(brideLastName, 180),
          fullName:
            (brideSnap.data() as StringRecord | undefined)?.fullName ||
            buildFullName(brideFirstName, brideLastName),

          weddingEventParts: ALL_WEDDING_EVENT_PARTS,
          updatedAt: now,
        },
        { merge: true },
      );
    }

    // -------- groom guest --------
    if (!groomSnap.exists) {
      tx.set(groomGuestRef, {
        guestId: groomGuestId,
        groupId,

        kind: "person",
        role: "PLUS_ONE",
        isPrimary: false,

        isCouple: true,
        partnerGuestId: brideGuestId,

        // If you still want a "comes with" link for UI, keep this:
        accompanyingGuestId: brideGuestId,

        firstName: safeStr(groomFirstName, 120),
        lastName: safeStr(groomLastName, 180),
        fullName: buildFullName(groomFirstName, groomLastName),

        email: "",

        attending: true,
        weddingEventParts: ALL_WEDDING_EVENT_PARTS,
        transport: false,

        dietCodes: [],
        dietOtherText: "",

        createdAt: now,
        updatedAt: now,
      });
    } else {
      tx.set(
        groomGuestRef,
        {
          groupId,
          role: "PLUS_ONE",
          isPrimary: false,

          isCouple: true,
          partnerGuestId: brideGuestId,
          accompanyingGuestId:
            (groomSnap.data() as StringRecord | undefined)?.accompanyingGuestId || brideGuestId,

          firstName:
            (groomSnap.data() as StringRecord | undefined)?.firstName || safeStr(groomFirstName, 120),
          lastName: (groomSnap.data() as StringRecord | undefined)?.lastName || safeStr(groomLastName, 180),
          fullName:
            (groomSnap.data() as StringRecord | undefined)?.fullName ||
            buildFullName(groomFirstName, groomLastName),

          weddingEventParts: ALL_WEDDING_EVENT_PARTS,
          updatedAt: now,
        },
        { merge: true },
      );
    }
  });
}
