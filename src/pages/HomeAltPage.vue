<template>
  <section
    ref="pageRef"
    class="home-alt"
  >
    <header
      class="home-alt__hero mx-auto max-w-[980px] px-4 py-6 md:px-8 md:py-10"
    >
      <p class="home-alt__eyebrow">{{ t("intro.welcome") }}</p>
      <h1 class="home-alt__names text-center">
        <span>{{ t("intro.names") }}</span>
      </h1>
      <p class="home-alt__date text-center">
        {{ weddingConfig.event.dateDisplayShort }}
      </p>
    </header>

    <main class="home-alt__sections flex flex-col gap-16">
      <section class="home-alt__section mx-auto max-w-[900px] px-4 text-center">
        <p>{{ t("intro.excitement") }}</p>
        <SafeRichText
          tag="p"
          :text="
            t('invitation.intro', {
              invitationDateTime: eventLocale.invitationDateTime,
              ceremonyVenue: weddingConfig.ceremony.venueName,
            })
          "
        />

        <p>
          <a
            :href="weddingConfig.celebration.mapUrl"
            target="_blank"
            rel="noopener noreferrer"
            class="home-alt__text-link home-alt__place"
          >{{
            t("invitation.location", {
              celebrationVenue: weddingConfig.celebration.venueName,
            })
          }}</a>
        </p>

        <p>{{ t("invitation.activities") }}</p>
      </section>
      <p class="home-alt__closing">{{ t("invitation.cant-miss") }}</p>
      <img
        v-if="showNoPuedesFaltarImage"
        :src="noPuedesFaltarImageSrc"
        alt=""
        aria-hidden="true"
        class="home-alt__no-puedes-faltar-image"
        @error="onNoPuedesFaltarImageError"
      />

      <section class="home-alt__schedule relative">
        <img
          v-if="showGrape"
          :src="grapeImageSrc"
          alt=""
          aria-hidden="true"
          class="home-alt__schedule-grape"
          @error="onGrapeImageError"
        />
        <img
          v-if="showLamps"
          :src="lampsImageSrc"
          alt=""
          aria-hidden="true"
          class="home-alt__schedule-lamps"
          @error="onLampsImageError"
        />

        <div class="home-alt__schedule-grid">
          <article class="home-alt__schedule-card">
            <h2>{{ t("schedule.ceremony.title") }}</h2>

            <a
              :href="weddingConfig.ceremony.mapUrl"
              target="_blank"
              rel="noopener noreferrer"
              class="home-alt__venue-link"
            >
              {{
                t("schedule.ceremony.place", {
                  ceremonyVenue: weddingConfig.ceremony.venueName,
                })
              }}
            </a>

            <SafeRichText
              tag="p"
              class="home-alt__address"
              :text="
                t('schedule.ceremony.address', {
                  ceremonyAddress: weddingConfig.ceremony.addressHtml,
                })
              "
            />
          </article>

          <article class="home-alt__schedule-card">
            <h2>{{ t("schedule.celebration.title") }}</h2>

            <a
              :href="weddingConfig.celebration.mapUrl"
              target="_blank"
              rel="noopener noreferrer"
              class="home-alt__venue-link"
            >
              {{
                t("schedule.celebration.place", {
                  celebrationVenue: weddingConfig.celebration.venueName,
                })
              }}
            </a>

            <SafeRichText
              tag="p"
              class="home-alt__address"
              :text="
                t('schedule.celebration.address', {
                  celebrationAddress: weddingConfig.celebration.addressHtml,
                })
              "
            />
          </article>
        </div>
      </section>

      <section class="home-alt__timeline px-4">
        <h2>Timeline</h2>
        <div class="home-alt__timeline-row">
          <article
            v-for="item in timelineItems"
            :key="item.key"
            :class="`home-alt__timeline-step home-alt__timeline-step--${item.key}`"
          >
            <template v-if="item.key === 'cocktail' || item.key === 'party'">
              <h3>{{ item.label }}</h3>
              <p>{{ item.time }}</p>
              <img
                :src="item.image"
                :alt="item.label"
                class="home-alt__timeline-icon"
                @error="onTimelineImageError($event, item.fallback)"
              />
            </template>
            <template v-else>
              <img
                :src="item.image"
                :alt="item.label"
                class="home-alt__timeline-icon"
                @error="onTimelineImageError($event, item.fallback)"
              />
              <h3>{{ item.label }}</h3>
              <p>{{ item.time }}</p>
            </template>
          </article>
        </div>
      </section>

      <section class="home-alt__countdown-banner">
        <SafeRichText
          tag="p"
          class="home-alt__countdown-text"
          :text="countdownText"
        />
      </section>

      <section class="home-alt__rsvp mx-auto max-w-[860px] px-4 text-center">
        <h2>{{ t("homepagersvp.title") }}</h2>

        <RouterLink
          to="/rsvp"
          class="home-alt__rsvp-image-link"
        >
          <img
            :src="rsvpImageSrc"
            alt="Confirmar asistencia"
            class="home-alt__rsvp-image hover-effect1"
            @error="onRsvpImageError"
          />
        </RouterLink>

        <p class="home-alt__rsvp-lead">{{ t("homepagersvp.celebration") }}</p>

        <SafeRichText
          tag="p"
          :text="t('homepagersvp.instructions')"
        />

        <p class="home-alt__rsvp-deadline">
          <SafeRichText
            tag="span"
            :text="
              t('homepagersvp.deadline', {
                rsvpDeadline: rsvpLocale.deadline,
              })
            "
          />
        </p>

        <RouterLink
          to="/rsvp"
          class="home-alt__rsvp-button"
        >
          {{ t("homepagersvp.button") }}
        </RouterLink>

        <div class="home-alt__waves">
          <svg
            width="100%"
            height="130"
            viewBox="0 0 2000 100"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              id="wave-path-alt"
              d="M0 50 Q 375 -60, 750 50 T 1500 50 T 2250 50 T 3000 50"
              fill="transparent"
              stroke="transparent"
            />
            <text>
              <textPath
                id="animated-text-alt"
                href="#wave-path-alt"
                startOffset="0%"
              >
                {{ loopingWaveText }}
              </textPath>
            </text>
          </svg>
        </div>
      </section>

      <section
        class="home-alt__dresscode mx-auto max-w-[900px] px-4 text-center"
      >
        <h2>{{ t("dresscode.title") }}</h2>

        <div class="home-alt__split">
          <img
            :src="dresscodeImageSrc"
            alt="Dresscode"
            class="img11 delayed-image visible home-alt__dresscode-image home-alt__split-image"
          />

          <div class="home-alt__split-text">
            <SafeRichText
              tag="p"
              :text="t('dresscode.description')"
            />
          </div>
        </div>
      </section>

      <section class="home-alt__gift mx-auto max-w-[900px] px-4 text-center">
        <h2>{{ t("gift.title") }}</h2>

        <div class="home-alt__split">
          <img
            ref="giftImageRef"
            :src="giftImageSrc"
            alt="Viaje"
            @error="onGiftImageError"
            :class="[
              'img13',
              'scroll-image',
              'home-alt__gift-image',
              'home-alt__split-image',
              { visible: isGiftImageVisible },
            ]"
          />

          <div class="home-alt__split-text">
            <SafeRichText
              tag="p"
              :text="t('gift.description')"
            />

            <p class="home-alt__gift-iban">{{ weddingConfig.gift.iban }}</p>
          </div>
        </div>
      </section>

      <section class="home-alt__faq mx-auto max-w-[980px] px-4 text-center">
        <h2>{{ t("faq.title") }}</h2>

        <Accordion
          v-model:value="activePanels"
          class="max-w-3xl mx-auto w-full divide-y divide-gray-300"
        >
          <AccordionPanel
            v-for="(item, idx) in faqItems"
            :key="item.key"
            :value="String(idx)"
            :pt="{ root: { class: 'border-b border-gray-300' } }"
          >
            <AccordionHeader>
              <span class="block w-full text-center font-semibold">
                {{ item.header }}
              </span>
            </AccordionHeader>

            <AccordionContent>
              <p class="text-center">
                {{ item.answer }}
              </p>
            </AccordionContent>
          </AccordionPanel>
        </Accordion>
      </section>

      <section
        class="home-alt__ending mx-auto max-w-[900px] px-4 pb-4 text-center"
      >
        <h2>
          {{
            t("end.names", {
              bride: weddingConfig.couple.brideFirstName,
              groom: weddingConfig.couple.groomFirstName,
            })
          }}
        </h2>

        <img
          :src="cakeImageSrc"
          alt="Cake"
          class="home-alt__ending-cake"
          @error="onCakeImageError"
        />
      </section>
    </main>
  </section>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from "vue";
