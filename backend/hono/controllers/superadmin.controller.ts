// backend/hono/controllers/superadmin.controller.ts
import type { Context } from "hono";
import type {} from "../context.js";
import { admin, firestore } from "../../lib/firebase.js";
import { jsonHttpError } from "../httpErrors.js";
import { createInvite, findInviteByToken, listInvites, revokeInvite } from "../../services/invites.service.js";
import { writeAudit } from "../../services/audit.service.js";
import { setUserClaims } from "../../services/claims.service.js";
import { sendEmail } from "../../services/email.service.js";
import { renderInviteEmail } from "../../emails/templates/inviteEmail.js";
import { normalizeDisplayName, normalizeEmailLower, normalizePermissions } from "../../domain/normalizers.js";
import { filterAllowedPermissions } from "../../domain/permissions.js";
import { badRequest, conflict, forbidden, gone, notFound } from "../../utils/httpErrors.js";

function reqValid<T>(c: Context, target: "json" | "param" | "query"): T {
  return (c.req as { valid: (t: string) => T }).valid(target);
}

function normalizeInviteEmail(value: unknown): string {
  const s = String(value || "").trim();
  return s && s.includes("@") ? s : "";
}

function normalizeInviteLink(value: unknown): string {
  const s = String(value || "").trim();
  if (!s) return "";
  return /^https?:\/\//i.test(s) ? s : "";
}

function extractTokenFromInviteLink(link: string): string {
  try {
    const u = new URL(link);
    return String(u.searchParams.get("token") || "").trim();
  } catch {
    return "";
  }
}

export async function inviteStatusHandler(c: Context) {
  try {
    const { token } = reqValid<{ token: string }>(c, "query");
    const inviteHit = await findInviteByToken(token);
    if (!inviteHit) throw notFound("invalid_token");

    const invite = inviteHit.data;
    if (invite.revokedAt) throw gone("revoked");
    if (invite.acceptedAt) throw conflict("already_used");
    if (invite.expiresAt?.toDate && invite.expiresAt.toDate() < new Date()) {
      throw gone("expired");
    }

    return c.json({
      ok: true,
      status: "active",
      emailLower: invite.emailLower || null,
      expiresAt: invite.expiresAt || null,
      displayName: invite.displayName || null,
    });
  } catch (err) {
    return jsonHttpError(c, err, "invites.status");
  }
}

export async function listInvitesHandler(c: Context) {
  try {
    const items = await listInvites({ limit: 200 });
    return c.json({ items });
  } catch (err) {
    return jsonHttpError(c, err, "invites.list");
  }
}

export async function createInviteHandler(c: Context) {
  try {
    const payload = reqValid<Record<string, unknown>>(c, "json");
    const user = c.get("user");
    const emailLower = normalizeEmailLower(payload.email);
    const displayName = normalizeDisplayName(payload.displayName);
    const permissions = filterAllowedPermissions(normalizePermissions(payload.permissions));
    if (!emailLower) throw badRequest("missing_email");

    const out = await createInvite({
      emailLower,
      displayName: displayName || "",
      permissions,
      actorUid: user.uid,
      actorEmail: user.email,
    });

    await writeAudit({
      type: "invite.create",
      actorUid: user.uid,
      actorEmail: user.email || null,
      inviteId: out.invite.id,
      meta: {
        emailLower,
        displayName,
        permissions,
        tokenPrefix: out.invite.tokenPrefix,
      },
    });

    return c.json({ ok: true, invite: out.invite, token: out.token });
  } catch (err) {
    return jsonHttpError(c, err, "invites.create");
  }
}

export async function revokeInviteHandler(c: Context) {
  try {
    const { id: inviteId } = reqValid<{ id: string }>(c, "param");
    const user = c.get("user");
    const out = await revokeInvite({ inviteId, actorUid: user.uid });
    if (!out.ok && out.code === "not_found") throw notFound("not_found");

    await writeAudit({
      type: "invite.revoke",
      actorUid: user.uid,
      actorEmail: user.email || null,
      inviteId,
      meta: { tokenPrefix: out.tokenPrefix || null },
    });

    return c.json({ ok: true });
  } catch (err) {
    return jsonHttpError(c, err, "invites.revoke");
  }
}

