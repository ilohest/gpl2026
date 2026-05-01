<!-- src/components/superadmin/SuperAdminAccessDialog.vue -->
<template>
  <Dialog
    v-model:visible="visibleProxy"
    modal
    :style="{ width: width, maxWidth: '95vw' }"
    @hide="handleHide"
  >
    <template #header>
      <div class="flex items-center gap-2">
        <span class="font-bold">{{ headerText }}</span>
        <Button
          v-if="mode === 'invite' && !showInviteHelp"
          text
          rounded
          size="small"
          icon="pi pi-info-circle"
          severity="secondary"
          class="p-0"
          aria-label="Help"
          @click="openInviteHelp"
        />
      </div>
    </template>

    <div class="space-y-4">
      <!-- Subject label (email/user) -->
      <div
        v-if="subjectText"
        class="text-xs opacity-70"
      >
        {{ subjectText }}
      </div>

      <Message
        v-if="mode === 'invite' && showInviteHelp"
        severity="info"
        closable
        @close="closeInviteHelp"
        class="mt-2"
      >
        <ul class="text-xs text-left list-disc pl-4 space-y-1">
          <li>{{ t("superadmin.invite.helper_point_1") }}</li>
          <li>{{ t("superadmin.invite.helper_point_2") }}</li>
          <li>{{ t("superadmin.invite.helper_point_3") }}</li>
          <li>{{ t("superadmin.invite.helper_point_4") }}</li>
        </ul>
      </Message>

      <!-- INVITE MODE -->
      <div
        v-if="mode === 'invite'"
        class="space-y-4"
      >
        <!-- Identity -->
        <div class="grid grid-cols-1 md:grid-cols-12 gap-4">
          <div class="md:col-span-4">
            <label class="text-xs opacity-70 block mb-1">
              {{ labels.name }}
            </label>
            <InputText
              v-model="inviteDraftProxy.displayName"
              class="w-full"
              :placeholder="placeholders.name"
            />
          </div>

          <div class="md:col-span-8">
            <label class="text-xs opacity-70 block mb-1">
              {{ labels.email }}
            </label>
            <InputText
              v-model="inviteDraftProxy.email"
              class="w-full"
              type="email"
              autocomplete="email"
              :placeholder="placeholders.email"
            />
          </div>
        </div>

        <!-- Permissions editor -->
        <PermissionsEditor
          :t="t"
          :permission-groups="permissionGroups"
          v-model="inviteDraftProxy.permissions"
          :help-text="texts.permissionsHelp"
          :bulk-title="texts.bulkTitle"
          :bulk-read-label="texts.bulkRead"
          :bulk-write-label="texts.bulkWrite"
          :bulk-check-all-label="texts.bulkCheckAll"
          :bulk-clear-all-label="texts.bulkClearAll"
          :superadmin-warning-text="texts.superadminWarning"
          :superadmin-locks-other-perms-text="texts.superadminLocks"
          :permission-label="permissionLabel"
        />

        <!-- Result block -->
        <div
          v-if="inviteResult?.link"
          class="border rounded-xl p-3 space-y-2"
        >
          <div class="text-sm font-semibold">{{ texts.createdTitle }}</div>

          <div class="text-xs opacity-70">
            {{ texts.createdHint }}
          </div>

          <div class="flex items-center gap-2">
            <InputText
              class="w-full"
              :model-value="inviteResult.link"
              readonly
            />
            <Button
              size="small"
              icon="pi pi-copy"
              severity="secondary"
              outlined
              :label="texts.copyLink"
              @click="$emit('copy-link')"
            />
          </div>
        </div>

        <!-- Actions -->
        <div class="pt-2 grid grid-cols-1 gap-2">
          <Message
            severity="warn"
            :closable="false"
          >
            <div class="text-xs text-left">
              {{ texts.copyHint }}
            </div>
          </Message>

          <Button
            size="small"
            icon="pi pi-plus"
            class="w-full !bg-[var(--accent-color)] !border-[var(--accent-color)]"
            :label="texts.createOnly"
            :loading="loadingCreate"
            @click="$emit('create-invite')"
          />

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <Button
              size="small"
              icon="pi pi-send"
              class="w-full"
              severity="secondary"
              outlined
              :label="texts.sendInvite"
              :loading="loadingCreate || loadingSend"
              :disabled="!canSend"
              @click="$emit('send-invite')"
            />

            <Button
              size="small"
              icon="pi pi-copy"
              class="w-full"
              severity="secondary"
              outlined
              :label="texts.copyLink"
              :disabled="!inviteResult?.token"
              @click="$emit('copy-link')"
            />
          </div>
        </div>
      </div>

      <!-- USER PERMS MODE -->
      <div
        v-else
        class="space-y-4"
      >
        <PermissionsEditor
          :t="t"
          :permission-groups="permissionGroups"
          v-model="editPermsProxy"
          :help-text="texts.permissionsHelp"
          :bulk-title="texts.bulkTitle"
          :bulk-read-label="texts.bulkRead"
          :bulk-write-label="texts.bulkWrite"
          :bulk-check-all-label="texts.bulkCheckAll"
          :bulk-clear-all-label="texts.bulkClearAll"
          :superadmin-warning-text="texts.superadminWarning"
          :superadmin-locks-other-perms-text="texts.superadminLocks"
          :permission-label="permissionLabel"
        />

        <div class="flex justify-end gap-2 pt-2">
          <Button
            size="small"
            icon="pi pi-times"
            severity="secondary"
            :label="texts.cancel"
            @click="visibleProxy = false"
          />
          <Button
            size="small"
            icon="pi pi-save"
            class="!bg-[var(--accent-color)] !border-[var(--accent-color)]"
            :label="texts.save"
            :loading="loadingSave"
            @click="$emit('save-user-perms')"
          />
        </div>
      </div>
    </div>
  </Dialog>
