// src/stores/emailStore.js
import { defineStore } from "pinia";
import { api } from "@/services/api";
import { ensureFirebase, doc, onSnapshot } from "@/services/firebaseClient";
import type { DocumentData, Unsubscribe } from "firebase/firestore";

const STORAGE_JOB_ID_KEY = "emailJobId";
const POLL_MS = 2000;

type EmailJob = {
  id: string;
  status: string;
  total: number;
  ok: number;
  ko: number;
  lastError: unknown;
  createdAt: unknown;
  startedAt: unknown;
  finishedAt: unknown;
  updatedAt: unknown;
  type: string | null;
  mode: string | null;
  subject: string | null;
  createdBy: string | null;
};

type EmailState = {
  lastMassEmailAt: Date | null;
  lastMassEmailSubject: string;
  lastMassEmailRecipientsCount: number;
  lastMassEmailOkCount: number;
  lastMassEmailErrorCount: number;
  lastBlogEmailAt: Date | null;
  lastBlogEmailOk: number;
  lastBlogEmailKo: number;
  _unsubMeta: Unsubscribe | null;
  _metaLoaded: boolean;
  jobId: string;
  job: EmailJob | null;
  _pollTimer: ReturnType<typeof setInterval> | null;
  sending: boolean;
  lockedUntil: number | null;
  lockedJobId: string;
  lastSendWasLocked: boolean;
};

type SendCallbacks = {
  onDone?: ((job: EmailJob | null) => void) | undefined;
  onError?: ((job: EmailJob | null) => void) | undefined;
};

type SendEmailBlastInput = SendCallbacks & {
  subject?: string;
  html?: string;
  mode?: string;
  recipients?: string[];
  expectedTotal?: number;
};

type SendTestEmailInput = {
  subject?: string;
  html?: string;
  testEmail?: string;
};

type ApiErrorLike = {
  error?: string;
  code?: string;
  message?: string;
  data?: { meta?: { lockedUntil?: number; lockedJobId?: string } };
  lockedUntil?: number;
  lockedJobId?: string;
};

function safeString(v: unknown): string {
  return String(v ?? "").trim();
}

function normalizeJob(j: unknown): EmailJob | null {
  if (!j) return null;
  const row = j as Record<string, unknown>;
  return {
    id: String(row.id || row.jobId || ""),
    status: String(row.status || "queued"),
    total: Number(row.total || 0),
    ok: Number(row.ok || 0),
    ko: Number(row.ko || 0),
    lastError: row.lastError || null,
    createdAt: row.createdAt || null,
    startedAt: row.startedAt || null,
    finishedAt: row.finishedAt || null,
    updatedAt: row.updatedAt || null,
    type: row.type ? String(row.type) : null,
    mode: row.mode ? String(row.mode) : null,
    subject: row.subject ? String(row.subject) : null,
    createdBy: row.createdBy ? String(row.createdBy) : null,
  };
}

