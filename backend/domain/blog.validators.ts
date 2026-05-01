// backend/domain/blog.validators.ts
import crypto from "node:crypto";

type TextInput = { es?: unknown; en?: unknown };

export function safeStr(v: unknown, max = 8000): string {
  const s = String(v ?? "").trim();
  return s.length > max ? s.slice(0, max) : s;
}

export function safeTexts(input: unknown): { es: string; en: string } {
  const t = (input && typeof input === "object" ? input : {}) as TextInput;
  return {
    es: safeStr(t.es ?? "", 400),
    en: safeStr(t.en ?? "", 400),
  };
}

export function assertPostId(postId: unknown): string | null {
  const id = String(postId || "").trim();
  if (!id) return null;
  return id;
}

export function assertClientId(raw: unknown): string | null {
  const clientId = String(raw || "").trim();
  if (!clientId || clientId.length < 8 || clientId.length > 200) return null;
  return clientId;
}

export function assertStorageImageUrl(url: unknown): string | null {
  const s = safeStr(url, 2000);
  if (!s.startsWith("https://firebasestorage.googleapis.com/")) return null;
  return s;
}

export function clientHash(clientId: string): string {
  const salt = process.env.LIKES_IP_SALT || ""; // renomme en LIKES_SALT si tu veux
  if (!salt) return "";
  return crypto
    .createHash("sha256")
    .update(`${salt}:${clientId}`)
    .digest("hex");
}

export function isAllowedImageMime(m: unknown): boolean {
  return ["image/jpeg", "image/png", "image/webp"].includes(String(m || ""));
}
