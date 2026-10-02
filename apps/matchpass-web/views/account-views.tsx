"use client";

import { addSeconds, type FanIdExtracted, type User } from "@repo/contracts";
import { AccountPage, FanIdPage, ForgotPasswordPage, LoginPage, NotificationsPage, SignUpPage } from "@repo/design-system";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { AppHeader } from "@/components/app-chrome";
import { errorMessage, toApiError } from "@/lib/api/client";
import { RequireAuth, safeNextPath, useAuth } from "@/lib/auth/session";
import { useFeatureFlags } from "@/lib/feature-flags/client";
import {
  useFanIdDocuments,
  useFanIdSubmit,
  useForgotPassword,
  useLinkFan,
  useLogin,
  useMarkNotificationsRead,
  useNotifications,
  useResendCode,
  useResetPassword,
  useSignUp,
  useUnlinkFan,
  useUpdatePreferences,
  useVerifyOtp,
} from "@/lib/queries";
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

const resendAt = (seconds: number) => addSeconds(new Date(), seconds).toISOString();

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
                  resendAvailableAt: resendAt(res.resendInSeconds),
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
            onSuccess: (res) => setPending({ ...pending, resendAvailableAt: resendAt(res.resendInSeconds) }),
          }),
        onChangeNumber: () => {
          verify.reset();
          setPending(undefined);
        },
        submitting: verify.isPending,
        serverError: errorMessage(verify.error ?? resend.error),
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
      notice={
        params.get("reset")
          ? "Your password was changed. You're signed in on this device only."
          : params.get("next")
            ? "Log in to continue."
            : undefined
      }
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
        forgotHref: routes.forgotPassword,
      }}
    />
  );
}

/* ---------- Forgot password ---------- */

export function ForgotPasswordView() {
  const router = useRouter();
  const auth = useAuth();
  const forgot = useForgotPassword();
  const reset = useResetPassword();
  const [request, setRequest] = useState<{ verificationId: string; maskedPhone: string }>();
  return (
    <ForgotPasswordPage
      brand={authBrand}
      topRight={<LanguageToggle />}
      form={{
        stage: request ? "reset" : "request",
        maskedPhone: request?.maskedPhone,
        onRequest: (values) =>
          forgot.mutate(values, { onSuccess: (res) => setRequest({ verificationId: res.verificationId, maskedPhone: res.maskedPhone }) }),
        onReset: (values) =>
          reset.mutate(
            { verificationId: request!.verificationId, ...values },
            {
              onSuccess: (session) => {
                auth.signIn(session);
                router.replace(routes.myTickets);
              },
            },
          ),
        onStartOver: () => {
          reset.reset();
          setRequest(undefined);
        },
        submitting: forgot.isPending || reset.isPending,
        serverError: errorMessage(request ? reset.error : forgot.error),
        loginHref: routes.login(),
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
  const documents = useFanIdDocuments();
  const submit = useFanIdSubmit();
  const [step, setStep] = useState(user.fanId.status === "none" ? 1 : 5);
  const [extracted, setExtracted] = useState<FanIdExtracted>();
  const underReview = user.fanId.status === "pending";

  // The identity check runs asynchronously: poll the profile until it's decided.
  useEffect(() => {
    if (!underReview) return;
    const id = setInterval(() => void auth.refreshUser(), 3_000);
    return () => clearInterval(id);
  }, [underReview, auth]);

  return (
    <FanIdPage
      header={<AppHeader />}
      wizard={{
        step,
        onStepChange: setStep,
        onScan: (values) =>
          documents.mutate(values, {
            onSuccess: (data) => {
              setExtracted(data);
              setStep(3);
            },
          }),
        extracted,
        onSubmit: (values) =>
          submit.mutate(values, {
            onSuccess: () => {
              void auth.refreshUser();
              setStep(5);
            },
          }),
        approved:
          user.fanId.status === "approved"
            ? { name: user.fanId.nameEn, number: user.fanId.number, validUntil: user.fanId.validUntil }
            : undefined,
        underReview,
        pending: documents.isPending || submit.isPending,
        serverError: errorMessage(documents.error ?? submit.error),
        browseHref: routes.events("matches"),
        skipHref: routes.events("concerts"),
        linkFansHref: routes.account,
      }}
    />
  );
}

/* ---------- Account ---------- */

export function AccountView() {
  return <RequireAuth>{(user) => <Account user={user} />}</RequireAuth>;
}

function Account({ user }: { user: User }) {
  const router = useRouter();
  const auth = useAuth();
  const flags = useFeatureFlags();
  const preferences = useUpdatePreferences();
  const link = useLinkFan();
  const unlink = useUnlinkFan();
  return (
    <AccountPage
      header={<AppHeader />}
      status="success"
      profile={{
        user,
        fanIdHref: routes.fanId,
        onSignOut: async () => {
          await auth.signOut();
          router.replace(routes.home);
        },
      }}
      fans={
        flags.fanId
          ? {
              fans: user.linkedFans,
              canLink: user.fanId.status === "approved",
              onLink: async (values) => {
                await link.mutateAsync(values).catch(() => undefined);
              },
              onUnlink: (id) => unlink.mutate(id),
              submitting: link.isPending,
              serverError: errorMessage(link.error ?? unlink.error),
            }
          : undefined
      }
      preferences={{
        defaultValues: user.preferences,
        onSubmit: (values) => preferences.mutate(values),
        submitting: preferences.isPending,
        saved: preferences.isSuccess,
        serverError: errorMessage(preferences.error),
      }}
      links={[
        { label: "My tickets", description: "QR codes, transfers and resale", href: routes.myTickets },
        { label: "Ticket transfers", description: "Accept tickets sent to you", href: routes.transfers },
        ...(flags.refunds ? [{ label: "Refunds", description: "Request and track refunds", href: routes.refunds }] : []),
        { label: "Notifications", description: "Orders, transfers and event updates", href: routes.notifications },
        { label: "Help centre", description: "Fan ID, payments and entry", href: "/info/help" },
      ]}
    />
  );
}

/* ---------- Notifications ---------- */

export function NotificationsView() {
  return <RequireAuth>{() => <Notifications />}</RequireAuth>;
}

function Notifications() {
  const list = useNotifications();
  const markRead = useMarkNotificationsRead();
  return (
    <NotificationsPage
      header={<AppHeader />}
      status={list.isPending ? "loading" : list.isError ? "error" : "success"}
      onRetry={() => void list.refetch()}
      items={list.data?.items ?? []}
      onMarkAllRead={() => markRead.mutate(undefined)}
    />
  );
}
