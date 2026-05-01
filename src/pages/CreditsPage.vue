<template>
  <main class="mx-auto max-w-4xl px-4 py-10 md:px-8 md:py-14">
    <section class="space-y-8 rounded-3xl border-2 border-[var(--accent-color)] bg-white p-6 md:p-10">
      <header class="space-y-2">
        <h1 class="legal-page-title font-semibold">{{ t("credits.title") }}</h1>
        <p class="text-sm">{{ t("credits.intro") }}</p>
      </header>

      <section class="space-y-2">
        <h2 class="legal-section-title font-semibold">{{ t("credits.design.title") }}</h2>
        <p class="text-sm">{{ t("credits.design.body") }}</p>
        <p class="text-sm">
          <a
            href="https://www.lainvitaciondeliana.com/"
            target="_blank"
            rel="noopener noreferrer"
            class="underline"
          >
            https://www.lainvitaciondeliana.com/
          </a>
        </p>
      </section>

      <section class="space-y-2">
        <h2 class="legal-section-title font-semibold">{{ t("credits.dev.title") }}</h2>
        <p class="text-sm">{{ t("credits.dev.body") }}</p>
      </section>
    </section>
  </main>
</template>

<script setup>
import { useLang } from "@/composables/useLang";

const { t } = useLang();
</script>
