import Task, { TaskDetails, toTaskStatusMarker } from "@/Task";
import { sha256 } from "@noble/hashes/sha2.js";
import { countLines } from "./parseTasks";

export function leadWhitespaceForColumn(column: number) {
  return Array(column + 1)
    .join(" ")
    .replace(/ {4}/g, "\t");
}

/**
 * Given a task, reconstruct its bullet point form
 */
export function convertTaskToMarkdown(baseTask: Task, taskUpdate: TaskDetails) {
  let taskText = "- [" + toTaskStatusMarker(taskUpdate.status) + "] ";

  // Add title. Strip newlines in the round trip; we are following
  //  CommonMark strict lines behavior for consistency. Other markdown is allowed.
  taskText += taskUpdate.title.replace(/\n/g, " ");

  // Add priority tag to title.
  if (taskUpdate.priority != "none") {
    taskText += " [priority::" + taskUpdate.priority + "]";
  }

  if (taskUpdate.description) {
    // Two newlines to denote separate paragraph/Markdown content
    taskText += "\n\n";

    // calculate column indent based on task start column.
    // two additional spaces bring it in line with the bullet column
    taskText += taskUpdate.description
      // add spaces to the front of each non-empty line to match column
      // // two additional spaces bring it in line with the bullet column
      .replace(/^(?!$)/gm, leadWhitespaceForColumn(baseTask.startColumn + 2))
      // ignore trailing whitespace
      .trimEnd();
  }

  return taskText;
}

export function rewriteTask(
  markdown: string,
  baseTask: Task,
  taskUpdate: TaskDetails,
): { newMarkdown: string; newTask: Task } {
  const newTaskMarkdown = convertTaskToMarkdown(baseTask, taskUpdate);
  const newMarkdown =
    markdown.slice(0, baseTask.startOffset) +
    newTaskMarkdown +
    markdown.slice(baseTask.endOffset);

  // Create an updated task.
  const newTask = { ...baseTask, ...taskUpdate };
  newTask.endOffset = baseTask.startOffset + newTaskMarkdown.length;
  newTask.endLine = countLines(newMarkdown.substring(0, newTask.endOffset));
  newTask.fileHash = sha256(new TextEncoder().encode(newMarkdown));

  return { newMarkdown, newTask };
}
