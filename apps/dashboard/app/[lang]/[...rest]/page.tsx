import { notFound } from "next/navigation";

/** Any path inside a language that matches no page gets the localized 404 page. */
export default function CatchAll() {
  notFound();
}
