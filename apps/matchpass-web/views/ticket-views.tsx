"use client";

import type { Alert, Ticket } from "@repo/contracts";
import { MessagePage, MyTicketsPage, TicketWalletPage } from "@repo/design-system";
import { useQuery } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { AppFooter, AppHeader } from "@/components/app-chrome";
import { errorMessage } from "@/lib/api/client";
import { endpoints } from "@/lib/api/endpoints";
import { queryKeys } from "@/lib/api/keys";
import { RequireAuth } from "@/lib/auth/session";
import { useFeatureFlags } from "@/lib/feature-flags/client";
import { useAlerts, useRefunds, useTickets, useTransfer } from "@/lib/queries";
import { routes, ticketGroupKey } from "@/lib/routes";
import { PageError, PageLoading } from "./shared";

export function useTicketNav(current: "upcoming" | "past" | "refunds", upcomingCount?: number) {
  const flags = useFeatureFlags();
  const refunds = useRefunds();
  return [
    {
      href: routes.myTickets,
      label: upcomingCount === undefined ? "Upcoming" : `Upcoming (${upcomingCount})`,
      current: current === "upcoming",
    },
    { href: `${routes.myTickets}?scope=past`, label: "Past", current: current === "past" },
    ...(flags.refunds
      ? [{ href: routes.refunds, label: refunds.data ? `Refunds (${refunds.data.length})` : "Refunds", current: current === "refunds" }]
      : []),
  ];
}

const NOTICES: Record<string, Alert> = {
  transferred: {
    id: "notice_transferred",
    tone: "info",
    title: "Ticket sent",
    body: "They have 24 hours to accept. Until then you can still see it in Past.",
  },
};

/* ---------- My tickets ---------- */

export function MyTicketsView() {
  return <RequireAuth>{() => <MyTickets />}</RequireAuth>;
}

function MyTickets() {
  const flags = useFeatureFlags();
  const params = useSearchParams();
  const scope = params.get("scope") === "past" ? "past" : "upcoming";
  const upcoming = useTickets();
  const past = useQuery({ queryKey: queryKeys.tickets("past"), queryFn: () => endpoints.tickets("past"), enabled: scope === "past" });
  const query = scope === "past" ? past : upcoming;
  const alerts = useAlerts();
  const nav = useTicketNav(scope, upcoming.data?.length);
  const [walletNotice, setWalletNotice] = useState(false);
  const notice = NOTICES[params.get("notice") ?? ""];

  return (
    <MyTicketsPage
      header={<AppHeader active="tickets" />}
      nav={nav}
      alerts={[
        ...(notice ? [notice] : []),
        ...(walletNotice
          ? [
              {
                id: "wallet",
                tone: "info" as const,
                title: "Wallet passes are coming soon",
                body: "For now, show the QR from My tickets at the gate.",
              },
            ]
          : []),
        ...(flags.refunds ? (alerts.data ?? []) : (alerts.data ?? []).map(({ action: _action, ...rest }) => rest)),
      ]}
      status={query.isPending ? "loading" : query.isError ? "error" : "success"}
      onRetry={() => void query.refetch()}
      tickets={query.data ?? []}
      showQrHref={(t) => routes.ticket(t.id)}
      transferHref={flags.ticketTransfer ? (t) => routes.transfer(t.id) : undefined}
      resaleHref={flags.resale ? (t) => routes.resale(t.id) : undefined}
      refundHref={flags.refunds ? (t) => routes.newRefund(t.orderId) : undefined}
      onAddToWallet={flags.addToWallet ? () => setWalletNotice(true) : undefined}
      browseHref={routes.events()}
    />
  );
}

/* ---------- Wallet (QR & transfer) ---------- */

export function TicketWalletView({ ticketId }: { ticketId: string }) {
  return <RequireAuth>{() => <Wallet ticketId={ticketId} />}</RequireAuth>;
}

function groupTickets(tickets: Ticket[]) {
  const groups = new Map<string, Ticket[]>();
  for (const ticket of tickets) {
    const key = ticketGroupKey(ticket);
    groups.set(key, [...(groups.get(key) ?? []), ticket]);
  }
  return [...groups.entries()].map(([key, list]) => ({ key, tickets: list }));
}

function Wallet({ ticketId }: { ticketId: string }) {
  const flags = useFeatureFlags();
  const router = useRouter();
  const params = useSearchParams();
  const tickets = useTickets();
  const transfer = useTransfer();
  const [transferOpen, setTransferOpen] = useState(params.get("transfer") === "1");
  const groups = useMemo(() => groupTickets(tickets.data ?? []), [tickets.data]);

  if (tickets.isPending) return <PageLoading active="tickets" label="Loading your tickets" />;
  if (tickets.isError) return <PageError error={tickets.error} onRetry={() => void tickets.refetch()} active="tickets" />;

  const group = groups.find((g) => g.tickets.some((t) => t.id === ticketId));
  if (!group) {
    return (
      <MessagePage
        header={<AppHeader active="tickets" />}
        footer={<AppFooter />}
        title="Ticket not found"
        body="This ticket isn't in your upcoming tickets. It may have been transferred, resold or refunded."
        action={{ label: "Back to my tickets", href: routes.myTickets }}
      />
    );
  }
  const index = group.tickets.findIndex((t) => t.id === ticketId);
  const go = (id: string) => {
    setTransferOpen(false);
    transfer.reset();
    router.replace(routes.ticket(id), { scroll: false });
  };

  return (
    <TicketWalletPage
      header={<AppHeader active="tickets" />}
      groups={groups}
      selectedKey={group.key}
      onSelect={(key) => go(groups.find((g) => g.key === key)!.tickets[0]!.id)}
      index={index}
      onIndexChange={(i) => go(group.tickets[i]!.id)}
      transfer={
        flags.ticketTransfer
          ? {
              open: transferOpen,
              onOpenChange: setTransferOpen,
              onSubmit: (values) =>
                transfer.mutate({ ticketId, ...values }, { onSuccess: () => router.push(`${routes.myTickets}?notice=transferred`) }),
              submitting: transfer.isPending,
              serverError: errorMessage(transfer.error),
            }
          : undefined
      }
      resaleHref={flags.resale ? (t) => routes.resale(t.id) : undefined}
      backHref={routes.myTickets}
    />
  );
}
