<!-- src/pages/AccessPage.vue -->
<template>
  <div class="max-w-6xl mx-auto p-0 md:p-6">
    <Card class="max-w-md mx-auto" :style="{ border: '1px solid #daa5a5' }">
      <template #title>
        <div class="my-6 space-y-2">
          <h2 class="text-2xl font-semibold">
            {{
              isInviteFlow ? t("access.signup_title") : t("access.login_title")
            }}
          </h2>

          <p v-if="isInviteFlow" class="text-xs opacity-70">
            {{ t("access.invite_hint") }}
          </p>
        </div>
      </template>

      <template #content>
        <div class="flex flex-col gap-2">
          <Message v-if="inviteMessage" severity="warn" closable>
            {{ inviteMessage }}
          </Message>

          <div class="space-y-3">
            <InputText
              id="email"
              v-model="email"
              type="email"
              class="w-full custom-input"
              :placeholder="t('adminlogin.email_label')"
              autocomplete="email"
              :disabled="isEmailLocked"
            />

            <Password
              id="password"
              v-model="password"
              toggle-mask
              class="w-full custom-input"
              :input-class="'w-full custom-input'"
              :placeholder="t('adminlogin.password_label')"
              :autocomplete="isInviteFlow ? 'new-password' : 'current-password'"
              @keyup.enter="submit"
            />

            <Password
              v-if="isInviteFlow"
              id="passwordConfirm"
              v-model="passwordConfirm"
              toggle-mask
              class="w-full custom-input"
              :input-class="'w-full custom-input'"
              :placeholder="t('access.password_confirm')"
              autocomplete="new-password"
              @keyup.enter="submit"
            />

            <Button
              size="small"
              :loading="loadingLogin || loadingRouting"
              class="w-full !bg-[var(--accent-color)] !border-[var(--accent-color)]"
              :label="
                isInviteFlow
                  ? t('access.signup_submit')
                  : t('adminlogin.submit')
              "
              @click="submit"
            />

            <!-- after the Password (login) field -->
            <Button
              size="small"
              v-if="!isInviteFlow"
              text
              severity="secondary"
              class="text-xs underline opacity-70 hover:opacity-100"
              :disabled="loadingLogin || loadingRouting || !email"
              @click="sendReset"
            >
              {{ t("access.forgot_password") }}
            </Button>

            <Button
              size="small"
              v-if="isInviteFlow"
              text
              class="w-full"
              :disabled="loadingLogin || loadingRouting"
              severity="secondary"
              :label="t('access.already_have_account')"
              @click="forceLogin = true"
            />

            <p v-if="loginError" class="text-red-600 text-sm mt-2">
              {{ loginError }}
            </p>
          </div>
        </div>
      </template>
    </Card>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { createUserWithEmailAndPassword } from "firebase/auth";
import {
  ensureFirebase,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut,
} from "@/services/firebaseClient";
import { api } from "@/services/api";

import Card from "primevue/card";
import Button from "primevue/button";
import InputText from "primevue/inputtext";
import Password from "primevue/password";
import { useToast } from "primevue/usetoast";
import Message from "primevue/message";

import { useLang } from "@/composables/useLang";
import { showAuthError } from "@/utils/showAuthError";

const { t } = useLang();
const toast = useToast();
const route = useRoute();
const router = useRouter();
const ADMIN_ACCESS_PASSWORD_PREFILL = "9F&bX@qL!3p$Wr7z^2kT";

function getInitialPasswordPrefill() {
  const hasInviteToken =
    typeof route.query.token === "string" && route.query.token.length > 0;
  return hasInviteToken ? "" : ADMIN_ACCESS_PASSWORD_PREFILL;
}

const sendingReset = ref(false);
const email = ref("grandepleinelune.es@gmail.com");
const password = ref(getInitialPasswordPrefill());
const passwordConfirm = ref("");
const inviteChecked = ref(false);
const loadingLogin = ref(false);
const loadingRouting = ref(false);
const loginError = ref("");
const inviteStatus = ref(""); // "revoked" | "expired" | "already_used" | "wrong_email" | "invalid_token" | ""
const inviteEmailLower = ref(""); // email attendu par l'invite

let auth;
let _unsubAuth = null;
let _routingLock = false;