import { useLang } from "@/composables/useLang";
import { useRevealOnScroll } from "@/composables/useRevealOnScroll";
import weddingConfig from "../../shared/weddingConfig.ts";
import Accordion from "primevue/accordion";
import AccordionPanel from "primevue/accordionpanel";
import AccordionHeader from "primevue/accordionheader";
import AccordionContent from "primevue/accordioncontent";
import SafeRichText from "@/components/utils/SafeRichText.vue";
const { t, lang, loadLanguage } = useLang();
const pageRef = ref(null);
useRevealOnScroll({
  root: pageRef,
  selector:
    ":scope > header, :scope > main > *:not(.home-alt__countdown-banner)",
});

const currentLocale = computed(() => (lang.value === "en" ? "en" : "es"));
const eventLocale = computed(
  () => weddingConfig.event.perLocale[currentLocale.value],
);
const rsvpLocale = computed(
  () => weddingConfig.rsvp.perLocale[currentLocale.value],
);

void eventLocale.value;
void rsvpLocale.value;

const activePanels = ref(["0"]);
const faqItems = computed(() => [
  {
    key: "q1",
    header: t("faq.q1.question"),
    answer: t("faq.q1.answer"),
  },
  {
    key: "q2",
    header: t("faq.q2.question"),
    answer: t("faq.q2.answer"),
  },
  {
    key: "q3",
    header: t("faq.q3.question"),
    answer: t("faq.q3.answer"),
  },
]);

