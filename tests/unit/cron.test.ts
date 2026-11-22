import { afterEach, describe, expect, it, vi } from "vitest";
import { cronAuthorized } from "@/server/cron";

const call = (authorization?: string) =>
  new Request("http://localhost/api/cron/end-plans", {
    headers: authorization ? { authorization } : {},
  });

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("cron authorization", () => {
  it("lets in only Vercel Cron's bearer secret", () => {
    vi.stubEnv("CRON_SECRET", "s3cret-value");
    expect(cronAuthorized(call("Bearer s3cret-value"))).toBe(true);
    expect(cronAuthorized(call("Bearer s3cret-valuX"))).toBe(false);
    expect(cronAuthorized(call("s3cret-value"))).toBe(false);
    expect(cronAuthorized(call())).toBe(false);
  });

  it("refuses everything when no secret is configured", () => {
    vi.stubEnv("CRON_SECRET", "");
    expect(cronAuthorized(call("Bearer "))).toBe(false);
    expect(cronAuthorized(call())).toBe(false);
  });
});
