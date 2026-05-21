<!-- src/pages/RsvpPage.vue -->
<template>
  <main>
    <section ref="pageRef" class="rsvp-page flex flex-col gap-8">
      <header class="rsvp-page__intro">
        <h1 class="rsvp-page__title">{{ t("rsvp.title") }}</h1>
        <p class="rsvp-page__excitement">{{ t("rsvp.excitement") }}</p>
        <div class="rsvp-page__deadline">
          <p>{{ t("rsvp.instructions") }}</p>
          <p>{{ t("rsvp.deadline") }}</p>
        </div>
      </header>

      <div class="flex flex-col gap-8">
        <!-- Form -->
        <form
          v-if="!done"
          id="rsvp-form"
          @submit="onSubmit"
          class="max-w-xl mx-auto w-full flex flex-col gap-4 p-4 md:p-8 border-2 border-solid border-[var(--accent-color)] rounded-[20px]"
        >
          <!-- Personne principale -->
          <div>
            <label for="firstName" class="text-sm md:text-base">{{
              t("rsvp.form.name")
            }}</label>
            <input
              id="firstName"
              v-model="firstName"
              required
              class="form-input"
            />
          </div>

          <div>
            <label for="lastName" class="text-sm md:text-base">{{
              t("rsvp.form.surname")
            }}</label>
            <input
              id="lastName"
              v-model="lastName"
              required
              class="form-input"
            />
          </div>

          <div>
            <label for="email" class="text-sm md:text-base">{{
              t("rsvp.form.email")
            }}</label>
            <input
              id="email"
              type="email"
              v-model="email"
              required
              class="form-input"
            />
          </div>

          <div>
            <label for="rsvpMessage" class="text-sm md:text-base">
              {{ t("rsvp.form.message") }}
            </label>

            <Textarea
              input-id="rsvpMessage"
              v-model.trim="message"
              required
              class="form-input"
            />
          </div>

          <!-- Présence (groupe) -->
          <Fieldset
            :legend="t('rsvp.form.attending')"
            class="w-full bg-transparent p-0 text-sm md:text-base"
          >
            <SelectButton
              v-model="attending"
              :options="ynOptions"
              option-label="label"
              option-value="value"
              :pt="selectPt"
              class="w-full"
            />
          </Fieldset>

          <!-- Régime PERSONNE PRINCIPALE (multi-sélection standardisée) -->
          <Fieldset
            v-if="!isNotAttending"
            :legend="t('rsvp.form.diet')"
            class="w-full bg-transparent p-0 border-0 shadow-none text-sm md:text-base"
          >
            <SelectButton
              v-model="dietCodes"
              :options="dietOptions"
              option-label="label"
              option-value="value"
              multiple
              :pt="dietSelectPt"
              class="w-full rsvp-diet-select"
              :disabled="isNotAttending"
            />

            <div
              v-if="
                !isNotAttending &&
                Array.isArray(dietCodes) &&
                dietCodes.includes('other')
              "
              class="mt-2"
            >
              <label for="detalles-restriccion-main">
                {{ t("rsvp.form.diet_details") }}
              </label>
              <input
                id="detalles-restriccion-main"
                v-model="dietOtherText"
                class="form-input"
              />
            </div>
          </Fieldset>

          <!-- INVITÉS SUPPLÉMENTAIRES -->
          <Fieldset
            v-if="!isNotAttending"
            :legend="t('rsvp.form.additional_guests_title')"
            class="w-full bg-transparent p-0 text-sm md:text-base"
          >
            <div class="flex flex-col gap-4">
              <p class="text-sm text-gray-600 text-left">
                {{ t("rsvp.form.additional_guests_help") }}
              </p>
              <div class="flex items-center justify-between">
                <Button
                  size="small"
                  type="button"
                  icon="pi pi-plus"
                  :label="t('rsvp.form.add_guest')"
                  class="text-white px-4 py-2"
                  :style="{
                    backgroundColor: 'var(--accent-color)',
                    borderColor: 'var(--accent-color)',
                    color: 'white',
                  }"
                  :disabled="isNotAttending"
                  @click="addCompanion"
                />
              </div>

              <div
                v-for="(comp, index) in companions"
                :key="comp.id"
                class="border-3 border-[var(--secondary-text-color)] rounded-2xl p-4 flex flex-col gap-3"
              >
                <div class="flex items-center justify-between mb-2">
                  <h4 class="font-medium">
                    {{ t("rsvp.form.guest_n") }}
                    {{ index + 2 }}
                  </h4>
                  <Button
                    size="small"
                    type="button"
                    icon="pi pi-times"
                    text
                    rounded
                    class="p-button-sm"
                    @click="removeCompanion(index)"
                  />
                </div>

                <div>
                  <label :for="'comp-firstName-' + comp.id">
                    {{ t("rsvp.form.name") }}
                  </label>
                  <input
                    :id="'comp-firstName-' + comp.id"
                    v-model="comp.firstName"
                    required
                    class="form-input"
                  />
                </div>

                <div>
                  <label :for="'comp-lastName-' + comp.id">
                    {{ t("rsvp.form.surname") }}
                  </label>
                  <input
                    :id="'comp-lastName-' + comp.id"
                    v-model="comp.lastName"
                    required
                    class="form-input"
                  />
                </div>

                <!-- Régime invité (multi-sélection standardisée) -->
                <Fieldset
                  :legend="t('rsvp.form.diet')"
                  class="w-full bg-transparent p-0 border-0 shadow-none"
                >
                  <SelectButton
                    v-model="comp.dietCodes"
                    :options="dietOptions"
                    option-label="label"
                    option-value="value"
                    multiple
                    :pt="dietSelectPt"
                    class="w-full rsvp-diet-select"
                    :disabled="isNotAttending"
                  />

                  <div
                    v-if="
                      !isNotAttending &&
                      Array.isArray(comp.dietCodes) &&
                      comp.dietCodes.includes('other')
                    "
                    class="mt-2"
                  >
                    <label
                      :for="'comp-diet-' + comp.id"
                      class="text-sm md:text-base"
                    >
                      {{ t("rsvp.form.diet_details") }}
                    </label>
                    <input
                      :id="'comp-diet-' + comp.id"
                      v-model="comp.dietOtherText"
                      class="form-input"
                    />
                  </div>
                </Fieldset>
              </div>
            </div>
          </Fieldset>

          <Button
            size="small"
            type="submit"
            class="w-full text-white"
            :label="
              submitting ? t('rsvp.form.submitting') : t('rsvp.form.submit')
            "
            :loading="submitting"
            :style="{
              backgroundColor: 'var(--accent-color)',
              borderColor: 'var(--accent-color)',
              color: 'white',
            }"
          />
          <p class="rsvp-recaptcha-notice">
            {{ t("rsvp.recaptcha.prefix") }}
            <a
              href="https://policies.google.com/privacy"
              target="_blank"
              rel="noopener noreferrer"
            >
              {{ t("rsvp.recaptcha.privacy") }}
            </a>
            {{ t("rsvp.recaptcha.middle") }}
            <a
              href="https://policies.google.com/terms"
              target="_blank"
              rel="noopener noreferrer"
            >
              {{ t("rsvp.recaptcha.terms") }}
            </a>
            {{ t("rsvp.recaptcha.suffix") }}
          </p>
        </form>

        <ProgressSpinner
          v-if="submitting"
          style="width: 30px; height: 30px"
          stroke-width="8"
          fill="transparent"
          animation-duration=".5s"
        />

        <div id="confirmation-message" v-show="done">
          <h2>{{ t("rsvp.confirmation.title") }}</h2>
          <SafeRichText tag="p" :text="t('rsvp.confirmation.message')" />
          <h2>
            {{
              t("rsvp.confirmation.names")
                .replace("{bride}", brideFirstName)
                .replace("{groom}", groomFirstName)
            }}
          </h2>
        </div>

        <p
          v-if="emailWarning"
          class="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded p-3"
        >
          {{ emailWarning }}
        </p>
      </div>

      <div class="drinks-container mx-auto lg:mt-0">
        <img src="/assets/images/img6-1.png" alt="Preboda" class="img6-1" />
        <img src="/assets/images/img6-2.png" alt="Preboda" class="img6-2" />
      </div>
    </section>
  </main>
