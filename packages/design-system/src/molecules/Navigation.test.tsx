import { act, screen } from "@testing-library/react";
import { useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { expectInvalidProps, expectNoA11yViolations, renderUI } from "../../test/utils";
import { CheckoutSteps, ChipGroup, SegmentedControl, SegmentedNav, StepProgress } from "./Navigation";
import { CountdownTiles, HoldTimer } from "./Time";

describe("SegmentedControl", () => {
  it("switches options as pressed toggle buttons", async () => {
    function Harness() {
      const [tab, setTab] = useState("matches");
      return (
        <SegmentedControl
          label="Event type"
          value={tab}
          onValueChange={setTab}
          options={[
            { value: "matches", label: "Matches" },
            { value: "concerts", label: "Concerts & events" },
          ]}
        />
      );
    }
    const { user, container } = renderUI(<Harness />);
    expect(screen.getByRole("group", { name: "Event type" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Matches" })).toHaveAttribute("aria-pressed", "true");
    await user.click(screen.getByRole("button", { name: "Concerts & events" }));
    expect(screen.getByRole("button", { name: "Concerts & events" })).toHaveAttribute("aria-pressed", "true");
    await expectNoA11yViolations(container);
  });

  it("requires the value to be one of the options", () => {
    expectInvalidProps(
      () =>
        renderUI(
          <SegmentedControl
            label="x"
            value="zzz"
            onValueChange={() => {}}
            options={[
              { value: "a", label: "A" },
              { value: "b", label: "B" },
            ]}
          />,
        ),
      /value/,
    );
  });
});

describe("SegmentedNav", () => {
  it("renders links with the current page marked", async () => {
    const { container } = renderUI(
      <SegmentedNav
        label="Ticket lists"
        items={[
          { href: "/tickets", label: "Upcoming (3)", current: true },
          { href: "/refunds", label: "Refunds (3)" },
        ]}
      />,
    );
    expect(screen.getByRole("navigation", { name: "Ticket lists" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Upcoming (3)" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Refunds (3)" })).not.toHaveAttribute("aria-current");
    await expectNoA11yViolations(container);
  });

  it("needs at least two items", () => {
    expectInvalidProps(() => renderUI(<SegmentedNav label="x" items={[{ href: "/a", label: "A" }]} />), /items/);
  });
});

describe("ChipGroup", () => {
  it("selects a single chip", async () => {
    const onChange = vi.fn();
    const { user, container } = renderUI(
      <ChipGroup
        label="Categories"
        value="All"
        onValueChange={onChange}
        options={["All", "Cup", "Concerts"].map((v) => ({ value: v, label: v }))}
      />,
    );
    expect(screen.getByRole("button", { name: "All" })).toHaveAttribute("aria-pressed", "true");
    await user.click(screen.getByRole("button", { name: "Cup" }));
    expect(onChange).toHaveBeenCalledWith("Cup");
    await expectNoA11yViolations(container);
  });
});

describe("StepProgress", () => {
  it("marks completed and current steps", async () => {
    const { container } = renderUI(<StepProgress steps={["Document", "ID photos", "Selfie", "Review", "Done"]} current={2} />);
    const items = screen.getAllByRole("listitem");
    expect(items[0]).toHaveTextContent("Document (completed)");
    expect(items[1]).toHaveAttribute("aria-current", "step");
    expect(items[2]).not.toHaveAttribute("aria-current");
    await expectNoA11yViolations(container);
  });

  it("rejects a current step past the end", () => {
    expectInvalidProps(() => renderUI(<StepProgress steps={["A", "B"]} current={3} />), /current/);
  });
});

describe("CheckoutSteps", () => {
  it("shows done, current and upcoming steps", async () => {
    const { container } = renderUI(<CheckoutSteps current={2} accent="plum" />);
    const [tickets, payment, done] = screen.getAllByRole("listitem");
    expect(tickets).toHaveTextContent("(completed)");
    expect(payment).toHaveAttribute("aria-current", "step");
    expect(payment?.className).toContain("bg-plum");
    expect(done).toHaveTextContent("3 Done");
    await expectNoA11yViolations(container);
    expectInvalidProps(() => renderUI(<CheckoutSteps current={4} />), /current/);
  });
});

describe("HoldTimer", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("counts down and fires onExpire once", () => {
    let now = new Date("2026-10-01T10:00:00Z").getTime();
    const onExpire = vi.fn();
    renderUI(<HoldTimer expiresAt="2026-10-01T10:00:02Z" onExpire={onExpire} />, { now: () => now });
    expect(screen.getByRole("timer")).toHaveTextContent("Held for you 00:02");
    act(() => {
      now += 2000;
      vi.advanceTimersByTime(1000);
    });
    expect(screen.getByRole("timer")).toHaveTextContent("00:00");
    act(() => {
      now += 2000;
      vi.advanceTimersByTime(2000);
    });
    expect(onExpire).toHaveBeenCalledOnce();
  });

  it("turns red in the final minute and validates props", () => {
    const now = new Date("2026-10-01T10:00:00Z").getTime();
    renderUI(<HoldTimer expiresAt="2026-10-01T10:00:30Z" prefix="Seats held for" />, { now: () => now });
    expect(screen.getByRole("timer").className).toContain("bg-rose-soft");
    expect(screen.getByRole("timer")).toHaveAccessibleName("Seats held for: 1 minute left");
    expectInvalidProps(() => renderUI(<HoldTimer expiresAt="soon" />), /expiresAt/);
  });
});

describe("CountdownTiles", () => {
  it("splits the remaining time into tiles", () => {
    const now = new Date("2026-10-01T10:00:00Z").getTime();
    renderUI(<CountdownTiles target="2026-10-03T14:12:36Z" />, { now: () => now });
    const timer = screen.getByRole("timer");
    expect(timer).toHaveAccessibleName("Sale opens in 2 days 4 hours 12 minutes");
    expect(timer).toHaveTextContent("02days04hours12min36sec");
  });
});
