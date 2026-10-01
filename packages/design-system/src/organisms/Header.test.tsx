import { screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { comingSoonSummary, concertDetail, concertSummary, matchDetail, matchSummary } from "../../test/fixtures";
import { expectInvalidProps, expectNoA11yViolations, renderUI } from "../../test/utils";
import { CalloutPanel, ComingSoonList, EventGrid, EventResults, FeaturedEventCard, FiltersPanel, type EventFilters } from "./Discovery";
import { MinimalHeader, SiteFooter, SiteHeader } from "./Header";
import { useState } from "react";

const links = [
  { id: "matches", label: "Matches", href: "/events?tab=matches" },
  { id: "concerts", label: "Concerts & events", href: "/events?tab=concerts" },
  { id: "tickets", label: "My tickets", href: "/tickets" },
];

describe("SiteHeader", () => {
  it("highlights the active link and shows sign-in actions when signed out", async () => {
    const { container } = renderUI(
      <SiteHeader
        links={links}
        activeId="concerts"
        account={{ status: "signed_out", signInHref: "/login", cta: { label: "Get your Fan ID", href: "/fan-id" } }}
      />,
    );
    const nav = screen.getByRole("navigation", { name: "Main" });
    expect(within(nav).getByRole("link", { name: "Concerts & events" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Sign in" })).toHaveAttribute("href", "/login");
    expect(screen.getByRole("link", { name: "Get your Fan ID" })).toBeInTheDocument();
    await expectNoA11yViolations(container);
  });

  it("shows the account avatar when signed in and a language toggle when enabled", async () => {
    const onToggle = vi.fn();
    const { user } = renderUI(
      <SiteHeader
        links={links}
        account={{ status: "signed_in", initials: "OK", name: "Omar Khaled", href: "/tickets" }}
        languageToggle={{ label: "Switch to Arabic", glyph: "ع", onToggle }}
      />,
    );
    expect(screen.getByRole("link", { name: "Account: Omar Khaled" })).toHaveAttribute("href", "/tickets");
    await user.click(screen.getByRole("button", { name: "Switch to Arabic" }));
    expect(onToggle).toHaveBeenCalled();
  });

  it("opens the mobile menu with the same links", async () => {
    const { user } = renderUI(<SiteHeader links={links} activeId="tickets" account={{ status: "loading" }} />);
    await user.click(screen.getByRole("button", { name: "Open menu" }));
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByRole("link", { name: "My tickets" })).toHaveAttribute("aria-current", "page");
    await user.click(within(dialog).getByRole("link", { name: "Matches" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("validates props", () => {
    // @ts-expect-error unknown account status
    expectInvalidProps(() => renderUI(<SiteHeader links={links} account={{ status: "guest" }} />), /account/);
    expectInvalidProps(() => renderUI(<SiteHeader links={[{ id: "x", label: "X", href: "x" }]} account={{ status: "loading" }} />), /href/);
  });
});

describe("MinimalHeader & SiteFooter", () => {
  it("renders landmarks", async () => {
    const { container } = renderUI(
      <>
        <MinimalHeader tone="light" trailing={<span>Official waiting room</span>} />
        <SiteFooter tagline="Official tickets." columns={[{ title: "Fans", links: [{ label: "Matches", href: "/events" }] }]} />
      </>,
    );
    expect(screen.getByRole("banner")).toHaveTextContent("Official waiting room");
    expect(screen.getByRole("contentinfo")).toHaveTextContent("Official tickets.");
    expect(screen.getByRole("navigation", { name: "Fans" })).toBeInTheDocument();
    await expectNoA11yViolations(container);
    expectInvalidProps(() => renderUI(<SiteFooter tagline="x" columns={[]} />), /columns/);
  });
});

describe("FeaturedEventCard", () => {
  it("renders a match with both teams as the heading", async () => {
    const { container } = renderUI(
      <FeaturedEventCard
        event={matchDetail}
        primaryAction={{ label: "Join the waiting room", href: "/q" }}
        secondaryAction={{ label: "Match details", href: "/m" }}
      />,
      { now: () => new Date("2026-10-01T10:00:00+03:00").getTime() },
    );
    expect(screen.getByRole("heading", { name: /Nile FC\s+vs\s+Delta SC/ })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Join the waiting room" })).toHaveAttribute("href", "/q");
    expect(screen.getByText(/Sale opens in \dd/)).toBeInTheDocument();
    await expectNoA11yViolations(container);
  });

  it("renders a show with its scarcity note", () => {
    renderUI(
      <FeaturedEventCard
        event={concertDetail}
        primaryAction={{ label: "Get tickets", href: "/t" }}
        secondaryAction={{ label: "Lineup & info", href: "/i" }}
      />,
    );
    expect(screen.getByRole("heading", { name: "Layla Nour" })).toBeInTheDocument();
    expect(screen.getByText("Golden Circle: few left")).toBeInTheDocument();
  });

  it("validates props", () => {
    expectInvalidProps(
      () =>
        renderUI(
          <FeaturedEventCard event={matchDetail} primaryAction={{ label: "", href: "/" }} secondaryAction={{ label: "x", href: "/" }} />,
        ),
      /label/,
    );
  });
});

describe("EventGrid, ComingSoonList, CalloutPanel", () => {
  it("renders cards, notify actions and the callout", async () => {
    const onNotify = vi.fn();
    const { user, container } = renderUI(
      <div>
        <EventGrid
          title="On sale now"
          events={[matchSummary, concertSummary]}
          hrefFor={(e) => `/events/${e.slug}`}
          seeAll={{ label: "See all events", href: "/events" }}
        />
        <ComingSoonList events={[comingSoonSummary]} notifiedIds={[]} onNotify={onNotify} />
        <CalloutPanel
          eyebrow="Needed for football matches"
          title="Get your Fan ID"
          body="Scan your ID."
          action={{ label: "Start verification", href: "/fan-id" }}
        />
      </div>,
    );
    expect(screen.getAllByRole("listitem")).toHaveLength(2);
    expect(screen.getByRole("link", { name: /See all events/ })).toHaveAttribute("href", "/events");
    await user.click(screen.getByRole("button", { name: /Notify me about Egypt/ }));
    expect(onNotify).toHaveBeenCalledWith(comingSoonSummary);
    await expectNoA11yViolations(container);
  });

  it("shows an empty state for an empty grid", () => {
    renderUI(<EventGrid title="On sale now" events={[]} hrefFor={() => "/"} emptyText="Nothing in Comedy yet." />);
    expect(screen.getByText("Nothing in Comedy yet.")).toBeInTheDocument();
  });
});

describe("FiltersPanel", () => {
  function Harness({ onClear = () => {} }: { onClear?: () => void }) {
    const [value, setValue] = useState<EventFilters>({ categories: [], cities: [], availableOnly: false });
    return (
      <>
        <FiltersPanel
          groupLabel="COMPETITION"
          categories={["Premier League", "Cup"]}
          cities={["cairo", "alexandria"]}
          value={value}
          onChange={setValue}
          onClear={onClear}
        />
        <output data-testid="value">{JSON.stringify(value)}</output>
      </>
    );
  }

  it("is fully controlled", async () => {
    const onClear = vi.fn();
    const { user, container } = renderUI(<Harness onClear={onClear} />);
    await user.click(screen.getByRole("checkbox", { name: "Cup" }));
    await user.click(screen.getByRole("checkbox", { name: "Alexandria" }));
    await user.click(screen.getByRole("checkbox", { name: "Show available only" }));
    expect(JSON.parse(screen.getByTestId("value").textContent!)).toEqual({
      categories: ["Cup"],
      cities: ["alexandria"],
      availableOnly: true,
    });
    await user.click(screen.getByRole("checkbox", { name: "Cup" }));
    expect(JSON.parse(screen.getByTestId("value").textContent!).categories).toEqual([]);
    await user.click(screen.getByRole("button", { name: "Clear" }));
    expect(onClear).toHaveBeenCalled();
    await expectNoA11yViolations(container);
  });

  it("validates the value shape", () => {
    expectInvalidProps(
      () =>
        renderUI(
          <FiltersPanel
            groupLabel="x"
            categories={["a"]}
            cities={["cairo"]}
            // @ts-expect-error unknown city
            value={{ categories: [], cities: ["paris"], availableOnly: false }}
            onChange={() => {}}
            onClear={() => {}}
          />,
        ),
      /cities/,
    );
  });
});

describe("EventResults", () => {
  it("handles loading, error, empty and success", async () => {
    const onRetry = vi.fn();
    const props = { hrefFor: (e: { slug: string }) => `/events/${e.slug}` };
    const { rerender, user } = renderUI(<EventResults status="loading" events={[]} {...props} />);
    expect(screen.getByRole("region", { name: "Results" })).toHaveAttribute("aria-busy", "true");
    rerender(<EventResults status="error" events={[]} onRetry={onRetry} {...props} />);
    await user.click(screen.getByRole("button", { name: "Try again" }));
    expect(onRetry).toHaveBeenCalled();
    rerender(<EventResults status="success" events={[]} {...props} />);
    expect(screen.getByText("No events match your filters")).toBeInTheDocument();
    rerender(<EventResults status="success" events={[matchSummary]} {...props} />);
    expect(screen.getByRole("status")).toHaveTextContent("1 upcoming event");
    expect(screen.getByRole("link", { name: /Nile FC vs Delta SC/ })).toHaveAttribute("href", "/events/nile-fc-vs-delta-sc");
  });
});
