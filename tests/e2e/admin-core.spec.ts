import { expect, test } from "@playwright/test";

test.describe("admin core routing", () => {
  test("unauthenticated user is redirected from /admin to /access", async ({ page }) => {
    await page.route("**/api/firebase-config", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          apiKey: "e2e-api-key",
          authDomain: "e2e.firebaseapp.com",
          projectId: "e2e-project",
          appId: "1:123:web:abc",
        }),
      });
    });

    await page.goto("/admin");

    await expect(page).toHaveURL(/\/access\?next=\/admin/);
    await expect(page.locator("#email")).toBeVisible();
  });

  test("expired invite token is dropped from URL", async ({ page }) => {
    await page.route("**/api/invites/status?**", async (route) => {
      await route.fulfill({
        status: 410,
        contentType: "application/json",
        body: JSON.stringify({
          ok: false,
          code: "expired",
          message: "expired",
        }),
      });
    });

    await page.goto("/access?token=expired-token");
    await expect(page).toHaveURL(/\/access$/);
    await expect(page.locator("#email")).toBeVisible();
  });
});
