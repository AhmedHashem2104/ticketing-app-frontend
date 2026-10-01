import {
  formatMoney,
  refundReasonLabels,
  refundRequestSchema,
  resaleListingRequestSchema,
  resaleQuote,
  transferRequestSchema,
  type Refund,
  type RefundOptions,
  type Ticket,
} from "@repo/contracts";
import { Router } from "express";
import { z } from "zod";
import type { Store, StoredRefund } from "../data/store";
import { dayLabel, shortDateLabel, timeLabel } from "../data/time";
import { currentUser, requireAuth } from "../http/auth";
import { HttpError, notFound } from "../http/errors";
import { param, parseBody, parseQuery } from "../http/validate";

const UPCOMING = new Set<Ticket["status"]>(["valid", "refund_pending", "listed"]);

const strip = <T extends { userId: string }>({ userId: _u, ...rest }: T) => rest;

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
  router.use(["/tickets", "/resale", "/refunds", "/orders/:id/refund-options"], requireAuth(store));

  const ownedTicket = (id: string, userId: string) => {
    const ticket = store.tickets.get(id);
    if (!ticket || ticket.userId !== userId) throw notFound("Ticket");
    return ticket;
  };

  /* ---------- Tickets ---------- */

  router.get("/tickets", (req, res) => {
    const { scope } = parseQuery(z.object({ scope: z.enum(["upcoming", "past"]).default("upcoming") }), req);
    const user = currentUser(res);
    const now = store.now().getTime() - 3 * 3_600_000;
    const tickets = [...store.tickets.values()]
      .filter((t) => t.userId === user.id)
      .filter((t) =>
        scope === "upcoming" ? UPCOMING.has(t.status) && new Date(t.startsAt).getTime() >= now : new Date(t.startsAt).getTime() < now,
      )
      .sort((a, b) => a.startsAt.localeCompare(b.startsAt) || a.position.index - b.position.index)
      .map(strip);
    res.json(tickets);
  });

  router.get("/tickets/:id", (req, res) => {
    res.json(strip(ownedTicket(param(req, "id"), currentUser(res).id)));
  });

  router.post("/tickets/:id/transfer", (req, res) => {
    const user = currentUser(res);
    const ticket = ownedTicket(param(req, "id"), user.id);
    if (ticket.status !== "valid") throw new HttpError("CONFLICT", "Only valid tickets can be transferred");
    const body = parseBody(transferRequestSchema, req);
    if (body.mode !== ticket.transferMode) {
      throw new HttpError(
        "VALIDATION_ERROR",
        ticket.transferMode === "fan_id" ? "Match tickets can only go to a Fan ID" : "Send this ticket to a phone number or email",
      );
    }
    if (body.mode === "fan_id" && user.fanId.status === "approved" && user.fanId.number.replace(/\s/g, "") === body.recipient) {
      throw new HttpError("VALIDATION_ERROR", "You can't transfer a ticket to yourself");
    }
    ticket.status = "transferred";
    const masked =
      body.mode === "fan_id" ? `Fan ID •••• ${body.recipient.slice(-4)}` : body.recipient.replace(/^(.{3}).*(.{3})$/, "$1•••$2");
    res.json({
      ticketId: ticket.id,
      status: ticket.status,
      recipient: masked,
      message: `Ticket sent to ${masked}. They have 24 hours to accept.`,
    });
  });

  /* ---------- Resale ---------- */

  router.get("/resale/listings", (_req, res) => {
    const user = currentUser(res);
    res.json([...store.listings.values()].filter((l) => l.userId === user.id).map(strip));
  });

  router.post("/resale/listings", (req, res) => {
    const user = currentUser(res);
    const body = parseBody(resaleListingRequestSchema, req);
    const ticket = ownedTicket(body.ticketId, user.id);
    if (ticket.status !== "valid") throw new HttpError("CONFLICT", "This ticket can't be listed right now");
    if (!ticket.resaleAllowed) throw new HttpError("FORBIDDEN", "Resale isn't available for this ticket");
    if (body.price > ticket.price) {
      throw new HttpError("VALIDATION_ERROR", `The maximum price is ${formatMoney(ticket.price)} — the face value`, [
        { path: "price", message: `Max ${formatMoney(ticket.price)}` },
      ]);
    }
    const quote = resaleQuote(body.price);
    ticket.status = "listed";
    const listing = {
      id: store.id("lst"),
      userId: user.id,
      ticketId: ticket.id,
      title: `${ticket.title} · ${ticket.seatLabel}`,
      price: quote.price,
      payout: quote.payout,
      status: "listed" as const,
      detail: `${formatMoney(quote.price)} · you receive ${formatMoney(quote.payout)}`,
    };
    store.listings.set(listing.id, listing);
    res.status(201).json(strip(listing));
  });

  router.delete("/resale/listings/:id", (req, res) => {
    const user = currentUser(res);
    const listing = store.listings.get(param(req, "id"));
    if (!listing || listing.userId !== user.id) throw notFound("Listing");
    if (listing.status !== "listed") throw new HttpError("CONFLICT", "Sold listings can't be withdrawn");
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
    const tickets = order.tickets.map((t) => store.tickets.get(t.id)!).filter((t) => t && t.status === "valid" && t.refundable);
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
    const tickets = body.ticketIds.map((id) => ownedTicket(id, user.id));
    if (tickets.some((t) => t.orderId !== order.id)) throw new HttpError("VALIDATION_ERROR", "All tickets must come from the same order");
    if (tickets.some((t) => t.status !== "valid" || !t.refundable)) {
      throw new HttpError("CONFLICT", "Some of these tickets can't be refunded — try official resale");
    }
    const method = REFUND_METHODS.find((m) => m.id === body.method)!;
    const base = tickets.reduce((sum, t) => sum + t.price, 0);
    const amount = base + Math.round(base * method.bonusRate);
    tickets.forEach((t) => {
      t.status = "refund_pending";
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
