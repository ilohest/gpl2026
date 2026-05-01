// backend/hono/context.ts
import type { UserLike } from "../types/expressLike.js";

export type HonoClaims = Record<string, unknown>;
export type HonoUser = UserLike;

declare module "hono" {
  interface ContextVariableMap {
    user: HonoUser;
    claims: HonoClaims;
  }
}

