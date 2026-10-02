"use client";

import { resaleQuote, type EventDetail, type Refund, type User } from "@repo/contracts";
import { MessagePage, RefundRequestPage, RefundsPage, ResaleMarketPage, ResalePage, useI18n } from "@repo/design-system";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { AppFooter, AppHeader } from "@/components/app-chrome";
import { errorMessage } from "@/lib/api/client";
import { RequireAuth, useAuth } from "@/lib/auth/session";
import { downloadFile } from "@/lib/downloads";
import {
  useCancelRefund,
  useCreateHold,
  useCreateListing,
  useCreateRefund,
  useListings,
  useRefundOptions,
  useEvent,
  useRefunds,
  useResaleOffers,
  useTickets,
  useWithdrawListing,
} from "@/lib/queries";
import { routes } from "@/lib/routes";
import { PageError, PageLoading, QueryPage } from "./shared";
import { useTicketNav } from "./ticket-views";
import { useLocalizedRouter } from "@/lib/i18n/navigation";

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
  const { t, f } = useI18n();

  if (tickets.isPending || listings.isPending) return <PageLoading active="resale" label={t("Loading your tickets")} />;
  if (tickets.isError || listings.isError)
    return <PageError error={tickets.error ?? listings.error} onRetry={() => void tickets.refetch()} active="resale" />;

  const me = user.fullName.split(" ")[0];
  const sellable = tickets.data
    .filter((ticket) => ticket.status === "valid" && ticket.resaleAllowed)
    .map((ticket) => ({
      id: ticket.id,
      label: `${ticket.title} · ${
        ticket.holderName.startsWith(me ?? "") ? t("Your ticket") : t("{name}'s ticket", { name: ticket.holderName })
      } · ${ticket.seatLabel}`,
      price: ticket.price,
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
          { id: "wallet", name: t("Mobile wallet"), note: user.phoneMasked },
          { id: "instapay", name: t("InstaPay"), note: user.email ? `${user.email.split("@")[0]}@instapay` : t("Your InstaPay address") },
          { id: "bank", name: t("Bank account"), note: t("Add IBAN") },
        ],
        onSubmit: (values) =>
          create.mutate(values, {
            onSuccess: (listing) =>
              setSuccess(
                t("Listed for {price}. You'll receive {payout} when it sells.", {
                  price: f.money(listing.price),
                  payout: f.money(resaleQuote(listing.price).payout),
                }),
              ),
          }),
        submitting: create.isPending,
        serverError: errorMessage(create.error),
      }}
      listings={listings.data}
      onWithdraw={(id) => withdraw.mutate(id, { onSuccess: () => setSuccess(t("Listing withdrawn — the ticket is yours again.")) })}
      withdrawingId={withdraw.isPending ? withdraw.variables : undefined}
      steps={[
        t("List your ticket at up to face value. Touting above face value isn't allowed."),
        t("When someone buys it, your QR stops working and theirs is issued — tied to their Fan ID or account."),
        t("Money arrives within 2 working days after the sale."),
        t("Not sold by 6 hours before the event? The listing ends and the ticket stays yours."),
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
  const { t } = useI18n();

  if (!orderId) {
    return (
      <MessagePage
        header={<AppHeader active="tickets" />}
        footer={<AppFooter />}
        title={t("Choose an order to refund")}
        body={t("Start a refund from the ticket in My tickets.")}
        action={{ label: t("My tickets"), href: routes.myTickets }}
      />
    );
  }
  if (options.isPending) return <PageLoading active="tickets" label={t("Loading your order")} />;
  if (options.isError) return <PageError error={options.error} onRetry={() => void options.refetch()} active="tickets" />;
  if (options.data.tickets.length === 0 && !result) {
    return (
      <MessagePage
        header={<AppHeader active="tickets" />}
        footer={<AppFooter />}
        title={t("No refundable tickets")}
        body={t("None of the tickets on order {reference} can be refunded right now. You can still sell them on official resale.", {
          reference: options.data.reference,
        })}
        action={{ label: t("Back to my tickets"), href: routes.myTickets }}
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
  const router = useLocalizedRouter();
  const refunds = useRefunds();
  const cancel = useCancelRefund();
  const nav = useTicketNav("refunds");
  const { t, f } = useI18n();

  // The action follows the refund's status (its label comes from the API in the visitor's language).
  const onSecondary = (id: string) => {
    const refund = refunds.data?.find((r) => r.id === id);
    if (!refund) return;
    if (refund.status === "refunded") {
      downloadFile(
        `${refund.reference}.txt`,
        [
          t("MATCHPASS REFUND"),
          refund.reference,
          refund.eventTitle,
          refund.detail,
          `${t("Amount")}: ${f.money(refund.amount)}`,
          refund.destination,
          `${t("Status")}: ${refund.statusLabel}`,
        ].join("\n"),
        "text/plain",
      );
    } else if (refund.status === "rejected") {
      router.push("/info/contact");
    } else {
      router.push(routes.order(refund.orderId));
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
          title: t("Matches"),
          body: t(
            "Full refund, fees included, if the match is cancelled, postponed or played without fans. Otherwise use official resale.",
          ),
          tone: "ink",
        },
        {
          title: t("Concerts"),
          body: t("Refund of the ticket price up to 7 days before the show (organiser's policy). Full refund if cancelled."),
          tone: "lime",
        },
        { title: t("Cinema"), body: t("Refund up to 2 hours before the showtime. After that, tickets can't be refunded."), tone: "plum" },
      ]}
    />
  );
}

/* ---------- Official resale marketplace (buying) ---------- */

export function ResaleMarketView({ slug }: { slug: string }) {
  const event = useEvent(slug);
  const { t } = useI18n();
  return (
    <QueryPage query={event} active="resale" loadingLabel={t("Loading resale tickets")}>
      {(data) => <ResaleMarket event={data} />}
    </QueryPage>
  );
}

function ResaleMarket({ event }: { event: EventDetail }) {
  const router = useLocalizedRouter();
  const auth = useAuth();
  const offers = useResaleOffers(event.slug);
  const createHold = useCreateHold();
  const needsFanId = event.requiresFanId && auth.status === "signed_in" && auth.user.fanId.status !== "approved";
  return (
    <ResaleMarketPage
      header={<AppHeader active={event.kind === "match" ? "matches" : "concerts"} />}
      event={event}
      status={offers.isPending ? "loading" : offers.isError ? "error" : "success"}
      onRetry={() => void offers.refetch()}
      offers={offers.data ?? []}
      onBuy={(offer) => {
        if (auth.status !== "signed_in") return router.push(routes.login(routes.eventResale(event.slug)));
        createHold.mutate(
          { type: "resale", eventId: event.id, listingId: offer.id },
          {
            onSuccess: (hold) => router.push(routes.checkout(hold.id)),
            onError: () => void offers.refetch(),
          },
        );
      }}
      buyingId={createHold.isPending ? (createHold.variables as { listingId?: string } | undefined)?.listingId : undefined}
      serverError={errorMessage(createHold.error)}
      fanIdHref={needsFanId ? routes.fanId : undefined}
      backHref={routes.event(event.slug)}
    />
  );
}
