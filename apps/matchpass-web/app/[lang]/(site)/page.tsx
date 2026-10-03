import { dehydrate, HydrationBoundary, QueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/api/keys";
import { serverApi } from "@/lib/server/api";
import { HomeView } from "@/views/home-view";

export default async function Page() {
  const home = await serverApi.home();
  const queryClient = new QueryClient();
  if (home) queryClient.setQueryData(queryKeys.home, home);
  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <HomeView />
    </HydrationBoundary>
  );
}
