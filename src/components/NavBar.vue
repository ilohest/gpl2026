<!-- src/components/NavBar.vue -->
<template>
  <header class="bg-primary text-ink text-center">
    <nav class="mx-auto px-4 py-3 flex items-center justify-between">
      <RouterLink
        to="/"
        class="ml-4 font-heading text-3xl leading-none"
        :aria-label="t('intro.names')"
      >
        {{ t("intro.names") }}
      </RouterLink>

      <!-- Burger mobile -->
      <button
        class="nav-mobile-trigger"
        :class="{ 'is-open': open }"
        @click="open = true"
        :aria-label="open ? 'Fermer le menu' : 'Menu'"
        :aria-expanded="open"
      >
        <span class="nav-mobile-trigger__line"></span>
        <span class="nav-mobile-trigger__line"></span>
      </button>

      <!-- Menu desktop -->
      <ul class="hidden min-[1025px]:flex items-center gap-6">
        <li>
          <RouterLink
            to="/"
            class="hover:underline"
            :class="{ underline: route.path === '/' }"
          >
            {{ t("header.home") }}
          </RouterLink>
        </li>
        <li>
          <RouterLink
            to="/rsvp"
            class="hover:underline"
            :class="{ underline: route.path === '/rsvp' }"
          >
            {{ t("header.rsvp") }}
          </RouterLink>
        </li>
        <!-- Langues -->
        <li class="ml-2 text-sm">
          <button
            class="hover:underline cursor-pointer"
            :class="{ 'font-semibold': lang === 'en' }"
            @click="setLang('en')"
          >
            {{ weddingConfig.i18n.languages.en.shortLabel }}
          </button>
          <span aria-hidden="true" class="mx-2">|</span>
          <button
            class="hover:underline cursor-pointer"
            :class="{ 'font-semibold': lang === 'es' }"
            @click="setLang('es')"
          >
            {{ weddingConfig.i18n.languages.es.shortLabel }}
          </button>
        </li>

        <!-- ✅ Avatar + menu compte (remplace le bouton logout) -->
        <li v-if="authed" class="ml-2">
          <button
            class="w-9 h-9 rounded-full flex items-center justify-center border border-black/10 hover:border-black/20 transition"
            :aria-label="t('common.account', 'Compte')"
            aria-haspopup="menu"
            @click="toggleAccountMenu"
          >
            <span class="text-sm font-semibold">{{ accountInitial }}</span>
          </button>

          <Menu ref="accountMenuRef" :model="accountMenuItems" popup />
        </li>
      </ul>
    </nav>

    <!-- Menu mobile -->
    <Drawer
      v-model:visible="open"
      position="right"
      :modal="true"
      :dismissable="true"
      :block-scroll="true"
      :close-on-escape="true"
      :show-close-icon="false"
      append-to="body"
      class="nav-mobile-drawer min-[1025px]:hidden h-screen !max-w-none bg-white/95"
    >
      <button
        class="nav-mobile-trigger nav-mobile-trigger--overlay is-open"
        aria-label="Fermer le menu"
        @click="open = false"
      >
        <span class="nav-mobile-trigger__line"></span>
        <span class="nav-mobile-trigger__line"></span>
      </button>

      <div
        v-if="authed"
        class="absolute top-4 left-4 w-10 h-10 rounded-full flex items-center justify-center border border-black/10 bg-white text-ink font-semibold"
        :aria-label="t('common.account', 'Compte')"
      >
        <span class="text-sm">{{ accountInitial }}</span>
      </div>

      <nav
        class="h-full w-full flex flex-col items-start justify-start gap-2 p-6"
      >
        <div class="w-full flex flex-col items-start gap-2">
          <RouterLink
            @click="open = false"
            to="/"
            class="w-full px-4 py-3 rounded-xl text-left hover:bg-black/5 transition"
            :class="{ 'bg-black/5 font-semibold': route.path === '/' }"
          >
            {{ t("header.home") }}
          </RouterLink>

          <RouterLink
            @click="open = false"
            to="/rsvp"
            class="w-full px-4 py-3 rounded-xl text-left hover:bg-black/5 transition"
            :class="{ 'bg-black/5 font-semibold': route.path === '/rsvp' }"
          >
            {{ t("header.rsvp") }}
          </RouterLink>

          <template v-if="showAdminLink">
            <div class="h-px w-full bg-black/10 my-2"></div>

            <RouterLink
              @click="open = false"
              to="/admin"
              class="w-full px-4 py-3 rounded-xl text-left hover:bg-black/5 transition flex items-center gap-3"
              :class="{
                'bg-black/5 font-semibold': route.path.startsWith('/admin'),
              }"
            >
              <i class="pi pi-user" aria-hidden="true"></i>
              <span>{{ t("header.admin", "Admin") }}</span>
            </RouterLink>

            <div class="w-full pl-6 ml-2 border-l border-black/10">
              <div class="w-full flex flex-col gap-1">
                <RouterLink
                  v-for="item in adminNavItems"
                  :key="item.key"
                  :to="item.to"
                  class="w-full px-4 py-2.5 rounded-xl text-left flex items-center gap-3 hover:bg-black/5 transition text-sm"
                  :class="{
                    'bg-black/5 font-semibold': isAdminSectionActive(item.key),
                  }"
                  @click="open = false"
                >
                  <i :class="item.icon" aria-hidden="true"></i>
                  <span class="min-w-0 truncate">{{ item.label }}</span>
                </RouterLink>
              </div>
            </div>

            <template v-if="isSuperAdmin">
              <RouterLink
                @click="open = false"
                to="/sa"
                class="w-full px-4 py-3 rounded-xl text-left hover:bg-black/5 transition flex items-center gap-3"
                :class="{
                  'bg-black/5 font-semibold': route.path.startsWith('/sa'),
                }"
              >
                <i class="pi pi-shield" aria-hidden="true"></i>
                <span>{{ t("header.superadmin", "Superadmin") }}</span>
              </RouterLink>

              <div class="w-full pl-6 ml-2 border-l border-black/10">
                <div class="w-full flex flex-col gap-1">
                  <RouterLink
                    v-for="item in superAdminNavItems"
                    :key="item.key"
                    :to="item.to"
                    class="w-full px-4 py-2.5 rounded-xl text-left flex items-center gap-3 hover:bg-black/5 transition text-sm"
                    :class="{
                      'bg-black/5 font-semibold': isSuperAdminSectionActive(
                        item.key,
                      ),
                    }"
                    @click="open = false"
                  >
                    <i :class="item.icon" aria-hidden="true"></i>
                    <span class="min-w-0 truncate">{{ item.label }}</span>
                  </RouterLink>
                </div>
              </div>
            </template>

            <RouterLink
              v-if="authed"
              @click="open = false"
              to="/profile"
              class="w-full mt-2 px-4 py-3 rounded-xl text-left hover:bg-black/5 transition flex items-center gap-3"
              :class="{
                'bg-black/5 font-semibold': route.path.startsWith('/profile'),
              }"
            >
              <i class="pi pi-cog" aria-hidden="true"></i>
              <span>{{ t("common.profile", "Profil") }}</span>
            </RouterLink>
          </template>
        </div>

        <div class="mt-auto w-full">
          <!-- ✅ Compte (mobile) -->
          <template v-if="authed">
            <div class="h-px w-full bg-black/10 my-2"></div>

            <div
              class="w-full flex flex-col items-center gap-2 text-sm px-4 text-center"
            >
              <div class="text-xs opacity-70 w-full">
                {{ t("common.signed_in_as", "Connectée en tant que") }}
              </div>
              <div class="max-w-[85vw] truncate w-full">
                {{ userEmail || "—" }}
              </div>

              <div class="w-full flex justify-center mt-3">
                <Button
                  size="small"
                  class="hover:underline"
                  icon="pi pi-sign-out"
                  :label="t('common.logout')"
                  severity="secondary"
                  text
                  @click="
                    doLogout();
                    open = false;
                  "
                />
              </div>
            </div>
          </template>

          <div class="h-px w-full bg-black/10 my-3"></div>

          <div class="w-full flex items-center justify-center gap-4 pb-6">
            <button
              class="hover:underline"
              :class="{ 'font-semibold': lang === 'en' }"
              @click="
                setLang('en');
                open = false;
              "
            >
              {{ weddingConfig.i18n.languages.en.shortLabel }}
            </button>
            <span aria-hidden="true">|</span>
            <button
              class="hover:underline"
              :class="{ 'font-semibold': lang === 'es' }"
              @click="
                setLang('es');
                open = false;
              "
            >
              {{ weddingConfig.i18n.languages.es.shortLabel }}
            </button>
          </div>
        </div>
      </nav>
    </Drawer>
  </header>
