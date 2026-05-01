import { expect, test } from "@playwright/test";

test.describe("auth/access", () => {
  test("invite flow pre-fills and locks email from invite status", async ({ page }) => {
    await page.route("**/api/invites/status?**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          ok: true,
          status: "active",
          emailLower: "invitee@example.com",
          expiresAt: null,
          displayName: "Invitee",
        }),
      });
    });

    await page.goto("/access?token=test-invite-token");

    const email = page.locator("#email");
    await expect(email).toHaveValue("invitee@example.com");
    await expect(email).toBeDisabled();
    await expect(page.locator("#password")).toBeVisible();
  });

  test("access page shows login controls", async ({ page }) => {
    await page.goto("/access");

    const email = page.locator("#email");
    await email.fill("qa@example.com");
    await expect(page.locator("#password")).toBeVisible();
    await expect(page.getByRole("button").first()).toBeVisible();
  });
});
