<!-- src/components/admin/AdminAiChat.vue -->
<template>
  <!-- FAB button -->
  <button
    class="ai-chat-fab"
    :class="{ 'ai-chat-fab--open': open }"
    @click="toggle"
    :aria-label="
      open ? t('admin.ai_chat.close_aria') : t('admin.ai_chat.open_aria')
    "
  >
    <i :class="open ? 'pi pi-times' : 'pi pi-sparkles'" />
  </button>

  <!-- Chat panel -->
  <Transition name="ai-chat-slide">
    <div v-if="open" class="ai-chat-panel">
      <!-- Header -->
      <div class="ai-chat-header">
        <div class="ai-chat-header__left">
          <i class="pi pi-sparkles" />
          <span>{{ headerTitle }}</span>
        </div>
        <button class="ai-chat-header__close" @click="open = false">
          <i class="pi pi-minus" />
        </button>
      </div>

      <!-- Messages -->
      <div ref="messagesContainer" class="ai-chat-messages">
        <div v-if="messages.length === 0" class="ai-chat-empty">
          <i class="pi pi-sparkles ai-chat-empty__icon" />
          <p class="ai-chat-empty__title">
            {{ t("admin.ai_chat.empty_title") }}
          </p>
          <p class="ai-chat-empty__hint">
            {{ emptyHint }}
          </p>
          <div class="ai-chat-suggestions">
            <button
              v-for="s in suggestions"
              :key="s"
              class="ai-chat-suggestion"
              @click="sendMessage(s)"
            >
              {{ s }}
            </button>
          </div>
        </div>

        <template v-for="(msg, idx) in messages" :key="idx">
          <div
            class="ai-chat-bubble"
            :class="
              msg.role === 'user'
                ? 'ai-chat-bubble--user'
                : 'ai-chat-bubble--ai'
            "
          >
            <span class="ai-chat-bubble__text">{{ msg.text }}</span>
            <button
              v-if="msg.role === 'assistant' && msg.cta?.query"
              type="button"
              class="ai-chat-cta"
              @click="openCta(msg)"
            >
              {{ msg.cta.label }}
            </button>
          </div>
        </template>

        <div
          v-if="loading"
          class="ai-chat-bubble ai-chat-bubble--ai ai-chat-bubble--loading"
        >
          <span class="ai-chat-loader"> <span /><span /><span /> </span>
        </div>
      </div>

      <div
        v-if="messages.length > 0 && suggestions.length"
        class="ai-chat-suggestions-float"
        :class="{ 'is-open': inlineSuggestionsOpen }"
      >
        <button
          type="button"
          class="ai-chat-suggestions-fab"
          :aria-expanded="inlineSuggestionsOpen ? 'true' : 'false'"
          :aria-label="
            inlineSuggestionsOpen
              ? t('admin.ai_chat.suggestions_hide_aria')
              : t('admin.ai_chat.suggestions_show_aria')
          "
          @click="inlineSuggestionsOpen = !inlineSuggestionsOpen"
        >
          <i
            class="pi pi-angle-up"
            :class="{ 'is-open': inlineSuggestionsOpen }"
          />
        </button>
        <div class="ai-chat-suggestions ai-chat-suggestions--floating">
          <button
            v-for="s in suggestions"
            :key="`inline-${s}`"
            class="ai-chat-suggestion"
            @click="sendMessage(s)"
          >
            {{ s }}
          </button>
        </div>
      </div>

      <!-- Input -->
      <form class="ai-chat-input" @submit.prevent="sendMessage(input)">
        <textarea
          ref="composerRef"
          v-model="input"
          :placeholder="t('admin.ai_chat.input_placeholder')"
          :disabled="loading"
          class="ai-chat-input__field"
          rows="1"
          autofocus
          @keydown="onComposerKeydown"
          @input="autoResizeComposer"
        />
        <button
          type="submit"
          class="ai-chat-input__send"
          :disabled="loading || !input.trim()"
        >
          <i class="pi pi-send" />
        </button>
      </form>
    </div>
  </Transition>
</template>

<script setup>
import { computed, ref, nextTick, watch, onMounted } from "vue";
import { api } from "@/services/api.ts";
import { useLang } from "@/composables/useLang";
import { useRouter } from "vue-router";

const props = defineProps({
  scope: {
    type: String,
    default: "admin", // "admin" | "superadmin"
  },
  pageContext: {
    type: String,
    default: "", // e.g. dashboard, rsvp, finances, superadmin:users
  },
});
const { lang, t } = useLang();
const router = useRouter();

