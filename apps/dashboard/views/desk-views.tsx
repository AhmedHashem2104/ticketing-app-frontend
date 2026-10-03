"use client";

import { can } from "@repo/contracts";
import {
  AuditPage,
  FanIdQueuePage,
  FansPage,
  OrdersPage,
  OrganizersPage,
  PayoutsPage,
  RefundsPage,
  RequestsPage,
} from "@repo/design-system/dashboard";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { errorMessage } from "@/lib/api/client";
import { staffApi, staffKeys } from "@/lib/api/staff";
import { useStaff } from "@/lib/auth";
import { useStaffMutation } from "./event-views";
import { QueryView, useDebounced } from "./shared";

type OrderFilter = "all" | "paid" | "pending_payment" | "payment_failed" | "expired";

export function OrdersView() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<OrderFilter>("all");
  const q = useDebounced(search.trim());
  const query = useQuery({ queryKey: staffKeys.orders(q), queryFn: () => staffApi.orders(q), placeholderData: keepPreviousData });
  return (
    <QueryView query={query}>
      {(orders) => (
        <OrdersPage
          orders={orders}
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

export function FansView() {
  const staff = useStaff();
  const [search, setSearch] = useState("");
  const q = useDebounced(search.trim());
  const query = useQuery({ queryKey: staffKeys.fans(q), queryFn: () => staffApi.fans(q), placeholderData: keepPreviousData });
  const suspend = useStaffMutation(({ id, reason }: { id: string; reason: string }) => staffApi.suspendFan(id, reason));
  const reactivate = useStaffMutation((id: string) => staffApi.reactivateFan(id));
  return (
    <QueryView query={query}>
      {(fans) => (
        <FansPage
          fans={fans}
          query={search}
          onQueryChange={setSearch}
          canManage={can(staff.role, "users:manage")}
          onSuspend={(id, reason) => suspend.mutateAsync({ id, reason }).then(() => undefined)}
          onReactivate={(id) => reactivate.mutateAsync(id).then(() => undefined)}
          submitting={suspend.isPending || reactivate.isPending}
          serverError={errorMessage(suspend.error ?? reactivate.error)}
          refreshing={query.isFetching}
        />
      )}
    </QueryView>
  );
}

export function FanIdsView() {
  const query = useQuery({ queryKey: staffKeys.fanIds, queryFn: staffApi.fanIds });
  const approve = useStaffMutation((id: string) => staffApi.approveFanId(id));
  const reject = useStaffMutation(({ id, reason }: { id: string; reason: string }) => staffApi.rejectFanId(id, reason));
  const busyId = approve.isPending ? approve.variables : reject.isPending ? reject.variables?.id : undefined;
  return (
    <QueryView query={query}>
      {(reviews) => (
        <FanIdQueuePage
          reviews={reviews}
          onApprove={(id) => approve.mutateAsync(id).then(() => undefined)}
          onReject={(id, reason) => reject.mutateAsync({ id, reason }).then(() => undefined)}
          busyId={busyId}
          serverError={errorMessage(reject.error ?? approve.error)}
        />
      )}
    </QueryView>
  );
}

type RefundFilter = "in_review" | "refunded" | "rejected" | "all";

export function RefundsView() {
  const [status, setStatus] = useState<RefundFilter>("in_review");
  const query = useQuery({
    queryKey: staffKeys.refunds(status),
    queryFn: () => staffApi.refunds(status),
    placeholderData: keepPreviousData,
  });
  const approve = useStaffMutation((id: string) => staffApi.approveRefund(id));
  const reject = useStaffMutation(({ id, reason }: { id: string; reason: string }) => staffApi.rejectRefund(id, reason));
  const busyId = approve.isPending ? approve.variables : reject.isPending ? reject.variables?.id : undefined;
  return (
    <QueryView query={query}>
      {(refunds) => (
        <RefundsPage
          refunds={refunds}
          status={status}
          onStatusChange={setStatus}
          onApprove={(id) => approve.mutateAsync(id).then(() => undefined)}
          onReject={(id, reason) => reject.mutateAsync({ id, reason }).then(() => undefined)}
          busyId={busyId}
          serverError={errorMessage(reject.error ?? approve.error)}
        />
      )}
    </QueryView>
  );
}

export function RequestsView() {
  const staff = useStaff();
  const query = useQuery({ queryKey: staffKeys.requests, queryFn: staffApi.requests });
  const approve = useStaffMutation((id: string) => staffApi.approveRequest(id));
  const reject = useStaffMutation(({ id, reason }: { id: string; reason: string }) => staffApi.rejectRequest(id, reason));
  const busyId = approve.isPending ? approve.variables : reject.isPending ? reject.variables?.id : undefined;
  return (
    <QueryView query={query}>
      {(requests) => (
        <RequestsPage
          requests={requests}
          canDecide={can(staff.role, "requests:review")}
          onApprove={(id) => approve.mutateAsync(id).then(() => undefined)}
          onReject={(id, reason) => reject.mutateAsync({ id, reason }).then(() => undefined)}
          busyId={busyId}
          serverError={errorMessage(reject.error ?? approve.error)}
        />
      )}
    </QueryView>
  );
}

export function OrganizersView() {
  const query = useQuery({ queryKey: staffKeys.organizers, queryFn: staffApi.organizers });
  return <QueryView query={query}>{(organizers) => <OrganizersPage organizers={organizers} />}</QueryView>;
}

export function PayoutsView() {
  const staff = useStaff();
  const query = useQuery({ queryKey: staffKeys.payouts, queryFn: staffApi.payouts });
  return <QueryView query={query}>{(payouts) => <PayoutsPage payouts={payouts} viewerRole={staff.role} />}</QueryView>;
}

export function AuditView() {
  const query = useQuery({ queryKey: staffKeys.audit, queryFn: staffApi.audit });
  const [search, setSearch] = useState("");
  return <QueryView query={query}>{(entries) => <AuditPage entries={entries} query={search} onQueryChange={setSearch} />}</QueryView>;
}
