import Task, {
  TaskBase,
  TaskDetails,
  parseTaskPriority,
  parseTaskStatusMarker,
} from "@/Task";
import { fromMarkdown } from "mdast-util-from-markdown";
import type { ListItem, Parent } from "mdast";
import { sha256 } from "@noble/hashes/sha2.js";
import Logger from "./Logger";

// Any three-character sequence like [?]
const MARKER_REGEX: RegExp = /^\[([^\]])\]\s+/;

export function stripLeadingSpaces(spaces: number, line: string): string {
  let result = line;
  let remainingSpaces = spaces;

  // Process each character in the line
  while (remainingSpaces > 0 && result.length > 0) {
    const firstChar = result[0];

    if (firstChar === " ") {
      // Each space counts as 1
      result = result.slice(1);
      remainingSpaces--;
    } else if (firstChar === "\t") {
      // Each tab counts as 4 spaces
      const tabSpaces = 4;
      result = result.slice(1);
      remainingSpaces -= tabSpaces;
    } else {
      // Non-space/tab character encountered, stop processing
      break;
    }
  }

  return result;
}

/**
 * Converts a parsed TODO to the canonical Task format
 */
function parseContent(
  unparsedTitle: string,
  description: string | null,
): TaskDetails {
  const checkContent = unparsedTitle.match(MARKER_REGEX)!; // checked earlier
  unparsedTitle = unparsedTitle.slice(checkContent[0].length);
  let marker = checkContent[1];

  // Determine status based on completion
  const status = parseTaskStatusMarker(marker) ?? "none";

  // Parse due date if present in the text (simple pattern matching)
  let dueDate: string | null = null;
  const dateMatch = unparsedTitle.match(/due: (\d{4}-\d{2}-\d{2})/i);
  if (dateMatch) {
    dueDate = dateMatch[1];
  }

  // Get current timestamp for creation/update times
  const now = new Date().toISOString();

  // Extract tags from the todo text (simple pattern matching)
  const tags: string[] = [];
  const tagMatches = unparsedTitle.match(/#([a-zA-Z0-9_-]+)/g);
  if (tagMatches) {
    tags.push(...tagMatches.map((tag) => tag.substring(1)));
  }

  // Parse dataview tags (format [<key>::<value>])
  // and removing them from the title
  const dataviewTags: Record<string, string> = {};
  const dataviewPattern = /\[([^\]]+)::([^\]]+)\]\s*/g;

  for (const match of unparsedTitle.matchAll(dataviewPattern)) {
    const [key, value] = [match[1], match[2]];
    dataviewTags[key] = value;
  }

  const title = unparsedTitle.replace(dataviewPattern, "").trim();

  // Parse priority if present
  let priority = parseTaskPriority(dataviewTags.priority) ?? "none";

  return {
    title,
    description,
    marker,
    status,
    priority,
    project: "default", // default project
    section: "default", // default section
    assignee: "", // no assignee by default
    dueDate,
    createdAt: now,
    updatedAt: now,
    completedAt: null,
    subtasks: [],
    dependencies: [],
    tags,
  };
}

export function countLines(text: string): number {
  return text.split(/\n/).length;
}

export function parseTasks(path: string, markdownContent: string): Task[] {
  const todos: Task[] = [];
  try {
    const ast: Parent = fromMarkdown(markdownContent);

    const walkAst = (node: Parent) => {
      for (const child of node.children) {
        if (child.type === "listItem") {
          processListItem(child);
        }
        if ("children" in child) {
          walkAst(child);
        }
      }
    };

    walkAst(ast);

    function processListItem(listItem: ListItem) {
      // Check if this list item has a checkbox
      const firstChild = listItem.children[0];
      if (!firstChild || firstChild.type != "paragraph") {
        return;
      }

      // Check if this can be parsed like a task.
      const startColumn: number = firstChild.position!.start.column;
      const startOffset: number = firstChild.position!.start.offset!;
      const endOffset: number = firstChild.position!.end.offset!;
      const titleContent = markdownContent.substring(startOffset, endOffset);
      if (!MARKER_REGEX.test(titleContent)) {
        return;
      }

      // Generate a unique ID based on file path and start offset
      const listItemStartLine = listItem.position!.start.line;
      const listItemStartOffset = listItem.position!.start.offset!;
      const id = `${path}:${startOffset}`;

      // TODO make a dev-time assertion check
      // Ensure countLines is correct as when updating elsewhere we may
      // need to adjust this based on the existing text, not parser position.
      if (
        countLines(markdownContent.substring(0, listItemStartOffset)) !=
        listItemStartLine
      ) {
        Logger.error("Line count mismatch!");
      }

      // Parse title and description.
      let description: string | null = null;
      if (listItem.children.length > 1) {
        const childrenStartOffset: number =
          listItem.children[1].position!.start.offset!;
        const childrenEndOffset: number =
          listItem.children.slice(-1)[0].position!.end.offset!;

        const childrenContent = markdownContent.substring(
          childrenStartOffset,
          childrenEndOffset,
        );

        let firstLine = true;
        // TODO optimize this a lot more
        description = childrenContent.replace(/^.*$/gm, (str) => {
          // Skip initial line.
          if (firstLine) {
            firstLine = false;
            return str;
          }

          // Attempt to strip indentation from each the line, fail open.
          return stripLeadingSpaces(startColumn, str);
        });
      }

      // Check if we found a checkbox and have text content
      const taskMeta: TaskBase = {
        id,
        path,
        startLine: listItemStartLine,
        startColumn: listItem.position!.start.column,
        startOffset: listItemStartOffset,
        endOffset: listItem.position!.end.offset!,
        endLine: listItem.position!.end.line,
        fileHash: sha256(new TextEncoder().encode(markdownContent)),
      };

      const taskDetails: TaskDetails = parseContent(titleContent, description);

      // One last sanity check
      if (taskDetails.title) {
        todos.push({ ...taskMeta, ...taskDetails });
      }
    }

    return todos;
  } catch (error) {
    Logger.error("Error parsing markdown:", error);
    return [];
  }
}
