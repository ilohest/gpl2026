// src/utils/localLikes.js

const LS_KEY = "liana_liked_posts";

export function getLocalLikedPosts(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = window.localStorage.getItem(LS_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw) as unknown;
    const out = Array.isArray(arr) ? arr.map((v) => String(v || "")) : [];
    return new Set(out.filter(Boolean));
  } catch {
    return new Set();
  }
}

export function saveLocalLikedPosts(set: Set<string>): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(LS_KEY, JSON.stringify([...set]));
  } catch {
    // on ignore les erreurs de quota/etc.
  }
}
