import {
  entrySummarySchema,
  eventPerformanceSchema,
  eventReportSchema,
  fanAccountRowSchema,
  fanIdReviewSchema,
  overviewSchema,
  payoutSchema,
  refundReviewSchema,
  staffSessionSchema,
  staffOrderRowSchema,
  type StaffRole,
} from "@repo/contracts";
import { describe, expect, it } from "vitest";
import { z } from "zod";
import { EVENT_IDS } from "../src/data/catalog";
import { STAFF_ACCOUNTS, STAFF_PASSWORD } from "../src/data/staff";
import { setup } from "./helpers";

type Ctx = ReturnType<typeof setup>;

async function staffLogin(ctx: Ctx, email: string) {
  const res = await ctx.api.post("/api/staff/auth/login").send({ email, password: STAFF_PASSWORD }).expect(200);
  return staffSessionSchema.parse(res.body);
}

async function asStaff(ctx: Ctx, email: string) {
  const session = await staffLogin(ctx, email);
  return { ...session, h: { Authorization: `Bearer ${session.token}` } };
}

describe("staff sign-in", () => {
  it("signs each role in with its permissions, separately from fan sessions", async () => {
    const ctx = setup();
    const roles: Record<string, StaffRole> = {
      [STAFF_ACCOUNTS.admin]: "admin",
      [STAFF_ACCOUNTS.operations]: "operations",
      [STAFF_ACCOUNTS.organizer]: "organizer",
    };
    for (const [email, role] of Object.entries(roles)) {
      const { staff, token } = await staffLogin(ctx, email);
      expect(staff.role).toBe(role);
      expect(staff.permissions.length).toBeGreaterThan(3);
      // A staff token is not a fan session and vice versa.
      await ctx.api
        .get("/api/me")
        .set({ Authorization: `Bearer ${token}` })
        .expect(401);
    }
    const fan = await ctx.login();
    await ctx.api.get("/api/staff/me").set(ctx.auth(fan)).expect(401);
  });

  it("refuses wrong passwords and locks out after repeated failures", async () => {
    const { api } = setup();
    for (let i = 0; i < 5; i++) await api.post("/api/staff/auth/login").send({ email: STAFF_ACCOUNTS.admin, password: "nope" }).expect(401);
    await api.post("/api/staff/auth/login").send({ email: STAFF_ACCOUNTS.admin, password: STAFF_PASSWORD }).expect(429);
  });

  it("ends the session on sign-out", async () => {
    const ctx = setup();
    const admin = await asStaff(ctx, STAFF_ACCOUNTS.admin);
    await ctx.api.post("/api/staff/auth/logout").set(admin.h).expect(204);
    await ctx.api.get("/api/staff/me").set(admin.h).expect(401);
  });
});

