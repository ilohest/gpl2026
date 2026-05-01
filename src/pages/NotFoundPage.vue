<script setup>
import { useLang } from "@/composables/useLang";
const { t } = useLang();
</script>

<template>
  <main class="text-center space-y-6 py-12">
    <h1 class="text-7xl font-bold">404</h1>
    <p>{{ t("error.message") }}</p>
    <RouterLink
      to="/"
      class="btn btn-primary"
    >
      {{
        t("error.button")
      }}
    </RouterLink>

    <div class="mx-auto my-12">
      <img
        src="/assets/images/img11.png"
        alt="Dresscode"
        class="img11 mx-auto"
      />
    </div>
  </main>
</template>
