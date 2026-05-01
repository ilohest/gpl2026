// backend/hono/schemas/emails.schema.ts
import { z } from "zod";

export const sendCustomEmailSchema = z.object({
  subject: z.string().trim().min(1),
  html: z.string().trim().min(1),
  testEmail: z.string().trim().email().optional(),
  mode: z.string().trim().min(1).optional(),
  recipients: z.unknown().optional(),
});

export const listEmailJobsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).optional(),
  type: z.string().trim().optional(),
});

export const listEmailDeliveriesQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(500).optional(),
});

