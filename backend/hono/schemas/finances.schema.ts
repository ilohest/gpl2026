// backend/hono/schemas/finances.schema.ts
import { z } from "zod";

export const financesIdParamSchema = z.object({
  id: z.string().trim().min(1),
});

export const financesBudgetBodySchema = z
  .object({
    budgetTotal: z.unknown().optional(),
  })
  .passthrough();

export const financesCreateExpenseBodySchema = z
  .object({
    label: z.unknown().optional(),
    title: z.unknown().optional(),
    amount: z.unknown().optional(),
    date: z.unknown().optional(),
    category: z.unknown().optional(),
    categoryId: z.unknown().optional(),
    payer: z.unknown().optional(),
    paidBy: z.unknown().optional(),
    paid: z.unknown().optional(),
    note: z.unknown().optional(),
  })
  .passthrough();

export const financesPatchExpenseBodySchema = z
  .object({
    label: z.unknown().optional(),
    title: z.unknown().optional(),
    amount: z.unknown().optional(),
    date: z.unknown().optional(),
    category: z.unknown().optional(),
    categoryId: z.unknown().optional(),
    payer: z.unknown().optional(),
    paidBy: z.unknown().optional(),
    paid: z.unknown().optional(),
    note: z.unknown().optional(),
  })
  .passthrough();

export const financesCreateCategoryBodySchema = z
  .object({
    label: z.unknown().optional(),
    order: z.unknown().optional(),
  })
  .passthrough();

export const financesPatchCategoryBodySchema = z
  .object({
    label: z.unknown().optional(),
    order: z.unknown().optional(),
  })
  .passthrough();

export const financesCreatePayerBodySchema = z
  .object({
    label: z.unknown().optional(),
    order: z.unknown().optional(),
  })
  .passthrough();

export const financesPatchPayerBodySchema = z
  .object({
    label: z.unknown().optional(),
    order: z.unknown().optional(),
  })
  .passthrough();

