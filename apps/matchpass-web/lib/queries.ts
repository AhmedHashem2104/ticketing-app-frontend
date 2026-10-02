"use client";

import type { EventsQuery, Order, Refund } from "@repo/contracts";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { endpoints } from "./api/endpoints";
import { queryKeys } from "./api/keys";

/** True once `GET /me` confirmed a session (shares the cache entry with useAuth). */
export function useSignedIn() {
  const me = useQuery({ queryKey: queryKeys.me, queryFn: endpoints.meOrNull, staleTime: 60_000, retry: false });
  return !!me.data;
}

/* ---------- Catalog ---------- */

export const useHome = () => useQuery({ queryKey: queryKeys.home, queryFn: endpoints.home });

export const useEvents = (params: EventsQuery) =>
  useQuery({ queryKey: queryKeys.events(params), queryFn: () => endpoints.events(params), placeholderData: keepPreviousData });

export const useEvent = (slug: string) => useQuery({ queryKey: queryKeys.event(slug), queryFn: () => endpoints.event(slug) });

export const useSeatMap = (slug: string, enabled = true) =>
  useQuery({ queryKey: queryKeys.seatMap(slug), queryFn: () => endpoints.seatMap(slug), enabled, staleTime: 15_000 });

export const useCinemaSeats = (slug: string, showtimeId: string | undefined) =>
  useQuery({
    queryKey: queryKeys.cinemaSeats(slug, showtimeId ?? ""),
    queryFn: () => endpoints.cinemaSeats(slug, showtimeId!),
    enabled: !!showtimeId,
    placeholderData: keepPreviousData,
  });

export const useAlerts = () => {
  const signedIn = useSignedIn();
  return useQuery({ queryKey: queryKeys.alerts, queryFn: endpoints.alerts, enabled: signedIn });
};

/** Which linked Fan IDs can still get a ticket for a match, as `{ fanId: reason }` for the unavailable ones. */
export function useUnavailableFans(slug: string, enabled: boolean) {
  const query = useQuery({
    queryKey: queryKeys.fanEligibility(slug),
    queryFn: () => endpoints.fanEligibility(slug),
    enabled,
    staleTime: 10_000,
  });
  const unavailable = Object.fromEntries((query.data ?? []).filter((e) => !e.eligible && e.reason).map((e) => [e.fanId, e.reason!]));
  return { unavailable, ready: !enabled || query.isSuccess || query.isError };
}

export const useResaleOffers = (slug: string) =>
  useQuery({ queryKey: queryKeys.resaleOffers(slug), queryFn: () => endpoints.resaleOffers(slug), staleTime: 10_000 });

export const useNotify = () => useMutation({ mutationFn: (slug: string) => endpoints.notify(slug) });
export const usePresale = (slug: string) => useMutation({ mutationFn: (code: string) => endpoints.presale(slug, code) });

/* ---------- Waiting room ---------- */

export const useJoinQueue = () => useMutation({ mutationFn: endpoints.joinQueue });

export const useQueueStatus = (id: string | undefined) =>
  useQuery({
    queryKey: queryKeys.queue(id ?? ""),
    queryFn: () => endpoints.queue(id!),
    enabled: !!id,
    refetchInterval: (query) => (query.state.data?.phase === "your_turn" ? false : 1_000),
  });

export function useQueueSms(id: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (optIn: boolean) => endpoints.setQueueSms(id!, optIn),
    onSuccess: (status) => queryClient.setQueryData(queryKeys.queue(status.id), status),
  });
}

/* ---------- Checkout ---------- */

export function useCreateHold() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: endpoints.createHold,
    onSuccess: (hold) => queryClient.setQueryData(queryKeys.hold(hold.id), hold),
  });
}

export const useHold = (id: string) => useQuery({ queryKey: queryKeys.hold(id), queryFn: () => endpoints.hold(id), retry: false });

export function useApplyPromo(holdId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (code: string) => endpoints.applyPromo(holdId, code),
    onSuccess: (hold) => queryClient.setQueryData(queryKeys.hold(hold.id), hold),
  });
}

export function useCreateOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: endpoints.createOrder,
    onSuccess: (order) => {
      queryClient.setQueryData(queryKeys.order(order.id), order);
      void queryClient.invalidateQueries({ queryKey: ["tickets"] });
      void queryClient.invalidateQueries({ queryKey: ["event"] });
    },
  });
}

/** Polls while a payment is in progress (wallet / InstaPay approvals, Fawry bills). */
export const useOrder = (id: string) =>
  useQuery({
    queryKey: queryKeys.order(id),
    queryFn: () => endpoints.order(id),
    refetchInterval: (query) => {
      const order = query.state.data as Order | undefined;
      if (order?.status !== "pending_payment") return false;
      return order.payment.method === "fawry" ? 15_000 : 2_000;
    },
  });

