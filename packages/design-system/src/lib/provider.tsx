import {
  arCatalog,
  createFormatters,
  createTranslator,
  directionOf,
  type Catalog,
  type Formatters,
  type Locale,
  type Translate,
} from "@repo/i18n";
import { Direction, Tooltip } from "radix-ui";
import { useMemo, useSyncExternalStore, type ComponentType, type ReactNode } from "react";
import { createStore } from "zustand/vanilla";

export type LinkComponentProps = {
  href: string;
  className?: string;
  children?: ReactNode;
  "aria-current"?: "page" | "step" | "true" | "false" | boolean;
  "aria-label"?: string;
  onClick?: (event: React.MouseEvent<HTMLAnchorElement>) => void;
  prefetch?: boolean;
};

/**
 * App-wide design-system configuration, held in a zustand store.
 *
 * Everything here is static for the lifetime of the app (the same for every request and every user),
 * so one module-level store is safe even when a server renders many requests at once. Per-request
 * values — the language — are not stored: `useLocale` is a hook the host app supplies (e.g. reading the
 * `[lang]` route segment), so each render asks its own request for it.
 */
export type UIConfig = {
  /** Router-aware link (e.g. `next/link`, adding the locale prefix). Defaults to a plain anchor. */
  LinkComponent: ComponentType<LinkComponentProps> | null;
  /** Current time source — injectable so countdowns are testable. */
  now: () => number;
  /** Development helpers (form autofill buttons). Always off in production builds. */
  devTools: boolean;
  /** Returns the interface language for the current render. Must be a stable hook. */
  useLocale: () => Locale;
  /** Extra catalogs (e.g. app-specific copy), consulted before the design system's own. */
  catalogs: readonly Catalog[];
};

const isProduction = typeof process !== "undefined" && process.env?.NODE_ENV === "production";

const useEnglish = (): Locale => "en";

const defaults: UIConfig = { LinkComponent: null, now: () => Date.now(), devTools: false, useLocale: useEnglish, catalogs: [] };

export const uiStore = createStore<UIConfig>()(() => defaults);

/**
 * Configures the design system for a host app. Call once at module level (not during render) with
 * values that are the same for every request. Omitted keys keep their current value.
 */
export function configureUI(config: Partial<UIConfig>) {
  uiStore.setState({ ...config, ...(config.devTools !== undefined ? { devTools: config.devTools && !isProduction } : {}) });
}

/** Restores the defaults (tests). */
export const resetUI = () => uiStore.setState(defaults, true);

/**
 * Reads the store. The server snapshot is the live state (not zustand's initial state) because the
 * configuration is applied at module load, before anything renders, on the server as in the browser.
 */
function useUIConfig<T>(select: (config: UIConfig) => T): T {
  return useSyncExternalStore(
    uiStore.subscribe,
    () => select(uiStore.getState()),
    () => select(uiStore.getState()),
  );
}

const selectLocaleHook = (c: UIConfig) => c.useLocale;
const selectCatalogs = (c: UIConfig) => c.catalogs;

/** Translator `t`, formatters `f`, locale and direction for the current language. */
export function useI18n(): { t: Translate; f: Formatters; locale: Locale; dir: "ltr" | "rtl" } {
  const useLocale = useUIConfig(selectLocaleHook);
  const catalogs = useUIConfig(selectCatalogs);
  const locale = useLocale();
  return useMemo(
    () => ({ locale, dir: directionOf(locale), t: createTranslator(locale, ...catalogs, arCatalog), f: createFormatters(locale) }),
    [locale, catalogs],
  );
}

function PlainLink({ prefetch: _prefetch, children, ...props }: LinkComponentProps) {
  return <a {...props}>{children}</a>;
}

/** Link component, clock and dev-tools flag, plus the current language. */
export function useUI() {
  const LinkComponent = useUIConfig((c) => c.LinkComponent) ?? PlainLink;
  const now = useUIConfig((c) => c.now);
  const devTools = useUIConfig((c) => c.devTools);
  return { LinkComponent, now, devTools, ...useI18n() };
}

/**
 * Radix wiring for the design system: text direction for menus, sliders and radio groups, and the
 * shared tooltip delay. Configuration lives in the zustand store (`configureUI`), not here.
 */
export function UIProvider({ children }: { children: ReactNode }) {
  const { dir } = useI18n();
  return (
    <Direction.Provider dir={dir}>
      <Tooltip.Provider delayDuration={200}>{children}</Tooltip.Provider>
    </Direction.Provider>
  );
}
