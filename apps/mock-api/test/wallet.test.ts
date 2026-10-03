import {
  dayjs,
  gateVerifyResponseSchema,
  qrTokenSchema,
  refundOptionsSchema,
  refundSchema,
  resaleListingSchema,
  ticketSchema,
  transferSchema,
  transfersResponseSchema,
} from "@repo/contracts";
import { describe, expect, it } from "vitest";
import { z } from "zod";
import { QR_PERIOD_SECONDS, SECOND_USER } from "../src/data/store";
import { FIXED_NOW, setup } from "./helpers";

async function signedIn() {
  const ctx = setup();
  const token = await ctx.login();
  const tickets = await ctx.api.get("/api/tickets").set(ctx.auth(token)).expect(200);
  const list = z.array(ticketSchema).parse(tickets.body);
  const bySlug = (slug: string) => list.filter((t) => t.eventSlug === slug);
  return { ...ctx, token, list, bySlug };
}

describe("tickets", () => {
  it("lists upcoming tickets in date order without refunded ones", async () => {
    const { list } = await signedIn();
    const slugs = [...new Set(list.map((t) => t.eventSlug))];
    expect(slugs).toEqual(["the-last-lighthouse", "nile-fc-vs-delta-sc", "layla-nour-live-in-cairo", "cairo-jazz-nights"]);
    expect(list.some((t) => t.status === "refunded")).toBe(false);
  });

  it("exposes QR readiness, refund rules and transfer modes per event type", async () => {
    const { bySlug } = await signedIn();
    const [film] = bySlug("the-last-lighthouse");
    const [derby] = bySlug("nile-fc-vs-delta-sc");
    const [layla] = bySlug("layla-nour-live-in-cairo");
    const [jazz] = bySlug("cairo-jazz-nights");
    expect(film).toMatchObject({ qrReady: true, refundable: true, variant: "purple", resaleAllowed: false });
    expect(derby).toMatchObject({ qrReady: false, refundable: false, transferMode: "fan_id", variant: "ink" });
    expect(derby?.refundNote).toMatch(/resale/);
    expect(layla).toMatchObject({ refundable: true, transferMode: "contact", variant: "lime" });
    expect(jazz?.qrUnlockLabel).toMatch(/^Appears /);
  });

  it("lists past tickets separately", async () => {
    const { api, auth, token } = await signedIn();
    const res = await api.get("/api/tickets?scope=past").set(auth(token)).expect(200);
    expect(res.body).toEqual([]);
    await api.get("/api/tickets?scope=later").set(auth(token)).expect(400);
  });

  it("fetches one ticket and hides other people's", async () => {
    const { api, auth, token, list, signUpNewUser } = await signedIn();
    await api.get(`/api/tickets/${list[0]!.id}`).set(auth(token)).expect(200);
    const t1 = await signUpNewUser();
    await api.get(`/api/tickets/${list[0]!.id}`).set(auth(t1)).expect(404);
  });
});

