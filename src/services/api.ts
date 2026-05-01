// src/services/api.js
import { getAuth } from "firebase/auth";
import { getClientId } from "@/utils/clientId";
import {
  hc,
  type InferRequestType,
  type InferResponseType,
} from "hono/client";
import type { AppType } from "../../backend/server.ts";

type ApiPayload = Record<string, unknown>;
type SendInviteEmailInput = {
  toEmail: string;
  link: string;
  permissions?: string[];
  expiresAt?: unknown;
};
type CreateInviteInput = {
  email?: string;
  displayName?: string;
  permissions?: string[];
};
type ListEmailJobsInput = { limit?: number; type?: string };
type GetEmailJobDeliveriesInput = { limit?: number };
type GetGuestDirectoryInput = { scope?: string; fields?: string[] };
type FirebaseConfig = {
  apiKey: string;
  authDomain: string;
  projectId: string;
  appId: string;
  [k: string]: unknown;
};

type ApiError = Error & {
  status: number;
  code: string | null;
  data: unknown;
};

type JsonRequest<TReq extends (...args: never[]) => Promise<unknown>> =
  InferRequestType<TReq> extends { json: infer TJson }
    ? TJson
    : Record<string, unknown>;

type RpcCall = (
  args?: Record<string, unknown>,
  options?: Record<string, unknown>,
) => Promise<Response>;

type RpcNode = {
  [key: string]: unknown;
  $get: RpcCall;
  $post: RpcCall;
  $put: RpcCall;
  $patch: RpcCall;
  $delete: RpcCall;
};

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object"
    ? (value as Record<string, unknown>)
    : {};
}

function asRpcNode(value: unknown): RpcNode {
  return value as RpcNode;
}

const client = hc<AppType>("/");
const rpcApi = asRpcNode((client as { api: unknown }).api);
const rpcSession = asRpcNode(rpcApi.session);
const rpcMe = asRpcNode(rpcApi.me);
const rpcFirebaseConfig = asRpcNode(rpcApi["firebase-config"]);
const rpcEmailJobs = asRpcNode(rpcApi["email-jobs"]);
const rpcEmailJobById = asRpcNode(rpcEmailJobs[":jobId"]);
const rpcEmailJobDeliveries = asRpcNode(rpcEmailJobById.deliveries);
const rpcSendCustomEmail = asRpcNode(rpcApi["send-custom-email"]);
const rpcMenus = asRpcNode(rpcApi.menus);
const rpcMenuById = asRpcNode(rpcMenus[":menuId"]);
const rpcMenuAssignments = asRpcNode(rpcApi["menu-assignments"]);
const rpcMenuAssignmentByGuest = asRpcNode(rpcMenuAssignments[":guestId"]);
const rpcMenuAutoAssign = asRpcNode(rpcMenuAssignments["auto-assign"]);
const rpcAiChat = asRpcNode(asRpcNode(rpcApi.admin)["ai-chat"]);
const rpcAgendaItems = asRpcNode(asRpcNode(rpcApi.agenda).items);
const rpcAgendaItemById = asRpcNode(rpcAgendaItems[":id"]);
const rpcAgendaReorder = asRpcNode(rpcAgendaItems.reorder);
const rpcInvites = asRpcNode(rpcApi.invites);
const rpcInviteById = asRpcNode(rpcInvites[":id"]);
const rpcInvitesAccept = asRpcNode(rpcInvites.accept);
const rpcInviteRevoke = asRpcNode(rpcInviteById.revoke);
const _rpcInvitesSendEmail = asRpcNode(rpcInvites["send-email"]);
const rpcInvitesStatus = asRpcNode(rpcInvites.status);
const rpcUsers = asRpcNode(rpcApi.users);
const rpcUserByUid = asRpcNode(rpcUsers[":uid"]);
const rpcUserPermissions = asRpcNode(rpcUserByUid.permissions);
const rpcAuditLogs = asRpcNode(rpcApi["audit-logs"]);
const rpcDashboardSummaryRefresh = asRpcNode(
  asRpcNode(asRpcNode(rpcApi.admin)["dashboard-summary"]).refresh,
);
const rpcWeddingPlanner = asRpcNode(asRpcNode(rpcApi.admin)["wedding-planner"]);
const rpcWeddingPlannerSuggest = asRpcNode(rpcWeddingPlanner.suggest);
const rpcWeddingPlannerTasks = asRpcNode(rpcWeddingPlanner.tasks);
const rpcWeddingPlannerTaskById = asRpcNode(rpcWeddingPlannerTasks[":id"]);
const rpcWeddingPlannerTasksBulk = asRpcNode(rpcWeddingPlannerTasks.bulk);
const rpcWeddingPlannerTasksReorder = asRpcNode(rpcWeddingPlannerTasks.reorder);
const rpcRsvps = asRpcNode(rpcApi.rsvps);
const rpcRsvpById = asRpcNode(rpcRsvps[":id"]);
const rpcRsvpsManual = asRpcNode(rpcRsvps.manual);
const _rpcRsvpsManualCouple = asRpcNode(rpcRsvps["manual-couple"]);
const _rpcRsvpsManualGroup = asRpcNode(rpcRsvps["manual-group"]);
const rpcRsvpGuests = asRpcNode(rpcRsvpById.guests);
const rpcGuests = asRpcNode(rpcApi.guests);
const rpcGuestById = asRpcNode(rpcGuests[":guestId"]);
const rpcBlogPosts = asRpcNode(rpcApi["blog-posts"]);
const rpcBlogPostById = asRpcNode(rpcBlogPosts[":id"]);
const rpcBlogPostsUploadImage = asRpcNode(rpcBlogPosts["upload-image"]);
const rpcBlogPostLike = asRpcNode(rpcBlogPostById.like);
const rpcBlogPostUnlike = asRpcNode(rpcBlogPostById.unlike);
const rpcBlogNotificationJobs = asRpcNode(rpcApi["blog-notification-jobs"]);
const rpcBlogNotificationJobById = asRpcNode(rpcBlogNotificationJobs[":jobId"]);
const rpcSeating = asRpcNode(rpcApi.seating);
const rpcSeatingTables = asRpcNode(rpcSeating.tables);
const rpcSeatingTableById = asRpcNode(rpcSeatingTables[":tableId"]);
const _rpcSeatingTableGuestIds = asRpcNode(rpcSeatingTableById["guest-ids"]);
const _rpcSeatingPlanConfig = asRpcNode(rpcSeating["plan-config"]);
const rpcPlaylistSongs = asRpcNode(rpcApi["playlist-songs"]);
const rpcPlaylistSongById = asRpcNode(rpcPlaylistSongs[":songId"]);
const rpcPlaylistSongsReorder = asRpcNode(rpcPlaylistSongs.reorder);
const _rpcPlaylistSongsBulkDelete = asRpcNode(rpcPlaylistSongs["bulk-delete"]);
const rpcFinances = asRpcNode(rpcApi.finances);
const rpcFinancesBudget = asRpcNode(rpcFinances.budget);
const rpcFinancesStats = asRpcNode(rpcFinances.stats);
const rpcFinancesExpenses = asRpcNode(rpcFinances.expenses);
const rpcFinancesExpenseById = asRpcNode(rpcFinancesExpenses[":id"]);
const rpcFinancesCategories = asRpcNode(rpcFinances.categories);
const rpcFinancesCategoryById = asRpcNode(rpcFinancesCategories[":id"]);
const rpcFinancesPayers = asRpcNode(rpcFinances.payers);
const rpcFinancesPayerById = asRpcNode(rpcFinancesPayers[":id"]);
const rpcGuestDirectory = asRpcNode(rpcApi["guest-directory"]);
const rpcSendConfirmationEmail = asRpcNode(rpcApi["send-confirmation-email"]);
type RpcSessionResponse = InferResponseType<typeof rpcSession.$get, 200>;
type RpcFirebaseConfigResponse = InferResponseType<
  typeof rpcFirebaseConfig.$get,
  200