const loopingWaveText = computed(() => {
  const base = t("waves.text");
  return `${base}   ${base}   ${base}`;
});

const timelineItems = computed(() => [
  {
    key: "ceremony",
    label: t("schedule.ceremony.title"),
    time: eventLocale.value.ceremonyTime,
    image: "/assets/images/ceremonia.png",
  },
  {
    key: "cocktail",
    label: currentLocale.value === "en" ? "Cocktail" : "Cóctel",
    time: "19:00h",
    image: "/assets/images/coctel.png",
  },
  {
    key: "dinner",
    label: currentLocale.value === "en" ? "Dinner" : "Cena",
    time: "20:00h",
    image: "/assets/images/cena.png",
  },
  {
    key: "party",
    label: currentLocale.value === "en" ? "Party" : "Fiesta",
    time: "23:00h",
    image: "/assets/images/fiesta.png",
  },
]);

function onTimelineImageError(event, fallback) {
  const img = event.target;
  if (!img || img.dataset.fallbackApplied === "1") return;
  if (!fallback) return;
  img.dataset.fallbackApplied = "1";
  img.src = fallback;
}

function onRsvpImageError(event) {
  const img = event.target;
  if (!img || img.dataset.fallbackApplied === "1") return;
  img.dataset.fallbackApplied = "1";
  rsvpImageSrc.value = "/assets/images/img4-3.png";
}

