"use client";

import { citySchema, type City, type EventTab } from "@repo/contracts";
import { EventsPage, type EventFilters } from "@repo/design-system";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { AppFooter, AppHeader } from "@/components/app-chrome";
import { useEvents } from "@/lib/queries";
import { eventHref } from "@/lib/routes";

const DEFAULT_FACETS: Record<EventTab, { categories: string[]; cities: City[] }> = {
  matches: {
    categories: ["Premier League", "Cup", "National team", "African club competitions", "Women’s league"],
    cities: ["cairo", "alexandria", "canal", "red_sea"],
  },
  concerts: {
    categories: ["Concerts", "Festivals", "Comedy", "Theatre", "Classical", "Family"],
    cities: ["cairo", "alexandria", "canal", "red_sea"],
  },
};

const list = (value: string | null) => (value ? value.split(",").filter(Boolean) : []);

/** Browse page — all filter state lives in the URL so results are shareable and survive refresh. */
export function EventsView() {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const tab: EventTab = params.get("tab") === "concerts" ? "concerts" : "matches";
  const q = params.get("q") ?? "";
  const filters: EventFilters = useMemo(
    () => ({
      categories: list(params.get("categories")),
      cities: list(params.get("cities")).filter((c): c is City => citySchema.safeParse(c).success),
      from: params.get("from") ?? undefined,
      availableOnly: params.get("available") === "1",
    }),
    [params],
  );
  const [search, setSearch] = useState(q);

  const update = (patch: Record<string, string | undefined>) => {
    const next = new URLSearchParams(params.toString());
    for (const [key, value] of Object.entries(patch)) {
      if (value) next.set(key, value);
      else next.delete(key);
    }
    router.replace(`${pathname}?${next.toString()}`, { scroll: false });
  };

  // Debounce typing into the URL (and therefore the API).
  useEffect(() => {
    if (search === q) return;
    const id = setTimeout(() => update({ q: search.trim() || undefined }), 300);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `update` reads the latest params on each call
  }, [search]);

  const events = useEvents({
    tab,
    q: q || undefined,
    categories: filters.categories,
    cities: filters.cities,
    from: filters.from,
    availableOnly: filters.availableOnly,
  });
  const facets = events.data?.facets ?? DEFAULT_FACETS[tab];

  return (
    <EventsPage
      header={<AppHeader active={tab} />}
      footer={<AppFooter />}
      tab={tab}
      onTabChange={(next) => {
        setSearch("");
        router.replace(`${pathname}?tab=${next}`, { scroll: false });
      }}
      search={search}
      onSearchChange={setSearch}
      filters={filters}
      onFiltersChange={(f) =>
        update({
          categories: f.categories.join(",") || undefined,
          cities: f.cities.join(",") || undefined,
          from: f.from,
          available: f.availableOnly ? "1" : undefined,
        })
      }
      onClearFilters={() => {
        setSearch("");
        router.replace(`${pathname}?tab=${tab}`, { scroll: false });
      }}
      facets={{ categories: facets.categories, cities: facets.cities.length ? facets.cities : DEFAULT_FACETS[tab].cities }}
      results={{
        status: events.isPending ? "loading" : events.isError ? "error" : "success",
        events: events.data?.items ?? [],
        onRetry: () => void events.refetch(),
      }}
      hrefFor={eventHref}
    />
  );
}
