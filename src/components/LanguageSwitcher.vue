<!-- src/components/LanguageSwitcher.vue -->
<template>
  <div class="flex gap-2">
    <button
      class="px-2 py-1 rounded border"
      :class="lang === 'ca' ? 'bg-black text-white' : ''"
      @click="pick('ca')"
    >
      CAT
    </button>
    <button
      class="px-2 py-1 rounded border"
      :class="lang === 'es' ? 'bg-black text-white' : ''"
      @click="pick('es')"
    >
      ES
    </button>
  </div>
</template>

<script setup>
import { useLang } from "@/composables/useLang";
const { lang, setLang } = useLang();

async function pick(l) {
  await setLang(l); // suffit
  window.scrollTo({ top: 0, behavior: "smooth" });
}
</script>
