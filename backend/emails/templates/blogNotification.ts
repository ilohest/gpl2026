// backend/emails/templates/blogNotification.ts
import weddingConfig from "../../../shared/weddingConfig.js";
import { escapeHtml } from "../../utils/escapeHtml.js";

function safeUrl(u: unknown, fallback = ""): string {
  const s = String(u || "").trim();
  if (!s) return fallback;
  try {
    const x = new URL(s);
    if (x.protocol !== "http:" && x.protocol !== "https:") return fallback;
    return x.toString();
  } catch {
    return fallback;
  }
}

export function buildBlogNotificationEmail({
  guestName,
  blogUrl,
  siteUrl,
  passwordHint,
  preferredLang,
}: {
  guestName?: string;
  blogUrl?: string;
  siteUrl?: string;
  passwordHint?: string;
  preferredLang?: string;
}): { subject: string; innerHtml: string } {
  const lang = String(preferredLang || "")
    .trim()
    .toLowerCase();
  const isEn = lang === "en";

  const { brideFirstName, groomFirstName, initials } = weddingConfig.couple;

  const name = escapeHtml(guestName || (isEn ? "Guest" : "Invitado"));
  const safeBlogUrl = escapeHtml(safeUrl(blogUrl));
  const validSiteUrl = safeUrl(siteUrl);
  const imgSrc = validSiteUrl
    ? escapeHtml(
        `${validSiteUrl.replace(/\/+$/, "")}/assets/images/img2-1.png`,
      )
    : "";
  const safePwd = escapeHtml(passwordHint || "");

  const subject = isEn
    ? `🗞️ New blog update`
    : `🗞️ Nueva publicación en el blog`;

  const cta = isEn ? "Visit the blog" : "Accede al blog";
  const intro = isEn
    ? `We’ve got a <strong>new update on the blog</strong>!`
    : `¡Tenemos una <strong>nueva actualización en el blog</strong>!`;
  const greet = isEn ? `Hello ${name}` : `Hola ${name}`;
  const signedBy = `${escapeHtml(brideFirstName)} &amp; ${escapeHtml(
    groomFirstName,
  )}`;

  const innerHtml = `
<p>🌸 ${greet},</p>
<p>${intro}</p>

<p style="text-align:center;margin:16px 0 22px 0;">
  <a href="${safeBlogUrl}" target="_blank" rel="noopener noreferrer"
     style="display:inline-block;padding:12px 18px;background:#daa5a5;color:#fff!important;text-decoration:none;border-radius:12px;font-weight:bold;">
    ${cta}
  </a><br/><br/>
  🔐 ${safePwd}
</p>

<p>💌 ${signedBy}</p>

${
  imgSrc
    ? `<p style="text-align:center;margin:24px 0 0 0;">
  <img src="${imgSrc}"
       alt="${escapeHtml(initials)}"
       style="width:40%;max-width:530px;min-width:280px;border:none;" />
</p>`
    : ""
}
`;

  return { subject, innerHtml };
}
