<!-- src/pages/HomePage.vue -->
<template>
  <main class="gpl-home">
    <section class="gpl-invite" aria-labelledby="home-title">
      <p class="gpl-invite__intro" id="home-title">
        {{ t("home_invite.intro_line_1") }}<br />
        {{ t("home_invite.intro_line_2") }}
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
        <p>
          {{ t("home_invite.participation_line_1") }}<br />
          {{ t("home_invite.participation_line_2") }}
          <br class="gpl-desktop-break" />
          {{ t("home_invite.participation_line_3") }}
          <br class="gpl-desktop-break" />
          {{ t("home_invite.participation_line_4") }}
        </p>
      </section>

      <section class="gpl-invite__small-block gpl-invite__rsvp-block">
        <h2>{{ t("home_invite.confirmation_title") }}</h2>
        <p>
          {{ t("home_invite.confirmation_line") }}<br />
          {{ t("homepagersvp.deadline") }}
        </p>
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
        {{ t("home_invite.closing_line_1") }}<br />
        {{ t("home_invite.closing_line_2") }}
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
    </section>
  </main>
</template>

<script setup>
import { onMounted, onUnmounted, ref, watch } from "vue";
import { useLang } from "@/composables/useLang";
import SafeRichText from "@/components/utils/SafeRichText.vue";
import weddingConfig from "../../shared/weddingConfig.ts";

const { t, lang, loadLanguage } = useLang();

const countdownText = ref("");
const foodRef = ref(null);

const targetDate = new Date(weddingConfig.countdown.targetDateTimeUtc);
let countdownTimer;
let foodTimer;

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
  countdownTimer = setInterval(renderCountdown, 1000);
  foodTimer = setInterval(hideRandomFood, 2000);
});

onUnmounted(() => {
  clearInterval(countdownTimer);
  clearInterval(foodTimer);
});
</script>
