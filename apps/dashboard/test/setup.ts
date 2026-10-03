import "@testing-library/jest-dom/vitest";
import { resetUI } from "@repo/design-system";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";
import { resetScanner } from "@/lib/scanner-store";

afterEach(() => {
  cleanup();
  resetScanner();
  resetUI();
});
