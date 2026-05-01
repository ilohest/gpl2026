// backend/emails/templates/inviteEmail.ts
function escapeHtml(s: unknown): string {
  return String(s ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatExpiresAt(
  expiresAt: { toDate?: () => Date } | Date | null | undefined,
): string {
  if (!expiresAt) return "";
  const d = (() => {
    if (expiresAt instanceof Date) return expiresAt;
    if (
      typeof expiresAt === "object" &&
      "toDate" in expiresAt &&
      typeof expiresAt.toDate === "function"
    ) {
      return expiresAt.toDate();
    }
    return null;
  })();

  if (!d || Number.isNaN(d.getTime())) return "";

  // format lisible (tu peux changer la locale)
  return new Intl.DateTimeFormat("en-GB", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

export function renderInviteEmail({
  toEmail,
  inviterEmail,
  link,
  permissions: _permissions,
  expiresAt, // ✅ new
}: {
  toEmail: string;
  inviterEmail?: string;
  link: string;
  permissions?: string[];
  expiresAt?: { toDate?: () => Date } | Date | null;
}): { subject: string; innerHtml: string } {
  const safeTo = escapeHtml(toEmail);
  const safeInviter = escapeHtml(inviterEmail || "");
  const safeLink = escapeHtml(link);

  const expiresLabel = formatExpiresAt(expiresAt);

  const subject = "Invitation access link";

  const innerHtml = `
    <div style="font-size:16px; font-weight:700; margin-bottom:8px;">
      You have been invited
    </div>

    <div style="margin-bottom:14px;">
      This invitation is for: <strong>${safeTo}</strong>
      ${safeInviter ? `<br/>Invited by: <strong>${safeInviter}</strong>` : ""}
      ${
        expiresLabel
          ? `<br/>Valid until: <strong>${escapeHtml(expiresLabel)}</strong>`
          : ""
      }
    </div>

    <div style="margin:14px 0;">
      <a href="${safeLink}" target="_blank" rel="noopener noreferrer">
        Open invitation link
      </a>
    </div>

    <hr style="border:none; border-top:1px solid #333; margin:18px 0;" />

    <div style="font-size:12px; opacity:.75;">
      If you didn’t request this, you can ignore this email.
    </div>
  `;

  return { subject, innerHtml };
}