>;
type RpcMeResponse = InferResponseType<typeof rpcMe.$get, 200>;
type RpcEmailJobGetResponse = InferResponseType<typeof rpcEmailJobById.$get, 200>;
type RpcEmailJobsListResponse = InferResponseType<typeof rpcEmailJobs.$get, 200>;
type RpcSendCustomEmailInput = JsonRequest<typeof rpcSendCustomEmail.$post>;
type RpcSendCustomEmailResponse = InferResponseType<typeof rpcSendCustomEmail.$post, 200>;
type RpcEmailJobDeliveriesResponse = InferResponseType<
  typeof rpcEmailJobDeliveries.$get,
  200
>;
type RpcMenusListResponse = InferResponseType<typeof rpcMenus.$get, 200>;
type RpcMenusUpsertInput = JsonRequest<typeof rpcMenus.$post>;
type RpcMenusUpsertResponse = InferResponseType<typeof rpcMenus.$post, 200>;
type RpcMenusDeleteResponse = InferResponseType<typeof rpcMenuById.$delete, 200>;
type RpcSetGuestMenuInput = JsonRequest<
  typeof rpcMenuAssignmentByGuest.$put
>;
type RpcSetGuestMenuResponse = InferResponseType<
  typeof rpcMenuAssignmentByGuest.$put,
  200
>;
type RpcListMenuAssignmentsResponse = InferResponseType<
  typeof rpcMenuAssignments.$get,
  200