function onGrapeImageError() {
  showGrape.value = false;
}

function onLampsImageError() {
  showLamps.value = false;
}

function onNoPuedesFaltarImageError() {
  showNoPuedesFaltarImage.value = false;
}

function onGiftImageError() {
  giftImageSrc.value = "/assets/images/img13.png";
}

function onCakeImageError() {
  cakeImageSrc.value = "/assets/images/img10.png";
}

const countdownText = ref("");
const rsvpImageSrc = ref("/assets/images/rsvp.png");
const grapeImageSrc = ref("/assets/images/grape.png");
const lampsImageSrc = ref("/assets/images/lamps.png");
const noPuedesFaltarImageSrc = ref("/assets/images/nopuedesfaltar.png");
const dresscodeImageSrc = ref("/assets/images/dresscode.png");
const giftImageSrc = ref("/assets/images/gift.png");
const cakeImageSrc = ref("/assets/images/cake.png");
const showGrape = ref(true);
const showLamps = ref(true);
const showNoPuedesFaltarImage = ref(true);
const giftImageRef = ref(null);
const isGiftImageVisible = ref(false);
const targetDate = new Date(weddingConfig.countdown.targetDateTimeUtc);
let countdownTimer;
let rafWave = 0;
let giftObserver = null;

function updateCountdownText() {
  const diff = +targetDate - +new Date();
  if (diff <= 0) {
    countdownText.value = t("countdown.event_day");
    return;
  }
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
  const minutes = Math.floor((diff / (1000 * 60)) % 60);
  countdownText.value = t("countdown.remaining_time", {
    days,
    hours,
    minutes,
  });
}

function animateWaveText(id, speed = 0.04) {
  const node = document.getElementById(id);
  if (!node) return;
  let offset = 0;
  const step = () => {
    offset -= speed;
    if (offset < -100) offset = 0;
    node.setAttribute("startOffset", `${offset}%`);
    rafWave = requestAnimationFrame(step);
  };
  step();
}

onMounted(() => {
  loadLanguage(lang.value);
  updateCountdownText();
  countdownTimer = setInterval(updateCountdownText, 1000);
  animateWaveText("animated-text-alt");

  giftObserver = new IntersectionObserver(
    (entries, obs) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        isGiftImageVisible.value = true;
        obs.unobserve(entry.target);
      });
    },
    { threshold: 0.2 },
  );

  if (giftImageRef.value) {
    giftObserver.observe(giftImageRef.value);
  }
});

onUnmounted(() => {
  clearInterval(countdownTimer);
  if (rafWave) cancelAnimationFrame(rafWave);
  giftObserver?.disconnect();
});

watch(lang, updateCountdownText);
</script>

<style scoped>
@import url("https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&display=swap");
@import url("https://fonts.googleapis.com/css2?family=Shadows+Into+Light&family=Sometype+Mono:ital,wght@0,400..700;1,400..700&display=swap");

.home-alt {
  --alt-ink: #1f1a16;
  --alt-muted: #62574d;
  --alt-accent: #842523;
  --alt-title-font: "Instrument Serif", serif;
  --alt-script-font: "Shadows Into Light", cursive;
  --alt-body-font: "Sometype Mono", monospace;

  position: relative;
  padding: clamp(2rem, 3vw, 4rem) clamp(1rem, 4vw, 3rem) 4rem;
  color: var(--alt-ink);
  font-family: var(--alt-body-font);
}

.home-alt h1,
.home-alt h2,
.home-alt h3,
.home-alt h4,
.home-alt h5,
.home-alt h6 {
  font-family: var(--alt-title-font);
  font-weight: 400;
  letter-spacing: 0.01em;
  line-height: 0.95;
  margin: 0;
}

.home-alt__hero {
  display: flex;
  flex-direction: column;
  gap: 6rem;
  margin: 0 auto;
  max-width: 980px;
  padding: clamp(1.5rem, 2vw, 2.5rem);
}

