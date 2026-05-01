// backend/hono/schemas/blog.schema.ts
import { z } from "zod";

export const blogPostParamSchema = z.object({
  id: z.unknown().optional(),
});

export const blogLikeBodySchema = z
  .object({
    clientId: z.unknown().optional(),
  })
  .passthrough();

export const blogListQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(500).catch(200).optional(),
});

export const blogCreateBodySchema = z
  .object({
    imageUrl: z.unknown().optional(),
    image: z.unknown().optional(),
    texts: z.unknown().optional(),
  })
  .passthrough();

export const blogPatchBodySchema = z
  .object({
    imageUrl: z.unknown().optional(),
    image: z.unknown().optional(),
    texts: z.unknown().optional(),
  })
  .passthrough();

export const blogUploadImageFormSchema = z
  .object({
    image: z.unknown().optional(),
  })
  .passthrough();

export const blogNotificationJobParamSchema = z.object({
  jobId: z.unknown().optional(),
});

export const blogNotificationDeliveriesQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(400).catch(400).optional(),
});

