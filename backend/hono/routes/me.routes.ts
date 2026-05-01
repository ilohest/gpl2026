// backend/hono/routes/me.routes.ts
import type { Hono } from "hono";
import { getMeHandler } from "../controllers/me.controller.js";
import { requireFirebaseAuthHono } from "../middleware/auth.js";

export function registerMeRoutes(api: Hono) {
  api.get("/me", requireFirebaseAuthHono, getMeHandler);
}

