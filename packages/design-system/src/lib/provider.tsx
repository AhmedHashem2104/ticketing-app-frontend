import { createContext, useContext, useMemo, type ComponentType, type ReactNode } from "react";
import { Tooltip } from "radix-ui";

export type LinkComponentProps = {
  href: string;
  className?: string;
  children?: ReactNode;
  "aria-current"?: "page" | "step" | "true" | "false" | boolean;
  "aria-label"?: string;
  onClick?: (event: React.MouseEvent<HTMLAnchorElement>) => void;
  prefetch?: boolean;
};

type UIContextValue = {
  /** Router-aware link (e.g. `next/link`). Defaults to a plain anchor. */
  LinkComponent: ComponentType<LinkComponentProps>;
  /** Current time source — injectable so countdowns are testable. */
  now: () => number;
};

function DefaultLink({ prefetch: _prefetch, children, ...props }: LinkComponentProps) {
  return <a {...props}>{children}</a>;
}

const defaultNow = () => Date.now();

const UIContext = createContext<UIContextValue>({ LinkComponent: DefaultLink, now: defaultNow });

export type UIProviderProps = {
  children: ReactNode;
  linkComponent?: ComponentType<LinkComponentProps>;
  now?: () => number;
};

/** Wire the design system into a host app (router links, clock, tooltips). */
export function UIProvider({ children, linkComponent, now }: UIProviderProps) {
  const value = useMemo(() => ({ LinkComponent: linkComponent ?? DefaultLink, now: now ?? defaultNow }), [linkComponent, now]);
  return (
    <UIContext.Provider value={value}>
      <Tooltip.Provider delayDuration={200}>{children}</Tooltip.Provider>
    </UIContext.Provider>
  );
}

export const useUI = () => useContext(UIContext);
