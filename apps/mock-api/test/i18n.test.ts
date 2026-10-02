import { writeFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { EVENT_IDS } from "../src/data/catalog";
import { STAFF_ACCOUNTS, STAFF_PASSWORD } from "../src/data/staff";
import { setup } from "./helpers";

/** People's names and codes stay as entered — they're data, not interface text. */
const PEOPLE = /^(Omar|Youssef|Mariam|Hassan|Karim|Sara|Nadia|Tarek|Hany|Dina|Laila|Ahmed|Salma)\b/;
const RAW = [
  /^[A-Z]{2,4}$/, // team codes, formats (IMAX), "VIP"
  /^[A-Z]{1,2}\d{0,2}$/, // blocks and rows: W3, L
  /^(MP|RF|MPQ1)[-.]/, // order, refund references, QR tokens
  /@/, // emails
  /^\/|^https?:/, // links
  /^EG\d/, // IBANs
  /^#[0-9A-F]{3,8}$/i, // colours
  /^PG(-13)?$/, // film ratings
  /^\+?\d[\d\s•.-]*$/, // numbers, masked phones
];
const ALLOWED_WORDS =
  /\b(VIP|IMAX|QR|IBAN|Fan ID|EG|MP|A|B|C|D|J|Matchpass|Paymob|MockPay|InstaPay|Fawry|myFawry|Visa|Mastercard|Meeza)\b/g;

/** Strings in an Arabic response that are still English. */
function english(value: unknown, path = "", found = new Map<string, string>()) {
  if (typeof value === "string") {
    const text = value.trim();
    if (PEOPLE.test(text) || RAW.some((r) => r.test(text))) return found;
    const words = text.replace(ALLOWED_WORDS, "").replace(/[A-Z]+\d+/g, "");
    if (/[A-Za-z]{3,}/.test(words)) found.set(text, path);
  } else if (Array.isArray(value)) value.forEach((v, i) => english(v, `${path}[${i}]`, found));
  else if (value && typeof value === "object") {
    for (const [k, v] of Object.entries(value)) {
      if (["fullName", "holderName", "fromName", "nameEn", "name"].includes(k) && typeof v === "string" && PEOPLE.test(v)) continue;
      if (RAW_KEYS_FOR_TEST.has(k)) continue;
      english(v, `${path}.${k}`, found);
    }
  }
  return found;
}

/** Same raw keys the localizer skips (ids, codes, enums) — checked separately. */
const RAW_KEYS_FOR_TEST = new Set([
  "id",
  "slug",
  "eventSlug",
  "code",
  "reference",
  "token",
  "href",
  "redirectUrl",
  "backHref",
  "imageUrl",
  "logoUrl",
  "avatarUrl",
  "email",
  "status",
  "kind",
  "layout",
  "theme",
  "variant",
  "category",
  "categories",
  "city",
  "cities",
  "phase",
  "method",
  "availability",
  "state",
  "tone",
  "noteTone",
  "direction",
  "transferMode",
  "type",
  "side",
  "format",
  "startsAt",
  "endsAt",
  "createdAt",
  "expiresAt",
  "saleOpensAt",
  "eventId",
  "orderId",
  "holdId",
  "ticketId",
  "listingId",
  "showtimeId",
  "zoneId",
  "tierId",
  "fanId",
  "verificationId",
  "scanId",
  "seats",
  "short",
  "date",
  "time",
  "number",
  "promoCode",
  "eventKind",
  "path",
  "organizerId",
  "result",
  "documentType",
  "fanIdStatus",
  "ticketCode",
  "payDate",
  "at",
  "requestedAt",
  "role",
  "permissions",
  "phoneMasked",
  "idNumberMasked",
  "actor",
  "customer",
  "requestedBy",
  "decidedBy",
  "holderName",
  "initials",
  "nameEn",
  "userId",
]);

const AR = { "Accept-Language": "ar" };

/** Drives the main fan flows in Arabic and returns every response body, so nothing is missed. */
async function crawl() {
  const { api, login, auth, store, advance } = setup();
  const bodies: unknown[] = [];
  const get = async (path: string, token?: string) => {
    const res = await api.get(path).set({ ...AR, ...(token ? auth(token) : {}) });
    bodies.push(res.body);
    return res.body;
  };
  const post = async (path: string, body: object, token?: string) => {
    const res = await api
      .post(path)
      .set({ ...AR, ...(token ? auth(token) : {}) })
      .send(body);
    bodies.push(res.body);
    return res.body;
  };

  const omar = await login();
  const youssef = await login("1098765432");
  const karim = await login("1155555555");
  await get("/api/home");
  for (const tab of ["matches", "concerts", "cinema"]) await get(`/api/events?tab=${tab}`);
  for (const event of store.events) {
    await get(`/api/events/${event.slug}`);
    await get(`/api/events/${event.slug}/seatmap`, omar);
    await get(`/api/events/${event.slug}/resale`, omar);
    await get(`/api/events/${event.slug}/fan-eligibility`, omar);
  }
  const film = store.events.find((e) => e.kind === "cinema")!;
  const map = (await get(`/api/events/${film.slug}/seatmap`, omar)) as { showtimes: { id: string }[] };
  await get(`/api/events/${film.slug}/showtimes/${map.showtimes[0]!.id}/seats`, omar);

  for (const token of [omar, youssef, karim]) {
    await get("/api/me", token);
    await get("/api/me/notifications", token);
    await get("/api/alerts", token);
    await get("/api/tickets", token);
    await get("/api/tickets?scope=past", token);
    await get("/api/refunds", token);
    await get("/api/resale/listings", token);
    await get("/api/transfers", token);
  }

  // Buy: a match zone (card, then wallet), concert tickets (Fawry), cinema seats (InstaPay).
  const zone = (await post("/api/holds", { type: "zone", eventId: EVENT_IDS.canalCup, zoneId: "cat1", fanIds: ["fan_mariam"] }, omar)) as {
    id: string;
  };
  await post(`/api/holds/${zone.id}/promo`, { code: "MATCHPASS10" }, omar);
  await get(`/api/holds/${zone.id}`, omar);
  const card = (await post("/api/orders", { holdId: zone.id, payment: { method: "card" }, acceptTerms: true }, omar)) as {
    id: string;
    payment: { redirectUrl: string };
  };
  await get(`/api/orders/${card.id}`, omar);
  await api
    .post(card.payment.redirectUrl)
    .type("form")
    .send({ cardNumber: "4242 4242 4242 4242", expiry: "12 / 49", cvc: "123", nameOnCard: "Omar" });
  const paid = (await get(`/api/orders/${card.id}`, omar)) as { tickets: { id: string }[] };
  await get(`/api/tickets/${paid.tickets[0]!.id}`, omar);

  const felucca = (await post(
    "/api/holds",
    { type: "ticket_types", eventId: EVENT_IDS.felucca, items: [{ ticketTypeId: "ga", quantity: 2 }] },
    omar,
  )) as {
    id: string;
  };
  const fawry = (await post("/api/orders", { holdId: felucca.id, payment: { method: "fawry" }, acceptTerms: true }, omar)) as {
    id: string;
  };
  await get(`/api/orders/${fawry.id}`, omar);

  const seats = (await get(`/api/events/${film.slug}/showtimes/${map.showtimes[0]!.id}/seats`, omar)) as {
    rows: { label: string; seats: string }[];
  };
  const row = seats.rows.find((r) => r.seats.includes("a"))!;
  const seat = `${row.label}-${row.seats.indexOf("a") + 1}`;
  const cinemaHold = (await post(
    "/api/holds",
    { type: "seats", eventId: film.id, showtimeId: map.showtimes[0]!.id, seatIds: [seat] },
    omar,
  )) as { id: string };
  const instapay = (await post("/api/orders", { holdId: cinemaHold.id, payment: { method: "instapay" }, acceptTerms: true }, omar)) as {
    id: string;
  };
  await get(`/api/orders/${instapay.id}`, omar);
  advance(10 * 60_000);
  await get(`/api/orders/${instapay.id}`, omar);

  // After-sales: refund options and a refund, a resale listing, a transfer accepted by the recipient.
  const tickets = (await get("/api/tickets", omar)) as {
    id: string;
    orderId: string;
    refundable: boolean;
    resaleAllowed: boolean;
    eventKind: string;
  }[];
  const refundable = tickets.find((t) => t.refundable);
  if (refundable) {
    await get(`/api/orders/${refundable.orderId}/refund-options`, omar);
    await post(
      "/api/refunds",
      { orderId: refundable.orderId, ticketIds: [refundable.id], reason: "other", details: "x", method: "credit", acknowledge: true },
      omar,
    );
    await get("/api/refunds", omar);
  }
  const resellable = tickets.find((t) => t.resaleAllowed && t.id !== refundable?.id);
  if (resellable) await post("/api/resale/listings", { ticketId: resellable.id, price: 50, payoutMethod: "wallet" }, omar);
  const match = tickets.find((t) => t.eventKind === "match" && t.id !== resellable?.id);
  if (match) {
    await post(`/api/tickets/${match.id}/transfer`, { mode: "fan_id", recipient: "2210 4417 1907" }, omar);
    const incoming = (await get("/api/transfers", youssef)) as { incoming: { id: string }[] };
    if (incoming.incoming[0]) await post(`/api/transfers/${incoming.incoming[0].id}/accept`, {}, youssef);
    await get("/api/me/notifications", omar);
    await get("/api/tickets", youssef);
  }

  // Queue, Fan ID, account and every kind of error.
  const queue = (await post("/api/queue", { eventId: EVENT_IDS.derby }, omar)) as { id: string };
  await get(`/api/queue/${queue.id}`, omar);
  advance(60 * 60_000);
  await get(`/api/queue/${queue.id}`, omar);
  await post("/api/auth/login", { phone: "1012345482", password: "wrong-password" });
  await post("/api/auth/signup", { fullName: "x", phone: "1", password: "1" });
  await post("/api/auth/signup", { fullName: "Sara Ahmed", phone: "1012345482", password: "supersecret", acceptTerms: true });
  await post("/api/holds", { type: "zone", eventId: EVENT_IDS.derby, zoneId: "away", fanIds: ["fan_omar"] }, omar);
  await post("/api/holds", { type: "zone", eventId: EVENT_IDS.soldOut, zoneId: "cat1", fanIds: ["fan_omar"] }, omar);
  await post("/api/events/layla-nour-live-in-cairo/presale", { code: "WRONG1" }, omar);
  await get("/api/events/nope");
  await get("/api/nope");
  await get("/api/tickets");
  return bodies;
}

describe("Arabic API content", () => {
  it("leaves no English in Arabic responses across the fan flows", async () => {
    const bodies = await crawl();
    const found = new Map<string, string>();
    bodies.forEach((body, i) => english(body, `#${i}`, found));
    if (process.env.DUMP_UNTRANSLATED) writeFileSync(process.env.DUMP_UNTRANSLATED, JSON.stringify([...found.keys()], null, 1));
    expect([...found.entries()].map(([text, path]) => `${text}   (${path})`)).toEqual([]);
  });

  it("keeps English responses byte-identical and ids, codes and links untouched in Arabic", async () => {
    const { api, login, auth } = setup();
    const token = await login();
    const en = await api.get("/api/tickets").set(auth(token));
    const plain = await api.get("/api/tickets").set({ ...auth(token), "Accept-Language": "en-GB,en" });
    expect(plain.body).toEqual(en.body);
    const ar = await api.get("/api/tickets").set({ ...auth(token), ...AR });
    expect(ar.headers["content-language"]).toBe("ar");
    expect(ar.body.map((t: { id: string; code: string; status: string }) => [t.id, t.code, t.status])).toEqual(
      en.body.map((t: { id: string; code: string; status: string }) => [t.id, t.code, t.status]),
    );
    expect(ar.body[0].title).not.toBe(en.body[0].title);
  });

  it("translates validation errors and error messages", async () => {
    const { api } = setup();
    const res = await api.post("/api/auth/login").set(AR).send({ phone: "12", password: "" }).expect(400);
    expect(JSON.stringify(res.body)).not.toMatch(/Enter your password/);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });
});

/** Every dashboard screen, for each role, plus the actions that write audit entries and notifications. */
async function crawlStaff() {
  const { api, login, auth } = setup();
  const bodies: unknown[] = [];
  const signIn = async (email: string) => {
    const res = await api.post("/api/staff/auth/login").set(AR).send({ email, password: STAFF_PASSWORD });
    bodies.push(res.body);
    return { Authorization: `Bearer ${res.body.token}` };
  };
  const get = async (path: string, h: object) => {
    const res = await api.get(path).set({ ...AR, ...h });
    bodies.push(res.body);
    return res.body;
  };
  const post = async (path: string, body: object, h: object) => {
    const res = await api
      .post(path)
      .set({ ...AR, ...h })
      .send(body);
    bodies.push(res.body);
    return res.body;
  };
  await post("/api/staff/auth/login", { email: STAFF_ACCOUNTS.admin, password: "wrong" }, {});
  await post("/api/staff/auth/login", { email: "x", password: "" }, {});
  const admin = await signIn(STAFF_ACCOUNTS.admin);
  const ops = await signIn(STAFF_ACCOUNTS.operations);
  const club = await signIn(STAFF_ACCOUNTS.organizer);
  const promoter = await signIn(STAFF_ACCOUNTS.promoter);
  for (const h of [admin, ops, club, promoter]) {
    await get("/api/staff/me", h);
    await get("/api/staff/overview", h);
    const events = (await get("/api/staff/events", h)) as { eventId: string }[];
    for (const e of events) {
      await get(`/api/staff/events/${e.eventId}`, h);
      await get(`/api/staff/events/${e.eventId}/entry`, h);
    }
    await get("/api/staff/orders", h);
    await get("/api/staff/payouts", h);
    await get("/api/staff/requests", h);
  }
  await get("/api/staff/fans", admin);
  await get("/api/staff/fan-ids", ops);
  await get("/api/staff/refunds", ops);
  await get("/api/staff/organizers", admin);
  await get("/api/staff/audit", admin);
  await get("/api/staff/fans", club);

  const fan = await login();
  const tickets = (await api.get("/api/tickets").set(auth(fan))).body as {
    id: string;
    eventId: string;
    eventKind: string;
    qrReady: boolean;
  }[];
  const film = tickets.find((t) => t.eventKind === "cinema" && t.qrReady)!;
  const qr = (await api.get(`/api/tickets/${film.id}/qr`).set(auth(fan))).body as { token: string };
  await post("/api/staff/entry/scan", { eventId: film.eventId, gate: "Screen 4", token: qr.token }, ops);
  await post("/api/staff/entry/scan", { eventId: film.eventId, gate: "Screen 4", token: qr.token }, ops);
  await post("/api/staff/entry/scan", { eventId: film.eventId, gate: "Screen 4", token: "MPQ1.fake.sig" }, ops);
  await post("/api/staff/fan-ids/usr_laila/approve", {}, ops);
  await post("/api/staff/fan-ids/usr_ahmed/reject", { reason: "" }, ops);
  await post("/api/staff/fan-ids/usr_ahmed/reject", { reason: "The ID photo is too blurry to read." }, ops);
  const refunds = (await get("/api/staff/refunds?status=in_review", ops)) as { id: string }[];
  if (refunds[0]) await post(`/api/staff/refunds/${refunds[0].id}/approve`, {}, ops);
  await post(`/api/staff/events/${EVENT_IDS.layla}/status`, { status: "postponed", reason: "Stage repairs" }, ops);
  await post(`/api/staff/events/${EVENT_IDS.layla}/status`, { status: "postponed", reason: "Stage repairs" }, admin);
  await post(`/api/staff/events/${EVENT_IDS.layla}/status`, { status: "cancelled", reason: "The artist is ill" }, admin);
  await post(`/api/staff/events/${EVENT_IDS.felucca}/requests`, { type: "cancel", reason: "The band split up." }, promoter);
  await post(`/api/staff/events/${EVENT_IDS.felucca}/requests`, { type: "cancel", reason: "Again please" }, promoter);
  await post("/api/staff/requests/req_desert_postpone/reject", { reason: "Keep the date, we can help with travel." }, admin);
  await post("/api/staff/fans/usr_omar/suspend", { reason: "Touting tickets above face value." }, admin);
  await post("/api/auth/login", { phone: "1012345482", password: "matchpass123" }, {});
  await post("/api/staff/fans/usr_omar/reactivate", {}, admin);
  await get("/api/staff/audit", admin);
  await get("/api/staff/events/nope", admin);
  await get("/api/staff/me", {});
  const laila = await login("1023456789");
  await get("/api/me/notifications", auth(laila));
  const ahmed = await login("1234567890");
  await get("/api/me/notifications", auth(ahmed));
  await get("/api/me/notifications", auth(fan));
  await get("/api/refunds", auth(fan));
  return bodies;
}

describe("Arabic dashboard content", () => {
  it("leaves no English in Arabic staff responses (people's names and free-text reasons aside)", async () => {
    const bodies = await crawlStaff();
    const found = new Map<string, string>();
    bodies.forEach((body, i) => english(body, `#${i}`, found));
    // Reasons typed by staff are shown as written, like any user content.
    for (const typed of [
      "Stage repairs",
      "The artist is ill",
      "The band split up.",
      "Keep the date, we can help with travel.",
      "Touting tickets above face value.",
      "The ID photo is too blurry to read.",
    ]) {
      for (const text of [...found.keys()]) if (text.includes(typed)) found.delete(text);
    }
    if (process.env.DUMP_UNTRANSLATED) writeFileSync(process.env.DUMP_UNTRANSLATED, JSON.stringify([...found.keys()], null, 1));
    expect([...found.entries()].map(([text, path]) => `${text}   (${path})`)).toEqual([]);
  });
});

describe("Arabic search and payment page", () => {
  it("finds events by their Arabic names, ignoring letter variants", async () => {
    const { api } = setup();
    const res = await api.get(`/api/events?tab=matches&q=${encodeURIComponent("نادي النيل")}`).expect(200);
    expect(res.body.items.map((e: { slug: string }) => e.slug).sort()).toEqual(["nile-fc-vs-canal-united", "nile-fc-vs-delta-sc"]);
    const hamza = await api.get(`/api/events?tab=matches&q=${encodeURIComponent("ميناء الاسكندرية")}`).expect(200);
    expect(hamza.body.items).toHaveLength(1);
  });

  it("opens the card page in the fan's language and keeps it on the form post", async () => {
    const { api, login, auth } = setup();
    const token = await login();
    const hold = await api
      .post("/api/holds")
      .set(auth(token))
      .send({ type: "zone", eventId: EVENT_IDS.canalCup, zoneId: "cat1", fanIds: ["fan_mariam"] });
    const order = await api
      .post("/api/orders")
      .set({ ...auth(token), ...AR })
      .send({ holdId: hold.body.id, payment: { method: "card" }, acceptTerms: true });
    expect(order.body.payment.redirectUrl).toMatch(/\?lang=ar$/);
    const page = await api.get(order.body.payment.redirectUrl).expect(200);
    expect(page.text).toContain('lang="ar-EG" dir="rtl"');
    expect(page.text).toContain("رقم البطاقة");
    expect(page.text).toMatch(/action="[^"]+\?lang=ar"/);
  });
});
