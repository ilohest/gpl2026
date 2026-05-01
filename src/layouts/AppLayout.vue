<!-- src/layouts/AppLayout.vue -->
<template>
  <div class="min-h-screen flex flex-col">
    <NavBar v-if="!route.meta.hideNav" />

    <main class="flex-1 w-full p-4 md:p-2 text-center bg-primary text-ink">
      <RouterView />

      <Toast />
      <ConfirmDialog />
    </main>

    <FooterBar v-if="!route.meta.hideNav && !route.meta.hideFooter" />
  </div>
</template>

<script setup>
import { watch, onMounted } from "vue";
import { useRoute } from "vue-router";
import { useLang } from "@/composables/useLang";
import weddingConfig from "../../shared/weddingConfig.ts";

import NavBar from "@/components/NavBar.vue";
import FooterBar from "@/components/FooterBar.vue";

const route = useRoute();
const { t, lang, loadLanguage } = useLang();

// construit le titre de base en fonction de la route + langue
function buildBaseTitle() {
  const titleKey = route.meta.titleKey;

  if (!titleKey) {
    return "";
  }

  // si tu veux encore utiliser bride/groom pour certaines pages
  let params;
  if (titleKey === "pagetitle.home" || titleKey === "pagetitle.login") {
    params = {
      bride: weddingConfig.couple.brideFirstName,
      groom: weddingConfig.couple.groomFirstName,
    };
  }

  return params ? t(titleKey, params) : t(titleKey);
}

function updateTitle() {
  const baseTitle = buildBaseTitle();
  const initials = weddingConfig.couple.initials;

  // fallback global si rien
  let finalTitle =
    baseTitle ||
    weddingConfig.couple.initials;

  // si ce n’est PAS la home → on préfixe avec les initiales
  if (route.meta.titleKey && route.meta.titleKey !== "pagetitle.home") {
    finalTitle = `${initials} - ${finalTitle}`;
  }

  document.title = finalTitle;
}

onMounted(async () => {
  await loadLanguage(lang.value);
  updateTitle();
});

// on met à jour quand la route OU la langue change
watch(
  () => [route.fullPath, lang.value],
  () => {
    updateTitle();
  },
  { immediate: true },
);
</script>
