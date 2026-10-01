"use client";

import type { EventDetail, User } from "@repo/contracts";
import { WaitingRoomPage } from "@repo/design-system";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { RequireAuth } from "@/lib/auth/session";
import { errorMessage } from "@/lib/api/client";
import { useEvent, useJoinQueue, useQueueSms, useQueueStatus } from "@/lib/queries";
import { routes } from "@/lib/routes";
import { QueryPage } from "./shared";

const queueKey = (eventId: string) => `matchpass.queue.${eventId}`;
export const turnKey = (eventId: string) => `matchpass.turn.${eventId}`;

export function QueueView({ slug }: { slug: string }) {
  const event = useEvent(slug);
  return (
    <RequireAuth>
      {(user) => (
        <QueryPage query={event} loadingLabel="Opening the waiting room">
          {(data) => <Queue event={data} user={user} />}
        </QueryPage>
      )}
    </RequireAuth>
  );
}

function Queue({ event, user }: { event: EventDetail; user: User }) {
  const router = useRouter();
  const join = useJoinQueue();
  // Refreshing keeps your place; opening a new session would move you to the back.
  const [queueId, setQueueId] = useState<string | undefined>(() => sessionStorage.getItem(queueKey(event.id)) ?? undefined);
  const started = useRef(false);
  const status = useQueueStatus(queueId);
  const sms = useQueueSms(queueId);

  useEffect(() => {
    if (!event.queueEnabled) router.replace(routes.tickets(event.slug));
  }, [event, router]);

  const start = () =>
    join.mutate(event.id, {
      onSuccess: (s) => {
        sessionStorage.setItem(queueKey(event.id), s.id);
        setQueueId(s.id);
      },
    });

  useEffect(() => {
    if (started.current || !event.queueEnabled) return;
    started.current = true;
    if (!queueId) start();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- join exactly once per mount
  }, [event]);

  // A stale stored session (e.g. after the server restarted) is replaced with a fresh one.
  useEffect(() => {
    if (status.isError && queueId) {
      sessionStorage.removeItem(queueKey(event.id));
      start();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- restart only when the stored session fails
  }, [status.isError, queueId]);

  useEffect(() => {
    if (status.data?.phase === "your_turn") {
      const until = Date.now() + status.data.turnWindowMinutes * 60_000;
      if (!sessionStorage.getItem(turnKey(event.id))) sessionStorage.setItem(turnKey(event.id), new Date(until).toISOString());
    }
  }, [status.data, event.id]);

  const linked = user.linkedFans.filter((f) => f.status === "approved" && !f.isSelf).length;

  return (
    <WaitingRoomPage
      event={event}
      status={status.data}
      error={errorMessage(join.error)}
      onRetry={start}
      chooseHref={routes.tickets(event.slug)}
      leaveHref={routes.event(event.slug)}
      maskedPhone={user.phoneMasked}
      onSmsChange={(optIn) => sms.mutate(optIn)}
      readyNote={
        user.fanId.status === "approved"
          ? `Your Fan ID${linked ? ` and ${linked} linked fan${linked === 1 ? "" : "s"}` : ""} ${linked ? "are" : "is"} ready.`
          : undefined
      }
    />
  );
}
