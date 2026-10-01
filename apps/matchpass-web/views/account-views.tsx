"use client";

import type { FanIdExtracted, FanIdStatus, User } from "@repo/contracts";
import { FanIdPage, LoginPage, SignUpPage } from "@repo/design-system";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { AppHeader } from "@/components/app-chrome";
import { errorMessage, toApiError } from "@/lib/api/client";
import { RequireAuth, safeNextPath, useAuth } from "@/lib/auth/session";
import { useFeatureFlags } from "@/lib/feature-flags/client";
import { useFanIdScan, useFanIdSubmit, useLogin, useResendCode, useSignUp, useVerifyOtp } from "@/lib/queries";
import { routes } from "@/lib/routes";
import { authBrand } from "./shared";

function LanguageToggle() {
  const flags = useFeatureFlags();
  const [rtl, setRtl] = useState(false);
  useEffect(() => {
    document.documentElement.dir = rtl ? "rtl" : "ltr";
  }, [rtl]);
  if (!flags.arabicLanguage) return null;
  return (
    <button
      type="button"
      aria-label={rtl ? "Switch to English" : "Switch to Arabic"}
      onClick={() => setRtl((v) => !v)}
      className="h-11 min-w-11 rounded-lg border border-line bg-white"
    >
      {rtl ? "EN" : "ع"}
    </button>
  );
}

/* ---------- Sign up + OTP ---------- */

export function SignUpView() {
  const router = useRouter();
  const params = useSearchParams();
  const flags = useFeatureFlags();
  const auth = useAuth();
  const signUp = useSignUp();
  const verify = useVerifyOtp();
  const resend = useResendCode();
  const [pending, setPending] = useState<{ verificationId: string; maskedPhone: string; resendAvailableAt: string }>();
  const next = safeNextPath(params.get("next"), flags.fanId ? routes.fanId : routes.home);
  const signUpError = signUp.error ? toApiError(signUp.error) : undefined;

  if (!pending) {
    return (
      <SignUpPage
        stage="details"
        brand={authBrand}
        topRight={<LanguageToggle />}
        signUp={{
          onSubmit: (values) =>
            signUp.mutate(values, {
              onSuccess: (res) =>
                setPending({
                  verificationId: res.verificationId,
                  maskedPhone: res.maskedPhone,
                  resendAvailableAt: new Date(Date.now() + res.resendInSeconds * 1000).toISOString(),
                }),
            }),
          submitting: signUp.isPending,
          serverError: signUpError?.message,
          fieldErrors: signUpError?.code === "CONFLICT" ? { phone: signUpError.message } : signUpError?.fieldErrors,
          loginHref: routes.login(params.get("next") ?? undefined),
        }}
      />
    );
  }

  return (
    <SignUpPage
      stage="otp"
      brand={authBrand}
      topRight={<LanguageToggle />}
      otp={{
        maskedPhone: pending.maskedPhone,
        resendAvailableAt: pending.resendAvailableAt,
        onSubmit: (code) =>
          verify.mutate(
            { verificationId: pending.verificationId, code },
            {
              onSuccess: (session) => {
                auth.signIn(session);
                router.replace(next);
              },
            },
          ),
        onResend: () =>
          resend.mutate(pending.verificationId, {
            onSuccess: (res) =>
              setPending({ ...pending, resendAvailableAt: new Date(Date.now() + res.resendInSeconds * 1000).toISOString() }),
          }),
        onChangeNumber: () => {
          verify.reset();
          setPending(undefined);
        },
        submitting: verify.isPending,
        serverError: errorMessage(verify.error),
        note: flags.fanId
          ? "Next we'll set up your Fan ID — you need it for football matches. You can skip it if you only buy concert tickets."
          : undefined,
      }}
    />
  );
}

/* ---------- Log in ---------- */

export function LoginView() {
  const router = useRouter();
  const params = useSearchParams();
  const auth = useAuth();
  const login = useLogin();
  const next = safeNextPath(params.get("next"));

  useEffect(() => {
    if (auth.status === "signed_in" && !login.isPending) router.replace(next);
  }, [auth.status, login.isPending, next, router]);

  return (
    <LoginPage
      brand={authBrand}
      topRight={<LanguageToggle />}
      notice={params.get("next") ? "Log in to continue." : undefined}
      login={{
        onSubmit: (values) =>
          login.mutate(values, {
            onSuccess: (session) => {
              auth.signIn(session);
              router.replace(next);
            },
          }),
        submitting: login.isPending,
        serverError: errorMessage(login.error),
        signUpHref: params.get("next") ? `${routes.signUp}?next=${encodeURIComponent(params.get("next")!)}` : routes.signUp,
      }}
    />
  );
}

/* ---------- Fan ID ---------- */

export function FanIdView() {
  return <RequireAuth>{(user) => <FanIdFlow user={user} />}</RequireAuth>;
}

function FanIdFlow({ user }: { user: User }) {
  const auth = useAuth();
  const scan = useFanIdScan();
  const submit = useFanIdSubmit();
  const [step, setStep] = useState(user.fanId.status === "approved" ? 5 : 1);
  const [extracted, setExtracted] = useState<FanIdExtracted>();
  const [approved, setApproved] = useState<Extract<FanIdStatus, { status: "approved" }> | undefined>(
    user.fanId.status === "approved" ? user.fanId : undefined,
  );

  return (
    <FanIdPage
      header={<AppHeader />}
      wizard={{
        step,
        onStepChange: setStep,
        onScan: (values) => scan.mutate(values, { onSuccess: (data) => (setExtracted(data), setStep(3)) }),
        extracted,
        onSubmit: (values) =>
          submit.mutate(values, {
            onSuccess: (status) => {
              if (status.status === "approved") setApproved(status);
              void auth.refreshUser();
              setStep(5);
            },
          }),
        approved: approved ? { name: approved.nameEn, number: approved.number, validUntil: approved.validUntil } : undefined,
        pending: scan.isPending || submit.isPending,
        serverError: errorMessage(scan.error ?? submit.error),
        browseHref: routes.events("matches"),
        skipHref: routes.home,
      }}
    />
  );
}
