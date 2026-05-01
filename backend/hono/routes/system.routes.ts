// backend/hono/routes/system.routes.ts
import type { Hono } from "hono";
import { getHealth, getReady } from "../controllers/system.controller.js";

type ReadyGetter = () => boolean;

export function registerSystemRoutes(api: Hono, { getReadyState }: { getReadyState: ReadyGetter }) {
  api.get("/health", getHealth);
  api.get("/ready", getReady(getReadyState));
}

