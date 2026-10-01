"use client";

import { MessagePage } from "@repo/design-system";
import { AppFooter, AppHeader } from "@/components/app-chrome";
import { routes } from "@/lib/routes";

export const INFO_PAGES: Record<string, { title: string; body: string }> = {
  help: {
    title: "Help centre",
    body: "Questions about tickets, Fan ID, refunds or resale? Our support team replies within 24 hours at support@matchpass.app.",
  },
  terms: {
    title: "Terms of sale",
    body: "Tickets are sold on behalf of organisers. Each ticket is tied to its holder and must not be resold above face value.",
  },
  privacy: {
    title: "Privacy policy",
    body: "We use your ID only to verify your Fan ID. Images are encrypted and never shared with third parties.",
  },
  organisers: {
    title: "Sell tickets with us",
    body: "Matchpass powers ticketing for clubs, promoters and cinemas. Contact partners@matchpass.app to get started.",
  },
  "organiser-login": {
    title: "Organiser log in",
    body: "The organiser dashboard is available to verified partners. Contact your account manager for access.",
  },
  fees: {
    title: "Fees",
    body: "Fans pay a per-ticket service fee shown before payment. Official resale charges sellers 5% of the sale price.",
  },
};

export function InfoView({ slug }: { slug: string }) {
  const page = INFO_PAGES[slug]!;
  return (
    <MessagePage
      header={<AppHeader />}
      footer={<AppFooter />}
      title={page.title}
      body={page.body}
      action={{ label: "Browse events", href: routes.events() }}
    />
  );
}

export function NotFoundView() {
  return (
    <MessagePage
      header={<AppHeader />}
      footer={<AppFooter />}
      code="404"
      title="Page not found"
      body="The page you're looking for doesn't exist or isn't available right now."
      action={{ label: "Go to the home page", href: routes.home }}
    />
  );
}