</template>

<script setup>
import { ref, onMounted, computed } from "vue";
import { RouterLink, useRoute, useRouter } from "vue-router";
import {
  ensureFirebase,
  onAuthStateChanged,
  signOut,
} from "@/services/firebaseClient";

import Drawer from "primevue/drawer";
import Menu from "primevue/menu";
import Button from "primevue/button";
import { useToast } from "primevue/usetoast";

import { useLang } from "@/composables/useLang";
import { useMeStore } from "@/stores/meStore";
import weddingConfig from "../../shared/weddingConfig.ts";
import { api } from "@/services/api";

const route = useRoute();
const router = useRouter();
const { lang, t, setLang, loadLanguage } = useLang();
const me = useMeStore();
const toast = useToast();
const open = ref(false);
const authed = ref(false);
const userEmail = ref("");
const role = ref("");
let auth;

const isAdmin = computed(
  () => role.value === "admin" || role.value === "superadmin",
);
const isSuperAdmin = computed(() => role.value === "superadmin");
const showAdminLink = computed(() => authed.value && isAdmin.value);
const isAdminRoute = computed(() => route.path.startsWith("/admin"));
const isSuperAdminRoute = computed(() => route.path.startsWith("/sa"));
const currentAdminSection = computed(() => {
  return typeof route.query.section === "string" ? route.query.section : "";
});
const currentSuperAdminSection = computed(() => {
  return typeof route.query.section === "string" ? route.query.section : "";
});
const adminNavItems = computed(() => {
  if (!showAdminLink.value) return [];

  const items = [
    {
      key: "dashboard",
      label: t("admin.nav.dashboard"),
      icon: "pi pi-home",
      to: { path: "/admin", query: {} },
    },
    {
      key: "rsvp",
      label: t("admin.bento.rsvp_title"),
      icon: "pi pi-users",
      to: { path: "/admin", query: { section: "rsvp" } },
    },
    {
      key: "planner",
      label: t("admin.planner.title"),
      icon: "pi pi-sparkles",
      to: { path: "/admin", query: { section: "planner" } },
    },
    {
      key: "finances",
      label: t("admin.nav.budget"),
      icon: "pi pi-wallet",
      to: { path: "/admin", query: { section: "finances" } },
    },
    {
      key: "menus",
      label: t("admin.menus.title"),
      icon: "pi pi-list",
      to: { path: "/admin", query: { section: "menus" } },
    },
    {
      key: "seating",
      label: t("admin.seating.title"),
      icon: "pi pi-map",
      to: { path: "/admin", query: { section: "seating" } },
    },
    {
      key: "playlist",
      label: t("admin.playlist.title"),
      icon: "pi pi-volume-up",
      to: { path: "/admin", query: { section: "playlist" } },
    },
    {
      key: "agenda",
      label: t("admin.agenda.title"),
      icon: "pi pi-calendar",
      to: { path: "/admin", query: { section: "agenda" } },
    },
    {
      key: "email",
      label: t("admin.email_blast.title"),
      icon: "pi pi-inbox",
      to: { path: "/admin", query: { section: "email" } },
    },
    {
      key: "blog",
      label: t("admin.blog.title"),
      icon: "pi pi-image",
      to: { path: "/admin", query: { section: "blog" } },
    },
  ];

  if (me.booting || me.forbidden || !me.canAccessDashboard) return items;

  return items.filter((item) => {
    if (item.key === "dashboard") return true;
    if (item.key === "email") return me.canAccessEmail;
    if (item.key === "blog") return me.canWrite("blog");
    if (item.key === "menus" || item.key === "seating")
      return me.canRead("menus_seating");
    return me.canRead(item.key);
  });
});
const superAdminNavItems = computed(() => {
  if (!isSuperAdmin.value) return [];

  return [
    {
      key: "dashboard",
      label: t("admin.nav.dashboard"),
      icon: "pi pi-home",
      to: { path: "/sa", query: {} },
    },
    {
      key: "users",
      label: t("superadmin.tabs.users"),
      icon: "pi pi-users",
      to: { path: "/sa", query: { section: "users" } },
    },
    {
      key: "invites",
      label: t("superadmin.tabs.invites"),
      icon: "pi pi-envelope",
      to: { path: "/sa", query: { section: "invites" } },
    },
  ];
});
function isAdminSectionActive(sectionKey) {
  if (!isAdminRoute.value) return false;
  if (sectionKey === "dashboard") return !currentAdminSection.value;
  return currentAdminSection.value === sectionKey;
}
function isSuperAdminSectionActive(sectionKey) {
  if (!isSuperAdminRoute.value) return false;
  if (sectionKey === "dashboard") return !currentSuperAdminSection.value;
  return currentSuperAdminSection.value === sectionKey;
}
const accountInitial = computed(() => {
  const e = (userEmail.value || "").trim();
  return (e[0] || "?").toUpperCase();
});

