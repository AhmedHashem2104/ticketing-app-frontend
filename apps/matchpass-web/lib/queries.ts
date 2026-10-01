"use client";

import type { EventsQuery, Refund } from "@repo/contracts";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { endpoints } from "./api/endpoints";
import { queryKeys } from "./api/keys";
import { useToken } from "./auth/session";

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
  const token = useToken();
  return useQuery({ queryKey: queryKeys.alerts, queryFn: endpoints.alerts, enabled: !!token });
};

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

export const useOrder = (id: string) => useQuery({ queryKey: queryKeys.order(id), queryFn: () => endpoints.order(id) });

/* ---------- Tickets, resale & refunds ---------- */

export const useTickets = () => useQuery({ queryKey: queryKeys.tickets("upcoming"), queryFn: () => endpoints.tickets("upcoming") });

export function useTransfer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ ticketId, ...body }: Parameters<typeof endpoints.transfer>[1] & { ticketId: string }) =>
      endpoints.transfer(ticketId, body),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["tickets"] }),
  });
}

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
export const useFanIdScan = () => useMutation({ mutationFn: endpoints.scanFanId });

export function useFanIdSubmit() {
  const queryClient = useQueryClient();
  return useMutation({ mutationFn: endpoints.submitFanId, onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["me"] }) });
}
