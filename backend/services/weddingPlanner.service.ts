// backend/services/weddingPlanner.service.ts
import { admin, firestore } from "../lib/firebase.js";
import { badRequest, notFound } from "../utils/httpErrors.js";
import type { UserLike } from "../types/expressLike.js";

const OPENAI_MODEL = String(
  process.env.OPENAI_PLANNER_MODEL || "gpt-5-mini",
).trim();

const tasksCol = () => firestore.collection("weddingPlannerTasks");

type PlannerPriority = "urgent" | "high" | "medium" | "low";
type PlannerSource = "manual" | "ai";

interface PlannerTaskInput {
  title?: unknown;
  notes?: unknown;
  location?: unknown;
  date?: unknown;
  time?: unknown;
  durationMin?: unknown;
  questionsToAsk?: unknown;
  priority?: unknown;
}

interface PlannerTaskPayload {
  title: string;
  notes: string;
  location: string;
  date: string | null;
  time: string | null;
  durationMin: number;
  priority: PlannerPriority;
  questionsToAsk: string[];
}

type PlannerTaskWritePatch = Record<string, unknown> & {
  title?: string;
  notes?: string;
  location?: string;
  dueDate?: string | null;
  dueTime?: string | null;
  dueAt?: FirebaseFirestore.Timestamp | null;
  priority?: PlannerPriority;
  questionsToAsk?: string[];
  isDone?: boolean;
  source?: PlannerSource;
  order?: number;
  updatedAt?: FirebaseFirestore.FieldValue;
};

