// backend/hono/routes/session.routes.ts
import type { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import {
  createSessionStore,
  getFirebaseConfig,
  getSession,
  login,
  logout,
} from "../controllers/session.controller.js";
import { loginSchema } from "../schemas/session.schema.js";

export function registerSessionRoutes(api: Hono) {
  const sessions = createSessionStore();

  api.post("/login", zValidator("json", loginSchema), login(sessions));
  api.post("/logout", logout(sessions));
  api.get("/session", getSession(sessions));
  api.get("/firebase-config", getFirebaseConfig);
}