</template>

<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount } from "vue";

import SelectButton from "primevue/selectbutton";
import Fieldset from "primevue/fieldset";
import ProgressSpinner from "primevue/progressspinner";
import { useToast } from "primevue/usetoast";
import Button from "primevue/button";
import Textarea from "primevue/textarea";
import SafeRichText from "@/components/utils/SafeRichText.vue";

import {
  normalizeDietCodes,
  ensureOtherIfText,
  dietOptions as buildDietOptions,
} from "../../shared/dietTypes";
import { useLang } from "@/composables/useLang";
import { useRevealOnScroll } from "@/composables/useRevealOnScroll";
import weddingConfig from "../../shared/weddingConfig.ts";

const RECAPTCHA_SITE_KEY =
  import.meta.env.VITE_RECAPTCHA_SITE_KEY ||
  "6LdNOfMqAAAAAHMScG5Y9xU9_QM-t1UZs0rlNMeZ";
let recaptchaScriptEl = null;

function loadRecaptchaScript() {
  if (document.querySelector(`script[src*="recaptcha/api.js"]`)) return;
  const script = document.createElement("script");
  script.src = `https://www.google.com/recaptcha/api.js?render=${RECAPTCHA_SITE_KEY}`;
  script.async = true;
  document.head.appendChild(script);
  recaptchaScriptEl = script;
}