interface PlannerClientTask {
  id: string;
  title: string;
  notes: string;
  location: string;
  dueDate: string | null;
  dueTime: string | null;
  priority: PlannerPriority;
  questionsToAsk: string[];
  isDone: boolean;
  source: PlannerSource;
  order: number;
  dueAt: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

interface OpenAITextPart {
  text?: string;
}

interface OpenAIOutputChunk {
  content?: OpenAITextPart[];
}

interface OpenAIResponsePayload {
  output_text?: string;
  output?: OpenAIOutputChunk[];
  error?: { message?: string };
  message?: string;
}

interface PlannerGeneratedPlan {
  model: string;
  summary: string;
  tasks: PlannerTaskPayload[];
  followUpQuestions: string[];
  generatedAt: string;
}

interface ParsedPlan {
  summary?: unknown;
  tasks?: unknown;
  followUpQuestions?: unknown;
}

interface SanitizedTaskPayloadOptions {
  partial?: boolean;
}

async function getMaxOrder(): Promise<number> {
  const snap = await tasksCol().orderBy("order", "asc").limitToLast(1).get();
  if (snap.empty) return -100;
  return Number(snap.docs.at(-1)?.data()?.order ?? -100);
}

function normalizePriority(value: unknown): PlannerPriority {
  const raw = String(value || "").toLowerCase();
  if (["urgent", "high", "medium", "low"].includes(raw)) {
    return raw as PlannerPriority;
  }
  return "medium";
}

function cleanTask(input: PlannerTaskInput = {}): PlannerTaskPayload {
  const title = String(input.title || "").trim().slice(0, 220);
  const notes = String(input.notes || "").trim().slice(0, 240);
  const location = String(input.location || "").trim().slice(0, 220);
  const date = String(input.date || "").trim();
  const time = String(input.time || "").trim();
  const durationMin = Number(input.durationMin);
  const questionsToAsk = Array.isArray(input.questionsToAsk)
    ? input.questionsToAsk
        .map((x) => String(x || "").trim())
        .filter(Boolean)
        .slice(0, 8)
    : [];

  return {
    title,
    notes,
    location,
    date: /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : null,
    time: /^\d{2}:\d{2}$/.test(time) ? time : null,
    durationMin:
      Number.isFinite(durationMin) && durationMin > 0
        ? Math.min(720, Math.round(durationMin))
        : 30,
    priority: normalizePriority(input.priority),
    questionsToAsk,
  };
}

function hasLeadingEmoji(text: unknown): boolean {
  return /^\s*(?:\p{Extended_Pictographic}|[\u2600-\u27BF])/u.test(
    String(text || ""),
  );
}

function emojiForPriority(priority: unknown): string {
  const p = normalizePriority(priority);
  if (p === "urgent") return "🚨";
  if (p === "high") return "🔥";
  if (p === "low") return "📝";
  return "📌";
}

function ensureLeadingEmoji(task: PlannerTaskPayload): PlannerTaskPayload {
  const title = String(task.title || "").trim();
  if (!title) return task;
  if (hasLeadingEmoji(title)) return task;
  return {
    ...task,
    title: `${emojiForPriority(task.priority)} ${title}`,
  };
}

function extractOutputText(payload: OpenAIResponsePayload): string {
  if (typeof payload?.output_text === "string" && payload.output_text.trim()) {
    return payload.output_text.trim();
  }

  const chunks = Array.isArray(payload?.output) ? payload.output : [];
  const texts: string[] = [];
  for (const chunk of chunks) {
    const content = Array.isArray(chunk?.content) ? chunk.content : [];
    for (const part of content) {
      if (typeof part?.text === "string" && part.text.trim()) {
        texts.push(part.text.trim());
      }
    }
  }
  return texts.join("\n").trim();
}

function parsePlanJson(rawText: string): ParsedPlan {
  try {
    return JSON.parse(rawText);
  } catch {
    const start = rawText.indexOf("{");
    const end = rawText.lastIndexOf("}");
    if (start >= 0 && end > start) {
      return JSON.parse(rawText.slice(start, end + 1));
    }
    throw new Error("invalid_json_output");
  }
}

function normalizeDate(value: unknown): string | null {
  const s = String(value || "").trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : null;
}

function normalizeTime(value: unknown): string | null {
  const s = String(value || "").trim();
  return /^\d{2}:\d{2}$/.test(s) ? s : null;
}

function normalizeSource(value: unknown): PlannerSource {
  const s = String(value || "").trim().toLowerCase();
  if (s === "manual" || s === "ai") return s;
  return "manual";
}

function computeDueAt(
  dueDate: string | null,
  dueTime: string | null,
): FirebaseFirestore.Timestamp | null {
  if (!dueDate) return null;
  const hhmm = dueTime || "09:00";
  const iso = `${dueDate}T${hhmm}:00`;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return admin.firestore.Timestamp.fromDate(d);
}

function sanitizeTaskPayload(
  input: Record<string, unknown> = {},
  { partial = false }: SanitizedTaskPayloadOptions = {},
): PlannerTaskWritePatch {
  const out: PlannerTaskWritePatch = {};

  if (!partial || Object.prototype.hasOwnProperty.call(input, "title")) {
    out.title = String(input.title || "").trim().slice(0, 220);
    if (!out.title) {
      throw badRequest("validation_error", { field: "title", reason: "empty" });
    }
  }

  if (!partial || Object.prototype.hasOwnProperty.call(input, "notes")) {
    out.notes = String(input.notes || "").trim().slice(0, 3000);
  }

  if (!partial || Object.prototype.hasOwnProperty.call(input, "location")) {
    out.location = String(input.location || "").trim().slice(0, 220);
  }

  const hasDate = Object.prototype.hasOwnProperty.call(input, "dueDate");
  const hasTime = Object.prototype.hasOwnProperty.call(input, "dueTime");
  if (!partial || hasDate || hasTime) {
    const date = hasDate ? normalizeDate(input.dueDate) : null;
    const time = hasTime ? normalizeTime(input.dueTime) : null;

    if (!partial || hasDate) out.dueDate = date;
    if (!partial || hasTime) out.dueTime = time;

    const baseDate = hasDate ? date : out.dueDate;
    const baseTime = hasTime ? time : out.dueTime;
    if (!partial || hasDate || hasTime) {
      out.dueAt = computeDueAt(baseDate || null, baseTime || null);
    }
  }

  if (!partial || Object.prototype.hasOwnProperty.call(input, "priority")) {
    out.priority = normalizePriority(input.priority);
  }

  if (
    !partial ||
    Object.prototype.hasOwnProperty.call(input, "questionsToAsk")
  ) {
    out.questionsToAsk = Array.isArray(input.questionsToAsk)
      ? input.questionsToAsk
          .map((x) => String(x || "").trim())
          .filter(Boolean)
          .slice(0, 8)
      : [];
  }

  if (!partial || Object.prototype.hasOwnProperty.call(input, "isDone")) {
    out.isDone = Boolean(input.isDone);
  }

  if (!partial || Object.prototype.hasOwnProperty.call(input, "source")) {
    out.source = normalizeSource(input.source);
  }

  if (!partial || Object.prototype.hasOwnProperty.call(input, "order")) {
    const o = Number(input.order);
    out.order = Number.isFinite(o) ? Math.max(0, Math.round(o)) : 0;
  }

  return out;
}

function tsToIso(ts: unknown): string | null {
  if (!ts) return null;
  try {
    const candidate = ts as { toDate?: () => Date };
    if (typeof candidate.toDate === "function") {
      return candidate.toDate().toISOString();
    }
  } catch {}
  return null;
}

function taskToClient(id: string, data: Record<string, unknown> = {}): PlannerClientTask {
  return {
    id,
    title: String(data.title || ""),
    notes: String(data.notes || ""),
    location: String(data.location || ""),
    dueDate: typeof data.dueDate === "string" ? data.dueDate : null,
    dueTime: typeof data.dueTime === "string" ? data.dueTime : null,
    priority: normalizePriority(data.priority),
    questionsToAsk: Array.isArray(data.questionsToAsk) ? data.questionsToAsk : [],
    isDone: Boolean(data.isDone),
    source: normalizeSource(data.source),
    order: Number.isFinite(Number(data.order)) ? Number(data.order) : 0,
    dueAt: tsToIso(data.dueAt),
    createdAt: tsToIso(data.createdAt),
    updatedAt: tsToIso(data.updatedAt),
  };
}

function sortTasks(items: PlannerClientTask[] = []): PlannerClientTask[] {
  return [...items].sort((a, b) => {
    if (a.isDone !== b.isDone) return a.isDone ? 1 : -1;
    const aOrder = Number.isFinite(Number(a.order)) ? Number(a.order) : 0;
    const bOrder = Number.isFinite(Number(b.order)) ? Number(b.order) : 0;
    if (aOrder !== bOrder) return aOrder - bOrder;
    const aDue = a.dueAt ? new Date(a.dueAt).getTime() : Number.POSITIVE_INFINITY;
    const bDue = b.dueAt ? new Date(b.dueAt).getTime() : Number.POSITIVE_INFINITY;
    if (aDue !== bDue) return aDue - bDue;
    const aCreated = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const bCreated = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return bCreated - aCreated;
  });
}

export async function generateWeddingPlannerSuggestions({
  prompt,
  locale = "fr",
  timezone = "Europe/Paris",
  weddingDate = "",
}: {
  prompt: unknown;
  locale?: string | undefined;
  timezone?: string | undefined;
  weddingDate?: string | undefined;
}): Promise<PlannerGeneratedPlan> {
  const apiKey = String(process.env.OPENAI_API_KEY || "").trim();
  if (!apiKey) {
    throw badRequest("openai_not_configured", {
      env: "OPENAI_API_KEY",
    });
  }

  const userPrompt = String(prompt || "").trim();
  if (!userPrompt) {
    throw badRequest("validation_error", { field: "prompt", reason: "empty" });
  }

  if (userPrompt.length < 12) {
    throw badRequest("validation_error", { field: "prompt", reason: "too_short" });
  }

  const nowIso = new Date().toISOString();
  const lang = String(locale || "fr").slice(0, 5);
  const tz = String(timezone || "Europe/Paris").slice(0, 80);
  const weddingDateClean = String(weddingDate || "").slice(0, 20);

  const system = [
    "You are an expert wedding planning assistant.",
    "Convert a free-text request into a practical checklist before wedding day.",
    "Return ONLY valid JSON with this exact shape:",
    '{ "summary": string, "tasks": [{ "title": string, "notes": string, "location": string | null, "date": "YYYY-MM-DD" | null, "time": "HH:mm" | null, "durationMin": number, "priority": "low" | "medium" | "high" | "urgent", "questionsToAsk": string[] }], "followUpQuestions": string[] }',
    "Rules:",
    "- Resolve relative dates like next Monday using provided now/timezone.",
    "- If date or time is not explicit, keep null.",
    "- Keep tasks short and action oriented.",
    "- Start each task title with one relevant emoji that summarizes the task.",
    "- For a simple request, return 1 or 2 tasks only.",
    "- Maximum 3 tasks.",
    "- Each notes field should be one short sentence (max 20 words).",
    "- Do not include markdown.",
  ].join("\n");

  const user = [
    `Language: ${lang}`,
    `Timezone: ${tz}`,
    `Now: ${nowIso}`,
    `Event date (optional): ${weddingDateClean || "unknown"}`,
    `User input: ${userPrompt}`,
  ].join("\n");

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      input: [
        { role: "system", content: [{ type: "input_text", text: system }] },
        { role: "user", content: [{ type: "input_text", text: user }] },
      ],
    }),
  });

  const raw = (await response.json().catch(() => null)) as
    | OpenAIResponsePayload
    | null;
  if (!response.ok) {
    const status = response.status;
    const msg =
      raw?.error?.message ||
      raw?.message ||
      `openai_http_error_${status}`;
    throw badRequest("planner_generation_failed", { status, message: msg });
  }

  const rawText = extractOutputText(raw || {});
  if (!rawText) {
    throw badRequest("planner_generation_failed", { reason: "empty_output" });
  }

  const parsed = parsePlanJson(rawText);
  const tasks = Array.isArray(parsed?.tasks)
    ? parsed.tasks
        .map(cleanTask)
        .map(ensureLeadingEmoji)
        .filter((x) => !!x.title)
        .slice(0, 3)
    : [];
  const followUpQuestions = Array.isArray(parsed?.followUpQuestions)
    ? parsed.followUpQuestions
        .map((x) => String(x || "").trim())
        .filter(Boolean)
        .slice(0, 5)
    : [];

  return {
    model: OPENAI_MODEL,
    summary: String(parsed?.summary || "").trim(),
    tasks,
    followUpQuestions,
    generatedAt: new Date().toISOString(),
  };
}

