// backend/hono/routes/blog.routes.ts
import type { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import {
  createBlogPostHandler,
  deleteBlogPostHandler,
  getBlogNotificationJobHandler,
  likeBlogPostHandler,
  listBlogNotificationDeliveriesHandler,
  listBlogPostsHandler,
  patchBlogPostHandler,
  unlikeBlogPostHandler,
  uploadBlogImageHandler,
} from "../controllers/blog.controller.js";
import { requireFirebaseAuthHono, requirePermissionHono } from "../middleware/auth.js";
import {
  blogCreateBodySchema,
  blogLikeBodySchema,
  blogListQuerySchema,
  blogNotificationDeliveriesQuerySchema,
  blogNotificationJobParamSchema,
  blogPatchBodySchema,
  blogPostParamSchema,
  blogUploadImageFormSchema,
} from "../schemas/blog.schema.js";

export function registerBlogRoutes(api: Hono) {
  api.post(
    "/blog-posts/:id/like",
    zValidator("param", blogPostParamSchema),
    zValidator("json", blogLikeBodySchema),
    likeBlogPostHandler,
  );

  api.post(
    "/blog-posts/:id/unlike",
    zValidator("param", blogPostParamSchema),
    zValidator("json", blogLikeBodySchema),
    unlikeBlogPostHandler,
  );

  api.get(
    "/blog-posts",
    requireFirebaseAuthHono,
    requirePermissionHono("blog:write"),
    zValidator("query", blogListQuerySchema),
    listBlogPostsHandler,
  );

  api.post(
    "/blog-posts",
    requireFirebaseAuthHono,
    requirePermissionHono("blog:write"),
    zValidator("json", blogCreateBodySchema),
    createBlogPostHandler,
  );

  api.patch(
    "/blog-posts/:id",
    requireFirebaseAuthHono,
    requirePermissionHono("blog:write"),
    zValidator("param", blogPostParamSchema),
    zValidator("json", blogPatchBodySchema),
    patchBlogPostHandler,
  );

  api.delete(
    "/blog-posts/:id",
    requireFirebaseAuthHono,
    requirePermissionHono("blog:write"),
    zValidator("param", blogPostParamSchema),
    deleteBlogPostHandler,
  );

  api.post(
    "/blog-posts/upload-image",
    requireFirebaseAuthHono,
    requirePermissionHono("blog:write"),
    zValidator("form", blogUploadImageFormSchema),
    uploadBlogImageHandler,
  );

  api.get(
    "/blog-notification-jobs/:jobId",
    requireFirebaseAuthHono,
    requirePermissionHono("blog:write"),
    zValidator("param", blogNotificationJobParamSchema),
    getBlogNotificationJobHandler,
  );

  api.get(
    "/blog-notification-jobs/:jobId/deliveries",
    requireFirebaseAuthHono,
    requirePermissionHono("blog:write"),
    zValidator("param", blogNotificationJobParamSchema),
    zValidator("query", blogNotificationDeliveriesQuerySchema),
    listBlogNotificationDeliveriesHandler,
  );
}

