<!-- src/pages/HomePage.vue -->
<template>
  <section ref="pageRef" class="home-2026 flex flex-col gap-8">
    <div class="flower-container">
      <img src="/assets/images/img1.png" alt="" class="img1 pulse" />
    </div>

    <h1>{{ t("intro.welcome") }}</h1>

    <div class="home-date" aria-label="27 septembre 2026">
      <h1 class="color">27</h1>
      <h1 aria-hidden="true">⸱</h1>
      <h1 class="color">09</h1>
      <h1 aria-hidden="true">⸱</h1>
      <h1 class="color">2026</h1>
    </div>

    <div class="lovers-container" ref="loversRef">
      <img
        src="/assets/images/img2.png"
        alt="Gran PL"
        class="img2 hover-image"
      />
    </div>

    <SafeRichText
      tag="p"
      :text="
        t('invitation.intro', {
          invitationDateTime: eventLocale.invitationDateTime,
          ceremonyVenue: weddingConfig.ceremony.venueName,
        })
      "
    />

    <a
      :href="weddingConfig.celebration.mapUrl"
      target="_blank"
      rel="noopener noreferrer"
      class="link"
    >
      <p>{{ t("invitation.location") }}</p>
    </a>

    <p>{{ t("invitation.activities") }}</p>
    <p class="color font-semibold">{{ t("intro.excitement") }}</p>

    <div id="countdown" class="text-xl" v-html="countdownText"></div>

    <div class="inline-elements desktop">
      <h2 class="lined-heading">{{ t("homepagersvp.title") }}</h2>
    </div>
    <div class="inline-elements mobile">
      <h2 class="lined-heading" v-html="t('homepagersvp.title-mobile')"></h2>
    </div>

    <RouterLink to="/rsvp" class="inline-block">
      <div class="envelope-container">
        <img
          src="/assets/images/img4-1.png"
          alt=""
          class="img4-1 spin"
        />
        <img
          src="/assets/images/img4-2.png"
          alt=""
          class="img4-2"
        />
        <img
          src="/assets/images/img4-3.png"
          alt=""
          class="img4-3 hover-effect1"
        />
      </div>
    </RouterLink>

    <SafeRichText tag="p" :text="t('homepagersvp.instructions')" />
    <p class="font-semibold">{{ rsvpLocale.deadline }}.</p>

    <RouterLink to="/rsvp" class="btn btn-primary">
      {{ t("homepagersvp.button") }}
    </RouterLink>

    <div class="w-full flex justify-center">
      <div class="food-container" ref="foodRef">
        <img
          src="/assets/images/img5-5.png"
          alt=""
          class="img5-5 bounce-animation1"
        />
        <img
          src="/assets/images/img5-4.png"
          alt=""
          class="img5-4 bounce-animation"
        />
        <img src="/assets/images/img5-1.png" alt="" class="img5-1" />
        <img src="/assets/images/img5-2.png" alt="" class="img5-2" />
        <img src="/assets/images/img5-3.png" alt="" class="img5-3" />
        <img src="/assets/images/img5-6.png" alt="" class="img5-6" />
        <img src="/assets/images/img5-9.png" alt="" class="img5-9" />
      </div>
    </div>

    <div class="wave-fullbleed scrolling-wave desktop">
      <svg
        width="100%"
        height="150"
        viewBox="0 0 2000 100"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          id="wave-path"
          d="M0 50 Q 375 -60, 750 50 T 1500 50 T 2250 50 T 3000 50"
          fill="transparent"
          stroke="transparent"
        />
        <text>
          <textPath id="animated-text" href="#wave-path" startOffset="0%">
            {{ waveTextDesktop }}
          </textPath>
        </text>
      </svg>
    </div>

    <div class="wave-fullbleed scrolling-wave mobile">
      <svg
        width="100%"
        height="150"
        viewBox="0 0 2000 100"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          id="wave-path-m"
          d="M0 50 Q 250 -80, 500 50 T 750 50 T 1000 50 T 1250 50 T 1500 50"
          fill="transparent"
          stroke="transparent"
        />
        <text transform="scale(2)">
          <textPath id="animated-text-mobile" href="#wave-path-m" startOffset="0%">
            {{ waveTextMobile }}
          </textPath>
        </text>
      </svg>
    </div>

    <div class="scroll-image-container">
      <img
        src="/assets/images/img3.png"
        alt="GPL 2026"
        class="img3 scroll-image"
      />
    </div>

    <div class="inline-elements">
      <h2 class="lined-heading">{{ t("schedule.title") }}</h2>
    </div>

    <div class="practical-info">
      <div class="inline-elements">
        <strong>
          <p>⸱</p>
          <p>{{ t("schedule.when.title") }}</p>
          <p>⸱</p>
        </strong>
      </div>
      <p class="maj">{{ eventLocale.scheduleDay }}</p>
      <p class="maj">{{ eventLocale.ceremonyTime }}</p>
    </div>

    <div class="practical-info">
      <div class="inline-elements">
        <strong>
          <p>⸱</p>
          <p>{{ t("schedule.where.title") }}</p>
          <p>⸱</p>
        </strong>
      </div>
      <p>{{ weddingConfig.celebration.venueName }}</p>
      <a
        :href="weddingConfig.celebration.mapUrl"
        target="_blank"
        rel="noopener noreferrer"
        class="link"
      >
        <SafeRichText
          tag="p"
          :text="weddingConfig.celebration.addressHtml"
        />
      </a>
    </div>

    <div class="practical-info">
      <div class="inline-elements">
        <strong>
          <p>⸱</p>
          <p>{{ t("schedule.participation.title") }}</p>
          <p>⸱</p>
        </strong>
      </div>
      <p>{{ t("schedule.participation.price") }}</p>
      <SafeRichText tag="p" :text="t('schedule.participation.info')" />
    </div>

    <SafeRichText tag="p" :text="t('schedule.other')" />

    <img
      src="/assets/images/img7.png"
      alt="GPL 2026"
      class="img7 delayed-image mx-auto"
    />

    <div class="margin">
      <SafeRichText
        tag="p"
        class="color"
        :text="t('end.excitement')"
      />
      <RouterLink to="/rsvp" class="btn btn-primary">
        {{ t("end.button") }}
      </RouterLink>
    </div>

    <div class="margin">
      <img
        src="/assets/images/img9.png"
        alt="Corazon"
        class="img9 pulse mx-auto"
      />
    </div>
  </section>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from "vue";