describe("permissions", () => {
  const MATRIX: [string, Record<StaffRole, number>][] = [
    ["/api/staff/overview", { admin: 200, operations: 200, organizer: 200 }],
    ["/api/staff/events", { admin: 200, operations: 200, organizer: 200 }],
    ["/api/staff/orders", { admin: 200, operations: 200, organizer: 200 }],
    ["/api/staff/fans", { admin: 200, operations: 200, organizer: 403 }],
    ["/api/staff/fan-ids", { admin: 200, operations: 200, organizer: 403 }],
    ["/api/staff/refunds", { admin: 200, operations: 200, organizer: 403 }],
    ["/api/staff/organizers", { admin: 200, operations: 403, organizer: 403 }],
    ["/api/staff/payouts", { admin: 200, operations: 403, organizer: 200 }],
    ["/api/staff/audit", { admin: 200, operations: 403, organizer: 403 }],
  ];

  it("lets each role reach exactly what its job needs", async () => {
    const ctx = setup();
    const sessions = {
      admin: await asStaff(ctx, STAFF_ACCOUNTS.admin),
      operations: await asStaff(ctx, STAFF_ACCOUNTS.operations),
      organizer: await asStaff(ctx, STAFF_ACCOUNTS.organizer),
    };
    for (const [path, expected] of MATRIX) {
      for (const role of Object.keys(expected) as StaffRole[]) {
        const res = await ctx.api.get(path).set(sessions[role].h);
        expect(res.status, `${role} ${path}`).toBe(expected[role]);
      }
    }
    await ctx.api
      .post(`/api/staff/events/${EVENT_IDS.alex}/status`)
      .set(sessions.operations.h)
      .send({ status: "postponed", reason: "Not my call" })
      .expect(403);
  });

  it("shows organisers only their own events, orders and payouts", async () => {
    const ctx = setup();
    const club = await asStaff(ctx, STAFF_ACCOUNTS.organizer);
    const events = z.array(eventPerformanceSchema).parse((await ctx.api.get("/api/staff/events").set(club.h).expect(200)).body);
    expect(events.length).toBeGreaterThan(0);
    expect(events.every((e) => e.organizerId === "org_nile_fc")).toBe(true);
    await ctx.api.get(`/api/staff/events/${EVENT_IDS.layla}`).set(club.h).expect(404);
    const orders = z.array(staffOrderRowSchema).parse((await ctx.api.get("/api/staff/orders").set(club.h).expect(200)).body);
    expect(orders.every((o) => events.some((e) => e.eventId === o.eventId))).toBe(true);
    const payouts = z.array(payoutSchema).parse((await ctx.api.get("/api/staff/payouts").set(club.h).expect(200)).body);
    expect(new Set(payouts.map((p) => p.organizerId))).toEqual(new Set(["org_nile_fc"]));
  });
});

describe("overview and event reports", () => {
  it("summarises sales with two weeks of history and role-specific KPIs", async () => {
    const ctx = setup();
    const admin = await asStaff(ctx, STAFF_ACCOUNTS.admin);
    const overview = overviewSchema.parse((await ctx.api.get("/api/staff/overview").set(admin.h).expect(200)).body);
    expect(overview.sales).toHaveLength(14);
    expect(overview.kpis.map((k) => k.id)).toEqual(["revenue", "tickets", "fans", "fanid_queue", "refund_queue"]);
    expect(overview.kpis.find((k) => k.id === "fanid_queue")!.value).toBe(3);
    expect(overview.topEvents[0]!.revenue).toBeGreaterThanOrEqual(overview.topEvents[1]!.revenue);
    const ops = await asStaff(ctx, STAFF_ACCOUNTS.operations);
    const opsView = overviewSchema.parse((await ctx.api.get("/api/staff/overview").set(ops.h).expect(200)).body);
    expect(opsView.kpis.some((k) => k.id === "revenue")).toBe(false);
  });

  it("never sells more than capacity and reports net after commission", async () => {
    const ctx = setup();
    const admin = await asStaff(ctx, STAFF_ACCOUNTS.admin);
    const report = eventReportSchema.parse((await ctx.api.get(`/api/staff/events/${EVENT_IDS.soldOut}`).set(admin.h).expect(200)).body);
    expect(report.sold).toBe(report.capacity);
    for (const zone of report.zones) expect(zone.sold).toBeLessThanOrEqual(zone.capacity);
    expect(report.net).toBe(Math.round(report.revenue * 0.95) - report.refunds.refunded);
    const soon = eventReportSchema.parse((await ctx.api.get(`/api/staff/events/${EVENT_IDS.national}`).set(admin.h).expect(200)).body);
    expect(soon.sold).toBe(0);
  });

  it("adds real orders on top of the seeded sales", async () => {
    const ctx = setup();
    const admin = await asStaff(ctx, STAFF_ACCOUNTS.admin);
    const before = eventReportSchema.parse((await ctx.api.get(`/api/staff/events/${EVENT_IDS.canalCup}`).set(admin.h)).body);
    const token = await ctx.login();
    const hold = await ctx.api
      .post("/api/holds")
      .set(ctx.auth(token))
      .send({ type: "zone", eventId: EVENT_IDS.canalCup, zoneId: "cat1", fanIds: ["fan_mariam"] });
    const order = await ctx.api
      .post("/api/orders")
      .set(ctx.auth(token))
      .send({ holdId: hold.body.id, payment: { method: "card" }, acceptTerms: true });
    await ctx.api
      .post(order.body.payment.redirectUrl)
      .type("form")
      .send({ cardNumber: "4242 4242 4242 4242", expiry: "12 / 49", cvc: "123", nameOnCard: "Omar" });
    const after = eventReportSchema.parse((await ctx.api.get(`/api/staff/events/${EVENT_IDS.canalCup}`).set(admin.h)).body);
    expect(after.sold).toBe(before.sold + 1);
  });
});