const scopeKey = computed(() => String(props.scope || "admin").toLowerCase());
const STORAGE_KEY = computed(() => `admin_ai_chat_history:${scopeKey.value}`);
const OPEN_STORAGE_KEY = computed(() => `admin_ai_chat_open:${scopeKey.value}`);

const open = ref(false);
const input = ref("");
const loading = ref(false);
const messages = ref([]);
const messagesContainer = ref(null);
const composerRef = ref(null);
const inlineSuggestionsOpen = ref(false);

function hasTruncatedList(text) {
  const s = String(text || "");
  return (
    /\by\s+\d+\s+m[aá]s\b/i.test(s) ||
    /\band\s+\d+\s+more\b/i.test(s) ||
    /\bet\s+\d+\s+autres?\b/i.test(s)
  );
}

function normalizeText(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");
}

function detectWeddingPartCode(input) {
  const v = normalizeText(input);
  if (!v) return "";
  if (v.includes("brunch")) return "brunch";
  if (v.includes("cocktail") || v.includes("coctel")) return "cocktailReception";
  if (v.includes("dinner") || v.includes("cena")) return "dinner";
  if (v.includes("party") || v.includes("fiesta")) return "party";
  if (
    v.includes("mass") ||
    v.includes("misa") ||
    v.includes("messe") ||
    v.includes("ceremon")
  ) {
    return "mass";
  }
  return "";
}

function isTransportQuestion(input) {
  const v = normalizeText(input);
  return (
    v.includes("transport") ||
    v.includes("transporte") ||
    v.includes("navette") ||
    v.includes("shuttle")
  );
}

function buildRsvpFilterCta(userMessage, answerText) {
  const locale = String(lang?.value || "en").toLowerCase();
  const text = normalizeText(userMessage);
  const labelFor = (kind) => {
    if (locale.startsWith("es")) {
      if (kind === "transport") return "Ver invitados con transporte";
      if (kind === "attending") return "Ver invitados confirmados";
      if (kind === "declined") return "Ver invitados que no vienen";
      if (kind === "child") return "Ver invitados niños";
      if (kind === "couple") return "Ver parejas";
      if (kind === "primary") return "Ver invitados principales";
      if (kind === "plusone") return "Ver acompañantes";
      if (kind === "diet") return "Ver invitados con esa restricción";
      return "Ver respuestas filtradas";
    }
    if (locale.startsWith("fr")) {
      if (kind === "transport") return "Voir les invités avec transport";
      if (kind === "attending") return "Voir les invités confirmés";
      if (kind === "declined") return "Voir les invités non présents";
      if (kind === "child") return "Voir les invités enfants";
      if (kind === "couple") return "Voir les couples";
      if (kind === "primary") return "Voir les invités principaux";
      if (kind === "plusone") return "Voir les accompagnants";
      if (kind === "diet") return "Voir les invités avec cette restriction";
      return "Voir les réponses filtrées";
    }
    if (kind === "transport") return "View guests needing transport";
    if (kind === "attending") return "View confirmed guests";
    if (kind === "declined") return "View guests not attending";
    if (kind === "child") return "View child guests";
    if (kind === "couple") return "View couples";
    if (kind === "primary") return "View primary guests";
    if (kind === "plusone") return "View plus-ones";
    if (kind === "diet") return "View guests with this diet";
    return "View filtered RSVP table";
  };

  if (isTransportQuestion(userMessage)) {
    return { label: labelFor("transport"), query: { section: "rsvp", transport: "yes" } };
  }

  if (
    text.includes("quien viene") ||
    text.includes("qui vient") ||
    text.includes("who is attending") ||
    text.includes("confirmad")
  ) {
    return { label: labelFor("attending"), query: { section: "rsvp", attending: "yes" } };
  }

  if (
    text.includes("no viene") ||
    text.includes("declin") ||
    text.includes("not attending")
  ) {
    return { label: labelFor("declined"), query: { section: "rsvp", attending: "no" } };
  }

  if (
    text.includes("nino") ||
    text.includes("nina") ||
    text.includes("niñ") ||
    text.includes("enfant") ||
    text.includes("child") ||
    text.includes("kids")
  ) {
    return { label: labelFor("child"), query: { section: "rsvp", rowType: "CHILD" } };
  }

  if (
    text.includes("pareja") ||
    text.includes("parejas") ||
    text.includes("couple") ||
    text.includes("couples")
  ) {
    return { label: labelFor("couple"), query: { section: "rsvp", rowType: "COUPLE" } };
  }

  if (
    text.includes("acompanante") ||
    text.includes("accompagnant") ||
    text.includes("plus one") ||
    text.includes("plus-one")
  ) {
    return { label: labelFor("plusone"), query: { section: "rsvp", rowType: "PLUS_ONE" } };
  }

  if (
    text.includes("principal") ||
    text.includes("main guest") ||
    text.includes("invite principal")
  ) {
    return { label: labelFor("primary"), query: { section: "rsvp", rowType: "PRIMARY" } };
  }

  const dietMap = [
    ["vegetarian", ["vegetarian", "vegetar", "vegetarien", "vegetariana"]],
    ["vegan", ["vegan"]],
    ["gluten_free", ["gluten", "sin gluten", "sans gluten"]],
    ["lactose_free", ["lactose", "sin lactosa", "sans lactose"]],
    ["nuts_allergy", ["nuts", "frutos secos", "allergie noix", "allergie aux fruits a coque"]],
    ["pregnant", ["pregnan", "embaraz", "grossesse"]],
    ["other", ["other", "otra", "autre"]],
  ];
  for (const [code, keys] of dietMap) {
    if (keys.some((k) => text.includes(k))) {
      return { label: labelFor("diet"), query: { section: "rsvp", diet: code } };
    }
  }

  const part = detectWeddingPartCode(userMessage);
  if (part && hasTruncatedList(answerText)) {
    return { label: labelFor("generic"), query: { section: "rsvp", weddingPart: part } };
  }

  if (
    text.includes("rsvp") ||
    text.includes("invitad") ||
    text.includes("invite") ||
    text.includes("respuesta")
  ) {
    return { label: labelFor("generic"), query: { section: "rsvp" } };
  }

  return null;
}

