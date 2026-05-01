<!-- src/components/app/PrimeVueLocaleSync.vue -->
<template>
  <span
    aria-hidden="true"
    class="hidden"
  />
</template>

<script setup lang="ts">
import { watch } from "vue";
import { usePrimeVue } from "primevue/config";
import { useLang } from "@/composables/useLang";
import { getPrimeVueLocale } from "@/utils/primevueLocale";

const primevue = usePrimeVue();
const { lang } = useLang();

watch(
  lang,
  (l) => {
    primevue.config.locale = getPrimeVueLocale(l);
  },
  { immediate: true },
);
</script>
