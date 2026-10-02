import { holdSchema, orderSchema } from "@repo/contracts";
import { describe, expect, it } from "vitest";
import { EVENT_IDS } from "../src/data/catalog";
import { SECOND_USER } from "../src/data/store";
import { DECLINED_CARD } from "../src/routes/checkout";
import { setup } from "./helpers";

const CARD_FORM = { cardNumber: "4242 4242 4242 4242", expiry: "12 / 49", cvc: "123", nameOnCard: "Omar Khaled" };
const CARD = { method: "card" };

describe("holds", () => {
  it("holds a stadium zone for selected Fan IDs and prices it", async () => {
    const { api, login, auth } = setup();
    const token = await login();
    const res = await api
      .post("/api/holds")
      .set(auth(token))
      .send({ type: "zone", eventId: EVENT_IDS.canalCup, zoneId: "cat1", fanIds: ["fan_omar", "fan_mariam"] })
      .expect(201);
    const hold = holdSchema.parse(res.body);
    expect(hold.subtotal).toBe(330);
    expect(hold.fees).toBe(30);
    expect(hold.total).toBe(360);
    expect(hold.lines.map((l) => l.label)).toEqual(["Category 1 · West stand × 2", "Service fee × 2"]);
    expect(hold.holders.map((h) => h.name)).toEqual(["Omar K.", "Mariam K."]);
    expect(hold.seats).toHaveLength(2);
    expect(new Date(hold.expiresAt).getTime() - new Date("2026-10-01T10:00:00+03:00").getTime()).toBe(10 * 60_000);
    expect(res.body).not.toHaveProperty("ticketSpecs");
  });

  it("allows one ticket per Fan ID for a match", async () => {
    const { api, login, auth } = setup();
    const token = await login();
    // Omar and Youssef already hold derby tickets.
    const res = await api
      .post("/api/holds")
      .set(auth(token))
      .send({ type: "zone", eventId: EVENT_IDS.derby, zoneId: "cat1", fanIds: ["fan_youssef", "fan_mariam"] })
      .expect(422);
    expect(res.body.error.message).toBe("Youssef A. already has a ticket for this match — one ticket per Fan ID");
    await api
      .post("/api/holds")
      .set(auth(token))
      .send({ type: "zone", eventId: EVENT_IDS.derby, zoneId: "cat1", fanIds: ["fan_mariam"] })
      .expect(201);
  });

  it("refuses restricted zones, fans under review and strangers", async () => {
    const { api, login, auth } = setup();
    const token = await login();
    const away = await api
      .post("/api/holds")
      .set(auth(token))
      .send({ type: "zone", eventId: EVENT_IDS.derby, zoneId: "away", fanIds: ["fan_mariam"] })
      .expect(403);
    expect(away.body.error.message).toMatch(/Fan IDs only/);
    const review = await api
      .post("/api/holds")
      .set(auth(token))
      .send({ type: "zone", eventId: EVENT_IDS.derby, zoneId: "cat2", fanIds: ["fan_hassan"] })
      .expect(403);
    expect(review.body.error.code).toBe("FAN_ID_REQUIRED");
    await api
      .post("/api/holds")
      .set(auth(token))
      .send({ type: "zone", eventId: EVENT_IDS.derby, zoneId: "cat2", fanIds: ["fan_stranger"] })
      .expect(400);
    await api
      .post("/api/holds")
      .set(auth(token))
      .send({ type: "zone", eventId: EVENT_IDS.derby, zoneId: "nope", fanIds: ["fan_mariam"] })
      .expect(404);
  });

  it("holds exact stadium seats and blocks them for other fans until released", async () => {
    const { api, login, auth } = setup();
    const omar = await login();
    const youssef = await login(SECOND_USER.phone, SECOND_USER.password);
    const map = await api.get("/api/events/canal-united-vs-sinai-stars/seatmap");
    const block = map.body.blocks.find((b: { id: string }) => b.id === "E1");
    const row = block.rows.find((r: { seats: string }) => r.seats.includes("aa"));
    const col = row.seats.indexOf("aa") + 1;
    const seatIds = [`E1-${row.label}-${col}`, `E1-${row.label}-${col + 1}`];
    const res = await api.post("/api/holds").set(auth(omar)).send({ type: "seats", eventId: EVENT_IDS.canalCup, seatIds }).expect(201);
    expect(res.body.total).toBe(2 * 100 + 2 * 15);

    // Omar still sees his own held seats as available; Youssef sees them taken and can't hold them.
    const seatState = async (token?: string) => {
      const view = await api.get("/api/events/canal-united-vs-sinai-stars/seatmap").set(token ? auth(token) : {});
      const r = view.body.blocks.find((b: { id: string }) => b.id === "E1").rows.find((x: { label: string }) => x.label === row.label);
      return r.seats[col - 1];
    };
    expect(await seatState(omar)).toBe("a");
    expect(await seatState(youssef)).toBe("x");
    expect(await seatState()).toBe("x");
    const taken = await api
      .post("/api/holds")
      .set(auth(youssef))
      .send({ type: "seats", eventId: EVENT_IDS.canalCup, seatIds: [seatIds[0]] })
      .expect(409);
    expect(taken.body.error.code).toBe("SEAT_UNAVAILABLE");

    await api.delete(`/api/holds/${res.body.id}`).set(auth(omar)).expect(204);
    await api
      .post("/api/holds")
      .set(auth(youssef))
      .send({ type: "seats", eventId: EVENT_IDS.canalCup, seatIds: [seatIds[0]] })
      .expect(201);

    await api
      .post("/api/holds")
      .set(auth(omar))
      .send({ type: "seats", eventId: EVENT_IDS.derby, seatIds: ["S1-A-1"] })
      .expect(403);
    await api
      .post("/api/holds")
      .set(auth(omar))
      .send({ type: "seats", eventId: EVENT_IDS.derby, seatIds: ["E1-A-1", "E1-A-1"] })
      .expect(400);
  });

  it("frees held seats once the hold expires", async () => {
    const { api, login, auth, advance } = setup();
    const omar = await login();
    const youssef = await login(SECOND_USER.phone, SECOND_USER.password);
    await api
      .post("/api/holds")
      .set(auth(omar))
      .send({ type: "seats", eventId: EVENT_IDS.canalCup, seatIds: ["E1-F-3"] })
      .expect(201);
    await api
      .post("/api/holds")
      .set(auth(youssef))
      .send({ type: "seats", eventId: EVENT_IDS.canalCup, seatIds: ["E1-F-3"] })
      .expect(409);
    advance(10 * 60_000);
    await api
      .post("/api/holds")
      .set(auth(youssef))
      .send({ type: "seats", eventId: EVENT_IDS.canalCup, seatIds: ["E1-F-3"] })
      .expect(201);
  });

  it("limits stadium seats to approved Fan IDs without a ticket", async () => {
    const { api, login, auth } = setup();
    const token = await login();
    const res = await api
      .post("/api/holds")
      .set(auth(token))
      .send({ type: "seats", eventId: EVENT_IDS.derby, seatIds: ["E1-A-1", "E1-A-2"] })
      .expect(422);
    expect(res.body.error.message).toMatch(/one seat for each approved Fan ID/);
  });

  it("holds concert ticket types up to the order limit", async () => {
    const { api, login, auth } = setup();
    const token = await login();
    const res = await api
      .post("/api/holds")
      .set(auth(token))
      .send({ type: "ticket_types", eventId: EVENT_IDS.layla, items: [{ ticketTypeId: "gc", quantity: 2 }] })
      .expect(201);
    expect(res.body).toMatchObject({ subtotal: 1800, fees: 50, total: 1850, holdersTitle: "Tickets go to" });
    const over = await api
      .post("/api/holds")
      .set(auth(token))
      .send({
        type: "ticket_types",
        eventId: EVENT_IDS.layla,
        items: [
          { ticketTypeId: "ga", quantity: 6 },
          { ticketTypeId: "sb", quantity: 3 },
        ],
      })
      .expect(422);
    expect(over.body.error.message).toBe("Max 8 tickets per order.");
    await api
      .post("/api/holds")
      .set(auth(token))
      .send({ type: "ticket_types", eventId: EVENT_IDS.layla, items: [{ ticketTypeId: "vip", quantity: 7 }] })
      .expect(409);
  });

  it("holds concert hall and cinema seats", async () => {
    const { api, login, auth } = setup();
    const token = await login();
    const hall = await api.get("/api/events/nile-philharmonic-film-classics/seatmap");
    const balcony = hall.body.sections[1].rows[0];
    const n = balcony.seats.indexOf("a") + 1;
    const res = await api
      .post("/api/holds")
      .set(auth(token))
      .send({ type: "seats", eventId: EVENT_IDS.philharmonic, seatIds: [`${balcony.label}-${n}`] })
      .expect(201);
    expect(res.body.total).toBe(150 + 25);

    const map = await api.get("/api/events/the-last-lighthouse/seatmap");
    const showtime = map.body.showtimes[2];
    const seats = await api.get(`/api/events/the-last-lighthouse/showtimes/${showtime.id}/seats`);
    const vipRow = seats.body.rows[9];
    const vipSeat = `${vipRow.label}-${vipRow.seats.indexOf("a") + 1}`;
    await api
      .post("/api/holds")
      .set(auth(token))
      .send({ type: "seats", eventId: EVENT_IDS.film, seatIds: [vipSeat] })
      .expect(400);
    const cinema = await api
      .post("/api/holds")
      .set(auth(token))
      .send({ type: "seats", eventId: EVENT_IDS.film, showtimeId: showtime.id, seatIds: [vipSeat] })
      .expect(201);
    expect(cinema.body.total).toBe(380 + 10);
  });

  it("requires a Fan ID for matches but not for concerts", async () => {
    const { api, signUpNewUser, auth } = setup();
    const token = await signUpNewUser();
    const match = await api
      .post("/api/holds")
      .set(auth(token))
      .send({ type: "zone", eventId: EVENT_IDS.canalCup, zoneId: "cat1", fanIds: ["x"] })
      .expect(403);
    expect(match.body.error.code).toBe("FAN_ID_REQUIRED");
    await api
      .post("/api/holds")
      .set(auth(token))
      .send({ type: "ticket_types", eventId: EVENT_IDS.felucca, items: [{ ticketTypeId: "ga", quantity: 1 }] })
      .expect(201);
  });

  it("refuses events that are not on sale", async () => {
    const { api, login, auth } = setup();
    const token = await login();
    await api
      .post("/api/holds")
      .set(auth(token))
      .send({ type: "zone", eventId: EVENT_IDS.soldOut, zoneId: "cat1", fanIds: ["fan_omar"] })
      .expect(409);
    await api
      .post("/api/holds")
      .set(auth(token))
      .send({ type: "ticket_types", eventId: EVENT_IDS.desert, items: [{ ticketTypeId: "ga", quantity: 1 }] })
      .expect(409);
  });

  it("replaces the previous hold for the same event and can be released", async () => {
    const { api, login, auth, store } = setup();
    const token = await login();
    const body = { type: "ticket_types", eventId: EVENT_IDS.layla, items: [{ ticketTypeId: "ga", quantity: 1 }] };
    await api.post("/api/holds").set(auth(token)).send(body);
    const second = await api.post("/api/holds").set(auth(token)).send(body);
    expect(store.holds.size).toBe(1);
    await api.get(`/api/holds/${second.body.id}`).set(auth(token)).expect(200);
    await api.delete(`/api/holds/${second.body.id}`).set(auth(token)).expect(204);
    const gone = await api.get(`/api/holds/${second.body.id}`).set(auth(token)).expect(410);
    expect(gone.body.error.code).toBe("HOLD_EXPIRED");
  });
});

