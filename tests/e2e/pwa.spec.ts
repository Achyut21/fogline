import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import type { MetadataRoute } from "next";
import { app, system } from "@/copy";

// Behind Vercel's preview protection the service worker never activates, even with the bypass
// cookie (D-043). Production deployments and CI still run these tests.
const protectedPreview =
  Boolean(process.env.VERCEL_AUTOMATION_BYPASS_SECRET) &&
  process.env.DEPLOYMENT_ENVIRONMENT === "preview";

function pngSize(bytes: Buffer) {
  return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
}

async function expectNoSeriousAxeViolations(page: Page) {
  const { violations } = await new AxeBuilder({ page }).analyze();
  expect(violations.filter((v) => v.impact === "serious" || v.impact === "critical")).toEqual([]);
}

async function installabilityErrors(page: Page) {
  const cdp = await page.context().newCDPSession(page);
  const { installabilityErrors: errors } = await cdp.send("Page.getInstallabilityErrors");
  // Playwright contexts are incognito, which Chrome always reports; it says nothing about the app.
  return errors.map((error) => error.errorId).filter((id) => id !== "in-incognito");
}

async function waitForServiceWorker(page: Page) {
  await expect
    .poll(() => page.evaluate(() => navigator.serviceWorker.controller?.scriptURL ?? ""), {
      message: "the service worker never took control of the page",
      timeout: 15_000,
    })
    .toContain("/serwist/sw.js");
}

test.describe("manifest and installability", () => {
  test.skip(({ browserName }) => browserName !== "chromium", "Chromium-only checks");

  test("has the install fields and icons that load at their stated sizes", async ({ page }) => {
    const response = await page.request.get("/manifest.webmanifest");
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
      const file = await page.request.get(icon.src);
      expect(file.headers()["content-type"]).toBe("image/png");
      const { width, height } = pngSize(await file.body());
      expect(`${width}x${height}`).toBe(icon.sizes);
    }
  });

  test("Chrome reports the home page installable", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator('link[rel="manifest"]')).toHaveAttribute(
      "href",
      "/manifest.webmanifest",
    );
    expect(await installabilityErrors(page)).toEqual([]);
  });

  test("the installability check fails a page with no manifest", async ({ page }) => {
    await page.route("**/installability-probe", (route) =>
      route.fulfill({ contentType: "text/html", body: "<!doctype html><title>probe</title>" }),
    );
    await page.goto("/installability-probe");
    expect(await installabilityErrors(page)).toContain("no-manifest");
  });
});

test("home page carries the iOS install tags and a 180 px touch icon", async ({ page }) => {
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
  const icon = await page.request.get("/icons/apple-touch-icon.png");
  expect(icon.headers()["content-type"]).toBe("image/png");
  expect(pngSize(await icon.body())).toEqual({ width: 180, height: 180 });
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
  test.skip(protectedPreview, "the service worker doesn't activate behind preview protection");
  test.use({ serviceWorkers: "allow" });

  test("registers and takes control of the page", async ({ page }) => {
    await page.goto("/");
    await waitForServiceWorker(page);
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

  test("opens a page it loaded before while offline", async ({ page, context }) => {
    await page.goto("/");
    await waitForServiceWorker(page);
    await page.reload();
    await context.setOffline(true);
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1, name: app.name })).toBeVisible();
  });

  // The one allowed wait for something that must not happen (TESTING.md): a reload would start
  // within milliseconds of the online event, so 2 s after it is a wide margin.
  test("does not reload the page when the connection comes back", async ({ page, context }) => {
    await page.goto("/");
    await waitForServiceWorker(page);
    await page.evaluate(() =>
      addEventListener("online", () => document.documentElement.setAttribute("data-online", ""), {
        once: true,
      }),
    );
    await context.setOffline(true);
    const reloaded = page.waitForEvent("framenavigated", { timeout: 2_000 }).then(
      () => true,
      () => false,
    );
    await context.setOffline(false);
    // The mark is set by the online event in this document; a reload would have wiped it.
    await expect(page.locator("html")).toHaveAttribute("data-online", "");
    expect(await reloaded).toBe(false);
  });

  test("never answers /api requests from the cache", async ({ page, context }) => {
    await page.goto("/");
    await waitForServiceWorker(page);
    const warmup = await page.evaluate(() => fetch("/api/health").then((r) => r.status));
    test.skip(warmup !== 200, "needs a database, so /api/health answers 200 and could be cached");
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
});