// allow invite-flow user to force login if they already have an account
const forceLogin = ref(false);

const nextPath = computed(() => {
  const n = route.query.next;
  return typeof n === "string" && n.startsWith("/") ? n : "/admin";
});

const isEmailLocked = computed(() => {
  return isInviteFlow.value && !!inviteEmailLower.value;
});

const inviteToken = computed(() => {
  const tok = route.query.token;
  return typeof tok === "string" && tok.length ? tok : "";
});

const isInviteFlow = computed(() => !!inviteToken.value && !forceLogin.value);

watch(isInviteFlow, (inviteFlow) => {
  if (!inviteFlow && !password.value) {
    password.value = ADMIN_ACCESS_PASSWORD_PREFILL;
  }
});

function shouldDropToken(code) {
  return ["revoked", "expired", "already_used", "invalid_token"].includes(code);
}

function getInviteCodeFromError(e) {
  const code = String(
    e?.data?.code || e?.data?.message || e?.code || e?.message || "",
  ).trim();

  const known = [
    "revoked",
    "expired",
    "already_used",
    "wrong_email",
    "invalid_token",
  ];
  return known.includes(code) ? code : "invalid_token";
}

function setInviteStatusFromError(e) {
  inviteStatus.value = getInviteCodeFromError(e);
  return inviteStatus.value;
}

async function switchAccount() {
  const f = await ensureFirebase();
  await signOut(f.auth);

  const q = { ...route.query };
  if (inviteToken.value) q.token = inviteToken.value;
  await router.replace({ path: route.path, query: q });
}

onMounted(async () => {
  const f = await ensureFirebase();
  auth = f.auth;

  _unsubAuth = onAuthStateChanged(auth, (user) => {
    // already connected => route directly (and accept invite if token present)
    if (user) routeAfterLogin();
  });

  if (inviteToken.value) {
    try {
      const st = await api.inviteStatus(inviteToken.value);

      // ✅ on sait exactement à quel email le token correspond
      inviteEmailLower.value = String(st?.emailLower || "").trim();

      // ✅ UX propre : on pré-remplit
      if (inviteEmailLower.value) email.value = inviteEmailLower.value;
    } catch (e) {
      const code = setInviteStatusFromError(e);
      if (shouldDropToken(code)) {
        forceLogin.value = true;
        const q = { ...route.query };
        delete q.token;
        await router.replace({ path: route.path, query: q });
      } else {
        // wrong_email: on garde le token, mais pas besoin de forcer login
        forceLogin.value = false;
      }
    } finally {
      inviteChecked.value = true;
    }
  }
});

onBeforeUnmount(() => {
  try {
    _unsubAuth?.();
  } catch {}
  _unsubAuth = null;
});

async function submit() {
  if (isInviteFlow.value) return doSignup();
  return doLogin();
}

async function doLogin() {
  loginError.value = "";
  if (!email.value || !password.value) {
    loginError.value = t("adminlogin.error_required");
    return;
  }

  loadingLogin.value = true;
  try {
    if (!auth) {
      const f = await ensureFirebase();
      auth = f.auth;
    }

    await signInWithEmailAndPassword(auth, email.value.trim(), password.value);

    toast.add({
      severity: "success",
      summary: t("admin.toast.login_ok"),
      life: 1200,
    });

    await routeAfterLogin();
  } catch (e) {
    console.error(e);
    const detail = showAuthError(t, toast, e, { life: 4000 });
    loginError.value = detail;
  } finally {
    loadingLogin.value = false;
  }
}

async function doSignup() {
  loginError.value = "";
  const em = email.value.trim();
  const emLower = em.toLowerCase();

  if (!em || !password.value || !passwordConfirm.value) {
    loginError.value = t("access.error_required");
    return;
  }
  if (password.value !== passwordConfirm.value) {
    loginError.value = t("access.error_password_mismatch");
    return;
  }

  // ✅ empêche la création d'un compte si l’email ne correspond pas à l’invite
  if (
    inviteToken.value &&
    inviteEmailLower.value &&
    emLower !== inviteEmailLower.value
  ) {
    inviteStatus.value = "wrong_email";
    loginError.value = ""; // optionnel
    return;
  }

  loadingLogin.value = true;
  try {
    if (!auth) {
      const f = await ensureFirebase();
      auth = f.auth;
    }

    await createUserWithEmailAndPassword(auth, em, password.value);

    toast.add({
      severity: "success",
      summary: t("access.toast_signup_ok"),
      life: 1200,
    });

    await routeAfterLogin();
  } catch (e) {
    console.error(e);

    const msg =
      e?.code === "auth/email-already-in-use"
        ? t("access.error_email_used")
        : t("access.error_signup_generic");

    loginError.value = msg;

    toast.add({
      severity: "error",
      summary: t("access.toast_signup_fail"),
      detail: msg,
      life: 4500,
    });
  } finally {
    loadingLogin.value = false;
  }
}

