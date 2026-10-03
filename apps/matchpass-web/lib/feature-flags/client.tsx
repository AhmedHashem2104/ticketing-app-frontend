"use client";

import { useEffect, useSyncExternalStore, type ReactNode } from "react";
import { createStore } from "zustand/vanilla";
import { allFlagsOff, featureFlagNames, type FeatureFlag, type FeatureFlags } from "./schema";

/**
 * Feature flags in a zustand store. Flags are read from the config file on the server for each request
 * and are the same for every visitor, so one store is safe to share; `HydrateFeatureFlags` applies the
 * server's values before anything below it renders.
 */
export const flagsStore = createStore<FeatureFlags>()(() => allFlagsOff);

const sameFlags = (a: FeatureFlags, b: FeatureFlags) => featureFlagNames.every((name) => a[name] === b[name]);

let hydrated = false;

/** Puts the server's flag values into the store, then renders `children`. */
export function HydrateFeatureFlags({ flags, children }: { flags: FeatureFlags; children: ReactNode }) {
  // First render (server, or the browser's hydration pass): apply synchronously so children read the
  // right values immediately. Later changes (flags edited while the tab is open) go through an effect,
  // so a store update never happens while other components render.
  if ((typeof window === "undefined" || !hydrated) && !sameFlags(flagsStore.getState(), flags)) {
    flagsStore.setState(flags, true);
  }
  useEffect(() => {
    hydrated = true;
    if (!sameFlags(flagsStore.getState(), flags)) flagsStore.setState(flags, true);
  }, [flags]);
  return children;
}

/** Back to "everything off, not hydrated" (tests). */
export function resetFeatureFlags() {
  hydrated = false;
  flagsStore.setState(allFlagsOff, true);
}

function useFlags<T>(select: (flags: FeatureFlags) => T): T {
  return useSyncExternalStore(
    flagsStore.subscribe,
    () => select(flagsStore.getState()),
    () => select(flagsStore.getState()),
  );
}

const all = (flags: FeatureFlags) => flags;

export const useFeatureFlags = () => useFlags(all);
export const useFeatureFlag = (flag: FeatureFlag) => useFlags((flags) => flags[flag]);

/** Renders `children` only when `flag` is on (otherwise `fallback`). */
export function FeatureGate({ flag, children, fallback = null }: { flag: FeatureFlag; children: ReactNode; fallback?: ReactNode }) {
  return useFeatureFlag(flag) ? children : fallback;
}
