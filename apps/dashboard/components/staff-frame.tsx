"use client";

import { EmptyState, LinkButton, LoadingState, useI18n } from "@repo/design-system";
import { DashboardShell, staffNavFor, staffNavIdOf } from "@repo/design-system/dashboard";
import { stripLocale } from "@repo/i18n";
import { useQuery } from "@tanstack/react-query";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { staffApi, staffKeys } from "@/lib/api/staff";
import { useStaffAuth } from "@/lib/auth";
import { useLocalizedRouter } from "@/lib/i18n/navigation";
import { LanguageSwitch } from "./language-switch";

/** Waiting-work counts from the overview's task list, keyed by menu section. */
const TASK_SECTIONS: Record<string, string> = { fanid: "fan-ids", refunds: "refunds", requests: "requests" };

/**
 * Every signed-in dashboard page: checks the staff session (sending signed-out visitors to sign in and
 * back), frames the page in the role's menu, and refuses sections the role can't open. The API enforces
 * the same permissions on every call; this keeps people from landing on pages that would only fail.
 */
export function StaffFrame({ children }: { children: ReactNode }) {
  const auth = useStaffAuth();
  const router = useLocalizedRouter();
  const pathname = usePathname();
  const search = useSearchParams();
  const { t } = useI18n();
  const [signingOut, setSigningOut] = useState(false);
  const signedIn = auth.status === "signed_in";
  const overview = useQuery({ queryKey: staffKeys.overview, queryFn: staffApi.overview, enabled: signedIn, refetchInterval: 60_000 });

  useEffect(() => {
    if (auth.status === "signed_out" && !signingOut) {
      const here = stripLocale(`${pathname}${search.size ? `?${search.toString()}` : ""}`);
      router.replace(here === "/" ? "/login" : `/login?next=${encodeURIComponent(here)}`);
    }
  }, [auth.status, pathname, router, search, signingOut]);

  if (auth.status !== "signed_in") return <LoadingState label={t("Checking your account")} className="min-h-dvh" />;

  const counts = Object.fromEntries((overview.data?.tasks ?? []).map((task) => [TASK_SECTIONS[task.id] ?? task.id, task.count]));
  const section = staffNavIdOf(pathname);
  const allowed = !section || staffNavFor(auth.staff.role).some((item) => item.id === section);

  return (
    <DashboardShell
      staff={auth.staff}
      currentPath={stripLocale(pathname)}
      counts={counts}
      languageSwitch={<LanguageSwitch />}
      signingOut={signingOut}
      onSignOut={async () => {
        setSigningOut(true);
        await auth.signOut();
        router.replace("/login");
      }}
    >
      {allowed ? (
        children
      ) : (
        <EmptyState
          title={t("You don't have access to this page")}
          action={
            <LinkButton href="/" size="lg">
              {t("Back to overview")}
            </LinkButton>
          }
        >
          {t("Your role can't open this section. Ask an admin if you need it.")}
        </EmptyState>
      )}
    </DashboardShell>
  );
}
