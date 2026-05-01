// src/stores/blogStore.js
import { defineStore } from "pinia";
import { api } from "@/services/api";
import {
  ensureFirebase,
  collection,
  query,
  orderBy,
  limit,
  onSnapshot,
} from "@/services/firebaseClient";
import { getLocalLikedPosts, saveLocalLikedPosts } from "@/utils/localLikes";
import type { Unsubscribe, DocumentData } from "firebase/firestore";

type BlogTexts = { es: string; en: string };
type BlogPost = {
  id: string;
  image: string;
  texts: BlogTexts;
  likes: number;
  createdAt: number;
};
type BlogJob = {
  id?: string;
  status?: string;
  error?: string;
  [k: string]: unknown;
};
type BlogState = {
  posts: BlogPost[];
  loading: boolean;
  error: string;
  likedLocal: Set<string>;
  blogJobId: string;
  blogJob: BlogJob | null;
  _pollTimer: ReturnType<typeof setInterval> | null;
  blogLastSentAt: string | null;
  blogLastSentPostId: string | null;
  _unsubPosts: Unsubscribe | null;
};

function safeStr(v: unknown, max = 8000): string {
  const s = String(v ?? "").trim();
  return s.length > max ? s.slice(0, max) : s;
}

function safeTexts(input: unknown): BlogTexts {
  const texts = input && typeof input === "object" ? input : {};
  const obj = texts as Record<string, unknown>;
  const es = safeStr(obj.es ?? "", 400);
  const en = safeStr(obj.en ?? "", 400);
  return { es, en };
}

function tsToMs(v: unknown): number {
  if (!v) return 0;
  if (typeof v === "number") return v;
  if (
    typeof v === "object" &&
    v !== null &&
    typeof (v as { toMillis?: unknown }).toMillis === "function"
  ) {
    return (v as { toMillis: () => number }).toMillis();
  }
  return 0;
}

export const useBlogStore = defineStore("blog", {
  state: (): BlogState => ({
    posts: [],
    loading: false,

    error: "",

    likedLocal: getLocalLikedPosts(),

    blogJobId: localStorage.getItem("blogJobId") || "",
    blogJob: null,
    _pollTimer: null,

    blogLastSentAt: null,
    blogLastSentPostId: null,

    _unsubPosts: null,
  }),

  getters: {
    isLiked: (s) => (id: string) => s.likedLocal?.has(id),

    lastPostAt(state) {
      const ts = state.posts?.[0]?.createdAt || 0;
      return ts ? new Date(ts).toISOString() : null;
    },

    isJobActive(state) {
      return (
        !!state.blogJob &&
        (state.blogJob.status === "queued" ||
          state.blogJob.status === "running")
      );
    },

    blogLastPostAt(state) {
      const ts = state.posts?.[0]?.createdAt || 0;
      return ts ? new Date(ts).toISOString() : null;
    },
  },

  actions: {
    markBlogPostSent(postId: string | null = null) {
      this.blogLastSentAt = new Date().toISOString();
      if (postId) this.blogLastSentPostId = postId;
    },

    stop() {
      try {
        this._unsubPosts?.();
      } catch {}
      this._unsubPosts = null;
      this.stopPolling();
    },

    async subscribePosts() {
      if (this._unsubPosts) return;

      this.loading = true;
      this.error = "";

      try {
        const { fs } = await ensureFirebase();

        const q = query(
          collection(fs, "blogPosts"),
          orderBy("createdAt", "desc"),
          limit(50)
        );

        this._unsubPosts = onSnapshot(
          q,
          (snap) => {
            const next = snap.docs.map((d) => {
              const v = (d.data() || {}) as DocumentData;
              return {
                id: d.id,
                image: v.image || "",
                texts: safeTexts(v.texts),
                likes: Number(v.likes || 0),
                createdAt: tsToMs(v.createdAt),
              };
            });

            this.posts = next;
            this.loading = false;

            if (this.blogJobId) this.startPolling(this.blogJobId);
          },
          (err: unknown) => {
            console.error("[blogStore] subscribePosts error:", err);
            this.error = "BLOG_SUBSCRIBE_ERROR";
            this.loading = false;
          }
        );
      } catch (e: unknown) {
        console.error("[blogStore] subscribePosts crash:", e);
        this.error = "BLOG_INIT_ERROR";
        this.loading = false;
      }
    },

    /* ---------------- ADMIN CRUD via backend ----------------
       -> IMPORTANT: le store ne toast pas.
       -> il laisse remonter les erreurs pour showApiError côté UI.
    */

    async createPost({ imageDataUrl, texts }: { imageDataUrl?: string; texts?: unknown }) {
      const payload = { imageDataUrl, texts: safeTexts(texts) };
      return api.adminCreateBlogPost(payload);
    },

    async updatePost(
      postId: string,
      { imageDataUrl, texts }: { imageDataUrl?: string; texts?: unknown },
    ) {
      if (!postId) throw new Error("missing_postId");
      const payload: Record<string, unknown> = {};
      if (typeof imageDataUrl === "string") payload.imageDataUrl = imageDataUrl;
      if (texts) payload.texts = safeTexts(texts);
      return api.adminUpdateBlogPost(postId, payload);
    },

    async deletePost(postId: string) {
      if (!postId) return;
      return api.adminDeleteBlogPost(postId);
    },

    /* ---------------- PUBLIC LIKE (UX optimale) ---------------- */

    async likePost(postId: string) {
      if (!postId) return;
      if (this.likedLocal.has(postId)) return { ok: true, alreadyLocal: true };

      this.likedLocal.add(postId);
      saveLocalLikedPosts(this.likedLocal);

      const p = this.posts.find((x) => x.id === postId);
      if (p) p.likes = Number(p.likes || 0) + 1;

      try {
        return await api.likeBlogPost(postId);
      } catch (e: unknown) {
        this.likedLocal.delete(postId);
        saveLocalLikedPosts(this.likedLocal);
        if (p) p.likes = Math.max(0, Number(p.likes || 0) - 1);
        throw e; // ⬅️ remonte pour showApiError
      }
    },

    /* ---------------- Email job ---------------- */

    async sendLastPostNotification() {
      throw new Error(
        "blog_notification_endpoint_not_available_use_adminCreateBlogPost",
      );
    },

    startPolling(jobId: string) {
      if (!jobId) return;

      this.stopPolling();
      this.blogJobId = jobId;
      localStorage.setItem("blogJobId", jobId);

      this._pollTimer = setInterval(async () => {
        try {
          const j = (await api.getEmailJob(jobId)) as BlogJob;
          this.blogJob = j;

          if (j.status === "done" || j.status === "error") {
            localStorage.removeItem("blogJobId");
            this.blogJobId = "";
            this.stopPolling();
          }
        } catch {
          // ⬇️ on expose l'info au composant, qui affichera via showApiError si besoin
          this.error = "BLOG_JOB_POLL_ERROR";
          this.blogJob = {
            ...(this.blogJob || { id: jobId }),
            status: "error",
            error: "poll_failed",
          };
          this.stopPolling();
        }
      }, 2000);
    },

    stopPolling() {
      if (this._pollTimer) clearInterval(this._pollTimer);
      this._pollTimer = null;
    },
  },
});

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    try {
      const store = useBlogStore();
      store.stop?.();
    } catch {}
  });
}
