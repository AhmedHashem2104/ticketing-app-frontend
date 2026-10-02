import { render, screen } from "@testing-library/react";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { HydrateFeatureFlags, FeatureGate, useFeatureFlag } from "./client";
import { allFlagsOff, featureFlagNames, parseFeatureFlags } from "./schema";

const configFile = path.join(__dirname, "../../config/feature-flags.json");

describe("feature flag configuration", () => {
  it("ships a valid config file covering every flag", () => {
    const flags = parseFeatureFlags(JSON.parse(readFileSync(configFile, "utf8")));
    expect(Object.keys(flags).sort()).toEqual([...featureFlagNames].sort());
    expect(flags.waitingRoom).toBe(true);
    expect(flags.arabicLanguage).toBe(true);
  });

  it("rejects unknown flags (typos) and missing flags", () => {
    const base = JSON.parse(readFileSync(configFile, "utf8"));
    expect(() => parseFeatureFlags({ flags: { ...base.flags, resell: { enabled: true } } })).toThrow(/resell/);
    const { resale: _removed, ...missing } = base.flags;
    expect(() => parseFeatureFlags({ flags: missing })).toThrow(/flags\.resale/);
    expect(() => parseFeatureFlags({ flags: { ...base.flags, cinema: { enabled: "yes" } } })).toThrow(/cinema\.enabled/);
  });

  it("is consistent with the JSON schema used by editors", () => {
    const schema = JSON.parse(readFileSync(path.join(__dirname, "../../config/feature-flags.schema.json"), "utf8"));
    expect([...schema.properties.flags.required].sort()).toEqual([...featureFlagNames].sort());
  });
});

describe("feature flag store", () => {
  function Probe() {
    return <span>{useFeatureFlag("resale") ? "resale on" : "resale off"}</span>;
  }

  it("exposes flags to hooks and gates", () => {
    render(
      <HydrateFeatureFlags flags={{ ...allFlagsOff, resale: true }}>
        <Probe />
        <FeatureGate flag="resale">
          <p>Resell</p>
        </FeatureGate>
        <FeatureGate flag="cinema" fallback={<p>No cinema</p>}>
          <p>Cinema</p>
        </FeatureGate>
      </HydrateFeatureFlags>,
    );
    expect(screen.getByText("resale on")).toBeInTheDocument();
    expect(screen.getByText("Resell")).toBeInTheDocument();
    expect(screen.queryByText("Cinema")).not.toBeInTheDocument();
    expect(screen.getByText("No cinema")).toBeInTheDocument();
  });

  it("defaults every flag to off before the server's flags are applied", () => {
    render(<Probe />);
    expect(screen.getByText("resale off")).toBeInTheDocument();
  });
});
