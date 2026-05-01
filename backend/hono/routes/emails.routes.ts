// backend/hono/routes/emails.routes.ts
import type { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import {
  getEmailJobHandler,
  listEmailDeliveriesHandler,
  listEmailJobsHandler,
  sendCustomEmailHandler,
} from "../controllers/emails.controller.js";
import {
  requireAnyPermissionHono,
  requireFirebaseAuthHono,
  requirePermissionHono,
} from "../middleware/auth.js";
import {
  listEmailDeliveriesQuerySchema,
  listEmailJobsQuerySchema,
  sendCustomEmailSchema,
} from "../schemas/emails.schema.js";

export function registerEmailsRoutes(api: Hono) {
  api.post(
    "/send-custom-email",
    requireFirebaseAuthHono,
    requirePermissionHono("emails:send"),
    zValidator("json", sendCustomEmailSchema),
    sendCustomEmailHandler,
  );

  api.get(
    "/email-jobs",
    requireFirebaseAuthHono,
    requirePermissionHono("emails:read"),
    zValidator("query", listEmailJobsQuerySchema),
    listEmailJobsHandler,
  );

  api.get(
    "/email-jobs/:jobId",
    requireFirebaseAuthHono,
    requireAnyPermissionHono(["emails:read", "emails:send"]),
    getEmailJobHandler,
  );

  api.get(
    "/email-jobs/:jobId/deliveries",
    requireFirebaseAuthHono,
    requireAnyPermissionHono(["emails:read", "emails:send"]),
    zValidator("query", listEmailDeliveriesQuerySchema),
    listEmailDeliveriesHandler,
  );
}