.home-alt__hero > * {
  margin-top: 0;
  margin-bottom: 0;
}

.home-alt__eyebrow {
  margin: 0;
  font-family: var(--alt-script-font);
  font-size: clamp(1.7rem, 4vw, 2.6rem);
  line-height: 0.9;
  color: var(--alt-muted);
}

.home-alt__hero h1 {
  font-size: clamp(3rem, 9vw, 7rem);
}

.home-alt__names {
  display: flex;
  align-items: baseline;
  justify-content: center;
  gap: 0.9rem;
  flex-wrap: wrap;
}

.home-alt__and {
  font-family: var(--alt-script-font);
  font-size: clamp(4rem, 10vw, 8rem);
  line-height: 0.7;
}

.home-alt__date {
  color: var(--alt-accent);
  font-family: var(--alt-script-font);
  font-size: clamp(2rem, 5.5vw, 3.4rem);
  line-height: 0.9;
}

.home-alt__intro {
  max-width: 70ch;
}

.home-alt__actions {
  margin-top: 1.5rem;
  display: flex;
  flex-wrap: wrap;
  gap: 0.8rem;
}

.home-alt__btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--alt-ink);
  padding: 0.55rem 1rem;
  color: var(--alt-paper);
  background: var(--alt-ink);
  text-decoration: none;
}

.home-alt__btn--ghost {
  color: var(--alt-ink);
  background: transparent;
}

.home-alt__sections {
  display: flex;
  flex-direction: column;
  gap: 4rem;
}

.home-alt__section {
  padding: clamp(1rem, 2vw, 1.5rem);
}

.home-alt__section p {
  margin: 0.75rem 0 0;
  color: var(--alt-muted);
}

.home-alt__place {
  color: var(--alt-ink);
  line-height: 1.05;
  font-weight: 700;
}

.home-alt__closing {
  color: var(--alt-accent);
  font-family: var(--alt-script-font);
  font-size: clamp(2rem, 5.5vw, 3.4rem);
  line-height: 0.9;
}

.home-alt__no-puedes-faltar-image {
  display: block;
  width: min(500px, 56vw);
  height: auto;
  margin: -2rem auto 0;
}

.home-alt__schedule {
  position: relative;
  background: #842523;
  color: #f7afb6;
  width: 100vw;
  margin-left: calc(50% - 50vw);
  margin-right: calc(50% - 50vw);
  padding: 6rem 1rem;
}

.home-alt__schedule-grape {
  position: absolute;
  right: 10%;
  bottom: 14%;
  width: clamp(40px, 4.4vw, 62px);
  height: auto;
  transform: rotate(-34deg);
  pointer-events: none;
}

.home-alt__schedule-lamps {
  position: absolute;
  left: -23px;
  top: 0;
  width: clamp(51px, 29vw, 324px);
  height: auto;
  pointer-events: none;
}

.home-alt__schedule-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  max-width: 800px;
  margin: 0 auto;
  gap: clamp(0.7rem, 1.8vw, 1.1rem);
  align-items: start;
}

.home-alt__schedule-card {
  text-align: center;
}

.home-alt__schedule-card h2 {
  font-family: var(--alt-script-font);
  color: #f7afb6;
  font-size: clamp(1.8rem, 4vw, 2.5rem);
  line-height: 1;
}

.home-alt__venue-link {
  display: inline-block;
  margin-top: 1rem;
  color: #f7afb6;
  font-family: var(--alt-title-font);
  font-size: clamp(1.4rem, 3.2vw, 2rem);
  text-decoration: underline;
  text-underline-offset: 0.2em;
  text-decoration-thickness: 1px;
}

.home-alt__address {
  color: #f7afb6;
  margin-top: 1.25rem;
}

