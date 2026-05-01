<!-- src/pages/SuperAdminPage.vue -->
<template>
  <div class="superadmin-shell max-w-[1400px] mx-auto">
    <div class="superadmin-layout">
      <aside class="superadmin-sidebar hidden min-[1025px]:block">
        <div class="superadmin-sidebar__brand">
          <p class="superadmin-sidebar__eyebrow">{{ t("superadmin.title") }}</p>
        </div>
        <div class="superadmin-sidebar__links">
          <button
            v-for="item in navItems"
            :key="item.key"
            type="button"
            class="superadmin-nav-link"
            :class="{ 'is-active': isMenuItemActive(item.key) }"
            @click="openSection(item.key)"
          >
            <span class="inline-flex items-center gap-2">
              <i class="text-sm" :class="item.icon" aria-hidden="true"></i>
              <span>{{ item.label }}</span>
            </span>
          </button>
        </div>
      </aside>

      <div class="superadmin-content">
        <div
          class="min-[1025px]:hidden sticky top-0 z-10 bg-primary/95 backdrop-blur border-b border-black/10 px-4 py-3 mb-4"
        >
          <p class="text-[11px] uppercase tracking-wide opacity-60">
            {{ t("header.superadmin", "Superadmin") }}
          </p>
          <p class="text-base font-semibold leading-tight truncate">
            {{ currentNavLabel }}
          </p>
        </div>
        <div
          v-if="!currentSection"
          class="grid grid-cols-1 md:grid-cols-2 gap-4"
        >
          <Card class="superadmin-bento-card">
            <template #title>
              <p class="superadmin-bento-title">
                <i class="pi pi-users"></i>
                {{ t("superadmin.tabs.users") }}
              </p>
            </template>
            <template #content>
              <p class="superadmin-bento-value">{{ users.length }}</p>
              <p class="superadmin-bento-subtitle">
                {{ t("superadmin.tabs.users") }}
              </p>
              <p class="text-sm flex justify-between gap-2 mt-2">
                <span>{{ t("superadmin.title") }}</span>
                <strong>{{ superadminUsersCount }}</strong>
              </p>
              <div class="superadmin-bento-cta">
                <Button
                  size="small"
                  class="superadmin-bento-cta__btn"
                  :label="t('admin.bento.open_section')"
                  icon="pi pi-arrow-right"
                  icon-pos="right"
                  @click="openUsersSection"
                />
              </div>
            </template>
          </Card>

          <Card class="superadmin-bento-card">
            <template #title>
              <p class="superadmin-bento-title">
                <i class="pi pi-envelope"></i>
                {{ t("superadmin.tabs.invites") }}
              </p>
            </template>
            <template #content>
              <div class="space-y-2">
                <div class="superadmin-invites-status-row">
                  <Tag
                    class="superadmin-invites-status-tag"
                    severity="info"
                    :value="t('superadmin.invite.status_active')"
                  />
                  <strong>{{ inviteStatusCounts.active }}</strong>
                </div>
                <div class="superadmin-invites-status-row">
                  <Tag
                    class="superadmin-invites-status-tag"
                    severity="success"
                    :value="t('superadmin.invite.status_accepted')"
                  />
                  <strong>{{ inviteStatusCounts.accepted }}</strong>
                </div>
                <div class="superadmin-invites-status-row">
                  <Tag
                    class="superadmin-invites-status-tag"
                    severity="danger"
                    :value="t('superadmin.invite.status_revoked')"
                  />
                  <strong>{{ inviteStatusCounts.revoked }}</strong>
                </div>
              </div>
              <div class="superadmin-bento-cta">
                <Button
                  size="small"
                  class="superadmin-bento-cta__btn"
                  :label="t('admin.bento.open_section')"
                  icon="pi pi-arrow-right"
                  icon-pos="right"
                  @click="openInvitesSection"
                />
              </div>
            </template>
          </Card>
        </div>

        <div v-else-if="currentSection === 'users'">
          <Card :style="{ border: '1px solid var(--accent-color)' }">
            <template #title>
              <div class="flex items-center justify-between gap-3">
                <p class="superadmin-bento-title">
                  <i class="pi pi-users" aria-hidden="true"></i>
                  {{ t("superadmin.tabs.users") }}
                </p>
                <p class="text-xs opacity-70 whitespace-nowrap">
                  {{ users.length }} {{ t("superadmin.tabs.users") }}
                </p>
              </div>
            </template>

            <template #content>
              <DataTable
                :value="users"
                paginator
                :rows="usersTableRows"
                :rows-per-page-options="superadminRowsPerPageOptions"
                responsive-layout="scroll"
                class="superadmin-datatable"
                @page="onUsersTablePage"
              >
                <Column field="emailLower" :header="t('superadmin.user.email')">
                  <template #body="{ data }">
                    <span class="text-sm">{{ data.emailLower }}</span>
                  </template>
                </Column>

                <Column :header="t('superadmin.user.permissions')">
                  <template #body="{ data }">
                    <div class="flex flex-wrap gap-1">
                      <span
                        v-for="chip in permissionPreviewItems(
                          normalizeUserPerms(data),
                        )"
                        :key="chip.key"
                        v-tooltip.top="chip.tooltip"
                        class="perm-chip text-xs"
                        :class="chip.className"
                      >
                        <i :class="chip.icon" />
                        <span>{{ chip.label }}</span>
                      </span>
                      <Button
                        size="small"
                        v-if="
                          permissionHiddenCount(normalizeUserPerms(data)) > 0
                        "
                        text
                        class="!px-2 !py-1 text-xs"
                        :label="`+${permissionHiddenCount(normalizeUserPerms(data))}`"
                        @click="
                          openPermissionsPopover(
                            $event,
                            normalizeUserPerms(data),
                            {
                              withGroup: true,
                              title: t('superadmin.user.permissions'),
                            },
                          )
                        "
                      />
                      <span
                        v-if="!normalizeUserPerms(data).length"
                        class="opacity-60 text-xs"
                      >
                        —
                      </span>
                    </div>
                  </template>
                </Column>

                <Column :header="t('superadmin.user.ai_chat')">
                  <template #body="{ data }">
                    <span
                      class="inline-flex h-6 w-6 items-center justify-center rounded-full border"
                      :class="
                        userCanUseAiChat(data)
                          ? 'bg-emerald-50 border-emerald-300 text-emerald-700'
                          : 'bg-red-50 border-red-300 text-red-700'
                      "
                    >
                      <i
                        :class="
                          userCanUseAiChat(data) ? 'pi pi-check' : 'pi pi-ban'
                        "
                      />
                    </span>
                  </template>
                </Column>

                <Column :header="t('superadmin.user.invited_by')">
                  <template #body="{ data }">
                    <div class="text-sm">
                      {{ data.invitedByEmail || data.invitedByUid || "—" }}
                    </div>
                  </template>
                </Column>

                <Column
                  :header="t('common.actions')"
                  :style="{ width: '160px' }"
                >
                  <template #body="{ data }">
                    <Button
                      icon="pi pi-pencil"
                      size="small"
                      text
                      :label="t('common.edit')"
                      @click="openEditUserPerms(data)"
                    />
                  </template>
                </Column>
              </DataTable>
            </template>
          </Card>
        </div>

        <div v-else-if="currentSection === 'invites'">
          <Card :style="{ border: '1px solid var(--accent-color)' }">
            <template #title>
              <div class="flex items-center justify-between gap-3">
                <p class="superadmin-bento-title">
                  <i class="pi pi-envelope" aria-hidden="true"></i>
                  {{ t("superadmin.tabs.invites") }}
                </p>
                <div class="flex items-center gap-3">
                  <p class="text-xs opacity-70 whitespace-nowrap">
                    {{ invites.length }} {{ t("superadmin.tabs.invites") }}
                  </p>
                  <Button
                    size="small"
                    icon="pi pi-plus"
                    class="btn-accent"
                    :label="t('superadmin.invite.create_title')"
                    @click="openInviteDialog()"
                  />
                </div>
              </div>
            </template>

            <template #content>
              <DataTable
                :value="invites"
                paginator
                :rows="invitesTableRows"
                :rows-per-page-options="superadminRowsPerPageOptions"
                responsive-layout="scroll"
                :loading="loading"
                class="superadmin-datatable"
                @page="onInvitesTablePage"
              >
                <template #empty>
                  <ContentViewer
                    class="py-4"
                    :content="`<strong>${t('superadmin.invite.empty_title')}</strong><br/>${t('superadmin.invite.empty_hint')}`"
                  />
                </template>

                <template #loading>
                  <div class="py-8 text-center text-sm opacity-70">
                    {{ t("common.loading") }}
                  </div>
                </template>

                <Column :header="t('superadmin.invite.name')">
                  <template #body="{ data }">
                    <div class="text-sm">
                      {{ data.displayName || "—" }}
                    </div>
                  </template>
                </Column>

                <Column
                  field="emailLower"
                  :header="t('superadmin.invite.email')"
                >
                  <template #body="{ data }">
                    <div class="text-sm">
                      {{ data.emailLower || data.email || "—" }}
                    </div>
                  </template>
                </Column>

                <Column :header="t('superadmin.invite.permissions')">
                  <template #body="{ data }">
                    <div class="flex flex-wrap gap-1">
                      <span
                        v-for="chip in permissionPreviewItems(
                          normalizePerms(data),
                        )"
                        :key="chip.key"
                        v-tooltip.top="chip.tooltip"
                        class="perm-chip text-xs"
                        :class="chip.className"
                      >
                        <i :class="chip.icon" />
                        <span>{{ chip.label }}</span>
                      </span>
                      <Button
                        size="small"
                        v-if="permissionHiddenCount(normalizePerms(data)) > 0"
                        text
                        class="!px-2 !py-1 text-xs"
                        :label="`+${permissionHiddenCount(normalizePerms(data))}`"
                        @click="
                          openPermissionsPopover($event, normalizePerms(data), {
                            withGroup: true,
                            title: t('superadmin.invite.permissions'),
                          })
                        "
                      />
                      <span
                        v-if="!normalizePerms(data).length"
                        class="opacity-60 text-xs"
                      >
                        —
                      </span>
                    </div>
                  </template>
                </Column>

                <Column :header="t('superadmin.invite.expires_at')">
                  <template #body="{ data }">
                    <div class="text-sm">
                      {{ formatTs(data.expiresAt) }}
                    </div>
                  </template>
                </Column>

                <Column :header="t('superadmin.invite.status')">
                  <template #body="{ data }">
                    <Tag
                      v-if="data.revokedAt"
                      severity="danger"
                      :value="t('superadmin.invite.status_revoked')"
                    />
                    <Tag
                      v-else-if="data.acceptedAt"
                      severity="success"
                      :value="t('superadmin.invite.status_accepted')"
                    />
                    <Tag
                      v-else
                      severity="info"
                      :value="t('superadmin.invite.status_active')"
                    />
                  </template>
                </Column>

                <Column
                  :header="t('superadmin.invite.actions')"
                  :style="{ width: '150px' }"
                >
                  <template #body="{ data }">
                    <div class="flex justify-end">
                      <Button
                        icon="pi pi-ban"
                        size="small"
                        :label="t('superadmin.invite.revoke')"
                        severity="danger"
                        text
                        :disabled="!!data.revokedAt || !!data.acceptedAt"
                        @click="revokeInvite(data.id)"
                      />
                    </div>
                  </template>
                </Column>
              </DataTable>
            </template>
          </Card>
        </div>

        <Popover ref="permissionsPopover">
          <div class="max-w-[360px] space-y-2">
            <div
              v-if="popoverPermissionTitle"
              class="text-xs font-semibold opacity-70"
            >
              {{ popoverPermissionTitle }}
            </div>
            <div class="space-y-2">
              <div
                v-for="row in popoverPermissionRows"
                :key="row.key"
                class="perm-row"
              >
                <div class="perm-row-label text-xs">
                  {{ row.label }}
                </div>
                <div class="flex flex-wrap gap-1.5">
                  <span
                    v-for="chip in row.chips"
                    :key="chip.key"
                    v-tooltip.top="chip.tooltip"
                    class="perm-chip perm-chip-popover perm-chip-action text-xs"
                    :class="chip.className"
                  >
                    <i :class="chip.icon" />
                  </span>
                </div>
              </div>
            </div>
          </div>
        </Popover>
      </div>
    </div>

    <!-- ACCESS DIALOG -->
    <SuperAdminAccessDialog
      :t="t"
      v-model:visible="accessDialogVisible"
      :mode="accessDialogMode"
      :header-text="accessDialogHeader"
      :subject-text="accessDialogSubject"
      :permission-groups="permissionGroups"
      :permission-label="permissionLabel"
      v-model:invite-draft="inviteDraft"
      v-model:edit-perms="editPerms"
      :invite-result="inviteResult"
      :loading-create="creatingInvite"
      :loading-send="sendingInvite"
      :loading-save="savingUserPerms"
      :labels="{
        name: t('superadmin.invite.name'),
        email: t('superadmin.invite.email'),
      }"
      :placeholders="{
        name: t('superadmin.invite.name_placeholder'),
        email: t('superadmin.invite.email_placeholder'),
      }"
      :texts="accessDialogTexts"
      @hide="onAccessDialogHide"
      @create-invite="createInviteOnly"
      @send-invite="sendInvite"
      @copy-link="copyInviteLink"
      @save-user-perms="saveEditPerms"
    />

    <AdminAiChat
      scope="superadmin"
      :page-context="`superadmin:${currentSection || 'dashboard'}`"
    />
  </div>
