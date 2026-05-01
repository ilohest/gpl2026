<!-- src/pages/AccommodationPage.vue -->

<template>
  <main
    ref="pageRef"
    class="accommodations-page flex flex-col gap-8"
  >
    <!-- Titre + intro -->
    <div class="text-center flex flex-col gap-8">
      <h2 class="mb-3">{{ t("accommodations.title") }}</h2>
      <SafeRichText
        tag="p"
        :text="t('accommodations.description')"
      />
      <img
        src="/assets/images/img9.png"
        alt="Salud"
        class="img9-1 pulse mx-auto mb-6"
      />
    </div>

    <!-- Zone 1 -->
    <section class="flex flex-col gap-4">
      <div class="flex flex-col gap-4 text-center font-semibold">
        <p>⸱</p>
        <p class="uppercase">{{ t("accommodations.loc1") }}</p>
        <p>⸱</p>
      </div>

      <div class="flex flex-col gap-6">
        <div>
          <a
            href="https://www.hotelcastellemporda.com"
            target="_blank"
            class="underline decoration-1 font-semibold"
          >Hotel Castell de l'Empordà</a>
          <p>La Bisbal de l'Empordà</p>
        </div>

        <div>
          <a
            href="https://www.maspetit.com"
            target="_blank"
            class="underline decoration-1 font-semibold"
          >Mas Petit</a>
          <p>La Bisbal de l'Empordà</p>
        </div>

        <div>
          <a
            href="https://llimonasuites.com/"
            target="_blank"
            class="underline decoration-1 font-semibold"
          >Llimona Suites</a>
          <p>Corçà</p>
        </div>

        <div>
          <a
            href="https://www.masrabiol.com/ca"
            target="_blank"
            class="underline decoration-1 font-semibold"
          >Hotel Mas Rabiol</a>
          <p>Peratallada</p>
        </div>

        <div>
          <a
            href="https://hotelmardetasmania.es/"
            target="_blank"
            class="underline decoration-1 font-semibold"
          >Hotel Mar de Tasmania</a>
          <p>La Bisbal de l'Empordà</p>
        </div>

        <div>
          <a
            href="https://www.cannentia.com/ca/"
            target="_blank"
            class="underline decoration-1 font-semibold"
          >Can Nentia</a>
          <p>Fonteta</p>
        </div>

        <div class="mb-6">
          <a
            href="https://rentals.envilleapartments.com/es/alquiler/finca-fonteta-la-masia-158243.html"
            target="_blank"
            class="underline decoration-1 font-semibold"
          >En Ville - Masia</a>
          <p>Fonteta</p>
        </div>
      </div>
    </section>

    <!-- Zone 2 -->
    <section class="flex flex-col gap-4">
      <div class="flex flex-col gap-4 text-center font-semibold">
        <p>⸱</p>
        <p class="uppercase">{{ t("accommodations.loc2") }}</p>
        <p>⸱</p>
      </div>

      <div class="flex flex-col gap-6">
        <div>
          <a
            href="https://www.lamalcontentahotel.com/ca/"
            target="_blank"
            class="underline decoration-1 font-semibold"
          >La Malcontenta</a>
          <p>Palamós</p>
        </div>

        <div>
          <a
            href="https://www.empordagolf.com/public/hotel/habitaciones"
            target="_blank"
            class="underline decoration-1 font-semibold"
          >Empordà Golf</a>
          <p>Torroella de Montgrí</p>
        </div>
      </div>

      <div class="flex justify-center">
        <img
          src="/assets/images/img5-2.png"
          alt="Salud"
          class="img5-2-1"
        />
        <img
          src="/assets/images/img5-2.png"
          alt="Salud"
          class="img5-2-2"
        />
      </div>
    </section>
  </main>
</template>

<script setup>
import { useLang } from "@/composables/useLang";
import { ref } from "vue";
import { useRevealOnScroll } from "@/composables/useRevealOnScroll";
import SafeRichText from "@/components/utils/SafeRichText.vue";

const { t } = useLang();
const pageRef = ref(null);
useRevealOnScroll({
  root: pageRef,
  selector: ":scope > div, :scope > section",
});
</script>