function toDateMaybe(ts: unknown): Date | null {
  if (!ts) return null;
  if (typeof ts === "object" && ts !== null && typeof (ts as { toDate?: unknown }).toDate === "function") {
    return (ts as { toDate: () => Date }).toDate();
  }

  // Timestamp JSON (Firestore via API): { _seconds, _nanoseconds }
  if (typeof ts === "object") {
    const row = ts as { _seconds?: number; seconds?: number; _nanoseconds?: number; nanoseconds?: number };
    const secs = row._seconds ?? row.seconds ?? null;
    const nanos = row._nanoseconds ?? row.nanoseconds ?? 0;
    if (typeof secs === "number") {
      const d = new Date(secs * 1000 + Math.floor(Number(nanos || 0) / 1e6));
      return Number.isNaN(d.getTime()) ? null : d;
    }
  }

  if (typeof ts === "string" || typeof ts === "number") {
    const d = new Date(ts);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  return null;
}

export const useEmailStore = defineStore("email", {
  state: (): EmailState => ({
    // Firestore meta
    lastMassEmailAt: null, // Date | null
    lastMassEmailSubject: "",
    lastMassEmailRecipientsCount: 0,
    lastMassEmailOkCount: 0,
    lastMassEmailErrorCount: 0,

    lastBlogEmailAt: null, // Date | null
    lastBlogEmailOk: 0,
    lastBlogEmailKo: 0,

    _unsubMeta: null,
    _metaLoaded: false,

    // Job (backend polling)
    jobId: localStorage.getItem(STORAGE_JOB_ID_KEY) || "",
    job: null,
    _pollTimer: null,

    // UI-neutral state
    sending: false,

    // Lock (business state)
    lockedUntil: null, // number(ms) | null
    lockedJobId: "", // string
    lastSendWasLocked: false,
  }),

  getters: {
    metaLoaded: (s) => !!s._metaLoaded,
    lastMassEmailAtDate: (s) => s.lastMassEmailAt,

    isJobActive(state) {
      return (
        !!state.job &&
        (state.job.status === "queued" || state.job.status === "running")
      );
    },

    progressPct(state) {
      const j = state.job;
      if (!j || !j.total) return 0;
      const done = (j.ok || 0) + (j.ko || 0);
      return Math.min(100, Math.round((done / j.total) * 100));
    },
  },

  actions: {
    stop() {
      try {
        this._unsubMeta?.();
      } catch {}
      this._unsubMeta = null;
      this._metaLoaded = false;
      this.stopPolling();
    },

    // --------------------
    // META (Firestore realtime)
    // --------------------
    async subscribeMeta() {
      if (this._unsubMeta) return;

      try {
        const { fs } = await ensureFirebase();
        const metaRef = doc(fs, "emailMeta", "main");

        this._unsubMeta = onSnapshot(
          metaRef,
          (snap) => {
            this._metaLoaded = true;

            if (!snap.exists()) {
              this.lastMassEmailAt = null;
              this.lastMassEmailSubject = "";
              this.lastMassEmailRecipientsCount = 0;
              this.lastMassEmailOkCount = 0;
              this.lastMassEmailErrorCount = 0;

              this.lastBlogEmailAt = null;
              this.lastBlogEmailOk = 0;
              this.lastBlogEmailKo = 0;
              return;
            }

            const d = (snap.data() || {}) as DocumentData;

            this.lastMassEmailAt = toDateMaybe(d.lastMassEmailAt);
            this.lastMassEmailSubject = d.lastMassEmailSubject || "";
            this.lastMassEmailRecipientsCount = Number(
              d.lastMassEmailRecipientsCount || 0
            );
            this.lastMassEmailOkCount = Number(d.lastMassEmailOkCount || 0);
            this.lastMassEmailErrorCount = Number(
              d.lastMassEmailErrorCount || 0
            );

            this.lastBlogEmailAt = toDateMaybe(d.lastBlogEmailAt);
            this.lastBlogEmailOk = Number(d.lastBlogEmailOk || 0);
            this.lastBlogEmailKo = Number(d.lastBlogEmailKo || 0);
          },
          (err) => {
            console.error("[emailStore] meta onSnapshot error:", err);
          }
        );
      } catch (e: unknown) {
        console.error("[emailStore] subscribeMeta crash:", e);
      }
    },

    // --------------------
    // JOB polling (backend)
    // --------------------
    startPolling(jobId: string, { onDone, onError }: SendCallbacks = {}) {
      if (!jobId) return;

      this.stopPolling();
      this.jobId = jobId;
      localStorage.setItem(STORAGE_JOB_ID_KEY, jobId);

      this._pollTimer = setInterval(async () => {
        try {
          const out = (await api.getEmailJob(jobId)) as Record<string, unknown>;
          const j = out.job || out;
          this.job = normalizeJob(j);

          if (this.job?.status === "done") {
            localStorage.removeItem(STORAGE_JOB_ID_KEY);
            this.jobId = "";
            this.stopPolling();
            if (typeof onDone === "function") onDone(this.job);
          }

          if (this.job?.status === "error") {
            localStorage.removeItem(STORAGE_JOB_ID_KEY);
            this.jobId = "";
            this.stopPolling();
            if (typeof onError === "function") onError(this.job);
          }
        } catch {
          // silencieux (polling best-effort)
        }
      }, POLL_MS);
    },

    stopPolling() {
      if (this._pollTimer) clearInterval(this._pollTimer);
      this._pollTimer = null;
    },

    resumePollingIfNeeded({ onDone, onError }: SendCallbacks = {}) {
      const id = this.jobId || localStorage.getItem(STORAGE_JOB_ID_KEY) || "";
      if (!id) return;

      if (!this.job) {
        this.job = normalizeJob({ id, status: "queued", total: 0, ok: 0, ko: 0 });
      }

      this.startPolling(id, { onDone, onError });
    },

    // --------------------
    // SEND (backend)
    // --------------------
    async sendEmailBlast({
      subject,
      html,
      mode,
      recipients,
      expectedTotal,
      onDone,
      onError,
    }: SendEmailBlastInput = {}) {
      this.sending = true;

      // reset lock state
      this.lockedUntil = null;
      this.lockedJobId = "";
      this.lastSendWasLocked = false;

      try {
        const cleanSubject = safeString(subject);
        const payload = {
          subject: cleanSubject,
          html: html || "",
          mode,
          recipients: mode === "MANUAL" ? recipients || [] : undefined,
        };

        const data = (await api.sendCustomEmail(payload)) as { jobId?: string };
        const id = data.jobId;
        if (!id) throw new Error("missing_job_id_from_backend");

        this.jobId = id;
        localStorage.setItem(STORAGE_JOB_ID_KEY, id);

        this.job = normalizeJob({
          id,
          status: "queued",
          total: Number(expectedTotal || 0),
          ok: 0,
          ko: 0,
          lastError: null,
          subject: cleanSubject,
          mode,
        });

        // start polling UNE SEULE FOIS, ici
        this.startPolling(id, { onDone, onError });

        return { jobId: id };
      } catch (e: unknown) {
        const err = (e || {}) as ApiErrorLike;
        // backend renvoie: { error: "mass_send_locked", lockedUntil, lockedJobId }
        const code = String(err.error || err.code || err.message || "");

        if (code === "mass_send_locked") {
          const meta = err.data?.meta || {};
          const until =
            Number(meta.lockedUntil || err.lockedUntil || 0) || null;
          const lockedJobId = String(
            meta.lockedJobId || err.lockedJobId || "",
          );

          this.lockedUntil = until;
          this.lockedJobId = lockedJobId;
          this.lastSendWasLocked = true;

          if (lockedJobId) {
            this.jobId = lockedJobId;
            localStorage.setItem(STORAGE_JOB_ID_KEY, lockedJobId);
            this.resumePollingIfNeeded({ onDone, onError });
          }

          return { locked: true, lockedUntil: until, lockedJobId };
        }

        // pas de mapping UI ici
        throw e;
      } finally {
        this.sending = false;
      }
    },

    async sendTestEmail({ subject, html, testEmail }: SendTestEmailInput) {
      this.sending = true;

      try {
        const payload = {
          subject: safeString(subject),
          html: html || "",
          testEmail: safeString(testEmail),
        };

        const data = await api.sendCustomEmail(payload);
        return data || { ok: true };
      } finally {
        this.sending = false;
      }
    },
  },
});

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    try {
      const store = useEmailStore();
      store.stop?.();
    } catch {}
  });
}