>;
type RpcAutoAssignMenusInput = JsonRequest<typeof rpcMenuAutoAssign.$post>;
type RpcAutoAssignMenusResponse = InferResponseType<typeof rpcMenuAutoAssign.$post, 200>;
type RpcAiChatInput = JsonRequest<typeof rpcAiChat.$post>;
type RpcAiChatResponse = InferResponseType<typeof rpcAiChat.$post, 200>;
type RpcAgendaCreateInput = JsonRequest<typeof rpcAgendaItems.$post>;
type RpcAgendaCreateResponse = InferResponseType<typeof rpcAgendaItems.$post, 200>;
type RpcAgendaPatchInput = JsonRequest<typeof rpcAgendaItemById.$patch>;
type RpcAgendaPatchResponse = InferResponseType<typeof rpcAgendaItemById.$patch, 200>;
type RpcAgendaDeleteResponse = InferResponseType<typeof rpcAgendaItemById.$delete>;
type RpcAgendaReorderInput = JsonRequest<typeof rpcAgendaReorder.$put>;
type RpcAgendaReorderResponse = InferResponseType<typeof rpcAgendaReorder.$put, 200>;
type RpcAcceptInviteInput = JsonRequest<typeof rpcInvitesAccept.$post>;
type RpcAcceptInviteResponse = InferResponseType<typeof rpcInvitesAccept.$post, 200>;
type RpcSendInviteEmailInput = JsonRequest<typeof _rpcInvitesSendEmail.$post>;
type RpcSendInviteEmailResponse = InferResponseType<typeof _rpcInvitesSendEmail.$post, 200>;
type RpcUserPermissionsPatchInput = JsonRequest<typeof rpcUserPermissions.$patch>;
type RpcInvitesListResponse = InferResponseType<typeof rpcInvites.$get, 200>;
type RpcCreateInviteInput = JsonRequest<typeof rpcInvites.$post>;
type RpcCreateInviteResponse = InferResponseType<typeof rpcInvites.$post, 200>;
type RpcRevokeInviteResponse = InferResponseType<typeof rpcInviteRevoke.$post, 200>;
type RpcUsersListResponse = InferResponseType<typeof rpcUsers.$get, 200>;
type RpcAuditLogsResponse = InferResponseType<typeof rpcAuditLogs.$get, 200>;
type RpcSuggestWeddingPlannerInput = JsonRequest<typeof rpcWeddingPlannerSuggest.$post>;
type RpcSuggestWeddingPlannerResponse = InferResponseType<typeof rpcWeddingPlannerSuggest.$post, 200>;
type RpcListWeddingPlannerTasksResponse = InferResponseType<typeof rpcWeddingPlannerTasks.$get, 200>;
type RpcCreateWeddingPlannerTaskInput = JsonRequest<typeof rpcWeddingPlannerTasks.$post>;
type RpcCreateWeddingPlannerTaskResponse = InferResponseType<typeof rpcWeddingPlannerTasks.$post, 200>;
type RpcBulkCreateWeddingPlannerTasksInput = JsonRequest<typeof rpcWeddingPlannerTasksBulk.$post>;
type RpcBulkCreateWeddingPlannerTasksResponse = InferResponseType<typeof rpcWeddingPlannerTasksBulk.$post, 200>;
type RpcPatchWeddingPlannerTaskInput = JsonRequest<typeof rpcWeddingPlannerTaskById.$patch>;
type RpcPatchWeddingPlannerTaskResponse = InferResponseType<typeof rpcWeddingPlannerTaskById.$patch, 200>;
type RpcDeleteWeddingPlannerTaskResponse = InferResponseType<typeof rpcWeddingPlannerTaskById.$delete, 200>;
type RpcReorderWeddingPlannerTasksInput = JsonRequest<typeof rpcWeddingPlannerTasksReorder.$put>;
type RpcReorderWeddingPlannerTasksResponse = InferResponseType<typeof rpcWeddingPlannerTasksReorder.$put, 200>;
type RpcDeleteRsvpResponse = InferResponseType<typeof rpcRsvpById.$delete, 200>;
type RpcPatchGuestInput = JsonRequest<typeof rpcGuestById.$patch>;
type RpcPatchGuestResponse = InferResponseType<typeof rpcGuestById.$patch, 200>;
type RpcDeleteGuestResponse = InferResponseType<typeof rpcGuestById.$delete, 200>;
type RpcPatchRsvpInput = JsonRequest<typeof rpcRsvpById.$patch>;
type RpcPatchRsvpResponse = InferResponseType<typeof rpcRsvpById.$patch, 200>;
type RpcCreateManualRsvpInput = JsonRequest<typeof rpcRsvpsManual.$post>;
type RpcCreateManualRsvpResponse = InferResponseType<typeof rpcRsvpsManual.$post, 200>;
type RpcCreateManualCoupleRsvpInput = JsonRequest<typeof _rpcRsvpsManualCouple.$post>;
type RpcCreateManualCoupleRsvpResponse = InferResponseType<typeof _rpcRsvpsManualCouple.$post, 200>;
type RpcCreateManualRsvpGroupInput = JsonRequest<typeof _rpcRsvpsManualGroup.$post>;
type RpcCreateManualRsvpGroupResponse = InferResponseType<typeof _rpcRsvpsManualGroup.$post, 200>;
type RpcAddGuestToRsvpInput = JsonRequest<typeof rpcRsvpGuests.$post>;
type RpcAddGuestToRsvpResponse = InferResponseType<typeof rpcRsvpGuests.$post, 200>;
type RpcCreateBlogPostInput = JsonRequest<typeof rpcBlogPosts.$post>;
type RpcCreateBlogPostResponse = InferResponseType<typeof rpcBlogPosts.$post, 200>;
type RpcGetBlogNotificationJobResponse = InferResponseType<typeof rpcBlogNotificationJobById.$get, 200>;
type RpcUpdateBlogPostInput = JsonRequest<typeof rpcBlogPostById.$patch>;
type RpcUpdateBlogPostResponse = InferResponseType<typeof rpcBlogPostById.$patch, 200>;
type RpcDeleteBlogPostResponse = InferResponseType<typeof rpcBlogPostById.$delete, 200>;
type RpcBlogUploadImageInput = { form: { image: Blob } };
type RpcBlogUploadImageResponse = InferResponseType<typeof rpcBlogPostsUploadImage.$post, 200>;
type RpcBlogLikeInput = JsonRequest<typeof rpcBlogPostLike.$post>;
type RpcBlogLikeResponse = InferResponseType<typeof rpcBlogPostLike.$post, 200>;
type RpcBlogUnlikeInput = JsonRequest<typeof rpcBlogPostUnlike.$post>;
type RpcBlogUnlikeResponse = InferResponseType<typeof rpcBlogPostUnlike.$post, 200>;
type RpcCreateSeatingTableInput = JsonRequest<typeof rpcSeatingTables.$post>;
type RpcCreateSeatingTableResponse = InferResponseType<typeof rpcSeatingTables.$post, 200>;
type RpcPatchSeatingTableInput = JsonRequest<typeof rpcSeatingTableById.$patch>;
type RpcPatchSeatingTableResponse = InferResponseType<typeof rpcSeatingTableById.$patch, 200>;
type RpcDeleteSeatingTableResponse = InferResponseType<typeof rpcSeatingTableById.$delete, 200>;
type RpcSetSeatingTableGuestIdsInput = JsonRequest<typeof _rpcSeatingTableGuestIds.$put>;
type RpcSetSeatingTableGuestIdsResponse = InferResponseType<typeof _rpcSeatingTableGuestIds.$put, 200>;
type RpcPatchSeatingPlanConfigInput = JsonRequest<typeof _rpcSeatingPlanConfig.$patch>;
type RpcPatchSeatingPlanConfigResponse = InferResponseType<typeof _rpcSeatingPlanConfig.$patch, 200>;
type RpcCreatePlaylistSongInput = JsonRequest<typeof rpcPlaylistSongs.$post>;
type RpcCreatePlaylistSongResponse = InferResponseType<typeof rpcPlaylistSongs.$post, 200>;
type RpcPatchPlaylistSongInput = JsonRequest<typeof rpcPlaylistSongById.$patch>;
type RpcPatchPlaylistSongResponse = InferResponseType<typeof rpcPlaylistSongById.$patch, 200>;
type RpcBulkDeletePlaylistSongsInput = JsonRequest<typeof _rpcPlaylistSongsBulkDelete.$post>;
type RpcBulkDeletePlaylistSongsResponse = InferResponseType<typeof _rpcPlaylistSongsBulkDelete.$post, 200>;
type RpcReorderPlaylistSongsInput = JsonRequest<typeof rpcPlaylistSongsReorder.$put>;
type RpcReorderPlaylistSongsResponse = InferResponseType<typeof rpcPlaylistSongsReorder.$put, 200>;
type RpcSetFinancesBudgetInput = JsonRequest<typeof rpcFinancesBudget.$patch>;
type RpcSetFinancesBudgetResponse = InferResponseType<typeof rpcFinancesBudget.$patch, 200>;
type RpcGetFinancesStatsResponse = InferResponseType<typeof rpcFinancesStats.$get, 200>;
type RpcCreateFinancesExpenseInput = JsonRequest<typeof rpcFinancesExpenses.$post>;
type RpcCreateFinancesExpenseResponse = InferResponseType<typeof rpcFinancesExpenses.$post, 200>;
type RpcPatchFinancesExpenseInput = JsonRequest<typeof rpcFinancesExpenseById.$patch>;
type RpcPatchFinancesExpenseResponse = InferResponseType<typeof rpcFinancesExpenseById.$patch, 200>;
type RpcDeleteFinancesExpenseResponse = InferResponseType<typeof rpcFinancesExpenseById.$delete, 200>;
type RpcCreateFinancesCategoryInput = JsonRequest<typeof rpcFinancesCategories.$post>;
type RpcCreateFinancesCategoryResponse = InferResponseType<typeof rpcFinancesCategories.$post, 200>;
type RpcPatchFinancesCategoryInput = JsonRequest<typeof rpcFinancesCategoryById.$patch>;
type RpcPatchFinancesCategoryResponse = InferResponseType<typeof rpcFinancesCategoryById.$patch, 200>;
type RpcDeleteFinancesCategoryResponse = InferResponseType<typeof rpcFinancesCategoryById.$delete, 200>;
type RpcCreateFinancesPayerInput = JsonRequest<typeof rpcFinancesPayers.$post>;
type RpcCreateFinancesPayerResponse = InferResponseType<typeof rpcFinancesPayers.$post, 200>;
type RpcPatchFinancesPayerInput = JsonRequest<typeof rpcFinancesPayerById.$patch>;
type RpcPatchFinancesPayerResponse = InferResponseType<typeof rpcFinancesPayerById.$patch, 200>;
type RpcDeleteFinancesPayerResponse = InferResponseType<typeof rpcFinancesPayerById.$delete, 200>;
type RpcGuestDirectoryResponse = InferResponseType<typeof rpcGuestDirectory.$get, 200>;
type RpcSendConfirmationEmailInput = JsonRequest<typeof rpcSendConfirmationEmail.$post>;
type RpcSendConfirmationEmailResponse = InferResponseType<typeof rpcSendConfirmationEmail.$post, 200>;
type RpcInviteStatusQuery = InferRequestType<typeof rpcInvitesStatus.$get> extends {
  query: infer TQuery;
}
  ? TQuery
  : Record<string, never>;
