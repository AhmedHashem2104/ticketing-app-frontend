"use client";

import { createContext, useContext, type ReactNode } from "react";
import { allFlagsOff, type FeatureFlag, type FeatureFlags } from "./schema";

const FeatureFlagsContext = createContext<FeatureFlags>(allFlagsOff);

export function FeatureFlagsProvider({ flags, children }: { flags: FeatureFlags; children: ReactNode }) {
  return <FeatureFlagsContext.Provider value={flags}>{children}</FeatureFlagsContext.Provider>;
}

export const useFeatureFlags = () => useContext(FeatureFlagsContext);
export const useFeatureFlag = (flag: FeatureFlag) => useContext(FeatureFlagsContext)[flag];

/** Renders `children` only when `flag` is on (otherwise `fallback`). */
export function FeatureGate({ flag, children, fallback = null }: { flag: FeatureFlag; children: ReactNode; fallback?: ReactNode }) {
  return useFeatureFlag(flag) ? children : fallback;
}
