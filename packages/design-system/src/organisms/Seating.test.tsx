import { screen, within } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { arenaMap, cinemaMap, fans, hallMap, stadiumMap } from "../../test/fixtures";
import { expectInvalidProps, expectNoA11yViolations, renderUI } from "../../test/utils";
import {
  ArenaMap,
  FanSelector,
  OrderSummaryCard,
  PickedSeatsPanel,
  SeatMap,
  ShowtimePicker,
  StadiumBlockMap,
  TicketTypePicker,
  TierPriceList,
  ZonePicker,
  ZoneSummaryCard,
  type SeatCell,
} from "./Seating";

describe("ZonePicker", () => {
  it("selects zones and blocks restricted ones", async () => {
    function Harness() {
      const [zone, setZone] = useState("cat1");
      return <ZonePicker zones={stadiumMap.zones} value={zone} onValueChange={setZone} exactSeatsHref="/seats" />;
    }
    const { user, container } = renderUI(<Harness />);
    expect(screen.getByRole("button", { name: /^Category 1, West stand/ })).toHaveAttribute("aria-pressed", "true");
    await user.click(screen.getByRole("button", { name: /^VIP lounge/ }));
    expect(screen.getByRole("button", { name: /^VIP lounge/ })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: /^Away fans/ })).toBeDisabled();
    expect(screen.getByRole("link", { name: /Pick exact seats/ })).toHaveAttribute("href", "/seats");
    await expectNoA11yViolations(container);
  });

  it("refuses a restricted zone as the value", () => {
    expectInvalidProps(() => renderUI(<ZonePicker zones={stadiumMap.zones} value="away" onValueChange={() => {}} />), /selectable zone/);
  });

  it("summarises the selected zone", () => {
    renderUI(<ZoneSummaryCard zone={stadiumMap.zones[1]!} />);
    expect(screen.getByRole("region", { name: "Selected zone" })).toHaveTextContent("West stand · Gates 5–8");
    expect(screen.getByText("250 EGP")).toBeInTheDocument();
  });
});

describe("FanSelector", () => {
  it("adds and removes fans up to the maximum", async () => {
    function Harness() {
      const [value, setValue] = useState(["fan_omar"]);
      return <FanSelector fans={fans} value={value} onValueChange={setValue} max={2} linkFanHref="/fan-id" />;
    }
    const { user, container } = renderUI(<Harness />);
    const youssef = screen.getByRole("checkbox", { name: "Youssef A." });
    await user.click(youssef);
    expect(youssef).toBeChecked();
    expect(screen.getByRole("checkbox", { name: "Hassan M." })).toBeDisabled();
    await user.click(screen.getByRole("checkbox", { name: "Omar K. (you)" }));
    expect(screen.getByRole("checkbox", { name: "Omar K. (you)" })).not.toBeChecked();
    await expectNoA11yViolations(container);
  });

  it("validates the maximum", () => {
    expectInvalidProps(() => renderUI(<FanSelector fans={fans} value={["a", "b", "c"]} onValueChange={() => {}} max={2} />), /More fans/);
  });
});