type RpcInviteStatusResponse = InferResponseType<typeof rpcInvitesStatus.$get, 200>;

async function refreshIdToken() {
  const user = getAuth().currentUser;
  if (user) await user.getIdToken(true);
}

/** Parse réponse + throw propre (avec status/code/data) */
const json = async (r: Response): Promise<unknown> => {
  const ct =
    r.headers.get("content-type") || r.headers.get("Content-Type") || "";

  const body = ct.includes("application/json")
    ? await r.json().catch(() => null)
    : await r.text().catch(() => "");

  const toShortString = (v: unknown, max = 220): string => {
    const s = String(v ?? "");
    return s.length > max ? `${s.slice(0, max)}…` : s;
  };

  // helper pour fabriquer une Error riche
  const makeErr = (status: number, payload: unknown): ApiError => {
    const isObj = payload && typeof payload === "object";
    const obj = isObj ? (payload as Record<string, unknown>) : null;

    const code = isObj
      ? String(obj?.code || obj?.error || status)
      : toShortString(payload || status);

    const normalizedStatus =
      isObj &&
      (obj?.error === "unauthorized" ||
        obj?.code === "unauthorized" ||
        obj?.error === "missing_permission" ||
        obj?.code === "missing_permission")
        ? 401
        : status;

    const e = new Error(String(code)) as ApiError;
    e.status = normalizedStatus;

    e.code = isObj ? String(obj?.code || obj?.error || "") || null : null;

    e.data = payload;
    return e;
  };

  if (!r.ok) throw makeErr(r.status, body);

  // Important: si ton backend renvoie {ok:false,...} en 200
  if (body && typeof body === "object" && body.ok === false) {
    throw makeErr(r.status, body);
  }

  return body;
};

/** Bearer Authorization header (Firebase ID token) */
async function bearerHeaders(forceRefresh = false) {
  const auth = getAuth();
  const user = auth.currentUser;
  if (!user) throw new Error("No Firebase user");

  const idToken = await user.getIdToken(forceRefresh);
  return { Authorization: `Bearer ${idToken}` };
}

async function rpcJson<T>(
  request: (forceRefresh: boolean) => Promise<Response>,
): Promise<T> {
  try {
    const response = await request(false);
    return (await json(response)) as T;
  } catch (e: unknown) {
    const err = e as Partial<ApiError>;
    const shouldRetry =
      err?.status === 401 ||
      err?.code === "unauthorized" ||
      String(err?.message || "").includes("401");

    if (shouldRetry) {
      const response = await request(true);
      return (await json(response)) as T;
    }

    throw e;
  }
}