export async function listWeddingPlannerTasks(): Promise<PlannerClientTask[]> {
  const snap = await tasksCol().limit(500).get();
  const items = snap.docs.map((d) => taskToClient(d.id, d.data() || {}));
  return sortTasks(items);
}

export async function createWeddingPlannerTask(
  payload: Record<string, unknown>,
  user?: UserLike,
): Promise<PlannerClientTask> {
  const clean = sanitizeTaskPayload(payload || {}, { partial: false });
  const now = admin.firestore.FieldValue.serverTimestamp();
  const nextOrder = await getMaxOrder();
  const ref = tasksCol().doc();

  await ref.set({
    ...clean,
    order: nextOrder + 100,
    createdByUid: user?.uid || null,
    createdByEmail: user?.email || null,
    createdAt: now,
    updatedAt: now,
  });

  const snap = await ref.get();
  return taskToClient(ref.id, snap.data() || {});
}

export async function createWeddingPlannerTasksBulk(
  payload: Record<string, unknown>,
  user?: UserLike,
): Promise<{ created: PlannerClientTask[] }> {
  const tasks = Array.isArray(payload?.tasks) ? payload.tasks : [];
  if (!tasks.length) return { created: [] };

  const batch = firestore.batch();
  const now = admin.firestore.FieldValue.serverTimestamp();
  const refs: FirebaseFirestore.DocumentReference[] = [];
  let cursor = await getMaxOrder();

  tasks.slice(0, 50).forEach((item) => {
    const clean = sanitizeTaskPayload(item || {}, { partial: false });
    const ref = tasksCol().doc();
    refs.push(ref);
    cursor += 100;
    batch.set(ref, {
      ...clean,
      order: cursor,
      createdByUid: user?.uid || null,
      createdByEmail: user?.email || null,
      createdAt: now,
      updatedAt: now,
    });
  });

  await batch.commit();
  const createdSnaps = await Promise.all(refs.map((r) => r.get()));
  return {
    created: createdSnaps.map((d) => taskToClient(d.id, d.data() || {})),
  };
}

