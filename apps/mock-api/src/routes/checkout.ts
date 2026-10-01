import {
  createOrderRequestSchema,
  formatMoney,
  holdRequestSchema,
  promoRequestSchema,
  type EventDetail,
  type Hold,
  type HoldRequest,
  type LineItem,
  type Order,
} from "@repo/contracts";
import { Router } from "express";
import type { AppConfig } from "../config";
import { arenaMap, cinemaMap, cinemaSeats, hallMap, parseShowtimeId, stadiumMap, stadiumZones } from "../data/seating";
import { gaSpec, matchSpec, type Store, type StoredHold, type StoredUser, type TicketSpec } from "../data/store";
import { addMinutes, dayLabel, timeLabel } from "../data/time";
import { currentUser, requireAuth } from "../http/auth";
import { HttpError, notFound } from "../http/errors";
import { param, parseBody } from "../http/validate";

export const PROMO_CODES: Record<string, { label: string; apply: (subtotal: number) => number }> = {
  MATCHPASS10: { label: "MATCHPASS10 · 10% off tickets", apply: (subtotal) => Math.round(subtotal * 0.1) },
  WELCOME50: { label: "WELCOME50 · 50 EGP off", apply: (subtotal) => Math.min(50, subtotal) },
};

export const DECLINED_CARD = "4000000000000002";

const cleanName = (name: string) => name.replace(" (you)", "");

type Draft = { lines: LineItem[]; specs: TicketSpec[]; seatKeys: string[]; soldKey: string; seats: string[] };

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

