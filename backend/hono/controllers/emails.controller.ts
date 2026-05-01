// backend/hono/controllers/emails.controller.ts
import type { Context } from "hono";
import type {} from "../context.js";
import { createCustomEmailJob, sendCustomEmailTest } from "../../services/emailCampaigns.service.js";
import { listDeliveries, listJobs, readJob } from "../../services/emailJobs.service.js";
import { badRequest, forbidden, HttpError } from "../../utils/httpErrors.js";
import { jsonHttpError } from "../httpErrors.js";

function reqValid<T>(c: Context, target: "json" | "param" | "query"): T {
  return (c.req as { valid: (t: string) => T }).valid(target);
}

export async function sendCustomEmailHandler(c: Context) {
  try {
    const user = c.get("user");
    const body = reqValid<Record<string, unknown>>(c, "json");
    const uid = user?.uid || null;
    const subject = String(body.subject || "").trim();
    const html = String(body.html || "").trim();
    const testEmail = body.testEmail ? String(body.testEmail).trim() : "";
    const mode = String(body.mode || "ONLY_ATTENDING").trim().toUpperCase();
    const recipients = Array.isArray(body.recipients) ? body.recipients : undefined;

    if (!subject || !html) throw badRequest("missing_subject_or_html");

    if (testEmail) {
      const out = await sendCustomEmailTest({ uid, subject, html, testEmail });
      return c.json({ ok: true, ...out });
    }

    const out = await createCustomEmailJob({
      uid,
      subject,
      html,
      mode,
      recipients,
    });
    return c.json({ ok: true, ...out });
  } catch (err) {
    return jsonHttpError(c, err, "send-custom-email");
  }
}

export async function listEmailJobsHandler(c: Context) {
  try {
    const { limit = 30, type = "" } = reqValid<{ limit?: number; type?: string }>(c, "query");
    const items = await listJobs({ limit, type });
    return c.json({ ok: true, items });
  } catch (err) {
    return jsonHttpError(c, err, "email-jobs.list");
  }
}

export async function getEmailJobHandler(c: Context) {
  try {
    const user = c.get("user");
    const jobId = String(c.req.param("jobId") || "").trim();
    if (!jobId) throw badRequest("missing_job_id");
    const job = await readJob(jobId);
    if (!job) throw new HttpError(404, "job_not_found");

    const perms = user?.permissions || [];
    const canReadAll =
      perms.includes("*") || perms.includes("superadmin:all") || perms.includes("emails:read");
    if (!canReadAll) {
      const createdBy = String(job?.createdBy || "").trim();
      if (!createdBy || createdBy !== String(user?.uid || "").trim()) {
        throw forbidden("forbidden");
      }
    }

    return c.json({ ok: true, job });
  } catch (err) {
    return jsonHttpError(c, err, "email-jobs.get");
  }
}

export async function listEmailDeliveriesHandler(c: Context) {
  try {
    const user = c.get("user");
    const jobId = String(c.req.param("jobId") || "").trim();
    if (!jobId) throw badRequest("missing_job_id");
    const { limit = 100 } = reqValid<{ limit?: number }>(c, "query");

    const job = await readJob(jobId);
    if (!job) throw new HttpError(404, "job_not_found");

    const perms = user?.permissions || [];
    const canReadAll =
      perms.includes("*") || perms.includes("superadmin:all") || perms.includes("emails:read");
    if (!canReadAll) {
      const createdBy = String(job?.createdBy || "").trim();
      if (!createdBy || createdBy !== String(user?.uid || "").trim()) {
        throw forbidden("forbidden");
      }
    }

    const items = await listDeliveries({ jobId, limit });
    if (items === null) throw new HttpError(404, "job_not_found");
    return c.json({ ok: true, items });
  } catch (err) {
    return jsonHttpError(c, err, "email-jobs.deliveries");
  }
}
