import "eslint-plugin-only-warn";
import globals from "globals";
import tsparser from "@typescript-eslint/parser";
import { defineConfig, globalIgnores } from "eslint/config";
import obsidianmd from "eslint-plugin-obsidianmd";
import reactHooks from "eslint-plugin-react-hooks";

export default defineConfig([
  {
    languageOptions: {
      globals: {
        ...globals.browser,
      },
    },
  },
  /* TODO fix this so we don't need to ignore these files */
  globalIgnores([
    "eslint.config.js",
    "vite.config.js",
    "vitest.config.ts",
    "tailwind.config.js",
    "main.js",
    "package.json",
    "manifest.json",
    "package-lock.json",
    "docs/**",
  ]),
  reactHooks.configs.flat.recommended,
  Array.from(obsidianmd.configs.recommended).map((x) => {
    return {
      ...x,
      languageOptions: {
        parser: tsparser,
        parserOptions: { project: "tsconfig.json" },
      },
    };
  }),
]);
