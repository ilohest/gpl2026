<!-- src/components/FooterBar.vue -->
<template>
  <footer class="site-footer">
    <div class="site-footer__inner">
      <a
        href="https://isaure-lohest.com/"
        target="_blank"
        rel="noopener noreferrer"
        class="site-footer__credit"
      >
        WEBSITE BY ISAURE
      </a>

      <div class="site-footer__links">
        <RouterLink to="/legal" class="hover:opacity-100">
          {{ t("footer.copyright") }}
        </RouterLink>
        <span aria-hidden="true">·</span>
        <RouterLink to="/legal" class="hover:opacity-100">
          {{ t("footer.legal") }}
        </RouterLink>
        <span aria-hidden="true">·</span>
        <RouterLink to="/privacy" class="hover:opacity-100">
          {{ t("footer.privacy") }}
        </RouterLink>
      </div>

      <div class="site-footer__langs" aria-label="Language">
        <button
          type="button"
          :class="{ 'is-active': lang === 'ca' }"
          @click="setLang('ca')"
        >
          CAT
        </button>
        <span aria-hidden="true">|</span>
        <button
          type="button"
          :class="{ 'is-active': lang === 'es' }"
          @click="setLang('es')"
        >
          ES
        </button>
      </div>
    </div>
  </footer>
</template>

<script setup>
import { useLang } from "@/composables/useLang";
import { RouterLink } from "vue-router";

const { t, lang, setLang } = useLang();
</script>
