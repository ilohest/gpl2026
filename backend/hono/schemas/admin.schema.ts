// backend/hono/schemas/admin.schema.ts
import { z } from "zod";

export const aiChatSchema = z.object({
  message: z.string().trim().min(1),
  history: z.array(z.unknown()).optional(),
  scope: z.string().trim().optional(),
  locale: z.string().trim().optional(),
});

export const weddingPlannerSuggestSchema = z
  .object({
    prompt: z.unknown().optional(),
    locale: z.unknown().optional(),
    timezone: z.unknown().optional(),
    weddingDate: z.unknown().optional(),
  })
  .passthrough();

export const weddingPlannerTaskCreateSchema = z
  .object({
    title: z.unknown().optional(),
    notes: z.unknown().optional(),
    location: z.unknown().optional(),
    dueDate: z.unknown().optional(),
    dueTime: z.unknown().optional(),
    priority: z.unknown().optional(),
    questionsToAsk: z.unknown().optional(),
    isDone: z.unknown().optional(),
    source: z.unknown().optional(),
    order: z.unknown().optional(),
  })
  .passthrough();

export const weddingPlannerTaskBulkSchema = z
  .object({
    tasks: z.array(z.unknown()).optional(),
  })
  .passthrough();

export const weddingPlannerTaskPatchSchema = z
  .object({
    title: z.unknown().optional(),
    notes: z.unknown().optional(),
    location: z.unknown().optional(),
    dueDate: z.unknown().optional(),
    dueTime: z.unknown().optional(),
    priority: z.unknown().optional(),
    questionsToAsk: z.unknown().optional(),
    isDone: z.unknown().optional(),
    source: z.unknown().optional(),
    order: z.unknown().optional(),
  })
  .passthrough();

export const weddingPlannerTaskIdParamSchema = z.object({
  id: z.string().trim().min(1),
});

export const weddingPlannerReorderSchema = z.object({
  orderedIds: z.array(z.unknown()).default([]),
});

