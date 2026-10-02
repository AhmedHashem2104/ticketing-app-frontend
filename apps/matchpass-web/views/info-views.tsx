"use client";

import { InfoPage, MessagePage } from "@repo/design-system";
import { AppFooter, AppHeader } from "@/components/app-chrome";
import type { InfoPageContent } from "@/lib/content/info-pages";
import { routes } from "@/lib/routes";

export function InfoView({ page, slug }: { page: InfoPageContent; slug: string }) {
  return (
    <InfoPage
      header={<AppHeader />}
      footer={<AppFooter />}
      eyebrow={page.eyebrow}
      title={page.title}
      intro={page.intro}
      updated={page.updated}
      sections={page.sections}
      contact={slug === "contact" ? undefined : { label: "Contact support", href: "/info/contact" }}
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
