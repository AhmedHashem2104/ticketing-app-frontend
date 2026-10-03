import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import {
  comingSoonSummary,
  failedOrder,
  fans,
  fawryOrder,
  incomingTransfer,
  matchSummary,
  notifications,
  order,
  outgoingTransfer,
  resaleOffers,
  user as omar,
} from "../../test/fixtures";
import { expectInvalidProps, expectNoA11yViolations, renderUI } from "../../test/utils";
import { SiteHeader } from "../organisms/Header";
import { AccountPage, ForgotPasswordPage, InfoPage, NotificationsPage, ResaleMarketPage, TransfersPage } from "./AccountPages";
import { OrderConfirmationPage } from "./PurchasePages";

const NOW = () => new Date("2026-10-01T10:00:00+03:00").getTime();
const header = (
  <SiteHeader
    links={[{ id: "matches", label: "Matches", href: "/events" }]}
    account={{ status: "signed_in", initials: "OK", name: "Omar Khaled", href: "/account" }}
  />
);
const brand = { title: "One account for every match and every show", bullets: ["Get alerts"] };

describe("AccountPage", () => {
  it("renders profile, shortcuts, linked fans and preferences", async () => {
    renderUI(
      <AccountPage
        header={header}
        status="success"
        profile={{ user: omar, fanIdHref: "/fan-id", onSignOut: () => {} }}
        fans={{ fans, onLink: () => {}, onUnlink: () => {}, canLink: true }}
        preferences={{ defaultValues: omar.preferences, onSubmit: () => {} }}
        links={[{ label: "Refunds", description: "Track refund requests", href: "/refunds" }]}
      />,
    );
    expect(screen.getByRole("heading", { level: 1, name: "Your account" })).toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: "Account shortcuts" })).toHaveTextContent("Track refund requests");
    expect(screen.getByRole("heading", { name: "Linked fans" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Notifications" })).toBeInTheDocument();
    await expectNoA11yViolations(document.body, { page: true });
  });

  it("shows loading and error states", () => {
    const onRetry = vi.fn();
    const { rerender } = renderUI(<AccountPage header={header} status="loading" links={[]} />);
    expect(screen.queryByRole("heading", { name: "Linked fans" })).not.toBeInTheDocument();
    rerender(<AccountPage header={header} status="error" onRetry={onRetry} links={[]} />);
    expect(screen.getByText("We couldn't load your account.")).toBeInTheDocument();
  });
});

describe("ForgotPasswordPage", () => {
  it("wraps the reset form in the brand layout", async () => {
    renderUI(
      <ForgotPasswordPage
        brand={brand}
        form={{ stage: "request", onRequest: () => {}, onReset: () => {}, onStartOver: () => {}, loginHref: "/login" }}
      />,
    );
    expect(screen.getByRole("heading", { level: 1, name: "Reset your password" })).toBeInTheDocument();
    await expectNoA11yViolations(document.body, { page: true });
  });
});

describe("TransfersPage", () => {
  it("separates tickets sent to you from those you sent", async () => {
    renderUI(
      <TransfersPage
        header={header}
        status="success"
        incoming={{ transfers: [incomingTransfer], onAccept: () => {}, onDecline: () => {} }}
        outgoing={{ transfers: [outgoingTransfer], onCancel: () => {} }}
        message={{ tone: "success", text: "Ticket added to My tickets" }}
        backHref="/tickets"
      />,
    );
    expect(screen.getByRole("heading", { level: 2, name: "Sent to you" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: "Sent by you" })).toBeInTheDocument();
    expect(screen.getByText("Ticket added to My tickets")).toBeInTheDocument();
    await expectNoA11yViolations(document.body, { page: true });
  });
});

