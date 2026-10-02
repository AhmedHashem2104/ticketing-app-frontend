import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/server/api";

/** Dynamic so SITE_URL can change per environment without a rebuild. */
export const dynamic = "force-dynamic";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/checkout/", "/orders/", "/tickets", "/refunds", "/resale", "/account", "/transfers", "/notifications", "/api/"],
      },
    ],
    sitemap: `${siteUrl()}/sitemap.xml`,
  };
}
