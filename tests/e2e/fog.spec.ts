import { expect, test } from "@playwright/test";
import { fog, legal } from "@/copy";
import { nextStops, revealStep, sampleStates, stationPoint } from "@/app/design/fog/sample-fog";

// Every test in this file runs with WebGL off, which only Chromium supports as a launch flag.
test.skip(({ browserName }) => browserName !== "chromium", "Only Chromium can turn WebGL off");
test.use({ launchOptions: { args: ["--disable-webgl", "--disable-3d-apis"] } });

test("[F2.6] shows the 2D fog map with the same cell states when WebGL is unavailable", async ({
  page,
}) => {
  const states = sampleStates();
  const next = revealStep(states, "ride", stationPoint(nextStops[0]));
  await page.goto("/design/fog");

  const map = page.getByRole("img", { name: fog.mapLabel(states.size) });
  await expect(map).toHaveAttribute("data-renderer", "svg");
  await expect(page.getByTestId("renderer")).toContainText(fog.rendererName.svg);
  await expect(page.getByText(legal.mbta)).toBeVisible();

  await page.getByRole("button", { name: fog.reveal }).click();
  await expect(page.getByRole("img", { name: fog.mapLabel(next.size) })).toBeVisible();
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBe(0);
});
