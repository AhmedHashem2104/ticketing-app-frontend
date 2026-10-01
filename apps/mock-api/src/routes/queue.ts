import { dayjs, joinQueueRequestSchema, queueSmsRequestSchema, type QueueStatus } from "@repo/contracts";
import { Router } from "express";
import type { AppConfig } from "../config";
import type { Store, StoredQueue } from "../data/store";
import { currentUser, requireAuth } from "../http/auth";
import { HttpError, notFound } from "../http/errors";
import { param, parseBody } from "../http/validate";

export const QUEUE_TOTAL = 3412;
const WAIT_SECONDS = 6;
const LINE_SECONDS = 14;

/** Pure projection of a queue session at a point in time — the timeline is simulated. */
export function queueStatus(queue: StoredQueue, nowMs: number, scale: number): QueueStatus {
  const elapsed = Math.max(0, (nowMs - queue.createdAt) / 1000);
  const wait = WAIT_SECONDS * scale;
  const line = LINE_SECONDS * scale;
  const base = { id: queue.id, eventId: queue.eventId, total: QUEUE_TOTAL, smsOptIn: queue.smsOptIn, turnWindowMinutes: 10 };
  if (elapsed < wait) {
    return {
      ...base,
      phase: "waiting",
      opensInSeconds: Math.ceil(wait - elapsed),
      ahead: QUEUE_TOTAL,
      etaMinutes: Math.ceil(QUEUE_TOTAL / 600),
      progress: 0,
    };
  }
  const fraction = Math.min(1, (elapsed - wait) / line);
  const ahead = Math.round(QUEUE_TOTAL * (1 - fraction));
  if (ahead === 0) return { ...base, phase: "your_turn", opensInSeconds: 0, ahead: 0, etaMinutes: 0, progress: 100 };
  return {
    ...base,
    phase: "in_line",
    opensInSeconds: 0,
    ahead,
    etaMinutes: Math.max(1, Math.ceil(ahead / 600)),
    progress: Math.round(fraction * 100),
  };
}

export function queueRouter(store: Store, config: AppConfig) {
  const router = Router();
  router.use("/queue", requireAuth(store));

  const owned = (id: string, userId: string) => {
    const queue = store.queues.get(id);
    if (!queue || queue.userId !== userId) throw notFound("Queue session");
    return queue;
  };

  router.post("/queue", (req, res) => {
    const user = currentUser(res);
    const { eventId } = parseBody(joinQueueRequestSchema, req);
    const event = store.eventById(eventId);
    if (!event) throw notFound("Event");
    if (!event.queueEnabled) throw new HttpError("CONFLICT", "This event doesn't use a waiting room");
    if (event.requiresFanId && user.fanId.status !== "approved") {
      throw new HttpError("FAN_ID_REQUIRED", "You need an approved Fan ID to join the waiting room");
    }
    // Opening a second session moves you to the back: replace any existing one.
    for (const [id, q] of store.queues) if (q.userId === user.id && q.eventId === eventId) store.queues.delete(id);
    const queue: StoredQueue = { id: store.id("q"), userId: user.id, eventId, createdAt: dayjs().valueOf(), smsOptIn: false };
    store.queues.set(queue.id, queue);
    res.status(201).json(queueStatus(queue, dayjs().valueOf(), config.queueTimeScale));
  });

  router.get("/queue/:id", (req, res) => {
    const queue = owned(param(req, "id"), currentUser(res).id);
    res.json(queueStatus(queue, dayjs().valueOf(), config.queueTimeScale));
  });

  router.patch("/queue/:id", (req, res) => {
    const queue = owned(param(req, "id"), currentUser(res).id);
    queue.smsOptIn = parseBody(queueSmsRequestSchema, req).smsOptIn;
    res.json(queueStatus(queue, dayjs().valueOf(), config.queueTimeScale));
  });

  router.delete("/queue/:id", (req, res) => {
    const queue = owned(param(req, "id"), currentUser(res).id);
    store.queues.delete(queue.id);
    res.status(204).end();
  });

  return router;
}
