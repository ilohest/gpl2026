<!-- src/pages/ProfilePage.vue -->
<template>
  <div class="max-w-xl mx-auto p-4 md:p-6 space-y-4">
    <Card :style="{ border: '1px solid var(--accent-color)' }">
      <template #title>
        <div class="flex items-center gap-2">
          <i class="pi pi-cog text-sm" />
          <p class="font-bold text-left">{{ t("common.profile", "Profil") }}</p>
        </div>
      </template>

      <template #content>
        <div class="space-y-4 text-sm">
          <div class="text-xs opacity-70">
            {{ t("common.signed_in_as", "Connectée en tant que") }}
          </div>
          <div class="truncate">{{ email || "—" }}</div>

          <!-- Password reset -->
          <div class="space-y-2">
            <Button
              size="small"
              icon="pi pi-envelope"
              severity="secondary"
              outlined
              class="w-full"
              :label="t('profile.send_reset', 'Mot de passe oublié')"
              :loading="sending"
              :disabled="!email"
              @click="sendReset()"
            />
          </div>

          <Divider />

          <Button
            size="small"
            icon="pi pi-arrow-left"
            severity="secondary"
            text
            :label="t('admin.back_to_dashboard')"
            @click="router.back()"
          />
        </div>
      </template>
    </Card>
  </div>
</template>

<script setup>
import { ref, onMounted } from "vue";
import { useRouter } from "vue-router";
import { useToast } from "primevue/usetoast";
import Card from "primevue/card";
import Button from "primevue/button";
import Divider from "primevue/divider";

import { useLang } from "@/composables/useLang";
import {
  ensureFirebase,
  onAuthStateChanged,
  sendPasswordResetEmail,
} from "@/services/firebaseClient";

const { t } = useLang();
const router = useRouter();
const toast = useToast();

const email = ref("");
const sending = ref(false);

onMounted(async () => {
  const f = await ensureFirebase();
  const auth = f.auth;

  onAuthStateChanged(auth, (user) => {
    if (!user) {
      router.replace({ path: "/access", query: { next: "/profile" } });
      return;
    }
    email.value = user.email || "";
  });
});

async function sendReset() {
  if (sending.value) return;
  if (!email.value) return;

  sending.value = true;
  try {
    const f = await ensureFirebase();
    await sendPasswordResetEmail(f.auth, email.value, {
      url: `${window.location.origin}/reset-password`,
      handleCodeInApp: true,
    });

    toast.add({
      severity: "success",
      summary: t("profile.toast_reset_ok"),
      detail: t("profile.toast_reset_ok_detail"),
      life: 4000,
    });
  } catch (e) {
    console.error(e);
    toast.add({
      severity: "error",
      summary: t("profile.toast_reset_fail"),
      detail: String(e?.message || e),
      life: 4500,
    });
  } finally {
    sending.value = false;
  }
}
</script>
