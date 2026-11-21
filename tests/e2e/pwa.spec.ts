import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import type { MetadataRoute } from "next";
import { app, system } from "@/copy";

function pngSize(bytes: Buffer) {
  return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
}

async function expectNoSeriousAxeViolations(page: Page) {
  const { violations } = await new AxeBuilder({ page }).analyze();
  expect(violations.filter((v) => v.impact === "serious" || v.impact === "critical")).toEqual([]);
}

async function waitForServiceWorker(page: Page) {
  return page.evaluate(async () => {
    const registration = await navigator.serviceWorker.ready;
    if (!navigator.serviceWorker.controller) {
      await new Promise((resolve) =>
        navigator.serviceWorker.addEventListener("controllerchange", resolve, { once: true }),
      );
    }
    return registration.active?.scriptURL ?? "";
  });
}

test.describe("manifest", () => {
  test.skip(({ browserName }) => browserName !== "chromium", "served the same to every browser");

  test("has the install fields and icons that load at their stated sizes", async ({ page }) => {
    const request = page.request;
    const response = await request.get("/manifest.webmanifest");
    expect(response.ok()).toBe(true);
    const manifest: MetadataRoute.Manifest = await response.json();
    expect(manifest).toMatchObject({
      name: app.name,
      short_name: app.name,
      description: app.description,
      id: "/",
      start_url: "/?source=pwa",
      scope: "/",
      display: "standalone",
      orientation: "portrait",
      background_color: expect.stringMatching(/^#[0-9a-f]{6}$/i),
      theme_color: expect.stringMatching(/^#[0-9a-f]{6}$/i),
      categories: ["travel", "social", "games"],
    });
    const icons = manifest.icons ?? [];
    expect(icons.map((icon) => icon.purpose)).toEqual(expect.arrayContaining(["any", "maskable"]));

    for (const icon of icons) {
      const file = await request.get(icon.src);
      expect(file.headers()["content-type"]).toBe("image/png");
      const { width, height } = pngSize(await file.body());
      expect(`${width}x${height}`).toBe(icon.sizes);
    }
  });
});

test("home page carries the iOS install tags", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator('meta[name="viewport"]')).toHaveAttribute(
    "content",
    /viewport-fit=cover/,
  );
  await expect(page.locator('link[rel="apple-touch-icon"]')).toHaveAttribute(
    "href",
    "/icons/apple-touch-icon.png",
  );
  await expect(page.locator('meta[name="apple-mobile-web-app-title"]')).toHaveAttribute(
    "content",
    app.name,
  );
  await expect(page.locator('meta[name="apple-mobile-web-app-status-bar-style"]')).toHaveAttribute(
    "content",
    "black-translucent",
  );
  await expect(page.locator('meta[name="mobile-web-app-capable"]')).toHaveAttribute(
    "content",
    "yes",
  );
});

test("offline page has no serious or critical axe violations", async ({ page }) => {
  await page.goto("/offline");
  await expect(page.getByRole("heading", { level: 1, name: system.offline.title })).toBeVisible();
  await expectNoSeriousAxeViolations(page);
});

test("unknown addresses show the 404 page with no serious axe violations", async ({ page }) => {
  const response = await page.goto("/no-such-page");
  expect(response?.status()).toBe(404);
  await expect(page.getByRole("heading", { level: 1, name: system.notFound.title })).toBeVisible();
  await expectNoSeriousAxeViolations(page);
});

test("status page actions are at least 44 px tall", async ({ page }) => {
  await page.goto("/offline");
  const retry = await page.getByRole("button", { name: system.offline.retry }).boundingBox();
  expect(retry?.height ?? 0).toBeGreaterThanOrEqual(44);

  await page.goto("/no-such-page");
  const home = await page.getByRole("link", { name: system.notFound.home }).boundingBox();
  expect(home?.height ?? 0).toBeGreaterThanOrEqual(44);
});

test.describe("service worker", () => {
  test.skip(
    ({ browserName }) => browserName !== "chromium",
    "Playwright WebKit has no service workers",
  );

  test("registers and takes control of the page", async ({ page }) => {
    await page.goto("/");
    expect(await waitForServiceWorker(page)).toContain("/serwist/sw.js");
  });

  test("shows the offline page for a new address, and Try again reloads that address", async ({
    page,
    context,
  }) => {
    await page.goto("/");
    await waitForServiceWorker(page);
    await context.setOffline(true);
    await page.goto("/never-visited");
    await expect(page.getByRole("heading", { level: 1, name: system.offline.title })).toBeVisible();

    await context.setOffline(false);
    await page.getByRole("button", { name: system.offline.retry }).click();
    await expect(
      page.getByRole("heading", { level: 1, name: system.notFound.title }),
    ).toBeVisible();
    expect(new URL(page.url()).pathname).toBe("/never-visited");
  });

  test("does not reload the page when the connection comes back", async ({ page, context }) => {
    await page.goto("/");
    await waitForServiceWorker(page);
    const reloaded = page.waitForEvent("framenavigated", { timeout: 2_000 }).then(
      () => true,
      () => false,
    );
    await context.setOffline(true);
    await context.setOffline(false);
    expect(await reloaded).toBe(false);
  });

  test("never answers /api requests from the cache", async ({ page, context }) => {
    await page.goto("/");
    await waitForServiceWorker(page);
    await page.evaluate(() => fetch("/api/health").catch(() => null));
    await context.setOffline(true);
    const outcome = await page.evaluate(() =>
      fetch("/api/health").then(
        () => "answered",
        () => "failed",
      ),
    );
    expect(outcome).toBe("failed");
  });

  test("precaches the preloaded fonts and the icons", async ({ page }) => {
    await page.goto("/");
    await waitForServiceWorker(page);
    const urls = await page.evaluate(async () => {
      const keys: string[] = [];
      for (const name of await caches.keys()) {
        if (!name.includes("precache")) continue;
        for (const request of await (await caches.open(name)).keys()) keys.push(request.url);
      }
      return keys;
    });
    expect(urls.some((url) => url.endsWith(".woff2"))).toBe(true);
    expect(urls.some((url) => url.includes("/icons/icon-192.png"))).toBe(true);
    expect(urls.some((url) => url.includes("/icons/icon.svg"))).toBe(false);
  });

  test("Chrome reports no installability errors", async ({ page }) => {
    await page.goto("/");
    await waitForServiceWorker(page);
    const cdp = await page.context().newCDPSession(page);
    const { installabilityErrors } = await cdp.send("Page.getInstallabilityErrors");
    expect(installabilityErrors).toEqual([]);
  });
});
