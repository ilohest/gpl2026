// backend/utils/crypto.ts
import crypto from "node:crypto";

export function sha256(s: unknown): string {
  return crypto.createHash("sha256").update(String(s)).digest("hex");
}

export function randomToken(bytes = 24): string {
  return crypto.randomBytes(bytes).toString("base64url");
}
