// backend/services/emailCampaigns.service.ts
import { firestore, admin } from "../lib/firebase.js";
import { triggerAdminDashboardSummaryRefresh } from "./adminDashboardSummary.service.js";
// @ts-ignore ambient declaration loaded in backend/types/externals.d.ts
import { htmlToText } from "html-to-text";
import pLimit from "p-limit";
import { randomUUID, createHash } from "crypto";
// @ts-ignore ambient declaration loaded in backend/types/externals.d.ts
import { JSDOM } from "jsdom";
import createDOMPurify from "dompurify";

import weddingConfig from "../../shared/weddingConfig.js";
import { sendEmail } from "./email.service.js";
import { HttpError, badRequest } from "../utils/httpErrors.js";
import {
  acquireLock,
  releaseLock,
  renewLock,
  LOCK_TTL_MS,
} from "./emailLocks.service.js";
import { resolveRecipients } from "./guestDirectory.service.js";

const window = new JSDOM("").window;
const DOMPurify = createDOMPurify(window);

const FV = admin.firestore.FieldValue;

const JOBS_COLLECTION = "emailJobs";
const EMAIL_META_DOC = firestore.collection("emailMeta").doc("main");
const MASS_LOCK_DOC = firestore.collection("emailLocks").doc("massSend");

const SMTP_CONCURRENCY = Math.min(
  20,
  Math.max(1, Number(process.env.SMTP_CONCURRENCY || 5)),
);

const SEND_MODES = new Set<SendMode>(["ONLY_ATTENDING", "ALL_RESPONDED", "MANUAL"]);

// hard limits (anti-abus / anti-fail)
const MAX_SUBJECT_LEN = 200;
const MAX_HTML_LEN = 60_000; // adjust si besoin
const MAX_MANUAL_RECIPIENTS = 500; // adjust si besoin

type SendMode = "ONLY_ATTENDING" | "ALL_RESPONDED" | "MANUAL";

interface ResolvedRecipient {
  email: string;
  name?: string;
}

interface DeliveryRecipient {
  email: string;
  name: string;
}

interface DeliveryWriteInput {
  jobId: string;
  recipient: DeliveryRecipient;
  status: "ok" | "ko";
  error?: string | null;
  meta?: Record<string, unknown>;
}

interface SendCustomEmailTestInput {
  uid?: string | null;
  subject?: string;
  html?: string;
  testEmail?: string;
}

interface CreateCustomEmailJobInput {
  uid?: string | null;
  subject?: string;
  html?: string;
  mode?: unknown;
  recipients?: unknown;
}

interface JobCreationPayload {
  type: string;
  subject: string;
  mode: SendMode;
  total: number;
  createdBy: string | null;
  campaign: {
    subject: string;
    htmlTemplate: string;
    textTemplate: string;
    previewInnerHtml: string;
  };
}

interface RunCustomEmailJobInput {
  jobId: string;
  uid?: string | null;
  subject: string;
  cleanHtml: string;
  textVersion: string;
  emails: ResolvedRecipient[];
}

type JobPatch = Record<string, unknown>;

function safeEmail(v: unknown): string {
  const s = String(v || "")
    .trim()
    .toLowerCase();
  if (!s) return "";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)) return "";
  if (s.endsWith("@example.com")) return "";
  return s;
}

function asErrorMessage(err: unknown): string {
  if (err instanceof Error && err.message) return err.message;
  return String(err);
}