/* ---------- Tickets, resale & refunds ---------- */

export const useTickets = () => useQuery({ queryKey: queryKeys.tickets("upcoming"), queryFn: () => endpoints.tickets("upcoming") });

/** Short-lived signed entry token; refetched whenever the current one expires. */
export const useTicketQr = (ticketId: string | undefined, enabled: boolean) =>
  useQuery({
    queryKey: queryKeys.ticketQr(ticketId ?? ""),
    queryFn: () => endpoints.ticketQr(ticketId!),
    enabled: !!ticketId && enabled,
    staleTime: 0,
    gcTime: 0,
    retry: 2,
    refetchOnWindowFocus: true,
  });

export function useTransfer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ ticketId, ...body }: Parameters<typeof endpoints.transfer>[1] & { ticketId: string }) =>
      endpoints.transfer(ticketId, body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["tickets"] });
      void queryClient.invalidateQueries({ queryKey: queryKeys.transfers });
    },
  });
}

export const useTransfers = () => useQuery({ queryKey: queryKeys.transfers, queryFn: endpoints.transfers });

function useTransferAction(action: (id: string) => Promise<unknown>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: action,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.transfers });
      void queryClient.invalidateQueries({ queryKey: ["tickets"] });
      void queryClient.invalidateQueries({ queryKey: queryKeys.alerts });
    },
  });
}

export const useAcceptTransfer = () => useTransferAction(endpoints.acceptTransfer);
export const useDeclineTransfer = () => useTransferAction(endpoints.declineTransfer);
export const useCancelTransfer = () => useTransferAction(endpoints.cancelTransfer);

export const useListings = () => useQuery({ queryKey: queryKeys.listings, queryFn: endpoints.listings });

export function useCreateListing() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: endpoints.createListing,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.listings });
      void queryClient.invalidateQueries({ queryKey: ["tickets"] });
    },
  });
}

export function useWithdrawListing() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: endpoints.withdrawListing,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.listings });
      void queryClient.invalidateQueries({ queryKey: ["tickets"] });
    },
  });
}

export const useRefundOptions = (orderId: string | null) =>
  useQuery({ queryKey: queryKeys.refundOptions(orderId ?? ""), queryFn: () => endpoints.refundOptions(orderId!), enabled: !!orderId });

export const useRefunds = () => useQuery({ queryKey: queryKeys.refunds, queryFn: endpoints.refunds });

export function useCreateRefund() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: endpoints.createRefund,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.refunds });
      void queryClient.invalidateQueries({ queryKey: ["tickets"] });
    },
  });
}

export function useCancelRefund() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: endpoints.cancelRefund,
    onSuccess: (refund: Refund) => {
      queryClient.setQueryData<Refund[]>(queryKeys.refunds, (list) => list?.map((r) => (r.id === refund.id ? refund : r)));
      void queryClient.invalidateQueries({ queryKey: ["tickets"] });
    },
  });
}

/* ---------- Account ---------- */

export const useSignUp = () => useMutation({ mutationFn: endpoints.signUp });
export const useVerifyOtp = () =>
  useMutation({
    mutationFn: ({ verificationId, code }: { verificationId: string; code: string }) => endpoints.verify(verificationId, code),
  });
export const useResendCode = () => useMutation({ mutationFn: endpoints.resendCode });
export const useLogin = () => useMutation({ mutationFn: endpoints.login });
export const useForgotPassword = () => useMutation({ mutationFn: endpoints.forgotPassword });
export const useResetPassword = () => useMutation({ mutationFn: endpoints.resetPassword });
export const useFanIdDocuments = () => useMutation({ mutationFn: endpoints.uploadFanIdDocuments });

export function useFanIdSubmit() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: endpoints.submitFanId,
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: queryKeys.me }),
  });
}

export function useUpdatePreferences() {
  const queryClient = useQueryClient();
  return useMutation({ mutationFn: endpoints.updatePreferences, onSuccess: (user) => queryClient.setQueryData(queryKeys.me, user) });
}

function useFanMutation<T>(fn: (arg: T) => Promise<unknown>) {
  const queryClient = useQueryClient();
  return useMutation({ mutationFn: fn, onSuccess: () => void queryClient.invalidateQueries({ queryKey: queryKeys.me }) });
}

export const useLinkFan = () => useFanMutation(endpoints.linkFan);
export const useUnlinkFan = () => useFanMutation(endpoints.unlinkFan);

/* ---------- Notifications ---------- */

export const useNotifications = (enabled = true) =>
  useQuery({ queryKey: queryKeys.notifications, queryFn: endpoints.notifications, enabled, refetchInterval: 60_000 });

export function useMarkNotificationsRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (ids?: string[]) => endpoints.markNotificationsRead(ids),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: queryKeys.notifications }),
  });
}
