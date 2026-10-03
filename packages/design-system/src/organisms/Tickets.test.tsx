import { act, screen, waitFor } from "@testing-library/react";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { concertTicket, incomingTransfer, listings, matchTicket, outgoingTransfer, qrToken } from "../../test/fixtures";
import { expectInvalidProps, expectNoA11yViolations, renderUI } from "../../test/utils";
import { ListingsCard, ResaleForm, ResaleInfoPanel } from "./Resale";
import { StubTicket, TicketActions, TicketDetailPanel, TicketListItem, TransferForm, TransfersCard } from "./Tickets";

describe("StubTicket", () => {
  it("describes the ticket for assistive tech and renders a QR when ready", async () => {
    const { container } = renderUI(<StubTicket ticket={matchTicket} />);
    const article = screen.getByRole("article");
    expect(article).toHaveAccessibleName(
      /Nile FC vs Delta SC, 18 OCT, 2026 20:00, Capital Stadium\. Seat 18, Block W3, Row L, Gate 7\. Holder Omar K\./,
    );
    expect(container.querySelector("svg[role=img]")).not.toBeNull();
    await expectNoA11yViolations(container);
  });

  it("stamps refunded tickets", () => {
    renderUI(<StubTicket ticket={{ ...matchTicket, status: "refunded" }} cut="white" />);
    expect(screen.getByText("REFUNDED")).toBeInTheDocument();
    expect(screen.getByRole("article")).toHaveAccessibleName(/refunded\./);
  });

  it("validates the ticket contract", () => {
    expectInvalidProps(() => renderUI(<StubTicket ticket={{ ...matchTicket, fields: matchTicket.fields.slice(0, 2) }} />), /fields/);
  });
});

