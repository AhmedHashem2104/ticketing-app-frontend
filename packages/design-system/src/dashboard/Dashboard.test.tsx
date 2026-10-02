import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { expectInvalidProps, expectNoA11yViolations, renderUI } from "../../test/utils";
import { niceMax, SalesChart } from "./Charts";
import { KpiCard } from "./Data";
import { AuditPage, FanIdQueuePage, FansPage, OrdersPage, PayoutsPage, RefundsPage, RequestsPage } from "./DeskPages";
import { EntryPage, EventReportPage, EventsPage, OverviewPage } from "./EventPages";
import {
  auditRows,
  entrySample,
  eventReportSample,
  eventRows,
  fanIdReviews,
  fanRows,
  orderRows,
  overviewSample,
  payoutRows,
  refundReviews,
  requestRows,
  salesSeries,
  staffUsers,
} from "./fixtures";
import { staffNavFor, staffNavIdOf } from "./nav";
import { StaffLoginForm } from "./Reviews";
import { DashboardShell } from "./Shell";

describe("navigation by role", () => {
  it("gives each role exactly the sections its permissions allow", () => {
    expect(staffNavFor("admin").map((i) => i.id)).toEqual([
      "overview",
      "events",
      "orders",
      "entry",
      "fan-ids",
      "refunds",
      "fans",
      "requests",
      "organizers",
      "payouts",
      "audit",
    ]);
    expect(staffNavFor("operations").map((i) => i.id)).toEqual(["overview", "events", "orders", "entry", "fan-ids", "refunds", "fans"]);
    expect(staffNavFor("organizer").map((i) => i.id)).toEqual(["overview", "events", "orders", "entry", "requests", "payouts"]);
  });

  it("finds the open section from the path, with or without a language prefix", () => {
    expect(staffNavIdOf("/")).toBe("overview");
    expect(staffNavIdOf("/ar")).toBe("overview");
    expect(staffNavIdOf("/events/evt_derby")).toBe("events");
    expect(staffNavIdOf("/ar/fan-ids")).toBe("fan-ids");
  });
});

describe("DashboardShell", () => {
  it("shows the role's menu with counts, marks the current page and signs out", async () => {
    const onSignOut = vi.fn();
    const { user, container } = renderUI(
      <DashboardShell staff={staffUsers.operations} currentPath="/fan-ids" counts={{ "fan-ids": 3 }} onSignOut={onSignOut}>
        <h1>Queue</h1>
      </DashboardShell>,
    );
    const nav = screen.getAllByRole("navigation", { name: "Dashboard" })[0]!;
    expect(within(nav).getByRole("link", { name: /Fan ID reviews/ })).toHaveAttribute("aria-current", "page");
    expect(within(nav).getByRole("link", { name: /Fan ID reviews/ })).toHaveTextContent("3 waiting");
    expect(within(nav).queryByRole("link", { name: "Audit log" })).not.toBeInTheDocument();
    expect(screen.getByText("Operations")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Sign out" }));
    expect(onSignOut).toHaveBeenCalled();
    await expectNoA11yViolations(container);
  });

  it("names the organiser's club and opens the menu on small screens", async () => {
    const { user } = renderUI(
      <DashboardShell staff={staffUsers.organizer} currentPath="/" onSignOut={() => {}}>
        <p>Body</p>
      </DashboardShell>,
    );
    expect(screen.getByText("Organiser · Nile FC")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Open menu" }));
    expect(screen.getByRole("button", { name: "Close menu" })).toHaveAttribute("aria-expanded", "true");
    expect(screen.getAllByRole("navigation", { name: "Dashboard" })).toHaveLength(2);
  });

  it("renders in Arabic, right to left", () => {
    renderUI(
      <DashboardShell staff={staffUsers.admin} currentPath="/" onSignOut={() => {}}>
        <p>x</p>
      </DashboardShell>,
      { locale: "ar" },
    );
    expect(screen.getAllByRole("link", { name: "سجل العمليات" }).length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: "تسجيل الخروج" })).toBeInTheDocument();
  });
});

