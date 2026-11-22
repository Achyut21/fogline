import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Reveal, RevealStage } from "@/components/display/reveal";
import { StatCounter } from "@/components/display/stat-counter";

const reduced = vi.hoisted(() => ({ current: false }));
vi.mock("motion/react", async (importOriginal) => ({
  ...(await importOriginal<typeof import("motion/react")>()),
  useReducedMotionConfig: () => reduced.current,
}));

function Night() {
  return (
    <Reveal>
      <p>Title</p>
      <RevealStage at={30}>
        <p data-testid="stage">
          <StatCounter value={46} />
        </p>
      </RevealStage>
    </Reveal>
  );
}

const stage = () => screen.getByTestId("stage").parentElement;

describe("Reveal", () => {
  afterEach(() => {
    reduced.current = false;
  });

  it("[F9.2] holds a stage and its count until the stage's time", async () => {
    render(<Night />);
    await new Promise((r) => setTimeout(r, 100));
    expect(stage()).toHaveStyle({ opacity: "0" });
    expect(screen.getByText("0")).toBeInTheDocument();
  });

  it("[F9.2] a tap shows every stage's final state at once", async () => {
    render(<Night />);
    const digits = screen.getByText("0");
    fireEvent.pointerDown(screen.getByText("Title"));
    await waitFor(() => expect(stage()).toHaveStyle({ opacity: "1" }));
    expect(digits).toHaveTextContent("46");
  });

  it("[F9.2] shows the final state without animation with reduced motion", () => {
    reduced.current = true;
    render(<Night />);
    expect(stage()).toHaveStyle({ opacity: "1" });
    expect(screen.queryByText("0")).not.toBeInTheDocument();
  });
});
