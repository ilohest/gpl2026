// backend/hono/controllers/system.controller.ts
import type { Context } from "hono";

type ReadyGetter = () => boolean;

export function getHealth(c: Context) {
  return c.json({ status: "ok", uptime: process.uptime(), timestamp: Date.now() });
}

export function getReady(getReadyState: ReadyGetter) {
  return (c: Context) => c.json({ ready: getReadyState() });
}

