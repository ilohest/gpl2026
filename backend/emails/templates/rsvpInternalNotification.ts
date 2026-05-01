// backend/emails/templates/rsvpInternalNotification.ts

import { escapeHtml } from "../../utils/escapeHtml.js";

function safeSubjectPart(s: unknown, fallback = "-"): string {
  const v = String(s ?? "")
    .replace(/[\r\n]+/g, " ")
    .trim();
  return v || fallback;
}

export function buildRsvpInternalNotificationEmail({
  rsvpId,
  firstName,
  lastName,
  email,
  guestsCount,
  attendingSummary,
  transportSummary,
  dietSummary,
  songs,
  comments,
}: {
  rsvpId?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  guestsCount?: number;
  attendingSummary?: string;
  transportSummary?: string;
  dietSummary?: string;
  songs?: string;
  comments?: string;
}): { subject: string; innerHtml: string } {
  const subject = `📋 Nueva confirmación RSVP – ${safeSubjectPart(
    firstName
  )} ${safeSubjectPart(lastName)} (${safeSubjectPart(rsvpId)})`;

  const innerHtml = `
    <h3>📋 Nueva confirmación RSVP</h3>

    <ul>
      <li><b>Asistencia (detalle):</b> ${escapeHtml(
        attendingSummary || "-"
      )}</li>
      <li><b>Nombre:</b> ${escapeHtml(firstName) || "-"}</li>
      <li><b>Apellidos:</b> ${escapeHtml(lastName) || "-"}</li>
      <li><b>Correo:</b> ${escapeHtml(email) || "-"}</li>
      <li><b>Invitados:</b> ${escapeHtml(String(guestsCount ?? 0))}</li>
      <li><b>Transporte:</b> ${escapeHtml(transportSummary || "-")}</li>
      <li><b>Restricciones:</b> ${escapeHtml(dietSummary || "-")}</li>
      <li><b>Canciones:</b> ${escapeHtml(songs || "-")}</li>
      <li><b>Comentarios:</b> ${escapeHtml(comments || "-")}</li>
      <li><b>RSVP ID:</b> ${escapeHtml(rsvpId) || "-"}</li>
    </ul>
  `;

  return { subject, innerHtml };
}
