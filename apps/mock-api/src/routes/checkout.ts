import {
  createOrderRequestSchema,
  dayjs,
  formatMoney,
  holdRequestSchema,
  hostedCardFormSchema,
  promoRequestSchema,
  type EventDetail,
  type Hold,
  type HoldRequest,
  type LineItem,
  type PaymentDetailsParsed,
} from "@repo/contracts";
import express, { Router } from "express";
import type { AppConfig } from "../config";
import { arenaMap, cinemaMap, cinemaSeats, hallMap, parseShowtimeId, stadiumMap, stadiumZones } from "../data/seating";
import {
  gaSpec,
  matchSpec,
  type Store,
  type StoredFan,
  type StoredHold,
  type StoredOrder,
  type StoredUser,
  type TicketSpec,
} from "../data/store";
import { addHours, addMinutes, addSeconds, dayLabel, timeLabel } from "../data/time";
import { currentUser, requireAuth } from "../http/auth";
import { HttpError, notFound } from "../http/errors";
import { param, parseBody } from "../http/validate";
import { hostedPaymentPage } from "./hosted-payment-page";

export const PROMO_CODES: Record<string, { label: string; oncePerUser: boolean; apply: (subtotal: number) => number }> = {
  MATCHPASS10: { label: "MATCHPASS10 · 10% off tickets", oncePerUser: false, apply: (subtotal) => Math.round(subtotal * 0.1) },
  WELCOME50: { label: "WELCOME50 · 50 EGP off", oncePerUser: true, apply: (subtotal) => Math.min(50, subtotal) },
};

export const DECLINED_CARD = "4000000000000002";
/** Fawry bills stay payable for 48 hours; the seats stay reserved meanwhile. */
export const FAWRY_HOURS = 48;

const cleanName = (name: string) => name.replace(" (you)", "");

type Draft = { lines: LineItem[]; specs: TicketSpec[]; seatKeys: string[]; soldKey: string; seats: string[]; listingId?: string };

function group(specs: TicketSpec[], describe: (spec: TicketSpec) => string): LineItem[] {
  const map = new Map<string, LineItem>();
  for (const spec of specs) {
    const label = describe(spec);
    const line = map.get(label) ?? { label, quantity: 0, unitPrice: spec.price, amount: 0 };
    line.quantity += 1;
    line.amount += spec.price;
    map.set(label, line);
  }
  return [...map.values()].map((line) => ({ ...line, label: `${line.label} × ${line.quantity}` }));
}

function approvedFans(user: StoredUser) {
  return user.fans.filter((f) => f.status === "approved");
}

/** Matches allow one ticket per Fan ID — the fan already holding one can't get a second. */
function assertOneTicketPerFan(store: Store, event: EventDetail, fans: StoredFan[]) {
  if (event.kind !== "match") return;
  const taken = store.fanNumbersWithTickets(event.id);
  const clash = fans.find((f) => f.number && taken.has(f.number));
  if (clash) throw new HttpError("LIMIT_EXCEEDED", `${cleanName(clash.name)} already has a ticket for this match — one ticket per Fan ID`);
}

