import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import { Providers } from "@/components/providers";
import { getFeatureFlags } from "@/lib/feature-flags/server";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Matchpass — Official tickets for matches, concerts & events", template: "%s · Matchpass" },
  description: "Official tickets for football, concerts and live events in Egypt. Fan ID, waiting rooms, official resale and refunds.",
  applicationName: "Matchpass",
};

export const viewport: Viewport = {
  themeColor: "#0E4D2F",
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const flags = await getFeatureFlags();
  return (
    <html lang="en" dir="ltr">
      <body>
        <Providers flags={flags}>
          <Suspense>{children}</Suspense>
        </Providers>
      </body>
    </html>
  );
}
