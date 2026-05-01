// backend/hono/schemas/menusSeating.schema.ts
import { z } from "zod";

export const menuUpsertSchema = z.object({
  id: z.string().trim().min(1).optional(),
  name: z.string().trim().min(1),
  priority: z.number().int().optional(),
  active: z.boolean().optional(),
  note: z.string().optional(),
  covers: z.array(z.string()).optional(),
});

export const setGuestMenuSchema = z.object({
  menuId: z.string().trim().min(1).nullable().optional(),
  locked: z.boolean().optional(),
  status: z.string().trim().min(1).optional(),
});

export const autoAssignSchema = z.object({
  assignmentsMap: z.record(z.string(), z.unknown()).default({}),
});

export const seatingTableParamSchema = z.object({
  tableId: z.string().trim().min(1),
});

export const createSeatingTableSchema = z
  .object({
    shape: z.enum(["round", "square", "rect"]),
    capacity: z.unknown().optional(),
    name: z.unknown().optional(),
    seatsPerSide: z.unknown().optional(),
  })
  .passthrough();

export const patchSeatingTableSchema = z
  .object({
    shape: z.unknown().optional(),
    name: z.unknown().optional(),
    capacity: z.unknown().optional(),
    order: z.unknown().optional(),
    seatsPerSide: z.unknown().optional(),
    guestIds: z.unknown().optional(),
  })
  .passthrough();

export const setSeatingTableGuestIdsSchema = z
  .object({
    guestIds: z.array(z.unknown()).default([]),
  })
  .passthrough();

export const patchSeatingPlanConfigSchema = z.object({
  door: z.unknown().optional(),
});

