// backend/hono/routes/superadmin.routes.ts
import type { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import {
  acceptInviteHandler,
  createInviteHandler,
  inviteStatusHandler,
  listAuditLogsHandler,
  listInvitesHandler,
  listUsersHandler,
  patchUserPermissionsHandler,
  revokeInviteHandler,
  sendInviteEmailHandler,
} from "../controllers/superadmin.controller.js";
import { requireFirebaseAuthHono, requireSuperadminHono } from "../middleware/auth.js";
import {
  acceptInviteSchema,
  auditLogsQuerySchema,
  createInviteSchema,
  inviteIdParamSchema,
  inviteStatusQuerySchema,
  sendInviteEmailSchema,
  userPermissionsPatchSchema,
  userUidParamSchema,
} from "../schemas/superadmin.schema.js";

export function registerSuperadminRoutes(api: Hono) {
  api.get("/invites/status", zValidator("query", inviteStatusQuerySchema), inviteStatusHandler);

  api.get("/invites", requireFirebaseAuthHono, requireSuperadminHono, listInvitesHandler);

  api.post(
    "/invites",
    requireFirebaseAuthHono,
    requireSuperadminHono,
    zValidator("json", createInviteSchema),
    createInviteHandler,
  );

  api.post(
    "/invites/:id/revoke",
    requireFirebaseAuthHono,
    requireSuperadminHono,
    zValidator("param", inviteIdParamSchema),
    revokeInviteHandler,
  );

  api.post(
    "/invites/send-email",
    requireFirebaseAuthHono,
    requireSuperadminHono,
    zValidator("json", sendInviteEmailSchema),
    sendInviteEmailHandler,
  );

  api.post(
    "/invites/accept",
    requireFirebaseAuthHono,
    zValidator("json", acceptInviteSchema),
    acceptInviteHandler,
  );

  api.get("/users", requireFirebaseAuthHono, requireSuperadminHono, listUsersHandler);

  api.patch(
    "/users/:uid/permissions",
    requireFirebaseAuthHono,
    requireSuperadminHono,
    zValidator("param", userUidParamSchema),
    zValidator("json", userPermissionsPatchSchema),
    patchUserPermissionsHandler,
  );

  api.get(
    "/audit-logs",
    requireFirebaseAuthHono,
    requireSuperadminHono,
    zValidator("query", auditLogsQuerySchema),
    listAuditLogsHandler,
  );
}