describe("promo codes", () => {
  it("applies valid codes and rejects invalid ones", async () => {
    const { api, login, auth } = setup();
    const token = await login();
    const hold = await api
      .post("/api/holds")
      .set(auth(token))
      .send({ type: "ticket_types", eventId: EVENT_IDS.layla, items: [{ ticketTypeId: "gc", quantity: 2 }] });
    const promo = await api.post(`/api/holds/${hold.body.id}/promo`).set(auth(token)).send({ code: "matchpass10" }).expect(200);
    expect(holdSchema.parse(promo.body).lines.at(-1)).toMatchObject({ amount: -180 });
    expect(promo.body).toMatchObject({ discount: 180, total: 1670, promoCode: "MATCHPASS10" });
    const again = await api.post(`/api/holds/${hold.body.id}/promo`).set(auth(token)).send({ code: "WELCOME50" }).expect(200);
    expect(again.body.total).toBe(1800);
    expect(again.body.lines.filter((l: { label: string }) => l.label.startsWith("Promo"))).toHaveLength(1);
    const bad = await api.post(`/api/holds/${hold.body.id}/promo`).set(auth(token)).send({ code: "FREEBIES" }).expect(400);
    expect(bad.body.error.code).toBe("INVALID_CODE");
  });

  it("lets each fan use WELCOME50 once", async () => {
    const { api, login, auth, store } = setup();
    const token = await login();
    const body = { type: "ticket_types", eventId: EVENT_IDS.layla, items: [{ ticketTypeId: "ga", quantity: 1 }] };
    const first = await api.post("/api/holds").set(auth(token)).send(body);
    await api.post(`/api/holds/${first.body.id}/promo`).set(auth(token)).send({ code: "WELCOME50" }).expect(200);
    const order = await api
      .post("/api/orders")
      .set(auth(token))
      .send({ holdId: first.body.id, payment: { method: "instapay" }, acceptTerms: true });
    store.completePayment(store.orders.get(order.body.id)!);
    const second = await api.post("/api/holds").set(auth(token)).send(body);
    const reused = await api.post(`/api/holds/${second.body.id}/promo`).set(auth(token)).send({ code: "WELCOME50" }).expect(400);
    expect(reused.body.error.message).toBe("You've already used WELCOME50");
    await api.post(`/api/holds/${second.body.id}/promo`).set(auth(token)).send({ code: "MATCHPASS10" }).expect(200);
  });
});

