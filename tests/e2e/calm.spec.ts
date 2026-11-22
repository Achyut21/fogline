import { expect, test } from "@playwright/test";
import { calm, onboarding as o } from "@/copy";

// Calm mode end to end (F13.1) and the Phase 8 privacy check: with a fake microphone, measuring
// one stretch sends only two numbers, to Fogline's own server, and never audio.

test.use({
  launchOptions: { args: ["--use-fake-device-for-media-stream", "--use-fake-ui-for-media-stream"] },
  permissions: ["microphone"],
});

test("[F13.1] [F1.4] measures a stretch on the device and sends only two numbers", async ({
  page,
  browserName,
}) => {
  test.skip(browserName !== "chromium", "fake microphone flags are Chromium's");
  await page.goto("/welcome");
  await page.getByLabel(o.welcome.nameLabel).fill("Sam");
  await page.getByRole("button", { name: o.next }).click();
  await page.getByRole("radio", { name: "Boston University" }).click();
  await page.getByRole("button", { name: o.next }).click();
  await page.getByRole("button", { name: o.next }).click();
  await page.getByRole("radio", { name: o.age.under21 }).click();
  await page.getByRole("button", { name: o.age.submit }).click();
  await expect(page).toHaveURL(/\/$/);

  await page.goto("/calm");
  // The primer comes before any microphone request (F1.4).
  await expect(page.getByRole("heading", { name: calm.primer.title })).toBeVisible();
  const sent: { url: string; type: string; size: number }[] = [];
  page.on("request", (request) => {
    if (request.method() === "GET") return;
    sent.push({
      url: request.url(),
      type: request.headers()["content-type"] ?? "",
      size: request.postDataBuffer()?.length ?? 0,
    });
  });
  await page.getByRole("button", { name: calm.primer.accept }).click();
  await page.getByLabel(calm.from).selectOption({ label: "Kenmore" });
  await page.getByRole("radio", { name: "Fenway" }).check();
  await page.getByRole("button", { name: calm.start }).click();
  await expect(page.getByText(calm.measuring)).toBeVisible();
  await page.waitForTimeout(3_000);
  await page.getByRole("button", { name: calm.stop }).click();
  await expect(page.getByText(calm.sent)).toBeVisible();

  const origin = new URL(page.url()).origin;
  expect(sent.length).toBeGreaterThan(0);
  for (const request of sent) {
    expect(new URL(request.url).origin).toBe(origin);
    expect(request.type).not.toMatch(/audio|octet-stream|multipart/);
    expect(request.size).toBeLessThan(1_024);
  }
});
