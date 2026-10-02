import { redirect } from "next/navigation";
import { requireFeature } from "@/lib/feature-flags/server";
import { routes } from "@/lib/routes";

/** Cinema lives on the browse page as its own tab (every film and its showtimes). */
export default async function Page() {
  await requireFeature("cinema");
  redirect(routes.events("cinema"));
}
