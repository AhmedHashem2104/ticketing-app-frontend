import "@testing-library/jest-dom/vitest";
import { resetUI } from "@repo/design-system";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";
import { resetFeatureFlags } from "@/lib/feature-flags/client";

afterEach(() => {
  cleanup();
  resetFeatureFlags();
  resetUI();
});