import { useLang } from "@/composables/useLang";
import { useRevealOnScroll } from "@/composables/useRevealOnScroll";
import SafeRichText from "@/components/utils/SafeRichText.vue";
import weddingConfig from "../../shared/weddingConfig.ts";

const { t, lang, loadLanguage } = useLang();

const pageRef = ref(null);
const loversRef = ref(null);
const foodRef = ref(null);
const countdownText = ref("");
const { refreshReveal } = useRevealOnScroll({
  root: pageRef,
  selector: ":scope > div, :scope > img, :scope > p",
});

const currentLocale = computed(() => (lang.value === "en" ? "en" : "es"));
const eventLocale = computed(
  () => weddingConfig.event.perLocale[currentLocale.value],
);
const rsvpLocale = computed(
  () => weddingConfig.rsvp.perLocale[currentLocale.value],
);
const waveBaseText = computed(() => `${t("waves.text")}  ·  `);
const waveTextDesktop = computed(() => waveBaseText.value.repeat(2));
const waveTextMobile = computed(() => waveBaseText.value.repeat(3));

const targetDate = new Date(weddingConfig.countdown.targetDateTimeUtc);
let countdownTimer;

function renderCountdown() {
  const now = new Date();
  const diff = +targetDate - +now;

  if (diff <= 0) {
    countdownText.value = t("countdown.event_day");
    clearInterval(countdownTimer);
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

watch(lang, () => renderCountdown());

function createHeart(e) {
  const box = loversRef.value?.getBoundingClientRect();
  if (!box || Math.random() > 0.1) return;

  const heart = document.createElement("img");
  heart.src = "/assets/images/img14.png";
  heart.className = "heart";

  const x = e.clientX - box.left;
  const y = e.clientY - box.top;
  const dx = (Math.random() - 0.5) * 50;
  const dy = (Math.random() - 0.5) * 50;

  heart.style.left = `${x + dx}px`;
  heart.style.top = `${y + dy}px`;
  heart.style.width = `${Math.random() * 20 + 30}px`;
  heart.style.opacity = (Math.random() * 0.5 + 0.5).toString();

  loversRef.value.appendChild(heart);
  setTimeout(() => heart.remove(), 2000);
}

let foodTimer;
function hideRandomFood() {
  const host = foodRef.value;
  if (!host) return;

  const items = Array.from(host.querySelectorAll("img"));
  if (!items.length) return;

  const random = items[Math.floor(Math.random() * items.length)];
  if (random.classList.contains("fade-out")) return;

  random.classList.add("fade-out");
  setTimeout(() => random.classList.remove("fade-out"), 4000);
}

let raf1;
let raf2;
function animateWaveText(id, speed = 0.08, wrapAt = -50) {
  const node = document.getElementById(id);
  if (!node) return;

  let offset = 0;
  const step = () => {
    offset -= speed;
    if (offset < wrapAt) offset = 0;
    node.setAttribute("startOffset", `${offset}%`);
    const frame = requestAnimationFrame(step);
    if (id === "animated-text") raf1 = frame;
    if (id === "animated-text-mobile") raf2 = frame;
  };
  step();
}

let io1;
let io2;
function setupIntersections() {
  io1 = new IntersectionObserver(
    (entries, obs) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("visible");
          obs.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.05 },
  );

  document
    .querySelectorAll(".delayed-image")
    .forEach((img) => io1.observe(img));

  io2 = new IntersectionObserver((entries, obs) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        const img = entry.target.querySelector(".scroll-image");
        if (img) img.classList.add("visible");
        obs.unobserve(entry.target);
      }
    });
  });

  const scrollContainer = document.querySelector(".scroll-image-container");
  if (scrollContainer) io2.observe(scrollContainer);
}

onMounted(() => {
  loadLanguage(lang.value);
  loversRef.value?.addEventListener("mousemove", createHeart);
  renderCountdown();
  countdownTimer = setInterval(renderCountdown, 1000);
  foodTimer = setInterval(hideRandomFood, 2000);
  animateWaveText("animated-text");
  animateWaveText("animated-text-mobile");
  setupIntersections();
  refreshReveal();
});

onUnmounted(() => {
  loversRef.value?.removeEventListener("mousemove", createHeart);
  clearInterval(countdownTimer);
  clearInterval(foodTimer);
  cancelAnimationFrame(raf1);
  cancelAnimationFrame(raf2);
  io1?.disconnect();
  io2?.disconnect();
});
</script>