describe("transfers", () => {
  it("sends match tickets to an approved Fan ID, which the recipient accepts", async () => {
    const { api, auth, token, bySlug, login } = await signedIn();
    const [derby] = bySlug("nile-fc-vs-delta-sc");
    await api
      .post(`/api/tickets/${derby!.id}/transfer`)
      .set(auth(token))
      .send({ mode: "contact", recipient: "friend@mail.com" })
      .expect(400);
    const self = await api
      .post(`/api/tickets/${derby!.id}/transfer`)
      .set(auth(token))
      .send({ mode: "fan_id", recipient: "2210 4417 4821" })
      .expect(400);
    expect(self.body.error.message).toMatch(/yourself/);
    const unknown = await api
      .post(`/api/tickets/${derby!.id}/transfer`)
      .set(auth(token))
      .send({ mode: "fan_id", recipient: "2210 4417 0000" })
      .expect(400);
    expect(unknown.body.error.message).toMatch(/no approved Fan ID/);
    // Youssef already has a derby ticket — one per Fan ID.
    await api.post(`/api/tickets/${derby!.id}/transfer`).set(auth(token)).send({ mode: "fan_id", recipient: "2210 4417 1907" }).expect(422);
    // …but Youssef's own ticket (bought by Omar) can move to Youssef's account.
    const youssefsTicket = bySlug("nile-fc-vs-delta-sc").find((t) => t.holderName === "Youssef A.")!;
    const toOwner = await api
      .post(`/api/tickets/${youssefsTicket.id}/transfer`)
      .set(auth(token))
      .send({ mode: "fan_id", recipient: "2210 4417 1907" })
      .expect(201);
    await api.post(`/api/transfers/${toOwner.body.id}/cancel`).set(auth(token)).expect(200);

    // Karim (the resale seller) has no derby ticket yet.
    const sent = await api
      .post(`/api/tickets/${derby!.id}/transfer`)
      .set(auth(token))
      .send({ mode: "fan_id", recipient: "2210 4417 5555" })
      .expect(201);
    const transfer = transferSchema.parse(sent.body);
    expect(transfer).toMatchObject({ status: "pending", direction: "outgoing", recipientLabel: "Fan ID •••• 5555" });
    expect((await api.get(`/api/tickets/${derby!.id}`).set(auth(token))).body.status).toBe("transfer_pending");
    await api.post(`/api/tickets/${derby!.id}/transfer`).set(auth(token)).send({ mode: "fan_id", recipient: "2210 4417 5555" }).expect(409);
    await api.post("/api/resale/listings").set(auth(token)).send({ ticketId: derby!.id, price: 200, payoutMethod: "wallet" }).expect(409);

    const karim = await login("1155555555", "matchpass123");
    const inbox = transfersResponseSchema.parse((await api.get("/api/transfers").set(auth(karim)).expect(200)).body);
    expect(inbox.incoming).toHaveLength(1);
    expect(inbox.incoming[0]).toMatchObject({ direction: "incoming", fromName: "Omar Khaled" });
    const alerts = await api.get("/api/alerts").set(auth(karim));
    expect(alerts.body[0]).toMatchObject({ tone: "info", action: { href: "/transfers" } });
    // Only the recipient can accept.
    await api.post(`/api/transfers/${transfer.id}/accept`).set(auth(token)).expect(404);

    const accepted = await api.post(`/api/transfers/${transfer.id}/accept`).set(auth(karim)).expect(200);
    expect(accepted.body.transfer.status).toBe("accepted");
    expect(ticketSchema.parse(accepted.body.ticket)).toMatchObject({
      status: "valid",
      holderName: "Karim N.",
      seatLabel: derby!.seatLabel,
    });
    expect(accepted.body.ticket.code).not.toBe(derby!.code);
    expect((await api.get(`/api/tickets/${derby!.id}`).set(auth(token))).body.status).toBe("transferred");
    await api.post(`/api/transfers/${transfer.id}/accept`).set(auth(karim)).expect(409);
  });

  it("lets the recipient decline and the sender cancel", async () => {
    const { api, auth, token, bySlug, login } = await signedIn();
    const [first, second] = bySlug("layla-nour-live-in-cairo");
    const youssef = await login(SECOND_USER.phone, SECOND_USER.password);
    const t1 = await api
      .post(`/api/tickets/${first!.id}/transfer`)
      .set(auth(token))
      .send({ mode: "contact", recipient: "youssef.a@mail.com" })
      .expect(201);
    await api.post(`/api/transfers/${t1.body.id}/decline`).set(auth(youssef)).expect(200);
    expect((await api.get(`/api/tickets/${first!.id}`).set(auth(token))).body.status).toBe("valid");

    const t2 = await api
      .post(`/api/tickets/${second!.id}/transfer`)
      .set(auth(token))
      .send({ mode: "contact", recipient: "+20 10 9876 5432" })
      .expect(201);
    expect(t2.body.recipientLabel).toBe("+20•••432");
    await api.post(`/api/transfers/${t2.body.id}/cancel`).set(auth(youssef)).expect(404);
    await api.post(`/api/transfers/${t2.body.id}/cancel`).set(auth(token)).expect(200);
    await api.post(`/api/transfers/${t2.body.id}/accept`).set(auth(youssef)).expect(409);
    const outgoing = await api.get("/api/transfers").set(auth(token));
    expect(outgoing.body.outgoing.map((t: { status: string }) => t.status)).toEqual(expect.arrayContaining(["declined", "cancelled"]));
  });

  it("returns the ticket when a transfer isn't accepted within 24 hours", async () => {
    const { api, auth, token, bySlug, advance } = await signedIn();
    const [layla] = bySlug("layla-nour-live-in-cairo");
    const sent = await api
      .post(`/api/tickets/${layla!.id}/transfer`)
      .set(auth(token))
      .send({ mode: "contact", recipient: "friend@mail.com" })
      .expect(201);
    advance(24 * 3_600_000 + 1000);
    const list = await api.get("/api/transfers").set(auth(token));
    expect(list.body.outgoing.find((t: { id: string }) => t.id === sent.body.id).status).toBe("expired");
    expect((await api.get(`/api/tickets/${layla!.id}`).set(auth(token))).body.status).toBe("valid");
  });

  it("lets someone without an account claim a ticket after signing up with that number", async () => {
    const { api, auth, token, bySlug, signUpNewUser } = await signedIn();
    const [layla] = bySlug("layla-nour-live-in-cairo");
    const sent = await api
      .post(`/api/tickets/${layla!.id}/transfer`)
      .set(auth(token))
      .send({ mode: "contact", recipient: "1112345678" })
      .expect(201);
    const sara = await signUpNewUser("1112345678");
    const inbox = await api.get("/api/transfers").set(auth(sara));
    expect(inbox.body.incoming.map((t: { id: string }) => t.id)).toEqual([sent.body.id]);
    const accepted = await api.post(`/api/transfers/${sent.body.id}/accept`).set(auth(sara)).expect(200);
    expect(accepted.body.ticket.holderName).toBe("Sara Ahmed");
  });
});

