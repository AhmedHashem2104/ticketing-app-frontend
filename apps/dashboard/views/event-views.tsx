"use client";

import { can, type EventPerformance } from "@repo/contracts";
import { EmptyState, useI18n } from "@repo/design-system";
import { EntryPage, EventReportPage, EventsPage, OverviewPage } from "@repo/design-system/dashboard";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { useState } from "react";
import { errorMessage } from "@/lib/api/client";
import { staffApi, staffKeys } from "@/lib/api/staff";
import { useStaff } from "@/lib/auth";
import { scannerStore, useScanner } from "@/lib/scanner-store";
import { QueryView } from "./shared";

/** Refreshes every dashboard query after a decision, so counts, lists and reports all agree. */
export function useStaffMutation<V>(fn: (variables: V) => Promise<unknown>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => queryClient.invalidateQueries({ predicate: (q) => q.queryKey[0] === "staff" && q.queryKey[1] !== "me" }),
  });
}

export function OverviewView() {
  const staff = useStaff();
  const query = useQuery({ queryKey: staffKeys.overview, queryFn: staffApi.overview });
  return (
    <QueryView query={query}>
      {(overview) => <OverviewPage overview={overview} staffName={staff.name} viewerRole={staff.role} refreshing={query.isFetching} />}
    </QueryView>
  );
}

type EventFilter = "all" | "selling" | "sold_out" | "changed";

export function EventsView() {
  const staff = useStaff();
  const query = useQuery({ queryKey: staffKeys.events, queryFn: staffApi.events });
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<EventFilter>("all");
  return (
    <QueryView query={query}>
      {(events) => (
        <EventsPage
          events={events}
          viewerRole={staff.role}
          query={search}
          onQueryChange={setSearch}
          status={status}
          onStatusChange={setStatus}
          refreshing={query.isFetching}
        />
      )}
    </QueryView>
  );
}

export function EventReportView() {
  const staff = useStaff();
  const { id } = useParams<{ id: string }>();
  const query = useQuery({ queryKey: staffKeys.event(id), queryFn: () => staffApi.event(id) });
  const change = useStaffMutation((body: Parameters<typeof staffApi.changeStatus>[1]) => staffApi.changeStatus(id, body));
  const request = useStaffMutation((body: Parameters<typeof staffApi.requestChange>[1]) => staffApi.requestChange(id, body));
  const pending = change.isPending || request.isPending;
  return (
    <QueryView query={query}>
      {(report) => (
        <EventReportPage
          report={report}
          viewerRole={staff.role}
          onChangeStatus={can(staff.role, "events:manage") ? (body) => change.mutateAsync(body).then(() => undefined) : undefined}
          onRequestChange={can(staff.role, "events:request") ? (body) => request.mutateAsync(body).then(() => undefined) : undefined}
          submitting={pending}
          serverError={errorMessage(change.error ?? request.error)}
          backHref="/events"
          entryHref={can(staff.role, "entry:read") ? `/entry?event=${encodeURIComponent(report.eventId)}` : undefined}
        />
      )}
    </QueryView>
  );
}

/** Gates offered by the scanner: stadiums have more entrances than halls and cinemas. */
const gatesFor = (event: EventPerformance | undefined) =>
  Array.from({ length: event?.kind === "match" ? 8 : event?.kind === "cinema" ? 2 : 4 }, (_, i) => `Gate ${i + 1}`);

/** Events worth checking in: not cancelled, soonest first. */
const scannable = (events: EventPerformance[]) =>
  events.filter((e) => e.status !== "cancelled").sort((a, b) => a.startsAt.localeCompare(b.startsAt));

export function EntryView({ initialEventId }: { initialEventId?: string }) {
  const staff = useStaff();
  const { t } = useI18n();
  const events = useQuery({ queryKey: staffKeys.events, queryFn: staffApi.events });
  const selected = useScanner((s) => s.eventId);
  const lastScan = useScanner((s) => s.lastScan);
  const list = scannable(events.data ?? []);
  const eventId = [selected, initialEventId].find((id) => id && list.some((e) => e.eventId === id)) ?? list[0]?.eventId;
  const summary = useQuery({
    queryKey: staffKeys.entry(eventId ?? ""),
    queryFn: () => staffApi.entry(eventId!),
    enabled: !!eventId,
    refetchInterval: 15_000,
  });
  const queryClient = useQueryClient();
  const scan = useMutation({
    mutationFn: (values: { gate: string; token: string }) => staffApi.scan({ eventId: eventId!, ...values }),
    onSuccess: (result) => {
      scannerStore.getState().showResult(result.scan);
      queryClient.setQueryData(staffKeys.entry(eventId!), result.summary);
    },
  });

  return (
    <QueryView query={events}>
      {() =>
        !eventId ? (
          <EmptyState title={t("No events to check in")} />
        ) : (
          <QueryView query={summary}>
            {(data) => (
              <EntryPage
                events={list}
                eventId={eventId}
                onEventChange={(id) => scannerStore.getState().selectEvent(id)}
                summary={data}
                gates={gatesFor(list.find((e) => e.eventId === eventId))}
                canScan={can(staff.role, "entry:scan")}
                onScan={(values) => scan.mutateAsync(values).then(() => undefined)}
                onSampleToken={process.env.NODE_ENV === "development" ? async () => (await staffApi.sampleToken(eventId)).token : undefined}
                lastScan={lastScan && data.recent.some((s) => s.id === lastScan.id) ? lastScan : undefined}
                scanning={scan.isPending}
                serverError={errorMessage(scan.error)}
              />
            )}
          </QueryView>
        )
      }
    </QueryView>
  );
}