function draftZone(store: Store, user: StoredUser, event: EventDetail, req: Extract<HoldRequest, { type: "zone" }>): Draft {
  const zone = stadiumZones(event).find((z) => z.id === req.zoneId);
  if (!zone) throw notFound("Zone");
  if (zone.restricted) throw new HttpError("FORBIDDEN", zone.restrictedLabel ?? "This zone isn't for sale to you");
  const fans = req.fanIds.map((id) => user.fans.find((f) => f.id === id));
  if (fans.some((f) => !f)) throw new HttpError("VALIDATION_ERROR", "One of the selected fans isn't linked to your account");
  if (fans.some((f) => f!.status !== "approved")) throw new HttpError("FAN_ID_REQUIRED", "Every ticket holder needs an approved Fan ID");
  if (fans.length > event.maxPerOrder) throw new HttpError("LIMIT_EXCEEDED", `Up to ${event.maxPerOrder} tickets per order`);
  assertOneTicketPerFan(store, event, fans as StoredFan[]);

  const unavailable = store.unavailable(event.id, user.id);
  const seatKeys: string[] = [];
  const specs: TicketSpec[] = [];
  const spec = (fan: StoredFan, block: string, row: string, seat: number) =>
    matchSpec(cleanName(fan.name), `${fan.fanIdMasked} · bring your ID card`, block, row, seat, zone.price, fan.number);
  if (zone.id === "vip") {
    const taken = [...unavailable].filter((k) => k.startsWith("VIP-")).length;
    fans.forEach((fan, i) => {
      const seat = taken + i + 1;
      specs.push(spec(fan!, "VIP", "Box 2", seat));
      seatKeys.push(`VIP-B-${seat}`);
    });
  } else {
    const map = stadiumMap(event, unavailable);
    const n = fans.length;
    const rowOrder = [5, 6, 4, 7, 3, 8, 2, 9, 1, 10, 0, 11];
    let found: { block: string; row: string; start: number } | null = null;
    for (const block of map.blocks.filter((b) => b.zoneId === zone.id)) {
      for (const r of rowOrder) {
        const row = block.rows[r];
        const start = row?.seats.indexOf("a".repeat(n)) ?? -1;
        if (row && start >= 0) {
          found = { block: block.id, row: row.label, start };
          break;
        }
      }
      if (found) break;
    }
    if (!found) throw new HttpError("SEAT_UNAVAILABLE", `${zone.name} is sold out for ${n} seats together`);
    fans.forEach((fan, i) => {
      const seat = found!.start + i + 1;
      seatKeys.push(`${found!.block}-${found!.row}-${seat}`);
      specs.push(spec(fan!, found!.block, found!.row, seat));
    });
  }
  return {
    lines: group(specs, () => `${zone.name} · ${zone.where}`),
    specs,
    seatKeys,
    soldKey: event.id,
    seats: specs.map((s) => s.seatLabel),
  };
}