function openCta(msg) {
  const query = msg?.cta?.query;
  if (!query) return;
  router.push({ path: "/admin", query, hash: "#rsvp-responses-bento" });
}

function resolveSuggestionTexts(keys) {
  return keys
    .map((key) => t(`admin.ai_chat.suggestions.${key}`))
    .filter((value, idx) => value !== `admin.ai_chat.suggestions.${keys[idx]}`);
}

const suggestions = computed(() => {
  const ctx = String(props.pageContext || "").toLowerCase();
  if (scopeKey.value === "superadmin") {
    if (ctx.includes("invites")) {
      return resolveSuggestionTexts([
        "superadmin_invites_1",
        "superadmin_invites_2",
      ]);
    }
    return resolveSuggestionTexts(["superadmin_users_1", "superadmin_users_2"]);
  }
  if (ctx.includes("rsvp")) {
    return resolveSuggestionTexts(["rsvp_1", "rsvp_2", "rsvp_3"]);
  }
  if (ctx.includes("finances")) {
    return resolveSuggestionTexts(["finances_1", "finances_2", "finances_3"]);
  }
  if (ctx.includes("seating")) {
    return resolveSuggestionTexts(["seating_1", "seating_2", "seating_3"]);
  }
  if (ctx.includes("agenda")) {
    return resolveSuggestionTexts(["agenda_1", "agenda_2", "agenda_3"]);
  }
  if (ctx.includes("playlist")) {
    return resolveSuggestionTexts(["playlist_1", "playlist_2", "playlist_3"]);
  }
  if (ctx.includes("planner")) {
    return resolveSuggestionTexts(["planner_1", "planner_2", "planner_3"]);
  }
  if (ctx.includes("menus")) {
    return resolveSuggestionTexts(["menus_1", "menus_2", "menus_3"]);
  }
  if (ctx.includes("blog")) {
    return resolveSuggestionTexts(["blog_1", "blog_2"]);
  }
  if (ctx.includes("email")) {
    return resolveSuggestionTexts(["email_1", "email_2"]);
  }
  return resolveSuggestionTexts([
    "default_admin_1",
    "default_admin_2",
    "default_admin_3",
  ]);
});

const headerTitle = computed(() =>
  scopeKey.value === "superadmin"
    ? t("admin.ai_chat.header_superadmin")
    : t("admin.ai_chat.header"),
);

