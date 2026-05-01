// backend/hono/routes/rsvp.routes.ts
import type { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import {
  addGuestToRsvpHandler,
  createManualCoupleRsvpHandler,
  createManualRsvpGroupHandler,
  createManualRsvpHandler,
  deleteGuestHandler,
  deleteRsvpHandler,
  listRsvpsHandler,
  patchGuestHandler,
  patchRsvpHandler,
  sendConfirmationEmailHandler,
  submitRsvpHandler,
} from "../controllers/rsvp.controller.js";
import { requireFirebaseAuthHono, requirePermissionHono } from "../middleware/auth.js";
import {
  guestIdParamSchema,
  looseBodySchema,
  rsvpIdParamSchema,
  rsvpSubmitBodySchema,
  rsvpsListQuerySchema,
  sendConfirmationEmailSchema,
} from "../schemas/rsvp.schema.js";

export function registerRsvpRoutes(api: Hono) {
  api.post("/rsvp/submit", zValidator("json", rsvpSubmitBodySchema), submitRsvpHandler);

  api.post(
    "/send-confirmation-email",
    requireFirebaseAuthHono,
    requirePermissionHono("rsvp:write"),
    zValidator("json", sendConfirmationEmailSchema),
    sendConfirmationEmailHandler,
  );

  api.get(
    "/rsvps",
    requireFirebaseAuthHono,
    requirePermissionHono("rsvp:read"),
    zValidator("query", rsvpsListQuerySchema),
    listRsvpsHandler,
  );

  api.patch(
    "/guests/:guestId",
    requireFirebaseAuthHono,
    requirePermissionHono("rsvp:write"),
    zValidator("param", guestIdParamSchema),
    zValidator("json", looseBodySchema),
    patchGuestHandler,
  );

  api.delete(
    "/guests/:guestId",
    requireFirebaseAuthHono,
    requirePermissionHono("rsvp:write"),
    zValidator("param", guestIdParamSchema),
    deleteGuestHandler,
  );

  api.delete(
    "/rsvps/:id",
    requireFirebaseAuthHono,
    requirePermissionHono("rsvp:write"),
    zValidator("param", rsvpIdParamSchema),
    deleteRsvpHandler,
  );

  api.post(
    "/rsvps/manual",
    requireFirebaseAuthHono,
    requirePermissionHono("rsvp:write"),
    zValidator("json", looseBodySchema),
    createManualRsvpHandler,
  );

  api.post(
    "/rsvps/manual-couple",
    requireFirebaseAuthHono,
    requirePermissionHono("rsvp:write"),
    zValidator("json", looseBodySchema),
    createManualCoupleRsvpHandler,
  );

  api.post(
    "/rsvps/manual-group",
    requireFirebaseAuthHono,
    requirePermissionHono("rsvp:write"),
    zValidator("json", looseBodySchema),
    createManualRsvpGroupHandler,
  );

  api.post(
    "/rsvps/:id/guests",
    requireFirebaseAuthHono,
    requirePermissionHono("rsvp:write"),
    zValidator("param", rsvpIdParamSchema),
    zValidator("json", looseBodySchema),
    addGuestToRsvpHandler,
  );

  api.patch(
    "/rsvps/:id",
    requireFirebaseAuthHono,
    requirePermissionHono("rsvp:write"),
    zValidator("param", rsvpIdParamSchema),
    zValidator("json", looseBodySchema),
    patchRsvpHandler,
  );
}

