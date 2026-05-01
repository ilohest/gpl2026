// backend/hono/routes/admin.routes.ts
import type { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import {
  aiChatHandler,
  createWeddingPlannerTaskHandler,
  createWeddingPlannerTasksBulkHandler,
  deleteWeddingPlannerTaskHandler,
  listWeddingPlannerTasksHandler,
  patchWeddingPlannerTaskHandler,
  refreshDashboardSummaryHandler,
  reorderWeddingPlannerTasksHandler,
  suggestWeddingPlannerHandler,
} from "../controllers/admin.controller.js";
import { requireFirebaseAuthHono, requirePermissionHono } from "../middleware/auth.js";
import {
  aiChatSchema,
  weddingPlannerReorderSchema,
  weddingPlannerSuggestSchema,
  weddingPlannerTaskBulkSchema,
  weddingPlannerTaskCreateSchema,
  weddingPlannerTaskIdParamSchema,
  weddingPlannerTaskPatchSchema,
} from "../schemas/admin.schema.js";

export function registerAdminRoutes(api: Hono) {
  api.post(
    "/admin/dashboard-summary/refresh",
    requireFirebaseAuthHono,
    refreshDashboardSummaryHandler,
  );

  api.post(
    "/admin/wedding-planner/suggest",
    requireFirebaseAuthHono,
    requirePermissionHono("planner:write"),
    zValidator("json", weddingPlannerSuggestSchema),
    suggestWeddingPlannerHandler,
  );

  api.get(
    "/admin/wedding-planner/tasks",
    requireFirebaseAuthHono,
    requirePermissionHono("planner:read"),
    listWeddingPlannerTasksHandler,
  );

  api.post(
    "/admin/wedding-planner/tasks",
    requireFirebaseAuthHono,
    requirePermissionHono("planner:write"),
    zValidator("json", weddingPlannerTaskCreateSchema),
    createWeddingPlannerTaskHandler,
  );

  api.post(
    "/admin/wedding-planner/tasks/bulk",
    requireFirebaseAuthHono,
    requirePermissionHono("planner:write"),
    zValidator("json", weddingPlannerTaskBulkSchema),
    createWeddingPlannerTasksBulkHandler,
  );

  api.patch(
    "/admin/wedding-planner/tasks/:id",
    requireFirebaseAuthHono,
    requirePermissionHono("planner:write"),
    zValidator("param", weddingPlannerTaskIdParamSchema),
    zValidator("json", weddingPlannerTaskPatchSchema),
    patchWeddingPlannerTaskHandler,
  );

  api.delete(
    "/admin/wedding-planner/tasks/:id",
    requireFirebaseAuthHono,
    requirePermissionHono("planner:write"),
    zValidator("param", weddingPlannerTaskIdParamSchema),
    deleteWeddingPlannerTaskHandler,
  );

  api.put(
    "/admin/wedding-planner/tasks/reorder",
    requireFirebaseAuthHono,
    requirePermissionHono("planner:write"),
    zValidator("json", weddingPlannerReorderSchema),
    reorderWeddingPlannerTasksHandler,
  );

  api.post(
    "/admin/ai-chat",
    requireFirebaseAuthHono,
    requirePermissionHono("ai_chat:use"),
    zValidator("json", aiChatSchema),
    aiChatHandler,
  );
}

