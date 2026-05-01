// src/stores/meStore.js
import { defineStore } from "pinia";
import { ensureFirebase, onAuthStateChanged } from "@/services/firebaseClient";
import { api } from "@/services/api";
import type { User } from "firebase/auth";
import {
  canAccessDashboard,
  canAccessEmail,
  canReadEmail,
  canReadModule,
  canSendEmail,
  canUseAiChat,
  canWriteModule,
  hasPerm,
  isSuperadminLike,
  uniqPermissions,
} from "./meStore.helpers.js";

type Claims = Record<string, unknown>;
type MePayload = { permissions?: unknown };
type AuthUnsub = () => void;
type OnUnauthed = () => void;
type Permission = string;

type MeState = {
  booting: boolean;
  authed: boolean;
  forbidden: boolean;
  uid: string | null;
  email: string | null;
  claims: Claims;
  permissions: Permission[];
  _unsubAuth: AuthUnsub | null;
  _seq: number;
};

class HttpStatusError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export const useMeStore = defineStore("me", {
  state: (): MeState => ({
    booting: true,
    authed: false,
    forbidden: false,

    uid: null,
    email: null,

    claims: {}, // token claims (custom claims)
    permissions: [], // from /api/me
    _unsubAuth: null,
    _seq: 0,
  }),

  getters: {
    isSuperadmin(state) {
      return isSuperadminLike(state);
    },

    hasPerm: (state) => (perm: string) => {
      return hasPerm(state, perm);
    },

    canRead: (state) => (moduleName: string) => {
      return canReadModule(state, moduleName);
    },

    canWrite: (state) => (moduleName: string) => {
      return canWriteModule(state, moduleName);
    },

    // EMAILS: read vs send
    canReadEmail: (state) => {
      return canReadEmail(state);
    },

    canSendEmail: (state) => {
      return canSendEmail(state);
    },

    canAccessEmail: (state) => {
      return canAccessEmail(state);
    },

    canAccessDashboard(state) {
      return canAccessDashboard(state);
    },

    canUseAiChat(state) {
      return canUseAiChat(state);
    },
  },

  actions: {
    stop() {
      try {
        this._unsubAuth?.();
      } catch {}
      this._unsubAuth = null;

      this.booting = true;
      this.authed = false;
      this.forbidden = false;
      this.uid = null;
      this.email = null;
      this.claims = {};
      this.permissions = [];
    },

    async _loadMeFromApi(user: User): Promise<void> {
      if (!user?.uid) throw new HttpStatusError("No Firebase user", 401);
      const me = (await api.me()) as MePayload;
      this.permissions = uniqPermissions(me?.permissions) as Permission[];
    },

    // async refresh({ forceTokenRefresh = false } = {}) {
    //   const { auth } = await ensureFirebase();
    //   const user = auth.currentUser;
    //   if (!user) return;

    //   if (forceTokenRefresh) await user.getIdToken(true);

    //   const tr = await user.getIdTokenResult(true);
    //   this.claims = tr?.claims || {};

    //   await this._loadMeFromApi(user);

    //   // ✅ forbidden si pas de permissions
    //   this.forbidden = !this.canAccessDashboard;
    // },

    async refresh(
      { forceTokenRefresh = false }: { forceTokenRefresh?: boolean } = {},
    ): Promise<void> {
      const { auth } = await ensureFirebase();
      const user = auth.currentUser;
      if (!user) return;

      if (forceTokenRefresh) await user.getIdToken(true);

      // ✅ token result (claims)
      const tr = await user.getIdTokenResult(true);
      this.claims = tr?.claims || {};

      // ✅ permissions côté API (/api/me)
      await this._loadMeFromApi(user);

      // ✅ forbidden si pas de permissions
      this.forbidden = !this.canAccessDashboard;
    },

    /**
     * Brancher le listener auth une seule fois (idempotent).
     * Le composant (AdminPage) décidera quoi faire (redirect, start stores…).
     */
    async bindAuthListener(
      { onUnauthed }: { onUnauthed?: OnUnauthed } = {},
    ): Promise<void> {
      if (this._unsubAuth) return;

      const { auth } = await ensureFirebase();

      this._unsubAuth = onAuthStateChanged(auth, async (user: User | null) => {
        const seq = ++this._seq;
        this.booting = true;

        // reset session state
        this.authed = !!user;
        this.forbidden = false;
        this.uid = user?.uid || null;
        this.email = user?.email || null;
        this.claims = {};
        this.permissions = [];

        if (!user) {
          if (typeof onUnauthed === "function") onUnauthed();
          if (seq === this._seq) this.booting = false;
          return;
        }

        try {
          // 1) refresh claims + permissions (centralisé ici)
          await this.refresh({ forceTokenRefresh: true });
        } catch {
          // si /api/me pète -> forbidden
          this.forbidden = true;
        } finally {
          if (seq === this._seq) this.booting = false;
        }
      });
    },
  },
});

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    try {
      const store = useMeStore();
      store.stop?.();
    } catch {}
  });
}
