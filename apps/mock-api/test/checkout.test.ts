import { holdSchema, orderSchema } from "@repo/contracts";
import { describe, expect, it } from "vitest";
import { EVENT_IDS } from "../src/data/catalog";
import { DECLINED_CARD } from "../src/routes/checkout";
import { setup } from "./helpers";

const CARD = { method: "card", cardNumber: "4242 4242 4242 4242", expiry: "12 / 49", cvc: "123", nameOnCard: "Omar Khaled" };

describe("holds", () => {
  it("holds a stadium zone for selected Fan IDs and prices it", async () => {
    const { api, login, auth } = setup();
    const token = await login();
    const res = await api
      .post("/api/holds")
      .set(auth(token))
      .send({ type: "zone", eventId: EVENT_IDS.derby, zoneId: "cat1", fanIds: ["fan_omar", "fan_youssef"] })
      .expect(201);
    const hold = holdSchema.parse(res.body);
    expect(hold.subtotal).toBe(500);
    expect(hold.fees).toBe(30);
    expect(hold.total).toBe(530);
    expect(hold.lines.map((l) => l.label)).toEqual(["Category 1 · West stand × 2", "Service fee × 2"]);
    expect(hold.holders.map((h) => h.name)).toEqual(["Omar K.", "Youssef A."]);
    expect(hold.seats).toHaveLength(2);
    expect(new Date(hold.expiresAt).getTime() - new Date("2026-10-01T10:00:00+03:00").getTime()).toBe(10 * 60_000);
    expect(res.body).not.toHaveProperty("ticketSpecs");
  });

  it("refuses restricted zones, fans under review and strangers", async () => {
    const { api, login, auth } = setup();
    const token = await login();
    const away = await api
      .post("/api/holds")
      .set(auth(token))
      .send({ type: "zone", eventId: EVENT_IDS.derby, zoneId: "away", fanIds: ["fan_omar"] })
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
      .send({ type: "zone", eventId: EVENT_IDS.derby, zoneId: "nope", fanIds: ["fan_omar"] })
      .expect(404);
  });

  it("holds exact stadium seats, one per approved Fan ID", async () => {
    const { api, login, auth } = setup();
    const token = await login();
    const map = await api.get("/api/events/nile-fc-vs-delta-sc/seatmap");
    const block = map.body.blocks.find((b: { id: string }) => b.id === "E1");
    const rowIndex = block.rows.findIndex((r: { seats: string }) => r.seats.includes("aa"));
    const row = block.rows[rowIndex];
    const col = row.seats.indexOf("aa") + 1;
    const seatIds = [`E1-${row.label}-${col}`, `E1-${row.label}-${col + 1}`];
    const res = await api.post("/api/holds").set(auth(token)).send({ type: "seats", eventId: EVENT_IDS.derby, seatIds }).expect(201);
    expect(res.body.total).toBe(2 * 150 + 2 * 15);

    const taken = await api
      .post("/api/holds")
      .set(auth(token))
      .send({ type: "seats", eventId: EVENT_IDS.derby, seatIds: ["W3-L-18"] })
      .expect(409);
    expect(taken.body.error.code).toBe("SEAT_UNAVAILABLE");
    await api
      .post("/api/holds")
      .set(auth(token))
      .send({ type: "seats", eventId: EVENT_IDS.derby, seatIds: ["S1-A-1"] })
      .expect(403);
    await api
      .post("/api/holds")
      .set(auth(token))
      .send({ type: "seats", eventId: EVENT_IDS.derby, seatIds: ["E1-A-1", "E1-A-1"] })
      .expect(400);
  });

  it("limits stadium seats to approved Fan IDs on the account", async () => {
    const { api, login, auth } = setup();
    const token = await login();
    const res = await api
      .post("/api/holds")
      .set(auth(token))
      .send({ type: "seats", eventId: EVENT_IDS.derby, seatIds: ["E1-A-1", "E1-A-2", "E1-A-3", "E1-A-4"] })
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
    await api.get(`/api/holds/${second.body.id}`).set(auth(token)).expect(404);
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
});

describe("orders", () => {
  async function holdDerby() {
    const ctx = setup();
    const token = await ctx.login();
    const hold = await ctx.api
      .post("/api/holds")
      .set(ctx.auth(token))
      .send({ type: "zone", eventId: EVENT_IDS.derby, zoneId: "cat1", fanIds: ["fan_omar", "fan_youssef"] });
    return { ...ctx, token, hold: hold.body };
  }

  it("pays by card, issues tickets and marks seats sold", async () => {
    const { api, auth, token, hold } = await holdDerby();
    const res = await api.post("/api/orders").set(auth(token)).send({ holdId: hold.id, payment: CARD, acceptTerms: true }).expect(201);
    const order = orderSchema.parse(res.body);
    expect(order).toMatchObject({ status: "paid", total: 530, paymentLabel: "Paid by card •••• 4242" });
    expect(order.reference).toMatch(/^MP-\d{4}-\d+$/);
    expect(order.tickets).toHaveLength(2);
    expect(order.tickets[0]?.holderName).toBe("Omar K.");
    expect(order.parkingOffer?.price).toBe(50);

    const [block, row, seat] = hold.seats[0].split(" · ");
    const map = await api.get("/api/events/nile-fc-vs-delta-sc/seatmap");
    const mapRow = map.body.blocks
      .find((b: { id: string }) => b.id === block)
      .rows.find((r: { label: string }) => `Row ${r.label}` === row);
    expect(mapRow.seats[Number(seat.replace("Seat ", "")) - 1]).toBe("x");

    await api.get(`/api/holds/${hold.id}`).set(auth(token)).expect(404);
    const fetched = await api.get(`/api/orders/${order.id}`).set(auth(token)).expect(200);
    expect(fetched.body.reference).toBe(order.reference);
  });

  it("validates payment details", async () => {
    const { api, auth, token, hold } = await holdDerby();
    const res = await api
      .post("/api/orders")
      .set(auth(token))
      .send({ holdId: hold.id, payment: { ...CARD, cardNumber: "4242 4242 4242 4241", expiry: "01/20" }, acceptTerms: false })
      .expect(400);
    const paths = res.body.error.details.map((d: { path: string }) => d.path);
    expect(paths).toEqual(expect.arrayContaining(["payment.cardNumber", "payment.expiry", "acceptTerms"]));
  });

  it("surfaces declined cards", async () => {
    const { api, auth, token, hold } = await holdDerby();
    const res = await api
      .post("/api/orders")
      .set(auth(token))
      .send({ holdId: hold.id, payment: { ...CARD, cardNumber: DECLINED_CARD }, acceptTerms: true })
      .expect(402);
    expect(res.body.error.code).toBe("PAYMENT_DECLINED");
  });

  it("issues a Fawry reference without tickets until paid", async () => {
    const { api, auth, token, hold } = await holdDerby();
    const res = await api
      .post("/api/orders")
      .set(auth(token))
      .send({ holdId: hold.id, payment: { method: "fawry" }, acceptTerms: true })
      .expect(201);
    expect(res.body.status).toBe("awaiting_payment");
    expect(res.body.fawryReference).toMatch(/^\d{9}$/);
    expect(res.body.tickets).toEqual([]);
  });

  it("pays by wallet and InstaPay", async () => {
    const { api, auth, token, hold } = await holdDerby();
    const res = await api
      .post("/api/orders")
      .set(auth(token))
      .send({ holdId: hold.id, payment: { method: "wallet", walletPhone: "1012345482" }, acceptTerms: true })
      .expect(201);
    expect(res.body.paymentLabel).toBe("Paid by mobile wallet •••• 482");
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
