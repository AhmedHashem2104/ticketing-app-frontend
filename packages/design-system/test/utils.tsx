import { render, type RenderOptions } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import axe from "axe-core";
import type { ReactElement } from "react";
import { expect, vi } from "vitest";
import { PropValidationError } from "../src/lib/props";
import { UIProvider } from "../src/lib/provider";

export function renderUI(ui: ReactElement, options: RenderOptions & { now?: () => number } = {}) {
  const { now, ...rest } = options;
  const user = userEvent.setup();
  const result = render(ui, {
    wrapper: ({ children }) => <UIProvider now={now}>{children}</UIProvider>,
    ...rest,
  });
  return { user, ...result };
}

/**
 * Runs axe-core against the rendered markup. Colour contrast is verified in the
 * browser E2E suite (jsdom can't compute styles). `region` (all content inside
 * landmarks) is only enforced for full pages; components render in isolation.
 */
export async function expectNoA11yViolations(container: Element, options: { page?: boolean } = {}) {
  const results = await axe.run(options.page ? document.documentElement : container, {
    rules: { "color-contrast": { enabled: false }, region: { enabled: !!options.page } },
  });
  const summary = results.violations.map((v) => `${v.id}: ${v.help} (${v.nodes.map((n) => n.target.join(" ")).join(", ")})`);
  expect(summary).toEqual([]);
}

/** Asserts that rendering throws a PropValidationError mentioning `path`. */
export function expectInvalidProps(renderFn: () => unknown, path?: string | RegExp) {
  const spy = vi.spyOn(console, "error").mockImplementation(() => {});
  try {
    let error: unknown;
    try {
      renderFn();
    } catch (caught) {
      error = caught;
    }
    expect(error).toBeInstanceOf(PropValidationError);
    if (path) expect((error as PropValidationError).message).toMatch(path);
  } finally {
    spy.mockRestore();
  }
}
