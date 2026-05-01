// backend/constants/guestDirectoryAccess.ts

// File-level constants for guest directory authorization.
// Used as an ANY-OF permission gate by GET /guest-directory through requireAnyPermissionHono(...).

export const GUEST_DIRECTORY_ANY_OF: string[] = [
  // RSVP (kept for consistency with Firestore rules + legacy admin flows)
  "rsvp:read",
  // Emails
  "emails:read",
  // Not a :read permission, so it must be listed explicitly.
  "emails:send",
  // Agenda
  "agenda:read",
  // Seating
  "menus_seating:read",
];
