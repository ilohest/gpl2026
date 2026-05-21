// shared/weddingConfig.js

// Détection d'environnement (Vite front ou Node back)
const runtimeEnv: Record<string, string | undefined> =
  (typeof import.meta !== "undefined" &&
    (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env) ||
  (typeof process !== "undefined" && process.env) ||
  {};

// Helpers (optionnel mais propre)
const envStr = (v: unknown, fallback = ""): string => {
  const s = String(v ?? "").trim();
  return s || fallback;
};

// Identité de l'événement
// depuis .env racine (quand consommé par le front), et backend/.env qund consommé par le backend
const brideFirstName = envStr(
  runtimeEnv.VITE_BRIDE_FIRST_NAME ?? runtimeEnv.BRIDE_FIRST_NAME,
  "GPL",
);
const brideLastName = envStr(
  runtimeEnv.VITE_BRIDE_LAST_NAME ?? runtimeEnv.BRIDE_LAST_NAME,
  "",
);
const groomFirstName = envStr(
  runtimeEnv.VITE_GROOM_FIRST_NAME ?? runtimeEnv.GROOM_FIRST_NAME,
  "2026",
);
const groomLastName = envStr(
  runtimeEnv.VITE_GROOM_LAST_NAME ?? runtimeEnv.GROOM_LAST_NAME,
  "",
);
const eventName = `${brideFirstName} ${groomFirstName}`.trim();

export const weddingConfig = {
  couple: {
    brideFirstName,
    brideLastName,
    groomFirstName,
    groomLastName,
    initials: eventName,
    fullBrideName: eventName,
    fullGroomName: eventName,
  },

  event: {
    date: "2026-08-29",
    dateDisplayShort: "29 ⸱ 08 ⸱ 2026",

    perLocale: {
      ca: {
        invitationDateTime: "dissabte 29 d'agost del 2026 a les 18.45h",
        scheduleDay: "Dissabte 29 d'agost",
        ceremonyTime: "18h45",
      },
      es: {
        invitationDateTime: "sábado 29 de agosto de 2026 a las 18:45",
        scheduleDay: "Sábado 29 de agosto",
        ceremonyTime: "18h45",
      },
    },
  },

  ceremony: {
    venueName: "Restaurant Les Terrasses de Sant Romà",
    addressHtml: "Carretera Badalona a Mollet B-500, Km 4,<br>08391 Tiana, Barcelona",
    mapUrl: "https://maps.app.goo.gl/zVSrzcybTVYJLX9R9",
  },

  celebration: {
    venueName: "Restaurant Les Terrasses de Sant Romà",
    addressHtml: "Carretera Badalona a Mollet B-500, Km 4,<br>08391 Tiana, Barcelona",
    mapUrl: "https://maps.app.goo.gl/zVSrzcybTVYJLX9R9",
  },

  rsvp: {
    deadlineDate: "2026-08-03",
    perLocale: {
      ca: { deadline: "3 d'agost del 2026" },
      es: { deadline: "3 de agosto de 2026" },
    },
  },

  transport: {
    busOriginName: "Residencia las Hermanitas",
    busToVenueName: "Casa Pilatos",
    perLocale: {
      ca: {
        busToCeremonyTime: "11:30 AM",
        busReturnTime: "2 AM",
      },
      es: {
        busToCeremonyTime: "11.30h",
        busReturnTime: "2h",
      },
    },
    taxiPhones: ["644 102 338", "622 481 998"],
  },

  gift: {
    iban: "ES34 0283 9199 0928 7672 0285",
  },

  countdown: {
    targetDateTimeUtc: "2026-08-29T16:45:00Z",
  },

  // utilisé uniquement pour la démo (page login préremplie)
  auth: {
    demoPassword: "",
  },

  i18n: {
    defaultLang: "ca",
    languages: {
      ca: {
        code: "ca",
        shortLabel: "CAT",
      },
      es: {
        code: "es",
        shortLabel: "ES",
      },
    },
  },
};

export default weddingConfig;