const accountMenuRef = ref(null);

async function refreshRole() {
  try {
    const me = await api.me();
    role.value = me?.role || "";
  } catch {
    role.value = "";
  }
}

const accountMenuItems = computed(() => {
  const items = [];

  items.push({
    label: userEmail.value || t("common.account"),
    disabled: true,
  });

  // ✅ Admin seulement si role admin/superadmin
  if (isAdmin.value) {
    items.push({ separator: true });
    items.push({
      label: t("header.admin"),
      icon: "pi pi-user",
      command: () => router.push("/admin"),
    });
  }

  // ✅ Superadmin seulement si role superadmin
  if (isSuperAdmin.value) {
    items.push({
      label: t("header.superadmin"),
      icon: "pi pi-shield",
      command: () => router.push("/sa"),
    });
  }

  items.push({ separator: true });
  items.push({
    label: t("common.profile", "Profil"),
    icon: "pi pi-cog",
    command: () => router.push("/profile"),
  });

  items.push({
    label: t("common.logout"),
    icon: "pi pi-sign-out",
    command: () => doLogout(),
  });

  return items;
});

function toggleAccountMenu(event) {
  accountMenuRef.value?.toggle(event);
}

onMounted(async () => {
  const f = await ensureFirebase();
  auth = f.auth;

  onAuthStateChanged(auth, async (user) => {
    authed.value = !!user;
    userEmail.value = user?.email || "";

    if (user) await refreshRole();
    else role.value = "";
  });

  loadLanguage(lang.value);
});

