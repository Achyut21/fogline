import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Reveal, RevealStage } from "@/components/display/reveal";
import { StatCounter } from "@/components/display/stat-counter";

const reduced = vi.hoisted(() => ({ current: false }));
vi.mock("motion/react", async (importOriginal) => ({
  ...(await importOriginal<typeof import("motion/react")>()),
  useReducedMotionConfig: () => reduced.current,
}));

function Night({ at = 30 }: { at?: number }) {
  return (
    <Reveal>
      <p>Title</p>
      <RevealStage at={at}>
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

  it("[F9.2] holds a stage, inert, until its time", () => {
    render(<Night />);
    expect(stage()).toHaveStyle({ opacity: "0" });
    expect(stage()).toHaveAttribute("inert");
    expect(screen.getByText("0")).toBeInTheDocument();
  });

  it("[F9.2] shows a stage at its time without a tap", async () => {
    render(<Night at={0.05} />);
    await waitFor(() => expect(stage()).toHaveStyle({ opacity: "1" }));
    await waitFor(() => expect(stage()).not.toHaveAttribute("inert"));
  });

  it("[F9.2] a tap anywhere shows every stage's final state at once", async () => {
    render(<Night />);
    const digits = screen.getByText("0");
    fireEvent.pointerDown(document.body);
    await waitFor(() => expect(stage()).toHaveStyle({ opacity: "1" }));
    expect(stage()).not.toHaveAttribute("inert");
    expect(digits).toHaveTextContent("46");
  });

  it("[F9.2] a key press skips too", async () => {
    render(<Night />);
    fireEvent.keyDown(document, { key: "Enter" });
    await waitFor(() => expect(stage()).toHaveStyle({ opacity: "1" }));
  });

  it("[F9.2] shows the final state without animation with reduced motion", async () => {
    reduced.current = true;
    render(<Night />);
    await waitFor(() => expect(stage()).toHaveStyle({ opacity: "1" }));
    expect(stage()).not.toHaveAttribute("inert");
    expect(screen.queryByText("0")).not.toBeInTheDocument();
  });
});