describe("Fan ID reviews", () => {
  it("lists flagged applications and approves one, issuing the Fan ID and telling the fan", async () => {
    const ctx = setup();
    const ops = await asStaff(ctx, STAFF_ACCOUNTS.operations);
    const queue = z.array(fanIdReviewSchema).parse((await ctx.api.get("/api/staff/fan-ids").set(ops.h).expect(200)).body);
    expect(queue.map((r) => r.fullName)).toEqual(["Salma Nasser", "Ahmed Fathy", "Laila Hassan"]);
    expect(queue[0]!.flags.length).toBeGreaterThan(0);
    await ctx.api.post("/api/staff/fan-ids/usr_laila/approve").set(ops.h).expect(200);
    const laila = await ctx.login("1023456789");
    const me = await ctx.api.get("/api/me").set(ctx.auth(laila)).expect(200);
    expect(me.body.fanId.status).toBe("approved");
    expect(me.body.linkedFans[0].isSelf).toBe(true);
    const notifications = await ctx.api.get("/api/me/notifications").set(ctx.auth(laila));
    expect(notifications.body.items[0].title).toBe("Your Fan ID is approved");
    await ctx.api.post("/api/staff/fan-ids/usr_laila/approve").set(ops.h).expect(409);
  });

  it("rejects with a reason the fan sees, and lets them apply again", async () => {
    const ctx = setup();
    const ops = await asStaff(ctx, STAFF_ACCOUNTS.operations);
    await ctx.api.post("/api/staff/fan-ids/usr_ahmed/reject").set(ops.h).send({ reason: "" }).expect(400);
    await ctx.api
      .post("/api/staff/fan-ids/usr_ahmed/reject")
      .set(ops.h)
      .send({ reason: "The ID photo is too blurry to read." })
      .expect(200);
    const ahmed = await ctx.login("1234567890");
    const me = await ctx.api.get("/api/me").set(ctx.auth(ahmed));
    expect(me.body.fanId.status).toBe("none");
    const notifications = await ctx.api.get("/api/me/notifications").set(ctx.auth(ahmed));
    expect(notifications.body.items[0].body).toContain("too blurry");
  });
});

