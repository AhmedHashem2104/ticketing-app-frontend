import type { MetadataRoute } from "next";
import { locales } from "@repo/i18n";
import { siteUrl } from "@/lib/server/api";

/** Signed-in pages, kept out of search results in every language. */
const PRIVATE_PATHS = ["/checkout/", "/orders/", "/tickets", "/refunds", "/resale", "/account", "/transfers", "/notifications"];

/** Dynamic so SITE_URL can change per environment without a rebuild. */
export const dynamic = "force-dynamic";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/", ...locales.flatMap((locale) => PRIVATE_PATHS.map((path) => `/${locale}${path}`))],
      },
    ],
    sitemap: `${siteUrl()}/sitemap.xml`,
  };
}
