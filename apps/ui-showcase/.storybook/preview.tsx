import type { Preview } from "@storybook/react-vite";
import { UIProvider } from "@repo/design-system";
import "../src/index.css";

const preview: Preview = {
  decorators: [
    (Story) => (
      <UIProvider>
        <Story />
      </UIProvider>
    ),
  ],
  parameters: {
    layout: "padded",
    backgrounds: {
      options: {
        paper: { name: "Paper", value: "#F3F1EA" },
        white: { name: "White", value: "#FFFFFF" },
        pitch: { name: "Pitch", value: "#0E4D2F" },
      },
    },
    controls: { matchers: { color: /(background|color|fill|edge)$/i, date: /(At|date)$/i } },
    // Fail the a11y panel (and CI) on any axe violation.
    a11y: { test: "error" },
    options: { storySort: { order: ["Introduction", "Atoms", "Molecules", "Organisms", "Templates", "Pages"] } },
  },
  initialGlobals: { backgrounds: { value: "paper" } },
  tags: ["autodocs"],
};

export default preview;
