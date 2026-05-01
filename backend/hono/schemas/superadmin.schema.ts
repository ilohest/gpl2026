// backend/hono/schemas/superadmin.schema.ts
import { z } from "zod";

export const inviteStatusQuerySchema = z.object({
  token: z.string().trim().min(1),
});

export const createInviteSchema = z
  .object({
    email: z.unknown().optional(),
    displayName: z.unknown().optional(),
    permissions: z.array(z.unknown()).optional(),
  })
  .passthrough();

export const inviteIdParamSchema = z.object({
  id: z.string().trim().min(1),
});

export const acceptInviteSchema = z
  .object({
    token: z.unknown().optional(),
  })
  .passthrough();

export const sendInviteEmailSchema = z
  .object({
    toEmail: z.unknown().optional(),
    link: z.unknown().optional(),
    permissions: z.array(z.unknown()).optional(),
  })
  .passthrough();

export const userUidParamSchema = z.object({
  uid: z.string().trim().min(1),
});

export const userPermissionsPatchSchema = z
  .object({
    permissions: z.array(z.unknown()).optional(),
  })
  .passthrough();

export const auditLogsQuerySchema = z
  .object({
    limit: z.string().optional(),
    type: z.string().optional(),
    actorUid: z.string().optional(),
  })
  .passthrough();

