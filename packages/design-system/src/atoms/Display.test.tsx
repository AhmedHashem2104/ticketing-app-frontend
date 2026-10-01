import { screen } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { expectInvalidProps, expectNoA11yViolations, renderUI } from "../../test/utils";
import { Badge } from "./Badge";
import { Chip } from "./Chip";
import { Barcode, QRCode } from "./Codes";
import { DateBadge, Money } from "./DataDisplay";
import { ProgressBar, Separator, Skeleton, Spinner } from "./Feedback";
import { Avatar, Logo, TeamCrest } from "./Identity";
import { Seat, Swatch } from "./Seat";
import { Eyebrow, Heading, VisuallyHidden } from "./Typography";

describe("Heading & Eyebrow", () => {
  it("renders semantic headings with display styling", async () => {
    const { container } = renderUI(
      <>
        <Eyebrow tone="gold">Premier League · Matchday 12</Eyebrow>
        <Heading as="h1" size="4xl">
          Nile FC vs Delta SC
        </Heading>
      </>,
    );
    const heading = screen.getByRole("heading", { level: 1, name: "Nile FC vs Delta SC" });
    expect(heading.className).toContain("font-display");
    expect(heading.className).toContain("uppercase");
    expect(screen.getByText("Premier League · Matchday 12").className).toContain("font-mono");
    await expectNoA11yViolations(container);
  });

  it("supports the ticket font without forced uppercase for sans", () => {
    renderUI(
      <Heading font="sans" as="h3">
        Your seats
      </Heading>,
    );
    expect(screen.getByRole("heading").className).not.toContain("uppercase");
  });

  it("validates props", () => {
    // @ts-expect-error invalid level
    expectInvalidProps(() => renderUI(<Heading as="h7">x</Heading>), /as/);
    // @ts-expect-error invalid tone
    expectInvalidProps(() => renderUI(<Eyebrow tone="red">x</Eyebrow>), /tone/);
  });

  it("hides content visually only", () => {
    renderUI(<VisuallyHidden>Search</VisuallyHidden>);
    expect(screen.getByText("Search")).toHaveClass("sr-only");
  });
});

describe("Badge", () => {
  it("renders tones", async () => {
    const { container } = renderUI(<Badge tone="warning">Few left</Badge>);
    expect(screen.getByText("Few left")).toHaveAttribute("data-variant", "warning");
    await expectNoA11yViolations(container);
  });

  it("validates tone", () => {
    // @ts-expect-error invalid tone
    expectInvalidProps(() => renderUI(<Badge tone="purple">x</Badge>), /tone/);
  });
});

describe("Identity atoms", () => {
  it("renders avatar initials, decorative by default and labelled on request", async () => {
    const { container } = renderUI(
      <>
        <Avatar initials="ok" />
        <Avatar initials="YA" label="Youssef A." />
      </>,
    );
    expect(screen.getByText("OK")).toHaveAttribute("aria-hidden", "true");
    expect(screen.getByRole("img", { name: "Youssef A." })).toHaveTextContent("YA");
    await expectNoA11yViolations(container);
  });

  it("renders the logo with an accessible name in every wordmark style", () => {
    renderUI(
      <>
        <Logo />
        <Logo wordmark="ticket" tone="inverse" />
        <Logo wordmark="none" />
      </>,
    );
    expect(screen.getByText("MATCHPASS")).toBeInTheDocument();
    expect(screen.getAllByText("Matchpass")).toHaveLength(2);
  });

  it("renders team crests as decoration", () => {
    const { container } = renderUI(<TeamCrest short="NFC" size="lg" variant="dark" />);
    expect(container.firstElementChild).toHaveAttribute("aria-hidden", "true");
  });

  it("validates props", () => {
    expectInvalidProps(() => renderUI(<Avatar initials="ABCD" />), /initials/);
    expectInvalidProps(() => renderUI(<TeamCrest short="X" />), /short/);
  });
});

describe("Feedback atoms", () => {
  it("renders a labelled progress bar", async () => {
    const { container } = renderUI(<ProgressBar value={42} label="Progress in line" />);
    const bar = screen.getByRole("progressbar", { name: "Progress in line" });
    expect(bar).toHaveAttribute("aria-valuenow", "42");
    await expectNoA11yViolations(container);
  });

  it("announces loading", () => {
    renderUI(<Spinner label="Loading tickets" />);
    expect(screen.getByRole("status")).toHaveTextContent("Loading tickets");
  });

  it("renders decorative skeletons and separators", () => {
    const { container } = renderUI(
      <>
        <Skeleton className="h-10" rounded="full" />
        <Separator dashed />
      </>,
    );
    expect(container.querySelector('[data-slot="skeleton"]')).toHaveClass("rounded-full");
    expect(container.querySelector('[data-slot="separator"]')).toHaveAttribute("data-orientation", "horizontal");
  });

  it("validates props", () => {
    expectInvalidProps(() => renderUI(<ProgressBar value={120} label="x" />), /value/);
    expectInvalidProps(() => renderUI(<ProgressBar value={10} label="" />), /label/);
  });
});

