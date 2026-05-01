// backend/hono/schemas/playlist.schema.ts
import { z } from "zod";

export const playlistSongCreateSchema = z
  .object({
    title: z.unknown().optional(),
    artist: z.unknown().optional(),
    album: z.unknown().optional(),
    artworkUrl: z.unknown().optional(),
    previewUrl: z.unknown().optional(),
    proposedByName: z.unknown().optional(),
    proposedByRsvpId: z.unknown().optional(),
    order: z.number().finite().optional(),
  })
  .passthrough();

export const playlistSongPatchSchema = z
  .object({
    title: z.unknown().optional(),
    artist: z.unknown().optional(),
    album: z.unknown().optional(),
    artworkUrl: z.unknown().optional(),
    previewUrl: z.unknown().optional(),
    removed: z.unknown().optional(),
    order: z.number().finite().optional(),
  })
  .passthrough();

export const playlistSongParamSchema = z.object({
  songId: z.string().trim().min(1),
});

export const playlistBulkDeleteSchema = z.object({
  ids: z.array(z.string().trim().min(1)).default([]),
});

export const playlistReorderSchema = z.object({
  orderedIds: z.array(z.string().trim().min(1)).default([]),
});

