import {
  can,
  createEventRequestSchema,
  dayjs,
  decisionSchema,
  eventStatusChangeSchema,
  gateScanRequestSchema,
  rejectionSchema,
  staffLoginRequestSchema,
  type EntrySummary,
  type EventReport,
  type FanAccountRow,
  type FanIdReview,
  type Kpi,
  type Overview,
  type OrganizerRow,
  type RefundReview,
  type StaffOrderRow,
  type StaffPermission,
} from "@repo/contracts";
import { Router, type Request, type RequestHandler, type Response } from "express";
import {
  audit,
  checkedIn,
  COMMISSION_RATE,
  organizerOf,
  ORGANIZERS,
  payouts,
  performance,
  publicStaff,
  refundedFor,
  salesHistory,
  scanResultLabels,
  visibleEvents,
  zoneSales,
  type StoredScan,
  type StoredStaff,
} from "../data/staff";
import type { Store, StoredRefund, StoredUser } from "../data/store";
import { tokenFrom } from "../http/auth";
import { HttpError, notFound } from "../http/errors";
import { param, parseBody } from "../http/validate";

/** Staff sign-in attempts allowed per email in 15 minutes. */
const STAFF_LOGIN_ATTEMPTS = 5;

const staffOf = (res: Response) => res.locals.staff as StoredStaff;

/**
 * Dashboard API (`/api/staff/*`) for admins, the operations team and event organisers. Staff sessions are
 * separate from fan sessions; every route checks a permission from `permissionsByRole`, and organisers
 * only ever see their own events, orders, entry and payouts.
 */
