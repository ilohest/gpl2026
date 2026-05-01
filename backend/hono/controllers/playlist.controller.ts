// backend/hono/controllers/playlist.controller.ts
import type { Context } from "hono";
import { admin, firestore } from "../../lib/firebase.js";
import { jsonHttpError } from "../httpErrors.js";

const PLAYLIST_SUMMARY_REF = firestore.collection("adminDashboard").doc("summary");

function reqValid<T>(c: Context, target: "json" | "param" | "query"): T {
  return (c.req as { valid: (t: string) => T }).valid(target);
}

function cleanPlaylistString(value: unknown): string {
  return String(value ?? "").trim();
}

function numOr(value: unknown, fallback = 0): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function playlistCountFromSummary(
  snap: FirebaseFirestore.DocumentSnapshot<FirebaseFirestore.DocumentData>,
): number {
  if (!snap.exists) return 0;
  return numOr(snap.data()?.playlist?.totalCount, 0);
}

function applyPlaylistDelta(current: number, delta: number): number {
  return Math.max(0, current + delta);
}

function summaryPlaylistPatch(totalCount: number) {
  return {
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    playlist: { totalCount: Math.max(0, numOr(totalCount, 0)) },
  };
}

export async function createPlaylistSongHandler(c: Context) {
  try {
    const now = admin.firestore.Timestamp.now();
    const payload = reqValid<Record<string, unknown>>(c, "json");
    const user = c.get("user");
    const ref = firestore.collection("playlistSongs").doc();

    await firestore.runTransaction(async (tx) => {
      const summarySnap = await tx.get(PLAYLIST_SUMMARY_REF);
      const currentCount = playlistCountFromSummary(summarySnap);

      tx.set(ref, {
        title: cleanPlaylistString(payload.title),
        artist: cleanPlaylistString(payload.artist),
        album: cleanPlaylistString(payload.album),
        artworkUrl: cleanPlaylistString(payload.artworkUrl),
        previewUrl: cleanPlaylistString(payload.previewUrl),
        proposedByName: cleanPlaylistString(payload.proposedByName),
        proposedByRsvpId: payload.proposedByRsvpId ?? null,
        removed: false,
        order: typeof payload.order === "number" ? payload.order : 0,
        createdAt: now,
        updatedAt: now,
        createdByUid: user?.uid ?? null,
      });

      tx.set(
        PLAYLIST_SUMMARY_REF,
        summaryPlaylistPatch(applyPlaylistDelta(currentCount, +1)),
        { merge: true },
      );
    });

    return c.json({ ok: true, id: ref.id });
  } catch (err) {
    return jsonHttpError(c, err, "playlist.create");
  }
}

export async function patchPlaylistSongHandler(c: Context) {
  try {
    const { songId } = reqValid<{ songId: string }>(c, "param");
    const payload = reqValid<Record<string, unknown>>(c, "json");
    const now = admin.firestore.Timestamp.now();
    const patch: Record<string, unknown> = {};

    if ("title" in payload) patch.title = cleanPlaylistString(payload.title);
    if ("artist" in payload) patch.artist = cleanPlaylistString(payload.artist);
    if ("album" in payload) patch.album = cleanPlaylistString(payload.album);
    if ("artworkUrl" in payload) {
      patch.artworkUrl = cleanPlaylistString(payload.artworkUrl);
    }
    if ("previewUrl" in payload) {
      patch.previewUrl = cleanPlaylistString(payload.previewUrl);
    }
    if ("order" in payload && Number.isFinite(Number(payload.order))) {
      patch.order = Number(payload.order);
    }

    if ("removed" in payload) patch.removed = !!payload.removed;

    patch.updatedAt = now;

    const ref = firestore.collection("playlistSongs").doc(songId);
      await firestore.runTransaction(async (tx) => {
        const [songSnap, summarySnap] = await Promise.all([
          tx.get(ref),
          tx.get(PLAYLIST_SUMMARY_REF),
        ]);
        const prevRemoved = !!songSnap.data()?.removed;
        const nextRemoved =
          patch.removed !== undefined ? !!patch.removed : prevRemoved;

        tx.set(ref, patch, { merge: true });

        if (prevRemoved !== nextRemoved) {
          const delta = prevRemoved && !nextRemoved ? +1 : -1;
          const currentCount = playlistCountFromSummary(summarySnap);
          tx.set(
            PLAYLIST_SUMMARY_REF,
            summaryPlaylistPatch(applyPlaylistDelta(currentCount, delta)),
            { merge: true },
          );
        }
      });

      return c.json({ ok: true });
    } catch (err) {
      return jsonHttpError(c, err, "playlist.patch");
    }
  }

export async function bulkDeletePlaylistSongsHandler(c: Context) {
  try {
    const { ids } = reqValid<{ ids: string[] }>(c, "json");
    if (!ids.length) return c.json({ ok: true, count: 0 });

    const now = admin.firestore.Timestamp.now();
    const batch = firestore.batch();
    const refs = ids.map((id) => firestore.collection("playlistSongs").doc(id));
    const snaps = await firestore.getAll(...refs);
    let removedDelta = 0;

    refs.forEach((ref, idx) => {
      batch.set(ref, { removed: true, updatedAt: now }, { merge: true });
      const snap = snaps[idx];
      if (snap?.exists && snap.data()?.removed !== true) removedDelta += 1;
    });

    await batch.commit();

    if (removedDelta > 0) {
      await firestore.runTransaction(async (tx) => {
        const summarySnap = await tx.get(PLAYLIST_SUMMARY_REF);
        const currentCount = playlistCountFromSummary(summarySnap);
        tx.set(
          PLAYLIST_SUMMARY_REF,
          summaryPlaylistPatch(applyPlaylistDelta(currentCount, -removedDelta)),
          { merge: true },
        );
      });
    }

    return c.json({ ok: true, count: ids.length });
  } catch (err) {
    return jsonHttpError(c, err, "playlist.bulk-delete");
  }
}

export async function reorderPlaylistSongsHandler(c: Context) {
  try {
    const { orderedIds } = reqValid<{ orderedIds: string[] }>(c, "json");
    const now = admin.firestore.Timestamp.now();

    const batch = firestore.batch();
    orderedIds.forEach((id, idx) => {
      const ref = firestore.collection("playlistSongs").doc(id);
      batch.set(ref, { order: idx, updatedAt: now }, { merge: true });
    });

    await batch.commit();
    return c.json({ ok: true, count: orderedIds.length });
  } catch (err) {
    return jsonHttpError(c, err, "playlist.reorder");
  }
}
