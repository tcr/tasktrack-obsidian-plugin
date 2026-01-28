import { defineConfig } from "vite";
import preact from "@preact/preset-vite";
import path from "path";
import tailwindcss from "@tailwindcss/vite";
import sourceLocations from "./vite-source-plugin-decorator";
import fixSourceMapsPlugin from "./vite-obsidian-sourcemap-plugin";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    // Use Preact for JSX transformation
    preact({
      reactAliasesEnabled: true,
    }),
    sourceLocations(),
    fixSourceMapsPlugin(),
    tailwindcss(),
  ],

  // Build configuration
  build: {
    outDir: ".",
    emptyOutDir: false,
    lib: {
      entry: path.resolve(__dirname, "src/main.tsx"),
      name: "main",
      fileName: () => "main.js",
      formats: ["cjs"],
    },
    cssCodeSplit: true,
    rollupOptions: {
      input: {
        main: "src/main.tsx",
      },
      output: {
        entryFileNames: "main.js",
        assetFileNames: "styles.css",
      },
      external: [
        "obsidian",
        "electron",
        // CodeMirror and Lezer packages (external dependencies)
        "@codemirror/autocomplete",
        "@codemirror/collab",
        "@codemirror/commands",
        "@codemirror/language",
        "@codemirror/lint",
        "@codemirror/search",
        "@codemirror/state",
        "@codemirror/view",
        "@lezer/common",
        "@lezer/highlight",
        "@lezer/lr",
      ],
    },
    target: "es2022",
    minify: true,
    sourcemap: "inline",
  },

  worker: {
    sourcemap: "inline",
  },

  // Resolve configuration
  resolve: {
    alias: {
      "@": __dirname + "/src",
    },
    /* need to add "worker" due to decode-named-character-reference dependency */
    conditions: ["module", "worker", "browser", "development|production"],
  },
});
