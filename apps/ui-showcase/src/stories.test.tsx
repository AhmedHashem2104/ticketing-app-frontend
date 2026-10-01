import { composeStories, setProjectAnnotations } from "@storybook/react-vite";
import { render } from "@testing-library/react";
import type { ComponentType } from "react";
import axe from "axe-core";
import { beforeAll, describe, expect, it } from "vitest";
import * as preview from "../.storybook/preview";

/**
 * Every story in the design system becomes a test: it must render without a
 * PropValidationError and without axe violations (contrast is checked in the
 * browser E2E suite, since jsdom can't compute styles).
 */
const modules = import.meta.glob<Record<string, unknown>>("../../../packages/design-system/src/**/*.stories.tsx", { eager: true });

beforeAll(() => {
  setProjectAnnotations(preview.default);
  document.documentElement.lang = "en";
  document.title = "Matchpass";
});

describe.each(Object.entries(modules))("%s", (_file, module) => {
  const stories = Object.entries(composeStories(module as Parameters<typeof composeStories>[0])) as [string, ComponentType][];
  it.each(stories)("%s renders accessibly", async (_name, Story) => {
    const { container } = render(<Story />);
    const results = await axe.run(container, { rules: { "color-contrast": { enabled: false }, region: { enabled: false } } });
    expect(results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`)).toEqual([]);
  });
});