export async function patchWeddingPlannerTask(
  id: string,
  patch: Record<string, unknown>,
): Promise<PlannerClientTask> {
  if (!id) throw badRequest("validation_error", { field: "id" });

  const ref = tasksCol().doc(id);
  const snap = await ref.get();
  if (!snap.exists) throw notFound("not_found", { id });

  const prev = (snap.data() || {}) as Record<string, unknown>;
  const cleanPatch = sanitizeTaskPayload(patch || {}, { partial: true });

  const mergedDate = Object.prototype.hasOwnProperty.call(cleanPatch, "dueDate")
    ? cleanPatch.dueDate
    : prev.dueDate || null;
  const mergedTime = Object.prototype.hasOwnProperty.call(cleanPatch, "dueTime")
    ? cleanPatch.dueTime
    : prev.dueTime || null;

  if (
    Object.prototype.hasOwnProperty.call(cleanPatch, "dueDate") ||
    Object.prototype.hasOwnProperty.call(cleanPatch, "dueTime")
  ) {
    cleanPatch.dueAt = computeDueAt(
      typeof mergedDate === "string" ? mergedDate : null,
      typeof mergedTime === "string" ? mergedTime : null,
    );
  }

  cleanPatch.updatedAt = admin.firestore.FieldValue.serverTimestamp();
  await ref.set(cleanPatch, { merge: true });

  const updated = await ref.get();
  return taskToClient(updated.id, updated.data() || {});
}

export async function deleteWeddingPlannerTask(id: string): Promise<void> {
  if (!id) throw badRequest("validation_error", { field: "id" });
  await tasksCol().doc(id).delete();
}

export async function reorderWeddingPlannerTasks(
  { orderedIds = [] }: { orderedIds?: unknown[] } = {},
): Promise<void> {
  const ids = Array.isArray(orderedIds)
    ? orderedIds.map((x) => String(x || "").trim()).filter(Boolean)
    : [];
  if (!ids.length) return;

  const batch = firestore.batch();
  const now = admin.firestore.FieldValue.serverTimestamp();
  ids.forEach((id, idx) => {
    const ref = tasksCol().doc(id);
    batch.set(
      ref,
      {
        order: idx * 100,
        updatedAt: now,
      },
      { merge: true },
    );
  });
  await batch.commit();
}
