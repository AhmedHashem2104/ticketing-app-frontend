import {
  dayjs,
  formatMoney,
  gateVerifyRequestSchema,
  refundReasonLabels,
  refundRequestSchema,
  resaleListingRequestSchema,
  resaleQuote,
  transferRequestSchema,
  type Refund,
  type GateVerifyResponse,
  type QrToken,
  type RefundOptions,
  type Ticket,
  type Transfer,
  type TransfersResponse,
} from "@repo/contracts";
import { Router } from "express";
import { z } from "zod";
import {
  QR_PERIOD_SECONDS,
  type Store,
  type StoredListing,
  type StoredRefund,
  type StoredTicket,
  type StoredTransfer,
} from "../data/store";
import { addHours, dayLabel, shortDateLabel, timeLabel } from "../data/time";
import { currentUser, requireAuth } from "../http/auth";
import { HttpError, notFound } from "../http/errors";
import { param, parseBody, parseQuery } from "../http/validate";

const UPCOMING = new Set<Ticket["status"]>(["valid", "refund_pending", "listed", "transfer_pending"]);
const digits = (value: string) => value.replace(/\D/g, "");

const publicListing = ({ userId: _u, eventId: _e, faceValue: _f, seatLabel: _s, ...rest }: StoredListing) => rest;

const REFUND_METHODS: RefundOptions["methods"] = [
  {
    id: "card",
    name: "Original card •••• 0042",
    note: "Back to the card you paid with",
    time: "5–10 working days",
    tag: "5–10 days",
    bonusRate: 0,
  },
  {
    id: "wallet",
    name: "Mobile wallet +20 10•• ••• 482",
    note: "Fastest way to get cash",
    time: "1–3 working days",
    tag: "1–3 days",
    bonusRate: 0,
  },
  {
    id: "credit",
    name: "Matchpass credit",
    note: "Use it on any match, concert or film",
    time: "Instantly, once approved",
    tag: "+5% bonus",
    bonusRate: 0.05,
  },
];