</template>

<script setup>
import {
  ref,
  onMounted,
  computed,
  watch,
  onBeforeUnmount,
  defineAsyncComponent,
} from "vue";
import { useRouter, useRoute } from "vue-router";
import { useLang } from "@/composables/useLang";
import { api } from "@/services/api";

import Card from "primevue/card";
import Button from "primevue/button";
import DataTable from "primevue/datatable";
import Column from "primevue/column";
import Tag from "primevue/tag";
import Popover from "primevue/popover";
import { useToast } from "primevue/usetoast";

import ContentViewer from "@/components/utils/ContentViewer.vue";

import SuperAdminAccessDialog from "@/components/superadmin/SuperAdminAccessDialog.vue";
import { hasPermission } from "@/utils/permissions";
const AdminAiChat = defineAsyncComponent(
  () => import("@/components/admin/AdminAiChat.vue"),
);

const { t } = useLang();
const router = useRouter();
const route = useRoute();
const toast = useToast();

const loading = ref(false);
const currentSection = ref(null);

const invites = ref([]);
const users = ref([]);
const auditLogs = ref([]);

const creatingInvite = ref(false);
const sendingInvite = ref(false);
const savingUserPerms = ref(false);
const permissionsPopover = ref(null);
const popoverPermissionRows = ref([]);
const popoverPermissionTitle = ref("");
const SUPERADMIN_USERS_TABLE_ROWS_STORAGE_KEY =
  "datatable:superadmin:users:rows";
