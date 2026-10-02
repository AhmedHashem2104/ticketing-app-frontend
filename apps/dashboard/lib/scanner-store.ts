"use client";

import type { EntryScan } from "@repo/contracts";
import { useStore } from "zustand";
import { createStore } from "zustand/vanilla";

/**
 * Gate scanner state that outlives the Entry page: which event the steward is checking in and the last
 * result shown, so switching to another section and back keeps the scanner where it was.
 */
type ScannerState = {
  eventId?: string;
  lastScan?: EntryScan;
  selectEvent: (eventId: string) => void;
  showResult: (scan: EntryScan) => void;
};

const initial = { eventId: undefined, lastScan: undefined };

export const scannerStore = createStore<ScannerState>()((set) => ({
  ...initial,
  selectEvent: (eventId) => set({ eventId, lastScan: undefined }),
  showResult: (lastScan) => set({ lastScan }),
}));

export const useScanner = <T>(select: (state: ScannerState) => T) => useStore(scannerStore, select);

/** Back to a fresh scanner (sign-out, tests). */
export const resetScanner = () => scannerStore.setState(initial);
