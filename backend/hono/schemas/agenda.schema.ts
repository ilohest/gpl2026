// backend/hono/schemas/agenda.schema.ts
import { z } from "zod";

export const agendaItemSchema = z.object({
  time: z.string().optional(),
  durationMin: z.number().optional(),
  title: z.string().optional(),
  type: z.array(z.string()).optional(),
  notes: z.string().optional(),
  participants: z.array(z.string()).optional(),
  trackRefs: z.array(z.unknown()).optional(),
  location: z.string().optional(),
  ownerTags: z.array(z.string()).optional(),
  order: z.number().optional(),
});

export const agendaItemParamSchema = z.object({
  id: z.string().trim().min(1),
});

export const agendaReorderSchema = z.object({
  orderedIds: z.array(z.string()).default([]),
  setTimeById: z.record(z.string(), z.string()).default({}),
});

export const agendaSeedSchema = z.object({
  key: z.string().trim().min(1),
});

