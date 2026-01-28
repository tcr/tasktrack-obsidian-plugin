/**
 * Background (web) worker that is used to index all files in the codebase.
 */

import { TaskDatabase } from "../lib/TaskDatabase";

import type { RPCRequest, RPCResponse } from "./WorkerTypes";
import { parseTasks } from "../lib/parseTasks";
import grayMatter from "gray-matter";
import Logger from "@/lib/Logger";

declare let self: DedicatedWorkerGlobalScope;

function messagePlugin<T>(message: T) {
  self.postMessage(message);
}

let taskDatabase: TaskDatabase;
let heldMessage: (RPCRequest & { type: "parse-markdown" }) | null = null;

self.onmessage = async (event: MessageEvent<RPCRequest | string>) => {
  // Handle supplemental messages (bare strings).
  let message: RPCRequest;
  if (typeof event.data === "string") {
    if (!heldMessage) {
      Logger.error(`Received unexpected supplemental message: ${event.data}`);
      return;
    }

    heldMessage.content = event.data;
    message = heldMessage;
  } else {
    message = event.data;
  }

  // Logger.log(`Worker received message: ${JSON.stringify(message)}`);

  switch (message.type) {
    case "health-check":
      taskDatabase = new TaskDatabase(message.appId);

      // Handle health check RPC call
      messagePlugin<RPCResponse>({
        type: "health-check",
        id: message.id,
        result: true,
      });
      break;

    case "parse-markdown":
      if (message.content == null) {
        heldMessage = message;
      } else {
        await handleParseMarkdown(message);
      }
      break;
  }
};

async function handleParseMarkdown(message: RPCRequest) {
  // Type guard for parse-markdown message
  if (message.type !== "parse-markdown" || message.content == null) {
    Logger.error("Invalid message type for handleParseMarkdown");
    return;
  }

  const contentWithFrontmatter = grayMatter(message.content);
  const tasks = parseTasks(message.path, contentWithFrontmatter.content);

  Logger.debug(`Converted ${tasks.length} tasks from ${message.path}`, tasks);

  // Store tasks in Dexie using the task database service
  try {
    await taskDatabase.clearTasksByPath(message.path);
    await taskDatabase.addTasks(tasks);
    Logger.log(`Stored ${tasks.length} tasks in IndexedDB`);
  } catch (error) {
    Logger.error(`Failed to store tasks to database: ${error}`);
    // Continue execution even if storage fails
  }

  messagePlugin<RPCResponse>({
    type: "parse-markdown",
    id: message.id,
    success: true,
  });
}
