import test from "node:test";
import assert from "node:assert/strict";
import { buildGeneralSummary } from "../services/aiChat.generalSummary.js";

const dashboardFixture = {
  rsvp: { attending: 100, plusOnes: 30, transport: 12, dietYes: 21 },
  finances: { budgetTotal: 50000, spentTotal: 14000, remaining: 36000 },
  seating: { totalTables: 14, unassignedCount: 6 },
  playlist: { totalCount: 245 },
  agenda: { totalCount: 23, next: { time: "11:30", title: "Ceremony" } },
  planner: { pendingCount: 17, totalCount: 39 },
  blog: { lastPostAt: "2026-02-10T10:00:00.000Z" },
  emails: { lastMassEmailAt: "2026-02-11T09:30:00.000Z" },
};

test("general summary includes only modules allowed by permissions", () => {
  const out = buildGeneralSummary({
    data: dashboardFixture,
    permissions: ["rsvp:read", "playlist:read"],
    locale: "en",
    formatDate: () => "formatted",
  });

  assert.match(out, /RSVP:/);
  assert.match(out, /Playlist:/);
  assert.doesNotMatch(out, /Finances:/);
  assert.doesNotMatch(out, /Plan de table:/);
  assert.doesNotMatch(out, /Agenda:/);
  assert.doesNotMatch(out, /Planner:/);
  assert.doesNotMatch(out, /Blog:/);
  assert.doesNotMatch(out, /Emails:/);
});

test("general summary includes all modules for superadmin", () => {
  const out = buildGeneralSummary({
    data: dashboardFixture,
    permissions: ["superadmin:all"],
    locale: "en",
    formatDate: () => "formatted",
  });

  assert.match(out, /RSVP:/);
  assert.match(out, /Finances:/);
  assert.match(out, /Plan de table:/);
  assert.match(out, /Playlist:/);
  assert.match(out, /Agenda:/);
  assert.match(out, /Planner:/);
  assert.match(out, /Blog:/);
  assert.match(out, /Emails:/);
});

test("general summary returns localized no-access message when nothing is visible", () => {
  const outFr = buildGeneralSummary({
    data: dashboardFixture,
    permissions: [],
    locale: "fr",
    formatDate: () => "formatted",
  });
  assert.equal(
    outFr,
    "Aucune donnée du tableau de bord n'est accessible avec vos permissions actuelles.",
  );
});

