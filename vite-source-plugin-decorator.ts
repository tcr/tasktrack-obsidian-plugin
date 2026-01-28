/* eslint-disable import/no-nodejs-modules */

import type { Plugin } from "vite";
import { createFilter } from "vite";
import path from "path";

export default function sourceDecorator(): Plugin {
  const filter = createFilter("**/*.{ts,tsx,js,jsx}");
  const patterns = [
    "Logger\\.(log|error|warn|info|debug|table|count|timeLog)\\(",
  ];

  return {
    name: "source-decorator",
    enforce: "post",

    transform(code, id) {
      if (!filter(id)) return null;

      // Process each line and add source info
      const lines = code.split("\n");
      const processedLines = lines.map((line, index) => {
        const lineNum = index + 1;
        let modifiedLine = line;

        // Check each pattern
        for (const pattern of patterns) {
          const regex = new RegExp(pattern);
          if (regex.test(modifiedLine.trim())) {
            // Add source info comment
            modifiedLine = modifiedLine.replace(
              new RegExp(pattern),
              `$&"[TaskTrack][${path.basename(id)}:${lineNum}]",`,
            );
            break;
          }
        }

        return modifiedLine;
      });

      return processedLines.join("\n");
    },
  };
}
