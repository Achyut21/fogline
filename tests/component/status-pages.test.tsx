import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import ErrorPage from "@/app/error";
import GlobalError from "@/app/global-error";
import NotFound from "@/app/not-found";
import OfflinePage from "@/app/offline/page";
import { system } from "@/copy";

const pathname = vi.hoisted(() => ({ current: "/somewhere" }));
vi.mock("next/navigation", () => ({ usePathname: () => pathname.current }));

describe("system pages", () => {
  afterEach(() => {
    pathname.current = "/somewhere";
  });

  it("offline page says what failed and offers a retry of the same address", () => {
    render(<OfflinePage />);
    expect(
      screen.getByRole("heading", { level: 1, name: system.offline.title }),
    ).toBeInTheDocument();
    expect(screen.getByText(system.offline.body)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: system.offline.retry })).toBeInTheDocument();
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });

  it("404 page names the problem and links to the home page", () => {
    render(<NotFound />);
    expect(
      screen.getByRole("heading", { level: 1, name: system.notFound.title }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: system.notFound.home })).toHaveAttribute("href", "/");
  });

  it("error page retries when asked and links to the home page", () => {
    const retry = vi.fn();
    render(<ErrorPage error={new Error("boom")} retry={retry} />);
    expect(screen.getByRole("heading", { level: 1, name: system.error.title })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: system.error.retry }));
    expect(retry).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("link", { name: system.error.home })).toHaveAttribute("href", "/");
  });

  it("error page on the home page offers only a retry, since the link would reload it", () => {
    pathname.current = "/";
    render(<ErrorPage error={new Error("boom")} retry={vi.fn()} />);
    expect(screen.getByRole("button", { name: system.error.retry })).toBeInTheDocument();
    expect(screen.getByText(system.error.homeBody)).toBeInTheDocument();
    expect(screen.queryByText(system.error.body)).not.toBeInTheDocument();
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });

  it("app-wide error offers a retry and no link back into the failing layout", () => {
    const retry = vi.fn();
    render(<GlobalError error={new Error("boom")} retry={retry} />, {
      container: document.documentElement,
    });
    expect(
      screen.getByRole("heading", { level: 1, name: system.appError.title }),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: system.appError.retry }));
    expect(retry).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });
});
