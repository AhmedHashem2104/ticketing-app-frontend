"use client";

import type { ClientSession, User } from "@repo/contracts";
import { LoadingState } from "@repo/design-system";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { usePathname, useSearchParams } from "next/navigation";
import { useCallback, useEffect, type ReactNode } from "react";
import { configureAuth } from "../api/client";
import { endpoints } from "../api/endpoints";
import { queryKeys } from "../api/keys";
import { useLocalizedRouter } from "@/lib/i18n/navigation";

/* ---------- useAuth ---------- */

export type AuthState =
  { status: "loading"; user?: undefined } | { status: "signed_out"; user?: undefined } | { status: "signed_in"; user: User };

/**
 * Auth state comes from `GET /me`: the session token is an httpOnly cookie the browser sends
 * automatically, so "signed in" simply means the API recognises it.
 */
export function useAuth() {
  const queryClient = useQueryClient();
  const me = useQuery({ queryKey: queryKeys.me, queryFn: endpoints.meOrNull, staleTime: 60_000, retry: false });

  useEffect(() => {
    // Any 401 mid-visit means the session ended (expired, reset elsewhere): fall back to signed out.
    configureAuth({ onUnauthorized: () => queryClient.setQueryData(queryKeys.me, null) });
  }, [queryClient]);

  const state: AuthState = me.isPending
    ? { status: "loading" }
    : me.data
      ? { status: "signed_in", user: me.data }
      : { status: "signed_out" };

  const signIn = useCallback(
    (session: ClientSession) => {
      queryClient.setQueryData(queryKeys.me, session.user);
      void queryClient.invalidateQueries({ predicate: (q) => q.queryKey[0] !== "me" });
    },
    [queryClient],
  );

  const signOut = useCallback(async () => {
    await endpoints.logout().catch(() => undefined);
    queryClient.clear();
    queryClient.setQueryData(queryKeys.me, null);
  }, [queryClient]);

  const refreshUser = useCallback(() => queryClient.invalidateQueries({ queryKey: queryKeys.me }), [queryClient]);

  return { ...state, signIn, signOut, refreshUser };
}

/* ---------- RequireAuth ---------- */

/** Redirects signed-out visitors to /login and returns them afterwards. */
export function RequireAuth({ children }: { children: (user: User) => ReactNode }) {
  const auth = useAuth();
  const router = useLocalizedRouter();
  const pathname = usePathname();
  const search = useSearchParams();

  useEffect(() => {
    if (auth.status === "signed_out") {
      const next = `${pathname}${search.size ? `?${search.toString()}` : ""}`;
      router.replace(`/login?next=${encodeURIComponent(next)}`);
    }
  }, [auth.status, pathname, router, search]);

  if (auth.status !== "signed_in") return <LoadingState label="Checking your account" className="min-h-dvh" />;
  return children(auth.user);
}

/** Only allows same-site relative paths as post-login redirects. */
export function safeNextPath(next: string | null | undefined, fallback = "/") {
  return next && next.startsWith("/") && !next.startsWith("//") && !next.startsWith("/\\") ? next : fallback;
}