const SUPERADMIN_INVITES_TABLE_ROWS_STORAGE_KEY =
  "datatable:superadmin:invites:rows";
const superadminRowsPerPageOptions = [10, 20, 50, 100];

function getInitialPageSize(storageKey, defaultSize, allowedSizes) {
  if (typeof window === "undefined") return defaultSize;
  try {
    const rawValue = Number(window.localStorage.getItem(storageKey));
    return allowedSizes.includes(rawValue) ? rawValue : defaultSize;
  } catch {
    return defaultSize;
  }
}

function persistPageSize(storageKey, nextSize, allowedSizes) {
  if (typeof window === "undefined") return;
  if (!allowedSizes.includes(nextSize)) return;
  try {
    window.localStorage.setItem(storageKey, String(nextSize));
  } catch {
    // ignore localStorage failures
  }
}

const usersTableRows = ref(
  getInitialPageSize(
    SUPERADMIN_USERS_TABLE_ROWS_STORAGE_KEY,
    10,
    superadminRowsPerPageOptions,
  ),
);
const invitesTableRows = ref(
  getInitialPageSize(
    SUPERADMIN_INVITES_TABLE_ROWS_STORAGE_KEY,
    10,
    superadminRowsPerPageOptions,
  ),
);

const allowedSections = ["users", "invites"];
const navItems = computed(() => [
  { key: "dashboard", label: t("admin.nav.dashboard"), icon: "pi pi-home" },
  { key: "users", label: t("superadmin.tabs.users"), icon: "pi pi-users" },
  {
    key: "invites",
    label: t("superadmin.tabs.invites"),
    icon: "pi pi-envelope",
  },
]);
const currentNavLabel = computed(() => {
  const key = currentSection.value || "dashboard";
  return (
    navItems.value.find((item) => item.key === key)?.label ||
    t("admin.nav.dashboard")
  );
});

