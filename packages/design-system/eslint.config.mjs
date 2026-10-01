import js from "@eslint/js";
import jsxA11y from "eslint-plugin-jsx-a11y";
import reactHooks from "eslint-plugin-react-hooks";
import globals from "globals";
import tseslint from "typescript-eslint";
import { defineConfig, globalIgnores } from "eslint/config";

export default defineConfig([
  globalIgnores(["dist", "coverage"]),
  {
    files: ["**/*.{ts,tsx}"],
    extends: [js.configs.recommended, tseslint.configs.recommended, reactHooks.configs.flat.recommended, jsxA11y.flatConfigs.strict],
    languageOptions: { globals: { ...globals.browser, ...globals.node } },
    settings: {
      "jsx-a11y": { components: { Button: "button", Input: "input", Label: "label", AppLink: "a" } },
    },
    rules: {
      "jsx-a11y/label-has-associated-control": [
        "error",
        { controlComponents: ["Input", "Checkbox", "Textarea", "NativeSelect"], depth: 3 },
      ],
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_", destructuredArrayIgnorePattern: "^_", ignoreRestSiblings: true },
      ],
    },
  },
  {
    // Generated shadcn/ui primitives are kept close to upstream.
    files: ["src/components/ui/**"],
    rules: { "jsx-a11y/heading-has-content": "off", "jsx-a11y/anchor-has-content": "off" },
  },
]);