export function staffRouter(store: Store, options: { enableTestRoutes: boolean }) {
  const router = Router();
  const failures = new Map<string, number[]>();

  const authenticate: RequestHandler = (req, res, next) => {
    const token = tokenFrom(req);
    const staffId = token ? store.staffSessions.get(token) : undefined;
    const staff = staffId ? store.staff.get(staffId) : undefined;
    if (!staff) {
      next(new HttpError("UNAUTHORIZED", "Sign in to continue"));
      return;
    }
    res.locals.staff = staff;
    res.locals.staffToken = token;
    next();
  };

  const allow =
    (permission: StaffPermission): RequestHandler =>
    (_req, res, next) => {
      if (!can(staffOf(res).role, permission)) next(new HttpError("FORBIDDEN", "Your role can't do this"));
      else next();
    };

  /** An event the staff member may see (organisers: only their own — others look like they don't exist). */
  const eventFor = (req: Request, res: Response) => {
    const event = visibleEvents(store, staffOf(res)).find((e) => e.id === param(req, "id"));
    if (!event) throw notFound("Event");
    return event;
  };

  /* ---------- Session ---------- */

  router.post("/staff/auth/login", (req, res) => {
    const { email, password } = parseBody(staffLoginRequestSchema, req);
    const key = email.toLowerCase();
    const windowStart = dayjs(store.now()).subtract(15, "minute").valueOf();
    const recent = (failures.get(key) ?? []).filter((at) => at > windowStart);
    if (recent.length >= STAFF_LOGIN_ATTEMPTS) throw new HttpError("RATE_LIMITED", "Too many attempts. Try again in a few minutes.");
    const staff = [...store.staff.values()].find((s) => s.email.toLowerCase() === key);
    if (!staff || staff.password !== password) {
      failures.set(key, [...recent, store.now().getTime()]);
      throw new HttpError("UNAUTHORIZED", "Email or password is incorrect");
    }
    failures.delete(key);
    const token = store.token();
    store.staffSessions.set(token, staff.id);
    res.json({ token, staff: publicStaff(staff) });
  });

  // Development only: staff can sign in as any seeded role without a password (used by the dev autofill).
  if (options.enableTestRoutes) {
    router.get("/staff/auth/accounts", (_req, res) => {
      res.json([...store.staff.values()].map((s) => ({ email: s.email, role: s.role, name: s.name, organizerName: s.organizerName })));
    });
  }

  router.use("/staff", authenticate);

  router.post("/staff/auth/logout", (_req, res) => {
    store.staffSessions.delete(res.locals.staffToken as string);
    res.status(204).end();
  });

  router.get("/staff/me", (_req, res) => res.json(publicStaff(staffOf(res))));

  /* ---------- Overview ---------- */

  router.get("/staff/overview", allow("overview:read"), (_req, res) => {
    const staff = staffOf(res);
    const events = visibleEvents(store, staff);
    const perf = events.map((e) => performance(store, e));
    const sales = salesHistory(store, events);
    const week = (from: number, to: number) => sales.slice(from, to).reduce((n, p) => n + p.revenue, 0);
    const weekTickets = (from: number, to: number) => sales.slice(from, to).reduce((n, p) => n + p.tickets, 0);
    const change = (now: number, before: number) => (before ? (now - before) / before : undefined);
    const fanIdQueue = [...store.users.values()].filter((u) => u.fanId.status === "pending").length;
    const refundQueue = [...store.refunds.values()].filter((r) => r.status === "in_review").length;
    const pendingRequests = [...store.eventRequests.values()].filter((r) => r.status === "pending").length;
    const scansToday = store.entryScans.filter((s) => s.result === "admitted" && dayjs(s.at).isSame(store.now(), "day")).length;
    const revenue: Kpi = {
      id: "revenue",
      label: "Ticket revenue",
      value: perf.reduce((n, e) => n + e.revenue, 0),
      format: "money",
      change: change(week(7, 14), week(0, 7)),
      hint: "All events, before fees",
    };
    const tickets: Kpi = {
      id: "tickets",
      label: "Tickets sold",
      value: perf.reduce((n, e) => n + e.sold, 0),
      format: "number",
      change: change(weekTickets(7, 14), weekTickets(0, 7)),
    };
    const kpis: Kpi[] =
      staff.role === "admin"
        ? [
            revenue,
            tickets,
            { id: "fans", label: "Fan accounts", value: store.users.size, format: "number" },
            { id: "fanid_queue", label: "Fan IDs to review", value: fanIdQueue, format: "number" },
            { id: "refund_queue", label: "Refunds to review", value: refundQueue, format: "number" },
          ]
        : staff.role === "operations"
          ? [
              { id: "fanid_queue", label: "Fan IDs to review", value: fanIdQueue, format: "number" },
              { id: "refund_queue", label: "Refunds to review", value: refundQueue, format: "number" },
              { id: "checkins", label: "Admitted today", value: scansToday, format: "number" },
              { id: "orders", label: "Orders", value: store.orders.size, format: "number" },
            ]
          : [
              revenue,
              tickets,
              {
                id: "checkins",
                label: "Checked in",
                value: perf.reduce((n, e) => n + e.checkedIn, 0),
                format: "number",
              },
              {
                id: "resale",
                label: "Resold tickets",
                value: [...store.listings.values()].filter((l) => l.status === "sold" && events.some((e) => e.id === l.eventId)).length,
                format: "number",
              },
            ];
    const tasks = [
      ...(can(staff.role, "fanid:review")
        ? [{ id: "fanid", label: "Fan IDs waiting for review", count: fanIdQueue, href: "/fan-ids" }]
        : []),
      ...(can(staff.role, "refunds:review")
        ? [{ id: "refunds", label: "Refund requests to decide", count: refundQueue, href: "/refunds" }]
        : []),
      ...(can(staff.role, "requests:review")
        ? [{ id: "requests", label: "Organiser requests", count: pendingRequests, href: "/requests" }]
        : []),
    ];
    const body: Overview = {
      kpis,
      sales,
      topEvents: perf.sort((a, b) => b.revenue - a.revenue).slice(0, 5),
      tasks,
    };
    res.json(body);
  });

  /* ---------- Events ---------- */

  router.get("/staff/events", allow("events:read"), (_req, res) => {
    const events = visibleEvents(store, staffOf(res)).map((e) => performance(store, e));
    res.json(events.sort((a, b) => a.startsAt.localeCompare(b.startsAt)));
  });

  router.get("/staff/events/:id", allow("events:read"), (req, res) => {
    const event = eventFor(req, res);
    const perf = performance(store, event);
    const fees = perf.sold * event.serviceFee;
    const refunded = refundedFor(store, new Set([event.id]));
    const listings = [...store.listings.values()].filter((l) => l.eventId === event.id);
    const refunds = [...store.refunds.values()].filter((r) => store.orders.get(r.orderId)?.eventSlug === event.slug);
    const pending = [...store.eventRequests.values()].find((r) => r.eventId === event.id && r.status === "pending");
    const report: EventReport = {
      ...perf,
      zones: zoneSales(store, event),
      sales: salesHistory(store, [event]),
      resale: { listed: listings.filter((l) => l.status === "listed").length, sold: listings.filter((l) => l.status === "sold").length },
      refunds: { requested: refunds.length, refunded },
      fees,
      net: Math.max(0, Math.round(perf.revenue * (1 - COMMISSION_RATE)) - refunded),
      ...(pending ? { pendingRequest: pending } : {}),
    };
    res.json(report);
  });

  /** Admin: cancel (automatic full refunds), postpone, or put a postponed event back on sale. */
  router.post("/staff/events/:id/status", allow("events:manage"), (req, res) => {
    const event = eventFor(req, res);
    const { status, reason } = parseBody(eventStatusChangeSchema, req);
    applyStatus(event.id, status, reason, staffOf(res));
    res.json(performance(store, store.eventById(event.id)!));
  });

  function applyStatus(eventId: string, status: "cancelled" | "postponed" | "on_sale", reason: string, staff: StoredStaff) {
    const event = store.eventById(eventId)!;
    if (event.status === "cancelled") throw new HttpError("CONFLICT", "This event has been cancelled");
    if (status === "cancelled") {
      store.cancelEvent(event);
      audit(store, staff, "Cancelled event", event.title, reason);
    } else if (status === "postponed") {
      if (event.status === "postponed") throw new HttpError("CONFLICT", "This event is already postponed");
      event.status = "postponed";
      event.statusLabel = "Postponed";
      for (const ticket of store.tickets.values()) {
        if (ticket.eventId !== event.id || ticket.status !== "valid") continue;
        store.notify(ticket.userId, {
          kind: "event",
          title: `${event.title} has been postponed`,
          body: "Keep your tickets for the new date, or get a full refund — including fees — within 7 days.",
          href: "/refunds",
          imageUrl: event.imageUrl,
        });
      }
      audit(store, staff, "Postponed event", event.title, reason);
    } else {
      if (event.status !== "postponed") throw new HttpError("CONFLICT", "Only postponed events can go back on sale");
      event.status = "on_sale";
      event.statusLabel = "On sale";
      audit(store, staff, "Put event back on sale", event.title, reason);
    }
  }

  /* ---------- Organiser requests ---------- */

  router.post("/staff/events/:id/requests", allow("events:request"), (req, res) => {
    const staff = staffOf(res);
    const event = eventFor(req, res);
    const body = parseBody(createEventRequestSchema, req);
    if ([...store.eventRequests.values()].some((r) => r.eventId === event.id && r.status === "pending")) {
      throw new HttpError("CONFLICT", "There's already a request waiting for this event");
    }
    if (event.status === "cancelled") throw new HttpError("CONFLICT", "This event has been cancelled");
    const request = {
      id: store.id("req"),
      eventId: event.id,
      eventTitle: event.title,
      organizerName: organizerOf(event).name,
      requestedBy: staff.name,
      type: body.type,
      reason: body.reason,
      status: "pending" as const,
      createdAt: store.now().toISOString(),
    };
    store.eventRequests.set(request.id, request);
    audit(store, staff, body.type === "cancel" ? "Requested cancellation" : "Requested postponement", event.title, body.reason);
    res.status(201).json(request);
  });

  router.get("/staff/requests", allow("events:read"), (_req, res) => {
    const staff = staffOf(res);
    const visible = new Set(visibleEvents(store, staff).map((e) => e.id));
    const list = [...store.eventRequests.values()].filter((r) => visible.has(r.eventId));
    res.json(list.sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
  });

  const pendingRequest = (req: Request) => {
    const request = store.eventRequests.get(param(req, "id"));
    if (!request) throw notFound("Request");
    if (request.status !== "pending") throw new HttpError("CONFLICT", "This request has already been decided");
    return request;
  };

  router.post("/staff/requests/:id/approve", allow("requests:review"), (req, res) => {
    const staff = staffOf(res);
    const request = pendingRequest(req);
    const { note } = parseBody(decisionSchema, req);
    applyStatus(request.eventId, request.type === "cancel" ? "cancelled" : "postponed", request.reason, staff);
    Object.assign(request, { status: "approved", decidedBy: staff.name, ...(note ? { decisionNote: note } : {}) });
    res.json(request);
  });

  router.post("/staff/requests/:id/reject", allow("requests:review"), (req, res) => {
    const staff = staffOf(res);
    const request = pendingRequest(req);
    const { reason } = parseBody(rejectionSchema, req);
    Object.assign(request, { status: "rejected", decidedBy: staff.name, decisionNote: reason });
    audit(store, staff, "Rejected organiser request", request.eventTitle, reason);
    res.json(request);
  });

  /* ---------- Orders ---------- */

  router.get("/staff/orders", allow("orders:read"), (req, res) => {
    const visible = new Set(visibleEvents(store, staffOf(res)).map((e) => e.slug));
    const q = typeof req.query.q === "string" ? req.query.q.trim().toLowerCase() : "";
    const rows: StaffOrderRow[] = [...store.orders.values()]
      .filter((o) => visible.has(o.eventSlug))
      .map((o) => {
        const user = store.users.get(o.userId);
        store.refreshOrder(o);
        return {
          id: o.id,
          reference: o.reference,
          customer: user?.fullName ?? "—",
          phoneMasked: user?.phoneMasked ?? "",
          eventTitle: o.eventTitle,
          eventId: store.eventBySlug(o.eventSlug)?.id ?? "",
          tickets: o.tickets.length,
          total: o.total,
          method: o.payment.method,
          status: o.status,
          statusLabel: ORDER_STATUS_LABELS[o.status] ?? o.status,
          createdAt: o.createdAt,
        };
      })
      .filter((o) => !q || [o.reference, o.customer, o.eventTitle, o.phoneMasked].some((v) => v.toLowerCase().includes(q)))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    res.json(rows);
  });

  /* ---------- Fans ---------- */

  const fanRow = (user: StoredUser): FanAccountRow => {
    const orders = [...store.orders.values()].filter((o) => o.userId === user.id && o.status === "paid");
    return {
      id: user.id,
      fullName: user.fullName,
      initials: user.initials,
      ...(user.avatarUrl ? { avatarUrl: user.avatarUrl } : {}),
      phoneMasked: user.phoneMasked,
      ...(user.email ? { email: user.email } : {}),
      fanIdStatus: store.refreshUser(user).fanId.status,
      orders: orders.length,
      tickets: [...store.tickets.values()].filter((t) => t.userId === user.id).length,
      spent: orders.reduce((n, o) => n + o.total, 0),
      suspended: !!user.suspended,
    };
  };

  router.get("/staff/fans", allow("users:read"), (req, res) => {
    const q = typeof req.query.q === "string" ? req.query.q.trim().toLowerCase() : "";
    const rows = [...store.users.values()]
      .map(fanRow)
      .filter((u) => !q || [u.fullName, u.phoneMasked, u.email ?? ""].some((v) => v.toLowerCase().includes(q)));
    res.json(rows.sort((a, b) => a.fullName.localeCompare(b.fullName)));
  });

  const fanFor = (req: Request) => {
    const user = store.users.get(param(req, "id"));
    if (!user) throw notFound("Account");
    return user;
  };

  router.post("/staff/fans/:id/suspend", allow("users:manage"), (req, res) => {
    const user = fanFor(req);
    const { reason } = parseBody(rejectionSchema, req);
    user.suspended = true;
    for (const [token, userId] of store.sessions) if (userId === user.id) store.sessions.delete(token);
    audit(store, staffOf(res), "Suspended account", user.fullName, reason);
    res.json(fanRow(user));
  });

  router.post("/staff/fans/:id/reactivate", allow("users:manage"), (req, res) => {
    const user = fanFor(req);
    user.suspended = false;
    audit(store, staffOf(res), "Reactivated account", user.fullName);
    res.json(fanRow(user));
  });

  /* ---------- Fan ID reviews ---------- */

  const review = (user: StoredUser): FanIdReview => {
    const sub = user.fanIdSubmission;
    const files = user.fanIdFiles;
    return {
      userId: user.id,
      fullName: user.fullName,
      initials: user.initials,
      phoneMasked: user.phoneMasked,
      submittedAt: sub?.submittedAt ?? (user.fanId.status === "pending" ? user.fanId.submittedAt : store.now().toISOString()),
      documentType: sub?.documentType ?? "national_id",
      nameEn: sub?.nameEn ?? user.fullName,
      nameAr: sub?.nameAr ?? "الاسم كما في الوثيقة",
      idNumberMasked: sub?.idNumberMasked ?? "2 98 •••• •••• 21",
      documentImageUrl: files?.front
        ? `/api/staff/fan-ids/${user.id}/files/front`
        : (sub?.documentImageUrl ?? "/images/kyc/national-id.svg"),
      selfieImageUrl: files?.selfie ? `/api/staff/fan-ids/${user.id}/files/selfie` : (sub?.selfieImageUrl ?? "/images/kyc/national-id.svg"),
      matchScore: sub?.matchScore ?? 0.9,
      flags: sub?.flags ?? [],
    };
  };

  router.get("/staff/fan-ids", allow("fanid:review"), (_req, res) => {
    const pending = [...store.users.values()].map((u) => store.refreshUser(u)).filter((u) => u.fanId.status === "pending");
    res.json(pending.map(review).sort((a, b) => a.submittedAt.localeCompare(b.submittedAt)));
  });

  router.get("/staff/fan-ids/:id/files/:kind", allow("fanid:review"), (req, res) => {
    const file = fanFor(req).fanIdFiles?.[param(req, "kind") as "front" | "back" | "selfie"];
    if (!file) throw notFound("Photo");
    res.setHeader("Cache-Control", "no-store");
    res.type(file.type).send(file.data);
  });

  const pendingFan = (req: Request) => {
    const user = store.refreshUser(fanFor(req));
    if (user.fanId.status !== "pending") throw new HttpError("CONFLICT", "This Fan ID has already been decided");
    return user;
  };

  router.post("/staff/fan-ids/:id/approve", allow("fanid:review"), (req, res) => {
    const user = pendingFan(req);
    store.approveFanId(user);
    audit(store, staffOf(res), "Approved Fan ID", user.fullName);
    res.json(fanRow(user));
  });

  router.post("/staff/fan-ids/:id/reject", allow("fanid:review"), (req, res) => {
    const user = pendingFan(req);
    const { reason } = parseBody(rejectionSchema, req);
    user.fanId = { status: "none" };
    user.fanIdReviewAt = undefined;
    user.fanIdSubmission = undefined;
    user.fanIdFiles = undefined;
    store.notify(user.id, {
      kind: "fan_id",
      title: "We couldn't approve your Fan ID",
      body: `${reason} Please try again with clear photos.`,
      href: "/fan-id",
    });
    audit(store, staffOf(res), "Rejected Fan ID", user.fullName, reason);
    res.json(fanRow(user));
  });

  /* ---------- Refunds ---------- */

  const refundRow = (refund: StoredRefund): RefundReview => {
    const user = store.users.get(refund.userId);
    return {
      id: refund.id,
      reference: refund.reference,
      customer: user?.fullName ?? "—",
      eventTitle: refund.eventTitle,
      ...(refund.imageUrl ? { imageUrl: refund.imageUrl } : {}),
      detail: refund.detail,
      reason: refund.detail.split("reason: ")[1] ?? (refund.requestedLabel === "AUTOMATIC" ? "Event cancelled or postponed" : "—"),
      amount: refund.amount,
      destination: refund.destination,
      status: refund.status,
      statusLabel: refund.statusLabel,
      requestedAt: refund.requestedAt ?? store.now().toISOString(),
    };
  };

  router.get("/staff/refunds", allow("refunds:review"), (req, res) => {
    const status = typeof req.query.status === "string" ? req.query.status : undefined;
    const rows = [...store.refunds.values()].filter((r) => !status || r.status === status).map(refundRow);
    res.json(rows.sort((a, b) => b.requestedAt.localeCompare(a.requestedAt)));
  });

  const reviewableRefund = (req: Request) => {
    const refund = store.refunds.get(param(req, "id"));
    if (!refund) throw notFound("Refund");
    if (refund.status !== "in_review") throw new HttpError("CONFLICT", "This refund has already been decided");
    return refund;
  };

  router.post("/staff/refunds/:id/approve", allow("refunds:review"), (req, res) => {
    const refund = reviewableRefund(req);
    const today = store.now().toISOString();
    refund.status = "refunded";
    refund.statusLabel = "Refunded";
    refund.canCancel = false;
    refund.secondaryAction = "Download refund receipt";
    refund.noteTone = "success";
    refund.note = "Approved — your tickets are cancelled and the money is on its way.";
    refund.steps = refund.steps.map((s, i) => ({ ...s, state: "done", ...(i === 2 ? { when: dayjs(today).format("D MMM, HH:mm") } : {}) }));
    refund.ticketIds.forEach((id) => {
      const ticket = store.tickets.get(id);
      if (ticket) ticket.status = "refunded";
    });
    const user = store.users.get(refund.userId);
    if (user && refund.destination === "To Matchpass credit") user.credit += refund.amount;
    store.notify(refund.userId, {
      kind: "refund",
      title: "Your refund is approved",
      body: `${refund.eventTitle} · ${refund.reference}`,
      href: "/refunds",
      imageUrl: refund.imageUrl,
    });
    audit(store, staffOf(res), "Approved refund", refund.reference, refund.eventTitle);
    res.json(refundRow(refund));
  });

  router.post("/staff/refunds/:id/reject", allow("refunds:review"), (req, res) => {
    const refund = reviewableRefund(req);
    const { reason } = parseBody(rejectionSchema, req);
    refund.status = "rejected";
    refund.statusLabel = "Not approved";
    refund.canCancel = false;
    refund.secondaryAction = "Contact support";
    refund.noteTone = "danger";
    refund.note = reason;
    refund.steps = [
      refund.steps[0]!,
      { label: "Not approved", when: dayjs(store.now()).format("D MMM, HH:mm"), state: "failed" },
      { label: "Approved", when: "—", state: "todo" },
      { label: "Money sent", when: "—", state: "todo" },
    ];
    refund.ticketIds.forEach((id) => {
      const ticket = store.tickets.get(id);
      if (ticket?.status === "refund_pending") ticket.status = "valid";
    });
    store.notify(refund.userId, {
      kind: "refund",
      title: "Your refund wasn't approved",
      body: `${refund.reference} · your tickets are still valid.`,
      href: "/refunds",
      imageUrl: refund.imageUrl,
    });
    audit(store, staffOf(res), "Rejected refund", refund.reference, reason);
    res.json(refundRow(refund));
  });

  /* ---------- Entry (match-day check-in) ---------- */

  const entrySummary = (eventId: string): EntrySummary => {
    const event = store.eventById(eventId)!;
    const scans = store.entryScans.filter((s) => s.eventId === eventId);
    const gates = new Map<string, number>();
    for (const s of scans) if (s.result === "admitted") gates.set(s.gate, (gates.get(s.gate) ?? 0) + 1);
    return {
      eventId,
      eventTitle: event.title,
      sold: performance(store, event).sold,
      checkedIn: checkedIn(store, eventId),
      gates: [...gates.entries()].map(([gate, n]) => ({ gate, checkedIn: n })).sort((a, b) => a.gate.localeCompare(b.gate)),
      recent: scans
        .slice(-15)
        .reverse()
        .map(({ eventId: _e, ticketId: _t, ...s }) => s),
    };
  };

  router.get("/staff/events/:id/entry", allow("entry:read"), (req, res) => {
    res.json(entrySummary(eventFor(req, res).id));
  });

  /** Gate staff scan the rotating QR from the fan's phone; each ticket gets in once. */
  router.post("/staff/entry/scan", allow("entry:scan"), (req, res) => {
    const staff = staffOf(res);
    const body = parseBody(gateScanRequestSchema, req);
    const event = visibleEvents(store, staff).find((e) => e.id === body.eventId);
    if (!event) throw notFound("Event");
    const verdict = store.verifyQr(body.token);
    const ticket = verdict.ok ? store.tickets.get(verdict.ticketId) : undefined;
    let result: StoredScan["result"];
    if (!verdict.ok) result = verdict.reason === "expired" ? "expired" : "invalid";
    else if (!ticket || ticket.eventId !== event.id) result = "invalid";
    else if (store.entryScans.some((s) => s.ticketId === ticket.id && s.result === "admitted")) result = "already_used";
    else if (ticket.status !== "valid") result = "not_valid";
    else result = "admitted";
    const scan: StoredScan = {
      id: store.id("scan"),
      at: store.now().toISOString(),
      eventId: event.id,
      ...(ticket ? { ticketId: ticket.id } : {}),
      ticketCode: ticket?.code ?? "—",
      holderName: ticket?.holderName ?? "—",
      gate: body.gate,
      result,
      resultLabel: scanResultLabels[result],
    };
    store.entryScans.push(scan);
    const { eventId: _e, ticketId: _t, ...publicScan } = scan;
    res.status(result === "admitted" ? 200 : 409).json({ scan: publicScan, summary: entrySummary(event.id) });
  });

  // Development only: a live QR for a valid ticket of the event, to try the scanner without a phone.
  if (options.enableTestRoutes) {
    router.get("/staff/events/:id/entry/sample-token", allow("entry:scan"), (req, res) => {
      const event = eventFor(req, res);
      const admitted = new Set(store.entryScans.filter((s) => s.result === "admitted").map((s) => s.ticketId));
      const ticket = [...store.tickets.values()].find((t) => t.eventId === event.id && t.status === "valid" && !admitted.has(t.id));
      if (!ticket) throw new HttpError("NOT_FOUND", "No ticket left to scan for this event");
      res.json({ token: store.signQr(ticket.id, store.qrWindow()), ticketCode: ticket.code, holderName: ticket.holderName });
    });
  }

  /* ---------- Organisers and payouts ---------- */

  router.get("/staff/organizers", allow("organizers:read"), (_req, res) => {
    const rows: OrganizerRow[] = ORGANIZERS.map((org) => {
      const events = store.events.filter((e) => organizerOf(e).id === org.id);
      const perf = events.map((e) => performance(store, e));
      const due = payouts(store, new Set([org.id])).find((p) => p.status === "scheduled");
      return {
        id: org.id,
        name: org.name,
        ...(org.logoUrl ? { logoUrl: org.logoUrl } : {}),
        events: events.length,
        ticketsSold: perf.reduce((n, e) => n + e.sold, 0),
        revenue: perf.reduce((n, e) => n + e.revenue, 0),
        payoutDue: due?.net ?? 0,
      };
    });
    res.json(rows);
  });

  router.get("/staff/payouts", allow("payouts:read"), (_req, res) => {
    const staff = staffOf(res);
    const ids = staff.role === "organizer" ? new Set([staff.organizerId!]) : new Set(ORGANIZERS.map((o) => o.id));
    res.json(payouts(store, ids));
  });

  /* ---------- Audit ---------- */

  router.get("/staff/audit", allow("audit:read"), (_req, res) => res.json(store.audit.slice(0, 200)));

  return router;
}

const ORDER_STATUS_LABELS: Record<string, string> = {
  paid: "Paid",
  pending_payment: "Waiting for payment",
  payment_failed: "Payment failed",
  expired: "Expired",
};
