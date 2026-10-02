import type { StorybookConfig } from "@storybook/react-vite";

const config: StorybookConfig = {
  stories: ["../src/**/*.mdx", "../../../packages/design-system/src/**/*.stories.@(ts|tsx)"],
  addons: ["@storybook/addon-docs", "@storybook/addon-a11y"],
  framework: { name: "@storybook/react-vite", options: {} },
  typescript: { reactDocgen: "react-docgen-typescript" },
  // Seed imagery (event photos, crests, avatars) lives in the web app; fixtures reference it as /images/...
  staticDirs: [{ from: "../../matchpass-web/public/images", to: "/images" }],
};

export default config;