describe("KPIs and charts", () => {
  it("formats money and shows the change with a sign and arrow, not colour alone", () => {
    renderUI(<KpiCard kpi={overviewSample.kpis[0]!} />);
    expect(screen.getByText("12,480,500 EGP")).toBeInTheDocument();
    expect(screen.getByText("+12%")).toBeInTheDocument();
    expect(screen.getByText(/vs previous 7 days/)).toBeInTheDocument();
  });

  it("rounds the axis to clean numbers", () => {
    expect(niceMax(51_205)).toBe(100_000);
    expect(niceMax(12)).toBe(20);
    expect(niceMax(0)).toBe(1);
    expect(niceMax(240)).toBe(250);
  });

  it("gives every day an accessible value and a table view", async () => {
    const { user, container } = renderUI(<SalesChart points={salesSeries} label="Ticket revenue, last 14 days" />);
    const days = within(screen.getByRole("list", { name: "Ticket revenue, last 14 days" })).getAllByRole("button");
    expect(days).toHaveLength(14);
    expect(days[13]).toHaveAccessibleName(/3 Oct: 27,720 EGP, 72 tickets/);
    fireEvent.pointerEnter(days[5]!);
    expect(screen.getByText("46,200 EGP", { selector: "span" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Show as table" }));
    expect(screen.getByRole("table", { name: "Ticket revenue, last 14 days" })).toBeVisible();
    expect(screen.getAllByRole("row")).toHaveLength(15);
    await expectNoA11yViolations(container);
  });

  it("refuses an empty series", () => {
    expectInvalidProps(() => renderUI(<SalesChart points={[]} label="x" />), "points");
  });
});

describe("pages", () => {
  it("overview: KPIs, chart, waiting work and top events with links", async () => {
    const { container } = renderUI(<OverviewPage overview={overviewSample} staffName="Nadia Farouk" viewerRole="admin" />);
    expect(screen.getByRole("heading", { level: 1, name: "Hello, Nadia" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Fan IDs waiting for review/ })).toHaveAttribute("href", "/fan-ids");
    expect(screen.getByRole("link", { name: "Nile FC vs Delta SC" })).toHaveAttribute("href", "/events/evt_derby");
    expect(screen.getByRole("table", { name: "Top events by revenue" })).toHaveTextContent("Nile Live Productions");
    await expectNoA11yViolations(container);
  });

  it("events: filters by status and search", async () => {
    function Harness() {
      const [query, setQuery] = useState("");
      const [status, setStatus] = useState<"all" | "selling" | "sold_out" | "changed">("all");
      return (
        <EventsPage
          events={eventRows}
          viewerRole="admin"
          query={query}
          onQueryChange={setQuery}
          status={status}
          onStatusChange={setStatus}
        />
      );
    }
    const { user } = renderUI(<Harness />);
    const table = screen.getByRole("table", { name: "Events" });
    expect(within(table).getAllByRole("row")).toHaveLength(3);
    await user.click(screen.getByRole("button", { name: "Sold out" }));
    expect(within(table).getAllByRole("row")).toHaveLength(2);
    expect(table).toHaveTextContent("Layla Nour");
    await user.click(screen.getByRole("button", { name: "Postponed or cancelled" }));
    expect(table).toHaveTextContent("No events match these filters.");
  });

  it("event report: admins postpone with a message to ticket holders", async () => {
    const onChangeStatus = vi.fn();
    const { user } = renderUI(
      <EventReportPage report={eventReportSample} viewerRole="admin" onChangeStatus={onChangeStatus} backHref="/events" />,
    );
    expect(screen.getByRole("list", { name: "Sales by zone" })).toHaveTextContent("9,800 of 12,000 sold");
    expect(screen.getByRole("meter", { name: "VIP" })).toHaveAttribute("aria-valuenow", "450");
    await user.click(screen.getByRole("button", { name: "Postpone" }));
    const dialog = await screen.findByRole("dialog", { name: "Postpone this event?" });
    await user.click(within(dialog).getByRole("button", { name: "Postpone event" }));
    expect(await within(dialog).findByText("Give a reason (at least 5 characters)")).toBeInTheDocument();
    await user.type(within(dialog).getByRole("textbox", { name: /Message to ticket holders/ }), "Stadium repairs after the storm.");
    await user.click(within(dialog).getByRole("button", { name: "Postpone event" }));
    await waitFor(() => expect(onChangeStatus).toHaveBeenCalledWith({ status: "postponed", reason: "Stadium repairs after the storm." }));
  });

  it("event report: organisers can only ask, and see a waiting request", async () => {
    const onRequestChange = vi.fn();
    const { rerender } = renderUI(
      <EventReportPage report={eventReportSample} viewerRole="organizer" onRequestChange={onRequestChange} backHref="/events" />,
    );
    expect(screen.queryByRole("button", { name: "Cancel event" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Ask to cancel" })).toBeInTheDocument();
    rerender(
      <EventReportPage
        report={{ ...eventReportSample, pendingRequest: requestRows[0]! }}
        viewerRole="organizer"
        onRequestChange={onRequestChange}
        backHref="/events"
      />,
    );
    expect(screen.queryByRole("button", { name: "Ask to cancel" })).not.toBeInTheDocument();
    expect(screen.getByText(/Dina Adel asked to postpone this event/)).toBeInTheDocument();
  });

  it("fan ID queue: approve, or reject with a message to the fan", async () => {
    const onApprove = vi.fn();
    const onReject = vi.fn();
    const { user, container } = renderUI(<FanIdQueuePage reviews={fanIdReviews} onApprove={onApprove} onReject={onReject} />);
    const card = screen.getByRole("article", { name: "Salma Nasser" });
    expect(within(card).getByRole("img", { name: "ID document of Salma Nasser" })).toBeInTheDocument();
    expect(within(card).getByText("Below the 75% threshold")).toBeInTheDocument();
    expect(within(card).getByRole("list", { name: "Why it needs a person" }).children).toHaveLength(2);
    await expectNoA11yViolations(container);
    await user.click(within(card).getByRole("button", { name: "Approve Fan ID" }));
    expect(onApprove).toHaveBeenCalledWith("usr_salma");
    await user.click(within(card).getByRole("button", { name: "Reject" }));
    const dialog = await screen.findByRole("dialog");
    await user.type(within(dialog).getByRole("textbox"), "Your selfie doesn't match the passport photo.");
    await user.click(within(dialog).getByRole("button", { name: "Reject Fan ID" }));
    await waitFor(() => expect(onReject).toHaveBeenCalledWith("usr_salma", "Your selfie doesn't match the passport photo."));
  });

  it("fan ID queue: says when there is nothing to review", () => {
    renderUI(<FanIdQueuePage reviews={[]} onApprove={() => {}} onReject={() => {}} />);
    expect(screen.getByText("No Fan IDs to review")).toBeInTheDocument();
    expect(screen.getByText("Queue empty")).toBeInTheDocument();
  });

  it("refunds: shows the amount waiting and approves", async () => {
    const onApprove = vi.fn();
    const { user } = renderUI(
      <RefundsPage refunds={refundReviews} status="in_review" onStatusChange={() => {}} onApprove={onApprove} onReject={() => {}} />,
    );
    expect(screen.getByText("700 EGP", { selector: "span.text-\\[28px\\]" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Approve refund" }));
    expect(onApprove).toHaveBeenCalledWith("rf_1");
  });

  it("orders: filters by status", async () => {
    function Harness() {
      const [status, setStatus] = useState<"all" | "paid" | "pending_payment" | "payment_failed" | "expired">("all");
      return <OrdersPage orders={orderRows} query="" onQueryChange={() => {}} status={status} onStatusChange={setStatus} />;
    }
    const { user } = renderUI(<Harness />);
    await user.click(screen.getByRole("button", { name: "Waiting for payment" }));
    const table = screen.getByRole("table", { name: "Orders" });
    expect(within(table).getAllByRole("row")).toHaveLength(2);
    expect(table).toHaveTextContent("MP-48214");
    expect(table).toHaveTextContent("Fawry");
  });

  it("fans: only managers see suspend, which needs a reason", async () => {
    const onSuspend = vi.fn();
    const { user, rerender } = renderUI(
      <FansPage fans={fanRows} query="" onQueryChange={() => {}} canManage={false} onSuspend={onSuspend} onReactivate={() => {}} />,
    );
    expect(screen.queryByRole("button", { name: "Suspend" })).not.toBeInTheDocument();
    rerender(<FansPage fans={fanRows} query="" onQueryChange={() => {}} canManage onSuspend={onSuspend} onReactivate={() => {}} />);
    expect(screen.getByRole("button", { name: "Reactivate" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Suspend" }));
    const dialog = await screen.findByRole("dialog", { name: "Suspend Omar Khaled?" });
    await user.type(within(dialog).getByRole("textbox"), "Reselling tickets above face value.");
    await user.click(within(dialog).getByRole("button", { name: "Suspend account" }));
    await waitFor(() => expect(onSuspend).toHaveBeenCalledWith("usr_omar", "Reselling tickets above face value."));
  });

  it("requests: admins decide pending ones; organisers only follow them", async () => {
    const onApprove = vi.fn();
    const { user, rerender } = renderUI(<RequestsPage requests={requestRows} canDecide onApprove={onApprove} onReject={() => {}} />);
    await user.click(screen.getByRole("button", { name: "Approve and postpone event" }));
    expect(onApprove).toHaveBeenCalledWith("req_1");
    expect(screen.getByText("Let's give it two more weeks.")).toBeInTheDocument();
    rerender(<RequestsPage requests={requestRows} canDecide={false} onApprove={onApprove} onReject={() => {}} />);
    expect(screen.queryByRole("button", { name: /Approve/ })).not.toBeInTheDocument();
  });

  it("payouts and audit log", () => {
    renderUI(<PayoutsPage payouts={payoutRows} viewerRole="organizer" />);
    expect(screen.getByText("1,326,500 EGP", { selector: "span" })).toBeInTheDocument();
    expect(screen.queryByRole("columnheader", { name: "Organiser" })).not.toBeInTheDocument();
    renderUI(<AuditPage entries={auditRows} query="" onQueryChange={() => {}} />);
    expect(screen.getByRole("table", { name: "Audit log" })).toHaveTextContent("Postponed event");
  });

  it("entry: scans a ticket and announces the result", async () => {
    const onScan = vi.fn();
    const { user, rerender } = renderUI(
      <EntryPage
        events={[{ eventId: "evt_cinema", title: "Dune: Part Three", startsAt: "2026-10-03T17:00:00.000Z" }]}
        eventId="evt_cinema"
        onEventChange={() => {}}
        summary={entrySample}
        gates={["Gate 1", "Gate 2"]}
        canScan
        onScan={onScan}
      />,
    );
    await user.click(screen.getByRole("button", { name: "Check ticket" }));
    expect(await screen.findByText("Scan or paste the ticket QR")).toBeInTheDocument();
    await user.type(screen.getByRole("textbox", { name: "Ticket QR" }), "MPQ1.abc.def{Enter}");
    await waitFor(() => expect(onScan).toHaveBeenCalledWith({ gate: "Gate 1", token: "MPQ1.abc.def" }));
    rerender(
      <EntryPage
        events={[{ eventId: "evt_cinema", title: "Dune: Part Three", startsAt: "2026-10-03T17:00:00.000Z" }]}
        eventId="evt_cinema"
        onEventChange={() => {}}
        summary={entrySample}
        gates={["Gate 1", "Gate 2"]}
        canScan
        onScan={onScan}
        lastScan={{ ...entrySample.recent[0]!, result: "already_used", resultLabel: "Already used" }}
      />,
    );
    expect(screen.getByRole("status")).toHaveTextContent("Do not let in");
    expect(screen.getByRole("meter", { name: "Gate 1" })).toHaveAttribute("aria-valuetext", "30 of 42 in");
  });
});

describe("StaffLoginForm", () => {
  it("validates, and in development fills a role's demo account in one click", async () => {
    const onSubmit = vi.fn();
    const { user } = renderUI(
      <StaffLoginForm
        onSubmit={onSubmit}
        demoAccounts={[{ role: "operations", email: "ops@matchpass.app", label: "Autofill operations" }]}
      />,
      { devTools: true },
    );
    await user.click(screen.getByRole("button", { name: "Sign in" }));
    expect(await screen.findByText("Enter a valid email address")).toBeInTheDocument();
    await user.click(await screen.findByRole("button", { name: /Autofill operations/ }));
    await user.click(screen.getByRole("button", { name: "Sign in" }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith({ email: "ops@matchpass.app", password: "matchpass-staff" }));
  });
});
