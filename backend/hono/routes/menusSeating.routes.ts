// backend/hono/routes/menusSeating.routes.ts
import type { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import {
  autoAssignMenusHandler,
  createSeatingTableHandler,
  deleteMenuHandler,
  deleteSeatingTableHandler,
  listMenuAssignmentsHandler,
  listMenusHandler,
  patchSeatingPlanConfigHandler,
  patchSeatingTableHandler,
  setGuestMenuHandler,
  setSeatingTableGuestIdsHandler,
  upsertMenuHandler,
} from "../controllers/menusSeating.controller.js";
import { requireFirebaseAuthHono, requirePermissionHono } from "../middleware/auth.js";
import {
  autoAssignSchema,
  createSeatingTableSchema,
  menuUpsertSchema,
  patchSeatingPlanConfigSchema,
  patchSeatingTableSchema,
  seatingTableParamSchema,
  setGuestMenuSchema,
  setSeatingTableGuestIdsSchema,
} from "../schemas/menusSeating.schema.js";

export function registerMenusSeatingRoutes(api: Hono) {
  api.get("/menus", requireFirebaseAuthHono, requirePermissionHono("menus_seating:read"), listMenusHandler);

  api.get(
    "/menu-assignments",
    requireFirebaseAuthHono,
    requirePermissionHono("menus_seating:read"),
    listMenuAssignmentsHandler,
  );

  api.post(
    "/menus",
    requireFirebaseAuthHono,
    requirePermissionHono("menus_seating:write"),
    zValidator("json", menuUpsertSchema),
    upsertMenuHandler,
  );

  api.delete(
    "/menus/:menuId",
    requireFirebaseAuthHono,
    requirePermissionHono("menus_seating:write"),
    deleteMenuHandler,
  );

  api.put(
    "/menu-assignments/:guestId",
    requireFirebaseAuthHono,
    requirePermissionHono("menus_seating:write"),
    zValidator("json", setGuestMenuSchema),
    setGuestMenuHandler,
  );

  api.post(
    "/menu-assignments/auto-assign",
    requireFirebaseAuthHono,
    requirePermissionHono("menus_seating:write"),
    zValidator("json", autoAssignSchema),
    autoAssignMenusHandler,
  );

  api.post(
    "/seating/tables",
    requireFirebaseAuthHono,
    requirePermissionHono("menus_seating:write"),
    zValidator("json", createSeatingTableSchema),
    createSeatingTableHandler,
  );

  api.patch(
    "/seating/tables/:tableId",
    requireFirebaseAuthHono,
    requirePermissionHono("menus_seating:write"),
    zValidator("param", seatingTableParamSchema),
    zValidator("json", patchSeatingTableSchema),
    patchSeatingTableHandler,
  );

  api.delete(
    "/seating/tables/:tableId",
    requireFirebaseAuthHono,
    requirePermissionHono("menus_seating:write"),
    zValidator("param", seatingTableParamSchema),
    deleteSeatingTableHandler,
  );

  api.put(
    "/seating/tables/:tableId/guest-ids",
    requireFirebaseAuthHono,
    requirePermissionHono("menus_seating:write"),
    zValidator("param", seatingTableParamSchema),
    zValidator("json", setSeatingTableGuestIdsSchema),
    setSeatingTableGuestIdsHandler,
  );

  api.patch(
    "/seating/plan-config",
    requireFirebaseAuthHono,
    requirePermissionHono("menus_seating:write"),
    zValidator("json", patchSeatingPlanConfigSchema),
    patchSeatingPlanConfigHandler,
  );
}