describe("orders and payments", () => {
  async function holdDerby() {
    const ctx = setup();
    const token = await ctx.login();
    const hold = await ctx.api
      .post("/api/holds")
      .set(ctx.auth(token))
      .send({ type: "zone", eventId: EVENT_IDS.derby, zoneId: "cat1", fanIds: ["fan_mariam"] });
    return { ...ctx, token, hold: hold.body };
  }

  it("offers test-card autofill on the hosted page outside production", async () => {
    const { api, auth, token, hold } = await holdDerby();
    const res = await api.post("/api/orders").set(auth(token)).send({ holdId: hold.id, payment: CARD, acceptTerms: true }).expect(201);
    const url = res.body.payment.redirectUrl as string;
    expect((await api.get(url).expect(200)).text).toContain('href="?autofill=success"');
    const filled = await api.get(`${url}?autofill=success`).expect(200);
    expect(filled.text).toContain('value="4242 4242 4242 4242"');
    expect(filled.text).toContain('value="123"');
    expect((await api.get(`${url}?autofill=bogus`).expect(200)).text).not.toContain('value="4242');
  });

  it("sends card payments to the provider's hosted page, then issues tickets", async () => {
    const { api, auth, token, hold } = await holdDerby();
    const res = await api.post("/api/orders").set(auth(token)).send({ holdId: hold.id, payment: CARD, acceptTerms: true }).expect(201);
    const order = orderSchema.parse(res.body);
    expect(order).toMatchObject({ status: "pending_payment", total: 265, tickets: [], payment: { method: "card" } });
    expect(order.reference).toMatch(/^MP-\d{4}-\d+$/);
    const page = await api.get(order.payment.redirectUrl!).expect(200);
    expect(page.headers["content-type"]).toMatch(/html/);
    expect(page.text).toContain('<label for="f-cardNumber">Card number</label>');
    expect(page.text).toContain("Pay 265 EGP");

    const invalid = await api
      .post(order.payment.redirectUrl!)
      .type("form")
      .send({ ...CARD_FORM, cardNumber: "4242 4242 4242 4241", expiry: "01/20" })
      .expect(400);
    expect(invalid.text).toContain("This card number isn&#39;t valid");
    expect(invalid.text).toContain("This card has expired");
    expect(invalid.text).toContain('role="alert"');

    const paid = await api.post(order.payment.redirectUrl!).type("form").send(CARD_FORM).expect(303);
    expect(paid.headers.location).toBe(`/orders/${order.id}`);
    const fetched = orderSchema.parse((await api.get(`/api/orders/${order.id}`).set(auth(token)).expect(200)).body);
    expect(fetched).toMatchObject({ status: "paid", paymentLabel: "Paid by card •••• 4242" });
    expect(fetched.tickets).toHaveLength(1);
    expect(fetched.tickets[0]?.holderName).toBe("Mariam K.");
    expect(fetched.parkingOffer?.price).toBe(50);

    const [block, row, seat] = hold.seats[0].split(" · ");
    const map = await api.get("/api/events/nile-fc-vs-delta-sc/seatmap");
    const mapRow = map.body.blocks
      .find((b: { id: string }) => b.id === block)
      .rows.find((r: { label: string }) => `Row ${r.label}` === row);
    expect(mapRow.seats[Number(seat.replace("Seat ", "")) - 1]).toBe("x");
    await api.get(`/api/holds/${hold.id}`).set(auth(token)).expect(410);
    // The payment session is single use.
    await api.get(order.payment.redirectUrl!).expect(404);
  });

  it("never accepts card numbers in the order request", async () => {
    const { api, auth, token, hold } = await holdDerby();
    const res = await api
      .post("/api/orders")
      .set(auth(token))
      .send({ holdId: hold.id, payment: { ...CARD, ...CARD_FORM }, acceptTerms: false })
      .expect(400);
    expect(res.body.error.details.map((d: { path: string }) => d.path)).toEqual(["acceptTerms"]);
    const ok = await api
      .post("/api/orders")
      .set(auth(token))
      .send({ holdId: hold.id, payment: { ...CARD, ...CARD_FORM }, acceptTerms: true })
      .expect(201);
    expect(JSON.stringify(ok.body)).not.toContain("4242");
  });

  it("sends declined and cancelled card payments back to checkout and allows a retry", async () => {
    const { api, auth, token, hold } = await holdDerby();
    const first = await api.post("/api/orders").set(auth(token)).send({ holdId: hold.id, payment: CARD, acceptTerms: true });
    const declined = await api
      .post(first.body.payment.redirectUrl)
      .type("form")
      .send({ ...CARD_FORM, cardNumber: DECLINED_CARD })
      .expect(303);
    expect(declined.headers.location).toBe(`/checkout/${hold.id}?payment=declined`);
    const failed = await api.get(`/api/orders/${first.body.id}`).set(auth(token));
    expect(failed.body).toMatchObject({ status: "payment_failed", payment: { failureReason: expect.stringMatching(/declined/) } });

    const second = await api.post("/api/orders").set(auth(token)).send({ holdId: hold.id, payment: CARD, acceptTerms: true }).expect(201);
    const cancelled = await api.post(second.body.payment.redirectUrl).type("form").send({ intent: "cancel" }).expect(303);
    expect(cancelled.headers.location).toBe(`/checkout/${hold.id}?payment=cancelled`);

    const third = await api.post("/api/orders").set(auth(token)).send({ holdId: hold.id, payment: CARD, acceptTerms: true });
    await api.post(third.body.payment.redirectUrl).type("form").send(CARD_FORM).expect(303);
    expect((await api.get(`/api/orders/${third.body.id}`).set(auth(token))).body.status).toBe("paid");
  });

  it("issues a Fawry bill that keeps the seats and pays later", async () => {
    const { api, auth, token, hold, advance } = await holdDerby();
    const res = await api
      .post("/api/orders")
      .set(auth(token))
      .send({ holdId: hold.id, payment: { method: "fawry" }, acceptTerms: true })
      .expect(201);
    const order = orderSchema.parse(res.body);
    expect(order.status).toBe("pending_payment");
    expect(order.payment.reference).toMatch(/^\d{9}$/);
    expect(order.payment.instructions).toMatch(/Fawry outlet/);
    expect(order.tickets).toEqual([]);
    // Still reserved after the normal 10-minute hold window.
    advance(60 * 60_000);
    await api.get(`/api/holds/${hold.id}`).set(auth(token)).expect(200);
    const paid = await api.post(`/api/__test__/fawry/${order.payment.reference}/pay`).expect(200);
    expect(paid.body).toMatchObject({ status: "paid", paymentLabel: "Paid at Fawry" });
    expect(paid.body.tickets).toHaveLength(1);
    await api.post(`/api/__test__/fawry/${order.payment.reference}/pay`).expect(409);
  });

  it("expires unpaid Fawry bills and releases the seats", async () => {
    const { api, auth, token, hold, advance } = await holdDerby();
    const res = await api
      .post("/api/orders")
      .set(auth(token))
      .send({ holdId: hold.id, payment: { method: "fawry" }, acceptTerms: true });
    advance(49 * 3_600_000);
    const order = await api.get(`/api/orders/${res.body.id}`).set(auth(token)).expect(200);
    expect(order.body.status).toBe("expired");
    await api.post(`/api/__test__/fawry/${res.body.payment.reference}/pay`).expect(409);
  });

  it("confirms wallet and InstaPay payments asynchronously", async () => {
    const { api, auth, token, hold, advance, config } = await holdDerby();
    const res = await api
      .post("/api/orders")
      .set(auth(token))
      .send({ holdId: hold.id, payment: { method: "wallet", walletPhone: "1012345482" }, acceptTerms: true })
      .expect(201);
    expect(res.body).toMatchObject({ status: "pending_payment", paymentLabel: "Paid by mobile wallet •••• 482" });
    expect(res.body.payment.instructions).toMatch(/Approve the payment request/);
    advance(config.paymentApprovalSeconds * 1000);
    const paid = await api.get(`/api/orders/${res.body.id}`).set(auth(token)).expect(200);
    expect(paid.body.status).toBe("paid");
    expect(paid.body.tickets).toHaveLength(1);
    const notes = await api.get("/api/me/notifications").set(auth(token));
    expect(notes.body.items[0]).toMatchObject({ kind: "order", title: "You're going!" });
  });

  it("expires holds after the hold window", async () => {
    const { api, auth, token, hold, advance } = await holdDerby();
    advance(11 * 60_000);
    const res = await api
      .post("/api/orders")
      .set(auth(token))
      .send({ holdId: hold.id, payment: { method: "instapay" }, acceptTerms: true })
      .expect(410);
    expect(res.body.error.code).toBe("HOLD_EXPIRED");
  });

  it("keeps orders private", async () => {
    const { api, auth, token, hold, signUpNewUser } = await holdDerby();
    const order = await api
      .post("/api/orders")
      .set(auth(token))
      .send({ holdId: hold.id, payment: { method: "instapay" }, acceptTerms: true });
    const t1 = await signUpNewUser();
    await api.get(`/api/orders/${order.body.id}`).set(auth(t1)).expect(404);
    await api.get(`/api/orders/${order.body.id}`).expect(401);
  });
});

