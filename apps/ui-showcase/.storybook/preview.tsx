import type { Preview } from "@storybook/react-vite";
import { configureUI, UIProvider } from "@repo/design-system";
import { directionOf, isLocale, type Locale } from "@repo/i18n";
import "../src/index.css";

const preview: Preview = {
  globalTypes: {
    locale: {
      description: "Interface language",
      toolbar: {
        title: "Language",
        icon: "globe",
        items: [
          { value: "en", title: "English" },
          { value: "ar", title: "العربية (RTL)" },
        ],
        dynamicTitle: true,
      },
    },
  },
  decorators: [
    (Story, context) => {
      const locale: Locale = isLocale(context.globals.locale) ? context.globals.locale : "en";
      // Storybook is single-user, so setting the store per story render is fine (apps configure it once).
      configureUI({ useLocale: () => locale });
      document.documentElement.lang = locale;
      document.documentElement.dir = directionOf(locale);
      return (
        <UIProvider>
          <Story />
        </UIProvider>
      );
    },
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
  initialGlobals: { backgrounds: { value: "paper" }, locale: "en" },
  tags: ["autodocs"],
};

export default preview;