const superadminUsersCount = computed(
  () =>
    users.value.filter((u) => normalizeUserPerms(u).includes("superadmin:all"))
      .length,
);
const inviteStatusCounts = computed(() => {
  const counts = { active: 0, accepted: 0, revoked: 0 };
  for (const invite of invites.value) {
    if (invite?.revokedAt) counts.revoked += 1;
    else if (invite?.acceptedAt) counts.accepted += 1;
    else counts.active += 1;
  }
  return counts;
});

function isMenuItemActive(sec) {
  if (sec === "dashboard") return !currentSection.value;
  return currentSection.value === sec;
}

function goBackToDashboard() {
  router.push({ path: "/sa", query: {} });
}

function openSection(section) {
  if (section === "dashboard") {
    goBackToDashboard();
    return;
  }
  if (!allowedSections.includes(section)) return;
  router.push({ path: "/sa", query: { section } });
}

function openUsersSection() {
  openSection("users");
}

function openInvitesSection() {
  openSection("invites");
}

function syncSectionFromRoute() {
  const sec = route.query.section;
  if (typeof sec === "string" && allowedSections.includes(sec)) {
    currentSection.value = sec;
  } else {
    currentSection.value = null;
  }
}

watch(
  () => route.query.section,
  () => {
    syncSectionFromRoute();
  },
  { immediate: true },
);

function onUsersTablePage(event) {
  const nextSize = Number(event?.rows);
  if (!superadminRowsPerPageOptions.includes(nextSize)) return;
  usersTableRows.value = nextSize;
  persistPageSize(
    SUPERADMIN_USERS_TABLE_ROWS_STORAGE_KEY,
    nextSize,
    superadminRowsPerPageOptions,
  );
}

function onInvitesTablePage(event) {
  const nextSize = Number(event?.rows);
  if (!superadminRowsPerPageOptions.includes(nextSize)) return;
  invitesTableRows.value = nextSize;
  persistPageSize(
    SUPERADMIN_INVITES_TABLE_ROWS_STORAGE_KEY,
    nextSize,
    superadminRowsPerPageOptions,
  );
}

/* ----------------
   Unified Dialog state
---------------- */
const accessDialogVisible = ref(false);
const accessDialogMode = ref("invite"); // 'invite' | 'userPerms'

const inviteDraft = ref({
  email: "",
  displayName: "",
  permissions: [],
});

/**
 * inviteResult persists ONLY while dialog is open.
 * { token, link }
 */
const inviteResult = ref(null);

const editUser = ref(null);
const editPerms = ref([]);

/**
 * Permission groups (unchanged)
 */
const permissionGroups = [
  {
    key: "core",
    labelKey: "superadmin.perms.group.core",
    items: [
      {
        itemLabelKey: "superadmin.perms.item.superadmin_all",
        value: "superadmin:all",
        danger: true,
      },
    ],
  },
  {
    key: "rsvp",
    labelKey: "superadmin.perms.group.rsvp",
    items: [
      { itemLabelKey: "superadmin.perms.read", value: "rsvp:read" },
      { itemLabelKey: "superadmin.perms.write", value: "rsvp:write" },
    ],
  },
  {
    key: "playlist",
    labelKey: "superadmin.perms.group.playlist",
    items: [
      { itemLabelKey: "superadmin.perms.read", value: "playlist:read" },
      { itemLabelKey: "superadmin.perms.write", value: "playlist:write" },
    ],
  },
  {
    key: "blog",
    labelKey: "superadmin.perms.group.blog",
    items: [{ itemLabelKey: "superadmin.perms.write", value: "blog:write" }],
  },
  {
    key: "menus_seating",
    labelKey: "superadmin.perms.group.menus_seating",
    items: [
      { itemLabelKey: "superadmin.perms.read", value: "menus_seating:read" },
      { itemLabelKey: "superadmin.perms.write", value: "menus_seating:write" },
    ],
  },
  {
    key: "finances",
    labelKey: "superadmin.perms.group.finances",
    items: [
      { itemLabelKey: "superadmin.perms.read", value: "finances:read" },
      { itemLabelKey: "superadmin.perms.write", value: "finances:write" },
    ],
  },
  {
    key: "agenda",
    labelKey: "superadmin.perms.group.agenda",
    items: [
      { itemLabelKey: "superadmin.perms.read", value: "agenda:read" },
      { itemLabelKey: "superadmin.perms.write", value: "agenda:write" },
    ],
  },
  {
    key: "planner",
    labelKey: "superadmin.perms.group.planner",
    items: [
      { itemLabelKey: "superadmin.perms.read", value: "planner:read" },
      { itemLabelKey: "superadmin.perms.write", value: "planner:write" },
    ],
  },
  {
    key: "emails",
    labelKey: "superadmin.perms.group.emails",
    items: [
      { itemLabelKey: "superadmin.perms.read", value: "emails:read" },
      { itemLabelKey: "superadmin.perms.send", value: "emails:send" },
    ],
  },
  {
    key: "ai_chat",
    labelKey: "superadmin.perms.group.ai_chat",
    items: [
      {
        itemLabelKey: "superadmin.perms.item.ai_chat_use",
        value: "ai_chat:use",
      },
    ],
  },
];

