// backend/services/blogNotification.service.ts
import { firestore, admin } from "../lib/firebase.js";
import { triggerAdminDashboardSummaryRefresh } from "./adminDashboardSummary.service.js";
import pLimit from "p-limit";
import { randomUUID, createHash } from "crypto";
import { sendEmail } from "./email.service.js";
import { buildBlogNotificationEmail } from "../emails/templates/blogNotification.js";
import {
  acquireLock,
  releaseLock,
  renewLock,
  LOCK_TTL_MS,
} from "./emailLocks.service.js";
import { resolveRecipients } from "./guestDirectory.service.js";

const FV = admin.firestore.FieldValue;

const JOBS_COLLECTION = "emailJobs";
const BLOG_LOCK_DOC = firestore.collection("emailLocks").doc("blogSend");
const EMAIL_META_DOC = firestore.collection("emailMeta").doc("main");

const SMTP_CONCURRENCY = Number(process.env.SMTP_CONCURRENCY || 5);

type Recipient = {
  email: string;
  name: string;
  preferredLang: "es" | "en";
};

type DeliveryStatus = "ok" | "ko";

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function errMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err ?? "");
}

function safeEmail(v: unknown): string {
  const s = String(v || "")
    .trim()
    .toLowerCase();
  if (!s) return "";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)) return "";
  if (s.endsWith("@example.com")) return "";
  return s;
}

function normalizeRecipient(inv: unknown): Recipient | null {
  if (!isRecord(inv)) return null;
  const email = safeEmail(inv.email || inv.to);
  if (!email) return null;
  const name = String(inv.name || "").trim() || "Invitado";
  const preferredLang =
    String(inv.preferredLang || "")
      .trim()
      .toLowerCase() === "en"
      ? "en"
      : "es";
  return { email, name, preferredLang };
}

function jobDoc(jobId: string) {
  return firestore.collection(JOBS_COLLECTION).doc(jobId);
}

async function createJob(jobId: string, payload: Record<string, unknown>) {
  await jobDoc(jobId).set({
    id: jobId,
    createdAt: FV.serverTimestamp(),
    updatedAt: FV.serverTimestamp(),
    startedAt: null,
    finishedAt: null,
    status: "queued",
    ok: 0,
    ko: 0,
    lastError: null,
    ...payload,
  });
}

async function updateJob(jobId: string, patch: Record<string, unknown>) {
  await jobDoc(jobId).set(
    { ...patch, updatedAt: FV.serverTimestamp() },
    { merge: true },
  );
}

function deliveryDoc(jobId: string, email: string) {
  const id = createHash("sha256").update(String(email)).digest("hex");
  return firestore
    .collection(JOBS_COLLECTION)
    .doc(jobId)
    .collection("deliveries")
    .doc(id);
}

async function writeDelivery({
  jobId,
  recipient,
  status,
  error,
  meta,
}: {
  jobId: string;
  recipient: unknown;
  status: DeliveryStatus;
  error?: string | null;
  meta?: Record<string, unknown>;
}) {
  const r = normalizeRecipient(recipient);
  if (!r) return;

  await deliveryDoc(jobId, r.email).set(
    {
      to: r.email,
      name: r.name,
      status, // ok | ko
      error: error || null,
      sentAt: FV.serverTimestamp(),
      ...(meta || {}),
    },
    { merge: true },
  );
}

async function collectRecipients({
  mode = "ONLY_ATTENDING",
}: {
  mode?: string;
} = {}): Promise<unknown[]> {
  const m = String(mode || "ONLY_ATTENDING")
    .trim()
    .toUpperCase();
  const resolved = await resolveRecipients({ mode: m });
  return Array.isArray(resolved) ? resolved : [];
}

/**
 * Appelée depuis blog.service.js après createPost()
 * -> ne dépend PAS de emails:send, juste le système interne.
 */
