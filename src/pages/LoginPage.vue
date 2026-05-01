<!-- src/pages/LoginPage.vue -->
<template>
  <main class="min-h-screen flex items-center justify-center px-4 py-10">
    <div
      class="login-page-shell w-full max-w-md flex flex-col items-center justify-center gap-8"
    >
      <Card
        class="w-full mx-auto p-8"
        :style="{
          border: '1px solid #daa5a5',
          borderRadius: '1rem',
        }"
      >
        <template #content>
          <form
            id="login-form"
            @submit="onSubmit"
            class="space-y-3"
          >
            <Password
              id="password"
              v-model="password"
              toggle-mask
              class="w-full"
              :input-class="'w-full custom-input'"
              :placeholder="t('login.password')"
              required
            />

            <Button
              size="small"
              type="submit"
              class="w-full !bg-[var(--accent-color)] !border-[var(--accent-color)]"
              :label="loading ? '...' : t('login.submit')"
              :loading="loading"
              :disabled="loading"
            />
          </form>

          <p
            v-if="errorMsg"
            class="text-red-600 text-sm mt-2"
          >
            {{ errorMsg }}
          </p>
        </template>
      </Card>

      <h1 class="login-page-title text-center">
        {{ t("intro.names") }}
      </h1>

      <div class="login-page-heart-wrap">
        <img
          src="/assets/images/img9.png"
          alt="Corazon"
          class="login-page-heart pulse mx-auto"
        />
      </div>
    </div>
  </main>
</template>

<script setup>
import { ref } from "vue";
import { useRouter, useRoute } from "vue-router";
import { useLang } from "@/composables/useLang";

const { t } = useLang();
const router = useRouter();
const route = useRoute();

const password = ref("");
const loading = ref(false);
const errorMsg = ref("");

async function onSubmit(e) {
  e.preventDefault();
  if (loading.value) return;
  loading.value = true;
  errorMsg.value = "";

  try {
    const res = await fetch("/api/login", {
      method: "POST",
      credentials: "include", // important pour le cookie de session
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: password.value }),
    });
    const data = await res.json();

    if (res.ok && data?.ok) {
      window.localStorage.setItem("nm_magic_auth", "1");

      const to =
        typeof route.query.redirect === "string" ? route.query.redirect : "/";
      router.replace(to);
    } else {
      // optionnel: mapper error -> message
      errorMsg.value =
        data?.error === "invalid_password"
          ? t("login.error_incorrect")
          : t("login.error_unexpected");
    }
  } catch (err) {
    console.error(err);
    errorMsg.value = t("login.error_unexpected");
  } finally {
    loading.value = false;
  }
}
</script>

<style scoped>
.login-page-shell {
  min-height: calc(100vh - 5rem);
}

.login-page-title {
  width: 100%;
  margin: 0;
  font-size: clamp(3.4rem, 15vw, 5.4rem);
  line-height: 0.95;
}

.login-page-heart-wrap {
  display: flex;
  justify-content: center;
  width: 100%;
}

.login-page-heart {
  width: clamp(70px, 18vw, 92px);
  min-width: 0;
  transition: transform 0.2s ease;
}
</style>