describe("resale marketplace", () => {
  it("lists other fans' tickets cheapest first and sells one to a buyer", async () => {
    const { api, login, auth, store } = setup();
    const token = await login(SECOND_USER.phone, SECOND_USER.password);
    const offers = await api.get("/api/events/nile-fc-vs-canal-united/resale").set(auth(token)).expect(200);
    expect(offers.body.map((o: { price: number }) => o.price)).toEqual([150, 240]);
    expect(offers.body[1]).toMatchObject({ faceValue: 250, requiresFanId: true, label: "Fan resale · W2" });

    const hold = await api
      .post("/api/holds")
      .set(auth(token))
      .send({ type: "resale", eventId: EVENT_IDS.soldOut, listingId: offers.body[1].id })
      .expect(201);
    expect(hold.body).toMatchObject({ subtotal: 240, total: 255, backHref: "/events/nile-fc-vs-canal-united/resale" });
    expect(hold.body.holders[0].name).toBe("Youssef A.");
    await api.post(`/api/holds/${hold.body.id}/promo`).set(auth(token)).send({ code: "MATCHPASS10" }).expect(400);

    // While Youssef checks out nobody else can buy it.
    const omar = await login();
    const reserved = await api.get("/api/events/nile-fc-vs-canal-united/resale").set(auth(omar));
    expect(reserved.body).toHaveLength(1);
    await api
      .post("/api/holds")
      .set(auth(omar))
      .send({ type: "resale", eventId: EVENT_IDS.soldOut, listingId: offers.body[1].id })
      .expect(409);

    const order = await api
      .post("/api/orders")
      .set(auth(token))
      .send({ holdId: hold.body.id, payment: { method: "instapay" }, acceptTerms: true });
    store.completePayment(store.orders.get(order.body.id)!);
    const listing = store.listings.get(offers.body[1].id)!;
    expect(listing.status).toBe("sold");
    expect(store.tickets.get(listing.ticketId)!.status).toBe("resold");
    const tickets = await api.get("/api/tickets").set(auth(token));
    expect(tickets.body.find((t: { eventSlug: string }) => t.eventSlug === "nile-fc-vs-canal-united")).toMatchObject({
      seatLabel: "W2 · Row D · Seat 7",
      price: 240,
    });
  });

  it("refuses your own listing and requires a Fan ID for matches", async () => {
    const { api, login, auth, signUpNewUser } = setup();
    const seller = await login("1155555555", "matchpass123");
    await api
      .post("/api/holds")
      .set(auth(seller))
      .send({ type: "resale", eventId: EVENT_IDS.soldOut, listingId: "lst_resale_1" })
      .expect(409);
    const newcomer = await signUpNewUser();
    await api
      .post("/api/holds")
      .set(auth(newcomer))
      .send({ type: "resale", eventId: EVENT_IDS.soldOut, listingId: "lst_resale_1" })
      .expect(403);
    // Concerts don't need a Fan ID.
    await api
      .post("/api/holds")
      .set(auth(newcomer))
      .send({ type: "resale", eventId: EVENT_IDS.philharmonic, listingId: "lst_resale_3" })
      .expect(201);
  });
});

