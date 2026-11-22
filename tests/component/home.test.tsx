import { expect, it, vi } from "vitest";
import Home from "@/app/page";

const redirect = vi.hoisted(() =>
  vi.fn((to: string) => {
    throw new Error(`redirect ${to}`);
  }),
);

vi.mock("next/navigation", () => ({ redirect }));
vi.mock("@/server/profile", () => ({ currentProfile: async () => null }));

it("[F1.1] sends a visitor without a profile to onboarding", async () => {
  await expect(Home()).rejects.toThrow("redirect /welcome");
});
