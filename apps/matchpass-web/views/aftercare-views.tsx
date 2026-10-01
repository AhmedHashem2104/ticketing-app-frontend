"use client";

import { formatMoney, resaleQuote, type Refund, type User } from "@repo/contracts";
import { MessagePage, RefundRequestPage, RefundsPage, ResalePage } from "@repo/design-system";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { AppFooter, AppHeader } from "@/components/app-chrome";
import { errorMessage } from "@/lib/api/client";
import { RequireAuth } from "@/lib/auth/session";
import { downloadFile } from "@/lib/downloads";
import {
  useCancelRefund,
  useCreateListing,
  useCreateRefund,
  useListings,
  useRefundOptions,
  useRefunds,
  useTickets,
  useWithdrawListing,
} from "@/lib/queries";
import { routes } from "@/lib/routes";
import { PageError, PageLoading } from "./shared";
import { useTicketNav } from "./ticket-views";

/* ---------- Resale ---------- */

export function ResaleView() {
  return <RequireAuth>{(user) => <Resale user={user} />}</RequireAuth>;
}

function Resale({ user }: { user: User }) {
  const params = useSearchParams();
  const tickets = useTickets();
  const listings = useListings();
  const create = useCreateListing();
  const withdraw = useWithdrawListing();
  const [success, setSuccess] = useState<string>();

  if (tickets.isPending || listings.isPending) return <PageLoading active="resale" label="Loading your tickets" />;
  if (tickets.isError || listings.isError)
    return <PageError error={tickets.error ?? listings.error} onRetry={() => void tickets.refetch()} active="resale" />;

  const me = user.fullName.split(" ")[0];
  const sellable = tickets.data
    .filter((t) => t.status === "valid" && t.resaleAllowed)
    .map((t) => ({
      id: t.id,
      label: `${t.title} · ${t.holderName.startsWith(me ?? "") ? "Your ticket" : `${t.holderName}'s ticket`} · ${t.seatLabel}`,
      price: t.price,
    }));

  return (
    <ResalePage
      header={<AppHeader active="resale" />}
      backHref={routes.myTickets}
      success={success}
      form={{
        tickets: sellable,
        defaultTicketId: params.get("ticket") ?? undefined,
        payoutOptions: [
          { id: "wallet", name: "Mobile wallet", note: user.phoneMasked },
          { id: "instapay", name: "InstaPay", note: user.email ? `${user.email.split("@")[0]}@instapay` : "Your InstaPay address" },
          { id: "bank", name: "Bank account", note: "Add IBAN" },
        ],
        onSubmit: (values) =>
          create.mutate(values, {
            onSuccess: (listing) =>
              setSuccess(
                `Listed for ${formatMoney(listing.price)}. You'll receive ${formatMoney(resaleQuote(listing.price).payout)} when it sells.`,
              ),
          }),
        submitting: create.isPending,
        serverError: errorMessage(create.error),
      }}
      listings={listings.data}
      onWithdraw={(id) => withdraw.mutate(id, { onSuccess: () => setSuccess("Listing withdrawn — the ticket is yours again.") })}
      withdrawingId={withdraw.isPending ? withdraw.variables : undefined}
      steps={[
        "List your ticket at up to face value. Touting above face value isn't allowed.",
        "When someone buys it, your QR stops working and theirs is issued — tied to their Fan ID or account.",
        "Money arrives within 2 working days after the sale.",
        "Not sold by 6 hours before the event? The listing ends and the ticket stays yours.",
      ]}
      browseHref={routes.events()}
    />
  );
}

/* ---------- Refund request ---------- */

export function RefundRequestView() {
  return <RequireAuth>{() => <RefundRequest />}</RequireAuth>;
}

function RefundRequest() {
  const params = useSearchParams();
  const orderId = params.get("order");
  const options = useRefundOptions(orderId);
  const create = useCreateRefund();
  const [step, setStep] = useState(1);
  const [result, setResult] = useState<Refund>();

  if (!orderId) {
    return (
      <MessagePage
        header={<AppHeader active="tickets" />}
        footer={<AppFooter />}
        title="Choose an order to refund"
        body="Start a refund from the ticket in My tickets."
        action={{ label: "My tickets", href: routes.myTickets }}
      />
    );
  }
  if (options.isPending) return <PageLoading active="tickets" label="Loading your order" />;
  if (options.isError) return <PageError error={options.error} onRetry={() => void options.refetch()} active="tickets" />;
  if (options.data.tickets.length === 0 && !result) {
    return (
      <MessagePage
        header={<AppHeader active="tickets" />}
        footer={<AppFooter />}
        title="No refundable tickets"
        body={`None of the tickets on order ${options.data.reference} can be refunded right now. You can still sell them on official resale.`}
        action={{ label: "Back to my tickets", href: routes.myTickets }}
      />
    );
  }

  return (
    <RefundRequestPage
      backHref={routes.myTickets}
      wizard={{
        options: options.data,
        step,
        onStepChange: setStep,
        onSubmit: async (values) => {
          const refund = await create.mutateAsync(values).catch(() => undefined);
          if (refund) {
            setResult(refund);
            setStep(5);
          }
        },
        submitting: create.isPending,
        serverError: errorMessage(create.error),
        result,
        trackHref: routes.refunds,
        ticketsHref: routes.myTickets,
      }}
    />
  );
}

/* ---------- Refund status ---------- */

export function RefundsView() {
  return <RequireAuth>{() => <Refunds />}</RequireAuth>;
}

function Refunds() {
  const router = useRouter();
  const refunds = useRefunds();
  const cancel = useCancelRefund();
  const nav = useTicketNav("refunds");

  const onSecondary = (id: string) => {
    const refund = refunds.data?.find((r) => r.id === id);
    if (!refund) return;
    if (refund.secondaryAction.startsWith("Download")) {
      downloadFile(
        `${refund.reference}.txt`,
        `MATCHPASS REFUND\n${refund.reference}\n${refund.eventTitle}\n${refund.detail}\nAmount: ${formatMoney(refund.amount)}\n${refund.destination}\nStatus: ${refund.statusLabel}`,
        "text/plain",
      );
    } else if (refund.secondaryAction === "View order") {
      router.push(routes.order(refund.orderId));
    } else {
      router.push("/info/help");
    }
  };

  return (
    <RefundsPage
      header={<AppHeader active="tickets" />}
      nav={nav}
      status={refunds.isPending ? "loading" : refunds.isError ? "error" : "success"}
      onRetry={() => void refunds.refetch()}
      refunds={refunds.data ?? []}
      onCancel={(id) => cancel.mutate(id)}
      cancellingId={cancel.isPending ? cancel.variables : undefined}
      onSecondary={onSecondary}
      policies={[
        {
          title: "Matches",
          body: "Full refund, fees included, if the match is cancelled, postponed or played without fans. Otherwise use official resale.",
          tone: "ink",
        },
        {
          title: "Concerts",
          body: "Refund of the ticket price up to 7 days before the show (organiser's policy). Full refund if cancelled.",
          tone: "lime",
        },
        { title: "Cinema", body: "Refund up to 2 hours before the showtime. After that, tickets can't be refunded.", tone: "plum" },
      ]}
    />
  );
}
