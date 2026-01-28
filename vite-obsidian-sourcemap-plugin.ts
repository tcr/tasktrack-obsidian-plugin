/* eslint-disable import/no-nodejs-modules */

import type { Plugin } from "vite";
import { Buffer } from "buffer";

/**
 * Vite plugin that fixes source maps by adjusting the paths to be compatible
 * with Obsidian's internal URL scheme.
 *
 * @param isProductionBuild - A boolean indicating whether the build is a production build. The plugin only runs in non-production builds.
 * @param distPath - The path to the output file containing the source map.
 * @param pluginName - The name of the Obsidian plugin, used to construct the Obsidian-specific URLs.
 * @returns A Vite `Plugin` object that fixes source maps.
 */
export default function fixSourceMapsPlugin(
  isProductionBuild: boolean,
  distPath: string,
  pluginName: string,
): Plugin {
  return {
    name: "vite:fix-source-maps",
    apply: "build",
    enforce: "post",
    config() {
      return {
        build: {
          sourcemap: true,
        },
      };
    },
    async writeBundle(_options, bundle) {
      if (isProductionBuild) {
        return;
      }

      for (const chunk of Object.values(bundle)) {
        if (chunk.type === "asset" && chunk.fileName === distPath) {
          const content = chunk.source.toString();
          let newContent = content;
          // Use a loop instead of replaceAll for compatibility
          let match: RegExpExecArray | null;
          const regex =
            /(\n\/\/# sourceMappingURL=data:application\/json;base64,)(.+)\n(.|\n)*/g;
          while ((match = regex.exec(content)) !== null) {
            const prefix: string = match[1];
            const sourceMapBase64: string = match[2];
            const replacement =
              prefix +
              fixSourceMap(sourceMapBase64, pluginName) +
              "\n/* nosourcemap */";
            newContent = newContent.replace(match[0], replacement);
            break; // Only replace the first occurrence
          }

          if (content !== newContent) {
            chunk.source = newContent;
          }
          break;
        }
      }
    },
  };
}

/**
 * Converts a given file path to an Obsidian-specific URL.
 *
 * @param path - The original file path.
 * @param pluginName - The name of the Obsidian plugin.
 * @returns The converted path as an Obsidian-specific URL.
 */
function convertPathToObsidianUrl(path: string, pluginName: string): string {
  const convertedPath = toPosixPath(path).replace(/^(\.\.\/)+/, "");
  return `app://obsidian.md/plugin:${pluginName}/${convertedPath}`;
}

/**
 * Adjusts the paths in the base64-encoded source map to be compatible with Obsidian's URL scheme.
 *
 * @param sourceMapBase64 - The base64-encoded source map content.
 * @param pluginName - The name of the Obsidian plugin, used to construct the Obsidian-specific URLs.
 * @returns A base64-encoded string with the adjusted source map.
 */
function fixSourceMap(sourceMapBase64: string, pluginName: string): string {
  const sourceMapJson = Buffer.from(sourceMapBase64, "base64").toString(
    "utf-8",
  );
  const sourceMapData = JSON.parse(sourceMapJson) as unknown as SourceMap;
  sourceMapData.sources = sourceMapData.sources.map((path) =>
    convertPathToObsidianUrl(path, pluginName),
  );
  return Buffer.from(JSON.stringify(sourceMapData)).toString("base64");
}

/**
 * Converts a given path to a POSIX-style path by replacing backslashes with forward slashes.
 *
 * @param path - The path to convert.
 * @returns The POSIX-style path.
 */
function toPosixPath(path: string): string {
  return path.replace(/\\/g, "/");
}

interface SourceMap {
  version: number;
  sources: string[];
  names: string[];
  mappings: string;
  file: string;
  sourcesContent?: string[];
}