describe("NotificationsPage", () => {
  it("lists notifications and marks them read", async () => {
    const onMarkAllRead = vi.fn();
    const { user } = renderUI(<NotificationsPage header={header} status="success" items={notifications} onMarkAllRead={onMarkAllRead} />);
    expect(screen.getByRole("link", { name: "Omar Khaled sent you a ticket" })).toHaveAttribute("href", "/transfers");
    expect(screen.getByText("Unread:", { exact: false })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Mark all as read" }));
    expect(onMarkAllRead).toHaveBeenCalled();
    await expectNoA11yViolations(document.body, { page: true });
  });

  it("shows an empty state", () => {
    renderUI(<NotificationsPage header={header} status="success" items={[]} />);
    expect(screen.getByText("You're all caught up")).toBeInTheDocument();
  });
});

describe("ResaleMarketPage", () => {
  it("lists fan resale tickets and buys one", async () => {
    const onBuy = vi.fn();
    const { user } = renderUI(
      <ResaleMarketPage
        header={header}
        event={matchSummary}
        status="success"
        offers={resaleOffers}
        onBuy={onBuy}
        backHref="/events/nile-fc-vs-delta-sc"
      />,
      { now: NOW },
    );
    expect(screen.getByRole("heading", { level: 1, name: "Official resale" })).toBeInTheDocument();
    expect(screen.getByText("Fan resale · W2 · face value 250 EGP")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Buy W2 · Row D · Seat 7 for 240 EGP" }));
    expect(onBuy).toHaveBeenCalledWith(resaleOffers[1]);
    await expectNoA11yViolations(document.body, { page: true });
  });

  it("asks for a Fan ID instead of buy buttons and handles empty lists", () => {
    const { rerender } = renderUI(
      <ResaleMarketPage
        header={header}
        event={matchSummary}
        status="success"
        offers={resaleOffers}
        onBuy={() => {}}
        fanIdHref="/fan-id"
        backHref="/events"
      />,
    );
    expect(screen.getByRole("link", { name: "Get your Fan ID" })).toHaveAttribute("href", "/fan-id");
    expect(screen.queryByRole("button", { name: /^Buy/ })).not.toBeInTheDocument();
    rerender(
      <ResaleMarketPage header={header} event={comingSoonSummary} status="success" offers={[]} onBuy={() => {}} backHref="/events" />,
    );
    expect(screen.getByText("No resale tickets right now")).toBeInTheDocument();
  });
});

describe("InfoPage", () => {
  it("renders sections with an in-page table of contents", async () => {
    renderUI(
      <InfoPage
        header={header}
        eyebrow="Help"
        title="Help centre"
        intro="Answers to common questions."
        updated="1 October 2026"
        sections={[
          { id: "tickets", title: "Tickets", paragraphs: ["Your tickets live in the app."] },
          { id: "refunds", title: "Refunds", paragraphs: ["Refund rules depend on the event."] },
        ]}
        contact={{ label: "Contact support", href: "/info/contact" }}
      />,
    );
    expect(screen.getByRole("link", { name: "Refunds" })).toHaveAttribute("href", "#refunds");
    expect(screen.getByRole("region", { name: "Refunds" })).toHaveTextContent("Refund rules depend on the event.");
    await expectNoA11yViolations(document.body, { page: true });
  });

  it("validates props", () => {
    expectInvalidProps(() => renderUI(<InfoPage header={header} title="Help" intro="x" sections={[]} />), /sections/);
  });
});

describe("OrderConfirmationPage payment states", () => {
  it("shows the paid confirmation, a Fawry bill or a failed payment", async () => {
    const { rerender } = renderUI(<OrderConfirmationPage header={header} order={order} ticketsHref="/tickets" />);
    expect(screen.getByRole("heading", { level: 1, name: "You're going" })).toBeInTheDocument();
    rerender(<OrderConfirmationPage header={header} order={fawryOrder} ticketsHref="/tickets" />);
    expect(screen.getByRole("heading", { level: 1, name: "Almost there" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "View my tickets" })).not.toBeInTheDocument();
    rerender(<OrderConfirmationPage header={header} order={failedOrder} ticketsHref="/tickets" retryHref="/checkout/hold_1" />);
    expect(screen.getByRole("link", { name: "Try paying again" })).toBeInTheDocument();
    await expectNoA11yViolations(document.body, { page: true });
  });
});
