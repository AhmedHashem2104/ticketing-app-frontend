"use client";

import { dayjs } from "@repo/contracts";
import { NotificationBell, SiteFooter, SiteHeader, useI18n } from "@repo/design-system";
import { useLanguageSwitch } from "@/components/language-switch";
import { useAuth } from "@/lib/auth/session";
import { useFeatureFlags } from "@/lib/feature-flags/client";
import { useMarkNotificationsRead, useNotifications } from "@/lib/queries";
import { routes } from "@/lib/routes";
import { useLocalizedRouter } from "@/lib/i18n/navigation";

function AppNotifications() {
  const list = useNotifications();
  const markRead = useMarkNotificationsRead();
  return (
    <NotificationBell
      items={(list.data?.items ?? []).slice(0, 8)}
      unread={list.data?.unread ?? 0}
      onMarkAllRead={() => markRead.mutate(undefined)}
      onOpenChange={(open) => (open ? void list.refetch() : undefined)}
      allHref={routes.notifications}
    />
  );
}

export type NavId = "matches" | "concerts" | "cinema" | "resale" | "tickets";

/** The site header wired to feature flags and the signed-in user. */
export function AppHeader({ active }: { active?: NavId }) {
  const flags = useFeatureFlags();
  const auth = useAuth();
  const router = useLocalizedRouter();
  const language = useLanguageSwitch();
  const { t } = useI18n();

  const links = [
    { id: "matches", label: t("Matches"), href: routes.events("matches") },
    { id: "concerts", label: t("Concerts & events"), href: routes.events("concerts") },
    ...(flags.cinema ? [{ id: "cinema", label: t("Cinema"), href: routes.events("cinema") }] : []),
    ...(flags.resale ? [{ id: "resale", label: t("Resale"), href: routes.resale() }] : []),
    { id: "tickets", label: t("My tickets"), href: routes.myTickets },
  ];

  const account =
    auth.status === "signed_in"
      ? {
          status: "signed_in" as const,
          initials: auth.user.initials,
          ...(auth.user.avatarUrl ? { avatarUrl: auth.user.avatarUrl } : {}),
          name: auth.user.fullName,
          href: routes.account,
          menu: {
            links: [
              { label: t("My tickets"), href: routes.myTickets },
              { label: t("Ticket transfers"), href: routes.transfers },
              ...(flags.fanId
                ? [{ label: auth.user.fanId.status === "approved" ? t("Fan ID") : t("Get your Fan ID"), href: routes.fanId }]
                : []),
              { label: t("Account & preferences"), href: routes.account },
            ],
            onSignOut: async () => {
              await auth.signOut();
              router.replace(routes.home);
            },
          },
        }
      : auth.status === "signed_out"
        ? {
            status: "signed_out" as const,
            signInHref: routes.login(),
            ...(flags.fanId ? { cta: { label: t("Get your Fan ID"), href: routes.signUp } } : {}),
          }
        : { status: "loading" as const };

  return (
    <SiteHeader
      links={links}
      activeId={active}
      account={account}
      notifications={auth.status === "signed_in" && flags.notificationCentre ? <AppNotifications /> : undefined}
      languageToggle={language ? { label: language.label, glyph: language.glyph, onToggle: language.onToggle } : undefined}
    />
  );
}

export function AppFooter() {
  const flags = useFeatureFlags();
  const { t } = useI18n();
  return (
    <SiteFooter
      tagline={t("Official tickets for football, concerts and live events.")}
      legal={t("© {year} Matchpass. Prices in Egyptian pounds and include VAT.", { year: dayjs().year() })}
      columns={[
        {
          title: t("Fans"),
          links: [
            { label: t("Matches"), href: routes.events("matches") },
            { label: t("Concerts & events"), href: routes.events("concerts") },
            ...(flags.resale ? [{ label: t("Official resale"), href: routes.resale() }] : []),
            ...(flags.fanId ? [{ label: t("Fan ID"), href: routes.fanId }] : []),
          ],
        },
        {
          title: t("Organisers"),
          links: [
            { label: t("Sell tickets with us"), href: "/info/organisers" },
            { label: t("Organiser log in"), href: "/info/organiser-login" },
            { label: t("Fees"), href: "/info/fees" },
          ],
        },
        {
          title: t("Help & legal"),
          links: [
            { label: t("Help centre"), href: "/info/help" },
            { label: t("Terms of sale"), href: "/info/terms" },
            { label: t("Refund policy"), href: "/info/refund-policy" },
            { label: t("Privacy policy"), href: "/info/privacy" },
            { label: t("Contact us"), href: "/info/contact" },
          ],
        },
      ]}
    />
  );
}
