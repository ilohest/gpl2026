// src/utils/primevueLocale.ts
import type { PrimeVueLocaleOptions } from "@primevue/core/config";

const FILE_SIZE_TYPES = ["B", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"];

function baseLocale(): PrimeVueLocaleOptions {
  return {
    fileSizeTypes: FILE_SIZE_TYPES,
    dayNames: [],
    dayNamesShort: [],
    dayNamesMin: [],
    monthNames: [],
    monthNamesShort: [],
    firstDayOfWeek: 1,
    showMonthAfterYear: false,
    dateFormat: "dd/mm/yy",
  };
}

const LOCALES: Record<string, PrimeVueLocaleOptions> = {
  es: {
    ...baseLocale(),
    clear: "Borrar",
    today: "Hoy",
    weekHeader: "Sm",
    dayNames: [
      "domingo",
      "lunes",
      "martes",
      "miércoles",
      "jueves",
      "viernes",
      "sábado",
    ],
    dayNamesShort: ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"],
    dayNamesMin: ["D", "L", "M", "X", "J", "V", "S"],
    monthNames: [
      "enero",
      "febrero",
      "marzo",
      "abril",
      "mayo",
      "junio",
      "julio",
      "agosto",
      "septiembre",
      "octubre",
      "noviembre",
      "diciembre",
    ],
    monthNamesShort: [
      "ene",
      "feb",
      "mar",
      "abr",
      "may",
      "jun",
      "jul",
      "ago",
      "sep",
      "oct",
      "nov",
      "dic",
    ],
    firstDayOfWeek: 1,
  },

  en: {
    ...baseLocale(),
    clear: "Clear",
    today: "Today",
    weekHeader: "Wk",
    dayNames: [
      "Sunday",
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
    ],
    dayNamesShort: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
    dayNamesMin: ["S", "M", "T", "W", "T", "F", "S"],
    monthNames: [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December",
    ],
    monthNamesShort: [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ],
    firstDayOfWeek: 0,
    dateFormat: "mm/dd/yy",
  },

  fr: {
    ...baseLocale(),
    clear: "Effacer",
    today: "Aujourd'hui",
    weekHeader: "Sem.",
    dayNames: [
      "dimanche",
      "lundi",
      "mardi",
      "mercredi",
      "jeudi",
      "vendredi",
      "samedi",
    ],
    dayNamesShort: ["dim", "lun", "mar", "mer", "jeu", "ven", "sam"],
    dayNamesMin: ["D", "L", "M", "M", "J", "V", "S"],
    monthNames: [
      "janvier",
      "février",
      "mars",
      "avril",
      "mai",
      "juin",
      "juillet",
      "août",
      "septembre",
      "octobre",
      "novembre",
      "décembre",
    ],
    monthNamesShort: [
      "janv",
      "févr",
      "mars",
      "avr",
      "mai",
      "juin",
      "juil",
      "août",
      "sept",
      "oct",
      "nov",
      "déc",
    ],
    firstDayOfWeek: 1,
  },
};

const FALLBACK_LOCALE: PrimeVueLocaleOptions = LOCALES.es!;

export function getPrimeVueLocale(lang: string): PrimeVueLocaleOptions {
  const key = String(lang || "").trim().toLowerCase();
  return LOCALES[key] ?? FALLBACK_LOCALE;
}
