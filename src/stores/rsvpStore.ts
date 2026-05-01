import { defineStore } from "pinia";
import {
  ensureFirebase,
  collection,
  query,
  orderBy,
  limit,
  onSnapshot,
} from "@/services/firebaseClient";
import { api } from "@/services/api";
import { withApiError } from "@/stores/_helpers/withApiError";

type Unsubscribe = () => void;

type TimestampLike = {
  toMillis?: () => number;
  toDate?: () => Date;
};

type RsvpSubmitter = {
  email: string;
  firstName: string;
  lastName: string;
};

type RsvpGroup = {
  id: string;
  createdAt: number | null;
  updatedAt: number | null;
  message: string;
  comments: string;
  songs: unknown[];
  weddingEventParts: string[];
  submitter: RsvpSubmitter;
  isCoupleGroup: boolean;
};

type GuestDoc = Record<string, unknown>;

type RsvpRowType = "COUPLE" | "CHILD" | "PRIMARY" | "PLUS_ONE";

type RsvpRow = {
  rsvpId: string | null;
  guestId: string;
  guestDocId: string;
  role: string;
  isPrimary: boolean;
  isChild: boolean;
  rowType: RsvpRowType;
  parentGuestId: string | null;
  index: number;
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  message: string;
  attending: boolean;
  transport: boolean;
  weddingEventParts: string[];
  weddingEventPartsText: string;
  dietCodes: string[];
  dietOtherText: string;
  dietSearchText: string;
  giftAmount: number | null;
  createdAt: number | null;
  isCouple: boolean;
  groupMessage: string;
  groupComments: string;
  groupSongs: unknown[];
  groupWeddingEventParts: string[];
  groupWeddingEventPartsText: string;
  groupCreatedAt: number | null;
  groupSubmitter: RsvpSubmitter | null;
};

type RsvpTotals = {
  attending: number;
  plusOnes: number;
  transport: number;
  dietYes: number;
  children: number;
};

type LastResponse = {
  rsvpId: string;
  createdAt: number | null;
  submitterEmail: string;
  primaryFullName: string;
  guestsCount: number;
  attending: boolean | null;
};

type LastRsvpDoc = {
  id: string;
  data: Record<string, unknown>;
};

type RsvpState = {
  rsvpRows: RsvpRow[];
  rsvpLoading: boolean;
  totals: RsvpTotals;
  lastResponse: LastResponse | null;
  _unsubGuests: Unsubscribe | null;
  _unsubRsvps: Unsubscribe | null;
  _rowsByKey: Map<string, RsvpRow>;
  _guestsById: Map<string, GuestDoc>;
  _groupsById: Map<string, RsvpGroup>;
  _lastRsvpDocs: LastRsvpDoc[];
  _started: boolean;
};

type GuestInGroup = {
  guestId: string;
  g: GuestDoc;
};

type ManualPayload = Record<string, unknown>;

type RestartRealtimeOptions = {
  forceTokenRefresh?: boolean;
};

type GroupBuildInput = {
  id: string;
  v: Record<string, unknown>;
};

type RowBuildInput = {
  guestId: string;
  g: GuestDoc;
  group: RsvpGroup | null;
};

type UpdateGiftAmountInput = {
  guestId: string | number | null | undefined;
  amount: unknown;
};

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object") return {};
  return value as Record<string, unknown>;
}

function safeString(value: unknown): string {
  return String(value ?? "").trim();
}

function safeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((entry) => safeString(entry)).filter(Boolean);
}

function safeEmail(v: unknown): string {
  const s = String(v ?? "")
    .trim()
    .toLowerCase();
  return s.includes("@") ? s : "";
}