const allowedPermissionValues = new Set(
  permissionGroups.flatMap((g) =>
    g.items.map((it) => String(it.value || "").trim()),
  ),
);

function sanitizePermissions(values) {
  const raw = Array.isArray(values) ? values : [];
  const next = new Set(
    raw
      .map((p) => String(p || "").trim())
      .filter((p) => p && allowedPermissionValues.has(p)),
  );

  if (next.has("superadmin:all")) return ["superadmin:all"];

  for (const p of [...next]) {
    const [module, action] = p.split(":");
    if (action === "write") {
      const readPerm = `${module}:read`;
      if (allowedPermissionValues.has(readPerm)) next.add(readPerm);
    }
  }

  if (next.has("emails:send") && allowedPermissionValues.has("emails:read")) {
    next.add("emails:read");
  }

  return [...next];
}

/* ----------------
   Dialog computed texts
---------------- */
const accessDialogHeader = computed(() =>
  accessDialogMode.value === "invite"
    ? t("superadmin.invite.create_title")
    : t("superadmin.user.edit_permissions"),
);

const accessDialogSubject = computed(() =>
  accessDialogMode.value === "userPerms"
    ? editUser.value?.emailLower ||
      editUser.value?.email ||
      editUser.value?.id ||
      ""
    : "",
);

const accessDialogTexts = computed(() => {
  const isInvite = accessDialogMode.value === "invite";

  return {
    permissionsHelp: t("superadmin.invite.permissions_help"),

    bulkTitle: isInvite
      ? t("superadmin.invite.bulk_title")
      : t("superadmin.user.bulk_title"),

    bulkRead: isInvite
      ? t("superadmin.invite.bulk_read_all")
      : t("superadmin.user.bulk_read_all"),

    bulkWrite: isInvite
      ? t("superadmin.invite.bulk_write_all")
      : t("superadmin.user.bulk_write_all"),

    bulkCheckAll: isInvite
      ? t("superadmin.invite.bulk_check_all")
      : t("superadmin.user.bulk_check_all"),

    bulkClearAll: isInvite
      ? t("superadmin.invite.bulk_clear_all")
      : t("superadmin.user.bulk_clear_all"),

    superadminWarning: t("superadmin.perms.superadmin_warning"),

    superadminLocks: isInvite
      ? t("superadmin.invite.superadmin_locks_other_perms")
      : t("superadmin.user.superadmin_locks_other_perms"),

    createdTitle: t("superadmin.invite.created_title", "Invitation créée"),
    createdHint: t(
      "superadmin.invite.created_hint",
      "Copie le lien maintenant : il ne sera plus récupérable après fermeture.",
    ),

    createOnly: t("superadmin.invite.create"),
    sendInvite: t("superadmin.invite.send"),
    copyLink: t("superadmin.invite.copy_link"),
    copyHint: t("superadmin.invite.copy_hint"),

    cancel: t("common.cancel"),
    save: t("common.save"),
  };
});

/* ----------------
   Invite draft helpers (for preview)
---------------- */
const _inviteDraftPermsSorted = computed(() => {
  const arr = Array.isArray(inviteDraft.value.permissions)
    ? [...inviteDraft.value.permissions]
    : [];
  const order = [];
  for (const g of permissionGroups)
    for (const it of g.items) order.push(it.value);
  arr.sort((a, b) => order.indexOf(a) - order.indexOf(b));
  return arr;
});

/* ----------------
   Label helpers 
---------------- */
function findPermMeta(value) {
  const v = String(value || "").trim();
  for (const g of permissionGroups) {
    const it = g.items.find((x) => x.value === v);
    if (it) return { groupKey: g.key, groupLabelKey: g.labelKey, item: it };
  }
  return null;
}

function permissionLabel(value, { withGroup = false } = {}) {
  const meta = findPermMeta(value);
  if (!meta) return String(value || "").trim() || "—";

  const itemLabel = t(meta.item.itemLabelKey);
  if (withGroup && meta.groupKey !== "core") {
    return `${t(meta.groupLabelKey)} · ${itemLabel}`;
  }
  return itemLabel;
}

function permissionChip(value, { withGroup: _withGroup = true } = {}) {
  const key = String(value || "").trim();
  const meta = findPermMeta(key);
  const tooltip = permissionLabel(key, { withGroup: true });
  const label =
    meta && meta.groupKey !== "core"
      ? t(meta.groupLabelKey)
      : permissionLabel(key, { withGroup: false });
  const v = key.toLowerCase();

  if (v === "superadmin:all") {
    return {
      key,
      label,
      icon: "pi pi-shield",
      className: "perm-chip-superadmin",
      tooltip: `${tooltip} — ${t("superadmin.perms.superadmin_warning")}`,
    };
  }

  if (v.endsWith(":read")) {
    return {
      key,
      label,
      icon: "pi pi-book",
      className: "perm-chip-read",
      tooltip,
    };
  }

  if (v.endsWith(":write")) {
    return {
      key,
      label,
      icon: "pi pi-pencil",
      className: "perm-chip-write",
      tooltip,
    };
  }

  if (v.endsWith(":send")) {
    return {
      key,
      label,
      icon: "pi pi-send",
      className: "perm-chip-send",
      tooltip,
    };
  }

  return {
    key,
    label,
    icon: "pi pi-key",
    className: "perm-chip-default",
    tooltip: label,
  };
}

