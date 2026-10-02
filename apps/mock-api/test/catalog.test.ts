import {
  alertSchema,
  cinemaSeatsSchema,
  eventDetailSchema,
  eventsResponseSchema,
  homeResponseSchema,
  seatMapSchema,
} from "@repo/contracts";
import { describe, expect, it } from "vitest";
import { z } from "zod";
import { setup } from "./helpers";

describe("GET /api/home", () => {
  it("returns featured, on-sale and coming-soon events matching the contract", async () => {
    const { api } = setup();
    const res = await api.get("/api/home").expect(200);
    const home = homeResponseSchema.parse(res.body);
    expect(home.featured.map((e) => e.slug)).toEqual(["nile-fc-vs-delta-sc", "layla-nour-live-in-cairo"]);
    expect(home.onSale).toHaveLength(4);
    expect(home.categories[0]).toBe("All");
  });
});

describe("GET /api/events", () => {
  it("lists matches by default, sorted by date", async () => {
    const { api } = setup();
    const res = await api.get("/api/events").expect(200);
    const body = eventsResponseSchema.parse(res.body);
    expect(body.items.every((e) => e.kind === "match")).toBe(true);
    expect(body.total).toBe(6);
    const dates = body.items.map((e) => e.startsAt);
    expect([...dates].sort()).toEqual(dates);
  });

  it("lists concerts and events without cinema", async () => {
    const { api } = setup();
    const res = await api.get("/api/events?tab=concerts").expect(200);
    const kinds = new Set(res.body.items.map((e: { kind: string }) => e.kind));
    expect(kinds.has("match")).toBe(false);
    expect(kinds.has("cinema")).toBe(false);
    expect(res.body.facets.categories).toContain("Comedy");
  });

  it("filters by search text, category, city and availability", async () => {
    const { api } = setup();
    const search = await api.get("/api/events?q=capital").expect(200);
    expect(search.body.items.every((e: { venue: { name: string } }) => e.venue.name === "Capital Stadium")).toBe(true);

    const cup = await api.get("/api/events?categories=Cup").expect(200);
    expect(cup.body.items.map((e: { slug: string }) => e.slug)).toEqual(["canal-united-vs-sinai-stars"]);

    const alex = await api.get("/api/events?cities=alexandria").expect(200);
    expect(alex.body.total).toBe(1);

    const available = await api.get("/api/events?availableOnly=true").expect(200);
    expect(available.body.items.some((e: { status: string }) => e.status === "sold_out" || e.status === "coming_soon")).toBe(false);
  });

  it("filters by start date", async () => {
    const { api } = setup();
    const all = await api.get("/api/events").expect(200);
    const third = all.body.items[2].startsAt.slice(0, 10);
    const res = await api.get(`/api/events?from=${third}`).expect(200);
    expect(res.body.total).toBe(all.body.total - 2);
  });

  it("rejects invalid query parameters", async () => {
    const { api } = setup();
    const res = await api.get("/api/events?tab=films").expect(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
    expect(res.body.error.details[0].path).toBe("tab");
  });
});

describe("GET /api/events/:slug", () => {
  it("returns match details with price table and FAQ", async () => {
    const { api } = setup();
    const res = await api.get("/api/events/nile-fc-vs-delta-sc").expect(200);
    const event = eventDetailSchema.parse(res.body);
    expect(event.priceTable.map((r) => r.price)).toEqual([600, 250, 150, 75, 75]);
    expect(event.queueEnabled).toBe(true);
    expect(event.saleOpensAt).toBeDefined();
    expect(event.faqs).toHaveLength(3);
  });

  it("returns concert details with running order", async () => {
    const { api } = setup();
    const res = await api.get("/api/events/layla-nour-live-in-cairo").expect(200);
    const event = eventDetailSchema.parse(res.body);
    expect(event.priceTable.map((r) => r.price)).toEqual([450, 900, 1200, 700, 2500]);
    expect(event.runningOrder?.find((r) => r.headline)?.label).toBe("Layla Nour");
    expect(event.presaleCodeEnabled).toBe(true);
  });

  it("404s for unknown events", async () => {
    const { api } = setup();
    const res = await api.get("/api/events/nope").expect(404);
    expect(res.body.error.message).toBe("Event not found");
  });
});

describe("seat maps", () => {
  it.each([
    ["nile-fc-vs-delta-sc", "stadium"],
    ["layla-nour-live-in-cairo", "arena"],
    ["nile-philharmonic-film-classics", "hall"],
    ["the-last-lighthouse", "cinema"],
  ])("serves the %s map as %s", async (slug, layout) => {
    const { api } = setup();
    const res = await api.get(`/api/events/${slug}/seatmap`).expect(200);
    expect(seatMapSchema.parse(res.body).layout).toBe(layout);
  });

  it("builds 16 stadium blocks with the derby seats already sold", async () => {
    const { api } = setup();
    const res = await api.get("/api/events/nile-fc-vs-delta-sc/seatmap").expect(200);
    expect(res.body.blocks).toHaveLength(16);
    const w3 = res.body.blocks.find((b: { id: string }) => b.id === "W3");
    const rowL = w3.rows.find((r: { label: string }) => r.label === "L");
    expect(rowL.seats[17]).toBe("x");
    expect(res.body.zones.find((z: { id: string }) => z.id === "away").restricted).toBe(true);
  });

  it("is deterministic between requests", async () => {
    const { api } = setup();
    const a = await api.get("/api/events/nile-philharmonic-film-classics/seatmap");
    const b = await api.get("/api/events/nile-philharmonic-film-classics/seatmap");
    expect(a.body).toEqual(b.body);
  });

  it("refuses seat maps for events not on sale yet", async () => {
    const { api } = setup();
    await api.get("/api/events/egypt-vs-morocco/seatmap").expect(403);
  });

  it("serves cinema seats per showtime", async () => {
    const { api } = setup();
    const map = await api.get("/api/events/the-last-lighthouse/seatmap").expect(200);
    expect(map.body.showtimes).toHaveLength(20);
    const res = await api.get(`/api/events/the-last-lighthouse/showtimes/${map.body.showtimes[2].id}/seats`).expect(200);
    const seats = cinemaSeatsSchema.parse(res.body);
    expect(seats.rows).toHaveLength(10);
    expect(seats.rows[9]?.vip).toBe(true);
    await api.get("/api/events/the-last-lighthouse/showtimes/st_9_9/seats").expect(404);
    await api.get("/api/events/layla-nour-live-in-cairo/showtimes/st_0_0/seats").expect(404);
  });
});

describe("presale, notify and alerts", () => {
  it("validates presale codes", async () => {
    const { api } = setup();
    const ok = await api.post("/api/events/layla-nour-live-in-cairo/presale").send({ code: "layla24" }).expect(200);
    expect(ok.body).toMatchObject({ valid: true, code: "LAYLA24" });
    const wrong = await api.post("/api/events/layla-nour-live-in-cairo/presale").send({ code: "NOPE1" }).expect(400);
    expect(wrong.body.error.code).toBe("INVALID_CODE");
    await api.post("/api/events/layla-nour-live-in-cairo/presale").send({ code: "!" }).expect(400);
    await api.post("/api/events/nile-fc-vs-delta-sc/presale").send({ code: "LAYLA24" }).expect(400);
  });

  it("subscribes signed-in fans to on-sale alerts", async () => {
    const { api, login, auth, store } = setup();
    await api.post("/api/events/egypt-vs-morocco/notify").send({}).expect(401);
    const token = await login();
    const res = await api.post("/api/events/egypt-vs-morocco/notify").set(auth(token)).send({ channel: "email" }).expect(201);
    expect(res.body).toMatchObject({ subscribed: true, channel: "email" });
    expect(store.notifications.size).toBe(1);
  });

  it("warns ticket holders about postponed events", async () => {
    const { api, login, signUpNewUser, auth } = setup();
    const t1 = await login();
    const res = await api.get("/api/alerts").set(auth(t1)).expect(200);
    const alerts = z.array(alertSchema).parse(res.body);
    expect(alerts[0]?.title).toMatch(/postponed/);
    const t2 = await signUpNewUser();
    const fresh = await api.get("/api/alerts").set(auth(t2)).expect(200);
    expect(fresh.body).toEqual([]);
  });
});

describe("cinema and resale listings", () => {
  it("browses films on the cinema tab", async () => {
    const { api } = setup();
    const res = await api.get("/api/events?tab=cinema").expect(200);
    expect(res.body.items.map((e: { title: string }) => e.title).sort()).toEqual(["The Last Lighthouse", "Zamalek Nights"]);
    expect(res.body.facets.categories).toEqual(["Cinema"]);
  });

  it("shows resale offers to anyone, without seller details", async () => {
    const { api } = setup();
    const res = await api.get("/api/events/nile-philharmonic-film-classics/resale").expect(200);
    expect(res.body).toEqual([
      {
        id: "lst_resale_3",
        eventId: "evt_nile_philharmonic",
        label: "Fan resale",
        seatLabel: "Stalls · Row B · Seat 9",
        price: 550,
        faceValue: 600,
        requiresFanId: false,
      },
    ]);
    await api.get("/api/events/nope/resale").expect(404);
  });
});
