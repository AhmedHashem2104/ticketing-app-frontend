import { redirect } from "next/navigation";
import { requireFeature } from "@/lib/feature-flags/server";
import { routes } from "@/lib/routes";

/** The cinema currently screens one film; send fans straight to its showtimes. */
export default async function Page() {
  await requireFeature("cinema");
  redirect(routes.tickets("the-last-lighthouse"));
}