describe("OrderSummaryCard", () => {
  it("renders lines, total and a button or link CTA", async () => {
    const onClick = vi.fn();
    const { user, rerender, container } = renderUI(
      <OrderSummaryCard
        lines={[
          { label: "Category 1 × 2", amount: 500 },
          { label: "Service fee × 2", amount: 30 },
        ]}
        total={530}
        cta={{ label: "Continue to payment", onClick }}
        note="Max 4 per order."
      />,
    );
    expect(screen.getByText("530 EGP")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Continue to payment" }));
    expect(onClick).toHaveBeenCalled();
    await expectNoA11yViolations(container);
    rerender(
      <OrderSummaryCard
        lines={[]}
        total={0}
        cta={{ label: "Continue", href: "/checkout", disabled: true }}
        error="Choose at least one fan."
      />,
    );
    expect(screen.getByRole("link", { name: "Continue" })).toHaveAttribute("aria-disabled", "true");
    expect(screen.getByRole("alert")).toHaveTextContent("Choose at least one fan.");
  });
});

describe("StadiumBlockMap", () => {
  it("shows availability per block and selects", async () => {
    const onChange = vi.fn();
    const { user, container } = renderUI(<StadiumBlockMap blocks={stadiumMap.blocks} value="W2" onValueChange={onChange} />);
    expect(screen.getByRole("button", { name: "Block W2, West stand, 9 seats left" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Block N2, North curve, 4 seats left" })).toHaveTextContent("4 left");
    expect(screen.getByRole("button", { name: /Block S1, South curve, away fans only/ })).toBeDisabled();
    await user.click(screen.getByRole("button", { name: /Block E3/ }));
    expect(onChange).toHaveBeenCalledWith("E3");
    await expectNoA11yViolations(container);
  });

  it("requires all 16 blocks", () => {
    expectInvalidProps(
      () => renderUI(<StadiumBlockMap blocks={stadiumMap.blocks.slice(0, 4)} value="N1" onValueChange={() => {}} />),
      /16 blocks/,
    );
  });
});

describe("SeatMap", () => {
  const cell = (row: string, n: number, state: SeatCell["state"]): SeatCell => ({
    id: `${row}-${n}`,
    number: n,
    state,
    label: `Row ${row} seat ${n}, ${state}`,
  });
  const groups = [
    {
      title: "STALLS",
      rows: [
        { label: "A", segments: [[cell("A", 1, "available"), cell("A", 2, "taken")], [cell("A", 3, "available")]] },
        { label: "B", segments: [[cell("B", 1, "selected"), cell("B", 2, "wheelchair")], [cell("B", 3, "available")]] },
      ],
    },
  ];

  it("uses a single tab stop and arrow-key navigation", async () => {
    const onToggle = vi.fn();
    const { user, container } = renderUI(<SeatMap label="Seats" groups={groups} onToggle={onToggle} />);
    const seats = screen.getAllByRole("button");
    expect(seats.filter((s) => s.tabIndex === 0)).toHaveLength(1);
    expect(screen.getByRole("button", { name: /Row B seat 1/ })).toHaveAttribute("tabindex", "0");
    await user.tab();
    expect(screen.getByRole("button", { name: /Row B seat 1/ })).toHaveFocus();
    await user.keyboard("{ArrowUp}");
    expect(screen.getByRole("button", { name: /Row A seat 1/ })).toHaveFocus();
    await user.keyboard("{ArrowRight}");
    expect(screen.getByRole("button", { name: /Row A seat 2, taken/ })).toHaveFocus();
    await user.keyboard("{End}");
    expect(screen.getByRole("button", { name: /Row A seat 3/ })).toHaveFocus();
    await user.keyboard("{Enter}");
    expect(onToggle).toHaveBeenCalledWith("A-3");
    await expectNoA11yViolations(container);
  });

  it("does not toggle taken seats", async () => {
    const onToggle = vi.fn();
    const { user } = renderUI(<SeatMap label="Seats" groups={groups} onToggle={onToggle} />);
    await user.click(screen.getByRole("button", { name: /taken/ }));
    expect(onToggle).not.toHaveBeenCalled();
    expect(within(screen.getByRole("group", { name: "Row A" })).getAllByRole("button")).toHaveLength(3);
  });

  it("validates seat cells", () => {
    expectInvalidProps(
      () =>
        renderUI(
          <SeatMap
            label="Seats"
            groups={[{ rows: [{ label: "A", segments: [[{ ...cell("A", 1, "available"), fill: "red" }]] }] }]}
            onToggle={() => {}}
          />,
        ),
      /fill/,
    );
  });
});

describe("PickedSeatsPanel", () => {
  it("lists seats, removes them and shows messages", async () => {
    const onRemove = vi.fn();
    const { user, container, rerender } = renderUI(
      <PickedSeatsPanel
        title="Your seats"
        countLabel="0 of 4"
        emptyText="No seats yet."
        seats={[]}
        onRemove={onRemove}
        fees={0}
        total={0}
        cta={{ label: "Continue", onClick: () => {}, disabled: true }}
      />,
    );
    expect(screen.getByText("No seats yet.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Continue" })).toBeDisabled();
    rerender(
      <PickedSeatsPanel
        title="Your seats"
        countLabel="1 of 4"
        emptyText="No seats yet."
        seats={[{ id: "W2-A-5", label: "Block W2 · Row A · Seat 5", detail: "Category 1 · 250 EGP" }]}
        onRemove={onRemove}
        message="You can pick up to 4 seats."
        fees={15}
        total={265}
        cta={{ label: "Continue", onClick: () => {} }}
      />,
    );
    await user.click(screen.getByRole("button", { name: "Remove Block W2 · Row A · Seat 5" }));
    expect(onRemove).toHaveBeenCalledWith("W2-A-5");
    expect(screen.getByRole("alert")).toHaveTextContent("up to 4 seats");
    expect(screen.getByText("265 EGP")).toBeInTheDocument();
    await expectNoA11yViolations(container);
  });
});

describe("Arena picking", () => {
  it("focuses ticket types from the map and caps quantities at the order max", async () => {
    function Harness() {
      const [focus, setFocus] = useState("gc");
      const [qty, setQty] = useState<Record<string, number>>({ gc: 2, ga: 0, vip: 0 });
      return (
        <>
          <ArenaMap ticketTypes={arenaMap.ticketTypes} focusedId={focus} onFocusChange={setFocus} note={arenaMap.note} />
          <TicketTypePicker
            ticketTypes={arenaMap.ticketTypes}
            quantities={qty}
            onQuantitiesChange={setQty}
            max={3}
            focusedId={focus}
            onFocusChange={setFocus}
          />
        </>
      );
    }
    const { user, container } = renderUI(<Harness />);
    await user.click(screen.getByRole("button", { name: "VIP boxes & lounge" }));
    expect(screen.getByRole("button", { name: "VIP boxes & lounge" })).toHaveAttribute("aria-pressed", "true");
    await user.click(screen.getByRole("button", { name: "One more General admission" }));
    expect(screen.getByRole("button", { name: "One more VIP package" })).toBeDisabled();
    await user.click(screen.getByRole("button", { name: "One less Golden Circle" }));
    expect(screen.getByRole("button", { name: "One more VIP package" })).toBeEnabled();
    await expectNoA11yViolations(container);
  });

  it("validates quantities against the maximum", () => {
    expectInvalidProps(
      () => renderUI(<TicketTypePicker ticketTypes={arenaMap.ticketTypes} quantities={{ gc: 9 }} onQuantitiesChange={() => {}} max={8} />),
      /exceed/,
    );
  });
});

describe("ShowtimePicker & TierPriceList", () => {
  it("switches day and showtime", async () => {
    function Harness() {
      const [id, setId] = useState("st_0_2");
      return <ShowtimePicker showtimes={cinemaMap.showtimes} value={id} onValueChange={setId} />;
    }
    const { user, container } = renderUI(<Harness />);
    expect(screen.getByRole("button", { name: "19:00 IMAX, Filling up" })).toHaveAttribute("aria-pressed", "true");
    await user.click(screen.getByRole("button", { name: "13:30 2D, Good availability" }));
    expect(screen.getByRole("button", { name: "13:30 2D, Good availability" })).toHaveAttribute("aria-pressed", "true");
    await user.click(screen.getByRole("button", { name: "Sat 3" }));
    expect(screen.getByRole("button", { name: "Sat 3" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: /Almost full/ })).toHaveAttribute("aria-pressed", "true");
    await expectNoA11yViolations(container);
  });

  it("lists tier prices", () => {
    renderUI(<TierPriceList tiers={hallMap.tiers} />);
    expect(screen.getByText("600 EGP")).toBeInTheDocument();
    expectInvalidProps(
      () => renderUI(<ShowtimePicker showtimes={cinemaMap.showtimes} value="st_9" onValueChange={() => {}} />),
      /showtimes/,
    );
  });
});