function unloadRecaptchaScript() {
  // Remove the script tag
  if (recaptchaScriptEl) {
    recaptchaScriptEl.remove();
    recaptchaScriptEl = null;
  }
  // Remove the badge injected by reCAPTCHA
  document.querySelectorAll(".grecaptcha-badge").forEach((el) => el.remove());
  // Clean up global grecaptcha object
  delete window.grecaptcha;
}

onMounted(() => {
  loadRecaptchaScript();
});

onBeforeUnmount(() => {
  unloadRecaptchaScript();
});

const toast = useToast();
const { t, loadLanguage, lang } = useLang();
const { brideFirstName, groomFirstName } = weddingConfig.couple;
const pageRef = ref(null);
useRevealOnScroll({
  root: pageRef,
  selector: ":scope > *",
});

const dietOptions = computed(() => buildDietOptions(t));

loadLanguage(lang.value);

/* Yes/No options (backend expects yes/no or booleans) */
const ynOptions = computed(() => [
  { label: t("rsvp.form.yes"), value: "yes" },
  { label: t("rsvp.form.no"), value: "no" },
]);

function normalizeYesNo(v, fallback = "no") {
  const s = String(v ?? "")
    .trim()
    .toLowerCase();
  return s === "yes" ? "yes" : s === "no" ? "no" : fallback;
}

function normalizeDietPayload(codes, otherText) {
  const other = String(otherText || "").trim();
  let out = normalizeDietCodes(codes, { dropUnknown: true });
  out = ensureOtherIfText(out, other);
  return { dietCodes: out, dietOtherText: other };
}

const selectPt = {
  root: { class: "w-full bg-transparent border-0 shadow-none" },
  button: { class: "flex-1 px-4 py-2 border rounded-2xl" },
};
const dietSelectPt = {
  root: { class: "w-full bg-transparent border-0 shadow-none" },
  button: { class: "px-3 py-1.5 border rounded-2xl text-sm" },
};

const firstName = ref("");
const lastName = ref("");
const email = ref("");
const message = ref("");

const attending = ref("yes"); // "yes" | "no"

const dietCodes = ref([]); // ALWAYS array
const dietOtherText = ref("");

const companions = ref([]);

const isNotAttending = computed(
  () => normalizeYesNo(attending.value, "no") === "no",
);

function cleanupWhenNotAttending() {
  dietCodes.value = [];
  dietOtherText.value = "";
  companions.value = [];
}

