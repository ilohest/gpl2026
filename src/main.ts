// src/main.js
import { createApp } from "vue";
import { createPinia } from "pinia";
import App from "./App.vue";
import router from "./router";
import VueEasyLightbox from "vue-easy-lightbox";

import Can from "@/components/auth/Can.vue";

// PrimeVue
import PrimeVue from "primevue/config";
import Aura from "@primevue/themes/aura";
import "primeicons/primeicons.css";

// Composants PrimeVue
import Button from "primevue/button";
import Card from "primevue/card";
import InputText from "primevue/inputtext";
import Password from "primevue/password";
import Textarea from "primevue/textarea";
import Skeleton from "primevue/skeleton";
import ToastService from "primevue/toastservice";
import Toast from "primevue/toast";
import ConfirmationService from "primevue/confirmationservice";
import ConfirmDialog from "primevue/confirmdialog";
import Tooltip from "primevue/tooltip";
import "quill/dist/quill.snow.css";

import "@/assets/main.css";
import "quill/dist/quill.core.css";
import "quill/dist/quill.snow.css";

import { getPrimeVueLocale } from "@/utils/primevueLocale";

const app = createApp(App);
const pinia = createPinia();
app.use(router);
app.use(pinia);

const initialLang = (() => {
  try {
    const stored = String(localStorage.getItem("lang") || "").trim().toLowerCase();
    if (stored === "en" || stored === "cat") return "ca";
    return stored || "ca";
  } catch {
    return "ca";
  }
})();

app.use(PrimeVue, {
  theme: { preset: Aura, options: { darkModeSelector: ".dark" } },
  locale: getPrimeVueLocale(initialLang),
});
app.use(ToastService);
app.use(ConfirmationService);

app.directive("tooltip", Tooltip);
app.component("ConfirmDialog", ConfirmDialog);
app.component("VueEasyLightbox", VueEasyLightbox);
app.component("Button", Button);
app.component("Card", Card);
app.component("InputText", InputText);
app.component("Password", Password);
app.component("Textarea", Textarea);
app.component("Skeleton", Skeleton);
app.component("Toast", Toast);
app.component("Can", Can);
app.mount("#app");