export async function sendInviteEmailHandler(c: Context) {
  try {
    const user = c.get("user");
    if (!user?.uid) throw forbidden("unauthorized");
    const payload = reqValid<Record<string, unknown>>(c, "json");
    const toEmail = normalizeInviteEmail(payload.toEmail);
    const link = normalizeInviteLink(payload.link);
    const permissions = Array.isArray(payload.permissions)
      ? payload.permissions.map((p) => String(p || "").trim()).filter(Boolean)
      : [];

    if (!toEmail) throw badRequest("missing_toEmail");
    if (!link) throw badRequest("missing_link");

    const token = extractTokenFromInviteLink(link);
    if (!token) throw badRequest("missing_token_in_link");

    const inviteHit = await findInviteByToken(token);
    if (!inviteHit) throw notFound("invalid_token");
    const invite = inviteHit.data;

    if (invite.revokedAt) throw gone("revoked");
    if (invite.acceptedAt) throw gone("already_used");
    if (invite.expiresAt?.toDate && invite.expiresAt.toDate() < new Date()) {
      throw gone("expired");
    }

    const emailLower = toEmail.toLowerCase();
    if (String(invite.emailLower || "").toLowerCase() !== emailLower) {
      throw badRequest("toEmail_mismatch");
    }

    const { subject, innerHtml } = renderInviteEmail({
      toEmail,
      inviterEmail: user.email || "",
      link,
      permissions,
      expiresAt: invite.expiresAt || null,
    });

    const emailInput: {
      to: string;
      subject: string;
      innerHtml: string;
      headers: Record<string, string>;
      replyTo?: string;
    } = {
      to: toEmail,
      subject,
      innerHtml,
      headers: {
        "X-App": "LIANA",
        "X-Email-Type": "invite",
        "X-Invite-Id": inviteHit.id,
        "X-Invite-TokenPrefix": invite.tokenPrefix || "",
      },
    };
    if (user.email) emailInput.replyTo = user.email;
    await sendEmail(emailInput);

    await writeAudit({
      type: "invite.send_email",
      actorUid: user.uid,
      actorEmail: user.email || null,
      inviteId: inviteHit.id,
      meta: {
        toEmailLower: emailLower,
        permissions,
        expiresAt: invite.expiresAt || null,
        tokenPrefix: invite.tokenPrefix || null,
      },
    });

    return c.json({ ok: true });
  } catch (err) {
    return jsonHttpError(c, err, "invites.send-email");
  }
}

export async function acceptInviteHandler(c: Context) {
  try {
    const payload = reqValid<Record<string, unknown>>(c, "json");
    const token = String(payload.token || "").trim();
    if (!token) throw badRequest("missing_token");
    const user = c.get("user");
    const inviteHit = await findInviteByToken(token);
    if (!inviteHit) throw notFound("invalid_token");

    const emailLower = (user.email || "").toLowerCase();
    const uid = user.uid;
    const userRef = firestore.collection("users").doc(uid);
    const emailRef = firestore.collection("userEmails").doc(emailLower);
    const now = admin.firestore.Timestamp.now();

    let permissions: string[] = [];
    let displayName: string | null = null;
    let inviterUid: string | null = null;
    let inviterEmail: string | null = null;

    await firestore.runTransaction(async (tx) => {
      const inviteSnap = await tx.get(inviteHit.ref);
      if (!inviteSnap.exists) throw notFound("invalid_token");

      const invite = inviteSnap.data() || {};
      if (invite.revokedAt) throw gone("revoked");
      if (invite.acceptedAt) throw conflict("already_used");
      if (invite.expiresAt?.toDate && invite.expiresAt.toDate() < new Date()) {
        throw gone("expired");
      }
      if (invite.emailLower !== emailLower) throw forbidden("wrong_email");

      permissions = filterAllowedPermissions(normalizePermissions(invite.permissions));
      displayName = normalizeDisplayName(invite.displayName);
      inviterUid = String(invite.createdByUid || "").trim() || null;
      inviterEmail = String(invite.createdByEmail || "").trim() || null;

      const [emailLockSnap, usersByEmailSnap] = await Promise.all([
        tx.get(emailRef),
        tx.get(firestore.collection("users").where("emailLower", "==", emailLower).limit(2)),
      ]);

      if (emailLockSnap.exists) {
        const ownerUid = String(emailLockSnap.data()?.uid || "").trim();
        if (ownerUid && ownerUid !== uid) throw conflict("email_already_registered");
      }

      for (const userDoc of usersByEmailSnap.docs) {
        if (userDoc.id !== uid) throw conflict("email_already_registered");
      }

      const claimedAt =
        emailLockSnap.exists && emailLockSnap.data()?.claimedAt
          ? emailLockSnap.data()?.claimedAt
          : now;

      tx.set(
        emailRef,
        {
          emailLower,
          uid,
          claimedAt,
          updatedAt: now,
        },
        { merge: true },
      );

      tx.update(inviteHit.ref, {
        acceptedAt: now,
        acceptedByUid: uid,
        acceptedByEmail: user.email || null,
      });

      tx.set(
        userRef,
        {
          uid,
          emailLower,
          email: user.email || null,
          displayName,
          permissions,
          invitedByUid: inviterUid,
          invitedByEmail: inviterEmail,
          inviteId: inviteHit.id,
          lastSeenAt: now,
          updatedAt: now,
          role: admin.firestore.FieldValue.delete(),
        },
        { merge: true },
      );
    });

    await setUserClaims(uid, permissions);

    await writeAudit({
      type: "invite.accept",
      actorUid: uid,
      actorEmail: user.email || null,
      inviteId: inviteHit.id,
      meta: { permissions },
    });

    return c.json({ ok: true, permissions, claimsUpdated: true });
  } catch (err) {
    return jsonHttpError(c, err, "invites.accept");
  }
}

