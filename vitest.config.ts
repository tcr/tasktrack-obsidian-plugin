import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  test: {
    environment: "jsdom",
    globals: true,
    coverage: {
      reporter: ["text", "json", "html"],
    },
    // Match test files in __tests__ directories or ending with .test.ts/.spec.ts
    include: ["**/__tests__/**/*.{test,spec}.{ts,tsx}"],
    // Exclude node_modules and other directories
    exclude: [
      "**/node_modules/**",
      "**/dist/**",
      "**/.{idea,git,cache,output,temp}/**",
    ],
  },
});