const emptyHint = computed(() =>
  scopeKey.value === "superadmin"
    ? t("admin.ai_chat.empty_hint_superadmin")
    : t("admin.ai_chat.empty_hint"),
);

function toggle() {
  open.value = !open.value;
}

function scrollToBottom() {
  nextTick(() => {
    if (messagesContainer.value) {
      messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight;
    }
  });
}

function autoResizeComposer(event) {
  const el = event?.target;
  if (!el) return;
  el.style.height = "auto";
  el.style.height = `${Math.min(el.scrollHeight, 140)}px`;
}

function onComposerKeydown(event) {
  if (event.key !== "Enter") return;
  if (event.shiftKey) return; // keep newline
  event.preventDefault();
  sendMessage(input.value);
}

watch(open, (v) => {
  if (v) scrollToBottom();
  if (!v) inlineSuggestionsOpen.value = false;
  try {
    localStorage.setItem(OPEN_STORAGE_KEY.value, v ? "1" : "0");
  } catch {}
});

// Load history
onMounted(() => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY.value);
    if (saved) {
      messages.value = JSON.parse(saved);
    }
  } catch (e) {
    console.error("Failed to load chat history", e);
  }

  try {
    const savedOpen = localStorage.getItem(OPEN_STORAGE_KEY.value);
    if (savedOpen === "1") open.value = true;
  } catch {}
});

// Save history (debounced/watch)
watch(
  messages,
  (newVal) => {
    try {
      // Keep last 50 messages
      if (newVal.length > 50) {
        messages.value = newVal.slice(-50);
        return; // change triggers watch again
      }
      localStorage.setItem(STORAGE_KEY.value, JSON.stringify(newVal));
    } catch (e) {
      console.error("Failed to save chat history", e);
    }
  },
  { deep: true },
);

// Close on Escape
if (typeof window !== "undefined") {
  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && open.value) {
      open.value = false;
    }
  });
}

async function sendMessage(text) {
  const msg = String(text || "").trim();
  if (!msg || loading.value) return;

  inlineSuggestionsOpen.value = false;
  input.value = "";
  if (composerRef.value) composerRef.value.style.height = "auto";
  messages.value.push({ role: "user", text: msg });
  scrollToBottom();

  loading.value = true;

  try {
    // Build history from last 6 messages
    const history = messages.value
      .slice(-7, -1) // exclude the message we just pushed
      .map((m) => ({ role: m.role, text: m.text }));

    const res = await api.aiChat({
      message: msg,
      history,
      scope: scopeKey.value,
      locale: String(lang?.value || "en"),
    });

    const cta = buildRsvpFilterCta(msg, res?.answer || "");
    messages.value.push({
      role: "assistant",
      text: res.answer || t("admin.ai_chat.fallback_answer"),
      cta,
    });
  } catch (err) {
    console.error("[AdminAiChat] Error:", err);
    messages.value.push({
      role: "assistant",
      text: t("admin.ai_chat.error_answer"),
    });
  } finally {
    loading.value = false;
    scrollToBottom();
  }
}
</script>

