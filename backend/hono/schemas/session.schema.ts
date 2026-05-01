// backend/hono/schemas/session.schema.ts
import { z } from "zod";

export const loginSchema = z.object({
  password: z.string().min(1),
});

