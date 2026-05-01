<!-- src/pages/ProductPage.vue -->
<template>
  <main class="mx-auto max-w-6xl px-4 pt-10 pb-36 md:px-8 md:pt-14 md:pb-48">
    <!-- HERO -->
    <section
      class="relative overflow-hidden rounded-3xl border-2 border-[var(--accent-color)] bg-white p-8 md:p-12"
    >
      <div class="flex flex-col gap-10 md:grid-cols-2 md:items-center">
        <div class="flex flex-col gap-8 items-center">
          <p class="text-xs font-semibold tracking-widest uppercase">
            {{ t("product.hero.kicker") }}
          </p>

          <p class="mt-3 text-3xl uppercase md:text-5xl">
            {{ t("product.hero.title") }}
            <span class="block mt-3">{{ t("product.hero.subtitle") }}</span>
          </p>

          <p class="mt-5 text-base md:text-lg">
            {{ t("product.hero.description") }}
          </p>

          <RouterLink
            to="/access"
            class="inline-flex items-center justify-center rounded-xl bg-[var(--accent-color)] px-5 py-3 text-sm font-semibold !text-white hover:opacity-90"
          >
            {{ t("product.hero.ctaPrimary") }}
          </RouterLink>

          <div class="flex flex-wrap gap-2 justify-center">
            <span
              v-for="(pillKey, idx) in pillKeys"
              :key="idx"
              class="rounded-full border-2 border-[var(--accent-color)] bg-white px-3 py-1 text-xs"
            >
              {{ t(pillKey) }}
            </span>
          </div>
        </div>

        <!-- aperçu -->
        <div class="rounded-2xl p-6">
          <p class="text-sm">
            {{ t("product.preview.text") }}
          </p>

          <div class="mt-5 grid gap-3 sm:grid-cols-2">
            <div
              v-for="(card, idx) in previewCards"
              :key="idx"
              class="rounded-2xl bg-[#ffeee6] p-4"
              :class="{
                'sm:col-span-2 sm:mx-auto sm:max-w-[26rem]':
                  previewCards.length % 2 === 1 &&
                  idx === previewCards.length - 1,
              }"
            >
              <p class="text-sm uppercase font-semibold">
                {{ t(card.titleKey) }}
              </p>
              <p class="mt-1 text-sm">{{ t(card.textKey) }}</p>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- BENTOS -->
    <section class="mt-12 md:mt-16">
      <div class="flex text-center justify-center gap-6">
        <div>
          <h2 class="text-2xl font-semibold md:text-3xl">
            {{ t("product.bentos.title") }}
          </h2>
          <p class="mt-2">{{ t("product.bentos.subtitle") }}</p>
        </div>
      </div>

      <div class="mt-6 grid gap-6 md:grid-cols-2">
        <article
          v-for="b in bentos"
          :key="b.key"
          class="rounded-3xl bg-[#ffeee6] p-5"
        >
          <div class="overflow-hidden rounded-2xl">
            <img
              :src="b.img"
              :alt="t(b.altKey)"
              class="w-full object-contain md:h-full"
              loading="lazy"
            />
          </div>

          <p class="mt-5 text-xl font-semibold">
            <span class="inline-block px-2 py-0.5">
              {{ t(b.titleKey) }}
            </span>
          </p>

          <p class="mt-3 text-sm leading-relaxed text-gray-700">
            {{ t(b.textKey) }}
          </p>
        </article>
      </div>
    </section>

    <!-- CTA -->
    <section class="mt-12 md:mt-16">
      <div class="rounded-3xl bg-[var(--accent-color)] p-8 md:p-12">
        <div class="grid gap-8 md:grid-cols-2 md:items-center">
          <div class="text-left">
            <p class="text-2xl uppercase text-white md:text-3xl">
              {{ t("product.cta.title") }}
            </p>
            <p class="mt-3 text-sm text-white">
              {{ t("product.cta.text") }}
            </p>
          </div>

          <div class="flex flex-col gap-3 sm:flex-row md:justify-end">
            <RouterLink
              to="/access"
              class="inline-flex items-center justify-center rounded-xl bg-white px-5 py-3 text-sm font-semibold text-[var(--accent-color)] hover:opacity-90"
            >
              {{ t("product.cta.button") }}
            </RouterLink>
          </div>
        </div>
      </div>
    </section>

    <!-- CONTACT -->
    <section class="mt-8">
      <div
        class="rounded-3xl border-2 border-[var(--accent-color)] bg-white p-6 text-center md:p-8"
      >
        <p class="text-sm md:text-base">
          {{ t("product.contact.text") }}
        </p>
        <a
          href="mailto:isaure.lohest@gmail.com"
          class="mt-4 inline-flex items-center justify-center rounded-xl bg-[var(--accent-color)] px-5 py-3 text-sm font-semibold !text-white hover:opacity-90"
        >
          {{ t("product.contact.cta") }}
        </a>
      </div>
    </section>

    <div aria-hidden="true" class="h-20 md:h-28"></div>
  </main>
