import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import { Providers } from "@/components/providers";
import { WebVitals } from "@/components/web-vitals";
import { getFeatureFlags } from "@/lib/feature-flags/server";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Matchpass — Official tickets for matches, concerts & events", template: "%s · Matchpass" },
  description: "Official tickets for football, concerts and live events in Egypt. Fan ID, waiting rooms, official resale and refunds.",
  applicationName: "Matchpass",
  metadataBase: new URL(process.env.SITE_URL ?? "http://localhost:3000"),
  openGraph: { type: "website", siteName: "Matchpass", locale: "en_EG" },
  twitter: { card: "summary" },
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
        <WebVitals />
        <Providers flags={flags}>
          <Suspense>{children}</Suspense>
        </Providers>
      </body>
    </html>
  );
}
