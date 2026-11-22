import { render, screen } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import Home from "@/app/page";
import { app } from "@/copy";

const profile = vi.hoisted(() => {
  const state: { current: { id: string } | null } = { current: null };
  return state;
});
const redirect = vi.hoisted(() =>
  vi.fn((to: string) => {
    throw new Error(`redirect ${to}`);
  }),
);

vi.mock("next/navigation", () => ({ redirect }));
vi.mock("@/server/profile", () => ({ currentProfile: async () => profile.current }));

beforeEach(() => {
  redirect.mockClear();
});

it("[F1.1] sends a visitor without a profile to onboarding", async () => {
  profile.current = null;
  await expect(Home()).rejects.toThrow("redirect /welcome");
});

it("shows the app name as the page heading for a signed-in profile", async () => {
  profile.current = { id: "p1" };
  render(await Home());
  expect(screen.getByRole("heading", { level: 1, name: app.name })).toBeInTheDocument();
  expect(redirect).not.toHaveBeenCalled();
});
