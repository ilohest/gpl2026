import test from "node:test";
import assert from "node:assert/strict";
import { Hono } from "hono";
import {
  createSessionStore,
  getFirebaseConfig,
  getSession,
  login,
  logout,
} from "../hono/controllers/session.controller.js";

function createSessionApp() {
  const sessions = createSessionStore();
  const app = new Hono();

  app.post("/login", async (c) => {
    const body = await c.req.json();
    (c.req as { valid: (target: string) => unknown }).valid = () => body;
    return login(sessions)(c);
  });
  app.get("/session", getSession(sessions));
  app.post("/logout", logout(sessions));
  app.get("/firebase-config", getFirebaseConfig);

  return { app, sessions };
}

function withEnv<T>(patch: Record<string, string | undefined>, run: () => Promise<T> | T) {
  const previous = new Map<string, string | undefined>();
  for (const [key, value] of Object.entries(patch)) {
    previous.set(key, process.env[key]);
    if (typeof value === "undefined") delete process.env[key];
    else process.env[key] = value;
  }

  const restore = () => {
    for (const [key, value] of previous.entries()) {
      if (typeof value === "undefined") delete process.env[key];
      else process.env[key] = value;
    }
  };

  try {
    return Promise.resolve(run()).finally(restore);
  } catch (error) {
    restore();
    throw error;
  }
}

test("session login rejects requests when secure password is not configured", async () => {
  await withEnv({ SECURE_PASSWORD: undefined }, async () => {
    const { app } = createSessionApp();
    const response = await app.request("http://local/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ password: "anything" }),
    });

    assert.equal(response.status, 503);
    assert.deepEqual(await response.json(), {
      ok: false,
      error: "auth_not_configured",
    });
  });
});

test("session login sets an authenticated cookie and session endpoint reuses it", async () => {
  await withEnv({ SECURE_PASSWORD: "top-secret", NODE_ENV: "test" }, async () => {
    const { app, sessions } = createSessionApp();
    const loginResponse = await app.request("http://local/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ password: "top-secret" }),
    });

    assert.equal(loginResponse.status, 200);
    assert.deepEqual(await loginResponse.json(), { ok: true });

    const setCookie = loginResponse.headers.get("set-cookie");
    assert.ok(setCookie, "login should set a session cookie");
    assert.match(setCookie, /sid=/);
    assert.match(setCookie, /HttpOnly/i);
    assert.match(setCookie, /SameSite=Lax/i);

    assert.equal(sessions.size, 1);

    const sessionResponse = await app.request("http://local/session", {
      headers: { cookie: setCookie },
    });
    assert.equal(sessionResponse.status, 200);
    assert.deepEqual(await sessionResponse.json(), { authenticated: true });
  });
});

test("session login rejects invalid passwords and does not create a session", async () => {
  await withEnv({ SECURE_PASSWORD: "top-secret" }, async () => {
    const { app, sessions } = createSessionApp();
    const response = await app.request("http://local/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ password: "wrong" }),
    });

    assert.equal(response.status, 401);
    assert.deepEqual(await response.json(), {
      ok: false,
      error: "invalid_password",
    });
    assert.equal(sessions.size, 0);
  });
});

test("logout clears the server-side session and future reads become unauthenticated", async () => {
  await withEnv({ SECURE_PASSWORD: "top-secret", NODE_ENV: "test" }, async () => {
    const { app, sessions } = createSessionApp();
    const loginResponse = await app.request("http://local/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ password: "top-secret" }),
    });
    const cookie = loginResponse.headers.get("set-cookie");
    assert.ok(cookie);
    assert.equal(sessions.size, 1);

    const logoutResponse = await app.request("http://local/logout", {
      method: "POST",
      headers: { cookie },
    });
    assert.equal(logoutResponse.status, 200);
    assert.deepEqual(await logoutResponse.json(), { ok: true });
    assert.equal(sessions.size, 0);
    assert.match(String(logoutResponse.headers.get("set-cookie")), /sid=;/);

    const sessionResponse = await app.request("http://local/session", {
      headers: { cookie },
    });
    assert.deepEqual(await sessionResponse.json(), { authenticated: false });
  });
});

test("firebase config endpoint reports missing required keys", async () => {
  await withEnv(
    {
      VITE_FIREBASE_API_KEY: undefined,
      FIREBASE_API_KEY: undefined,
      VITE_FIREBASE_AUTH_DOMAIN: undefined,
      FIREBASE_AUTH_DOMAIN: undefined,
      VITE_FIREBASE_PROJECT_ID: undefined,
      FIREBASE_PROJECT_ID: undefined,
      VITE_FIREBASE_APP_ID: undefined,
      FIREBASE_APP_ID: undefined,
    },
    async () => {
      const { app } = createSessionApp();
      const response = await app.request("http://local/firebase-config");

      assert.equal(response.status, 500);
      assert.deepEqual(await response.json(), {
        error: "firebase_config_missing",
        missing: ["apiKey", "authDomain", "projectId", "appId"],
      });
    },
  );
});

test("firebase config endpoint merges VITE and backend env vars into a stable payload", async () => {
  await withEnv(
    {
      VITE_FIREBASE_API_KEY: "vite-key",
      FIREBASE_API_KEY: "server-key",
      VITE_FIREBASE_AUTH_DOMAIN: "vite-auth.example",
      VITE_FIREBASE_PROJECT_ID: "vite-project",
      FIREBASE_STORAGE_BUCKET: "server-bucket",
      FIREBASE_MESSAGING_SENDER_ID: "123456",
      VITE_FIREBASE_APP_ID: "vite-app",
      FIREBASE_MEASUREMENT_ID: "G-123",
    },
    async () => {
      const { app } = createSessionApp();
      const response = await app.request("http://local/firebase-config");

      assert.equal(response.status, 200);
      assert.deepEqual(await response.json(), {
        apiKey: "vite-key",
        authDomain: "vite-auth.example",
        projectId: "vite-project",
        storageBucket: "server-bucket",
        messagingSenderId: "123456",
        appId: "vite-app",
        measurementId: "G-123",
      });
    },
  );
});
