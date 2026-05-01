// backend/hono/routes/agenda.routes.ts
import type { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import {
  createAgendaItemHandler,
  deleteAgendaItemHandler,
  patchAgendaItemHandler,
  reorderAgendaItemsHandler,
  seedAgendaTemplateHandler,
} from "../controllers/agenda.controller.js";
import { requireFirebaseAuthHono, requirePermissionHono } from "../middleware/auth.js";
import {
  agendaItemParamSchema,
  agendaItemSchema,
  agendaReorderSchema,
  agendaSeedSchema,
} from "../schemas/agenda.schema.js";

export function registerAgendaRoutes(api: Hono) {
  api.post(
    "/agenda/items",
    requireFirebaseAuthHono,
    requirePermissionHono("agenda:write"),
    zValidator("json", agendaItemSchema),
    createAgendaItemHandler,
  );

  api.patch(
    "/agenda/items/:id",
    requireFirebaseAuthHono,
    requirePermissionHono("agenda:write"),
    zValidator("param", agendaItemParamSchema),
    zValidator("json", agendaItemSchema),
    patchAgendaItemHandler,
  );

  api.delete(
    "/agenda/items/:id",
    requireFirebaseAuthHono,
    requirePermissionHono("agenda:write"),
    zValidator("param", agendaItemParamSchema),
    deleteAgendaItemHandler,
  );

  api.put(
    "/agenda/items/reorder",
    requireFirebaseAuthHono,
    requirePermissionHono("agenda:write"),
    zValidator("json", agendaReorderSchema),
    reorderAgendaItemsHandler,
  );

  api.post(
    "/agenda/seed-template",
    requireFirebaseAuthHono,
    requirePermissionHono("agenda:write"),
    zValidator("json", agendaSeedSchema),
    seedAgendaTemplateHandler,
  );
}

