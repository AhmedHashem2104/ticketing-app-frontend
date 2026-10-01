import "server-only";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { parseFeatureFlags, type FeatureFlag, type FeatureFlags } from "./schema";

/**
 * Feature flags are read from `config/feature-flags.json` (or `config/$FEATURE_FLAGS_FILE`) at request
 * time, so operators can flip a flag by editing the file — no rebuild or redeploy needed.
 * The parsed result is cached until the file's modification time changes.
 */
let cache: { file: string; mtimeMs: number; flags: FeatureFlags } | undefined;

function flagsFile() {
  const name = path.basename(process.env.FEATURE_FLAGS_FILE ?? "feature-flags.json");
  return path.join(process.cwd(), "config", name);
}

export async function getFeatureFlags(): Promise<FeatureFlags> {
  await connection();
  const file = flagsFile();
  const { mtimeMs } = await stat(file);
  if (cache && cache.file === file && cache.mtimeMs === mtimeMs) return cache.flags;
  const flags = parseFeatureFlags(JSON.parse(await readFile(file, "utf8")));
  cache = { file, mtimeMs, flags };
  return flags;
}

/** Renders the 404 page when a feature is switched off. Call at the top of a route's page. */
export async function requireFeature(flag: FeatureFlag) {
  const flags = await getFeatureFlags();
  if (!flags[flag]) notFound();
  return flags;
}
