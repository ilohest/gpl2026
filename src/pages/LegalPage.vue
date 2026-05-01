<template>
  <main class="mx-auto max-w-4xl px-4 py-10 md:px-8 md:py-14">
    <section class="space-y-8 rounded-3xl border-2 border-[var(--accent-color)] bg-white p-6 md:p-10">
      <header class="space-y-2">
        <h1 class="legal-page-title font-semibold">{{ t("legal.title") }}</h1>
        <p class="text-sm opacity-80">{{ t("legal.updated") }}</p>
      </header>

      <section class="space-y-2">
        <h2 class="legal-section-title font-semibold">{{ t("legal.editor.title") }}</h2>
        <p class="text-sm">{{ t("legal.editor.body") }}</p>
      </section>

      <section class="space-y-2">
        <h2 class="legal-section-title font-semibold">{{ t("legal.hosting.title") }}</h2>
        <p class="text-sm">{{ t("legal.hosting.body") }}</p>
      </section>

      <section class="space-y-2">
        <h2 class="legal-section-title font-semibold">{{ t("legal.ip.title") }}</h2>
        <p class="text-sm">{{ t("legal.ip.body") }}</p>
      </section>

      <section class="space-y-2">
        <h2 class="legal-section-title font-semibold">{{ t("legal.liability.title") }}</h2>
        <p class="text-sm">{{ t("legal.liability.body") }}</p>
      </section>

      <section class="space-y-2">
        <h2 class="legal-section-title font-semibold">{{ t("legal.contact.title") }}</h2>
        <p class="text-sm">
          {{ t("legal.contact.body") }}
        </p>
        <p class="text-sm">
          <a
            class="underline"
            href="https://isaure-lohest.com/"
            target="_blank"
            rel="noopener noreferrer"
          >
            https://isaure-lohest.com/
          </a>
        </p>
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
