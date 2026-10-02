import type { Order } from "@repo/contracts";
import { UIProvider } from "@repo/design-system";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, within } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { AppHeader } from "@/components/app-chrome";
import { safeNextPath } from "./auth/session";
import { buildIcs, buildReceipt } from "./downloads";
import { FeatureFlagsProvider } from "./feature-flags/client";
import { allFlagsOff, type FeatureFlags } from "./feature-flags/schema";
import { eventHref, routes } from "./routes";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => "/",
  useSearchParams: () => new URLSearchParams(),
}));

function wrap(flags: Partial<FeatureFlags>, children: ReactNode) {
  // A signed-out visitor: `GET /me` already answered "no session".
  const queryClient = new QueryClient();
  queryClient.setQueryData(["me"], null);
  return (
    <FeatureFlagsProvider flags={{ ...allFlagsOff, ...flags }}>
      <QueryClientProvider client={queryClient}>
        <UIProvider>{children}</UIProvider>
      </QueryClientProvider>
    </FeatureFlagsProvider>
  );
}

describe("AppHeader feature flags", () => {
  it("hides navigation for disabled features", () => {
    render(wrap({}, <AppHeader />));
    const nav = screen.getByRole("navigation", { name: "Main" });
    expect(within(nav).queryByRole("link", { name: "Cinema" })).not.toBeInTheDocument();
    expect(within(nav).queryByRole("link", { name: "Resale" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Get your Fan ID" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Switch to Arabic" })).not.toBeInTheDocument();
  });

  it("shows them when enabled", () => {
    render(wrap({ cinema: true, resale: true, fanId: true, arabicLanguage: true }, <AppHeader active="resale" />));
    const nav = screen.getByRole("navigation", { name: "Main" });
    expect(within(nav).getByRole("link", { name: "Cinema" })).toHaveAttribute("href", "/events?tab=cinema");
    expect(within(nav).getByRole("link", { name: "Resale" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Get your Fan ID" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Switch to Arabic" })).toBeInTheDocument();
  });
});

describe("session", () => {
  it("keeps no token in browser storage", () => {
    expect(localStorage.length).toBe(0);
  });

  it("only allows same-site redirects after login", () => {
    expect(safeNextPath("/tickets")).toBe("/tickets");
    expect(safeNextPath("//evil.test")).toBe("/");
    expect(safeNextPath("https://evil.test", "/home")).toBe("/home");
    expect(safeNextPath(null)).toBe("/");
    expect(safeNextPath("/\\evil.test")).toBe("/");
  });
});

describe("routes", () => {
  it("builds app URLs", () => {
    expect(routes.events("concerts")).toBe("/events?tab=concerts");
    expect(routes.login("/tickets?x=1")).toBe("/login?next=%2Ftickets%3Fx%3D1");
    expect(eventHref({ slug: "the-last-lighthouse", kind: "cinema" })).toBe("/events/the-last-lighthouse/tickets");
    expect(eventHref({ slug: "x", kind: "match" })).toBe("/events/x");
  });
});

describe("downloads", () => {
  it("builds a valid calendar file", () => {
    const ics = buildIcs(
      { id: "e1", title: "Nile FC vs Delta SC; derby", startsAt: "2026-10-18T20:00:00+03:00", location: "Capital Stadium, Cairo" },
      new Date("2026-10-01T00:00:00Z"),
    );
    expect(ics).toContain("DTSTART:20261018T170000Z");
    expect(ics).toContain("DTEND:20261018T193000Z");
    expect(ics).toContain("SUMMARY:Nile FC vs Delta SC\\; derby");
    expect(ics).toContain("LOCATION:Capital Stadium\\, Cairo");
    expect(ics.split("\r\n")[0]).toBe("BEGIN:VCALENDAR");
  });

  it("builds a receipt", () => {
    const order = {
      reference: "MP-2410-1",
      eventTitle: "Nile FC vs Delta SC",
      eventMeta: "Sun 18 Oct",
      paymentLabel: "Paid by card •••• 4242",
      total: 530,
      tickets: [{ holderName: "Omar K.", seatLabel: "W3 · Row L · Seat 18", price: 250 }],
    } as unknown as Order;
    const receipt = buildReceipt(order);
    expect(receipt).toContain("Order MP-2410-1");
    expect(receipt).toContain("250.00");
    expect(receipt).toContain("Total (incl. VAT): 530 EGP");
  });
});
