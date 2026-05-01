// src/utils/clientId.js
const KEY = "liana_client_id";

export function getClientId() {
  if (typeof window === "undefined") return "";

  let id = window.localStorage.getItem(KEY);
  if (!id) {
    id = (
      window.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`
    ).replace(/[^a-zA-Z0-9-]/g, "");
    window.localStorage.setItem(KEY, id);
  }
  return id;
}
