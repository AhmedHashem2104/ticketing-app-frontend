"use client";

import type { Session, User } from "@repo/contracts";
import { LoadingState } from "@repo/design-system";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useSyncExternalStore, type ReactNode } from "react";
import { configureAuth } from "../api/client";
import { endpoints } from "../api/endpoints";
import { queryKeys } from "../api/keys";

const STORAGE_KEY = "matchpass.session";

/* ---------- Token store (localStorage-backed, subscribable) ---------- */

const listeners = new Set<() => void>();
let token: string | null | undefined;

function readToken(): string | null {
  if (token === undefined) {
    try {
      token = window.localStorage.getItem(STORAGE_KEY);
    } catch {
      token = null;
    }
  }
  return token;
}

export const sessionStore = {
  getToken: (): string | null => (typeof window === "undefined" ? null : readToken()),
  setToken(next: string | null) {
    token = next;
    try {
      if (next) window.localStorage.setItem(STORAGE_KEY, next);
      else window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Storage can be unavailable (private mode); the session still lives in memory.
    }
    listeners.forEach((listener) => listener());
  },
  subscribe(listener: () => void) {
    listeners.add(listener);
    const onStorage = (event: StorageEvent) => {
      if (event.key === STORAGE_KEY) {
        token = event.newValue;
        listener();
      }
    };
    window.addEventListener("storage", onStorage);
    return () => {
      listeners.delete(listener);
      window.removeEventListener("storage", onStorage);
    };
  },
};

configureAuth({ get: sessionStore.getToken, onUnauthorized: () => sessionStore.setToken(null) });

/** `undefined` while hydrating (server snapshot), then the token or `null`. */
export function useToken() {
  return useSyncExternalStore(sessionStore.subscribe, sessionStore.getToken, () => undefined);
}

/* ---------- useAuth ---------- */

export type AuthState =
  { status: "loading"; user?: undefined } | { status: "signed_out"; user?: undefined } | { status: "signed_in"; user: User };

export function useAuth() {
  const queryClient = useQueryClient();
  const currentToken = useToken();
  const me = useQuery({ queryKey: queryKeys.me, queryFn: endpoints.me, enabled: !!currentToken, staleTime: 60_000 });

  const state: AuthState =
    currentToken === undefined || (currentToken && me.isPending)
      ? { status: "loading" }
      : currentToken && me.data
        ? { status: "signed_in", user: me.data }
        : { status: "signed_out" };

  const signIn = useCallback(
    (session: Session) => {
      queryClient.setQueryData(queryKeys.me, session.user);
      sessionStore.setToken(session.token);
    },
    [queryClient],
  );

  const signOut = useCallback(async () => {
    await endpoints.logout().catch(() => undefined);
    sessionStore.setToken(null);
    queryClient.clear();
  }, [queryClient]);

  const refreshUser = useCallback(() => queryClient.invalidateQueries({ queryKey: queryKeys.me }), [queryClient]);

  return { ...state, signIn, signOut, refreshUser };
}

/* ---------- RequireAuth ---------- */

/** Redirects signed-out visitors to /login and returns them afterwards. */
export function RequireAuth({ children }: { children: (user: User) => ReactNode }) {
  const auth = useAuth();
  const router = useRouter();
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
  return next && next.startsWith("/") && !next.startsWith("//") ? next : fallback;
}