export function walletRouter(store: Store) {
  const router = Router();
  router.use(["/tickets", "/transfers", "/resale", "/refunds", "/orders/:id/refund-options"], requireAuth(store));

  const ownedTicket = (id: string, userId: string) => {
    const ticket = store.tickets.get(id);
    if (!ticket || ticket.userId !== userId) throw notFound("Ticket");
    return ticket;
  };

  /* ---------- Tickets ---------- */

  router.get("/tickets", (req, res) => {
    const { scope } = parseQuery(z.object({ scope: z.enum(["upcoming", "past"]).default("upcoming") }), req);
    const user = currentUser(res);
    // Tickets stay "upcoming" until three hours after the start.
    const cutoff = dayjs(store.now()).subtract(3, "hour");
    [...store.transfers.values()].forEach((t) => store.refreshTransfer(t));
    const tickets = [...store.tickets.values()]
      .filter((t) => t.userId === user.id)
      .filter((t) =>
        scope === "upcoming" ? UPCOMING.has(t.status) && !dayjs(t.startsAt).isBefore(cutoff) : dayjs(t.startsAt).isBefore(cutoff),
      )
      .sort((a, b) => a.startsAt.localeCompare(b.startsAt) || a.position.index - b.position.index)
      .map((t) => store.publicTicket(t));
    res.json(tickets);
  });

  router.get("/tickets/:id", (req, res) => {
    res.json(store.publicTicket(ownedTicket(param(req, "id"), currentUser(res).id)));
  });

  /* ---------- Entry QR: signed, rotating every 30 seconds ---------- */

  router.get("/tickets/:id/qr", (req, res) => {
    const ticket = store.publicTicket(ownedTicket(param(req, "id"), currentUser(res).id));
    if (ticket.status !== "valid" && ticket.status !== "refund_pending")
      throw new HttpError("CONFLICT", "This ticket can't be used for entry");
    if (!ticket.qrReady) throw new HttpError("FORBIDDEN", ticket.qrUnlockLabel);
    const window = store.qrWindow();
    const expiresAt = dayjs.unix((window + 1) * QR_PERIOD_SECONDS);
    const body: QrToken = {
      token: store.signQr(ticket.id, window),
      expiresAt: expiresAt.toISOString(),
      refreshInSeconds: Math.max(1, expiresAt.diff(dayjs(store.now()), "second")),
    };
    res.setHeader("Cache-Control", "no-store");
    res.json(body);
  });

  /* ---------- Transfers: the recipient has 24 hours to accept ---------- */

  const toTransfer = (t: StoredTransfer, userId: string): Transfer => {
    store.refreshTransfer(t);
    const { fromUserId: _f, toUserId: _t, recipientKey: _k, ...rest } = t;
    return { ...rest, direction: t.fromUserId === userId ? "outgoing" : "incoming" };
  };

  const isRecipient = (t: StoredTransfer, userId: string) => {
    if (t.toUserId) return t.toUserId === userId;
    const user = store.users.get(userId);
    return !!user && (t.recipientKey === user.phone || (!!user.email && t.recipientKey === user.email.toLowerCase()));
  };

  router.post("/tickets/:id/transfer", (req, res) => {
    const user = store.refreshUser(currentUser(res));
    const ticket = store.publicTicket(ownedTicket(param(req, "id"), user.id));
    if (ticket.status !== "valid") throw new HttpError("CONFLICT", "Only valid tickets can be transferred");
    const body = parseBody(transferRequestSchema, req);
    if (body.mode !== ticket.transferMode) {
      throw new HttpError(
        "VALIDATION_ERROR",
        ticket.transferMode === "fan_id" ? "Match tickets can only go to a Fan ID" : "Send this ticket to a phone number or email",
      );
    }
    let recipientKey: string;
    let toUserId: string | undefined;
    let recipientLabel: string;
    if (body.mode === "fan_id") {
      if (store.selfFanNumber(user) === body.recipient) throw new HttpError("VALIDATION_ERROR", "You can't transfer a ticket to yourself");
      const recipient = store.userByFanNumber(body.recipient);
      if (!recipient) {
        throw new HttpError("VALIDATION_ERROR", "There's no approved Fan ID with this number", [
          { path: "recipient", message: "No approved Fan ID with this number" },
        ]);
      }
      // Moving a ticket to the Fan ID it's already tied to (e.g. to the holder's own account) is fine.
      const stored = store.tickets.get(ticket.id)!;
      if (stored.fanNumber !== body.recipient && store.fanNumbersWithTickets(ticket.eventId).has(body.recipient)) {
        throw new HttpError("LIMIT_EXCEEDED", "This fan already has a ticket for the match — one ticket per Fan ID");
      }
      recipientKey = body.recipient;
      toUserId = recipient.id;
      recipientLabel = `Fan ID •••• ${body.recipient.slice(-4)}`;
    } else {
      const contact = body.recipient.includes("@") ? body.recipient.toLowerCase() : digits(body.recipient).replace(/^20(?=1)/, "");
      const recipient = store.userByContact(contact);
      if (recipient?.id === user.id) throw new HttpError("VALIDATION_ERROR", "You can't transfer a ticket to yourself");
      recipientKey = contact;
      toUserId = recipient?.id;
      recipientLabel = body.recipient.replace(/^(.{3}).*(.{3})$/, "$1•••$2");
    }
    store.tickets.get(ticket.id)!.status = "transfer_pending";
    const now = store.now();
    const transfer: StoredTransfer = {
      id: store.id("trf"),
      ticketId: ticket.id,
      status: "pending",
      fromUserId: user.id,
      toUserId,
      recipientKey,
      fromName: user.fullName,
      recipientLabel,
      eventTitle: ticket.title,
      eventSlug: ticket.eventSlug,
      seatLabel: ticket.seatLabel,
      startsAt: ticket.startsAt,
      createdAt: now.toISOString(),
      expiresAt: addHours(now, 24).toISOString(),
    };
    store.transfers.set(transfer.id, transfer);
    if (toUserId) {
      store.notify(toUserId, {
        kind: "transfer",
        title: `${user.fullName} sent you a ticket`,
        body: `${ticket.title} · ${ticket.seatLabel}. Accept within 24 hours.`,
        href: "/transfers",
      });
    }
    res.status(201).json(toTransfer(transfer, user.id));
  });

  router.get("/transfers", (_req, res) => {
    const user = currentUser(res);
    const all = [...store.transfers.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    const body: TransfersResponse = {
      incoming: all.filter((t) => isRecipient(t, user.id)).map((t) => toTransfer(t, user.id)),
      outgoing: all.filter((t) => t.fromUserId === user.id).map((t) => toTransfer(t, user.id)),
    };
    res.json(body);
  });

  const pendingTransfer = (id: string) => {
    const transfer = store.transfers.get(id);
    if (!transfer) throw notFound("Transfer");
    store.refreshTransfer(transfer);
    if (transfer.status !== "pending") throw new HttpError("CONFLICT", `This transfer was already ${transfer.status}`);
    return transfer;
  };

  router.post("/transfers/:id/accept", (req, res) => {
    const user = store.refreshUser(currentUser(res));
    const transfer = pendingTransfer(param(req, "id"));
    if (!isRecipient(transfer, user.id)) throw notFound("Transfer");
    const original = store.tickets.get(transfer.ticketId)!;
    const isMatch = original.eventKind === "match";
    const fanNumber = isMatch ? store.selfFanNumber(user) : undefined;
    if (isMatch && (!fanNumber || fanNumber !== transfer.recipientKey))
      throw new HttpError("FAN_ID_REQUIRED", "This ticket was sent to a different Fan ID");
    const holder = user.fans.find((f) => f.isSelf);
    // The original QR stops working; the recipient gets a freshly issued ticket.
    original.status = "transferred";
    const reissued: StoredTicket = {
      ...original,
      id: store.id("tkt"),
      code: store.nextTicketCode(),
      userId: user.id,
      fanNumber,
      status: "valid",
      holderName: holder?.name.replace(" (you)", "") ?? user.fullName,
      holderInitials: user.initials,
      holderDetail: isMatch ? `${holder?.fanIdMasked ?? "Fan ID"} · bring your ID card` : "Matchpass account",
      position: { index: 1, of: 1 },
    };
    store.tickets.set(reissued.id, reissued);
    transfer.status = "accepted";
    transfer.toUserId = user.id;
    store.notify(transfer.fromUserId, {
      kind: "transfer",
      title: "Your ticket transfer was accepted",
      body: `${transfer.eventTitle} · ${transfer.seatLabel}`,
      href: "/tickets",
    });
    res.json({ transfer: toTransfer(transfer, user.id), ticket: store.publicTicket(reissued) });
  });

  router.post("/transfers/:id/decline", (req, res) => {
    const user = currentUser(res);
    const transfer = pendingTransfer(param(req, "id"));
    if (!isRecipient(transfer, user.id)) throw notFound("Transfer");
    transfer.status = "declined";
    const ticket = store.tickets.get(transfer.ticketId);
    if (ticket?.status === "transfer_pending") ticket.status = "valid";
    store.notify(transfer.fromUserId, {
      kind: "transfer",
      title: "Your ticket transfer was declined",
      body: "The ticket is back in your account.",
      href: "/tickets",
    });
    res.json(toTransfer(transfer, user.id));
  });

  router.post("/transfers/:id/cancel", (req, res) => {
    const user = currentUser(res);
    const transfer = pendingTransfer(param(req, "id"));
    if (transfer.fromUserId !== user.id) throw notFound("Transfer");
    transfer.status = "cancelled";
    const ticket = store.tickets.get(transfer.ticketId);
    if (ticket?.status === "transfer_pending") ticket.status = "valid";
    res.json(toTransfer(transfer, user.id));
  });

  /* ---------- Resale ---------- */

  router.get("/resale/listings", (_req, res) => {
    const user = currentUser(res);
    res.json([...store.listings.values()].filter((l) => l.userId === user.id).map(publicListing));
  });

  router.post("/resale/listings", (req, res) => {
    const user = currentUser(res);
    const body = parseBody(resaleListingRequestSchema, req);
    const ticket = store.publicTicket(ownedTicket(body.ticketId, user.id));
    if (ticket.status !== "valid") throw new HttpError("CONFLICT", "This ticket can't be listed right now");
    if (!ticket.resaleAllowed) throw new HttpError("FORBIDDEN", "Resale isn't available for this ticket");
    if (body.price > ticket.price) {
      throw new HttpError("VALIDATION_ERROR", `The maximum price is ${formatMoney(ticket.price)} — the face value`, [
        { path: "price", message: `Max ${formatMoney(ticket.price)}` },
      ]);
    }
    const quote = resaleQuote(body.price);
    store.tickets.get(ticket.id)!.status = "listed";
    const listing: StoredListing = {
      id: store.id("lst"),
      userId: user.id,
      eventId: ticket.eventId,
      ticketId: ticket.id,
      seatLabel: ticket.seatLabel,
      faceValue: ticket.price,
      title: `${ticket.title} · ${ticket.seatLabel}`,
      price: quote.price,
      payout: quote.payout,
      status: "listed" as const,
      detail: `${formatMoney(quote.price)} · you receive ${formatMoney(quote.payout)}`,
    };
    store.listings.set(listing.id, listing);
    res.status(201).json(publicListing(listing));
  });

  router.delete("/resale/listings/:id", (req, res) => {
    const user = currentUser(res);
    const listing = store.listings.get(param(req, "id"));
    if (!listing || listing.userId !== user.id) throw notFound("Listing");
    if (listing.status !== "listed") throw new HttpError("CONFLICT", "Sold listings can't be withdrawn");
    store.purgeExpiredHolds();
    if ([...store.holds.values()].some((h) => h.listingId === listing.id)) {
      throw new HttpError("CONFLICT", "A fan is paying for this ticket right now — try again in a few minutes");
    }
    store.listings.delete(listing.id);
    const ticket = store.tickets.get(listing.ticketId);
    if (ticket) ticket.status = "valid";
    res.status(204).end();
  });

  /* ---------- Refunds ---------- */

  router.get("/orders/:id/refund-options", (req, res) => {
    const user = currentUser(res);
    const order = store.orders.get(param(req, "id"));
    if (!order || order.userId !== user.id) throw notFound("Order");
    const event = store.eventBySlug(order.eventSlug)!;
    const tickets = order.tickets
      .map((t) => store.tickets.get(t.id))
      .filter((t): t is StoredTicket => !!t)
      .map((t) => store.publicTicket(t))
      .filter((t) => t.status === "valid" && t.refundable);
    const options: RefundOptions = {
      orderId: order.id,
      reference: order.reference,
      eventTitle: order.eventTitle.replace(" — Live in Cairo", " Live"),
      eventDateLabel: shortDateLabel(tickets[0]?.startsAt ?? event.startsAt).toUpperCase(),
      tickets: tickets.map((t) => ({
        id: t.id,
        label: `${t.fields[0]?.value === "Golden" ? "Golden Circle" : t.seatLabel.split(" · ")[0]} · Ticket ${t.position.index}`,
        meta: `${t.holderName} · ${t.seatLabel.split(" · ").slice(-1)[0]} · ${t.code}`,
        price: t.price,
      })),
      serviceFeePerTicket: event.serviceFee,
      deadlineNote: tickets[0]?.refundNote ?? "No tickets on this order can be refunded.",
      methods: REFUND_METHODS,
    };
    res.json(options);
  });

  router.get("/refunds", (_req, res) => {
    const user = currentUser(res);
    const refunds: Refund[] = [...store.refunds.values()]
      .filter((r) => r.userId === user.id)
      .reverse()
      .map(({ userId: _u, ticketIds: _t, ...r }) => r);
    res.json(refunds);
  });

  router.post("/refunds", (req, res) => {
    const user = currentUser(res);
    const body = parseBody(refundRequestSchema, req);
    const order = store.orders.get(body.orderId);
    if (!order || order.userId !== user.id) throw notFound("Order");
    const tickets = body.ticketIds.map((id) => store.publicTicket(ownedTicket(id, user.id)));
    if (tickets.some((t) => t.orderId !== order.id)) throw new HttpError("VALIDATION_ERROR", "All tickets must come from the same order");
    if (tickets.some((t) => t.status !== "valid" || !t.refundable)) {
      throw new HttpError("CONFLICT", "Some of these tickets can't be refunded — try official resale");
    }
    const method = REFUND_METHODS.find((m) => m.id === body.method)!;
    const base = tickets.reduce((sum, t) => sum + t.price, 0);
    const amount = base + Math.round(base * method.bonusRate);
    tickets.forEach((t) => {
      store.tickets.get(t.id)!.status = "refund_pending";
    });
    const now = store.now().toISOString();
    const typeLabel = tickets[0]?.fields[0]?.value === "Golden" ? "Golden Circle" : (tickets[0]?.seatLabel.split(" · ")[0] ?? "ticket");
    const refund: StoredRefund = {
      id: store.id("rf"),
      reference: store.nextRefundReference(),
      orderId: order.id,
      userId: user.id,
      ticketIds: tickets.map((t) => t.id),
      requestedLabel: shortDateLabel(now).toUpperCase(),
      eventTitle: tickets[0]?.title ?? order.eventTitle,
      detail: `${tickets.length} × ${typeLabel} · reason: ${refundReasonLabels[body.reason].replace("I ", "").toLowerCase()}`,
      amount,
      destination: body.method === "credit" ? "To Matchpass credit" : body.method === "card" ? "To card •••• 0042" : "To mobile wallet",
      status: "in_review",
      statusLabel: "In review",
      steps: [
        { label: "Requested", when: `${dayLabel(now)}, ${timeLabel(now)}`, state: "done" },
        { label: "Reviewing", when: "Within 24 hours", state: "current" },
        { label: "Approved", when: "Tickets cancelled", state: "todo" },
        { label: "Money sent", when: method.time, state: "todo" },
      ],
      note: "Your tickets stay valid until we approve the refund.",
      noteTone: "neutral",
      canCancel: true,
      secondaryAction: "View order",
    };
    store.refunds.set(refund.id, refund);
    const { userId: _u, ticketIds: _t, ...publicRefund } = refund;
    res.status(201).json(publicRefund);
  });

  router.post("/refunds/:id/cancel", (req, res) => {
    const user = currentUser(res);
    const refund = store.refunds.get(param(req, "id"));
    if (!refund || refund.userId !== user.id) throw notFound("Refund");
    if (!refund.canCancel) throw new HttpError("CONFLICT", "This refund can no longer be cancelled");
    refund.status = "cancelled";
    refund.statusLabel = "Cancelled by you";
    refund.canCancel = false;
    refund.steps = [
      { label: "Requested", when: refund.steps[0]?.when ?? "", state: "done" },
      { label: "Cancelled", when: "Tickets still valid", state: "failed" },
      { label: "Approved", when: "—", state: "todo" },
      { label: "Money sent", when: "—", state: "todo" },
    ];
    refund.note = `Your request was cancelled. Your ${refund.ticketIds.length} ticket${refund.ticketIds.length === 1 ? " is" : "s are"} still valid.`;
    refund.ticketIds.forEach((id) => {
      const ticket = store.tickets.get(id);
      if (ticket?.status === "refund_pending") ticket.status = "valid";
    });
    const { userId: _u, ticketIds: _t, ...publicRefund } = refund;
    res.json(publicRefund);
  });

  return router;
}

/**
 * Gate scanners: verifies a rotating entry QR. In production this sits behind staff
 * authentication on the venue network; the mock keeps it open so tests can scan.
 */
export function gateRouter(store: Store) {
  const router = Router();
  router.post("/gate/verify", (req, res) => {
    const { token } = parseBody(gateVerifyRequestSchema, req);
    const result = store.verifyQr(token);
    let body: GateVerifyResponse;
    if (!result.ok) body = { valid: false, reason: result.reason };
    else {
      const ticket = store.tickets.get(result.ticketId);
      if (!ticket) body = { valid: false, reason: "unknown_ticket" };
      else {
        const valid = ticket.status === "valid" || ticket.status === "refund_pending";
        body = {
          valid,
          reason: valid ? "ok" : "not_valid",
          ticketCode: ticket.code,
          holderName: ticket.holderName,
          eventTitle: ticket.title,
        };
      }
    }
    res.setHeader("Cache-Control", "no-store");
    res.json(body);
  });
  return router;
}