describe("entry QR and gate", () => {
  it("issues short-lived signed tokens that the gate verifies", async () => {
    const { api, auth, token, bySlug, advance } = await signedIn();
    const [film] = bySlug("the-last-lighthouse");
    const qr = qrTokenSchema.parse((await api.get(`/api/tickets/${film!.id}/qr`).set(auth(token)).expect(200)).body);
    expect(qr.token).toMatch(/^MPQ1\./);
    expect(qr.refreshInSeconds).toBeLessThanOrEqual(QR_PERIOD_SECONDS);

    const ok = gateVerifyResponseSchema.parse((await api.post("/api/gate/verify").send({ token: qr.token }).expect(200)).body);
    expect(ok).toMatchObject({ valid: true, reason: "ok", ticketCode: film!.code, holderName: "Omar K." });

    const tampered = qr.token.slice(0, -2) + (qr.token.endsWith("AA") ? "BB" : "AA");
    expect((await api.post("/api/gate/verify").send({ token: tampered })).body).toEqual({ valid: false, reason: "tampered" });
    expect((await api.post("/api/gate/verify").send({ token: "screenshot" })).body.reason).toBe("tampered");

    // A screenshot stops working a window after it rotates.
    advance(QR_PERIOD_SECONDS * 2 * 1000);
    expect((await api.post("/api/gate/verify").send({ token: qr.token })).body).toEqual({ valid: false, reason: "expired" });
  });

  it("withholds the QR until 24 hours before a match and rejects transferred tickets", async () => {
    const { api, auth, token, bySlug, store } = await signedIn();
    const [derby] = bySlug("nile-fc-vs-delta-sc");
    const locked = await api.get(`/api/tickets/${derby!.id}/qr`).set(auth(token)).expect(403);
    expect(locked.body.error.message).toMatch(/^Appears /);

    const [film] = bySlug("the-last-lighthouse");
    const qr = await api.get(`/api/tickets/${film!.id}/qr`).set(auth(token));
    store.tickets.get(film!.id)!.status = "transferred";
    expect((await api.post("/api/gate/verify").send({ token: qr.body.token })).body).toMatchObject({ valid: false, reason: "not_valid" });
    await api.get(`/api/tickets/${film!.id}/qr`).set(auth(token)).expect(409);
  });

  it("recomputes QR readiness and refund windows as time passes", async () => {
    const { api, auth, token, bySlug, advance } = await signedIn();
    const [layla] = bySlug("layla-nour-live-in-cairo");
    expect(layla).toMatchObject({ qrReady: false, refundable: true });
    advance(dayjs(layla!.startsAt).diff(FIXED_NOW) - 23 * 3_600_000);
    const later = await api.get(`/api/tickets/${layla!.id}`).set(auth(token));
    expect(later.body).toMatchObject({ qrReady: true, refundable: false });
  });
});

describe("official resale", () => {
  it("lists a ticket at up to face value and can withdraw it", async () => {
    const { api, auth, token, bySlug } = await signedIn();
    const [derby] = bySlug("nile-fc-vs-delta-sc");
    const tooHigh = await api
      .post("/api/resale/listings")
      .set(auth(token))
      .send({ ticketId: derby!.id, price: 300, payoutMethod: "wallet" })
      .expect(400);
    expect(tooHigh.body.error.message).toMatch(/face value/);
    await api.post("/api/resale/listings").set(auth(token)).send({ ticketId: derby!.id, price: 20, payoutMethod: "wallet" }).expect(400);
    await api.post("/api/resale/listings").set(auth(token)).send({ ticketId: derby!.id, price: 200, payoutMethod: "bank" }).expect(400);

    const created = await api
      .post("/api/resale/listings")
      .set(auth(token))
      .send({ ticketId: derby!.id, price: 250, payoutMethod: "instapay" })
      .expect(201);
    expect(resaleListingSchema.parse(created.body)).toMatchObject({ price: 250, payout: 237.5, status: "listed" });
    const ticket = await api.get(`/api/tickets/${derby!.id}`).set(auth(token));
    expect(ticket.body.status).toBe("listed");
    await api.post("/api/resale/listings").set(auth(token)).send({ ticketId: derby!.id, price: 250, payoutMethod: "wallet" }).expect(409);

    const listings = await api.get("/api/resale/listings").set(auth(token)).expect(200);
    expect(listings.body.map((l: { status: string }) => l.status).sort()).toEqual(["listed", "sold"]);

    await api.delete(`/api/resale/listings/${created.body.id}`).set(auth(token)).expect(204);
    const restored = await api.get(`/api/tickets/${derby!.id}`).set(auth(token));
    expect(restored.body.status).toBe("valid");
    await api.delete("/api/resale/listings/lst_canal_sold").set(auth(token)).expect(409);
  });

  it("does not allow cinema resale", async () => {
    const { api, auth, token, bySlug } = await signedIn();
    const [film] = bySlug("the-last-lighthouse");
    await api.post("/api/resale/listings").set(auth(token)).send({ ticketId: film!.id, price: 100, payoutMethod: "wallet" }).expect(403);
  });
});

