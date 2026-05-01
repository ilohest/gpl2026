// backend/hono/routes/playlist.routes.ts
import type { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import {
  bulkDeletePlaylistSongsHandler,
  createPlaylistSongHandler,
  patchPlaylistSongHandler,
  reorderPlaylistSongsHandler,
} from "../controllers/playlist.controller.js";
import { requireFirebaseAuthHono, requirePermissionHono } from "../middleware/auth.js";
import {
  playlistBulkDeleteSchema,
  playlistReorderSchema,
  playlistSongCreateSchema,
  playlistSongParamSchema,
  playlistSongPatchSchema,
} from "../schemas/playlist.schema.js";

export function registerPlaylistRoutes(api: Hono) {
  api.post(
    "/playlist-songs",
    requireFirebaseAuthHono,
    requirePermissionHono("playlist:write"),
    zValidator("json", playlistSongCreateSchema),
    createPlaylistSongHandler,
  );

  api.patch(
    "/playlist-songs/:songId",
    requireFirebaseAuthHono,
    requirePermissionHono("playlist:write"),
    zValidator("param", playlistSongParamSchema),
    zValidator("json", playlistSongPatchSchema),
    patchPlaylistSongHandler,
  );

  api.post(
    "/playlist-songs/bulk-delete",
    requireFirebaseAuthHono,
    requirePermissionHono("playlist:write"),
    zValidator("json", playlistBulkDeleteSchema),
    bulkDeletePlaylistSongsHandler,
  );

  api.put(
    "/playlist-songs/reorder",
    requireFirebaseAuthHono,
    requirePermissionHono("playlist:write"),
    zValidator("json", playlistReorderSchema),
    reorderPlaylistSongsHandler,
  );
}

