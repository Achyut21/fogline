import { afterAll, afterEach, beforeAll } from "vitest";
import { server, unhandled } from "../msw/server";

function failOnUnhandled() {
  if (unhandled.length === 0) return;
  const messages = unhandled.splice(0);
  throw new Error(`Unmocked network requests. Add MSW handlers for:\n${messages.join("\n")}`);
}

// MSW 3's built-in "error" strategy still lets ".json" URLs through as static assets, and a
// thrown callback error only becomes a 500 response. Record every unhandled request, block it,
// and fail the test after it runs.
beforeAll(() =>
  server.listen({
    async onUnhandledFrame({ frame }) {
      const message = await frame.getUnhandledMessage();
      unhandled.push(message);
      throw new Error(message);
    },
  }),
);

afterEach(() => {
  server.resetHandlers();
  failOnUnhandled();
});

afterAll(() => {
  server.close();
  failOnUnhandled();
});