describe("refund decisions", () => {
  async function requestRefund(ctx: Ctx) {
    const token = await ctx.login();
    const tickets = await ctx.api.get("/api/tickets").set(ctx.auth(token));
    const ticket = tickets.body.find((t: { refundable: boolean }) => t.refundable);
    const refund = await ctx.api
      .post("/api/refunds")
      .set(ctx.auth(token))
      .send({ orderId: ticket.orderId, ticketIds: [ticket.id], reason: "cant_attend", method: "credit", acknowledge: true })
      .expect(201);
    return { token, ticket, refund: refund.body };
  }

  it("approves: tickets cancelled, credit added, fan notified, refund marked refunded", async () => {
    const ctx = setup();
    const { token, ticket, refund } = await requestRefund(ctx);
    const ops = await asStaff(ctx, STAFF_ACCOUNTS.operations);
    const queue = z.array(refundReviewSchema).parse((await ctx.api.get("/api/staff/refunds?status=in_review").set(ops.h)).body);
    expect(queue.map((r) => r.id)).toContain(refund.id);
    await ctx.api.post(`/api/staff/refunds/${refund.id}/approve`).set(ops.h).expect(200);
    const mine = await ctx.api.get("/api/refunds").set(ctx.auth(token));
    expect(mine.body.find((r: { id: string }) => r.id === refund.id).status).toBe("refunded");
    const me = await ctx.api.get("/api/me").set(ctx.auth(token));
    expect(me.body.credit).toBe(refund.amount);
    const after = await ctx.api.get("/api/tickets?scope=past").set(ctx.auth(token));
    expect(after.body.find((t: { id: string }) => t.id === ticket.id)?.status ?? "refunded").toBe("refunded");
    await ctx.api.post(`/api/staff/refunds/${refund.id}/approve`).set(ops.h).expect(409);
  });

  it("rejects: tickets valid again and the fan sees the reason", async () => {
    const ctx = setup();
    const { token, ticket, refund } = await requestRefund(ctx);
    const ops = await asStaff(ctx, STAFF_ACCOUNTS.operations);
    await ctx.api
      .post(`/api/staff/refunds/${refund.id}/reject`)
      .set(ops.h)
      .send({ reason: "The refund window closed yesterday." })
      .expect(200);
    const tickets = await ctx.api.get("/api/tickets").set(ctx.auth(token));
    expect(tickets.body.find((t: { id: string }) => t.id === ticket.id).status).toBe("valid");
    const mine = await ctx.api.get("/api/refunds").set(ctx.auth(token));
    expect(mine.body.find((r: { id: string }) => r.id === refund.id)).toMatchObject({
      status: "rejected",
      note: "The refund window closed yesterday.",
    });
  });
});

describe("match-day entry", () => {
  it("admits a ticket once, flags reuse and fakes, and counts per gate", async () => {
    const ctx = setup();
    const token = await ctx.login();
    const tickets = await ctx.api.get("/api/tickets").set(ctx.auth(token));
    const film = tickets.body.find((t: { eventKind: string; qrReady: boolean }) => t.eventKind === "cinema" && t.qrReady);
    const qr = await ctx.api.get(`/api/tickets/${film.id}/qr`).set(ctx.auth(token)).expect(200);
    const ops = await asStaff(ctx, STAFF_ACCOUNTS.operations);
    const scan = (body: object) =>
      ctx.api
        .post("/api/staff/entry/scan")
        .set(ops.h)
        .send({ eventId: film.eventId, gate: "Screen 4", ...body });
    const first = await scan({ token: qr.body.token }).expect(200);
    expect(first.body.scan.result).toBe("admitted");
    expect(entrySummarySchema.parse(first.body.summary).checkedIn).toBe(1);
    expect((await scan({ token: qr.body.token }).expect(409)).body.scan.result).toBe("already_used");
    expect((await scan({ token: "MPQ1.fake.sig" }).expect(409)).body.scan.result).toBe("invalid");
    const summary = entrySummarySchema.parse((await ctx.api.get(`/api/staff/events/${film.eventId}/entry`).set(ops.h)).body);
    expect(summary.gates).toEqual([{ gate: "Screen 4", checkedIn: 1 }]);
    expect(summary.recent).toHaveLength(3);
  });
});

