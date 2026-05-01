// backend/hono/routes/finances.routes.ts
import type { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import {
  createFinancesCategoryHandler,
  createFinancesExpenseHandler,
  createFinancesPayerHandler,
  deleteFinancesCategoryHandler,
  deleteFinancesExpenseHandler,
  deleteFinancesPayerHandler,
  getFinancesStatsHandler,
  patchFinancesBudgetHandler,
  patchFinancesCategoryHandler,
  patchFinancesExpenseHandler,
  patchFinancesPayerHandler,
} from "../controllers/finances.controller.js";
import { requireFirebaseAuthHono, requirePermissionHono } from "../middleware/auth.js";
import {
  financesBudgetBodySchema,
  financesCreateCategoryBodySchema,
  financesCreateExpenseBodySchema,
  financesCreatePayerBodySchema,
  financesIdParamSchema,
  financesPatchCategoryBodySchema,
  financesPatchExpenseBodySchema,
  financesPatchPayerBodySchema,
} from "../schemas/finances.schema.js";

export function registerFinancesRoutes(api: Hono) {
  api.get(
    "/finances/stats",
    requireFirebaseAuthHono,
    requirePermissionHono("finances:read"),
    getFinancesStatsHandler,
  );

  api.patch(
    "/finances/budget",
    requireFirebaseAuthHono,
    requirePermissionHono("finances:write"),
    zValidator("json", financesBudgetBodySchema),
    patchFinancesBudgetHandler,
  );

  api.post(
    "/finances/expenses",
    requireFirebaseAuthHono,
    requirePermissionHono("finances:write"),
    zValidator("json", financesCreateExpenseBodySchema),
    createFinancesExpenseHandler,
  );

  api.patch(
    "/finances/expenses/:id",
    requireFirebaseAuthHono,
    requirePermissionHono("finances:write"),
    zValidator("param", financesIdParamSchema),
    zValidator("json", financesPatchExpenseBodySchema),
    patchFinancesExpenseHandler,
  );

  api.delete(
    "/finances/expenses/:id",
    requireFirebaseAuthHono,
    requirePermissionHono("finances:write"),
    zValidator("param", financesIdParamSchema),
    deleteFinancesExpenseHandler,
  );

  api.post(
    "/finances/categories",
    requireFirebaseAuthHono,
    requirePermissionHono("finances:write"),
    zValidator("json", financesCreateCategoryBodySchema),
    createFinancesCategoryHandler,
  );

  api.patch(
    "/finances/categories/:id",
    requireFirebaseAuthHono,
    requirePermissionHono("finances:write"),
    zValidator("param", financesIdParamSchema),
    zValidator("json", financesPatchCategoryBodySchema),
    patchFinancesCategoryHandler,
  );

  api.delete(
    "/finances/categories/:id",
    requireFirebaseAuthHono,
    requirePermissionHono("finances:write"),
    zValidator("param", financesIdParamSchema),
    deleteFinancesCategoryHandler,
  );

  api.post(
    "/finances/payers",
    requireFirebaseAuthHono,
    requirePermissionHono("finances:write"),
    zValidator("json", financesCreatePayerBodySchema),
    createFinancesPayerHandler,
  );

  api.patch(
    "/finances/payers/:id",
    requireFirebaseAuthHono,
    requirePermissionHono("finances:write"),
    zValidator("param", financesIdParamSchema),
    zValidator("json", financesPatchPayerBodySchema),
    patchFinancesPayerHandler,
  );

  api.delete(
    "/finances/payers/:id",
    requireFirebaseAuthHono,
    requirePermissionHono("finances:write"),
    zValidator("param", financesIdParamSchema),
    deleteFinancesPayerHandler,
  );
}

