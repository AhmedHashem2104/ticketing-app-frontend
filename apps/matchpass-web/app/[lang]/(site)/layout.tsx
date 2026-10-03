import { Suspense } from "react";

/**
 * Every page of the site. Client views read the URL's search params, which needs a Suspense boundary on
 * statically rendered pages. It lives here rather than in the root layout so the catch-all 404 (outside
 * this group) is rendered before any streaming starts and keeps its HTTP 404 status.
 */
export default function SiteLayout({ children }: LayoutProps<"/[lang]">) {
  return <Suspense>{children}</Suspense>;
}