function permissionActionChip(value) {
  const key = String(value || "").trim();
  const v = key.toLowerCase();
  const fullLabel = permissionLabel(key, { withGroup: true });

  if (v === "superadmin:all") {
    return {
      key,
      icon: "pi pi-shield",
      className: "perm-chip-superadmin",
      tooltip: `${fullLabel} — ${t("superadmin.perms.superadmin_warning")}`,
      order: 0,
    };
  }

  if (v.endsWith(":read")) {
    return {
      key,
      icon: "pi pi-book",
      className: "perm-chip-read",
      tooltip: fullLabel,
      order: 1,
    };
  }

  if (v.endsWith(":write")) {
    return {
      key,
      icon: "pi pi-pencil",
      className: "perm-chip-write",
      tooltip: fullLabel,
      order: 2,
    };
  }

  if (v.endsWith(":send")) {
    return {
      key,
      icon: "pi pi-send",
      className: "perm-chip-send",
      tooltip: fullLabel,
      order: 3,
    };
  }

  return {
    key,
    icon: "pi pi-key",
    className: "perm-chip-default",
    tooltip: fullLabel,
    order: 9,
  };
}

function normalizePerms(invite) {
  const p = invite?.permissions ?? invite?.meta?.permissions;
  return sanitizePermissions(p);
}

function normalizeUserPerms(user) {
  const p = user?.permissions;
  return sanitizePermissions(p);
}

function userCanUseAiChat(user) {
  return hasPermission(normalizeUserPerms(user), "ai_chat:use");
}

const MAX_PERMISSIONS_PREVIEW = 3;

function permissionPreviewItems(perms, { withGroup = true } = {}) {
  const list = Array.isArray(perms) ? perms : [];
  return list
    .slice(0, MAX_PERMISSIONS_PREVIEW)
    .map((p) => permissionChip(p, { withGroup }));
}

function permissionHiddenCount(perms) {
  const list = Array.isArray(perms) ? perms : [];
  return Math.max(0, list.length - MAX_PERMISSIONS_PREVIEW);
}

function openPermissionsPopover(
  event,
  perms,
  { withGroup = true, title = "" } = {},
) {
  const list = Array.isArray(perms) ? perms : [];
  if (!list.length) return;

  const rowsMap = new Map();
  for (const p of list) {
    const meta = findPermMeta(p);
    const rowKey = meta?.groupKey || `misc:${p}`;
    const rowLabel = meta
      ? meta.groupKey === "core"
        ? permissionLabel(p, { withGroup: false })
        : t(meta.groupLabelKey)
      : permissionLabel(p, { withGroup });

    if (!rowsMap.has(rowKey)) {
      rowsMap.set(rowKey, { key: rowKey, label: rowLabel, chips: [] });
    }
    rowsMap.get(rowKey).chips.push(permissionActionChip(p));
  }

  const orderByRowKey = (k) => {
    if (k === "core") return -1;
    const idx = permissionGroups.findIndex((g) => g.key === k);
    return idx >= 0 ? idx : 999;
  };

  popoverPermissionRows.value = [...rowsMap.values()]
    .map((r) => ({
      ...r,
      chips: r.chips.sort((a, b) => a.order - b.order),
    }))
    .sort((a, b) => orderByRowKey(a.key) - orderByRowKey(b.key));
  popoverPermissionTitle.value = title;
  permissionsPopover.value?.toggle(event);
}

/* ----------------
   Dialog open/close
---------------- */
function openInviteDialog() {
  accessDialogMode.value = "invite";
  // keep draft, but clear previous result
  inviteResult.value = null;
  accessDialogVisible.value = true;
}

function openEditUserPerms(u) {
  editUser.value = u;
  editPerms.value = sanitizePermissions(u?.permissions);
  accessDialogMode.value = "userPerms";
  accessDialogVisible.value = true;
}

function onAccessDialogHide() {
  // token/link must not persist outside dialog lifecycle
  inviteResult.value = null;
  editUser.value = null;
}

/* ----------------
   API / reload
---------------- */
async function reloadAll({ silent = false } = {}) {
  if (!silent) loading.value = true;

  try {
    const [i, u, a] = await Promise.all([
      api.listInvites(),
      api.listUsers(),
      api.listAuditLogs(),
    ]);

    invites.value = Array.isArray(i?.items) ? i.items : [];
    users.value = Array.isArray(u?.items) ? u.items : [];
    auditLogs.value = Array.isArray(a?.items) ? a.items : [];
  } catch (e) {
    console.error(e);
    toast.add({
      severity: "error",
      summary: t("superadmin.toast.load_failed"),
      detail: String(e?.message || e),
      life: 4000,
    });
  } finally {
    if (!silent) loading.value = false;
  }
}

function inviteLinkFromToken(token) {
  const tkn = String(token || "").trim();
  if (!tkn) return "";
  return `${window.location.origin}/access?token=${encodeURIComponent(tkn)}`;
}

function normalizeErrorCode(error) {
  const candidates = [
    error?.data?.code,
    error?.code,
    error?.data?.message,
    error?.message,
  ];
  for (const value of candidates) {
    const s = String(value || "")
      .trim()
      .toLowerCase();
    if (!s) continue;
    if (/^[a-z0-9_]+$/.test(s)) return s;
  }
  return "";
}

/* ----------------
   Copy link (now uses inviteResult)
---------------- */
async function copyInviteLink() {
  const link = String(inviteResult.value?.link || "").trim();
  if (!link) return;

  try {
    await navigator.clipboard.writeText(link);
    toast.add({
      severity: "success",
      summary: t("superadmin.toast.link_copied"),
      life: 2000,
    });
  } catch {
    try {
      const el = document.createElement("textarea");
      el.value = link;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
      toast.add({
        severity: "success",
        summary: t("superadmin.toast.link_copied"),
        life: 2000,
      });
    } catch (err) {
      toast.add({
        severity: "error",
        summary: t("superadmin.toast.copy_failed"),
        detail: String(err?.message || err),
        life: 3500,
      });
    }
  }
}