function doLogout() {
  if (!auth) return;

  signOut(auth)
    .then(() => {
      role.value = "";

      toast.add({
        severity: "success",
        summary: t("common.logout_ok"),
        detail: t("common.logout_ok_detail"),
        life: 2000,
      });

      router.replace({ path: "/access", query: { next: route.fullPath } });
    })
    .catch((e) => {
      console.error(e);
      toast.add({
        severity: "error",
        summary: t("common.logout_fail"),
        detail: t("common.logout_fail_detail"),
        life: 3500,
      });
    });
}
</script>

<style scoped>
.nav-mobile-trigger {
  position: relative;
  display: inline-flex;
  height: 3rem;
  width: 3rem;
  align-items: center;
  justify-content: center;
  border-radius: 9999px;
  border: none;
  background: transparent;
  backdrop-filter: none;
  transition:
    background-color 180ms ease,
    box-shadow 180ms ease,
    transform 180ms ease,
    top 220ms ease,
    right 220ms ease,
    position 220ms ease;
  z-index: 70;
}

.nav-mobile-trigger:hover {
  background: rgba(255, 255, 255, 0.28);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.04);
}

.nav-mobile-trigger:active {
  transform: scale(0.96);
}

.nav-mobile-trigger.is-open {
  position: fixed;
  top: 0.75rem;
  right: 1rem;
}

.nav-mobile-trigger--overlay {
  z-index: 90;
}

.nav-mobile-trigger__line {
  position: absolute;
  width: 1.5rem;
  height: 2px;
  border-radius: 9999px;
  background: currentColor;
  transition:
    transform 220ms ease,
    opacity 220ms ease,
    top 220ms ease,
    width 220ms ease;
}

.nav-mobile-trigger__line:first-child {
  transform: translateY(-5px);
}

.nav-mobile-trigger__line:last-child {
  transform: translateY(5px);
}

.nav-mobile-trigger.is-open .nav-mobile-trigger__line:first-child {
  transform: rotate(45deg);
}

.nav-mobile-trigger.is-open .nav-mobile-trigger__line:last-child {
  transform: rotate(-45deg);
}

:deep(.nav-mobile-drawer) {
  width: min(88vw, 24rem);
  border-left: 1px solid rgba(0, 0, 0, 0.07);
  box-shadow: -24px 0 60px rgba(0, 0, 0, 0.12);
}

@media (min-width: 1025px) {
  .nav-mobile-trigger {
    display: none;
  }
}
</style>
