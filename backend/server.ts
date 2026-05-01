// backend/server.ts
import dotenv from "dotenv";
import { createServer } from "node:http";
import path from "node:path";
import { Readable } from "node:stream";
import { fileURLToPath } from "node:url";
import { Hono } from "hono";
import { logger } from "hono/logger";
import { cors } from "hono/cors";
import { createApiRoutes, type AppType as ApiAppType } from "./hono/apiRoutes.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, ".env") });

process.on("exit", (code) => console.log("[process exit]", code));
process.on("beforeExit", (code) => console.log("[beforeExit]", code));
process.on("uncaughtException", (err) =>
  console.error("[uncaughtException]", err),
);
process.on("unhandledRejection", (reason) =>
  console.error("[unhandledRejection]", reason),
);

const PORT = Number(process.env.PORT || 3000);
const PROD = process.env.NODE_ENV === "production";
const HOST = String(
  process.env.HOST || process.env.LISTEN_HOST || (PROD ? "0.0.0.0" : "127.0.0.1"),
).trim();
const SESSION_SECRET = String(process.env.SESSION_SECRET || "").trim();
const SECURE_PASSWORD = String(process.env.SECURE_PASSWORD || "").trim();

if (!SESSION_SECRET) {
  throw new Error("❌ SESSION_SECRET manquant dans backend/.env");
}
if (!SECURE_PASSWORD) {
  throw new Error("❌ SECURE_PASSWORD manquant dans backend/.env");
}

let READY = false;

const app = new Hono();
app.use("*", logger());

if (!PROD) {
  app.use("/api/*", cors({ origin: "*", credentials: true }));
} else {
  const corsOrigins = (process.env.CORS_ORIGINS || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  app.use(
    "/api/*",
    cors({
      origin: (origin) => {
        if (!origin) return origin;
        return corsOrigins.includes(origin) ? origin : "";
      },
      credentials: true,
    }),
  );
}

const apiRoutes = createApiRoutes(() => READY);
app.route("/api", apiRoutes);

export type AppType = ApiAppType;
export type ApiRoutesType = typeof apiRoutes;

app.notFound((c) =>
  c.json(
    {
      ok: false,
      error: "not_found",
      code: "not_found",
      message: "not_found",
      meta: null,
    },
    404,
  ),
);

app.onError((err, c) => {
  console.error("[unhandled]", err);
  return c.json(
    {
      ok: false,
      error: "internal_error",
      code: "internal_error",
      message: "internal_error",
      meta: null,
    },
    500,
  );
});

export async function bootstrapServer() {
  try {
    const { ensureFirebaseAdminInitialized } = await import("./lib/firebase.js");
    ensureFirebaseAdminInitialized();
    const { verifyEmailTransport } = await import("./lib/email.js");
    void verifyEmailTransport().catch((err: unknown) => {
      const msg = err instanceof Error ? err.message : String(err ?? "");
      console.warn("⚠️ SMTP indisponible au démarrage:", msg || err);
    });
    READY = true;
    console.log("✅ Bootstrap terminé (routes montées)");

    const server = createServer(async (req, res) => {
      try {
        const proto = req.headers["x-forwarded-proto"] || "http";
        const host = req.headers.host || `${HOST}:${PORT}`;
        const url = `${proto}://${host}${req.url || "/"}`;

        const hasBody = req.method !== "GET" && req.method !== "HEAD";
        const request = new Request(url, {
          method: req.method,
          headers: req.headers as HeadersInit,
          body: hasBody ? (Readable.toWeb(req) as BodyInit) : undefined,
          // @ts-expect-error Node fetch request init extension
          duplex: hasBody ? "half" : undefined,
        });

        const response = await app.fetch(request);
        res.statusCode = response.status;
        response.headers.forEach((value, key) => {
          res.setHeader(key, value);
        });

        if (!response.body) {
          res.end();
          return;
        }

        Readable.fromWeb(response.body as any).pipe(res);
      } catch (err) {
        console.error("[server] request handling failed", err);
        res.statusCode = 500;
        res.setHeader("content-type", "application/json");
        res.end(
          JSON.stringify({
            ok: false,
            error: "internal_error",
            code: "internal_error",
            message: "internal_error",
            meta: null,
          }),
        );
      }
    });
    server.listen(PORT, HOST);
    server.on("error", (err: unknown) => console.error("LISTEN ERROR", err));
    console.log(`API listening on http://${HOST}:${PORT}`);
  } catch (e) {
    console.error("❌ Bootstrap failed:", e);
    READY = false;
    process.exitCode = 1;
  }
}

const isEntrypoint = process.argv[1]
  ? path.resolve(process.argv[1]) === __filename
  : false;

if (isEntrypoint) {
  void bootstrapServer();
}
