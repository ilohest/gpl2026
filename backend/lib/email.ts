// backend/lib/email.ts
import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";
// @ts-ignore ambient declaration loaded in backend/types/nodemailer.d.ts
import nodemailer from "nodemailer";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, "..", ".env") });

let transporterInstance: ReturnType<typeof nodemailer.createTransport> | null = null;
let verifyPromise: Promise<void> | null = null;

function createTransporter() {
  return nodemailer.createTransport({
    host: "smtp.hostinger.com",
    port: 465,
    secure: true,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
    logger: true,
    debug: true,
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