describe("Seat", () => {
  it("toggles available seats and reports pressed state", async () => {
    const onToggle = vi.fn();
    const { user, container } = renderUI(
      <Seat state="available" number={5} label="Row A seat 5, available, 150 EGP" onToggle={onToggle} />,
    );
    const seat = screen.getByRole("button", { name: "Row A seat 5, available, 150 EGP" });
    expect(seat).toHaveAttribute("aria-pressed", "false");
    await user.click(seat);
    expect(onToggle).toHaveBeenCalledOnce();
    await expectNoA11yViolations(container);
  });

  it("shows the seat number when selected and blocks taken seats", async () => {
    const onToggle = vi.fn();
    const { user } = renderUI(
      <>
        <Seat state="selected" number={18} label="Row L seat 18, selected" />
        <Seat state="taken" number={19} label="Row L seat 19, taken" onToggle={onToggle} />
        <Seat state="wheelchair" number={1} label="Row L seat 1, wheelchair space" />
      </>,
    );
    expect(screen.getByRole("button", { name: /seat 18/ })).toHaveTextContent("18");
    expect(screen.getByRole("button", { name: /seat 18/ })).toHaveAttribute("aria-pressed", "true");
    const taken = screen.getByRole("button", { name: /seat 19/ });
    expect(taken).toHaveAttribute("aria-disabled", "true");
    await user.click(taken);
    expect(onToggle).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: /wheelchair/ })).toHaveAttribute("data-state", "wheelchair");
  });

  it("applies tier colours and dimming", () => {
    renderUI(<Seat state="available" number={3} label="tier seat" fill="#5A3A8C" edge="#3B1F6B" onFill="#FFFFFF" dimmed />);
    const seat = screen.getByRole("button", { name: "tier seat" });
    expect(seat).toHaveStyle({ backgroundColor: "#5A3A8C" });
    expect(seat.className).toContain("opacity-25");
  });

  it("validates props", () => {
    expectInvalidProps(() => renderUI(<Seat state="available" number={0} label="x" />), /number/);
    expectInvalidProps(() => renderUI(<Seat state="available" number={1} label="x" fill="#000000" />), /edge/);
    // @ts-expect-error unknown state
    expectInvalidProps(() => renderUI(<Seat state="reserved" number={1} label="x" />), /state/);
  });

  it("renders legend swatches as decoration", () => {
    const { container } = renderUI(<Swatch fill="#E7E4DA" border="dashed" borderColor="#8C8F88" shape="seat" mark="×" />);
    expect(container.firstElementChild).toHaveAttribute("aria-hidden", "true");
    expectInvalidProps(() => renderUI(<Swatch fill="green" />), /fill/);
  });
});

describe("Chip", () => {
  it("is a controlled toggle button", async () => {
    function Harness() {
      const [on, setOn] = useState(false);
      return (
        <Chip pressed={on} onPressedChange={setOn}>
          Concerts
        </Chip>
      );
    }
    const { user, container } = renderUI(<Harness />);
    const chip = screen.getByRole("button", { name: "Concerts" });
    expect(chip).toHaveAttribute("aria-pressed", "false");
    await user.click(chip);
    expect(chip).toHaveAttribute("aria-pressed", "true");
    await expectNoA11yViolations(container);
  });

  it("requires a change handler", () => {
    // @ts-expect-error missing handler
    expectInvalidProps(() => renderUI(<Chip pressed>All</Chip>), /onPressedChange/);
  });
});

describe("Codes", () => {
  it("renders a scannable QR code as an image", async () => {
    const { container } = renderUI(<QRCode value="matchpass.app/t/MP-58213" size={120} />);
    const qr = screen.getByRole("img", { name: "Ticket QR code" });
    expect(qr).toHaveAttribute("width", "120");
    expect(qr.querySelector("path")?.getAttribute("d")?.length).toBeGreaterThan(100);
    await expectNoA11yViolations(container);
  });

  it("produces different codes for different values", () => {
    renderUI(
      <>
        <QRCode value="A" label="a" />
        <QRCode value="B" label="b" />
      </>,
    );
    const a = screen.getByRole("img", { name: "a" }).querySelector("path")?.getAttribute("d");
    const b = screen.getByRole("img", { name: "b" }).querySelector("path")?.getAttribute("d");
    expect(a).not.toEqual(b);
  });

  it("renders a labelled barcode", () => {
    renderUI(<Barcode value="MP-58213" />);
    expect(screen.getByRole("img", { name: "Barcode MP-58213" })).toBeInTheDocument();
  });

  it("validates props", () => {
    expectInvalidProps(() => renderUI(<QRCode value="" />), /value/);
    expectInvalidProps(() => renderUI(<QRCode value="x" size={10} />), /size/);
    expectInvalidProps(() => renderUI(<Barcode value="x" color="white" />), /color/);
  });
});

describe("Data display", () => {
  it("renders the date tile in Cairo time", () => {
    renderUI(<DateBadge date="2026-10-18T20:00:00+03:00" theme="plum" />);
    expect(screen.getByText("18")).toBeInTheDocument();
    expect(screen.getByText("OCT")).toBeInTheDocument();
  });

  it("renders a plain date column", () => {
    renderUI(<DateBadge date="2026-11-14T21:00:00+02:00" variant="plain" />);
    expect(screen.getByText("NOV")).toBeInTheDocument();
  });

  it("formats money", () => {
    renderUI(
      <>
        <Money amount={1850} variant="display" />
        <Money amount={-180} signed variant="mono" />
      </>,
    );
    expect(screen.getByText("1,850 EGP")).toBeInTheDocument();
    expect(screen.getByText("− 180 EGP")).toHaveClass("font-mono");
  });

  it("validates props", () => {
    expectInvalidProps(() => renderUI(<DateBadge date="not a date" />), /date/);
    expectInvalidProps(() => renderUI(<Money amount={Number.NaN} />), /amount/);
  });
});