// When user switches to "no"
watch(attending, (val) => {
  if (normalizeYesNo(val, "no") === "no") cleanupWhenNotAttending();
});

function addCompanion() {
  if (isNotAttending.value) return;

  companions.value.push({
    id:
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : String(Date.now()) + "-" + String(Math.random()),
    firstName: "",
    lastName: "",
    dietCodes: [],
    dietOtherText: "",
  });
}

function removeCompanion(index) {
  companions.value.splice(index, 1);
}

/* UI */
const submitting = ref(false);
const done = ref(false);
const emailWarning = ref("");

async function onSubmit(e) {
  e?.preventDefault?.();
  if (submitting.value) return;
  submitting.value = true;
  emailWarning.value = "";

  try {
    // 1) reCAPTCHA v3
    if (!window.grecaptcha?.execute) throw new Error("RECAPTCHA_NOT_LOADED");
    await new Promise((resolve) => window.grecaptcha.ready(resolve));

    const recaptchaToken = await window.grecaptcha.execute(RECAPTCHA_SITE_KEY, {
      action: "submit",
    });
    if (!recaptchaToken) throw new Error("RECAPTCHA_TOKEN_MISSING");

    // 2) Payload (EN only)
    const groupAttending = normalizeYesNo(attending.value, "yes"); // "yes"|"no"
    const attendingBool = groupAttending === "yes";

    const mainDiet = normalizeDietPayload(
      dietCodes.value,
      Array.isArray(dietCodes.value) && dietCodes.value.includes("other")
        ? dietOtherText.value
        : "",
    );

    const guests = [
      {
        role: "PRIMARY",
        parentGuestId: null,
        index: 0,

        firstName: (firstName.value || "").trim(),
        lastName: (lastName.value || "").trim(),
        email: (email.value || "").trim(),

        attending: attendingBool,
        weddingEventParts: [],
        transport: false,

        dietCodes: attendingBool ? mainDiet.dietCodes : [],
        dietOtherText: attendingBool ? mainDiet.dietOtherText : "",

        isPrimary: true,
        isCouple: false,
        isChild: false,
      },
    ];

    companions.value.forEach((c, index) => {
      const diet = normalizeDietPayload(
        c.dietCodes,
        Array.isArray(c.dietCodes) && c.dietCodes.includes("other")
          ? c.dietOtherText
          : "",
      );

      guests.push({
        role: "PLUS_ONE",
        parentGuestId: null,
        index: index + 1,

        firstName: (c.firstName || "").trim(),
        lastName: (c.lastName || "").trim(),
        email: "",

        attending: attendingBool,
        weddingEventParts: [],
        transport: false,

        dietCodes: attendingBool ? diet.dietCodes : [],
        dietOtherText: attendingBool ? diet.dietOtherText : "",

        isPrimary: false,
        isCouple: false,
        isChild: false,
      });
    });

    const data = {
      email: (email.value || "").trim(),
      firstName: (firstName.value || "").trim(),
      lastName: (lastName.value || "").trim(),
      preferredLang: String(lang.value || "es")
        .trim()
        .toLowerCase(),

      message: (message.value || "").trim(),
      comments: "",
      songs: [],
      attending: attendingBool,

      guests,

      isCoupleGroup: false,
    };

    // 3) Submit backend
    const r = await fetch("/api/rsvp/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ recaptchaToken, data }),
    });

    const body = await r.json().catch(() => null);
    if (!r.ok || !body?.ok) {
      console.log("RSVP response", r.status, body);
      const errCode = body?.error || `HTTP_${r.status}`;
      throw new Error(`RSVP_SUBMIT_FAILED:${errCode}`);
    }

    // 4) UI success
    done.value = true;
    toast.add({
      severity: "success",
      summary: t("rsvp.toast.success_title"),
      detail: t("rsvp.submit_ok"),
      life: 10000,
    });
  } catch (err) {
    console.error("RSVP submit error:", err);
    toast.add({
      severity: "error",
      summary: t("rsvp.toast.error_title"),
      detail: t("rsvp.toast.error_detail"),
      life: 6000,
    });
  } finally {
    submitting.value = false;
  }
}
</script>

