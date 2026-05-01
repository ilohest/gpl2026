// backend/hono/schemas/rsvp.schema.ts
import { z } from "zod";

export const rsvpSubmitBodySchema = z
  .object({
    data: z.unknown().optional(),
    recaptchaToken: z.unknown().optional(),
  })
  .passthrough();

export const rsvpsListQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(1000).optional(),
});

export const guestIdParamSchema = z.object({
  guestId: z.string().trim().min(1),
});

export const rsvpIdParamSchema = z.object({
  id: z.string().trim().min(1),
});

export const looseBodySchema = z.record(z.string(), z.unknown()).default({});

export const sendConfirmationEmailSchema = z.object({
  rsvpId: z.string().trim().min(1),
});

