"use client";

import { LoadingState, useI18n } from "@repo/design-system";
import { StaffLoginForm, staffDemoLabels } from "@repo/design-system/dashboard";
import { useMutation } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { errorMessage } from "@/lib/api/client";
import { staffApi } from "@/lib/api/staff";
import { safeNextPath, useStaffAuth } from "@/lib/auth";
import { useLocalizedRouter } from "@/lib/i18n/navigation";
import { LanguageSwitch } from "@/components/language-switch";

/** Seeded mock-API staff accounts, one per role — offered as autofill buttons in development only. */
const DEMO_ACCOUNTS = [
  { role: "admin", email: "admin@matchpass.app", label: staffDemoLabels.admin },
  { role: "operations", email: "ops@matchpass.app", label: staffDemoLabels.operations },
  { role: "organizer", email: "hany@nilefc.example", label: staffDemoLabels.organizer },
] as const;

export function LoginView() {
  const auth = useStaffAuth();
  const router = useLocalizedRouter();
  const search = useSearchParams();
  const { t } = useI18n();
  const next = safeNextPath(search.get("next"));
  const login = useMutation({ mutationFn: staffApi.login, onSuccess: ({ staff }) => auth.signIn(staff) });

  useEffect(() => {
    if (auth.status === "signed_in") router.replace(next);
  }, [auth.status, next, router]);

  if (auth.status === "signed_in") return <LoadingState label={t("Signing in…")} className="min-h-dvh" />;
  return (
    <main>
      <StaffLoginForm
        onSubmit={(values) =>
          login.mutateAsync(values).then(
            () => undefined,
            () => undefined,
          )
        }
        submitting={login.isPending}
        serverError={errorMessage(login.error)}
        demoAccounts={process.env.NODE_ENV === "development" ? [...DEMO_ACCOUNTS] : undefined}
        languageSwitch={<LanguageSwitch />}
      />
    </main>
  );
}