function draftSeats(store: Store, user: StoredUser, event: EventDetail, req: Extract<HoldRequest, { type: "seats" }>): Draft {
  const holder = cleanName(approvedFans(user)[0]?.name ?? user.fullName);
  if (req.seatIds.length > event.maxPerOrder) throw new HttpError("LIMIT_EXCEEDED", `Up to ${event.maxPerOrder} seats per order`);
  if (new Set(req.seatIds).size !== req.seatIds.length) throw new HttpError("VALIDATION_ERROR", "Each seat can only be picked once");

  if (event.layout === "stadium") {
    const taken = store.fanNumbersWithTickets(event.id);
    const fans = approvedFans(user).filter((f) => !f.number || !taken.has(f.number));
    if (req.seatIds.length > fans.length) {
      throw new HttpError(
        "LIMIT_EXCEEDED",
        "You can pick one seat for each approved Fan ID on your account that doesn't already have a ticket",
      );
    }
    const map = stadiumMap(event, store.unavailable(event.id, user.id));
    const specs = req.seatIds.map((seatId, i) => {
      const [blockId, rowLabel, seatNo] = seatId.split("-");
      const block = map.blocks.find((b) => b.id === blockId);
      const row = block?.rows.find((r) => r.label === rowLabel);
      const code = row?.seats[Number(seatNo) - 1];
      if (!block || !row || !code) throw new HttpError("VALIDATION_ERROR", `Seat ${seatId} doesn't exist`);
      if (block.away) throw new HttpError("FORBIDDEN", "Away blocks are for away Fan IDs only");
      if (code === "x") throw new HttpError("SEAT_UNAVAILABLE", `Seat ${seatId} was just taken — pick another`);
      const fan = fans[i]!;
      return matchSpec(
        cleanName(fan.name),
        `${fan.fanIdMasked} · bring your ID card`,
        block.id,
        row.label,
        Number(seatNo),
        block.price,
        fan.number,
      );
    });
    return {
      lines: group(
        specs,
        (s) => `${map.blocks.find((b) => b.id === s.fields[1]?.value)?.category ?? "Seat"} · Block ${s.fields[1]?.value}`,
      ),
      specs,
      seatKeys: req.seatIds,
      soldKey: event.id,
      seats: specs.map((s) => s.seatLabel),
    };
  }

  if (event.layout === "hall") {
    const map = hallMap(event, store.unavailable(event.id, user.id));
    const rows = map.sections.flatMap((s) => s.rows.map((r) => ({ ...r, section: s.id })));
    const specs = req.seatIds.map((seatId) => {
      const [rowLabel, seatNo] = seatId.split("-");
      const row = rows.find((r) => r.label === rowLabel);
      const code = row?.seats[Number(seatNo) - 1];
      const tier = map.tiers.find((t) => t.id === row?.tierId);
      if (!row || !code || !tier) throw new HttpError("VALIDATION_ERROR", `Seat ${seatId} doesn't exist`);
      if (code === "x") throw new HttpError("SEAT_UNAVAILABLE", `Seat ${seatId} was just taken — pick another`);
      const section = row.section === "balcony" ? "Balcony" : "Stalls";
      return {
        holderName: holder,
        holderDetail: "Matchpass account · photo ID not needed",
        seatLabel: `${section} · Row ${row.label} · Seat ${seatNo}`,
        price: tier.price,
        priceLabel: formatMoney(tier.price),
        fields: [
          { key: "Seat", value: String(seatNo) },
          { key: "Row", value: row.label },
          { key: "Section", value: section },
          { key: "Door", value: row.section === "balcony" ? "3" : "1" },
        ],
      } satisfies TicketSpec;
    });
    return {
      lines: group(specs, (s) => map.tiers.find((t) => t.price === s.price)?.name ?? "Seat"),
      specs,
      seatKeys: req.seatIds,
      soldKey: event.id,
      seats: specs.map((s) => s.seatLabel),
    };
  }

  if (event.layout === "cinema") {
    if (!req.showtimeId) throw new HttpError("VALIDATION_ERROR", "Choose a showtime");
    const showtime = cinemaMap(store.now()).showtimes.find((s) => s.id === req.showtimeId);
    const soldKey = `${event.id}:${req.showtimeId}`;
    const seats = cinemaSeats(req.showtimeId, store.unavailable(soldKey, user.id));
    if (!showtime || !seats || !parseShowtimeId(req.showtimeId)) throw notFound("Showtime");
    const specs = req.seatIds.map((seatId) => {
      const [rowLabel, seatNo] = seatId.split("-");
      const row = seats.rows.find((r) => r.label === rowLabel);
      const code = row?.seats[Number(seatNo) - 1];
      if (!row || !code) throw new HttpError("VALIDATION_ERROR", `Seat ${seatId} doesn't exist`);
      if (code === "x") throw new HttpError("SEAT_UNAVAILABLE", `Seat ${seatId} was just taken — pick another`);
      const price = row.vip ? showtime.prices.vip : showtime.prices.standard;
      return {
        holderName: holder,
        holderDetail: "Matchpass account",
        seatLabel: `Row ${row.label} · Seat ${seatNo}`,
        price,
        priceLabel: formatMoney(price),
        fields: [
          { key: "Seat", value: String(seatNo).padStart(2, "0") },
          { key: "Row", value: row.label },
          { key: "Screen", value: "4" },
          { key: "Format", value: showtime.format },
        ],
      } satisfies TicketSpec;
    });
    return {
      lines: group(specs, (s) => (s.price === showtime.prices.vip ? `VIP recliner · ${showtime.format}` : `Standard · ${showtime.format}`)),
      specs,
      seatKeys: req.seatIds,
      soldKey,
      seats: specs.map((s) => s.seatLabel),
    };
  }

  throw new HttpError("VALIDATION_ERROR", "This event sells ticket types, not seats");
}

const ENTRANCES: Record<string, string> = { gc: "B", ga: "A", sa: "C", sb: "D", vip: "VIP" };

function draftTicketTypes(user: StoredUser, event: EventDetail, req: Extract<HoldRequest, { type: "ticket_types" }>): Draft {
  if (event.layout !== "arena") throw new HttpError("VALIDATION_ERROR", "This event needs seats or zones, not ticket types");
  const map = arenaMap(event);
  const count = req.items.reduce((sum, item) => sum + item.quantity, 0);
  if (count > event.maxPerOrder) throw new HttpError("LIMIT_EXCEEDED", `Max ${event.maxPerOrder} tickets per order.`);
  const holder = `${user.fullName.split(" ")[0]} ${user.fullName.split(" ")[1]?.[0] ?? ""}.`.replace(/ \.$/, "");
  const specs: TicketSpec[] = [];
  let position = 0;
  for (const item of req.items) {
    const type = map.ticketTypes.find((t) => t.id === item.ticketTypeId);
    if (!type) throw notFound(`Ticket type ${item.ticketTypeId}`);
    if (item.quantity > type.remaining) throw new HttpError("SEAT_UNAVAILABLE", `Only ${type.remaining} ${type.name} tickets left`);
    for (let i = 0; i < item.quantity; i += 1) {
      position += 1;
      const seated = type.id === "sa" || type.id === "sb";
      specs.push(
        gaSpec(
          holder,
          type.name.split(" ")[0] ?? type.name,
          seated ? "Seated" : "Standing",
          ENTRANCES[type.id] ?? "A",
          `${position} / ${count}`,
          type.price,
        ),
      );
    }
  }
  return {
    lines: req.items.map((item) => {
      const type = map.ticketTypes.find((t) => t.id === item.ticketTypeId)!;
      return {
        label: `${type.name} × ${item.quantity}`,
        quantity: item.quantity,
        unitPrice: type.price,
        amount: type.price * item.quantity,
      };
    }),
    specs,
    seatKeys: [],
    soldKey: event.id,
    seats: specs.map((s) => s.seatLabel),
  };
}