.home-alt__time {
  color: #f7afb6;
  margin-top: 1.3rem;
  font-size: clamp(1.2rem, 2.2vw, 1.4rem);
}

.home-alt__text-link {
  color: inherit;
  text-decoration: none;
}

.home-alt__text-link:hover {
  text-decoration: underline;
  text-underline-offset: 0.16em;
}

.home-alt__timeline {
  padding: clamp(2rem, 3vw, 2.8rem) clamp(1rem, 3vw, 2rem) 2.6rem;
}

.home-alt__timeline h2 {
  font-family: var(--alt-script-font);
  text-align: center;
  font-size: clamp(1.8rem, 4vw, 2.5rem);
}

.home-alt__timeline-row {
  position: relative;
  margin: 2rem auto 0;
  max-width: 1160px;
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: clamp(0.6rem, 1.5vw, 1rem);
}

.home-alt__timeline-step {
  display: flex;
  flex-direction: column;
  align-items: center;
  position: relative;
  z-index: 1;
  text-align: center;
  padding: 0.2rem;
}

.home-alt__timeline-icon {
  width: clamp(96px, 10.5vw, 132px);
  height: auto;
  object-fit: contain;
}

.home-alt__timeline-step--ceremony .home-alt__timeline-icon {
  width: clamp(96px, 9.5vw, 128px);
}

.home-alt__timeline-step--cocktail .home-alt__timeline-icon {
  width: clamp(132px, 13vw, 192px);
}

.home-alt__timeline-step--dinner .home-alt__timeline-icon {
  width: clamp(156px, 15vw, 228px);
}

.home-alt__timeline-step--party .home-alt__timeline-icon {
  width: clamp(124px, 12.5vw, 176px);
}

.home-alt__countdown-banner {
  width: 100vw;
  margin-left: calc(50% - 50vw);
  margin-right: calc(50% - 50vw);
  min-height: clamp(300px, 45vw, 620px);
  padding: clamp(2rem, 4vw, 4rem) 1rem;
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  background-image:
    linear-gradient(rgba(132, 37, 35, 0.2), rgba(132, 37, 35, 0.2)),
    url("/assets/images/flowers-bg.jpg");
  background-size: cover;
  background-position: 50% 50%;
  background-repeat: no-repeat;
  background-attachment: fixed;
}

.home-alt__countdown-text {
  margin: 0;
  color: #fff7f8;
  text-shadow: 0 2px 12px rgba(0, 0, 0, 0.22);
  font-family: var(--alt-title-font);
  font-size: clamp(1.8rem, 4.6vw, 3.6rem);
  line-height: 1.2;
}

.home-alt__rsvp {
  text-align: center;
  max-width: 860px;
  margin: 0 auto;
  padding: 0 1rem;
}

.home-alt__rsvp h2 {
  font-family: var(--alt-script-font);
  font-size: clamp(1.8rem, 4vw, 2.5rem);
}

.home-alt__rsvp-image-link {
  display: inline-block;
  margin-top: 1rem;
}

.home-alt__rsvp-image {
  width: min(160px, 52vw);
  height: auto;
}

.home-alt__rsvp-lead {
  margin-top: 1.1rem;
  color: var(--alt-accent);
  font-weight: 700;
}

.home-alt__rsvp p {
  margin: 0.8rem 0 0;
}

.home-alt__rsvp-button {
  display: inline-block;
  margin-top: 1rem;
  padding: 0.6rem 1.2rem;
  background: var(--alt-accent);
  color: #f7afb6;
  text-decoration: none;
  transition:
    transform 0.2s ease,
    background-color 0.2s ease,
    color 0.2s ease;
}

.home-alt__rsvp-button:hover {
  background: #f7afb6;
  color: var(--alt-accent);
}

.home-alt__waves {
  margin-top: 1rem;
  width: 100vw;
  margin-left: calc(50% - 50vw);
  margin-right: calc(50% - 50vw);
}

