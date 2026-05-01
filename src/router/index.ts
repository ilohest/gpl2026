// src/router/index.js
import { createRouter, createWebHistory } from "vue-router";
import type { Auth } from "firebase/auth";
import { ensureFirebase, onAuthStateChanged } from "@/services/firebaseClient";
import { api } from "@/services/api";
const DEV = import.meta.env.DEV;

const routes = [
  {
    path: "/",
    name: "Home",
    component: () => import("@/pages/HomePage.vue"),
    meta: { titleKey: "pagetitle.home" },
  },
  {
    path: "/home-alt",
    name: "HomeAlt",
    component: () => import("@/pages/HomeAltPage.vue"),
    meta: { titleKey: "pagetitle.home" },
  },
  {
    path: "/rsvp",
    name: "Rsvp",
    component: () => import("@/pages/RsvpPage.vue"),
    meta: { titleKey: "pagetitle.rsvp" },
  },
  {
    path: "/login",
    name: "login",
    component: () => import("@/pages/LoginPage.vue"),
    meta: { titleKey: "pagetitle.login", hideNav: true },
  },

  {
    path: "/access",
    name: "access",
    component: () => import("@/pages/AccessPage.vue"),
    meta: { titleKey: "pagetitle.access" },
  },

  {
    path: "/admin",
    component: () => import("@/pages/AdminPage.vue"),
    meta: { titleKey: "pagetitle.admin", requiresAuth: true },
  },
  {
    path: "/admin/rsvp/:id",
    name: "AdminRsvpDetail",
    component: () => import("@/components/admin/rsvp/RsvpDetailSection.vue"),
    meta: { hideNav: true, titleKey: "pagetitle.admin", requiresAuth: true },
  },

  {
    path: "/sa",
    name: "superadmin",
    component: () => import("@/pages/SuperAdminPage.vue"),
    meta: {
      titleKey: "pagetitle.superadmin",
      requiresAuth: true,
      requiresRole: "superadmin",
    },
  },

  {
    path: "/legal",
    name: "Legal",
    component: () => import("@/pages/LegalPage.vue"),
    meta: { titleKey: "pagetitle.legal" },
  },
  {
    path: "/privacy",
    name: "Privacy",
    component: () => import("@/pages/PrivacyPage.vue"),
    meta: { titleKey: "pagetitle.privacy" },
  },
  {
    path: "/reset-password",
    name: "authAction",
    component: () => import("@/pages/ResetPassword.vue"),
    meta: { titleKey: "pagetitle.reset" },
  },

  {
    path: "/:pathMatch(.*)*",
    component: () => import("@/pages/NotFoundPage.vue"),
    meta: { titleKey: "pagetitle.404" },
  },
  {
    path: "/profile",
    name: "profile",
    component: () => import("@/pages/ProfilePage.vue"),
    meta: { titleKey: "pagetitle.profile", requiresAuth: true },
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) return savedPosition;
    if (to.hash) return { el: to.hash, behavior: "smooth" };
    return { top: 0 };
  },
});

// reset scroll
router.afterEach(() => {
  requestAnimationFrame(() => {
    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
    const main = document.querySelector("main");
    if (main) main.scrollTop = 0;
  });
});

/**
 * Auth init ready (one-time), then always read the live currentUser.
 */
let _authInitPromise: Promise<void> | null = null;
async function ensureAuthInitialized(auth: Auth): Promise<void> {
  if (_authInitPromise) return _authInitPromise;

  _authInitPromise = new Promise<void>((resolve) => {
    const unsub = onAuthStateChanged(auth, () => {
      unsub();
      resolve();
    });
  });

  return _authInitPromise;
}

async function getCurrentUser() {
  const { auth } = await ensureFirebase();
  await ensureAuthInitialized(auth);
  return auth.currentUser || null;
}

router.beforeEach(async (to, from, next) => {
  // 1) Magic password gate pour pages publiques
  const exemptFromMagic =
    to.path === "/login" ||
    to.path === "/access" ||
    to.path === "/profile" ||
    to.path === "/reset-password" ||
    to.path.startsWith("/admin") ||
    to.path.startsWith("/sa");

  if (!exemptFromMagic) {
    const isUnlocked =
      typeof window !== "undefined" &&
      window.localStorage.getItem("nm_magic_auth") === "1";

    if (!isUnlocked) {
      return next({ path: "/login", query: { redirect: to.fullPath } });
    }
  }

  // 2) Firebase auth guard
  if (to.meta?.requiresAuth) {
    const user = await getCurrentUser();
    if (!user) {
      return next({ path: "/access", query: { next: to.fullPath } });
    }
  }

  // 3) Role guard
  if (to.meta?.requiresRole) {
    try {
      if (DEV) console.log("[router] role check start", { to: to.fullPath });

      type MeLike = { isSuperadmin?: boolean };
      let me = (await api.me()) as MeLike;
      if (DEV) console.log("[router] api.me()", me);
      const requiredRole = String(to.meta.requiresRole || "");

      if (requiredRole === "superadmin" && !me?.isSuperadmin) {
        if (DEV) {
          console.log("[router] not superadmin on first check, retry meFresh");
        }
        me = (await api.meFresh()) as MeLike;
        if (DEV) console.log("[router] api.meFresh()", me);
      }

      if (requiredRole === "superadmin" && !me?.isSuperadmin) {
        if (DEV) console.warn("[router] denied superadmin", me);
        return next({ path: "/admin" });
      }

      if (DEV) console.log("[router] role ok", me);
      return next();
    } catch (e) {
      console.error("[router] role check failed:", e);
      return next({ path: "/access", query: { next: to.fullPath } });
    }
  }

  return next();
});

export default router;
export { routes };
