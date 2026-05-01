<template>
  <main class="mx-auto max-w-4xl px-4 py-10 md:px-8 md:py-14">
    <section class="space-y-8 rounded-3xl border-2 border-[var(--accent-color)] bg-white p-6 md:p-10">
      <header class="space-y-2">
        <h1 class="legal-page-title font-semibold">{{ t("privacy.title") }}</h1>
        <p class="text-sm opacity-80">{{ t("privacy.updated") }}</p>
      </header>

      <section class="space-y-2">
        <h2 class="legal-section-title font-semibold">{{ t("privacy.controller.title") }}</h2>
        <p class="text-sm">{{ t("privacy.controller.body") }}</p>
      </section>

      <section class="space-y-2">
        <h2 class="legal-section-title font-semibold">{{ t("privacy.data.title") }}</h2>
        <p class="text-sm">{{ t("privacy.data.body") }}</p>
      </section>

      <section class="space-y-2">
        <h2 class="legal-section-title font-semibold">{{ t("privacy.purpose.title") }}</h2>
        <p class="text-sm">{{ t("privacy.purpose.body") }}</p>
      </section>

      <section class="space-y-2">
        <h2 class="legal-section-title font-semibold">{{ t("privacy.retention.title") }}</h2>
        <p class="text-sm">{{ t("privacy.retention.body") }}</p>
      </section>

      <section class="space-y-2">
        <h2 class="legal-section-title font-semibold">{{ t("privacy.rights.title") }}</h2>
        <p class="text-sm">{{ t("privacy.rights.body") }}</p>
      </section>

      <section class="space-y-2">
        <h2 class="legal-section-title font-semibold">{{ t("privacy.contact.title") }}</h2>
        <p class="text-sm">
          <a
            class="underline"
            href="mailto:isaure.lohest@gmail.com"
          >
            isaure.lohest@gmail.com
          </a>
        </p>
      </section>
    </section>
  </main>
</template>

<script setup>
import { useLang } from "@/composables/useLang";

const { t } = useLang();
</script>