/** Buying a fan's ticket on official resale: the seller's ticket is re-issued to the buyer. */
function draftResale(store: Store, user: StoredUser, event: EventDetail, req: Extract<HoldRequest, { type: "resale" }>): Draft {
  const listing = store.listings.get(req.listingId);
  if (!listing || listing.eventId !== event.id || listing.status !== "listed")
    throw new HttpError("SEAT_UNAVAILABLE", "This resale ticket was just bought by someone else");
  if (listing.userId === user.id) throw new HttpError("CONFLICT", "This is your own listing");
  store.purgeExpiredHolds();
  if ([...store.holds.values()].some((h) => h.listingId === listing.id && h.userId !== user.id)) {
    throw new HttpError("SEAT_UNAVAILABLE", "Another fan is checking out with this ticket — try again in a few minutes");
  }
  const sellerTicket = store.tickets.get(listing.ticketId);
  if (!sellerTicket) throw notFound("Ticket");
  let holderName = cleanName(approvedFans(user)[0]?.name ?? user.fullName);
  let holderDetail = "Matchpass account";
  let fanNumber: string | undefined;
  if (event.kind === "match") {
    const self = user.fans.find((f) => f.isSelf && f.status === "approved");
    if (!self) throw new HttpError("FAN_ID_REQUIRED", "You need an approved Fan ID to buy match tickets");
    assertOneTicketPerFan(store, event, [self]);
    holderName = cleanName(self.name);
    holderDetail = `${self.fanIdMasked} · bring your ID card`;
    fanNumber = self.number;
  }
  const spec: TicketSpec = {
    holderName,
    holderDetail,
    seatLabel: sellerTicket.seatLabel,
    fields: sellerTicket.fields,
    price: listing.price,
    priceLabel: formatMoney(listing.price),
    fanNumber,
  };
  return {
    lines: [{ label: `Official resale · ${sellerTicket.seatLabel} × 1`, quantity: 1, unitPrice: listing.price, amount: listing.price }],
    specs: [spec],
    seatKeys: [],
    soldKey: event.id,
    seats: [sellerTicket.seatLabel],
    listingId: listing.id,
  };
}

function toPublicHold(hold: StoredHold): Hold {
  const { userId: _u, seatKeys: _k, soldKey: _sk, ticketSpecs: _s, createdAt: _c, listingId: _l, ...rest } = hold;
  return rest;
}

const maskWallet = (phone: string) => `•••• ${phone.slice(-3)}`;

