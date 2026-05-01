// backend/hono/routes/guestDirectory.routes.ts
import type { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { GUEST_DIRECTORY_ANY_OF } from "../../constants/guestDirectoryAccess.js";
import { listGuestDirectoryHandler } from "../controllers/guestDirectory.controller.js";
import { requireAnyPermissionHono, requireFirebaseAuthHono } from "../middleware/auth.js";
import { guestDirectoryQuerySchema } from "../schemas/guestDirectory.schema.js";

export function registerGuestDirectoryRoutes(api: Hono) {
  api.get(
    "/guest-directory",
    requireFirebaseAuthHono,
    requireAnyPermissionHono(GUEST_DIRECTORY_ANY_OF),
    zValidator("query", guestDirectoryQuerySchema),
    listGuestDirectoryHandler,
  );
}

