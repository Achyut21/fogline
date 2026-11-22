import { expect, test, type Page } from "@playwright/test";
import { daily, onboarding as o, plans, system } from "@/copy";
import { puzzleFor } from "@/lib/puzzle";
import { calendarDateOf } from "@/lib/time";
import { data } from "@/server/data";

// The daily puzzle end to end (F7): an invalid word is refused, the answer solves it, the event
// shows with Plan it and share. A second visitor who runs out of guesses still sees the event.

const today = calendarDateOf(new Date());
const event = puzzleFor(data.events(), today);
const answer = event?.word ?? "";
const wrong = data
  .words()
  .words.filter((w) => w !== answer)
  .slice(0, 6);

async function onboard(page: Page) {
  await page.goto("/welcome");
  await page.getByLabel(o.welcome.nameLabel).fill("Sam");
  await page.getByRole("button", { name: o.next }).click();
  await page.getByRole("radio", { name: "Boston University" }).click();
  await page.getByRole("button", { name: o.next }).click();
  await page.getByRole("button", { name: o.next }).click();
  await page.getByRole("radio", { name: o.age.under21 }).click();
  await page.getByRole("button", { name: o.age.submit }).click();
  await expect(page).toHaveURL(/\/$/);
}

/** Types a word, sends it, and waits until its row is scored. */
async function guess(page: Page, word: string, row: number) {
  // Keys typed while the last guess is still being checked are ignored.
  await expect(page.getByRole("button", { name: daily.enter })).toBeEnabled();
  await page.keyboard.type(word);
  await page.keyboard.press("Enter");
  await expect(
    page.getByRole("listitem", { name: daily.row(row) }).locator("[data-result=empty]"),
  ).toHaveCount(0);
}

test.skip(answer === "", "no puzzle for today in data/events.json");

test("[F7.2] [F7.3] [F7.4] [F7.5] refuses a non-word, solves the puzzle and reveals the event", async ({
  page,
}) => {
  await onboard(page);
  await page.goto("/daily");
  await expect(page.getByRole("heading", { name: daily.title })).toBeVisible();

  await page.keyboard.type("zzzzz");
  await page.keyboard.press("Enter");
  await expect(page.getByText(daily.errors["not-a-word"])).toBeVisible();
  for (let i = 0; i < 5; i++) await page.keyboard.press("Backspace");

  await guess(page, wrong[0], 1);
  await guess(page, answer, 2);
  await expect(page.getByText(daily.solved(2))).toBeVisible();
  await expect(page.getByRole("heading", { name: daily.event.heading })).toBeVisible();
  await expect(page.getByRole("link", { name: daily.event.planIt })).toBeVisible();
  await expect(page.getByRole("button", { name: daily.share })).toBeVisible();

  await page.reload();
  await expect(page.getByText(daily.solved(2))).toBeVisible();
  await expect(page.getByText(daily.streak(1))).toBeVisible();

  // Plan it opens the builder with the event's start time (F7.4).
  await page.getByRole("link", { name: daily.event.planIt }).click();
  await expect(page.getByRole("heading", { name: plans.builder.title })).toBeVisible();
  if (event && new Date(event.startsAt).getTime() > Date.now()) {
    await expect(page.getByLabel(plans.builder.time)).toHaveValue(
      new Date(event.startsAt).toISOString(),
    );
  }
});

test("[F7.7] still shows the event after six wrong guesses", async ({ page }) => {
  await onboard(page);
  await page.goto("/daily");
  for (const [i, word] of wrong.entries()) await guess(page, word, i + 1);
  await expect(page.getByText(daily.failed)).toBeVisible();
  await expect(page.getByRole("heading", { name: daily.event.heading })).toBeVisible();
});

test("[F1.6] offers Install only after the first finished puzzle, and remembers Not now", async ({
  page,
  browserName,
}) => {
  test.skip(browserName !== "chromium", "beforeinstallprompt is Chrome's");
  await onboard(page);
  // Chrome fires beforeinstallprompt once, early; the test stands in for it.
  const fire = () =>
    page.evaluate(() => {
      const event = Object.assign(new Event("beforeinstallprompt"), {
        prompt: () => Promise.resolve(),
      });
      window.dispatchEvent(event);
    });
  await fire();
  await expect(page.getByRole("button", { name: system.install.install })).toHaveCount(0);

  await page.goto("/daily");
  await fire();
  for (const [i, word] of wrong.entries()) await guess(page, word, i + 1);
  await expect(page.getByRole("button", { name: system.install.install })).toBeVisible();
  await page.getByRole("button", { name: system.install.notNow }).click();
  await expect(page.getByRole("button", { name: system.install.install })).toHaveCount(0);
  await page.reload();
  await fire();
  await expect(page.getByText(daily.failed)).toBeVisible();
  await expect(page.getByRole("button", { name: system.install.install })).toHaveCount(0);
});