</template>

<script setup>
import { onMounted } from "vue";
import { useLang } from "@/composables/useLang";

const { t, lang, loadLanguage } = useLang();

onMounted(() => {
  // comme ta HomePage
  loadLanguage(lang.value);
});

const pillKeys = [
  "product.hero.pills.admin",
  "product.hero.pills.planner",
  "product.hero.pills.rsvp",
  "product.hero.pills.diets",
  "product.hero.pills.seating",
  "product.hero.pills.guests",
  "product.hero.pills.realtime",
  "product.hero.pills.tables",
  "product.hero.pills.exports",
  "product.hero.pills.playlist",
  "product.hero.pills.budget",
];

const previewCards = [
  {
    titleKey: "product.preview.cards.customDesignTitle",
    textKey: "product.preview.cards.customDesignText",
  },
  {
    titleKey: "product.preview.cards.smartPlatformTitle",
    textKey: "product.preview.cards.smartPlatformText",
  },
];

const bentos = [
  {
    key: "dashboard",
    img: "/assets/images/product/admin-dashboard.png",
    titleKey: "product.bentos.items.dashboard.title",
    textKey: "product.bentos.items.dashboard.text",
    altKey: "product.bentos.items.dashboard.alt",
  },
  {
    key: "rsvp",
    img: "/assets/images/product/admin-rsvp.png",
    titleKey: "product.bentos.items.rsvp.title",
    textKey: "product.bentos.items.rsvp.text",
    altKey: "product.bentos.items.rsvp.alt",
  },
  {
    key: "diets",
    img: "/assets/images/product/admin-diets.png",
    titleKey: "product.bentos.items.diets.title",
    textKey: "product.bentos.items.diets.text",
    altKey: "product.bentos.items.diets.alt",
  },
  {
    key: "seating",
    img: "/assets/images/product/admin-seating.png",
    titleKey: "product.bentos.items.seating.title",
    textKey: "product.bentos.items.seating.text",
    altKey: "product.bentos.items.seating.alt",
  },
  {
    key: "playlist",
    img: "/assets/images/product/admin-playlist.png",
    titleKey: "product.bentos.items.playlist.title",
    textKey: "product.bentos.items.playlist.text",
    altKey: "product.bentos.items.playlist.alt",
  },
  {
    key: "blog",
    img: "/assets/images/product/admin-blog.png",
    titleKey: "product.bentos.items.blog.title",
    textKey: "product.bentos.items.blog.text",
    altKey: "product.bentos.items.blog.alt",
  },
  {
    key: "email",
    img: "/assets/images/product/admin-email.png",
    titleKey: "product.bentos.items.email.title",
    textKey: "product.bentos.items.email.text",
    altKey: "product.bentos.items.email.alt",
  },
  {
    key: "planner",
    img: "/assets/images/product/admin-weddingplanner.png",
    titleKey: "product.bentos.items.planner.title",
    textKey: "product.bentos.items.planner.text",
    altKey: "product.bentos.items.planner.alt",
  },
  {
    key: "rsvp-form",
    img: "/assets/images/product/admin-rsvp-form.png",
    titleKey: "product.bentos.items.rsvpForm.title",
    textKey: "product.bentos.items.rsvpForm.text",
    altKey: "product.bentos.items.rsvpForm.alt",
  },
  {
    key: "budget",
    img: "/assets/images/product/admin-budget.png",
    titleKey: "product.bentos.items.budget.title",
    textKey: "product.bentos.items.budget.text",
    altKey: "product.bentos.items.budget.alt",
  },
  {
    key: "agenda",
    img: "/assets/images/product/admin-agenda.png",
    titleKey: "product.bentos.items.agenda.title",
    textKey: "product.bentos.items.agenda.text",
    altKey: "product.bentos.items.agenda.alt",
  },
];
</script>
