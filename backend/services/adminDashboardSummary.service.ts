// backend/services/adminDashboardSummary.service.ts
import { admin, firestore } from "../lib/firebase.js";

function safeStr(v: unknown): string {
  return String(v ?? "").trim();
}

function toBool(v: unknown): boolean | null {
  return typeof v === "boolean" ? v : null;
}

function isPrimaryGuest(g: Record<string, unknown> | null | undefined): boolean {
  return g?.role === "PRIMARY" || g?.isPrimary === true || g?.isCouple === true;
}

function timeToMinutes(hhmm: unknown): number | null {
  const m = String(hhmm || "").match(/^(\d{1,2}):(\d{1,2})$/);
  if (!m) return null;
  const hh = Math.max(0, Math.min(23, Number(m[1])));
  const mm = Math.max(0, Math.min(59, Number(m[2])));
  return hh * 60 + mm;
}

function tsToMs(v: unknown): number {
  if (!v) return 0;
  if (typeof v === "object" && typeof (v as { toMillis?: unknown }).toMillis === "function") {
    return (v as { toMillis: () => number }).toMillis();
  }
  if (typeof v === "object") {
    const row = v as { _seconds?: number; seconds?: number; _nanoseconds?: number; nanoseconds?: number };
    const secs = row._seconds ?? row.seconds ?? null;
    const nanos = row._nanoseconds ?? row.nanoseconds ?? 0;
    if (typeof secs === "number") {
      const d = new Date(secs * 1000 + Math.floor(Number(nanos || 0) / 1e6));
      return Number.isNaN(d.getTime()) ? 0 : d.getTime();
    }
  }
  if (typeof v === "string" || typeof v === "number") {
    const d = new Date(v);
    return Number.isNaN(d.getTime()) ? 0 : d.getTime();
  }
  return 0;
}

function htmlToPlainText(html: unknown, maxLen = 180): string {
  const raw = String(html ?? "");
  if (!raw.trim()) return "";
  // Remove script/style blocks then strip tags.
  const noBlocks = raw
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ");
  const stripped = noBlocks.replace(/<[^>]+>/g, " ");
  const decoded = stripped
    // Common HTML entities we see in editor outputs.
    .replace(/&nbsp;|&#160;|&#xA0;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, "\"")
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/\u00a0/g, " ");
  const compact = decoded.replace(/\s+/g, " ").trim();
  if (!compact) return "";
  const lim = Math.max(40, Math.min(600, Number(maxLen || 180)));
  return compact.length > lim ? `${compact.slice(0, lim - 1)}…` : compact;
}

function pickPrimaryGuest(guests: Array<Record<string, unknown>>) {
  return (
    guests.find((x) => x?.role === "PRIMARY") ||
    guests.find((x) => x?.isPrimary === true) ||
    guests[0] ||
    null
  );
}

