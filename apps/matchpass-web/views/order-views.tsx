"use client";

import type { Hold, Order } from "@repo/contracts";
import { CheckoutPage, MessagePage, OrderConfirmationPage } from "@repo/design-system";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AppFooter, AppHeader } from "@/components/app-chrome";
import { errorMessage, toApiError } from "@/lib/api/client";
import { RequireAuth } from "@/lib/auth/session";
import { buildIcs, buildReceipt, downloadFile } from "@/lib/downloads";
import { useFeatureFlags } from "@/lib/feature-flags/client";
import { useApplyPromo, useCreateOrder, useHold, useOrder } from "@/lib/queries";
import { routes } from "@/lib/routes";
import { PageError, PageLoading } from "./shared";

const navFor = (kind: Hold["eventKind"]) => (kind === "match" ? "matches" : kind === "cinema" ? "cinema" : "concerts");

/* ---------- Checkout ---------- */

export function CheckoutView({ holdId }: { holdId: string }) {
  return <RequireAuth>{() => <Checkout holdId={holdId} />}</RequireAuth>;
}

function Checkout({ holdId }: { holdId: string }) {
  const hold = useHold(holdId);
  const [expired, setExpired] = useState(false);
  if (hold.isPending) return <PageLoading label="Loading your order" />;
  const expiredError = hold.isError && ["HOLD_EXPIRED", "NOT_FOUND"].includes(toApiError(hold.error).code);
  if (expired || expiredError) {
    return (
      <MessagePage
        header={<AppHeader />}
        footer={<AppFooter />}
        title="Your hold has ended"
        body="We held your tickets for 10 minutes. They've gone back on sale — choose again to continue."
        action={{ label: hold.data ? "Choose tickets again" : "Browse events", href: hold.data ? hold.data.backHref : routes.events() }}
      />
    );
  }
  if (hold.isError) return <PageError error={hold.error} onRetry={() => void hold.refetch()} />;
  return <CheckoutForHold hold={hold.data} onExpire={() => setExpired(true)} />;
}

function CheckoutForHold({ hold, onExpire }: { hold: Hold; onExpire: () => void }) {
  const flags = useFeatureFlags();
  const router = useRouter();
  const createOrder = useCreateOrder();
  const promo = useApplyPromo(hold.id);
  return (
    <CheckoutPage
      header={<AppHeader active={navFor(hold.eventKind)} />}
      hold={hold}
      backHref={hold.backHref}
      onExpire={onExpire}
      form={{
        onSubmit: (values) =>
          createOrder.mutate({ holdId: hold.id, ...values }, { onSuccess: (order) => router.push(routes.order(order.id)) }),
        submitting: createOrder.isPending,
        serverError: errorMessage(createOrder.error),
        promo: flags.promoCodes
          ? {
              onApply: async (code) => {
                await promo.mutateAsync(code).catch(() => undefined);
              },
              pending: promo.isPending,
              error: errorMessage(promo.error),
            }
          : undefined,
        providerName: "Paymob",
      }}
    />
  );
}

/* ---------- Order confirmation ---------- */

export function OrderView({ orderId }: { orderId: string }) {
  return <RequireAuth>{() => <OrderConfirmation orderId={orderId} />}</RequireAuth>;
}

function OrderConfirmation({ orderId }: { orderId: string }) {
  const order = useOrder(orderId);
  if (order.isPending) return <PageLoading label="Loading your order" />;
  if (order.isError) return <PageError error={order.error} onRetry={() => void order.refetch()} />;
  return <Confirmation order={order.data} />;
}

function Confirmation({ order }: { order: Order }) {
  const flags = useFeatureFlags();
  const [parkingAdded, setParkingAdded] = useState(false);
  const first = order.tickets[0];
  return (
    <OrderConfirmationPage
      header={<AppHeader active="tickets" />}
      order={order}
      ticketsHref={routes.myTickets}
      onAddToCalendar={
        first
          ? () =>
              downloadFile(
                `${order.reference}.ics`,
                buildIcs({
                  id: order.id,
                  title: order.eventTitle,
                  startsAt: first.startsAt,
                  location: `${first.venueName}, ${first.venueArea}`,
                  description: order.entryNote,
                }),
                "text/calendar",
              )
          : undefined
      }
      onDownloadReceipt={() => downloadFile(`${order.reference}-receipt.txt`, buildReceipt(order), "text/plain")}
      parking={flags.parkingUpsell && order.parkingOffer ? { onAdd: () => setParkingAdded(true), added: parkingAdded } : undefined}
    />
  );
}