function sanitizeCampaignHtml(html: string): string {
  const clean = DOMPurify.sanitize(String(html || ""), {
    USE_PROFILES: { html: true },
    ALLOWED_TAGS: [
      "p",
      "br",
      "strong",
      "b",
      "em",
      "i",
      "u",
      "a",
      "ul",
      "ol",
      "li",
      "h1",
      "h2",
      "h3",
      "h4",
      "h5",
      "h6",
      "blockquote",
      "span",
      "div",
    ],
    ALLOWED_ATTR: ["href", "target", "rel"],
    ALLOW_DATA_ATTR: false,
    FORBID_TAGS: [
      "script",
      "iframe",
      "object",
      "embed",
      "form",
      "input",
      "button",
      "img",
      "video",
      "audio",
      "svg",
      "math",
    ],
  });

  return clean.replace(/<a\s+([^>]*?)>/gi, (m, attrs) => {
    const hasTargetBlank = /\btarget\s*=\s*["']?_blank["']?/i.test(attrs);
    if (!hasTargetBlank) return `<a ${attrs}>`;

    const hasRel = /\brel\s*=/i.test(attrs);
    if (hasRel) return `<a ${attrs}>`;

    return `<a ${attrs} rel="noopener noreferrer">`;
  });
}

function jobDoc(jobId: string) {
  return firestore.collection(JOBS_COLLECTION).doc(jobId);
}

async function createJob(jobId: string, payload: JobCreationPayload): Promise<void> {
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

async function updateJob(jobId: string, patch: JobPatch): Promise<void> {
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
}: DeliveryWriteInput): Promise<void> {
  const recipientName = String(recipient?.name || "").trim() || "Invitado";

  await deliveryDoc(jobId, recipient.email).set(
    {
      to: recipient.email,
      name: recipientName,
      status,
      error: error || null,
      sentAt: FV.serverTimestamp(),
      ...(meta || {}),
    },
    { merge: true },
  );
}

function safeSiteUrlFromEnv(): string {
  let raw = String(process.env.SITE_URL || "").trim();
  if (!raw) return "";
  if (!/^https?:\/\//i.test(raw)) raw = "https://" + raw;
  raw = raw.replace(/\/+$/, "");
  try {
    const u = new URL(raw);
    if (u.protocol !== "http:" && u.protocol !== "https:") return "";
    return u.toString();
  } catch {
    return "";
  }
}

function buildCustomInner(contentHtml: string): string {
  const { brideFirstName, groomFirstName, initials } = weddingConfig.couple;

  const SITE_URL = safeSiteUrlFromEnv();
  const WEBSITE_PASSWORD_HINT = String(
    process.env.SECURE_PASSWORD || "",
  ).trim();

  const host = (() => {
    try {
      return SITE_URL ? new URL(SITE_URL).hostname : "";
    } catch {
      return "";
    }
  })();

  return `
${contentHtml}

${
  SITE_URL
    ? `<p><a href="${SITE_URL}" target="_blank" rel="noopener noreferrer">🌐 ${host}</a></p>`
    : ""
}
${WEBSITE_PASSWORD_HINT ? `<p>🔐 ${WEBSITE_PASSWORD_HINT}</p>` : ""}
<p>💌 ${brideFirstName} & ${groomFirstName}</p>

${
  SITE_URL
    ? `<p style="text-align:center;margin:24px 0 0 0;">
         <img src="${SITE_URL}/assets/images/img2-1.png" alt="${initials}"
              style="width:40%;max-width:530px;min-width:280px;border:none;" />
       </p>`
    : ""
}
`;
}

function personalize(contentHtml: string, recipientName: string): string {
  return String(contentHtml || "").replace(
    /\{\{\s*name\s*\}\}/gi,
    recipientName || "Invitado",
  );
}

export async function sendCustomEmailTest({
  uid,
  subject,
  html,
  testEmail,
}: SendCustomEmailTestInput): Promise<{ message: string; to: string; by: string | null }> {
  const to = safeEmail(testEmail);
  if (!to) throw badRequest("invalid_test_email");

  const subj = String(subject || "").trim();
  if (!subj) throw badRequest("missing_subject_or_html");
  if (subj.length > MAX_SUBJECT_LEN) throw badRequest("subject_too_long");

  const rawHtml = String(html || "").trim();
  if (!rawHtml) throw badRequest("missing_subject_or_html");
  if (rawHtml.length > MAX_HTML_LEN) throw badRequest("html_too_long");

  const cleanHtml = sanitizeCampaignHtml(rawHtml);
  const inner = buildCustomInner(personalize(cleanHtml, "Invitado"));

  await sendEmail({
    to,
    subject: subj,
    html: undefined,
    innerHtml: inner,
    // optionnel: si tu veux un text basé sur le contenu, pas le layout
    text: htmlToText(cleanHtml, { wordwrap: 80 }),
    replyTo: undefined,
    cc: undefined,
    bcc: undefined,
    headers: { "X-Campaign": "custom-test" },
  });

  return { message: "test_sent", to, by: uid || null };
}

export async function createCustomEmailJob({
  uid,
  subject,
  html,
  mode,
  recipients,
}: CreateCustomEmailJobInput): Promise<{ jobId: string; message: string }> {
  const subj = String(subject || "").trim();
  if (!subj) throw badRequest("missing_subject_or_html");
  if (subj.length > MAX_SUBJECT_LEN) throw badRequest("subject_too_long");

  const rawHtml = String(html || "").trim();
  if (!rawHtml) throw badRequest("missing_subject_or_html");
  if (rawHtml.length > MAX_HTML_LEN) throw badRequest("html_too_long");

  const m = String(mode || "ONLY_ATTENDING").trim() as SendMode;
  if (!SEND_MODES.has(m)) throw badRequest("bad_mode");

  if (m === "MANUAL") {
    const count = Array.isArray(recipients) ? recipients.length : 0;
    if (count > MAX_MANUAL_RECIPIENTS) {
      throw badRequest("too_many_manual_recipients", {
        max: MAX_MANUAL_RECIPIENTS,
        got: count,
      });
    }
  }

  const cleanHtml = sanitizeCampaignHtml(rawHtml);

  const textVersion = htmlToText(cleanHtml, {
    wordwrap: 80,
    selectors: [{ selector: "a", options: { hideLinkHrefIfSameAsText: true } }],
  });

  // --- Recipients resolution (UNIFIÉE via guestDirectory) ---
  const emails = (await resolveRecipients({
    mode: m,
    manualRecipients: recipients, // uniquement utilisé si MANUAL
  })) as ResolvedRecipient[];

  if (!emails.length) throw new HttpError(404, "no_recipients");

  if (m === "MANUAL" && emails.length > MAX_MANUAL_RECIPIENTS) {
    throw badRequest("too_many_manual_recipients", {
      max: MAX_MANUAL_RECIPIENTS,
      got: emails.length,
    });
  }

  const jobId = randomUUID();

  // --- GLOBAL MASS SEND LOCK ---
  try {
    await acquireLock({ lockRef: MASS_LOCK_DOC, jobId, uid });
  } catch (e: unknown) {
    const lockError = e as {
      status?: number;
      lockedUntil?: number | null;
      lockedJobId?: string | null;
    };
    if (lockError?.status === 409) {
      throw new HttpError(409, "mass_send_locked", {
        lockedUntil: lockError.lockedUntil || null,
        lockedJobId: lockError.lockedJobId || null,
      });
    }
    throw e;
  }

  try {
    const previewInner = buildCustomInner(personalize(cleanHtml, "Invitado"));

    await createJob(jobId, {
      type: "custom-email",
      subject: subj,
      mode: m,
      total: emails.length,
      createdBy: uid || null,
      campaign: {
        subject: subj,
        htmlTemplate: cleanHtml,
        textTemplate: textVersion,
        previewInnerHtml: previewInner,
      },
    });

    // async execution
    runCustomEmailJob({
      jobId,
      uid: uid ?? null,
      subject: subj,
      cleanHtml,
      textVersion,
      emails,
    }).catch((err) => console.error("[runCustomEmailJob] fatal:", err));

    return { jobId, message: "job_created" };
  } catch (e: unknown) {
    // ⚠️ si la création du job échoue, on libère le lock
    await releaseLock({ lockRef: MASS_LOCK_DOC, jobId });
    throw e;
  }
}

async function runCustomEmailJob({
  jobId,
  uid,
  subject,
  cleanHtml,
  textVersion,
  emails,
}: RunCustomEmailJobInput): Promise<void> {
  const renewEveryMs = Math.max(15_000, Math.floor(LOCK_TTL_MS / 3));
  const lockHeartbeat = setInterval(() => {
    renewLock({ lockRef: MASS_LOCK_DOC, jobId, uid }).catch(() => {});
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

    const tasks = emails.map((inv) =>
      limit(async () => {
        const recipientName =
          String(inv?.name || "").trim() || "Invitado";
        const recipient = {
          email: inv.email,
          name: recipientName,
        };

        try {
          const inner = buildCustomInner(
            personalize(cleanHtml, recipient.name),
          );

          await sendEmail({
            to: recipient.email,
            subject,
            html: undefined,
            innerHtml: inner,
            text: personalize(textVersion, recipient.name),
            replyTo: undefined,
            cc: undefined,
            bcc: undefined,
            headers: { "X-Campaign": "custom-blast" },
          });

          await updateJob(jobId, { ok: FV.increment(1) });
          await writeDelivery({
            jobId,
            recipient,
            status: "ok",
            meta: { campaign: "custom-blast", subject },
          });
        } catch (err: unknown) {
          const msg = asErrorMessage(err);
          await updateJob(jobId, { ko: FV.increment(1), lastError: msg });
          await writeDelivery({
            jobId,
            recipient,
            status: "ko",
            error: msg,
            meta: { campaign: "custom-blast", subject },
          });
        }
      }),
    );

    await Promise.allSettled(tasks);

    try {
      const snap = await jobDoc(jobId).get();
      const final = (snap.exists ? snap.data() : {}) as Record<string, unknown>;
      await EMAIL_META_DOC.set(
        {
          lastMassEmailAt: FV.serverTimestamp(),
          lastMassEmailSubject: subject,
          lastMassEmailRecipientsCount: emails.length,
          lastMassEmailOkCount: Number(final.ok || 0),
          lastMassEmailErrorCount: Number(final.ko || 0),
          lastMassEmailBy: uid || null,
        },
        { merge: true },
      );
      triggerAdminDashboardSummaryRefresh();
    } catch (e: unknown) {
      console.error("[emailMeta] mass update failed", e);
    }

    await updateJob(jobId, {
      status: "done",
      finishedAt: FV.serverTimestamp(),
    });
  } catch (e: unknown) {
    await updateJob(jobId, {
      status: "error",
      finishedAt: FV.serverTimestamp(),
      lastError: asErrorMessage(e),
    });
  } finally {
    clearInterval(lockHeartbeat);
    await releaseLock({ lockRef: MASS_LOCK_DOC, jobId });
  }
}
