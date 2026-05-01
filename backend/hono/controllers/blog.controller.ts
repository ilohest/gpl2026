// backend/hono/controllers/blog.controller.ts
import type { Context } from "hono";
import { firestore } from "../../lib/firebase.js";
import { triggerAdminDashboardSummaryRefresh } from "../../services/adminDashboardSummary.service.js";
import { assertClientId, assertPostId, assertStorageImageUrl, safeTexts } from "../../domain/blog.validators.js";
import { badRequest, forbidden, notFound } from "../../utils/httpErrors.js";
import { jsonHttpError } from "../httpErrors.js";
import {
  createPost,
  deletePost,
  likePost,
  listPosts,
  unlikePost,
  updatePost,
  uploadBlogImage,
} from "../../services/blog.service.js";

type BlogLikeResult = {
  ok: boolean;
  status?: number;
  error?: string;
  already?: boolean;
  removed?: boolean;
};

type BlogUploadInputFile = {
  fieldname: string;
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
};

function reqValid<T>(c: Context, target: "json" | "param" | "query" | "form"): T {
  return (c.req as { valid: (t: string) => T }).valid(target);
}

export async function likeBlogPostHandler(c: Context) {
  try {
    const postId = assertPostId(reqValid<{ id?: unknown }>(c, "param").id);
    if (!postId) throw badRequest("bad_id");

    const clientId = assertClientId(reqValid<{ clientId?: unknown }>(c, "json").clientId);
    if (!clientId) throw badRequest("bad_clientId");

    const out = (await likePost({ postId, clientId })) as BlogLikeResult;
    if (out.ok === false && typeof out.status === "number") {
      return c.json(out, out.status as 404);
    }
    return c.json(out);
  } catch (err) {
    return jsonHttpError(c, err, "blog.like");
  }
}

export async function unlikeBlogPostHandler(c: Context) {
  try {
    const postId = assertPostId(reqValid<{ id?: unknown }>(c, "param").id);
    if (!postId) throw badRequest("bad_id");

    const clientId = assertClientId(reqValid<{ clientId?: unknown }>(c, "json").clientId);
    if (!clientId) throw badRequest("bad_clientId");

    const out = (await unlikePost({ postId, clientId })) as BlogLikeResult;
    if (out.ok === false && typeof out.status === "number") {
      return c.json(out, out.status as 404);
    }
    return c.json(out);
  } catch (err) {
    return jsonHttpError(c, err, "blog.unlike");
  }
}

export async function listBlogPostsHandler(c: Context) {
  try {
    const { limit = 200 } = reqValid<{ limit?: number }>(c, "query");
    const items = await listPosts({ limit });
    return c.json({ ok: true, items });
  } catch (err) {
    return jsonHttpError(c, err, "blog.list");
  }
}

export async function createBlogPostHandler(c: Context) {
  try {
    const body = reqValid<Record<string, unknown>>(c, "json");
    const rawUrl = body.imageUrl ?? body.image;
    const imageUrl = assertStorageImageUrl(rawUrl);
    if (!imageUrl) throw badRequest("bad_image_url");

    const out = await createPost({
      imageUrl,
      texts: safeTexts(body.texts),
      triggeredByUid: c.get("user")?.uid,
    });

    triggerAdminDashboardSummaryRefresh();
    return c.json({ ok: true, id: out.id, jobId: out.jobId });
  } catch (err) {
    return jsonHttpError(c, err, "blog.create");
  }
}

export async function patchBlogPostHandler(c: Context) {
  try {
    const postId = assertPostId(reqValid<{ id?: unknown }>(c, "param").id);
    if (!postId) throw badRequest("bad_id");

    const body = reqValid<Record<string, unknown>>(c, "json");
    const patch: Record<string, unknown> = {};
    const incomingImageUrl = body.imageUrl ?? body.image;

    if (typeof incomingImageUrl === "string") {
      const imageUrl = assertStorageImageUrl(incomingImageUrl);
      if (!imageUrl) throw badRequest("bad_image_url");
      patch.image = imageUrl;
    }

    if (body.texts) {
      patch.texts = safeTexts(body.texts);
    }

    if (!Object.keys(patch).length) throw badRequest("no_allowed_fields");

    await updatePost({ postId, patch });
    triggerAdminDashboardSummaryRefresh();
    return c.json({ ok: true });
  } catch (err) {
    return jsonHttpError(c, err, "blog.patch");
  }
}

export async function deleteBlogPostHandler(c: Context) {
  try {
    const postId = assertPostId(reqValid<{ id?: unknown }>(c, "param").id);
    if (!postId) throw badRequest("bad_id");

    await deletePost({ postId });
    triggerAdminDashboardSummaryRefresh();
    return c.json({ ok: true });
  } catch (err) {
    return jsonHttpError(c, err, "blog.delete");
  }
}

export async function uploadBlogImageHandler(c: Context) {
  try {
    const rawImage = reqValid<{ image?: unknown }>(c, "form").image;
    const image = Array.isArray(rawImage) ? rawImage[0] : rawImage;
    if (!(image instanceof File)) throw badRequest("missing_file");

    const file: BlogUploadInputFile = {
      fieldname: "image",
      originalname: image.name,
      mimetype: image.type,
      size: image.size,
      buffer: Buffer.from(await image.arrayBuffer()),
    };

    const out = await uploadBlogImage({ file });
    return c.json(out);
  } catch (err) {
    return jsonHttpError(c, err, "blog.upload");
  }
}

export async function getBlogNotificationJobHandler(c: Context) {
  try {
    const jobId = String(reqValid<{ jobId?: unknown }>(c, "param").jobId || "").trim();
    if (!jobId) throw badRequest("bad_jobId");

    const snap = await firestore.collection("emailJobs").doc(jobId).get();
    if (!snap.exists) throw notFound("not_found");

    const job = snap.data();
    if (job?.type !== "blog-notification") {
      throw forbidden("forbidden");
    }

    return c.json({ ok: true, job });
  } catch (err) {
    return jsonHttpError(c, err, "blog.job.get");
  }
}

export async function listBlogNotificationDeliveriesHandler(c: Context) {
  try {
    const jobId = String(reqValid<{ jobId?: unknown }>(c, "param").jobId || "").trim();
    if (!jobId) throw badRequest("bad_jobId");
    const { limit = 400 } = reqValid<{ limit?: number }>(c, "query");

    const jobSnap = await firestore.collection("emailJobs").doc(jobId).get();
    if (!jobSnap.exists) throw notFound("not_found");

    const job = jobSnap.data();
    if (job?.type !== "blog-notification") {
      throw forbidden("forbidden");
    }

    const snap = await firestore
      .collection("emailJobs")
      .doc(jobId)
      .collection("deliveries")
      .orderBy("sentAt", "desc")
      .limit(limit)
      .get();

    const items = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    return c.json({ ok: true, items });
  } catch (err) {
    return jsonHttpError(c, err, "blog.job.deliveries");
  }
}