/* ----------------
   Create / send invite (uses inviteDraft + inviteResult)
---------------- */
async function createInviteOnly() {
  if (creatingInvite.value) return;

  creatingInvite.value = true;
  inviteResult.value = null;

  try {
    const payload = {
      email: String(inviteDraft.value.email || "").trim(),
      displayName: String(inviteDraft.value.displayName || "").trim(),
      permissions: sanitizePermissions(inviteDraft.value.permissions),
    };

    const res = await api.createInvite(payload);
    const token = String(res?.token || "").trim();
    const link = inviteLinkFromToken(token);
    const expiresAt = res?.invite?.expiresAt || null;

    inviteResult.value = token ? { token, link, expiresAt } : null;

    toast.add({
      severity: "success",
      summary: t("superadmin.toast.invite_created"),
      life: 1800,
    });

    await reloadAll({ silent: true });
  } catch (e) {
    console.error(e);
    const code = normalizeErrorCode(e);
    const detailByCode = {
      email_already_registered: t("superadmin.toast.email_already_registered"),
      missing_email: t("superadmin.toast.missing_email"),
    };
    const detail = detailByCode[code] || String(e?.message || e);
    toast.add({
      severity: "error",
      summary: t("superadmin.toast.invite_create_failed"),
      detail,
      life: 4000,
    });
  } finally {
    creatingInvite.value = false;
  }
}

async function sendInvite() {
  if (creatingInvite.value || sendingInvite.value) return;

  const toEmail = String(inviteDraft.value.email || "").trim();
  if (!toEmail) return;

  // ensure token exists
  if (!inviteResult.value?.token) {
    await createInviteOnly();
  }

  if (!inviteResult.value?.token) {
    toast.add({
      severity: "warn",
      summary: t("superadmin.toast.missing_token"),
      life: 3000,
    });
    return;
  }

  sendingInvite.value = true;
  try {
    await api.sendInviteEmail({
      toEmail,
      link: inviteResult.value.link,
      permissions: sanitizePermissions(inviteDraft.value.permissions),
      expiresAt: inviteResult.value.expiresAt || null,
    });

    toast.add({
      severity: "success",
      summary: t("superadmin.toast.invite_sent"),
      life: 2000,
    });

    await reloadAll({ silent: true });
  } catch (e) {
    console.error(e);
    const code = normalizeErrorCode(e);
    const detailByCode = {
      already_used: t("superadmin.toast.invite_already_used"),
      missing_email: t("superadmin.toast.missing_email"),
      missing_token: t("superadmin.toast.missing_token"),
    };
    const detail = detailByCode[code] || String(e?.message || e);
    toast.add({
      severity: "error",
      summary: t("superadmin.toast.send_failed"),
      detail,
      life: 4500,
    });
  } finally {
    sendingInvite.value = false;
  }
}

/* ----------------
   Revoke invite
---------------- */
async function revokeInvite(inviteId) {
  try {
    await api.revokeInvite(inviteId);
    toast.add({
      severity: "success",
      summary: t("superadmin.toast.invite_revoked"),
      life: 1500,
    });
    await reloadAll({ silent: true });
  } catch (e) {
    console.error(e);
    toast.add({
      severity: "error",
      summary: t("superadmin.toast.revoke_failed"),
      detail: String(e?.message || e),
      life: 3500,
    });
  }
}

/* ----------------
   Save user perms (dialog)
---------------- */
async function saveEditPerms() {
  const u = editUser.value;
  if (!u?.id) return;

  if (savingUserPerms.value) return;
  savingUserPerms.value = true;

  try {
    const perms = sanitizePermissions(editPerms.value);

    await api.updateUserPermissions(u.id, perms);

    toast.add({
      severity: "success",
      summary: t("superadmin.toast.permissions_updated"),
      life: 1500,
    });

    accessDialogVisible.value = false;
    await reloadAll({ silent: true });
  } catch (e) {
    console.error(e);
    toast.add({
      severity: "error",
      summary: t("superadmin.toast.update_failed"),
      detail: String(e?.message || e),
      life: 4000,
    });
  } finally {
    savingUserPerms.value = false;
  }
}

/* ----------------
   Logout / misc
---------------- */
function formatTs(ts) {
  try {
    if (!ts) return "—";

    if (typeof ts?.toDate === "function") {
      const d = ts.toDate();
      return d instanceof Date && !isNaN(d) ? d.toLocaleString() : "—";
    }

    const sec =
      typeof ts?.seconds === "number"
        ? ts.seconds
        : typeof ts?._seconds === "number"
          ? ts._seconds
          : null;

    if (sec != null) {
      const d = new Date(sec * 1000);
      return !isNaN(d) ? d.toLocaleString() : "—";
    }

    if (typeof ts === "number") {
      const d = new Date(ts);
      return !isNaN(d) ? d.toLocaleString() : "—";
    }

    if (typeof ts === "string") {
      const d = new Date(ts);
      return !isNaN(d) ? d.toLocaleString() : "—";
    }

    return "—";
  } catch {
    return "—";
  }
}

let _poll = null;
onMounted(async () => {
  await reloadAll();
  _poll = setInterval(() => reloadAll({ silent: true }), 5000);
});
onBeforeUnmount(() => {
  if (_poll) clearInterval(_poll);
});
</script>

<style scoped>
.superadmin-shell {
  --superadmin-sidebar-bg: #ffffff;
}