function draftZone(store: Store, user: StoredUser, event: EventDetail, req: Extract<HoldRequest, { type: "zone" }>): Draft {
  const zone = stadiumZones(event).find((z) => z.id === req.zoneId);
  if (!zone) throw notFound("Zone");
  if (zone.restricted) throw new HttpError("FORBIDDEN", zone.restrictedLabel ?? "This zone isn't for sale to you");
  const fans = req.fanIds.map((id) => user.fans.find((f) => f.id === id));
  if (fans.some((f) => !f)) throw new HttpError("VALIDATION_ERROR", "One of the selected fans isn't linked to your account");
  if (fans.some((f) => f!.status !== "approved")) throw new HttpError("FAN_ID_REQUIRED", "Every ticket holder needs an approved Fan ID");
  if (fans.length > event.maxPerOrder) throw new HttpError("LIMIT_EXCEEDED", `Up to ${event.maxPerOrder} tickets per order`);

  const sold = store.soldFor(event.id);
  const seatKeys: string[] = [];
  const specs: TicketSpec[] = [];
  if (zone.id === "vip") {
    fans.forEach((fan, i) => {
      const seat = sold.size + i + 1;
      specs.push(matchSpec(cleanName(fan!.name), `${fan!.fanIdMasked} · bring your ID card`, "VIP", "Box 2", seat, zone.price));
      seatKeys.push(`VIP-B-${seat}`);
    });
  } else {
    const map = stadiumMap(event, sold);
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
      specs.push(matchSpec(cleanName(fan!.name), `${fan!.fanIdMasked} · bring your ID card`, found!.block, found!.row, seat, zone.price));
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
    const fans = approvedFans(user);
    if (req.seatIds.length > fans.length) {
      throw new HttpError("LIMIT_EXCEEDED", "You can pick one seat for each approved Fan ID on your account");
    }
    const map = stadiumMap(event, store.soldFor(event.id));
    const specs = req.seatIds.map((seatId, i) => {
      const [blockId, rowLabel, seatNo] = seatId.split("-");
      const block = map.blocks.find((b) => b.id === blockId);
      const row = block?.rows.find((r) => r.label === rowLabel);
      const code = row?.seats[Number(seatNo) - 1];
      if (!block || !row || !code) throw new HttpError("VALIDATION_ERROR", `Seat ${seatId} doesn't exist`);
      if (block.away) throw new HttpError("FORBIDDEN", "Away blocks are for away Fan IDs only");
      if (code === "x") throw new HttpError("SEAT_UNAVAILABLE", `Seat ${seatId} was just taken — pick another`);
      const fan = fans[i]!;
      return matchSpec(cleanName(fan.name), `${fan.fanIdMasked} · bring your ID card`, block.id, row.label, Number(seatNo), block.price);
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
    const map = hallMap(event, store.soldFor(event.id));
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
        priceLabel: `[Price · ${tier.price} EGP]`,
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
    const seats = cinemaSeats(req.showtimeId, store.soldFor(`${event.id}:${req.showtimeId}`));
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
        priceLabel: `[Price · ${price} EGP]`,
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
      soldKey: `${event.id}:${req.showtimeId}`,
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

function toPublicHold(hold: StoredHold): Hold {
  const { userId: _u, seatKeys: _k, soldKey: _sk, ticketSpecs: _s, createdAt: _c, ...rest } = hold;
  return rest;
}

function backHref(event: EventDetail) {
  return `/events/${event.slug}/tickets`;
}

export function checkoutRouter(store: Store, config: AppConfig) {
  const router = Router();
  router.use(["/holds", "/orders"], requireAuth(store));

  const ownedHold = (id: string, userId: string) => {
    const hold = store.holds.get(id);
    if (!hold || hold.userId !== userId) throw notFound("Hold");
    if (new Date(hold.expiresAt) <= store.now()) {
      store.holds.delete(id);
      throw new HttpError("HOLD_EXPIRED", "Your hold ran out and the tickets went back on sale. Choose again.");
    }
    return hold;
  };

  router.post("/holds", (req, res) => {
    const user = currentUser(res);
    const body = parseBody(holdRequestSchema, req);
    const event = store.eventById(body.eventId);
    if (!event) throw notFound("Event");
    if (event.status === "coming_soon" || event.status === "sold_out") {
      throw new HttpError("CONFLICT", "Tickets for this event aren't available — check official resale");
    }
    if (event.requiresFanId && user.fanId.status !== "approved") {
      throw new HttpError("FAN_ID_REQUIRED", "You need an approved Fan ID to buy match tickets");
    }
    const draft =
      body.type === "zone"
        ? draftZone(store, user, event, body)
        : body.type === "seats"
          ? draftSeats(store, user, event, body)
          : draftTicketTypes(user, event, body);

    const subtotal = draft.lines.reduce((sum, line) => sum + line.amount, 0);
    const ticketCount = draft.specs.length;
    const fees = event.serviceFee * ticketCount;
    const isMatch = event.kind === "match";
    // Release this user's previous holds for the same event.
    for (const [id, h] of store.holds) if (h.userId === user.id && h.eventId === event.id) store.holds.delete(id);
    const hold: StoredHold = {
      id: store.id("hold"),
      userId: user.id,
      createdAt: store.now().toISOString(),
      eventId: event.id,
      eventSlug: event.slug,
      eventTitle: event.title,
      eventTag: event.tag.toUpperCase(),
      eventMeta: `${dayLabel(event.startsAt)} · ${event.kind === "match" ? timeLabel(event.startsAt) : `Doors ${event.doorsAt ?? timeLabel(event.startsAt)}`} · ${event.venue.name}`,
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
      backHref: backHref(event),
      seatKeys: draft.seatKeys,
      soldKey: draft.soldKey,
      ticketSpecs: draft.specs,
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
    const hold = ownedHold(param(req, "id"), currentUser(res).id);
    const { code } = parseBody(promoRequestSchema, req);
    const promo = PROMO_CODES[code];
    if (!promo) throw new HttpError("INVALID_CODE", "That promo code isn't valid");
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
    const payment = body.payment;
    if (payment.method === "card" && payment.cardNumber === DECLINED_CARD) {
      throw new HttpError("PAYMENT_DECLINED", "Your bank declined the payment. Try another card or payment method.");
    }
    const sold = store.soldFor(hold.soldKey);
    if (hold.seatKeys.some((key) => sold.has(key)))
      throw new HttpError("SEAT_UNAVAILABLE", "Some of your seats were just taken. Choose again.");

    const orderId = store.id("ord");
    const awaiting = payment.method === "fawry";
    const tickets = awaiting
      ? []
      : hold.ticketSpecs.map((spec, i) => store.issueTicket(user.id, orderId, event, spec, i + 1, hold.ticketSpecs.length));
    hold.seatKeys.forEach((key) => sold.add(key));
    const last4 = payment.method === "card" ? payment.cardNumber.slice(-4) : "";
    const isMatch = event.kind === "match";
    const gate = tickets[0]?.fields.find((f) => f.key === "Gate")?.value;
    const order: Order & { userId: string } = {
      id: orderId,
      userId: user.id,
      reference: store.nextOrderReference(),
      status: awaiting ? "awaiting_payment" : "paid",
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
      paymentLabel:
        payment.method === "card"
          ? `Paid by card •••• ${last4}`
          : payment.method === "wallet"
            ? `Paid by mobile wallet •••• ${payment.walletPhone.slice(-3)}`
            : payment.method === "instapay"
              ? "Paid with InstaPay"
              : "Pay at any Fawry outlet",
      ...(awaiting ? { fawryReference: String(700_000_000 + Math.floor(Math.random() * 99_999_999)) } : {}),
      createdAt: store.now().toISOString(),
      tickets: tickets.map(({ userId: _u, ...t }) => t),
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
    store.holds.delete(hold.id);
    const { userId: _u, ...publicOrder } = order;
    res.status(201).json(publicOrder);
  });

  router.get("/orders/:id", (req, res) => {
    const order = store.orders.get(param(req, "id"));
    if (!order || order.userId !== currentUser(res).id) throw notFound("Order");
    const { userId: _u, ...publicOrder } = order;
    res.json({
      ...publicOrder,
      tickets: publicOrder.tickets.map((t) => ({ ...t, ...(store.tickets.get(t.id) ? { status: store.tickets.get(t.id)!.status } : {}) })),
    });
  });

  return router;
}