export const api = {
  async session(): Promise<RpcSessionResponse> {
    const response = await rpcSession.$get();
    return (await json(response)) as RpcSessionResponse;
  },

  async firebaseConfig(): Promise<FirebaseConfig> {
    const response = await rpcFirebaseConfig.$get();
    return (await json(response)) as RpcFirebaseConfigResponse;
  },

  async me(): Promise<RpcMeResponse> {
    return rpcJson<RpcMeResponse>(async (forceRefresh) =>
      rpcMe.$get({}, { headers: await bearerHeaders(forceRefresh) }),
    );
  },

  async meFresh(): Promise<RpcMeResponse> {
    const response = await rpcMe.$get({}, { headers: await bearerHeaders(true) });
    return (await json(response)) as RpcMeResponse;
  },

  async acceptInvite(token: string): Promise<RpcAcceptInviteResponse> {
    const payload: RpcAcceptInviteInput = { token };
    const out = await rpcJson<RpcAcceptInviteResponse>(async (forceRefresh) =>
      rpcInvitesAccept.$post(
        { json: payload },
        { headers: await bearerHeaders(forceRefresh) },
      ),
    );
    if (asRecord(out).claimsUpdated) await refreshIdToken();
    return out;
  },

  async sendInviteEmail({
    toEmail,
    link,
    permissions = [],
  }: SendInviteEmailInput): Promise<RpcSendInviteEmailResponse> {
    const payload: RpcSendInviteEmailInput = {
      toEmail,
      link,
      permissions: Array.isArray(permissions) ? permissions : [],
    };
    return rpcJson<RpcSendInviteEmailResponse>(async (forceRefresh) =>
      _rpcInvitesSendEmail.$post(
        { json: payload },
        { headers: await bearerHeaders(forceRefresh) },
      ),
    );
  },

  async updateUserPermissions(uid: string, permissions: string[]) {
    const payload: RpcUserPermissionsPatchInput = { permissions };
    const out = await rpcJson(async (forceRefresh) =>
      rpcUserPermissions.$patch(
        {
          param: { uid },
          json: payload,
        },
        { headers: await bearerHeaders(forceRefresh) },
      ),
    );

    const me = getAuth().currentUser;
    if (me?.uid === uid) await refreshIdToken();
    return out;
  },

  async listInvites(): Promise<RpcInvitesListResponse> {
    return rpcJson<RpcInvitesListResponse>(async (forceRefresh) =>
      rpcInvites.$get({}, { headers: await bearerHeaders(forceRefresh) }),
    );
  },

  async createInvite({
    email = "",
    displayName = "",
    permissions = [],
  }: CreateInviteInput): Promise<RpcCreateInviteResponse> {
    const payload: RpcCreateInviteInput = { email, displayName, permissions };
    return rpcJson<RpcCreateInviteResponse>(async (forceRefresh) =>
      rpcInvites.$post(
        { json: payload },
        { headers: await bearerHeaders(forceRefresh) },
      ),
    );
  },

  async revokeInvite(inviteId: string): Promise<RpcRevokeInviteResponse> {
    return rpcJson<RpcRevokeInviteResponse>(async (forceRefresh) =>
      rpcInviteRevoke.$post(
        { param: { id: inviteId } },
        { headers: await bearerHeaders(forceRefresh) },
      ),
    );
  },

  async listUsers(): Promise<RpcUsersListResponse> {
    return rpcJson<RpcUsersListResponse>(async (forceRefresh) =>
      rpcUsers.$get({}, { headers: await bearerHeaders(forceRefresh) }),
    );
  },

  async listAuditLogs(): Promise<RpcAuditLogsResponse> {
    return rpcJson<RpcAuditLogsResponse>(async (forceRefresh) =>
      rpcAuditLogs.$get({}, { headers: await bearerHeaders(forceRefresh) }),
    );
  },

  async refreshAdminDashboardSummary() {
    return rpcJson(async (forceRefresh) =>
      rpcDashboardSummaryRefresh.$post(
        {},
        { headers: await bearerHeaders(forceRefresh) },
      ),
    );
  },

  async aiChat(payload: RpcAiChatInput): Promise<RpcAiChatResponse> {
    return rpcJson<RpcAiChatResponse>(async (forceRefresh) =>
      rpcAiChat.$post(
        { json: payload },
        { headers: await bearerHeaders(forceRefresh) },
      ),
    );
  },

  async suggestWeddingPlanner(
    payload: ApiPayload | null | undefined,
  ): Promise<RpcSuggestWeddingPlannerResponse> {
    const jsonPayload = asRecord(payload) as RpcSuggestWeddingPlannerInput;
    return rpcJson<RpcSuggestWeddingPlannerResponse>(async (forceRefresh) =>
      rpcWeddingPlannerSuggest.$post(
        { json: jsonPayload },
        { headers: await bearerHeaders(forceRefresh) },
      ),
    );
  },

  async listWeddingPlannerTasks(): Promise<RpcListWeddingPlannerTasksResponse> {
    return rpcJson<RpcListWeddingPlannerTasksResponse>(async (forceRefresh) =>
      rpcWeddingPlannerTasks.$get(
        {},
        { headers: await bearerHeaders(forceRefresh) },
      ),
    );
  },

  async createWeddingPlannerTask(
    payload: ApiPayload | null | undefined,
  ): Promise<RpcCreateWeddingPlannerTaskResponse> {
    const jsonPayload = asRecord(payload) as RpcCreateWeddingPlannerTaskInput;
    return rpcJson<RpcCreateWeddingPlannerTaskResponse>(async (forceRefresh) =>
      rpcWeddingPlannerTasks.$post(
        { json: jsonPayload },
        { headers: await bearerHeaders(forceRefresh) },
      ),
    );
  },

  async bulkCreateWeddingPlannerTasks(
    tasks: unknown[],
  ): Promise<RpcBulkCreateWeddingPlannerTasksResponse> {
    const payload: RpcBulkCreateWeddingPlannerTasksInput = {
      tasks: Array.isArray(tasks) ? tasks : [],
    };
    return rpcJson<RpcBulkCreateWeddingPlannerTasksResponse>(async (forceRefresh) =>
      rpcWeddingPlannerTasksBulk.$post(
        { json: payload },
        { headers: await bearerHeaders(forceRefresh) },
      ),
    );
  },

  async patchWeddingPlannerTask(
    id: string,
    patch: ApiPayload | null | undefined,
  ): Promise<RpcPatchWeddingPlannerTaskResponse> {
    const payload = asRecord(patch) as RpcPatchWeddingPlannerTaskInput;
    return rpcJson<RpcPatchWeddingPlannerTaskResponse>(async (forceRefresh) =>
      rpcWeddingPlannerTaskById.$patch(
        {
          param: { id },
          json: payload,
        },
        { headers: await bearerHeaders(forceRefresh) },
      ),
    );
  },

  async deleteWeddingPlannerTask(
    id: string,
  ): Promise<RpcDeleteWeddingPlannerTaskResponse> {
    return rpcJson<RpcDeleteWeddingPlannerTaskResponse>(async (forceRefresh) =>
      rpcWeddingPlannerTaskById.$delete(
        { param: { id } },
        { headers: await bearerHeaders(forceRefresh) },
      ),
    );
  },

  async reorderWeddingPlannerTasks(
    orderedIds: string[],
  ): Promise<RpcReorderWeddingPlannerTasksResponse> {
    const payload: RpcReorderWeddingPlannerTasksInput = {
      orderedIds: Array.isArray(orderedIds) ? orderedIds : [],
    };
    return rpcJson<RpcReorderWeddingPlannerTasksResponse>(async (forceRefresh) =>
      rpcWeddingPlannerTasksReorder.$put(
        { json: payload },
        { headers: await bearerHeaders(forceRefresh) },
      ),
    );
  },

  async deleteRsvp(rsvpId: string): Promise<RpcDeleteRsvpResponse> {
    return rpcJson<RpcDeleteRsvpResponse>(async (forceRefresh) =>
      rpcRsvpById.$delete(
        { param: { id: rsvpId } },
        { headers: await bearerHeaders(forceRefresh) },
      ),
    );
  },

  async patchGuest(
    guestId: string,
    patch: ApiPayload | null | undefined,
  ): Promise<RpcPatchGuestResponse> {
    const payload = asRecord(patch) as RpcPatchGuestInput;
    return rpcJson<RpcPatchGuestResponse>(async (forceRefresh) =>
      rpcGuestById.$patch(
        {
          param: { guestId },
          json: payload,
        },
        { headers: await bearerHeaders(forceRefresh) },
      ),
    );
  },

  async deleteGuest(guestId: string): Promise<RpcDeleteGuestResponse> {
    return rpcJson<RpcDeleteGuestResponse>(async (forceRefresh) =>
      rpcGuestById.$delete(
        { param: { guestId } },
        { headers: await bearerHeaders(forceRefresh) },
      ),
    );
  },

  async patchRsvp(
    rsvpId: string,
    patch: ApiPayload | null | undefined,
  ): Promise<RpcPatchRsvpResponse> {
    const payload = asRecord(patch) as RpcPatchRsvpInput;
    return rpcJson<RpcPatchRsvpResponse>(async (forceRefresh) =>
      rpcRsvpById.$patch(
        {
          param: { id: rsvpId },
          json: payload,
        },
        { headers: await bearerHeaders(forceRefresh) },
      ),
    );
  },

  async createManualRsvp(
    payload: ApiPayload | null | undefined,
  ): Promise<RpcCreateManualRsvpResponse> {
    const jsonPayload = asRecord(payload) as RpcCreateManualRsvpInput;
    return rpcJson<RpcCreateManualRsvpResponse>(async (forceRefresh) =>
      rpcRsvpsManual.$post(
        { json: jsonPayload },
        { headers: await bearerHeaders(forceRefresh) },
      ),
    );
  },

  async createManualCoupleRsvp(
    payload: ApiPayload | null | undefined,
  ): Promise<RpcCreateManualCoupleRsvpResponse> {
    const jsonPayload = asRecord(payload) as RpcCreateManualCoupleRsvpInput;
    return rpcJson<RpcCreateManualCoupleRsvpResponse>(async (forceRefresh) =>
      _rpcRsvpsManualCouple.$post(
        { json: jsonPayload },
        { headers: await bearerHeaders(forceRefresh) },
      ),
    );
  },

  async createManualRsvpGroup(
    payload: ApiPayload | null | undefined,
  ): Promise<RpcCreateManualRsvpGroupResponse> {
    const jsonPayload = asRecord(payload) as RpcCreateManualRsvpGroupInput;
    return rpcJson<RpcCreateManualRsvpGroupResponse>(async (forceRefresh) =>
      _rpcRsvpsManualGroup.$post(
        { json: jsonPayload },
        { headers: await bearerHeaders(forceRefresh) },
      ),
    );
  },

  async addGuestToRsvp(
    rsvpId: string,
    payload: ApiPayload | null | undefined,
  ): Promise<RpcAddGuestToRsvpResponse> {
    const jsonPayload = asRecord(payload) as RpcAddGuestToRsvpInput;
    return rpcJson<RpcAddGuestToRsvpResponse>(async (forceRefresh) =>
      rpcRsvpGuests.$post(
        {
          param: { id: rsvpId },
          json: jsonPayload,
        },
        { headers: await bearerHeaders(forceRefresh) },
      ),
    );
  },

  async adminCreateBlogPost(
    payload: ApiPayload | null | undefined,
  ): Promise<RpcCreateBlogPostResponse> {
    const jsonPayload = asRecord(payload) as RpcCreateBlogPostInput;
    return rpcJson<RpcCreateBlogPostResponse>(async (forceRefresh) =>
      rpcBlogPosts.$post(
        { json: jsonPayload },
        { headers: await bearerHeaders(forceRefresh) },
      ),
    );
  },

  async getBlogNotificationJob(
    jobId: string,
  ): Promise<RpcGetBlogNotificationJobResponse> {
    return rpcJson<RpcGetBlogNotificationJobResponse>(async (forceRefresh) =>
      rpcBlogNotificationJobById.$get(
        { param: { jobId } },
        { headers: await bearerHeaders(forceRefresh) },
      ),
    );
  },

  async adminUpdateBlogPost(
    id: string,
    payload: ApiPayload | null | undefined,
  ): Promise<RpcUpdateBlogPostResponse> {
    const jsonPayload = asRecord(payload) as RpcUpdateBlogPostInput;
    return rpcJson<RpcUpdateBlogPostResponse>(async (forceRefresh) =>
      rpcBlogPostById.$patch(
        {
          param: { id },
          json: jsonPayload,
        },
        { headers: await bearerHeaders(forceRefresh) },
      ),
    );
  },

  async adminDeleteBlogPost(id: string): Promise<RpcDeleteBlogPostResponse> {
    return rpcJson<RpcDeleteBlogPostResponse>(async (forceRefresh) =>
      rpcBlogPostById.$delete(
        { param: { id } },
        { headers: await bearerHeaders(forceRefresh) },
      ),
    );
  },

  async createSeatingTable(
    payload: ApiPayload | null | undefined,
  ): Promise<RpcCreateSeatingTableResponse> {
    const jsonPayload = asRecord(payload) as RpcCreateSeatingTableInput;
    return rpcJson<RpcCreateSeatingTableResponse>(async (forceRefresh) =>
      rpcSeatingTables.$post(
        { json: jsonPayload },
        { headers: await bearerHeaders(forceRefresh) },
      ),
    );
  },

  async patchSeatingTable(
    tableId: string,
    patch: ApiPayload | null | undefined,
  ): Promise<RpcPatchSeatingTableResponse> {
    const jsonPayload = asRecord(patch) as RpcPatchSeatingTableInput;
    return rpcJson<RpcPatchSeatingTableResponse>(async (forceRefresh) =>
      rpcSeatingTableById.$patch(
        {
          param: { tableId },
          json: jsonPayload,
        },
        { headers: await bearerHeaders(forceRefresh) },
      ),
    );
  },

  async deleteSeatingTable(
    tableId: string,
  ): Promise<RpcDeleteSeatingTableResponse> {
    return rpcJson<RpcDeleteSeatingTableResponse>(async (forceRefresh) =>
      rpcSeatingTableById.$delete(
        { param: { tableId } },
        { headers: await bearerHeaders(forceRefresh) },
      ),
    );
  },

  async setSeatingTableGuestIds(
    tableId: string,
    guestIds: string[],
  ): Promise<RpcSetSeatingTableGuestIdsResponse> {
    const payload: RpcSetSeatingTableGuestIdsInput = {
      guestIds: Array.isArray(guestIds) ? guestIds : [],
    };
    return rpcJson<RpcSetSeatingTableGuestIdsResponse>(async (forceRefresh) =>
      _rpcSeatingTableGuestIds.$put(
        {
          param: { tableId },
          json: payload,
        },
        { headers: await bearerHeaders(forceRefresh) },
      ),
    );
  },

  async patchSeatingPlanConfig(
    door: unknown,
  ): Promise<RpcPatchSeatingPlanConfigResponse> {
    const payload: RpcPatchSeatingPlanConfigInput = { door };
    return rpcJson<RpcPatchSeatingPlanConfigResponse>(async (forceRefresh) =>
      _rpcSeatingPlanConfig.$patch(
        { json: payload },
        { headers: await bearerHeaders(forceRefresh) },
      ),
    );
  },

  async createPlaylistSong(
    payload: ApiPayload | null | undefined,
  ): Promise<RpcCreatePlaylistSongResponse> {
    const jsonPayload = asRecord(payload) as RpcCreatePlaylistSongInput;
    return rpcJson<RpcCreatePlaylistSongResponse>(async (forceRefresh) =>
      rpcPlaylistSongs.$post(
        { json: jsonPayload },
        { headers: await bearerHeaders(forceRefresh) },
      ),
    );
  },

  async patchPlaylistSong(
    id: string,
    patch: ApiPayload | null | undefined,
  ): Promise<RpcPatchPlaylistSongResponse> {
    const jsonPayload = asRecord(patch) as RpcPatchPlaylistSongInput;
    return rpcJson<RpcPatchPlaylistSongResponse>(async (forceRefresh) =>
      rpcPlaylistSongById.$patch(
        {
          param: { songId: id },
          json: jsonPayload,
        },
        { headers: await bearerHeaders(forceRefresh) },
      ),
    );
  },

  async bulkDeletePlaylistSongs(
    ids: string[],
  ): Promise<RpcBulkDeletePlaylistSongsResponse> {
    const payload: RpcBulkDeletePlaylistSongsInput = {
      ids: Array.isArray(ids) ? ids : [],
    };
    return rpcJson<RpcBulkDeletePlaylistSongsResponse>(async (forceRefresh) =>
      _rpcPlaylistSongsBulkDelete.$post(
        { json: payload },
        { headers: await bearerHeaders(forceRefresh) },
      ),
    );
  },

  async reorderPlaylistSongs(
    orderedIds: string[],
  ): Promise<RpcReorderPlaylistSongsResponse> {
    const payload: RpcReorderPlaylistSongsInput = {
      orderedIds: Array.isArray(orderedIds) ? orderedIds : [],
    };
    return rpcJson<RpcReorderPlaylistSongsResponse>(async (forceRefresh) =>
      rpcPlaylistSongsReorder.$put(
        { json: payload },
        { headers: await bearerHeaders(forceRefresh) },
      ),
    );
  },

  async setFinancesBudget(
    payload: ApiPayload | null | undefined,
  ): Promise<RpcSetFinancesBudgetResponse> {
    const jsonPayload = asRecord(payload) as RpcSetFinancesBudgetInput;
    return rpcJson<RpcSetFinancesBudgetResponse>(async (forceRefresh) =>
      rpcFinancesBudget.$patch(
        { json: jsonPayload },
        { headers: await bearerHeaders(forceRefresh) },
      ),
    );
  },

  async getFinancesStats(): Promise<RpcGetFinancesStatsResponse> {
    return rpcJson<RpcGetFinancesStatsResponse>(async (forceRefresh) =>
      rpcFinancesStats.$get({}, { headers: await bearerHeaders(forceRefresh) }),
    );
  },

  async createFinancesExpense(
    payload: ApiPayload | null | undefined,
  ): Promise<RpcCreateFinancesExpenseResponse> {
    const jsonPayload = asRecord(payload) as RpcCreateFinancesExpenseInput;
    return rpcJson<RpcCreateFinancesExpenseResponse>(async (forceRefresh) =>
      rpcFinancesExpenses.$post(
        { json: jsonPayload },
        { headers: await bearerHeaders(forceRefresh) },
      ),
    );
  },

  async patchFinancesExpense(
    id: string,
    payload: ApiPayload | null | undefined,
  ): Promise<RpcPatchFinancesExpenseResponse> {
    const jsonPayload = asRecord(payload) as RpcPatchFinancesExpenseInput;
    return rpcJson<RpcPatchFinancesExpenseResponse>(async (forceRefresh) =>
      rpcFinancesExpenseById.$patch(
        {
          param: { id },
          json: jsonPayload,
        },
        { headers: await bearerHeaders(forceRefresh) },
      ),
    );
  },

  async deleteFinancesExpense(id: string): Promise<RpcDeleteFinancesExpenseResponse> {
    return rpcJson<RpcDeleteFinancesExpenseResponse>(async (forceRefresh) =>
      rpcFinancesExpenseById.$delete(
        { param: { id } },
        { headers: await bearerHeaders(forceRefresh) },
      ),
    );
  },

  async createFinancesCategory(
    payload: ApiPayload | null | undefined,
  ): Promise<RpcCreateFinancesCategoryResponse> {
    const jsonPayload = asRecord(payload) as RpcCreateFinancesCategoryInput;
    return rpcJson<RpcCreateFinancesCategoryResponse>(async (forceRefresh) =>
      rpcFinancesCategories.$post(
        { json: jsonPayload },
        { headers: await bearerHeaders(forceRefresh) },
      ),
    );
  },

  async patchFinancesCategory(
    id: string,
    payload: ApiPayload | null | undefined,
  ): Promise<RpcPatchFinancesCategoryResponse> {
    const jsonPayload = asRecord(payload) as RpcPatchFinancesCategoryInput;
    return rpcJson<RpcPatchFinancesCategoryResponse>(async (forceRefresh) =>
      rpcFinancesCategoryById.$patch(
        {
          param: { id },
          json: jsonPayload,
        },
        { headers: await bearerHeaders(forceRefresh) },
      ),
    );
  },

  async deleteFinancesCategory(
    id: string,
  ): Promise<RpcDeleteFinancesCategoryResponse> {
    return rpcJson<RpcDeleteFinancesCategoryResponse>(async (forceRefresh) =>
      rpcFinancesCategoryById.$delete(
        { param: { id } },
        { headers: await bearerHeaders(forceRefresh) },
      ),
    );
  },

  async createFinancesPayer(
    payload: ApiPayload | null | undefined,
  ): Promise<RpcCreateFinancesPayerResponse> {
    const jsonPayload = asRecord(payload) as RpcCreateFinancesPayerInput;
    return rpcJson<RpcCreateFinancesPayerResponse>(async (forceRefresh) =>
      rpcFinancesPayers.$post(
        { json: jsonPayload },
        { headers: await bearerHeaders(forceRefresh) },
      ),
    );
  },

  async patchFinancesPayer(
    id: string,
    payload: ApiPayload | null | undefined,
  ): Promise<RpcPatchFinancesPayerResponse> {
    const jsonPayload = asRecord(payload) as RpcPatchFinancesPayerInput;
    return rpcJson<RpcPatchFinancesPayerResponse>(async (forceRefresh) =>
      rpcFinancesPayerById.$patch(
        {
          param: { id },
          json: jsonPayload,
        },
        { headers: await bearerHeaders(forceRefresh) },
      ),
    );
  },

  async deleteFinancesPayer(id: string): Promise<RpcDeleteFinancesPayerResponse> {
    return rpcJson<RpcDeleteFinancesPayerResponse>(async (forceRefresh) =>
      rpcFinancesPayerById.$delete(
        { param: { id } },
        { headers: await bearerHeaders(forceRefresh) },
      ),
    );
  },

  async getGuestDirectory({
    scope = "ONLY_ATTENDING",
    fields = [],
  }: GetGuestDirectoryInput = {}): Promise<RpcGuestDirectoryResponse> {
    const query = {
      scope,
      ...(Array.isArray(fields) && fields.length
        ? { fields: fields.join(",") }
        : {}),
    };
    return rpcJson<RpcGuestDirectoryResponse>(async (forceRefresh) =>
      rpcGuestDirectory.$get(
        { query },
        { headers: await bearerHeaders(forceRefresh) },
      ),
    );
  },

  async adminUploadBlogImage(file: Blob): Promise<RpcBlogUploadImageResponse> {
    const payload: RpcBlogUploadImageInput = {
      form: { image: file },
    };
    return rpcJson<RpcBlogUploadImageResponse>(async (forceRefresh) =>
      rpcBlogPostsUploadImage.$post(payload, {
        headers: await bearerHeaders(forceRefresh),
      }),
    );
  },

  async likeBlogPost(id: string): Promise<RpcBlogLikeResponse> {
    const payload: RpcBlogLikeInput = { clientId: getClientId() };
    const response = await rpcBlogPostLike.$post({
      param: { id },
      json: payload,
    });
    return (await json(response)) as RpcBlogLikeResponse;
  },

  async unlikeBlogPost(id: string): Promise<RpcBlogUnlikeResponse> {
    const payload: RpcBlogUnlikeInput = { clientId: getClientId() };
    const response = await rpcBlogPostUnlike.$post({
      param: { id },
      json: payload,
    });
    return (await json(response)) as RpcBlogUnlikeResponse;
  },

  async sendCustomEmail(
    payload: ApiPayload,
  ): Promise<RpcSendCustomEmailResponse> {
    const jsonPayload = payload as RpcSendCustomEmailInput;
    return rpcJson<RpcSendCustomEmailResponse>(async (forceRefresh) =>
      rpcSendCustomEmail.$post(
        { json: jsonPayload },
        { headers: await bearerHeaders(forceRefresh) },
      ),
    );
  },

  async getEmailJob(jobId: string): Promise<RpcEmailJobGetResponse> {
    return rpcJson<RpcEmailJobGetResponse>(async (forceRefresh) =>
      rpcEmailJobById.$get(
        { param: { jobId } },
        { headers: await bearerHeaders(forceRefresh) },
      ),
    );
  },

  async sendConfirmation(
    formData: ApiPayload,
  ): Promise<RpcSendConfirmationEmailResponse> {
    const payload = asRecord(formData) as RpcSendConfirmationEmailInput;
    return rpcJson<RpcSendConfirmationEmailResponse>(async (forceRefresh) =>
      rpcSendConfirmationEmail.$post(
        { json: payload },
        { headers: await bearerHeaders(forceRefresh) },
      ),
    );
  },

  async listEmailJobs({
    limit = 30,
    type,
  }: ListEmailJobsInput = {}): Promise<RpcEmailJobsListResponse> {
    return rpcJson<RpcEmailJobsListResponse>(async (forceRefresh) =>
      rpcEmailJobs.$get(
        {
          query: {
            limit: String(limit),
            ...(type ? { type: String(type) } : {}),
          },
        },
        { headers: await bearerHeaders(forceRefresh) },
      ),
    );
  },

  async getEmailJobDeliveries(
    jobId: string,
    { limit = 200 }: GetEmailJobDeliveriesInput = {},
  ): Promise<RpcEmailJobDeliveriesResponse> {
    return rpcJson<RpcEmailJobDeliveriesResponse>(async (forceRefresh) =>
      rpcEmailJobDeliveries.$get(
        {
          param: { jobId },
          query: { limit: String(limit) },
        },
        { headers: await bearerHeaders(forceRefresh) },
      ),
    );
  },


  async createAgendaItem(
    payload: RpcAgendaCreateInput,
  ): Promise<RpcAgendaCreateResponse> {
    return rpcJson<RpcAgendaCreateResponse>(async (forceRefresh) =>
      rpcAgendaItems.$post(
        { json: payload },
        { headers: await bearerHeaders(forceRefresh) },
      ),
    );
  },

  async patchAgendaItem(
    id: string,
    patch: RpcAgendaPatchInput,
  ): Promise<RpcAgendaPatchResponse> {
    return rpcJson<RpcAgendaPatchResponse>(async (forceRefresh) =>
      rpcAgendaItemById.$patch(
        {
          param: { id },
          json: patch,
        },
        { headers: await bearerHeaders(forceRefresh) },
      ),
    );
  },

  async deleteAgendaItem(id: string): Promise<RpcAgendaDeleteResponse> {
    return rpcJson<RpcAgendaDeleteResponse>(async (forceRefresh) =>
      rpcAgendaItemById.$delete(
        { param: { id } },
        { headers: await bearerHeaders(forceRefresh) },
      ),
    );
  },

  async reorderAgendaItems(
    payload: RpcAgendaReorderInput,
  ): Promise<RpcAgendaReorderResponse> {
    return rpcJson<RpcAgendaReorderResponse>(async (forceRefresh) =>
      rpcAgendaReorder.$put(
        { json: payload as Record<string, unknown> },
        { headers: await bearerHeaders(forceRefresh) },
      ),
    );
  },


  async inviteStatus(token: string): Promise<RpcInviteStatusResponse> {
    const query: RpcInviteStatusQuery = { token };
    const response = await rpcInvitesStatus.$get({ query });
    return (await json(response)) as RpcInviteStatusResponse;
  },

  async listMenus() {
    const out = await rpcJson<RpcMenusListResponse>(async (forceRefresh) =>
      rpcMenus.$get({}, { headers: await bearerHeaders(forceRefresh) }),
    );
    return asRecord(out).items || [];
  },

  async listMenuAssignments(): Promise<Record<string, unknown>> {
    const out = await rpcJson<RpcListMenuAssignmentsResponse>(async (forceRefresh) =>
      rpcMenuAssignments.$get(
        {},
        { headers: await bearerHeaders(forceRefresh) },
      ),
    );
    return (asRecord(out).assignments as Record<string, unknown>) || {};
  },

  async upsertMenu(
    payload: ApiPayload | null | undefined,
  ): Promise<RpcMenusUpsertResponse> {
    const data = asRecord(payload);
    const coversRaw = Array.isArray(data.covers) ? data.covers : undefined;
    const covers =
      coversRaw?.map((v) => String(v || "").trim()).filter(Boolean) || undefined;
    const jsonPayload: RpcMenusUpsertInput = {
      name: String(data.name || "").trim(),
      ...(data.id !== undefined ? { id: String(data.id || "").trim() } : {}),
      ...(data.priority !== undefined
        ? { priority: Number(data.priority) }
        : {}),
      ...(data.active !== undefined ? { active: !!data.active } : {}),
      ...(data.note !== undefined ? { note: String(data.note ?? "") } : {}),
      ...(covers ? { covers } : {}),
    };
    return rpcJson<RpcMenusUpsertResponse>(async (forceRefresh) =>
      rpcMenus.$post(
        { json: jsonPayload },
        { headers: await bearerHeaders(forceRefresh) },
      ),
    );
  },

  async deleteMenu(menuId: string): Promise<RpcMenusDeleteResponse> {
    return rpcJson<RpcMenusDeleteResponse>(async (forceRefresh) =>
      rpcMenuById.$delete(
        { param: { menuId } },
        { headers: await bearerHeaders(forceRefresh) },
      ),
    );
  },

  async setGuestMenu(
    guestId: string,
    payload: RpcSetGuestMenuInput,
  ): Promise<RpcSetGuestMenuResponse> {
    return rpcJson<RpcSetGuestMenuResponse>(async (forceRefresh) =>
      rpcMenuAssignmentByGuest.$put(
        {
          param: { guestId },
          json: payload,
        },
        { headers: await bearerHeaders(forceRefresh) },
      ),
    );
  },

  async autoAssignMenus(
    assignmentsMap: Record<string, unknown>,
  ): Promise<RpcAutoAssignMenusResponse> {
    const payload: RpcAutoAssignMenusInput = { assignmentsMap };
    return rpcJson<RpcAutoAssignMenusResponse>(async (forceRefresh) =>
      rpcMenuAutoAssign.$post(
        { json: payload },
        { headers: await bearerHeaders(forceRefresh) },
      ),
    );
  },

};
