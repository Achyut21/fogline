import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { demo } from "@/copy";

// Phase 10 accessibility: axe on every route, signed in with a demo copy so the screens have their
// real content (plans, a recap, a squad). Serious and critical violations fail; the rest are
// listed in the report for the UI pass (Phase 9).

const routes = [
  "/",
  "/daily",
  "/plans",
  "/plans/new",
  "/me",
  "/me/squad",
  "/ride",
  "/calm",
  "/find",
  "/how-it-works",
  "/design",
  "/offline",
  "/restore",
  "/demo",
];

async function blocking(page: Page) {
  const { violations } = await new AxeBuilder({ page }).analyze();
  return violations
    .filter((v) => v.impact === "serious" || v.impact === "critical")
    .map((v) => `${v.id} (${v.impact}): ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`);
}

test("[F1] every route has no serious or critical axe violations", async ({ page }) => {
  test.setTimeout(180_000);
  await page.goto("/demo");
  await page.getByRole("button", { name: demo.page.start }).click();
  await expect(page).toHaveURL(/\/$/);

  const found: string[] = [];
  for (const route of routes) {
    await page.goto(route);
    await page.waitForLoadState("networkidle");
    for (const issue of await blocking(page)) found.push(`${route}: ${issue}`);
  }

  // The demo night's plan page, reached the way a person would: from Plans.
  await page.goto("/plans");
  const plan = page.getByRole("link", { name: new RegExp(demo.nightTitle) }).first();
  await plan.click();
  await expect(page).toHaveURL(/\/p\/[0-9a-f-]+\?t=/);
  await page.waitForLoadState("networkidle");
  for (const issue of await blocking(page)) found.push(`/p/[id]: ${issue}`);

  expect(found).toEqual([]);
});