describe("refunds", () => {
  it("offers refundable tickets for an order", async () => {
    const { api, auth, token, bySlug } = await signedIn();
    const [layla] = bySlug("layla-nour-live-in-cairo");
    const res = await api.get(`/api/orders/${layla!.orderId}/refund-options`).set(auth(token)).expect(200);
    const options = refundOptionsSchema.parse(res.body);
    expect(options.tickets.map((t) => t.label)).toEqual(["Golden Circle · Ticket 1", "Golden Circle · Ticket 2"]);
    expect(options.serviceFeePerTicket).toBe(25);
    expect(options.methods.find((m) => m.id === "credit")?.bonusRate).toBe(0.05);

    const [derby] = bySlug("nile-fc-vs-delta-sc");
    const none = await api.get(`/api/orders/${derby!.orderId}/refund-options`).set(auth(token)).expect(200);
    expect(none.body.tickets).toEqual([]);
  });

  it("requests a refund, then cancels it to keep the tickets", async () => {
    const { api, auth, token, bySlug } = await signedIn();
    const tickets = bySlug("layla-nour-live-in-cairo");
    const body = {
      orderId: tickets[0]!.orderId,
      ticketIds: tickets.map((t) => t.id),
      reason: "cant_attend",
      method: "credit",
      acknowledge: true,
    };

    await api
      .post("/api/refunds")
      .set(auth(token))
      .send({ ...body, acknowledge: false })
      .expect(400);
    const created = await api.post("/api/refunds").set(auth(token)).send(body).expect(201);
    const refund = refundSchema.parse(created.body);
    expect(refund).toMatchObject({ amount: 1890, status: "in_review", canCancel: true });
    expect(refund.reference).toMatch(/^RF-\d{4}-\d{4}$/);
    expect(refund.steps.map((s) => s.state)).toEqual(["done", "current", "todo", "todo"]);

    const pending = await api.get(`/api/tickets/${tickets[0]!.id}`).set(auth(token));
    expect(pending.body.status).toBe("refund_pending");
    await api.post("/api/refunds").set(auth(token)).send(body).expect(409);

    const list = await api.get("/api/refunds").set(auth(token)).expect(200);
    expect(list.body[0].id).toBe(refund.id);
    expect(list.body).toHaveLength(3);

    const cancelled = await api.post(`/api/refunds/${refund.id}/cancel`).set(auth(token)).expect(200);
    expect(cancelled.body).toMatchObject({ status: "cancelled", statusLabel: "Cancelled by you", canCancel: false });
    expect(cancelled.body.note).toBe("Your request was cancelled. Your 2 tickets are still valid.");
    const valid = await api.get(`/api/tickets/${tickets[0]!.id}`).set(auth(token));
    expect(valid.body.status).toBe("valid");
    await api.post(`/api/refunds/${refund.id}/cancel`).set(auth(token)).expect(409);
  });

  it("refuses refunds for non-refundable match tickets", async () => {
    const { api, auth, token, bySlug } = await signedIn();
    const [derby] = bySlug("nile-fc-vs-delta-sc");
    const res = await api
      .post("/api/refunds")
      .set(auth(token))
      .send({ orderId: derby!.orderId, ticketIds: [derby!.id], reason: "cant_attend", method: "card", acknowledge: true })
      .expect(409);
    expect(res.body.error.message).toMatch(/resale/);
  });

  it("keeps refund history private and requires auth", async () => {
    const { api, auth, signUpNewUser } = await signedIn();
    await api.get("/api/refunds").expect(401);
    const t2 = await signUpNewUser();
    const res = await api.get("/api/refunds").set(auth(t2)).expect(200);
    expect(res.body).toEqual([]);
    const t3 = await signUpNewUser("1512345678");
    await api.post("/api/refunds/rf_postponed/cancel").set(auth(t3)).expect(404);
  });
});
