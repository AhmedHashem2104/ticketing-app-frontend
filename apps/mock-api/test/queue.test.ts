import { queueStatusSchema } from "@repo/contracts";
import { describe, expect, it } from "vitest";
import { EVENT_IDS } from "../src/data/catalog";
import { QUEUE_TOTAL, queueStatus } from "../src/routes/queue";
import { setup } from "./helpers";

const session = { id: "q_1", userId: "u", eventId: "e", createdAt: 0, smsOptIn: false };

describe("queueStatus timeline", () => {
  it("waits, moves through the line, then gives you your turn", () => {
    const waiting = queueStatus(session, 1_000, 1);
    expect(waiting).toMatchObject({ phase: "waiting", opensInSeconds: 5, ahead: QUEUE_TOTAL, progress: 0 });

    const midway = queueStatus(session, 13_000, 1);
    expect(midway.phase).toBe("in_line");
    expect(midway.progress).toBe(50);
    expect(midway.ahead).toBe(QUEUE_TOTAL / 2);
    expect(midway.etaMinutes).toBe(3);

    const turn = queueStatus(session, 30_000, 1);
    expect(turn).toMatchObject({ phase: "your_turn", ahead: 0, progress: 100 });
    expect(queueStatusSchema.parse(turn).turnWindowMinutes).toBe(10);
  });

  it("scales with the configured speed", () => {
    expect(queueStatus(session, 1_000, 0.1).phase).toBe("in_line");
  });
});

describe("waiting room API", () => {
  it("joins, polls and opts into SMS", async () => {
    const { api, login, auth } = setup();
    const token = await login();
    const joined = await api.post("/api/queue").set(auth(token)).send({ eventId: EVENT_IDS.derby }).expect(201);
    expect(queueStatusSchema.parse(joined.body).phase).toBe("waiting");

    await new Promise((resolve) => setTimeout(resolve, 250));
    const polled = await api.get(`/api/queue/${joined.body.id}`).set(auth(token)).expect(200);
    expect(polled.body.phase).toBe("your_turn");

    const sms = await api.patch(`/api/queue/${joined.body.id}`).set(auth(token)).send({ smsOptIn: true }).expect(200);
    expect(sms.body.smsOptIn).toBe(true);

    await api.delete(`/api/queue/${joined.body.id}`).set(auth(token)).expect(204);
    await api.get(`/api/queue/${joined.body.id}`).set(auth(token)).expect(404);
  });

  it("moves you to the back when you join again", async () => {
    const { api, login, auth, store } = setup();
    const token = await login();
    const first = await api.post("/api/queue").set(auth(token)).send({ eventId: EVENT_IDS.derby });
    const second = await api.post("/api/queue").set(auth(token)).send({ eventId: EVENT_IDS.derby });
    expect(second.body.id).not.toBe(first.body.id);
    expect(store.queues.size).toBe(1);
  });

  it("requires sign in and an approved Fan ID for matches", async () => {
    const { api, signUpNewUser, auth } = setup();
    await api.post("/api/queue").send({ eventId: EVENT_IDS.derby }).expect(401);
    const t1 = await signUpNewUser();
    const res = await api.post("/api/queue").set(auth(t1)).send({ eventId: EVENT_IDS.derby }).expect(403);
    expect(res.body.error.code).toBe("FAN_ID_REQUIRED");
  });

  it("refuses events without a waiting room and hides other people's sessions", async () => {
    const { api, login, signUpNewUser, auth } = setup();
    const token = await login();
    await api.post("/api/queue").set(auth(token)).send({ eventId: EVENT_IDS.layla }).expect(409);
    await api.post("/api/queue").set(auth(token)).send({ eventId: "evt_missing" }).expect(404);
    const joined = await api.post("/api/queue").set(auth(token)).send({ eventId: EVENT_IDS.derby });
    const t2 = await signUpNewUser();
    await api.get(`/api/queue/${joined.body.id}`).set(auth(t2)).expect(404);
  });
});