function paymentPlan(store: Store, config: AppConfig, order: Pick<StoredOrder, "id">, payment: PaymentDetailsParsed, hold: StoredHold) {
  const now = store.now();
  switch (payment.method) {
    case "card": {
      const session = store.token();
      store.paymentSessions.set(session, order.id);
      return {
        payment: { method: "card" as const, redirectUrl: `/api/payments/${session}`, expiresAt: hold.expiresAt },
        paymentLabel: "Card payment",
      };
    }
    case "wallet":
      return {
        payment: {
          method: "wallet" as const,
          expiresAt: hold.expiresAt,
          instructions: `Approve the payment request we sent to your mobile wallet (${maskWallet(payment.walletPhone)}).`,
        },
        paymentLabel: `Paid by mobile wallet ${maskWallet(payment.walletPhone)}`,
        approveAt: addSeconds(now, config.paymentApprovalSeconds).getTime(),
      };
    case "instapay":
      return {
        payment: {
          method: "instapay" as const,
          expiresAt: hold.expiresAt,
          instructions: "Open your InstaPay app and approve the request from Matchpass.",
        },
        paymentLabel: "Paid with InstaPay",
        approveAt: addSeconds(now, config.paymentApprovalSeconds).getTime(),
      };
    case "fawry": {
      const expiresAt = addHours(now, FAWRY_HOURS).toISOString();
      // The seats stay reserved for as long as the Fawry bill can be paid.
      hold.expiresAt = expiresAt;
      return {
        payment: {
          method: "fawry" as const,
          reference: String(700_000_000 + Math.floor(Math.random() * 99_999_999)),
          expiresAt,
          instructions: `Pay at any Fawry outlet or in the myFawry app before ${dayLabel(expiresAt)} at ${timeLabel(expiresAt)}. Your tickets appear as soon as you pay.`,
        },
        paymentLabel: "Paid at Fawry",
      };
    }
  }
}