</template>

<script setup>
import { computed, ref } from "vue";

import Dialog from "primevue/dialog";
import Button from "primevue/button";
import InputText from "primevue/inputtext";
import Message from "primevue/message";

import PermissionsEditor from "./PermissionsEditor.vue";

const props = defineProps({
  t: { type: Function, required: true },

  visible: { type: Boolean, default: false },
  mode: { type: String, default: "invite" }, // 'invite' | 'userPerms'

  headerText: { type: String, default: "" },
  subjectText: { type: String, default: "" },
  width: { type: String, default: "680px" },

  // Permission model
  permissionGroups: { type: Array, required: true },
  permissionLabel: { type: Function, required: true },

  // Invite draft v-model
  inviteDraft: {
    type: Object,
    default: () => ({
      email: "",
      displayName: "",
      permissions: [],
    }),
  },

  // Edit perms v-model
  editPerms: { type: Array, default: () => [] },

  // Result for invite creation
  inviteResult: { type: Object, default: null }, // { token, link } | null

  // Loading flags
  loadingCreate: { type: Boolean, default: false },
  loadingSend: { type: Boolean, default: false },
  loadingSave: { type: Boolean, default: false },

  // Labels/texts from parent (already translated)
  labels: {
    type: Object,
    default: () => ({ name: "", email: "" }),
  },
  placeholders: {
    type: Object,
    default: () => ({ name: "", email: "" }),
  },
  texts: {
    type: Object,
    default: () => ({
      permissionsHelp: "",
      bulkTitle: "",
      bulkRead: "",
      bulkWrite: "",
      bulkCheckAll: "",
      bulkClearAll: "",
      superadminWarning: "",
      superadminLocks: "",
      createdTitle: "",
      createdHint: "",
      createOnly: "",
      sendInvite: "",
      copyLink: "",
      copyHint: "",
      cancel: "",
      save: "",
    }),
  },
});

const emit = defineEmits([
  "update:visible",
  "update:inviteDraft",
  "update:editPerms",
  "hide",

  // actions
  "create-invite",
  "send-invite",
  "copy-link",
  "save-user-perms",
]);

/* v-model proxies */
const visibleProxy = computed({
  get: () => props.visible,
  set: (v) => emit("update:visible", !!v),
});

const inviteDraftProxy = computed({
  get: () => props.inviteDraft,
  set: (v) => emit("update:inviteDraft", v),
});

const editPermsProxy = computed({
  get: () => props.editPerms,
  set: (v) => emit("update:editPerms", Array.isArray(v) ? v : []),
});

const canSend = computed(() => {
  const email = String(inviteDraftProxy.value?.email || "").trim();
  return !!email;
});

const INVITE_HELP_STORAGE_KEY = "help:superadmin:invite-dialog";

function getInitialInviteHelpVisibility() {
  if (typeof window === "undefined") return true;
  try {
    return window.localStorage.getItem(INVITE_HELP_STORAGE_KEY) !== "hidden";
  } catch {
    return true;
  }
}

const showInviteHelp = ref(getInitialInviteHelpVisibility());

function closeInviteHelp() {
  showInviteHelp.value = false;
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(INVITE_HELP_STORAGE_KEY, "hidden");
  } catch {
    // ignore localStorage failures
  }
}

function openInviteHelp() {
  showInviteHelp.value = true;
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(INVITE_HELP_STORAGE_KEY);
  } catch {
    // ignore localStorage failures
  }
}

function handleHide() {
  emit("hide");
}
</script>
