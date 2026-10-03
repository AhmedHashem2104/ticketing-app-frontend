import { arCatalog, missingFrom } from "@repo/i18n";
import { describe, expect, it } from "vitest";
import { contractMessages, designSystemMessages } from "./i18n-messages";

describe("Arabic catalog", () => {
  it("translates every design-system message", () => {
    expect(missingFrom(arCatalog, designSystemMessages())).toEqual([]);
  });

  it("translates every form validation message from the shared contracts", () => {
    expect(missingFrom(arCatalog, contractMessages())).toEqual([]);
  });

  it("keeps placeholders intact in every translation", () => {
    const placeholders = (text: string) =>
      [...text.matchAll(/\{(\w+)(?:,|\})/g)]
        .map((m) => m[1])
        .sort()
        .join();
    const broken = Object.entries(arCatalog).filter(([en, ar]) => placeholders(en) !== placeholders(ar));
    expect(broken).toEqual([]);
  });
});
