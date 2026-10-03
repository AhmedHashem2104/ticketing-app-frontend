"use client";

import type { StaffUser } from "@repo/contracts";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect } from "react";
import { configureAuth } from "./api/client";
import { staffApi, staffKeys } from "./api/staff";
import { resetScanner } from "./scanner-store";

export type StaffAuth =
  { status: "loading"; staff?: undefined } | { status: "signed_out"; staff?: undefined } | { status: "signed_in"; staff: StaffUser };

/**
 * Who is signed in, from `GET /staff/me` (the token is an httpOnly cookie the browser sends itself).
 * Any 401 mid-visit means the session ended, so the dashboard falls back to signed out.
 */
export function useStaffAuth() {
  const queryClient = useQueryClient();
  const me = useQuery({ queryKey: staffKeys.me, queryFn: staffApi.meOrNull, staleTime: 60_000, retry: false });

  useEffect(() => {
    configureAuth({ onUnauthorized: () => queryClient.setQueryData(staffKeys.me, null) });
  }, [queryClient]);

  const state: StaffAuth = me.isPending
    ? { status: "loading" }
    : me.data
      ? { status: "signed_in", staff: me.data }
      : { status: "signed_out" };

  const signIn = useCallback((staff: StaffUser) => queryClient.setQueryData(staffKeys.me, staff), [queryClient]);

  const signOut = useCallback(async () => {
    await staffApi.logout().catch(() => undefined);
    queryClient.clear();
    resetScanner();
    queryClient.setQueryData(staffKeys.me, null);
  }, [queryClient]);

  return { ...state, signIn, signOut };
}

/** Only same-site relative paths are allowed as post-sign-in destinations. */
export function safeNextPath(next: string | null | undefined, fallback = "/") {
  return next && next.startsWith("/") && !next.startsWith("//") && !next.startsWith("/\\") ? next : fallback;
}

/** The signed-in staff member, for pages rendered inside `StaffFrame` (which only renders them once signed in). */
export function useStaff(): StaffUser {
  const auth = useStaffAuth();
  if (auth.status !== "signed_in") throw new Error("useStaff() must be used inside StaffFrame");
  return auth.staff;
}
