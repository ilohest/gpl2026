<!-- src/components/FooterBar.vue -->
<template>
  <footer class="mt-6 border-t border-[var(--accent-color)] px-4 py-4">
    <div
      class="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-x-2 gap-y-1 text-xs opacity-70"
    >
      <RouterLink
        to="/legal"
        class="hover:opacity-100"
      >
        {{ t("footer.copyright") }}
      </RouterLink>
      <span aria-hidden="true">·</span>
      <RouterLink
        to="/legal"
        class="hover:opacity-100"
      >
        {{
          t("footer.legal")
        }}
      </RouterLink>
      <span aria-hidden="true">·</span>
      <RouterLink
        to="/privacy"
        class="hover:opacity-100"
      >
        {{
          t("footer.privacy")
        }}
      </RouterLink>
      <span aria-hidden="true">·</span>
      <RouterLink
        to="/access"
        class="hover:opacity-100"
      >
        {{
          t("footer.admin")
        }}
      </RouterLink>
    </div>
  </footer>
</template>

<script setup>
import { useLang } from "@/composables/useLang";
import { RouterLink } from "vue-router";

const { t } = useLang();
</script>