<style scoped>
.form-input {
  width: 100%;
  border: 1px solid #d1d5db; /* gray-300 */
  border-radius: 1rem; /* = rounded-2xl */
  padding: 0.5rem 0.75rem;
  background: transparent;
}

.rsvp-page {
  max-width: min(100%, 980px);
  margin: 0 auto;
  padding-top: clamp(72px, 10vw, 112px);
}

.rsvp-page__intro {
  max-width: 980px;
  margin: 0 auto clamp(12px, 2vw, 24px);
  text-align: center;
}

.rsvp-page__title {
  margin: 0 auto;
  color: #151817;
  font-family: "PPPangaia", "Antic Didone", serif;
  font-size: clamp(1.65rem, 3.1vw, 2rem);
  font-weight: 200;
  line-height: 0.95;
  text-wrap: balance;
  overflow-wrap: normal;
}

.rsvp-page__excitement {
  margin-top: clamp(34px, 4.5vw, 54px);
  color: #26302f;
  font-family: "PPPlayground", "MsClaudy", cursive;
  font-size: clamp(1.55rem, 2.7vw, 2rem);
  font-weight: 300;
  line-height: 0.9;
}

.rsvp-page__deadline {
  margin-top: clamp(38px, 5vw, 62px);
  color: #1f2524;
  font-family: "PPPangaia", "Antic Didone", serif;
  font-size: 1.2rem;
  font-weight: 200;
  line-height: 1.15;
}

.rsvp-page__deadline p {
  margin: 0;
}

.rsvp-recaptcha-notice {
  max-width: 34rem;
  margin: 0.25rem auto 0;
  color: #5f6665;
  font-size: 0.72rem;
  line-height: 1.45;
  text-align: center;
}

.rsvp-recaptcha-notice a {
  color: var(--accent-color);
  text-decoration: underline;
  text-underline-offset: 2px;
}

:deep(.p-fieldset),
:deep(.p-fieldset .p-fieldset-content),
:deep(.p-selectbutton),
:deep(.p-selectbutton .p-button) {
  background: transparent !important;
  box-shadow: none !important;
}

:deep(.p-fieldset) {
  border-radius: 1rem;
  border: 1px solid #d1d5db;
}

:deep(.p-selectbutton) {
  width: 100%;
}

:deep(.p-fieldset-legend) {
  justify-content: flex-start !important;
  text-align: left !important;
}

:deep(.p-fieldset-legend-label) {
  font-weight: normal !important;
}

:deep(.p-fieldset-legend-text) {
  margin-left: 0 !important;
}

:deep(.rsvp-diet-select .p-button) {
  padding: 0.35rem 0.65rem !important;
}

/* Mobile: stack options vertically for better readability/tap targets */
:deep(.rsvp-diet-select.p-selectbutton) {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

:deep(.rsvp-diet-select.p-selectbutton .p-button) {
  width: 100%;
}

@media (min-width: 768px) {
  :deep(.rsvp-diet-select.p-selectbutton) {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 0.5rem;
  }
}

@media (max-width: 520px) {
  .rsvp-page {
    gap: 1.6rem;
    padding-top: 84px;
  }

  .rsvp-page__title {
    font-size: clamp(1.55rem, 6.4vw, 1.95rem);
    line-height: 0.98;
  }

  .rsvp-page__excitement {
    margin-top: 18px;
    font-size: clamp(1.42rem, 7vw, 1.95rem);
    line-height: 0.95;
  }

  .rsvp-page__deadline {
    margin-top: 20px;
    font-size: clamp(1rem, 4.2vw, 1.18rem);
    max-width: 100%;
  }

  .rsvp-page .drinks-container {
    width: min(320px, 100%);
    height: 224px;
    margin: 0 auto !important;
    scale: 1;
    transform-origin: top center;
  }

  .rsvp-page .img6-1 {
    left: 47%;
  }

  .rsvp-page .img6-2 {
    left: 22%;
  }
}
</style>
