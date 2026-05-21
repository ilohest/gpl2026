// backend/lib/email.ts
import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";
// @ts-ignore ambient declaration loaded in backend/types/nodemailer.d.ts
import nodemailer from "nodemailer";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const runtimeNodeEnv = process.env.NODE_ENV;
dotenv.config({ path: path.resolve(__dirname, "..", ".env"), override: true });
if (runtimeNodeEnv) process.env.NODE_ENV = runtimeNodeEnv;

let transporterInstance: ReturnType<typeof nodemailer.createTransport> | null = null;
let verifyPromise: Promise<void> | null = null;

function readBooleanEnv(value: string | undefined, fallback: boolean) {
  if (value == null || value === "") return fallback;
  return ["1", "true", "yes", "on"].includes(value.trim().toLowerCase());
}

function readNumberEnv(value: string | undefined, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function createTransporter() {
  const host = process.env.SMTP_HOST || "smtp.gmail.com";
  const port = readNumberEnv(process.env.SMTP_PORT, 465);
  const secure = readBooleanEnv(process.env.SMTP_SECURE, port === 465);
  const debug = readBooleanEnv(process.env.SMTP_DEBUG, false);
  const isGmailSmtp = host.toLowerCase() === "smtp.gmail.com";
  const smtpPass = isGmailSmtp
    ? String(process.env.SMTP_PASS || "").replace(/\s+/g, "")
    : process.env.SMTP_PASS;

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: {
      user: process.env.SMTP_USER,
      pass: smtpPass,
    },
    logger: debug,
    debug,
  });
}

export function getTransporter() {
  if (!transporterInstance) {
    transporterInstance = createTransporter();
  }
  return transporterInstance;
}

export async function verifyEmailTransport(): Promise<void> {
  if (!verifyPromise) {
    verifyPromise = getTransporter()
      .verify()
      .then(() => console.log("✅ SMTP prêt"))
      .catch((err: unknown) => {
        verifyPromise = null;
        const msg = err instanceof Error ? err.message : String(err ?? "");
        console.error("❌ SMTP error:", msg || err);
        throw err;
      });
  }
  await verifyPromise;
}
