import { redirect } from "next/navigation";
import { requireFeature } from "@/lib/feature-flags/server";
import { localizePath } from "@repo/i18n";
import { routes } from "@/lib/routes";
import { currentLocale } from "@/lib/server/api";

/** Cinema lives on the browse page as its own tab (every film and its showtimes). */
export default async function Page() {
  await requireFeature("cinema");
  redirect(localizePath(routes.events("cinema"), await currentLocale()));
}