describe("event changes and organiser requests", () => {
  it("lets an admin postpone, reopen and cancel — cancelling refunds every fan automatically", async () => {
    const ctx = setup();
    const admin = await asStaff(ctx, STAFF_ACCOUNTS.admin);
    const path = `/api/staff/events/${EVENT_IDS.layla}/status`;
    await ctx.api.post(path).set(admin.h).send({ status: "on_sale", reason: "Back on" }).expect(409);
    await ctx.api.post(path).set(admin.h).send({ status: "postponed", reason: "Stage repairs" }).expect(200);
    const token = await ctx.login();
    const note = await ctx.api.get("/api/me/notifications").set(ctx.auth(token));
    expect(note.body.items[0].title).toContain("has been postponed");
    await ctx.api.post(path).set(admin.h).send({ status: "on_sale", reason: "New date confirmed" }).expect(200);
    await ctx.api.post(path).set(admin.h).send({ status: "cancelled", reason: "The artist is ill" }).expect(200);
    const refunds = await ctx.api.get("/api/refunds").set(ctx.auth(token));
    expect(refunds.body[0]).toMatchObject({ status: "refunded", requestedLabel: "AUTOMATIC" });
    const log = await ctx.api.get("/api/staff/audit").set(admin.h);
    expect(log.body.slice(0, 3).map((e: { action: string }) => e.action)).toEqual([
      "Cancelled event",
      "Put event back on sale",
      "Postponed event",
    ]);
  });

  it("routes organiser cancellations through an admin", async () => {
    const ctx = setup();
    const promoter = await asStaff(ctx, STAFF_ACCOUNTS.promoter);
    const club = await asStaff(ctx, STAFF_ACCOUNTS.organizer);
    const admin = await asStaff(ctx, STAFF_ACCOUNTS.admin);
    await ctx.api
      .post(`/api/staff/events/${EVENT_IDS.felucca}/requests`)
      .set(club.h)
      .send({ type: "cancel", reason: "Not ours" })
      .expect(404);
    const request = await ctx.api
      .post(`/api/staff/events/${EVENT_IDS.felucca}/requests`)
      .set(promoter.h)
      .send({ type: "cancel", reason: "The band split up." })
      .expect(201);
    await ctx.api
      .post(`/api/staff/events/${EVENT_IDS.felucca}/requests`)
      .set(promoter.h)
      .send({ type: "postpone", reason: "Again please" })
      .expect(409);
    await ctx.api.post(`/api/staff/requests/${request.body.id}/approve`).set(promoter.h).send({}).expect(403);
    await ctx.api.post(`/api/staff/requests/${request.body.id}/approve`).set(admin.h).send({}).expect(200);
    const event = await ctx.api.get(`/api/events/${ctx.store.eventById(EVENT_IDS.felucca)!.slug}`);
    expect(event.body.status).toBe("cancelled");
    await ctx.api
      .post("/api/staff/requests/req_desert_postpone/reject")
      .set(admin.h)
      .send({ reason: "Keep the date, we can help with travel." })
      .expect(200);
    const list = await ctx.api.get("/api/staff/requests").set(promoter.h);
    expect(list.body.map((r: { status: string }) => r.status).sort()).toEqual(["approved", "rejected"]);
  });
});

describe("fan accounts", () => {
  it("suspends an account (ending its sessions) and reactivates it", async () => {
    const ctx = setup();
    const admin = await asStaff(ctx, STAFF_ACCOUNTS.admin);
    const token = await ctx.login();
    const rows = z.array(fanAccountRowSchema).parse((await ctx.api.get("/api/staff/fans?q=omar").set(admin.h)).body);
    expect(rows).toHaveLength(1);
    await ctx.api.post("/api/staff/fans/usr_omar/suspend").set(admin.h).send({ reason: "Touting tickets above face value." }).expect(200);
    await ctx.api.get("/api/me").set(ctx.auth(token)).expect(401);
    await ctx.api.post("/api/auth/login").send({ phone: "1012345482", password: "matchpass123" }).expect(403);
    const ops = await asStaff(ctx, STAFF_ACCOUNTS.operations);
    await ctx.api.post("/api/staff/fans/usr_omar/reactivate").set(ops.h).expect(403);
    await ctx.api.post("/api/staff/fans/usr_omar/reactivate").set(admin.h).expect(200);
    await ctx.login();
  });
});
