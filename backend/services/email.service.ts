// backend/services/email.service.ts
import { getTransporter } from "../lib/email.js";
import { wrapDefaultLayout } from "../emails/layouts/default.js";
// @ts-ignore ambient declaration loaded in backend/types/externals.d.ts
import { htmlToText } from "html-to-text";

interface SendEmailInput {
  to: string | string[];
  subject: string;
  html?: string | undefined;
  innerHtml?: string | undefined;
  text?: string | undefined;
  replyTo?: string | undefined;
  cc?: string | string[] | undefined;
  bcc?: string | string[] | undefined;
  headers?: Record<string, string> | undefined;
}

export async function sendEmail({
  to,
  subject,
  html,
  innerHtml,
  text,
  replyTo,
  cc,
  bcc,
  headers,
}: SendEmailInput): Promise<unknown> {
  const from = process.env.MAIL_FROM || process.env.SMTP_USER;
  if (!from) throw new Error("MAIL_FROM/SMTP_USER missing");
  if (!to || (Array.isArray(to) && !to.length)) throw new Error("Email 'to' missing");
  if (!subject) throw new Error("Email 'subject' missing");

  const inner = String(innerHtml ?? "");
  const finalHtml = typeof html === "string" ? html : wrapDefaultLayout(inner);

  const finalText =
    typeof text === "string"
      ? text
      : htmlToText(inner || finalHtml, {
          wordwrap: 120,
          selectors: [
            { selector: "a", options: { hideLinkHrefIfSameAsText: true } },
          ],
        });

  return getTransporter().sendMail({
    from,
    to,
    subject,
    html: finalHtml,
    text: finalText,
    replyTo,
    cc,
    bcc,
    headers: headers || {},
  });
}

export function getInternalEmailTo(): string | null {
  const v =
    process.env.MAIL_INTERNAL_TO ||
    process.env.MAIL_FROM ||
    process.env.SMTP_USER ||
    "";
  const out = String(v).trim();
  return out || null;
}
