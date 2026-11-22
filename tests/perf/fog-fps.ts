// Frame timing for the fog spike (DESIGN section 9): Pixel 7 emulation, 4× CPU throttle and 20 s
// of scripted pans, zooms and reveals on /design/fog. Headed, so Chromium uses the real GPU, with
// vsync off: frame time then shows the real cost of a frame, and Chromium's 30 fps cap on low
// battery can't hide the difference.
// Needs a production server: pnpm build && pnpm start -p 3300, then
// node tests/perf/fog-fps.ts http://localhost:3300
import { chromium, devices, type Page } from "@playwright/test";

const base = process.argv[2] ?? "http://localhost:3300";
const seconds = 20;
const map = { x: 195, y: 560 };

const tiers = [3, 2, 1];

function frameTimes(page: Page) {
  return page.evaluate(
    (ms) =>
      new Promise<number[]>((resolve) => {
        const times: number[] = [];
        const end = performance.now() + ms;
        const step = (now: number) => {
          times.push(now);
          if (now < end) requestAnimationFrame(step);
          else resolve(times);
        };
        requestAnimationFrame(step);
      }),
    seconds * 1000,
  );
}

async function drive(page: Page) {
  const reveal = page.getByRole("button", { name: "Next stop" });
  const until = Date.now() + (seconds - 1) * 1000;
  for (let round = 0; Date.now() < until; round++) {
    await page.mouse.move(map.x, map.y);
    await page.mouse.down();
    await page.mouse.move(map.x + (round % 2 ? 90 : -90), map.y + 60, { steps: 20 });
    await page.mouse.up();
    await page.mouse.wheel(0, round % 2 ? 300 : -300);
    await page.waitForTimeout(600);
    if (round % 3 === 0) await reveal.click();
    await page.waitForTimeout(600);
  }
}

function summarize(times: number[]) {
  const deltas = times.slice(1).map((t, i) => t - times[i]);
  const sorted = [...deltas].sort((a, b) => a - b);
  const total = (times[times.length - 1] - times[0]) / 1000;
  return {
    fps: Math.round(deltas.length / total),
    mean: Math.round((total * 1000 * 10) / deltas.length) / 10,
    p95: Math.round(sorted[Math.floor(sorted.length * 0.95)]),
    slow: deltas.filter((d) => d > 22).length,
    frames: deltas.length,
  };
}

const results = [];
for (const tier of tiers) {
  const browser = await chromium.launch({
    channel: "chromium",
    headless: false,
    args: ["--disable-gpu-vsync", "--disable-frame-rate-limit"],
  });
  const context = await browser.newContext({
    ...devices["Pixel 7"],
    viewport: { width: 390, height: 844 },
  });
  const page = await context.newPage();
  await page.goto(`${base}/design/fog?tier=${tier}`);
  await page.locator("[data-renderer]").first().waitFor();
  await page.waitForTimeout(6000);
  const gpu = await page.evaluate(() => {
    const gl = document.createElement("canvas").getContext("webgl2");
    const info = gl?.getExtension("WEBGL_debug_renderer_info");
    return gl && info ? String(gl.getParameter(info.UNMASKED_RENDERER_WEBGL)) : "none";
  });
  const renderer = await page.locator("[data-renderer]").first().getAttribute("data-renderer");
  const cdp = await context.newCDPSession(page);
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
  const [times] = await Promise.all([frameTimes(page), drive(page)]);
  results.push({ tier, renderer, gpu, ...summarize(times) });
  await browser.close();
}

process.stdout.write(`${JSON.stringify(results, null, 2)}\n`);
