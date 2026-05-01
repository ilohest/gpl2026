// backend/hono/controllers/session.controller.ts
import { randomUUID } from "node:crypto";
import { deleteCookie, getCookie, setCookie } from "hono/cookie";
import type { Context } from "hono";

export type SessionState = { authenticated: boolean; updatedAt: number };

const SESSION_COOKIE = "sid";
const SESSION_MAX_AGE_SEC = 60 * 60 * 24 * 14;

function reqValid<T>(c: Context, target: "json" | "param" | "query"): T {
  return (c.req as { valid: (t: string) => T }).valid(target);
}

function readSession(c: Parameters<typeof getCookie>[0], sessions: Map<string, SessionState>) {
  const sid = getCookie(c, SESSION_COOKIE);
  if (!sid) return { sid: null, state: null };
  const state = sessions.get(sid) || null;
  if (!state) return { sid: null, state: null };
  state.updatedAt = Date.now();
  return { sid, state };
}

export function createSessionStore() {
  return new Map<string, SessionState>();
}

export function login(sessions: Map<string, SessionState>) {
  return (c: Context) => {
    const { password } = reqValid<{ password: string }>(c, "json");
    const expectedPassword = String(process.env.SECURE_PASSWORD || "").trim();
    if (!expectedPassword) {
      return c.json({ ok: false, error: "auth_not_configured" }, 503);
    }
    if (password !== expectedPassword) {
      return c.json({ ok: false, error: "invalid_password" }, 401);
    }

    const sid = randomUUID();
    sessions.set(sid, { authenticated: true, updatedAt: Date.now() });
    setCookie(c, SESSION_COOKIE, sid, {
      path: "/",
      httpOnly: true,
      sameSite: "Lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: SESSION_MAX_AGE_SEC,
    });
    return c.json({ ok: true });
  };
}

export function logout(sessions: Map<string, SessionState>) {
  return (c: Context) => {
    const { sid } = readSession(c, sessions);
    if (sid) sessions.delete(sid);
    deleteCookie(c, SESSION_COOKIE, { path: "/" });
    return c.json({ ok: true });
  };
}

export function getSession(sessions: Map<string, SessionState>) {
  return (c: Context) => {
    const { state } = readSession(c, sessions);
    return c.json({ authenticated: !!state?.authenticated });
  };
}

export function getFirebaseConfig(c: Context) {
  const cfg = {
    apiKey: process.env.VITE_FIREBASE_API_KEY || process.env.FIREBASE_API_KEY || "",
    authDomain:
      process.env.VITE_FIREBASE_AUTH_DOMAIN || process.env.FIREBASE_AUTH_DOMAIN || "",
    projectId:
      process.env.VITE_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID || "",
    storageBucket:
      process.env.VITE_FIREBASE_STORAGE_BUCKET ||
      process.env.FIREBASE_STORAGE_BUCKET ||
      "",
    messagingSenderId:
      process.env.VITE_FIREBASE_MESSAGING_SENDER_ID ||
      process.env.FIREBASE_MESSAGING_SENDER_ID ||
      "",
    appId: process.env.VITE_FIREBASE_APP_ID || process.env.FIREBASE_APP_ID || "",
    measurementId:
      process.env.VITE_FIREBASE_MEASUREMENT_ID ||
      process.env.FIREBASE_MEASUREMENT_ID ||
      undefined,
  };

  const missing = ["apiKey", "authDomain", "projectId", "appId"].filter(
    (k) => !cfg[k as keyof typeof cfg],
  );
  if (missing.length) {
    return c.json({ error: "firebase_config_missing", missing }, 500);
  }
  return c.json(cfg);
}