<style scoped>
/* ---- FAB Button ---- */
.ai-chat-fab {
  position: fixed;
  bottom: 10px;
  right: 24px;
  z-index: 1100;
  width: 56px;
  height: 56px;
  border-radius: 50%;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.4rem;
  color: #fff;
  background: linear-gradient(
    135deg,
    var(--accent-color, #7c6a54) 0%,
    #4da3ff 100%
  );
  box-shadow:
    0 4px 14px rgba(0, 0, 0, 0.25),
    0 0 0 0 rgba(124, 106, 84, 0.4);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  animation: fab-pulse 2.5s infinite;
}

.ai-chat-fab:hover {
  transform: scale(1.08);
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.3);
  background: linear-gradient(
    135deg,
    var(--accent-color, #7c6a54) 0%,
    #5ab1ff 100%
  );
  animation: none;
}

.ai-chat-fab--open {
  animation: none;
  background: linear-gradient(
    135deg,
    var(--accent-color, #7c6a54) 0%,
    #4da3ff 100%
  );
}

@keyframes fab-pulse {
  0%,
  100% {
    box-shadow:
      0 4px 14px rgba(0, 0, 0, 0.25),
      0 0 0 0 rgba(124, 106, 84, 0.4);
  }
  50% {
    box-shadow:
      0 4px 14px rgba(0, 0, 0, 0.25),
      0 0 0 8px rgba(124, 106, 84, 0);
  }
}

/* ---- Chat Panel ---- */
.ai-chat-panel {
  position: fixed;
  bottom: 108px;
  right: 24px;
  z-index: 1099;
  width: 380px;
  max-width: calc(100vw - 32px);
  height: 520px;
  max-height: calc(100vh - 140px);
  border-radius: 16px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  background: #fff;
  border: 1px solid rgba(0, 0, 0, 0.08);
  box-shadow:
    0 20px 60px rgba(0, 0, 0, 0.15),
    0 0 0 1px rgba(0, 0, 0, 0.04);
}

/* ---- Header ---- */
.ai-chat-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  background: linear-gradient(
    135deg,
    var(--accent-color, #7c6a54) 0%,
    #4da3ff 100%
  );
  color: #fff;
  flex-shrink: 0;
}

.ai-chat-header__left {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
  font-size: 0.95rem;
}

.ai-chat-header__close {
  background: none;
  border: none;
  color: rgba(255, 255, 255, 0.7);
  cursor: pointer;
  padding: 4px;
  border-radius: 6px;
  transition: all 0.2s;
}

.ai-chat-header__close:hover {
  color: #fff;
  background: rgba(255, 255, 255, 0.15);
}

.ai-chat-header__action {
  background: none;
  border: none;
  color: rgba(255, 255, 255, 0.7);
  cursor: pointer;
  padding: 4px;
  border-radius: 6px;
  transition: all 0.2s;
  margin-right: 4px;
}

.ai-chat-header__action:hover {
  color: #ffcccc;
  background: rgba(255, 255, 255, 0.15);
}

/* ---- Messages area ---- */
.ai-chat-messages {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  background: linear-gradient(180deg, #ffffff 0%, #f6efe7 100%);
}

/* ---- Empty state ---- */
.ai-chat-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  flex: 1;
  gap: 8px;
  padding: 16px 0;
}

.ai-chat-empty__icon {
  font-size: 2rem;
  color: var(--primary-color, #7c6a54);
  opacity: 0.6;
  margin-bottom: 4px;
}

.ai-chat-empty__title {
  font-size: 1rem;
  font-weight: 600;
  color: var(--text-color, #3e3529);
  margin: 0;
}

.ai-chat-empty__hint {
  font-size: 0.82rem;
  color: #888;
  margin: 0;
  max-width: 260px;
}

.ai-chat-suggestions {
  display: flex;
  flex-direction: column;
  gap: 5px;
  width: 100%;
  margin-top: 10px;
}

.ai-chat-suggestions-float {
  position: absolute;
  right: 12px;
  bottom: 56px;
  z-index: 3;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 8px;
}

.ai-chat-suggestions-fab {
  width: 28px;
  height: 28px;
  border-radius: 999px;
  border: 1px solid rgba(0, 0, 0, 0.08);
  background: #fff;
  color: #777;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.14);
}

.ai-chat-suggestions-fab i {
  transition: transform 0.2s ease;
}

.ai-chat-suggestions-fab i.is-open {
  transform: rotate(180deg);
}

.ai-chat-suggestions--floating {
  margin: 0;
  width: min(300px, calc(100vw - 64px));
  max-height: 0;
  opacity: 1;
  overflow: hidden;
  background: #fff;
  border-radius: 10px;
  box-shadow: 0 10px 24px rgba(0, 0, 0, 0.16);
  padding: 0;
  transition:
    max-height 0.2s ease,
    padding 0.2s ease;
}

.ai-chat-suggestions-float.is-open .ai-chat-suggestions--floating {
  max-height: 190px;
  padding: 8px;
}

.ai-chat-suggestion {
  background: #fff;
  border: 1px solid rgba(0, 0, 0, 0.1);
  border-radius: 10px;
  padding: 6px 10px;
  font-size: 0.76rem;
  font-weight: 500;
  color: #222;
  cursor: pointer;
  text-align: left;
  transition: all 0.2s ease;
  opacity: 1;
}

.ai-chat-suggestion:hover {
  background: #f8f8f8;
  color: #111;
  border-color: rgba(0, 0, 0, 0.18);
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);
  transform: translateY(-1px);
}

/* ---- Bubbles ---- */
.ai-chat-bubble {
  max-width: 85%;
  padding: 10px 14px;
  border-radius: 14px;
  font-size: 0.88rem;
  line-height: 1.45;
  word-wrap: break-word;
  animation: bubble-in 0.25s ease-out;
}

.ai-chat-bubble--user {
  align-self: flex-end;
  margin-left: auto;
  text-align: right;
  background: #ffffff;
  color: var(--text-color, #3e3529);
  border: 1px solid rgba(77, 163, 255, 0.28);
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.06);
  border-bottom-right-radius: 4px;
}

.ai-chat-bubble--ai {
  align-self: flex-start;
  background: linear-gradient(
    135deg,
    var(--accent-color, #7c6a54) 0%,
    #4da3ff 100%
  );
  color: #fff;
  border-bottom-left-radius: 4px;
  text-align: left;
}

.ai-chat-bubble__text {
  white-space: pre-wrap;
}

.ai-chat-cta {
  margin-top: 0.55rem;
  width: 100%;
  border: 1px solid rgba(255, 255, 255, 0.55);
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.2);
  color: inherit;
  font-size: 0.78rem;
  font-weight: 600;
  padding: 0.45rem 0.55rem;
  text-align: left;
  cursor: pointer;
}

.ai-chat-cta:hover {
  background: rgba(255, 255, 255, 0.3);
}

@keyframes bubble-in {
  from {
    opacity: 0;
    transform: translateY(8px) scale(0.96);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

/* ---- Loading dots ---- */
.ai-chat-bubble--loading {
  padding: 12px 18px;
}

.ai-chat-loader {
  display: inline-flex;
  gap: 4px;
}

.ai-chat-loader span {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--primary-color, #7c6a54);
  opacity: 0.5;
  animation: dot-bounce 1.2s ease-in-out infinite;
}

.ai-chat-loader span:nth-child(2) {
  animation-delay: 0.2s;
}

.ai-chat-loader span:nth-child(3) {
  animation-delay: 0.4s;
}

@keyframes dot-bounce {
  0%,
  60%,
  100% {
    transform: translateY(0);
    opacity: 0.5;
  }
  30% {
    transform: translateY(-6px);
    opacity: 1;
  }
}

/* ---- Input bar ---- */
.ai-chat-input {
  display: flex;
  align-items: flex-end;
  gap: 8px;
  padding: 10px 12px;
  border-top: 1px solid rgba(0, 0, 0, 0.06);
  background: #fafafa;
  flex-shrink: 0;
}

.ai-chat-input__field {
  flex: 1;
  border: 1px solid rgba(0, 0, 0, 0.1);
  border-radius: 10px;
  padding: 10px 14px;
  font-size: 0.88rem;
  line-height: 1.4;
  outline: none;
  background: #fff;
  color: var(--text-color, #3e3529);
  transition: border-color 0.2s;
  resize: none;
  min-height: 40px;
  max-height: 140px;
  overflow-y: auto;
}

.ai-chat-input__field:focus {
  border-color: var(--primary-color, #7c6a54);
}

.ai-chat-input__field::placeholder {
  color: #aaa;
}

.ai-chat-input__send {
  width: 38px;
  height: 38px;
  border-radius: 10px;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1rem;
  color: #fff;
  background: linear-gradient(
    135deg,
    var(--accent-color, #7c6a54) 0%,
    #4da3ff 100%
  );
  transition: all 0.2s;
  flex-shrink: 0;
}

.ai-chat-input__send:hover:not(:disabled) {
  transform: scale(1.05);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
  background: linear-gradient(
    135deg,
    var(--accent-color, #7c6a54) 0%,
    #5ab1ff 100%
  );
}

.ai-chat-input__send:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

/* ---- Slide Transition ---- */
.ai-chat-slide-enter-active,
.ai-chat-slide-leave-active {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.ai-chat-slide-enter-from,
.ai-chat-slide-leave-to {
  opacity: 0;
  transform: translateY(16px) scale(0.95);
}

/* ---- Responsive ---- */
@media (max-width: 480px) {
  .ai-chat-panel {
    width: calc(100vw - 16px);
    right: 8px;
    bottom: 92px;
    height: calc(100vh - 100px);
    max-height: calc(100vh - 100px);
    border-radius: 12px;
  }

  .ai-chat-fab {
    bottom: 16px;
    right: 16px;
    width: 50px;
    height: 50px;
    font-size: 1.2rem;
  }

  .ai-chat-suggestions-float {
    right: 10px;
    bottom: 54px;
  }

  .ai-chat-suggestions--floating {
    width: min(280px, calc(100vw - 48px));
  }
}
</style>