describe("event cancellation", () => {
  it("refunds every live ticket in full and alerts the fans", async () => {
    const { api, login, auth } = setup();
    const token = await login();
    const event = await api.post("/api/__test__/events/layla-nour-live-in-cairo/cancel").expect(200);
    expect(event.body).toMatchObject({ status: "cancelled", statusLabel: "Cancelled · refunded" });

    const refunds = await api.get("/api/refunds").set(auth(token));
    expect(refunds.body[0]).toMatchObject({ status: "refunded", amount: 1800 + 50, requestedLabel: "AUTOMATIC" });
    const upcoming = await api.get("/api/tickets").set(auth(token));
    expect(upcoming.body.some((t: { eventSlug: string }) => t.eventSlug === "layla-nour-live-in-cairo")).toBe(false);
    const alerts = await api.get("/api/alerts").set(auth(token));
    expect(alerts.body[0]).toMatchObject({ tone: "danger", title: "Layla Nour — Live in Cairo has been cancelled." });

    const hold = await api
      .post("/api/holds")
      .set(auth(token))
      .send({ type: "ticket_types", eventId: EVENT_IDS.layla, items: [{ ticketTypeId: "ga", quantity: 1 }] })
      .expect(409);
    expect(hold.body.error.message).toMatch(/cancelled/);
  });
});

describe("fan eligibility", () => {
  it("marks Fan IDs that already hold a ticket for the match", async () => {
    const { api, login, auth } = setup();
    const token = await login();
    const res = await api.get("/api/events/nile-fc-vs-delta-sc/fan-eligibility").set(auth(token)).expect(200);
    expect(res.body).toEqual([
      { fanId: "fan_omar", eligible: false, reason: "Already has a ticket for this match" },
      { fanId: "fan_youssef", eligible: false, reason: "Already has a ticket for this match" },
      { fanId: "fan_mariam", eligible: true },
      { fanId: "fan_hassan", eligible: false, reason: "Fan ID under review" },
    ]);
    const canal = await api.get("/api/events/canal-united-vs-sinai-stars/fan-eligibility").set(auth(token)).expect(200);
    expect(canal.body.filter((e: { eligible: boolean }) => e.eligible)).toHaveLength(3);
    await api.get("/api/events/nile-fc-vs-delta-sc/fan-eligibility").expect(401);
  });
});