.home-alt__waves text {
  fill: var(--alt-accent);
  font-family: var(--alt-script-font);
  font-size: 1.8rem;
}

.home-alt__dresscode {
  text-align: center;
  max-width: 900px;
  margin: 0 auto;
  padding: 0 1rem;
}

.home-alt__dresscode h2 {
  font-family: var(--alt-script-font);
  font-size: clamp(1.8rem, 4vw, 2.5rem);
}

.home-alt__dresscode-image {
  margin: 1rem auto 0;
}

.home-alt__dresscode p {
  margin: 0.8rem 0 0;
}

.home-alt__dresscode-note {
  color: var(--alt-accent);
  font-weight: 700;
}

.home-alt__gift {
  text-align: center;
  max-width: 900px;
  margin: 0 auto;
  padding: 0 1rem;
}

.home-alt__gift h2 {
  font-family: var(--alt-script-font);
  font-size: clamp(1.8rem, 4vw, 2.5rem);
}

.home-alt__gift-image {
  margin: 1rem auto 0;
  width: 200px;
}

.home-alt__gift p {
  margin: 0.8rem 0 0;
}

.home-alt__gift-iban {
  color: var(--alt-accent);
  font-weight: 700;
}

.home-alt__split-text {
  text-align: center;
}

.home-alt__split-image {
  justify-self: center;
}

.home-alt__faq {
  text-align: center;
  max-width: 980px;
  margin: 0 auto;
  padding: 0 1rem 1rem;
}

.home-alt__faq h2 {
  font-family: var(--alt-script-font);
  font-size: clamp(1.8rem, 4vw, 2.5rem);
  margin-bottom: 1rem;
}

.home-alt__ending {
  text-align: center;
  max-width: 900px;
  margin: 0 auto;
  padding: 0 1rem 1rem;
  display: flex;
  flex-direction: column;
  gap: 4rem;
}

.home-alt__ending h2 {
  font-family: var(--alt-script-font);
  font-size: clamp(2.4rem, 7vw, 4.8rem);
  line-height: 0.95;
}

.home-alt__ending-cake {
  width: min(220px, 52vw);
  height: auto;
  margin: 0.8rem auto 0;
  transform-origin: 50% 100%;
  transition: transform 220ms cubic-bezier(0.18, 0.9, 0.32, 1.2);
  will-change: transform;
}

.home-alt__ending-cake:hover {
  transform: scaleX(1.07) scaleY(0.93);
}

.home-alt__ending-cake:active {
  transform: scaleX(1.05) scaleY(0.95);
}

.home-alt__timeline-step h3 {
  margin-top: 0.55rem;
  font-size: clamp(1.6rem, 3.2vw, 2.2rem);
}

.home-alt__timeline-step p {
  margin-top: 0.15rem;
  color: #842523;
  font-weight: 700;
}

@media (max-width: 768px) {
  .home-alt {
    padding-top: 1rem;
  }

  .home-alt__names {
    gap: 0.45rem;
  }

  .home-alt__schedule-grid {
    grid-template-columns: 1fr;
    gap: 2.5rem;
  }

  .home-alt__schedule-grape {
    right: 1.6rem;
    top: 1rem;
    width: 36px;
  }

  .home-alt__schedule-lamps {
    left: 1.2rem;
    bottom: 0.8rem;
    width: 32px;
  }

  .home-alt__timeline-row {
    margin-top: 1.5rem;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    row-gap: 1.4rem;
  }

  .home-alt__timeline-row::before {
    display: none;
  }

  .home-alt__countdown-banner {
    background-attachment: scroll;
  }

  .home-alt__split {
    grid-template-columns: 1fr 1fr;
    gap: 2rem;
  }

  .home-alt__split--reverse .home-alt__split-text {
    order: 1;
  }

  .home-alt__split--reverse .home-alt__split-image {
    order: 2;
  }
}
</style>