export function checkoutRouter(store: Store, config: AppConfig) {
  const router = Router();
  router.use(["/holds", "/orders"], requireAuth(store));

  const ownedHold = (id: string, userId: string) => {
    store.purgeExpiredHolds();
    const hold = store.holds.get(id);
    if (!hold || hold.userId !== userId)
      throw new HttpError("HOLD_EXPIRED", "Your hold ran out and the tickets went back on sale. Choose again.");
    return hold;
  };

  router.post("/holds", (req, res) => {
    const user = store.refreshUser(currentUser(res));
    const body = parseBody(holdRequestSchema, req);
    const event = store.eventById(body.eventId);
    if (!event) throw notFound("Event");
    if (event.status === "cancelled" || event.status === "postponed") {
      throw new HttpError("CONFLICT", `This event has been ${event.status} — tickets aren't on sale`);
    }
    const resale = body.type === "resale";
    if (!resale && (event.status === "coming_soon" || event.status === "sold_out")) {
      throw new HttpError("CONFLICT", "Tickets for this event aren't available — check official resale");
    }
    if (event.requiresFanId && user.fanId.status !== "approved") {
      throw new HttpError("FAN_ID_REQUIRED", "You need an approved Fan ID to buy match tickets");
    }
    // Release this fan's previous unpaid holds for the same event before drafting.
    for (const [id, h] of store.holds) {
      const awaiting = [...store.orders.values()].some((o) => o.holdId === id && o.status === "pending_payment");
      if (h.userId === user.id && h.eventId === event.id && !awaiting) store.holds.delete(id);
    }
    const draft =
      body.type === "zone"
        ? draftZone(store, user, event, body)
        : body.type === "seats"
          ? draftSeats(store, user, event, body)
          : body.type === "resale"
            ? draftResale(store, user, event, body)
            : draftTicketTypes(user, event, body);

    const subtotal = draft.lines.reduce((sum, line) => sum + line.amount, 0);
    const ticketCount = draft.specs.length;
    const fees = event.serviceFee * ticketCount;
    const isMatch = event.kind === "match";
    const hold: StoredHold = {
      id: store.id("hold"),
      userId: user.id,
      createdAt: store.now().toISOString(),
      eventId: event.id,
      eventSlug: event.slug,
      eventTitle: event.title,
      eventTag: event.tag.toUpperCase(),
      eventMeta: `${dayLabel(event.startsAt)} · ${isMatch ? timeLabel(event.startsAt) : `Doors ${event.doorsAt ?? timeLabel(event.startsAt)}`} · ${event.venue.name}`,
      eventKind: event.kind,
      theme: event.theme,
      expiresAt: addMinutes(store.now(), config.holdMinutes).toISOString(),
      lines: [...draft.lines, { label: `Service fee × ${ticketCount}`, quantity: ticketCount, unitPrice: event.serviceFee, amount: fees }],
      seats: draft.seats,
      ticketCount,
      subtotal,
      fees,
      discount: 0,
      total: subtotal + fees,
      holdersTitle: isMatch ? "Ticket holders" : "Tickets go to",
      holders: isMatch
        ? draft.specs.map((s) => ({
            initials: s.holderName
              .split(" ")
              .map((p) => p[0])
              .join("")
              .slice(0, 2),
            name: s.holderName,
            detail: s.holderDetail.split(" · ")[0] ?? "",
          }))
        : [
            {
              initials: user.initials,
              name: cleanName(draft.specs[0]?.holderName ?? user.fullName),
              detail: `App${user.email ? ` + email ${user.email[0]}••••@${user.email.split("@")[1]}` : ""}`,
            },
          ],
      holdersNote: isMatch
        ? "Tickets are tied to these Fan IDs. Each holder brings their own ID card to the gate."
        : "You can send one ticket to a friend from My tickets after paying.",
      backHref: resale ? `/events/${event.slug}/resale` : `/events/${event.slug}/tickets`,
      seatKeys: draft.seatKeys,
      soldKey: draft.soldKey,
      ticketSpecs: draft.specs,
      ...(draft.listingId ? { listingId: draft.listingId } : {}),
    };
    store.holds.set(hold.id, hold);
    res.status(201).json(toPublicHold(hold));
  });

  router.get("/holds/:id", (req, res) => {
    res.json(toPublicHold(ownedHold(param(req, "id"), currentUser(res).id)));
  });

  router.delete("/holds/:id", (req, res) => {
    const hold = ownedHold(param(req, "id"), currentUser(res).id);
    store.holds.delete(hold.id);
    res.status(204).end();
  });

  router.post("/holds/:id/promo", (req, res) => {
    const user = currentUser(res);
    const hold = ownedHold(param(req, "id"), user.id);
    const { code } = parseBody(promoRequestSchema, req);
    const promo = PROMO_CODES[code];
    if (!promo) throw new HttpError("INVALID_CODE", "That promo code isn't valid");
    if (hold.listingId) throw new HttpError("INVALID_CODE", "Promo codes can't be used on resale tickets");
    if (promo.oncePerUser && user.usedPromos.includes(code)) throw new HttpError("INVALID_CODE", `You've already used ${code}`);
    const discount = promo.apply(hold.subtotal);
    hold.discount = discount;
    hold.promoCode = code;
    hold.lines = [
      ...hold.lines.filter((l) => !l.label.startsWith("Promo")),
      { label: `Promo ${promo.label}`, quantity: 1, unitPrice: -discount, amount: -discount },
    ];
    hold.total = hold.subtotal + hold.fees - discount;
    res.json(toPublicHold(hold));
  });

  router.post("/orders", (req, res) => {
    const user = currentUser(res);
    const body = parseBody(createOrderRequestSchema, req);
    const hold = ownedHold(body.holdId, user.id);
    const event = store.eventById(hold.eventId)!;
    // A new attempt replaces an earlier unpaid one for the same hold (e.g. switching from card to Fawry).
    for (const o of store.orders.values()) {
      if (o.holdId === hold.id && o.status === "pending_payment") store.failPayment(o, "Replaced by a new payment attempt");
    }
    const sold = store.soldFor(hold.soldKey);
    if (hold.seatKeys.some((key) => sold.has(key)))
      throw new HttpError("SEAT_UNAVAILABLE", "Some of your seats were just taken. Choose again.");

    const orderId = store.id("ord");
    const plan = paymentPlan(store, config, { id: orderId }, body.payment, hold);
    const isMatch = event.kind === "match";
    const gate = hold.ticketSpecs[0]?.fields.find((f) => f.key === "Gate")?.value;
    const order: StoredOrder = {
      id: orderId,
      userId: user.id,
      holdId: hold.id,
      fulfilled: false,
      ...(plan.approveAt !== undefined ? { approveAt: plan.approveAt } : {}),
      reference: store.nextOrderReference(),
      status: "pending_payment",
      payment: plan.payment,
      eventSlug: event.slug,
      eventTitle: event.title,
      eventTag: hold.eventTag,
      eventMeta: hold.eventMeta,
      eventKind: event.kind,
      theme: event.theme,
      entryNote: isMatch
        ? `Gates open ${event.gatesOpenAt ?? ""}${gate ? ` · Use Gate ${gate}` : ""}`
        : `Doors open ${event.doorsAt ?? timeLabel(event.startsAt)}`,
      total: hold.total,
      paymentLabel: plan.paymentLabel,
      createdAt: store.now().toISOString(),
      tickets: [],
      nextSteps: isMatch
        ? [
            { title: "QR appears 24 hours before kick-off", body: "In My tickets. It refreshes every 30 seconds." },
            { title: "Bring your ID card", body: "Gate staff match your face and name with your Fan ID." },
            { title: "Can't make it?", body: "Transfer to a linked fan or sell at face value on official resale." },
          ]
        : [
            {
              title: event.kind === "cinema" ? "Your QR is ready now" : "QR appears 24 hours before doors",
              body: "Find it in My tickets.",
            },
            { title: "No ID needed", body: "Your Matchpass account is enough at the entrance." },
            { title: "Can't make it?", body: "Send a ticket to a friend or resell it officially." },
          ],
      ...(isMatch
        ? {
            parkingOffer: {
              title: "Add parking for this match",
              detail: `P2 West, 5 minutes from Gate ${gate ?? "7"} · ${formatMoney(50)}`,
              price: 50,
            },
          }
        : {}),
    };
    store.orders.set(order.id, order);
    res.status(201).json(store.publicOrder(order));
  });

  router.get("/orders/:id", (req, res) => {
    const order = store.orders.get(param(req, "id"));
    if (!order || order.userId !== currentUser(res).id) throw notFound("Order");
    res.json(store.publicOrder(order));
  });

  /* ---------- Mock payment provider: hosted card page (outside Matchpass's PCI scope) ---------- */

  const paymentSession = (id: string) => {
    const orderId = store.paymentSessions.get(id);
    const order = orderId ? store.orders.get(orderId) : undefined;
    if (!order) throw notFound("Payment session");
    return store.refreshOrder(order);
  };

  router.get("/payments/:session", (req, res) => {
    const order = paymentSession(param(req, "session"));
    if (order.status !== "pending_payment") {
      res.redirect(303, order.status === "paid" ? `/orders/${order.id}` : `/checkout/${order.holdId}?payment=expired`);
      return;
    }
    res.type("html").send(hostedPaymentPage({ action: `/api/payments/${param(req, "session")}`, order }));
  });

  router.post("/payments/:session", express.urlencoded({ extended: false, limit: "10kb" }), (req, res) => {
    const session = param(req, "session");
    const order = paymentSession(session);
    if (order.status !== "pending_payment") {
      res.redirect(303, order.status === "paid" ? `/orders/${order.id}` : `/checkout/${order.holdId}?payment=expired`);
      return;
    }
    if (req.body?.intent === "cancel") {
      store.failPayment(order, "Payment cancelled");
      store.paymentSessions.delete(session);
      res.redirect(303, `/checkout/${order.holdId}?payment=cancelled`);
      return;
    }
    const parsed = hostedCardFormSchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      const errors = Object.fromEntries(parsed.error.issues.map((i) => [String(i.path[0]), i.message]));
      res
        .status(400)
        .type("html")
        .send(
          hostedPaymentPage({
            action: `/api/payments/${session}`,
            order,
            errors,
            values: { nameOnCard: String(req.body?.nameOnCard ?? "") },
          }),
        );
      return;
    }
    store.paymentSessions.delete(session);
    if (parsed.data.cardNumber === DECLINED_CARD) {
      store.failPayment(order, "Your bank declined the payment. Try another card or payment method.");
      res.redirect(303, `/checkout/${order.holdId}?payment=declined`);
      return;
    }
    order.paymentLabel = `Paid by card •••• ${parsed.data.cardNumber.slice(-4)}`;
    const settled = store.completePayment(order);
    res.redirect(303, settled.status === "paid" ? `/orders/${order.id}` : `/checkout/${order.holdId}?payment=expired`);
  });

  return router;
}

/** Test-only hooks that stand in for payment provider callbacks. */
export function paymentTestRoutes(store: Store) {
  const router = Router();
  router.post("/__test__/fawry/:reference/pay", (req, res) => {
    const order = [...store.orders.values()].find((o) => o.payment.reference === param(req, "reference"));
    if (!order) throw notFound("Fawry bill");
    store.refreshOrder(order);
    if (order.status !== "pending_payment") throw new HttpError("CONFLICT", `This bill is ${order.status.replace("_", " ")}`);
    store.completePayment(order);
    res.json(store.publicOrder(order));
  });
  router.post("/__test__/orders/:id/expire", (req, res) => {
    const order = store.orders.get(param(req, "id"));
    if (!order) throw notFound("Order");
    order.payment.expiresAt = dayjs(store.now()).subtract(1, "second").toISOString();
    order.approveAt = undefined;
    res.json(store.publicOrder(order));
  });
  return router;
}