function safeNumberOrNull(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function safeIdOrNull(v: unknown): string | null {
  const s = safeString(v);
  return s || null;
}

function tsToMillis(ts: unknown): number | null {
  if (!ts) return null;
  if (typeof ts === "number") return ts;

  const obj = ts as TimestampLike;
  if (typeof obj.toMillis === "function") return obj.toMillis();
  if (typeof obj.toDate === "function") return obj.toDate().getTime();

  const d = new Date(String(ts));
  return Number.isNaN(d.getTime()) ? null : d.getTime();
}

function weddingEventPartSearchText(parts: unknown): string {
  if (!Array.isArray(parts)) return "";
  const tokens: string[] = [];

  parts.forEach((raw) => {
    const key = String(raw || "").trim();
    if (!key) return;
    tokens.push(key);
    switch (key) {
      case "mass":
        tokens.push("misa");
        break;
      case "cocktailReception":
        tokens.push("cocktail", "recepcion", "recepción", "reception");
        break;
      case "dinner":
        tokens.push("cena");
        break;
      case "party":
        tokens.push("fiesta");
        break;
      case "brunch":
        tokens.push("brunch");
        break;
      default:
        break;
    }
  });

  return tokens.join(" ").trim();
}

function dietSearchText({
  dietCodes,
  dietOtherText,
}: {
  dietCodes: unknown;
  dietOtherText: unknown;
}): string {
  const tokens: string[] = [];
  const codes = Array.isArray(dietCodes) ? dietCodes : [];
  const other = String(dietOtherText || "").trim();

  codes.forEach((codeRaw) => {
    const code = String(codeRaw || "").trim();
    if (!code) return;
    tokens.push(code);
    switch (code) {
      case "vegetarian":
        tokens.push("vegetariana", "vegetarian");
        break;
      case "vegan":
        tokens.push("vegana", "vegan");
        break;
      case "gluten_free":
        tokens.push("sin gluten", "gluten free");
        break;
      case "lactose_free":
        tokens.push("sin lactosa", "lactose free");
        break;
      case "nuts_allergy":
        tokens.push("frutos secos", "nut allergy");
        break;
      case "pregnant":
        tokens.push("embarazo", "pregnancy");
        break;
      case "other":
        tokens.push("otra", "other");
        break;
      default:
        break;
    }
  });

  if (other) tokens.push(other);
  return tokens.join(" ").trim();
}

function buildGroup({ id, v }: GroupBuildInput): RsvpGroup {
  const submitter = asRecord(v.submitter);
  return {
    id,
    createdAt: tsToMillis(v.createdAt),
    updatedAt: tsToMillis(v.updatedAt),

    message: safeString(v.message),
    comments: safeString(v.comments),
    songs: Array.isArray(v.songs) ? v.songs : [],
    weddingEventParts: safeStringArray(v.weddingEventParts),

    submitter: {
      email: safeEmail(submitter.email),
      firstName: safeString(submitter.firstName),
      lastName: safeString(submitter.lastName),
    },

    isCoupleGroup: Boolean(v.isCoupleGroup),
  };
}

function buildRow({ guestId, g, group }: RowBuildInput): RsvpRow {
  const firstName = safeString(g.firstName);
  const lastName = safeString(g.lastName);
  const fullName =
    firstName || lastName ? `${firstName} ${lastName}`.trim() : "—";

  const rsvpId = safeIdOrNull(g.rsvpId) || safeIdOrNull(g.groupId);
  const role = safeString(g.role) || "PRIMARY";
  const isPrimary = Boolean(g.isPrimary);
  const isChild = Boolean(g.isChild);
  const isCouple = Boolean(g.isCouple);

  return {
    rsvpId,
    guestId,
    guestDocId: guestId,

    role,
    isPrimary,
    isChild,
    rowType: isCouple
      ? "COUPLE"
      : isChild
        ? "CHILD"
        : isPrimary
          ? "PRIMARY"
          : "PLUS_ONE",
    parentGuestId: safeIdOrNull(g.parentGuestId),
    index: Number.isFinite(Number(g.index)) ? Number(g.index) : 0,

    firstName,
    lastName,
    fullName,

    email: safeEmail(g.email),

    message: safeString(group?.message),

    attending: Boolean(g.attending),
    transport: Boolean(g.transport),
    weddingEventParts: safeStringArray(g.weddingEventParts),
    weddingEventPartsText: weddingEventPartSearchText(g.weddingEventParts),

    dietCodes: safeStringArray(g.dietCodes),
    dietOtherText: safeString(g.dietOtherText),
    dietSearchText: dietSearchText({
      dietCodes: g.dietCodes,
      dietOtherText: g.dietOtherText,
    }),

    giftAmount:
      g.giftAmount === 0 || g.giftAmount
        ? safeNumberOrNull(g.giftAmount)
        : null,

    createdAt: tsToMillis(g.createdAt),

    isCouple,

    groupMessage: group?.message || "",
    groupComments: group?.comments || "",
    groupSongs: group?.songs || [],
    groupWeddingEventParts: group?.weddingEventParts || [],
    groupWeddingEventPartsText: weddingEventPartSearchText(
      group?.weddingEventParts,
    ),

    groupCreatedAt: group?.createdAt ?? null,
    groupSubmitter: group?.submitter || null,
  };
}

function pickPrimaryGuest(guests: GuestInGroup[]): GuestInGroup | null {
  return (
    guests.find((x) => safeString(x.g.role) === "PRIMARY") ||
    guests.find((x) => Boolean(x.g.isPrimary)) ||
    guests[0] ||
    null
  );
}

function extractId(value: unknown): string | null {
  const rec = asRecord(value);
  return safeIdOrNull(rec.id);
}

export const useRsvpStore = defineStore("rsvp", {
  state: (): RsvpState => ({
    rsvpRows: [],
    rsvpLoading: false,
    totals: {
      attending: 0,
      plusOnes: 0,
      transport: 0,
      dietYes: 0,
      children: 0,
    },

    lastResponse: null,

    _unsubGuests: null,
    _unsubRsvps: null,

    _rowsByKey: new Map<string, RsvpRow>(),
    _guestsById: new Map<string, GuestDoc>(),
    _groupsById: new Map<string, RsvpGroup>(),
    _lastRsvpDocs: [],
    _started: false,
  }),

  getters: {
    totalInvites(state): number {
      return state.rsvpRows.length;
    },

    allRespondentsEmails(state): string[] {
      const set = new Set<string>();
      state.rsvpRows.forEach((r) => {
        const email = safeEmail(r.email);
        if (email) set.add(email);
      });
      return Array.from(set);
    },

    attendingEmails(state): string[] {
      const set = new Set<string>();
      state.rsvpRows.forEach((r) => {
        const email = safeEmail(r.email);
        if (!email) return;
        if (r.attending === true) set.add(email);
      });
      return Array.from(set);
    },

    recipientsList(state): Array<{ email: string; name: string; attending: boolean }> {
      const map = new Map<string, { email: string; name: string; attending: boolean }>();

      state.rsvpRows.forEach((r) => {
        const email = safeEmail(r.email);
        if (!email) return;
        if (map.has(email)) return;

        const name = r.fullName || "—";
        map.set(email, { email, name, attending: Boolean(r.attending) });
      });

      return Array.from(map.values()).sort((a, b) =>
        a.name.localeCompare(b.name),
      );
    },
  },

  actions: {
    async restartRealtime(
      { forceTokenRefresh = true }: RestartRealtimeOptions = {},
    ): Promise<void> {
      this.stopRealtime();

      const { auth } = await ensureFirebase();
      if (forceTokenRefresh && auth.currentUser) {
        await auth.currentUser.getIdToken(true);
      }

      await this.startRealtime();
    },

    stopRealtime(): void {
      try {
        this._unsubGuests?.();
      } catch {
        // no-op
      }
      try {
        this._unsubRsvps?.();
      } catch {
        // no-op
      }

      this._unsubGuests = null;
      this._unsubRsvps = null;
      this._started = false;

      this._rowsByKey.clear();
      this._guestsById.clear();
      this._groupsById.clear();
      this._lastRsvpDocs = [];
      this.lastResponse = null;
    },

    _recomputeFromMap(): void {
      const flatRows = Array.from(this._rowsByKey.values());

      let attendingPrimaryCount = 0;
      let plusOneCount = 0;
      let transportCount = 0;
      let dietCount = 0;
      let childrenCount = 0;

      for (const row of flatRows) {
        if (!row.attending) continue;

        if (row.isPrimary) attendingPrimaryCount += 1;
        else plusOneCount += 1;

        if (row.transport) transportCount += 1;
        if (row.isChild) childrenCount += 1;

        const codes = Array.isArray(row.dietCodes) ? row.dietCodes : [];
        const other = safeString(row.dietOtherText);
        if (codes.length > 0 || other.length > 0) dietCount += 1;
      }

      flatRows.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

      this.rsvpRows = flatRows;
      this.totals = {
        attending: attendingPrimaryCount,
        plusOnes: plusOneCount,
        transport: transportCount,
        dietYes: dietCount,
        children: childrenCount,
      };
    },

    _rebuildRows(): void {
      this._rowsByKey.clear();

      for (const [guestId, g] of this._guestsById.entries()) {
        const rsvpId = safeIdOrNull(g.rsvpId) || safeIdOrNull(g.groupId);
        const group = rsvpId ? this._groupsById.get(rsvpId) || null : null;
        const row = buildRow({ guestId, g, group });
        this._rowsByKey.set(guestId, row);
      }

      this._recomputeFromMap();
    },

    _recomputeLastResponse(): void {
      const list = Array.isArray(this._lastRsvpDocs) ? this._lastRsvpDocs : [];

      let lastGroup: RsvpGroup | null = null;

      for (const d of list) {
        const v = d.data || {};
        const isCouple = d.id === "couple" || Boolean(v.isCoupleGroup);
        if (!isCouple) {
          lastGroup = buildGroup({ id: d.id, v });
          break;
        }
      }

      if (!lastGroup) {
        this.lastResponse = null;
        return;
      }

      const rsvpId = lastGroup.id;
      const guests: GuestInGroup[] = [];

      for (const [guestId, g] of this._guestsById.entries()) {
        const gid = safeIdOrNull(g.rsvpId) || safeIdOrNull(g.groupId);
        if (gid === rsvpId) guests.push({ guestId, g });
      }

      const primary = pickPrimaryGuest(guests);
      const firstName = safeString(primary?.g.firstName);
      const lastName = safeString(primary?.g.lastName);
      const primaryFullName =
        firstName || lastName ? `${firstName} ${lastName}`.trim() : "—";

      const attendingValue = primary?.g.attending;
      const attending =
        typeof attendingValue === "boolean" ? attendingValue : null;

      this.lastResponse = {
        rsvpId,
        createdAt: lastGroup.createdAt,
        submitterEmail: safeEmail(lastGroup.submitter.email),
        primaryFullName,
        guestsCount: guests.length,
        attending,
      };
    },

    async startRealtime(): Promise<void> {
      if (this._started) return;

      this.rsvpLoading = true;

      const { fs } = await ensureFirebase();
      if (!fs) throw new Error("[rsvpStore] Firestore fs is missing");

      const handlePermError = (err: unknown, label: string): void => {
        console.error(`[rsvpStore] ${label} error:`, err);
        const errorRecord = asRecord(err);
        const code = errorRecord.code;
        const msg = String(errorRecord.message || "");
        const isPerm =
          code === "permission-denied" ||
          msg.includes("Missing or insufficient permissions");
        if (isPerm) this.stopRealtime();
      };

      const rsvpsQ = query(
        collection(fs, "rsvps"),
        orderBy("createdAt", "desc"),
        limit(2000),
      );

      this._unsubRsvps = onSnapshot(
        rsvpsQ,
        (snap) => {
          this._groupsById.clear();
          this._lastRsvpDocs = [];

          snap.forEach((d) => {
            const data = asRecord(d.data());
            this._groupsById.set(d.id, buildGroup({ id: d.id, v: data }));
            this._lastRsvpDocs.push({ id: d.id, data });
          });

          this._rebuildRows();
          this._recomputeLastResponse();
          this.rsvpLoading = false;
        },
        (err: unknown) => {
          this.rsvpLoading = false;
          handlePermError(err, "rsvps listen");
        },
      );

      const guestsQ = query(
        collection(fs, "guests"),
        orderBy("createdAt", "desc"),
        limit(2000),
      );

      this._unsubGuests = onSnapshot(
        guestsQ,
        (snap) => {
          this._guestsById.clear();
          snap.forEach((d) => this._guestsById.set(d.id, asRecord(d.data())));

          this._rebuildRows();
          this._recomputeLastResponse();
          this.rsvpLoading = false;
        },
        (err: unknown) => {
          this.rsvpLoading = false;
          handlePermError(err, "guests listen");
        },
      );

      this._started = true;
    },

    async deleteRsvp(rsvpId: string | null | undefined): Promise<unknown | void> {
      if (!rsvpId) return;
      return withApiError(() => api.deleteRsvp(rsvpId));
    },

    async deleteGuest(guestId: string | number | null | undefined): Promise<unknown | void> {
      if (!guestId) return;
      return withApiError(() => api.deleteGuest(String(guestId)));
    },

    async addManualGuest(payload: ManualPayload): Promise<string | null> {
      return withApiError(async () => {
        const res = await api.createManualRsvp(payload);
        return extractId(res);
      });
    },

    async addManualCouple(payload: ManualPayload): Promise<string | null> {
      return withApiError(async () => {
        const res = await api.createManualCoupleRsvp(payload);
        return extractId(res);
      });
    },

    async addManualGroup(payload: ManualPayload): Promise<string | null> {
      return withApiError(async () => {
        const res = await api.createManualRsvpGroup(payload);
        return extractId(res);
      });
    },

    async updateGuestGiftAmount(
      { guestId, amount }: UpdateGiftAmountInput,
    ): Promise<unknown | void> {
      if (!guestId) return;
      const normalized = safeNumberOrNull(amount);
      return withApiError(() =>
        api.patchGuest(String(guestId), { giftAmount: normalized }),
      );
    },
  },
});

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    try {
      const store = useRsvpStore();
      store.stopRealtime?.();
    } catch {
      // no-op
    }
  });
}