export async function recomputeAdminDashboardSummary() {
  // ---- LOAD DATA (parallel where possible)
  const [
    guestsSnap,
    rsvpsSnap,
    menusSnap,
    assignmentsSnap,
    tablesSnap,
    expensesSnap,
    metaSnap,
    emailMetaSnap,
    emailJobsSnap,
    blogSnap,
    playlistSnap,
    agendaSnap,
    plannerSnap,
  ] = await Promise.all([
    firestore.collection("guests").get(),
    firestore.collection("rsvps").orderBy("createdAt", "desc").limit(50).get(),
    firestore.collection("menus").get(),
    firestore.collection("menuAssignments").get(),
    firestore.collection("seatingTables").get(),
    firestore.collection("financesExpenses").get(),
    firestore.collection("financesMeta").doc("main").get(),
    firestore.collection("emailMeta").doc("main").get(),
    firestore.collection("emailJobs").orderBy("createdAt", "desc").limit(30).get(),
    firestore.collection("blogPosts").orderBy("createdAt", "desc").limit(1).get(),
    firestore.collection("playlistSongs").get(),
    firestore.collection("agendaItems").get(),
    firestore.collection("weddingPlannerTasks").get(),
  ]);

  // ---- RSVP / GUESTS TOTALS
  let attendingPrimaryCount = 0;
  let plusOneCount = 0;
  let declinedCount = 0;
  let transportCount = 0;
  let dietYesCount = 0;

  const guestsByRsvpId = new Map();
  const allGuestIds = new Set();

  guestsSnap.forEach((doc) => {
    const g = doc.data() || {};
    const guestId = safeStr(g.guestId) || safeStr(doc.id);
    if (guestId) allGuestIds.add(guestId);

    const rsvpId = safeStr(g.rsvpId) || safeStr(g.groupId) || "";
    if (rsvpId) {
      const list = guestsByRsvpId.get(rsvpId) || [];
      list.push({ guestId, ...g });
      guestsByRsvpId.set(rsvpId, list);
    }

    const attending = toBool(g.attending);
    if (attending === false) {
      declinedCount += 1;
      return;
    }
    if (attending !== true) return;

    if (isPrimaryGuest(g)) attendingPrimaryCount += 1;
    else plusOneCount += 1;

    if (g.transport === true) transportCount += 1;

    const dietCodes = Array.isArray(g.dietCodes) ? g.dietCodes : [];
    const dietOtherText = safeStr(g.dietOtherText);
    if (dietCodes.length > 0 || dietOtherText.length > 0) dietYesCount += 1;
  });

  // ---- RSVP last response (most recent non-couple)
  let lastResponse = null;
  for (const doc of rsvpsSnap.docs || []) {
    const v = doc.data() || {};
    const isCouple = doc.id === "couple" || v?.isCoupleGroup === true;
    if (isCouple) continue;

    const rsvpId = doc.id;
    const guests = guestsByRsvpId.get(rsvpId) || [];
    const primary = pickPrimaryGuest(guests);

    const firstName = safeStr(primary?.firstName);
    const lastName = safeStr(primary?.lastName);
    const primaryFullName =
      firstName || lastName ? `${firstName} ${lastName}`.trim() : "—";

    lastResponse = {
      rsvpId,
      primaryFullName,
      guestsCount: guests.length,
      attending:
        typeof primary?.attending === "boolean" ? primary.attending : null,
    };
    break;
  }

  // ---- FINANCES
  let budgetTotal = 0;
  let giftsTotal = 0;
  if (metaSnap.exists) {
    const v = metaSnap.data() || {};
    budgetTotal = Number(v.budgetTotal || 0);
    giftsTotal = Number(v.giftsTotal || 0);
  }

  let spentTotal = 0;
  const recentExpensesRaw: Array<{ label: string; amount: number; createdAtMs: number }> = [];
  expensesSnap.forEach((doc) => {
    const v = doc.data() || {};
    const label = safeStr(v.label);
    const amount = Number(v.amount);
    const createdAtMs = tsToMs(v.createdAt);
    if (Number.isFinite(amount)) spentTotal += amount;
    if (label && Number.isFinite(amount) && amount >= 0) {
      recentExpensesRaw.push({ label, amount, createdAtMs });
    }
  });
  const recentExpenses = recentExpensesRaw
    .slice()
    .sort((a, b) => (b.createdAtMs || 0) - (a.createdAtMs || 0))
    .slice(0, 2);

  const remaining = Math.max(0, budgetTotal - spentTotal);
  const percentUsed = budgetTotal
    ? Math.min(100, Math.round((spentTotal / budgetTotal) * 100))
    : 0;

  // ---- MENUS
  const menuById = new Map();
  let activeMenusCount = 0;
  menusSnap.forEach((doc) => {
    const v = doc.data() || {};
    menuById.set(doc.id, safeStr(v.name) || doc.id);
    if (v?.active !== false) activeMenusCount += 1;
  });

  const menuCounts = new Map();
  let needsReview = 0;
  let totalAssignments = 0;
  assignmentsSnap.forEach((doc) => {
    const a = doc.data() || {};
    const menuId = a.menuId ?? null;
    if (menuId) {
      menuCounts.set(menuId, (menuCounts.get(menuId) || 0) + 1);
      totalAssignments += 1;
    }
    if (safeStr(a.status) === "needs_review") needsReview += 1;
  });

  const topMenus = Array.from(menuCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 2)
    .map(([menuId, count]) => ({
      label: menuById.get(menuId) || String(menuId),
      count,
    }));

  // ---- SEATING
  let totalTables = tablesSnap.size || 0;
  const placedGuestIds = new Set();
  tablesSnap.forEach((doc) => {
    const t = doc.data() || {};
    const ids = Array.isArray(t.guestIds) ? t.guestIds : [];
    ids.forEach((id) => placedGuestIds.add(String(id)));
  });

  const unassignedCount = Math.max(
    0,
    allGuestIds.size - placedGuestIds.size,
  );

  // ---- EMAIL
  const lastMassEmailAt = emailMetaSnap.exists
    ? emailMetaSnap.data()?.lastMassEmailAt || null
    : null;
  const lastMassEmailSubject = emailMetaSnap.exists
    ? safeStr(emailMetaSnap.data()?.lastMassEmailSubject)
    : "";
  let lastMassEmailPreview = "";
  try {
    // No composite index needed: query recent jobs then filter.
    type EmailJobRow = {
      id: string;
      type?: unknown;
      status?: unknown;
      campaign?: unknown;
    } & Record<string, unknown>;

    const recentJobs = emailJobsSnap.docs
      .map((d) => ({ id: d.id, ...(d.data() || {}) } as EmailJobRow))
      .filter((j) => safeStr(j?.type) === "custom-email")
      .filter((j) => safeStr(j?.status) === "done");

    const lastJob = (recentJobs[0] || null) as EmailJobRow | null;
    const campaign =
      lastJob && typeof lastJob.campaign === "object" && lastJob.campaign !== null
        ? (lastJob.campaign as Record<string, unknown>)
        : null;
    const htmlTemplate =
      (campaign ? campaign.htmlTemplate : null) ??
      (campaign ? campaign.previewInnerHtml : null) ??
      "";
    lastMassEmailPreview = htmlToPlainText(htmlTemplate, 180);
  } catch {
    lastMassEmailPreview = "";
  }

  // ---- BLOG
  const lastBlogDoc = blogSnap.docs?.[0];
  const lastPostAt = lastBlogDoc?.data()?.createdAt || null;
  const lastImage = safeStr(lastBlogDoc?.data()?.image);

  // ---- PLAYLIST
  let playlistTotal = 0;
  playlistSnap.forEach((doc) => {
    const v = doc.data() || {};
    if (v?.removed !== true) playlistTotal += 1;
  });

  // ---- AGENDA
  const agendaItems: Array<{
    id: string;
    time: string;
    timeMinutes: number | null;
    order: number;
    title: string;
  }> = [];
  agendaSnap.forEach((doc) => {
    const v = doc.data() || {};
    agendaItems.push({
      id: doc.id,
      time: safeStr(v.time),
      timeMinutes:
        Number.isFinite(Number(v.timeMinutes))
          ? Number(v.timeMinutes)
          : timeToMinutes(v.time),
      order: Number.isFinite(Number(v.order)) ? Number(v.order) : 999999,
      title: safeStr(v.title) || "—",
    });
  });

  agendaItems.sort((a, b) => {
    const ta = typeof a.timeMinutes === "number" ? a.timeMinutes : 999999;
    const tb = typeof b.timeMinutes === "number" ? b.timeMinutes : 999999;
    if (ta !== tb) return ta - tb;
    if (a.order !== b.order) return a.order - b.order;
    return a.title.localeCompare(b.title);
  });

  const nextAgenda = agendaItems.find(
    (it) => typeof it.time === "string" && it.time.includes(":"),
  );
  const firstAgenda = agendaItems[0] || null;
  const lastAgenda = agendaItems.length > 1
    ? agendaItems[agendaItems.length - 1]
    : firstAgenda;
  const upcomingAgenda = agendaItems
    .filter((it) => typeof it.time === "string" && it.time.includes(":"))
    .slice(0, 3)
    .map((it) => ({ time: it.time, title: it.title }));

  // ---- PLANNER
  const plannerItems: Array<{
    id: string;
    title: string;
    priority: string;
    dueDate: string | null;
    dueTime: string | null;
    isDone: boolean;
    order: number;
    dueMs: number;
  }> = [];
  plannerSnap.forEach((doc) => {
    const v = doc.data() || {};
    const dueAtMs =
      typeof v?.dueAt?.toMillis === "function"
        ? v.dueAt.toMillis()
        : null;
    const dueDate = safeStr(v?.dueDate);
    const dueTime = safeStr(v?.dueTime);
    const dueDateTimeMs =
      /^\d{4}-\d{2}-\d{2}$/.test(dueDate) &&
      /^\d{2}:\d{2}$/.test(dueTime)
        ? new Date(`${dueDate}T${dueTime}:00`).getTime()
        : /^\d{4}-\d{2}-\d{2}$/.test(dueDate)
          ? new Date(`${dueDate}T09:00:00`).getTime()
          : null;

    plannerItems.push({
      id: doc.id,
      title: safeStr(v?.title) || "—",
      priority: safeStr(v?.priority) || "medium",
      dueDate: dueDate || null,
      dueTime: dueTime || null,
      isDone: v?.isDone === true,
      order: Number.isFinite(Number(v?.order)) ? Number(v.order) : 999999,
      dueMs:
        Number.isFinite(dueAtMs) && dueAtMs > 0
          ? dueAtMs
          : Number.isFinite(dueDateTimeMs)
            ? dueDateTimeMs
            : Number.POSITIVE_INFINITY,
    });
  });

  const plannerPending = plannerItems.filter((it) => !it.isDone);
  plannerPending.sort((a, b) => {
    if (a.dueMs !== b.dueMs) return a.dueMs - b.dueMs;
    if (a.order !== b.order) return a.order - b.order;
    return a.title.localeCompare(b.title);
  });
  const nextPlanner = plannerPending[0] || null;
  const upcomingPlanner = plannerPending.slice(0, 4).map((it) => ({
    title: it.title,
    dueDate: it.dueDate,
    dueTime: it.dueTime,
    priority: it.priority,
  }));

  const summary = {
    rsvp: {
      attending: attendingPrimaryCount,
      plusOnes: plusOneCount,
      declinedCount,
      transport: transportCount,
      dietYes: dietYesCount,
      lastResponse: lastResponse || null,
    },
    finances: {
      budgetTotal,
      giftsTotal,
      spentTotal,
      remaining,
      percentUsed,
      recentExpenses,
    },
    menus: {
      activeCount: activeMenusCount,
      needsReview,
      totalAssignments,
      top: topMenus,
    },
    seating: {
      totalGuests: allGuestIds.size,
      totalTables,
      unassignedCount,
    },
    emails: {
      lastMassEmailAt,
      lastMassEmailSubject: lastMassEmailSubject || null,
      lastMassEmailPreview: lastMassEmailPreview || null,
    },
    blog: {
      lastPostAt,
      lastImage: lastImage || null,
    },
    playlist: {
      totalCount: playlistTotal,
    },
    agenda: {
      totalCount: agendaItems.length,
      next: nextAgenda ? { time: nextAgenda.time, title: nextAgenda.title } : null,
      first: firstAgenda
        ? { time: firstAgenda.time, title: firstAgenda.title }
        : null,
      last: lastAgenda
        ? { time: lastAgenda.time, title: lastAgenda.title }
        : null,
      upcoming: upcomingAgenda,
    },
    planner: {
      totalCount: plannerItems.length,
      pendingCount: plannerPending.length,
      next: nextPlanner
        ? {
            title: nextPlanner.title,
            dueDate: nextPlanner.dueDate,
            dueTime: nextPlanner.dueTime,
          }
        : null,
      upcoming: upcomingPlanner,
    },
  };

  const updatedAt = admin.firestore.FieldValue.serverTimestamp();
  await Promise.all(
    Object.entries(summary).map(([docId, payload]) =>
      firestore
        .collection("adminDashboard")
        .doc(docId)
        .set({ ...payload, updatedAt }, { merge: true }),
    ),
  );

  return summary;
}

