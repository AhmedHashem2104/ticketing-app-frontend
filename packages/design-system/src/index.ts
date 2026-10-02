/**
 * Matchpass design system — atomic design layers built on shadcn/ui + Tailwind CSS.
 *
 *   atoms → molecules → organisms → templates → pages
 *
 * Every component validates its props with zod at runtime (development and tests)
 * and is fully controlled by its parent.
 */
export * from "./atoms";
export * from "./molecules";
export * from "./organisms";
export * from "./templates";
export * from "./pages";
export { UIProvider, configureUI, resetUI, uiStore, useI18n, useUI, type LinkComponentProps, type UIConfig } from "./lib/provider";
export { devSamples } from "./lib/dev-samples";
export { PropValidationError, validateProps } from "./lib/props";
export { useCountdown } from "./lib/hooks";
export { cn } from "./lib/utils";
export * from "./lib/datetime";
export * from "./lib/seating";
export { themeSurface, themeMuted } from "./lib/theme";
