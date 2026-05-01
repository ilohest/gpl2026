// backend/hono/schemas/guestDirectory.schema.ts
import { z } from "zod";

export const guestDirectoryQuerySchema = z.object({
  scope: z.string().trim().optional(),
  fields: z.string().trim().optional(),
});

