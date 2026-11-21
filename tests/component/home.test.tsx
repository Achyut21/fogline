import { render, screen } from "@testing-library/react";
import { expect, it } from "vitest";
import Home from "@/app/page";
import { app } from "@/copy";

it("shows the app name as the page heading and the status line", () => {
  render(<Home />);
  expect(screen.getByRole("heading", { level: 1, name: app.name })).toBeInTheDocument();
  expect(screen.getByText(app.homeBody)).toBeInTheDocument();
});