.superadmin-layout {
  display: grid;
  grid-template-columns: minmax(220px, 250px) minmax(0, 1fr);
  gap: 1.25rem;
  align-items: start;
}

.superadmin-sidebar {
  position: sticky;
  top: 1rem;
  border-radius: 1rem;
  background: var(--superadmin-sidebar-bg);
  border: 1px solid rgba(15, 23, 42, 0.08);
  box-shadow: 0 10px 30px rgba(15, 23, 42, 0.08);
  padding: 1rem;
}

.superadmin-sidebar__eyebrow {
  font-size: 0.95rem;
  font-weight: 700;
}

.superadmin-sidebar__links {
  margin-top: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.superadmin-nav-link {
  display: flex;
  width: 100%;
  border: 0;
  border-radius: 0.7rem;
  padding: 0.65rem 0.75rem;
  font-size: 0.92rem;
  text-align: left;
  background: transparent;
  color: var(--text-color);
  cursor: pointer;
  transition:
    background-color 0.2s ease,
    transform 0.2s ease;
}

.superadmin-nav-link:hover {
  background: rgba(133, 101, 101, 0.12);
  transform: translateX(1px);
}

.superadmin-nav-link.is-active {
  color: #fff;
  background: var(--menu-active-color);
  box-shadow: 0 8px 20px rgba(133, 101, 101, 0.28);
}

.superadmin-content {
  min-width: 0;
}

:deep(.superadmin-content .p-card) {
  background: #ffffff !important;
  color: var(--text-color) !important;
  border: 1px solid rgba(15, 23, 42, 0.06) !important;
  box-shadow: 0 6px 18px rgba(15, 23, 42, 0.06);
}

.superadmin-bento-card {
  height: 100%;
}

:deep(.superadmin-bento-card .p-card-body) {
  display: flex;
  flex-direction: column;
  height: 100%;
}

:deep(.superadmin-bento-card .p-card-content) {
  display: flex;
  flex-direction: column;
  flex: 1;
}

.superadmin-bento-title {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.78rem;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: rgba(51, 51, 51, 0.7);
}

.superadmin-bento-value {
  font-size: 3rem;
  line-height: 1;
  font-weight: 400;
  text-align: left;
}

.superadmin-bento-subtitle {
  margin-top: 0.5rem;
  font-size: 0.85rem;
  color: rgba(51, 51, 51, 0.68);
  text-align: left;
}

.superadmin-bento-cta {
  margin-top: auto;
  padding-top: 1rem;
}

.superadmin-invites-status-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.85rem;
}

:deep(.superadmin-invites-status-tag.p-tag) {
  font-size: 0.68rem;
  padding: 0.15rem 0.45rem;
}

.superadmin-bento-cta__btn {
  width: 100%;
}

:deep(.superadmin-bento-cta__btn.p-button) {
  background: var(--accent-color) !important;
  border-color: var(--accent-color) !important;
  color: var(--p-primary-contrast-color, #fff) !important;
}

:deep(.superadmin-bento-cta__btn.p-button:hover) {
  background: var(--primary-color) !important;
  border-color: var(--accent-hover-color) !important;
  color: var(--accent-hover-color) !important;
}

:deep(.superadmin-bento-cta__btn.p-button:hover .p-button-label),
:deep(.superadmin-bento-cta__btn.p-button:hover .p-button-icon) {
  color: var(--accent-hover-color) !important;
}

:deep(.superadmin-datatable.p-datatable) {
  font-size: 0.92rem;
}

.superadmin-datatable :deep(.p-datatable-thead > tr > th) {
  font-size: 0.78rem;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: rgba(51, 51, 51, 0.7);
  background: transparent;
}

.superadmin-datatable :deep(.p-datatable-tbody > tr > td) {
  vertical-align: top;
}

.perm-chip {
  align-items: center;
  border-radius: 9999px;
  border: 1px solid transparent;
  display: inline-flex;
  font-weight: 600;
  gap: 0.35rem;
  line-height: 1;
  padding: 0.36rem 0.6rem;
  white-space: nowrap;
}

.perm-chip i {
  font-size: 0.72rem;
}

.perm-chip-read {
  background: #eaf4ff;
  border-color: #cfe4fb;
  color: #165d99;
}

.perm-chip-write {
  background: #fff4e6;
  border-color: #ffe0b8;
  color: #9a5a00;
}

.perm-chip-send {
  background: #e9fbf6;
  border-color: #c7f2e4;
  color: #116a53;
}

.perm-chip-superadmin {
  background: #ffecef;
  border-color: #ffd1d8;
  color: #9e1737;
}

.perm-chip-default {
  background: #edf2f7;
  border-color: #d7e0ea;
  color: #34495e;
}

.perm-chip-popover {
  display: flex;
  width: fit-content;
}

.perm-chip-action {
  min-width: 1.7rem;
  justify-content: center;
  padding: 0.32rem 0.45rem;
}

.perm-row {
  align-items: center;
  display: flex;
  gap: 0.6rem;
  justify-content: space-between;
}

.perm-row-label {
  color: #34495e;
  font-weight: 600;
  min-width: 120px;
}

:deep(.p-tooltip .p-tooltip-text) {
  font-size: 0.72rem;
  line-height: 1.2;
}

@media (max-width: 1024px) {
  .superadmin-layout {
    grid-template-columns: 1fr;
  }

  .superadmin-sidebar {
    position: static;
  }

  .superadmin-sidebar__links {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 640px) {
  .superadmin-sidebar__links {
    grid-template-columns: 1fr;
  }
}
</style>