describe("TicketActions", () => {
  it("links to QR, transfer and resale and offers refunds when allowed", async () => {
    const { container, rerender } = renderUI(
      <TicketActions
        ticket={concertTicket}
        showQrHref="/tickets/tkt_3"
        transferHref="/tickets/tkt_3?transfer=1"
        resaleHref="/resale?ticket=tkt_3"
        refundHref="/refunds/new?order=ord_2"
        onAddToWallet={() => {}}
      />,
    );
    expect(screen.getByRole("link", { name: "Show QR for Layla Nour Live, ticket 1" })).toHaveAttribute("href", "/tickets/tkt_3");
    expect(screen.getByRole("link", { name: "Request a refund" })).toHaveAttribute("href", "/refunds/new?order=ord_2");
    expect(screen.getByRole("link", { name: "Resell" })).toBeInTheDocument();
    await expectNoA11yViolations(container);
    rerender(<TicketActions ticket={matchTicket} showQrHref="/tickets/tkt_1" refundHref="/refunds/new" />);
    expect(screen.queryByRole("link", { name: "Request a refund" })).not.toBeInTheDocument();
    expect(screen.getByText("Refund not available — sell on official resale instead")).toBeInTheDocument();
  });

  it("explains pending refunds and hides actions for listed tickets", () => {
    renderUI(<TicketActions ticket={{ ...concertTicket, status: "listed" }} showQrHref="/t" transferHref="/t" resaleHref="/r" />);
    expect(screen.getByText("Listed on official resale")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Transfer" })).not.toBeInTheDocument();
  });
});

describe("TicketListItem", () => {
  it("is a pressed toggle", async () => {
    const onSelect = vi.fn();
    const { user } = renderUI(<TicketListItem ticket={matchTicket} countLabel="2 tickets" selected={false} onSelect={onSelect} />);
    await user.click(screen.getByRole("button", { name: /Nile FC vs Delta SC/ }));
    expect(onSelect).toHaveBeenCalled();
    expect(screen.getByRole("button")).toHaveTextContent("2 tickets · Capital Stadium");
  });
});

describe("TransferForm", () => {
  it("validates Fan ID recipients for matches", async () => {
    const onSubmit = vi.fn();
    const { user, container } = renderUI(<TransferForm mode="fan_id" note="Only approved Fan IDs." onSubmit={onSubmit} />);
    await user.type(screen.getByLabelText("Recipient’s Fan ID"), "12");
    await user.click(screen.getByRole("button", { name: "Send ticket" }));
    expect(await screen.findByText("Enter their 12-digit Fan ID number")).toBeInTheDocument();
    await user.clear(screen.getByLabelText("Recipient’s Fan ID"));
    await user.type(screen.getByLabelText("Recipient’s Fan ID"), "2210 4417 1907");
    await user.click(screen.getByRole("button", { name: "Send ticket" }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith({ mode: "fan_id", recipient: "221044171907" }));
    await expectNoA11yViolations(container);
  });

  it("accepts phone or email for shows", async () => {
    const onSubmit = vi.fn();
    const { user } = renderUI(
      <TransferForm mode="contact" note="Friend gets a new QR." onSubmit={onSubmit} serverError="Try again later" />,
    );
    expect(screen.getByRole("alert")).toHaveTextContent("Try again later");
    await user.type(screen.getByLabelText("Friend’s phone or email"), "friend@mail.com");
    await user.click(screen.getByRole("button", { name: "Send ticket" }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith({ mode: "contact", recipient: "friend@mail.com" }));
  });
});

describe("TicketDetailPanel", () => {
  afterEach(() => vi.useRealTimers());

  it("shows the server-signed QR, counts down and asks for a new token when it expires", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    let now = new Date("2026-10-01T10:00:09+03:00").getTime();
    const onNext = vi.fn();
    const onExpire = vi.fn();
    const filmTicket = { ...matchTicket, qrReady: true };
    const { container, rerender } = renderUI(
      <TicketDetailPanel
        ticket={filmTicket}
        position={{ index: 1, of: 2 }}
        onPrevious={() => {}}
        onNext={onNext}
        qr={{ token: qrToken, onExpire }}
      />,
      { now: () => now },
    );
    expect(screen.getByText(/Refreshes in 0:21/)).toBeInTheDocument();
    const before = screen.getByRole("img", { name: "Entry QR code" }).querySelector("path")!.getAttribute("d");
    act(() => {
      now += 22_000;
      vi.advanceTimersByTime(1000);
    });
    expect(onExpire).toHaveBeenCalledTimes(1);
    rerender(
      <TicketDetailPanel
        ticket={filmTicket}
        position={{ index: 1, of: 2 }}
        onPrevious={() => {}}
        onNext={onNext}
        qr={{ token: { ...qrToken, token: `${qrToken.token}x`, expiresAt: "2026-10-01T10:01:00+03:00" }, onExpire }}
      />,
    );
    const after = screen.getByRole("img", { name: "Entry QR code" }).querySelector("path")!.getAttribute("d");
    expect(after).not.toEqual(before);
    expect(screen.getByRole("button", { name: "Previous ticket" })).toBeDisabled();
    screen.getByRole("button", { name: "Next ticket" }).click();
    expect(onNext).toHaveBeenCalled();
    vi.useRealTimers();
    await expectNoA11yViolations(container);
  });

  it("shows loading and error states for the entry QR", () => {
    const ready = { ...matchTicket, qrReady: true };
    const { rerender } = renderUI(
      <TicketDetailPanel
        ticket={ready}
        position={{ index: 1, of: 1 }}
        onPrevious={() => {}}
        onNext={() => {}}
        qr={{ onExpire: () => {} }}
      />,
    );
    expect(screen.getByRole("status")).toHaveTextContent("Loading your entry QR");
    rerender(
      <TicketDetailPanel
        ticket={ready}
        position={{ index: 1, of: 1 }}
        onPrevious={() => {}}
        onNext={() => {}}
        qr={{ error: "No connection — retrying", onExpire: () => {} }}
      />,
    );
    expect(screen.getByText("No connection — retrying")).toBeInTheDocument();
  });

  it("explains a pending transfer and lets the sender cancel it", async () => {
    const onCancel = vi.fn();
    const { user } = renderUI(
      <TicketDetailPanel
        ticket={{ ...concertTicket, status: "transfer_pending" }}
        position={{ index: 1, of: 1 }}
        onPrevious={() => {}}
        onNext={() => {}}
        onCancelTransfer={onCancel}
      />,
    );
    expect(screen.getByText(/Waiting for the recipient to accept/)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Cancel transfer" }));
    expect(onCancel).toHaveBeenCalled();
  });

  it("shows the locked state and toggles the transfer form", async () => {
    function Harness() {
      const [open, setOpen] = useState(false);
      return (
        <TicketDetailPanel
          ticket={concertTicket}
          position={{ index: 1, of: 1 }}
          onPrevious={() => {}}
          onNext={() => {}}
          resaleHref="/resale"
          transfer={{ open, onOpenChange: setOpen, onSubmit: () => {} }}
        />
      );
    }
    const { user } = renderUI(<Harness />);
    expect(screen.getByText("QR not available yet")).toBeInTheDocument();
    const transfer = screen.getByRole("button", { name: "Transfer" });
    expect(transfer).toHaveAttribute("aria-expanded", "false");
    await user.click(transfer);
    expect(transfer).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("form", { name: "Transfer ticket" })).toBeInTheDocument();
  });

  it("hides actions for tickets that are no longer valid", () => {
    renderUI(
      <TicketDetailPanel
        ticket={{ ...matchTicket, status: "transferred" }}
        position={{ index: 1, of: 1 }}
        onPrevious={() => {}}
        onNext={() => {}}
        transfer={{ open: true, onOpenChange: () => {}, onSubmit: () => {} }}
      />,
    );
    expect(screen.getByText("QR unavailable")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Transfer" })).not.toBeInTheDocument();
  });
});

describe("Resale", () => {
  const tickets = [
    { id: "t1", label: "Nile FC vs Delta SC · W3 Row L Seat 19", price: 250 },
    { id: "t2", label: "Layla Nour · Golden Circle", price: 900 },
  ];
  const payoutOptions = [
    { id: "wallet" as const, name: "Mobile wallet", note: "+20 10•• ••• 482" },
    { id: "bank" as const, name: "Bank account", note: "Add IBAN" },
  ];

  it("defaults to face value, shows the payout and resets when the ticket changes", async () => {
    const { user, container } = renderUI(<ResaleForm tickets={tickets} payoutOptions={payoutOptions} onSubmit={() => {}} />);
    const slider = screen.getByRole("slider", { name: "Your price" });
    expect(slider).toHaveAttribute("aria-valuenow", "250");
    expect(screen.getByText("237.50 EGP")).toBeInTheDocument();
    slider.focus();
    await user.keyboard("{ArrowLeft}{ArrowLeft}");
    expect(slider).toHaveAttribute("aria-valuetext", "240 EGP");
    expect(screen.getByRole("button", { name: "List ticket for 240 EGP" })).toBeInTheDocument();
    await user.selectOptions(screen.getByLabelText("Ticket to sell"), "t2");
    expect(screen.getByRole("slider", { name: "Your price" })).toHaveAttribute("aria-valuenow", "900");
    await expectNoA11yViolations(container);
  });

  it("requires a valid IBAN for bank payouts and submits", async () => {
    const onSubmit = vi.fn();
    const { user } = renderUI(<ResaleForm tickets={tickets} payoutOptions={payoutOptions} onSubmit={onSubmit} />);
    await user.click(screen.getByRole("radio", { name: /Bank account/ }));
    await user.click(screen.getByRole("button", { name: /List ticket/ }));
    expect(await screen.findByText("Enter a valid Egyptian IBAN (EG + 27 digits)")).toBeInTheDocument();
    await user.type(screen.getByLabelText("IBAN"), "EG380019000500000000263180002");
    await user.click(screen.getByRole("button", { name: /List ticket/ }));
    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith({ ticketId: "t1", price: 250, payoutMethod: "bank", iban: "EG380019000500000000263180002" }),
    );
  });

  it("renders the info panel and listings with withdraw", async () => {
    const onWithdraw = vi.fn();
    const { user, container } = renderUI(
      <div>
        <ResaleInfoPanel steps={["List at up to face value.", "Money arrives within 2 days."]} />
        <ListingsCard listings={listings} onWithdraw={onWithdraw} />
      </div>,
    );
    await user.click(screen.getByRole("button", { name: "Withdraw Cairo Jazz Nights · 2-day" }));
    expect(onWithdraw).toHaveBeenCalledWith("lst_1");
    expect(screen.getByText("Sold")).toBeInTheDocument();
    await expectNoA11yViolations(container);
  });

  it("requires tickets to sell", () => {
    expectInvalidProps(() => renderUI(<ResaleForm tickets={[]} payoutOptions={payoutOptions} onSubmit={() => {}} />), /no tickets/);
  });
});

describe("TransfersCard", () => {
  it("lets the recipient accept or decline and the sender cancel", async () => {
    const onAccept = vi.fn();
    const onDecline = vi.fn();
    const onCancel = vi.fn();
    const { user, container } = renderUI(
      <TransfersCard transfers={[incomingTransfer, outgoingTransfer]} onAccept={onAccept} onDecline={onDecline} onCancel={onCancel} />,
    );
    expect(screen.getByText("From Omar Khaled", { exact: false })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Accept ticket for Nile FC vs Delta SC" }));
    expect(onAccept).toHaveBeenCalledWith("trf_1");
    await user.click(screen.getByRole("button", { name: "Decline ticket for Nile FC vs Delta SC" }));
    expect(onDecline).toHaveBeenCalledWith("trf_1");
    await user.click(screen.getByRole("button", { name: "Cancel transfer for Layla Nour Live" }));
    expect(onCancel).toHaveBeenCalledWith("trf_2");
    await expectNoA11yViolations(container);
  });

  it("hides actions once a transfer is settled and shows an empty state", () => {
    const { rerender } = renderUI(<TransfersCard transfers={[{ ...incomingTransfer, status: "accepted" }]} onAccept={() => {}} />);
    expect(screen.getByText("Accepted")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Accept/ })).not.toBeInTheDocument();
    rerender(<TransfersCard transfers={[]} emptyLabel="Nothing here" />);
    expect(screen.getByText("Nothing here")).toBeInTheDocument();
  });
});
