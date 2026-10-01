import { z } from "zod";

export const featureFlagNames = [
  "waitingRoom",
  "exactSeatSelection",
  "cinema",
  "resale",
  "refunds",
  "ticketTransfer",
  "fanId",
  "promoCodes",
  "notifyMe",
  "parkingUpsell",
  "addToWallet",
  "arabicLanguage",
] as const;

export type FeatureFlag = (typeof featureFlagNames)[number];
export type FeatureFlags = Record<FeatureFlag, boolean>;

const flagEntrySchema = z.strictObject({ enabled: z.boolean(), description: z.string().optional() });

/** Shape of `config/feature-flags.json`. Unknown or missing flags fail validation so typos never ship. */
export const featureFlagsFileSchema = z.object({
  $schema: z.string().optional(),
  flags: z.strictObject(
    Object.fromEntries(featureFlagNames.map((name) => [name, flagEntrySchema])) as Record<FeatureFlag, typeof flagEntrySchema>,
  ),
});

export function parseFeatureFlags(json: unknown): FeatureFlags {
  const result = featureFlagsFileSchema.safeParse(json);
  if (!result.success) {
    const problems = result.error.issues.map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`).join("; ");
    throw new Error(`Invalid feature flag configuration — ${problems}`);
  }
  return Object.fromEntries(featureFlagNames.map((name) => [name, result.data.flags[name].enabled])) as FeatureFlags;
}

export const allFlagsOff: FeatureFlags = Object.fromEntries(featureFlagNames.map((n) => [n, false])) as FeatureFlags;