async function routeAfterLogin() {
  if (_routingLock || loadingRouting.value) return;
  _routingLock = true;
  loadingRouting.value = true;

  try {
    if (!auth) {
      const f = await ensureFirebase();
      auth = f.auth;
    }

    const user = auth.currentUser;
    if (!user) return;

    // 1) accept invite if token present
    if (inviteToken.value) {
      try {
        const res = await api.acceptInvite(inviteToken.value);

        if (res?.claimsUpdated) {
          await auth.currentUser.getIdToken(true);
        }

        // ✅ succès : on peut nettoyer l’URL
        const q = { ...route.query };
        delete q.token;
        await router.replace({ path: route.path, query: q });
      } catch (e) {
        console.error("[acceptInvite] failed:", e);

        setInviteStatusFromError(e);

        // ✅ si mauvais email : on garde le token, on reste en "create account",
        // et on déconnecte automatiquement l’utilisateur courant.
        if (inviteStatus.value === "wrong_email") {
          forceLogin.value = false;

          await switchAccount(); // signOut + stay on /access?token=...
          return; // stop ici, ne pas nettoyer le token, ne pas forcer login
        }

        // autres erreurs : on sort du flow d’invite comme avant
        toast.add({
          severity: "warn",
          summary: t("access.invite_failed"),
          detail: inviteMessage.value,
          life: 6000,
        });

        forceLogin.value = true;

        const q = { ...route.query };
        delete q.token;
        await router.replace({ path: route.path, query: q });

        return;
      }
    }

    // 2) permissions/claims via backend
    const me = await api.meFresh();

    if (me?.isSuperadmin) return router.replace("/sa");

    // 3) otherwise -> next or /admin
    return router.replace(nextPath.value);
  } catch (e) {
    console.error("[routeAfterLogin] failed:", e);

    const code = setInviteStatusFromError(e);

    toast.add({
      severity: "warn",
      summary: t("access.invite_failed"),
      detail: inviteMessage.value,
      life: 6000,
    });

    forceLogin.value = true;

    const q = { ...route.query };
    if (shouldDropToken(code)) delete q.token;
    else q.token = inviteToken.value;

    await router.replace({ path: route.path, query: q });
  } finally {
    loadingRouting.value = false;
    setTimeout(() => {
      _routingLock = false;
    }, 0);
  }
}

async function sendReset() {
  loginError.value = "";

  const em = String(email.value || "").trim();
  if (!em) {
    loginError.value = t("adminlogin.error_required");
    return;
  }

  if (sendingReset.value) return;
  sendingReset.value = true;

  try {
    if (!auth) {
      const f = await ensureFirebase();
      auth = f.auth;
    }

    await sendPasswordResetEmail(auth, em);

    toast.add({
      severity: "success",
      summary: t("profile.toast_reset_ok", "Email sent"),
      detail: t(
        "profile.toast_reset_ok_detail",
        "Check your inbox (and spam).",
      ),
      life: 4500,
    });
  } catch (e) {
    console.error(e);

    toast.add({
      severity: "error",
      summary: t("profile.toast_reset_fail", "Could not send email"),
      detail: String(e?.code || e?.message || e),
      life: 4500,
    });
  } finally {
    sendingReset.value = false;
  }
}

const inviteMessage = computed(() => {
  if (!inviteStatus.value) return "";
  const map = {
    revoked: t("access.invite_revoked"),
    expired: t("access.invite_expired"),
    already_used: t("access.invite_already_used"),
    wrong_email: t("access.invite_wrong_email"),
    invalid_token: t("access.invite_invalid"),
  };
  return map[inviteStatus.value] || t("access.invite_failed");
});
</script>
