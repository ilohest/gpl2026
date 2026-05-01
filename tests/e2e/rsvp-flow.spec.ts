import { expect, test } from "@playwright/test";

test.describe("rsvp public flow", () => {
  test("submits RSVP and displays confirmation", async ({ page }) => {
    let submittedPayload: Record<string, unknown> | null = null;

    await page.addInitScript(() => {
      window.localStorage.setItem("nm_magic_auth", "1");
      // Minimal v3 recaptcha stub for deterministic E2E.
      const g = window as Window & {
        grecaptcha?: {
          ready: (cb: () => void) => void;
          execute: () => Promise<string>;
        };
      };
      g.grecaptcha = {
        ready: (cb: () => void) => cb(),
        execute: async () => "e2e-recaptcha-token",
      };
    });

    await page.route("**/api/rsvp/submit", async (route) => {
      const raw = route.request().postData() || "{}";
      submittedPayload = JSON.parse(raw) as Record<string, unknown>;

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ok: true, id: "rsvp-e2e-1" }),
      });
    });

    await page.goto("/rsvp");
    await expect(page.locator("#rsvp-form")).toBeVisible();

    await page.locator("#firstName").fill("E2E");
    await page.locator("#lastName").fill("Tester");
    await page.locator("#email").fill("e2e@example.com");
    await page.locator("textarea").first().fill("Automated RSVP smoke test");

    await page.locator("#rsvp-form button[type='submit']").click();

    await expect(page.locator("#confirmation-message")).toBeVisible();
    await expect
      .poll(() => typeof submittedPayload?.recaptchaToken === "string")
      .toBe(true);
    await expect.poll(() => {
      const data = submittedPayload?.data as Record<string, unknown> | undefined;
      return data?.email;
    }).toBe("e2e@example.com");
  });
});
