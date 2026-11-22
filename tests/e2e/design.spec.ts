import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { design } from "@/copy";
import { themeColor } from "@/styles/theme-color";

const night = /\bdark\b/;

const themeColors = (page: Page) =>
  page
    .locator('meta[name="theme-color"]')
    .evaluateAll((metas: HTMLMetaElement[]) =>
      metas.map((meta) => ({ media: meta.media, content: meta.content })),
    );

test.describe("/design", () => {
  for (const colorScheme of ["light", "dark"] as const) {
    test(`has no serious or critical axe violations with the OS in ${colorScheme}`, async ({
      page,
    }) => {
      await page.emulateMedia({ colorScheme });
      await page.goto("/design");
      const html = page.locator("html");
      if (colorScheme === "dark") await expect(html).toHaveClass(night);
      else await expect(html).not.toHaveClass(night);
      const { violations } = await new AxeBuilder({ page }).analyze();
      expect(violations.filter((v) => v.impact === "serious" || v.impact === "critical")).toEqual(
        [],
      );
    });
  }

  test("keeps a manual theme across a reload and points theme-color at it", async ({ page }) => {
    await page.emulateMedia({ colorScheme: "light" });
    await page.goto("/design");
    const theme = page.getByRole("group", { name: design.theme.label });
    await expect(theme.getByRole("button", { name: design.theme.system })).toHaveAttribute(
      "aria-pressed",
      "true",
    );

    await theme.getByRole("button", { name: design.theme.night }).click();
    await expect(page.locator("html")).toHaveClass(night);
    await expect
      .poll(() => themeColors(page))
      .toEqual([
        { media: "(prefers-color-scheme: light)", content: themeColor.night },
        { media: "(prefers-color-scheme: dark)", content: themeColor.night },
      ]);

    await page.reload();
    await expect(page.locator("html")).toHaveClass(night);
    await expect(theme.getByRole("button", { name: design.theme.night })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await expect
      .poll(() => themeColors(page))
      .toEqual([
        { media: "(prefers-color-scheme: light)", content: themeColor.night },
        { media: "(prefers-color-scheme: dark)", content: themeColor.night },
      ]);

    await theme.getByRole("button", { name: design.theme.system }).click();
    await expect(page.locator("html")).not.toHaveClass(night);
    await expect
      .poll(() => themeColors(page))
      .toEqual([
        { media: "(prefers-color-scheme: light)", content: themeColor.day },
        { media: "(prefers-color-scheme: dark)", content: themeColor.night },
      ]);
  });

  test("has no horizontal scroll", async ({ page }) => {
    await page.goto("/design");
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBe(0);
  });

  test("sets numbers in tabular figures", async ({ page }) => {
    await page.goto("/design");
    const sample = page.getByTestId("tabular-sample");
    const width = (digits: string) =>
      sample
        .locator(`[data-digits="${digits}"]`)
        .evaluate((el) => el.getBoundingClientRect().width);
    const [ones, zeros] = [await width("ones"), await width("zeros")];
    expect(ones).toBeGreaterThan(0);
    expect(Math.abs(ones - zeros)).toBeLessThan(0.5);
  });
});