export async function queueBlogNotificationJob({
  triggeredByUid,
}: {
  triggeredByUid?: string | null;
}) {
  const jobId = randomUUID();
  const uid = triggeredByUid || null;
  let launched = false;

  await acquireLock({ lockRef: BLOG_LOCK_DOC, jobId, uid });

  try {
    const recipients = await collectRecipients({ mode: "ONLY_ATTENDING" });

    if (!recipients.length) {
      await createJob(jobId, {
        type: "blog-notification",
        subject: "🗞️ Nueva publicación en el blog",
        total: 0,
        createdBy: uid,
        status: "skipped",
        finishedAt: FV.serverTimestamp(),
        lastError: "no_recipients",
      });
      await releaseLock({ lockRef: BLOG_LOCK_DOC, jobId });
      return { jobId, total: 0 };
    }

    let rawSiteUrl = process.env.SITE_URL || "https://www.gpl2026.com";
    if (!/^https?:\/\//i.test(rawSiteUrl)) rawSiteUrl = "https://" + rawSiteUrl;
    const siteUrl = rawSiteUrl.replace(/\/+$/, "");
    const blogUrl = `${siteUrl}/blog`;
    const passwordHint = process.env.SECURE_PASSWORD || "";

    const preview = buildBlogNotificationEmail({
      guestName: "Invitado",
      blogUrl,
      siteUrl,
      passwordHint,
      preferredLang: "es",
    });

    await createJob(jobId, {
      type: "blog-notification",
      subject: preview.subject,
      total: recipients.length,
      createdBy: uid,
      campaign: {
        subject: preview.subject,
        // IMPORTANT: idéalement ton UI affiche le vrai HTML envoyé (avec layout)
        // donc soit tu stockes "innerHtml" + tu le wrap côté UI, soit tu stockes "previewHtml" layouté.
        previewInnerHtml: preview.innerHtml,
      },
    });

    runBlogNotificationJob({
      jobId,
      uid,
      recipients,
      blogUrl,
      siteUrl,
      passwordHint,
    }).catch((err: unknown) =>
      console.error("[blogNotificationJob] fatal", err),
    );
    launched = true;

    return { jobId, total: recipients.length };
  } catch (e) {
    if (!launched) {
      await releaseLock({ lockRef: BLOG_LOCK_DOC, jobId });
    }
    throw e;
  }
}

async function runBlogNotificationJob({
  jobId,
  uid,
  recipients,
  blogUrl,
  siteUrl,
  passwordHint,
}: {
  jobId: string;
  uid: string | null;
  recipients: unknown[];
  blogUrl: string;
  siteUrl: string;
  passwordHint: string;
}) {
  const renewEveryMs = Math.max(15_000, Math.floor(LOCK_TTL_MS / 3));
  const lockHeartbeat = setInterval(() => {
    renewLock({ lockRef: BLOG_LOCK_DOC, jobId, uid }).catch(() => {});
  }, renewEveryMs);

  if (typeof lockHeartbeat.unref === "function") {
    lockHeartbeat.unref();
  }

  try {
    await updateJob(jobId, {
      status: "running",
      startedAt: FV.serverTimestamp(),
      lastError: null,
    });

    const limit = pLimit(SMTP_CONCURRENCY);

    const tasks = recipients.map((inv) =>
      limit(async () => {
        const r = normalizeRecipient(inv);
        if (!r) return;

        try {
          const { subject, innerHtml } = buildBlogNotificationEmail({
            guestName: r.name,
            blogUrl,
            siteUrl,
            passwordHint,
            preferredLang: r.preferredLang,
          });

          await sendEmail({
            to: r.email,
            subject,
            innerHtml,
          });

          await updateJob(jobId, { ok: FV.increment(1) });
          await writeDelivery({
            jobId,
            recipient: r,
            status: "ok",
            meta: { campaign: "blog-notification" },
          });
        } catch (err: unknown) {
          const msg = errMessage(err);
          await updateJob(jobId, { ko: FV.increment(1), lastError: msg });
          await writeDelivery({
            jobId,
            recipient: r,
            status: "ko",
            error: msg,
            meta: { campaign: "blog-notification" },
          });
        }
      })
    );

    await Promise.allSettled(tasks);

    await updateJob(jobId, {
      status: "done",
      finishedAt: FV.serverTimestamp(),
    });

    // meta
    try {
      const snap = await jobDoc(jobId).get();
      const final = snap.exists ? snap.data() : {};
      await EMAIL_META_DOC.set(
        {
          lastBlogEmailAt: FV.serverTimestamp(),
          lastBlogEmailOk: Number(final?.ok || 0),
          lastBlogEmailKo: Number(final?.ko || 0),
          lastBlogEmailBy: uid || null,
        },
        { merge: true }
      );
      triggerAdminDashboardSummaryRefresh();
    } catch (err: unknown) {
      console.error("[emailMeta blog] update failed", err);
    }
  } catch (e: unknown) {
    // optionnel mais recommandé: si le job plante "globalement"
    await updateJob(jobId, {
      status: "error",
      finishedAt: FV.serverTimestamp(),
      lastError: errMessage(e),
    }).catch(() => {});
  } finally {
    clearInterval(lockHeartbeat);
    await releaseLock({ lockRef: BLOG_LOCK_DOC, jobId });
  }
}
