<!-- src/pages/HomePage.vue -->
<template>
  <main class="gpl-home">
    <section class="gpl-invite" aria-labelledby="home-title">
      <p class="gpl-invite__intro" id="home-title">
        {{ t("home_invite.intro_line_1") }}
      </p>

      <div class="gpl-invite__date" :aria-label="t('home_invite.date_label')">
        <p class="gpl-script gpl-script--day">
          {{ t("home_invite.date_day") }}
        </p>
        <p class="gpl-script gpl-script--month">
          {{ t("home_invite.date_month") }}
        </p>
        <p class="gpl-script gpl-script--year">
          {{ t("home_invite.date_year") }}
        </p>
      </div>

      <div class="gpl-invite__place">
        <p>{{ t("home_invite.time") }}</p>
        <a
          :href="weddingConfig.celebration.mapUrl"
          target="_blank"
          rel="noopener noreferrer"
        >
          {{ t("home_invite.restaurant") }}
        </a>
      </div>

      <img src="/assets/images/img9.png" alt="" class="gpl-invite__sun" />

      <section class="gpl-invite__small-block" aria-labelledby="address-title">
        <h2 id="address-title">{{ t("home_invite.address_title") }}</h2>
        <a
          :href="weddingConfig.celebration.mapUrl"
          target="_blank"
          rel="noopener noreferrer"
        >
          Carretera Badalona a Mollet B-500, Km 4,<br />
          08391 Tiana, Barcelona
        </a>
      </section>

      <section class="gpl-invite__small-block gpl-invite__small-block--wide">
        <h2>{{ t("home_invite.participation_title") }}</h2>
        <p>31€</p>
        <p aria-hidden="true">·</p>
        <p>{{ t("home_invite.participation_line_1") }}</p>
      </section>

      <section class="gpl-invite__small-block gpl-invite__rsvp-block">
        <h2>{{ t("home_invite.confirmation_title") }}</h2>
        <p>{{ t("home_invite.confirmation_line") }} {{ t("homepagersvp.deadline") }}</p>
      </section>

      <RouterLink to="/rsvp" class="gpl-button gpl-button--solid">
        {{ t("homepagersvp.button") }}
      </RouterLink>

      <SafeRichText
        tag="div"
        class="gpl-countdown"
        :text="countdownText"
      />

      <p class="gpl-script gpl-script--closing">
        {{ t("home_invite.closing_line") }}
      </p>

      <div class="gpl-final-food" aria-hidden="true">
        <div class="food-container" ref="foodRef">
          <div class="food-container__inner">
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
      </div>

      <section class="gpl-spiral" aria-label="Pensament de cloenda">
        <canvas
          ref="spiralCanvasRef"
          class="gpl-spiral__canvas"
          aria-hidden="true"
        ></canvas>
      </section>
    </section>
  </main>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from "vue";
import { useLang } from "@/composables/useLang";
import SafeRichText from "@/components/utils/SafeRichText.vue";
import weddingConfig from "../../shared/weddingConfig.ts";

const { t, lang, loadLanguage } = useLang();

const countdownText = ref("");
const foodRef = ref(null);
const spiralCanvasRef = ref(null);

const targetDate = new Date(weddingConfig.countdown.targetDateTimeUtc);
let countdownTimer;
let foodTimer;

const spiralText = computed(() => {
  return t("home_invite.spiral_text").toLocaleUpperCase(lang.value);
});

function drawSpiral() {
  const canvas = spiralCanvasRef.value;
  if (!canvas) return;

  const rect = canvas.getBoundingClientRect();
  const size = Math.max(240, Math.round(rect.width));
  const isMobile = size < 360;
  const ratio = window.devicePixelRatio || 1;
  canvas.width = Math.round(size * ratio);
  canvas.height = Math.round(size * ratio);
  canvas.style.height = `${size}px`;

  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  ctx.clearRect(0, 0, size, size);
  ctx.fillStyle = "#111";
  ctx.textBaseline = "middle";
  ctx.textAlign = "center";
  const fontSize = isMobile
    ? Math.max(10.5, Math.min(12.5, size * 0.039))
    : Math.max(18, Math.min(23, size * 0.041));
  ctx.font = `${fontSize}px PPPangaia, Antic Didone, serif`;

  const center = size / 2;
  const points = [];
  const turns = isMobile ? 3.55 : 5.15;
  const steps = 1500;

  for (let i = 0; i <= steps; i += 1) {
    const progress = i / steps;
    const angle = progress * turns * Math.PI * 2;
    const radius = isMobile
      ? size * 0.36 - progress * size * 0.26
      : size * 0.42 - progress * size * 0.35;
    points.push({
      x: center + Math.cos(angle) * radius,
      y: center + Math.sin(angle) * radius,
    });
  }

  const segments = [];
  let totalLength = 0;
  for (let i = 1; i < points.length; i += 1) {
    const prev = points[i - 1];
    const next = points[i];
    const length = Math.hypot(next.x - prev.x, next.y - prev.y);
    totalLength += length;
    segments.push({ ...next, length, totalLength });
  }

  const text = spiralText.value;
  const textWidth = ctx.measureText(text).width;
  const spacingRatio = Math.min(1, (totalLength * 0.9) / Math.max(textWidth, 1));
  let cursor = 0;

  for (const char of text) {
    const charWidth = Math.max(ctx.measureText(char).width * spacingRatio, 2.4);
    cursor += charWidth / 2;
    const segment = segments.find((item) => item.totalLength >= cursor);
    if (!segment) break;

    const index = segments.indexOf(segment);
    const previous = index > 0 ? segments[index - 1] : points[0];
    const angle = Math.atan2(segment.y - previous.y, segment.x - previous.x);

    ctx.save();
    ctx.translate(segment.x, segment.y);
    ctx.rotate(angle);
    ctx.fillText(char, 0, 0);
    ctx.restore();

    cursor += charWidth / 2;
  }
}

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

watch(lang, () => {
  renderCountdown();
  requestAnimationFrame(drawSpiral);
});

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

onMounted(() => {
  loadLanguage(lang.value);
  renderCountdown();
  requestAnimationFrame(drawSpiral);
  document.fonts?.ready.then(drawSpiral);
  window.addEventListener("resize", drawSpiral);
  countdownTimer = setInterval(renderCountdown, 1000);
  foodTimer = setInterval(hideRandomFood, 2000);
});

onUnmounted(() => {
  clearInterval(countdownTimer);
  clearInterval(foodTimer);
  window.removeEventListener("resize", drawSpiral);
});
</script>