export async function listUsersHandler(c: Context) {
  try {
    const snap = await firestore.collection("users").orderBy("lastSeenAt", "desc").limit(300).get();
    const items = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    return c.json({ items });
  } catch (err) {
    return jsonHttpError(c, err, "users.list");
  }
}

export async function patchUserPermissionsHandler(c: Context) {
  try {
    const { uid: targetUid } = reqValid<{ uid: string }>(c, "param");
    const payload = reqValid<Record<string, unknown>>(c, "json");
    const actor = c.get("user");
    const permissions = filterAllowedPermissions(normalizePermissions(payload.permissions));

    const userRef = firestore.collection("users").doc(targetUid);
    const snap = await userRef.get();
    if (!snap.exists) throw notFound("not_found");

    await userRef.set(
      {
        permissions,
        updatedAt: admin.firestore.Timestamp.now(),
      },
      { merge: true },
    );

    const claims = await setUserClaims(targetUid, permissions);
    const targetEmail = snap.data()?.emailLower || snap.data()?.email || null;

    await writeAudit({
      type: "user.permissions.update",
      actorUid: actor.uid,
      actorEmail: actor.email || null,
      targetUid,
      targetEmail,
      meta: {
        permissions,
        isSuperadmin: !!claims.superadmin,
        isAdmin: permissions.includes("*") || permissions.includes("superadmin:all"),
      },
    });

    const readback = await userRef.get();
    return c.json({
      ok: true,
      uid: targetUid,
      permissions,
      claimsUpdated: true,
      user: readback.data(),
    });
  } catch (err) {
    return jsonHttpError(c, err, "users.permissions.patch");
  }
}

export async function listAuditLogsHandler(c: Context) {
  try {
    const query = reqValid<{ limit?: string; type?: string; actorUid?: string }>(c, "query");
    const limitRaw = Number(query.limit);
    const limit = Number.isFinite(limitRaw) ? Math.max(1, Math.min(limitRaw, 500)) : 300;
    const type = String(query.type || "").trim();
    const actorUid = String(query.actorUid || "").trim();

    let q:
      | FirebaseFirestore.Query<FirebaseFirestore.DocumentData>
      | FirebaseFirestore.CollectionReference<FirebaseFirestore.DocumentData> =
      firestore.collection("auditLogs");
    if (type) q = q.where("type", "==", type);
    if (actorUid) q = q.where("actorUid", "==", actorUid);
    q = q.orderBy("at", "desc").limit(limit);

    const snap = await q.get();
    const items = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    return c.json({ ok: true, items, limit });
  } catch (err) {
    return jsonHttpError(c, err, "audit.logs.list");
  }
}

