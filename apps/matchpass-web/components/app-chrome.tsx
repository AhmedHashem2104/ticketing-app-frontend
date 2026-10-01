"use client";

import { SiteFooter, SiteHeader } from "@repo/design-system";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth/session";
import { useFeatureFlags } from "@/lib/feature-flags/client";
import { routes } from "@/lib/routes";

export type NavId = "matches" | "concerts" | "cinema" | "resale" | "tickets";

/** The site header wired to feature flags and the signed-in user. */
export function AppHeader({ active }: { active?: NavId }) {
  const flags = useFeatureFlags();
  const auth = useAuth();
  const [rtl, setRtl] = useState(false);

  useEffect(() => {
    document.documentElement.dir = rtl ? "rtl" : "ltr";
    document.documentElement.lang = rtl ? "ar" : "en";
  }, [rtl]);

  const links = [
    { id: "matches", label: "Matches", href: routes.events("matches") },
    { id: "concerts", label: "Concerts & events", href: routes.events("concerts") },
    ...(flags.cinema ? [{ id: "cinema", label: "Cinema", href: routes.cinema }] : []),
    ...(flags.resale ? [{ id: "resale", label: "Resale", href: routes.resale() }] : []),
    { id: "tickets", label: "My tickets", href: routes.myTickets },
  ];

  const account =
    auth.status === "signed_in"
      ? { status: "signed_in" as const, initials: auth.user.initials, name: auth.user.fullName, href: routes.myTickets }
      : auth.status === "signed_out"
        ? {
            status: "signed_out" as const,
            signInHref: routes.login(),
            ...(flags.fanId ? { cta: { label: "Get your Fan ID", href: routes.signUp } } : {}),
          }
        : { status: "loading" as const };

  return (
    <SiteHeader
      links={links}
      activeId={active}
      account={account}
      languageToggle={
        flags.arabicLanguage
          ? { label: rtl ? "Switch to English" : "Switch to Arabic", glyph: rtl ? "EN" : "ع", onToggle: () => setRtl((v) => !v) }
          : undefined
      }
    />
  );
}

export function AppFooter() {
  const flags = useFeatureFlags();
  return (
    <SiteFooter
      tagline="Official tickets for football, concerts and live events."
      legal={`© ${new Date().getFullYear()} Matchpass. Prices in Egyptian pounds and include VAT.`}
      columns={[
        {
          title: "Fans",
          links: [
            { label: "Matches", href: routes.events("matches") },
            { label: "Concerts & events", href: routes.events("concerts") },
            ...(flags.resale ? [{ label: "Official resale", href: routes.resale() }] : []),
            ...(flags.fanId ? [{ label: "Fan ID", href: routes.fanId }] : []),
          ],
        },
        {
          title: "Organisers",
          links: [
            { label: "Sell tickets with us", href: "/info/organisers" },
            { label: "Organiser log in", href: "/info/organiser-login" },
            { label: "Fees", href: "/info/fees" },
          ],
        },
        {
          title: "Help & legal",
          links: [
            { label: "Help centre", href: "/info/help" },
            { label: "Terms of sale", href: "/info/terms" },
            ...(flags.refunds ? [{ label: "Refund policy", href: routes.refunds }] : []),
            { label: "Privacy policy", href: "/info/privacy" },
          ],
        },
      ]}
    />
  );
}
