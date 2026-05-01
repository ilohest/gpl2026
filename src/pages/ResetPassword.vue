<!-- src/pages/ResetPassword.vue -->
<template>
  <div class="max-w-xl mx-auto p-4 md:p-6 space-y-4">
    <Card :style="{ border: '1px solid var(--accent-color)' }">
      <template #title>
        <div class="flex items-center gap-2">
          <i class="pi pi-key text-sm" />
          <p class="font-bold text-left">
            {{ t("auth.reset_title", "Reset password") }}
          </p>
        </div>
      </template>

      <template #content>
        <div class="space-y-4 text-sm">
          <div
            v-if="loading"
            class="text-xs opacity-70"
          >
            {{ t("common.loading", "Loading…") }}
          </div>

          <div
            v-else-if="fatalError"
            class="border rounded-xl p-3 bg-black/[0.02]"
          >
            <div class="font-medium">
              {{ t("auth.reset_invalid_title", "Invalid or expired link") }}
            </div>
            <div class="text-xs opacity-70 mt-1">
              {{ fatalError }}
            </div>

            <Button
              size="small"
              class="mt-3 w-full"
              severity="secondary"
              outlined
              icon="pi pi-envelope"
              :label="t('auth.reset_request_new', 'Request a new link')"
              @click="goProfileOrAccess"
            />
          </div>

          <div
            v-else
            class="space-y-3"
          >
            <div class="text-xs opacity-70">
              {{ t("auth.reset_for", "Reset for") }}: {{ email || "—" }}
            </div>

            <div class="space-y-2">
              <label class="text-xs opacity-70 block">
                {{ t("auth.new_password", "New password") }}
              </label>

              <!-- ✅ FIX: explicit modelValue wiring -->
              <Password
                :model-value="p1"
                @update:model-value="(v) => (p1 = v)"
                toggle-mask
                :feedback="true"
                class="w-full"
                input-class="w-full"
              />
            </div>

            <div class="space-y-2">
              <label class="text-xs opacity-70 block">
                {{ t("auth.confirm_password", "Confirm password") }}
              </label>

              <!-- ✅ FIX: explicit modelValue wiring -->
              <Password
                :model-value="p2"
                @update:model-value="(v) => (p2 = v)"
                toggle-mask
                :feedback="false"
                class="w-full"
                input-class="w-full"
              />
            </div>

            <Button
              size="small"
              icon="pi pi-check"
              class="w-full !bg-[var(--accent-color)] !border-[var(--accent-color)]"
              :label="t('auth.reset_submit', 'Update password')"
              :loading="saving"
              :disabled="!canSubmit"
              @click="submit"
            />

            <Button
              size="small"
              icon="pi pi-arrow-left"
              severity="secondary"
              text
              class="w-full"
              :label="t('common.back', 'Back')"
              @click="goHome"
            />
          </div>
        </div>
      </template>
    </Card>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useToast } from "primevue/usetoast";
import Card from "primevue/card";
import Button from "primevue/button";
import Password from "primevue/password";

import { useLang } from "@/composables/useLang";
import {
  ensureFirebase,
  verifyPasswordResetCode,
  confirmPasswordReset,
} from "@/services/firebaseClient";

const { t } = useLang();
const route = useRoute();
const router = useRouter();
const toast = useToast();

const loading = ref(true);
const saving = ref(false);

const email = ref("");
const fatalError = ref("");

// ✅ keep as plain strings (simpler + avoids ref unwrap weirdness)
const p1 = ref("");
const p2 = ref("");

const oobCode = computed(() => String(route.query.oobCode || "").trim());
const mode = computed(() => String(route.query.mode || "").trim());

const canSubmit = computed(() => {
  const a = String(p1.value || "").trim();
  const b = String(p2.value || "").trim();

  return (
    !loading.value &&
    !fatalError.value &&
    !saving.value &&
    mode.value === "resetPassword" &&
    !!oobCode.value &&
    a.length >= 8 &&
    a === b
  );
});

onMounted(async () => {
  try {
    if (mode.value !== "resetPassword") throw new Error("MODE_NOT_SUPPORTED");
    if (!oobCode.value) throw new Error("MISSING_OOBCODE");

    const f = await ensureFirebase();
    const mail = await verifyPasswordResetCode(f.auth, oobCode.value);
    email.value = mail || "";
  } catch (e) {
    fatalError.value = String(e?.code || e?.message || e);
  } finally {
    loading.value = false;
  }
});

async function submit() {
  if (!canSubmit.value) return;

  saving.value = true;
  try {
    const f = await ensureFirebase();
    await confirmPasswordReset(f.auth, oobCode.value, String(p1.value).trim());

    toast.add({
      severity: "success",
      summary: t("auth.reset_ok", "Password updated"),
      life: 2500,
    });

    router.replace({ path: "/access", query: { next: "/admin" } });
  } catch (e) {
    console.error(e);
    toast.add({
      severity: "error",
      summary: t("auth.reset_fail", "Update failed"),
      detail: String(e?.code || e?.message || e),
      life: 4500,
    });
  } finally {
    saving.value = false;
  }
}

function goHome() {
  router.replace("/");
}

function goProfileOrAccess() {
  router.replace({ path: "/profile" });
}
</script>