let _refreshPromise: Promise<unknown> | null = null;
let _pendingRefresh = false;
let _lastRefreshAt = 0;
let _cooldownTimer: ReturnType<typeof setTimeout> | null = null;
const REFRESH_COOLDOWN_MS = Number(
  process.env.ADMIN_DASHBOARD_REFRESH_COOLDOWN_MS || 15000,
);

function clearCooldownTimer() {
  if (_cooldownTimer) clearTimeout(_cooldownTimer);
  _cooldownTimer = null;
}

function runRefreshNow() {
  if (_refreshPromise) return _refreshPromise;

  _pendingRefresh = false;
  _refreshPromise = recomputeAdminDashboardSummary()
    .catch((e) =>
      console.error("[adminDashboard] background refresh failed", e),
    )
    .finally(() => {
      _lastRefreshAt = Date.now();
      _refreshPromise = null;

      // if writes happened during recompute/cooldown, schedule one extra pass
      if (_pendingRefresh) {
        triggerAdminDashboardSummaryRefresh();
      }
    });

  return _refreshPromise;
}

export function triggerAdminDashboardSummaryRefresh() {
  _pendingRefresh = true;

  // if a recompute is already running, mark dirty and let finally schedule next run
  if (_refreshPromise) return _refreshPromise;

  const now = Date.now();
  const elapsed = now - _lastRefreshAt;
  const remaining = Math.max(0, REFRESH_COOLDOWN_MS - elapsed);

  // out of cooldown: run immediately
  if (remaining === 0) {
    clearCooldownTimer();
    return runRefreshNow();
  }

  // in cooldown: debounce to one run at cooldown end
  if (!_cooldownTimer) {
    _cooldownTimer = setTimeout(() => {
      _cooldownTimer = null;
      if (_pendingRefresh && !_refreshPromise) {
        runRefreshNow();
      }
    }, remaining);
  }

  return _refreshPromise ?? Promise.resolve(null);
}
