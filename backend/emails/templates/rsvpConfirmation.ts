// backend/emails/templates/rsvpConfirmation.ts
import { escapeHtml } from "../../utils/escapeHtml.js";

function escapeAttr(s: string): string {
  // suffisant si tu as déjà safeUrl() pour les href/src
  return escapeHtml(s);
}

function safeUrl(u: unknown): string {
  const s = String(u ?? "").trim();
  if (!s) return "";
  try {
    const url = new URL(s);
    if (url.protocol !== "http:" && url.protocol !== "https:") return "";
    return url.toString();
  } catch {
    return "";
  }
}

function safeSubjectPart(s: unknown, fallback = ""): string {
  // évite CR/LF (header injection) + trim
  const v = String(s ?? "")
    .replace(/[\r\n]+/g, " ")
    .trim();
  return v || fallback;
}

/**
 * Pure template: pas d'accès env/config ici.
 */
export function buildRsvpConfirmationEmail({
  attendingYes,
  guestFirstName,
  preferredLang,

  brideFirstName,
  groomFirstName,
  initials,

  dateDisplayShort,
  siteUrl,
  mapUrl,
  websitePasswordHint,
}: {
  attendingYes: boolean;
  guestFirstName?: string;
  preferredLang?: string;
  brideFirstName: string;
  groomFirstName: string;
  initials: string;
  dateDisplayShort: string;
  siteUrl?: string | undefined;
  mapUrl?: string | undefined;
  websitePasswordHint?: string | undefined;
}): { subject: string; innerHtml: string } {
  const lang = String(preferredLang || "")
    .trim()
    .toLowerCase();
  const isEn = lang === "en";
  const isCa = lang === "ca" || lang === "cat";

  const safeDate = escapeHtml(dateDisplayShort);
  const safeName = escapeHtml(guestFirstName || "");
  const safePwd = escapeHtml(websitePasswordHint || "");

  const safeSiteUrl = safeUrl(siteUrl);
  const safeMapUrl = safeUrl(mapUrl);

  const mapHref = safeMapUrl ? escapeAttr(safeMapUrl) : "";
  const siteHref = safeSiteUrl ? escapeAttr(safeSiteUrl) : "";
  const nameEs = safeName || "invitado/a";
  const nameCa = safeName || "convidat/da";
  const nameEn = safeName || "guest";
  const who = isEn ? nameEn : isCa ? nameCa : nameEs;

  const innerHtml = attendingYes
    ? isEn
      ? `
          <p>🌸 Hello ${who},</p>
          <p>Thank you for completing the form! We have successfully received your information.</p>
          <p>⛪️ We are thrilled to see you on <strong>${safeDate}</strong>.</p>
          ${
            mapHref
              ? `<p>📍 <a href="${mapHref}" target="_blank" rel="noopener noreferrer">Map</a></p>`
              : ""
          }
          <p>All information is available on 
            ${
              siteHref
                ? `<a href="${siteHref}" target="_blank" rel="noopener noreferrer">our website</a>`
                : "our website"
            } – 🔐 ${safePwd}.
          </p>
        `
      : isCa
        ? `
          <p>🌸 Hola ${who},</p>
          <p>Gràcies per completar el formulari! Hem rebut la vostra informació correctament.</p>
          <p>⛪️ Ens fa molta il.lusió veure-us el <strong>${safeDate}</strong>.</p>
          ${
            mapHref
              ? `<p>📍 <a href="${mapHref}" target="_blank" rel="noopener noreferrer">Mapa</a></p>`
              : ""
          }
          <p>Tota la informació està disponible a 
            ${
              siteHref
                ? `<a href="${siteHref}" target="_blank" rel="noopener noreferrer">la nostra web</a>`
                : "la nostra web"
            } – 🔐 ${safePwd}.
          </p>
        `
        : `
          <p>🌸 Hola ${who},</p>
          <p>¡Gracias por completar el formulario! Hemos recibido tu información correctamente.</p>
          <p>⛪️ Nos hace mucha ilusión verte el <strong>${safeDate}</strong>.</p>
          ${
            mapHref
              ? `<p>📍 <a href="${mapHref}" target="_blank" rel="noopener noreferrer">Mapa</a></p>`
              : ""
          }
          <p>Toda la información está disponible en 
            ${
              siteHref
                ? `<a href="${siteHref}" target="_blank" rel="noopener noreferrer">nuestra web</a>`
                : "nuestra web"
            } – 🔐 ${safePwd}.
          </p>
        `
    : isEn
      ? `
          <p>🌸 Hello ${who},</p>
          <p>Thank you for completing the form! We have successfully received your reply.</p>
          <p>We’re sorry you can’t make it on <strong>${safeDate}</strong>, but thanks for letting us know ❤️</p>
          <p>All information is available on 
            ${
              siteHref
                ? `<a href="${siteHref}" target="_blank" rel="noopener noreferrer">our website</a>`
                : "our website"
            } – 🔐 ${safePwd}.
          </p>
        `
      : isCa
        ? `
          <p>🌸 Hola ${who},</p>
          <p>Gràcies per completar el formulari! Hem rebut la vostra resposta correctament.</p>
          <p>Sentim molt que no pugueu acompanyar-nos el <strong>${safeDate}</strong>, però gràcies per avisar-nos ❤️</p>
          <p>Tota la informació està disponible a 
            ${
              siteHref
                ? `<a href="${siteHref}" target="_blank" rel="noopener noreferrer">la nostra web</a>`
                : "la nostra web"
            } – 🔐 ${safePwd}.
          </p>
        `
        : `
          <p>🌸 Hola ${who},</p>
          <p>¡Gracias por completar el formulario! Hemos recibido tu respuesta correctamente.</p>
          <p>Sentimos mucho que no puedas acompañarnos el <strong>${safeDate}</strong>, pero gracias por avisarnos ❤️</p>
          <p>Toda la información está disponible en 
            ${
              siteHref
                ? `<a href="${siteHref}" target="_blank" rel="noopener noreferrer">nuestra web</a>`
                : "nuestra web"
            } – 🔐 ${safePwd}.
          </p>
        `;

  const subjectName = safeSubjectPart(
    guestFirstName,
    isEn ? "guest" : isCa ? "convidat/da" : "invitado/a",
  );
  const subject = isEn
    ? `🎉 ${safeSubjectPart(initials, "GPL 2026")} – ${
        attendingYes ? "Thank you for confirming" : "Thank you for your reply"
      }, ${subjectName}`
    : isCa
      ? `🎉 ${safeSubjectPart(initials, "GPL 2026")} – ${
          attendingYes ? "Gràcies per confirmar" : "Gràcies per la vostra resposta"
        }, ${subjectName}`
    : `🎉 ${safeSubjectPart(initials, "GPL 2026")} – ${
        attendingYes ? "Gracias por confirmar" : "Gracias por tu respuesta"
      }, ${subjectName}`;

  return { subject, innerHtml };
}
