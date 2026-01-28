import type Task from "@/Task";
import { h } from "preact";
import { SearchInput } from "./SearchInput";
import { useCallback, useState } from "preact/hooks";
import { Icon } from "./obsidian/Icon";
import { VerticalTabContentContainer } from "./obsidian/VerticalTabContentContainer";
import { TaskEditorSidebar } from "./TaskEditor";
import { TaskProvider } from "./TaskProvider";
import { useTaskContext } from "./TaskProvider";
import TaskTable from "./TaskTable";
import { rewriteTask } from "@/lib/rewriteTask";
import { OPEN_STATUSES, TaskDetails } from "@/Task";
import { TaskDatabaseFilters } from "@/lib/TaskDatabase";
import { sha256 } from "@noble/hashes/sha2.js";
import arrayEquals from "@/lib/arrayEquals";
import { countLines } from "@/lib/parseTasks";
import { usePlugin } from "../context/PluginContext";
import { Plugin, TFile } from "obsidian";
import Logger from "@/lib/Logger";
import packageJson from "@/../package.json";

// Create task button component
const CreateTaskButton = () => {
  const plugin = usePlugin();
  return (
    <button
      aria-label="Create New Task"
      onClick={() => plugin.showCreateTaskModal()}
      className="ml-8"
    >
      <Icon icon="plus" /> Create New Task
    </button>
  );
};

// Task counter and filters component
const TaskTrackHeader = ({
  taskCount,
  search,
  onChangeFilters,
}: {
  taskCount: number;
  search: string;
  onChangeFilters: (filters: TaskDatabaseFilters) => void;
}) => {
  return (
    <div className="p-4 pb-0">
      <div className="relative">
        <SearchInput value={search} onChangeFilters={onChangeFilters} />
      </div>
      <div className="flex flex-row justify-between text-sm py-3 content-center">
        <span className="flex flex-col justify-center">
          Showing {taskCount} results.
        </span>
        <CreateTaskButton />
      </div>
    </div>
  );
};

// Main TaskList component
function TaskList({
  onTaskClick,
  onTaskSave,
  onChangeFilters,
  search,
  activeTask,
}: {
  onTaskClick: (task: Task) => void;
  onTaskSave: (baseTask: Task, taskUpdate: Task) => Promise<void>;
  onChangeFilters: (filters: TaskDatabaseFilters) => void;
  search: string;
  activeTask: Task | null;
}) {
  const taskContext = useTaskContext();

  return (
    <div className="border-b border-(--background-modifier-border) flex flex-col h-full">
      <TaskTrackHeader
        taskCount={taskContext.tasks?.length || 0}
        search={search}
        onChangeFilters={onChangeFilters}
      />
      <TaskTable
        taskContext={taskContext}
        activeTask={activeTask}
        onRowClick={onTaskClick}
        onTaskSave={onTaskSave}
        enableSorting={true}
      />
    </div>
  );
}

export async function saveTask(
  plugin: Plugin,
  baseTask: Task,
  editedTask: TaskDetails,
): Promise<{ newMarkdown: string; newTask: Task }> {
  // Rewrite the task and save update to the Vault.
  const file = plugin.app.vault.getFileByPath(baseTask.path);
  if (!(file instanceof TFile)) {
    throw new Error(
      `Unexpected modification of non-file ${JSON.stringify(baseTask.path)}`,
    );
  }

  let returnTask: Task = baseTask;
  let returnMarkdown: string = "";
  await plugin.app.vault.process(file, (data): string => {
    returnMarkdown = data;

    // Attempt to confirm the existence of a task that is equal to the one we are editing.
    if (
      !arrayEquals(sha256(new TextEncoder().encode(data)), baseTask.fileHash)
    ) {
      // eslint-disable-next-line no-alert, no-undef
      alert(
        "Warning, checksum mismatch between vault file and task. Aborting.",
      );
      return data;
    }

    // TODO do any checking that the task matches the file(?)
    const { newMarkdown, newTask } = rewriteTask(data, baseTask, editedTask);
    Logger.warn(newMarkdown, newTask);

    returnTask = newTask;

    return newMarkdown;
  });
  return { newMarkdown: returnMarkdown, newTask: returnTask };
}

export default function TaskTrack() {
  const plugin = usePlugin();

  // Task editor open in the sidebar.
  const [activeTask, setActiveTask] = useState<Task | null>(null);

  // Initial search state.
  const [filers, setFilters] = useState<TaskDatabaseFilters>({
    keywords: [],
    statuses: [...OPEN_STATUSES],
    files: [],
  });
  const search = "is:open ";

  // Handle task click
  const handleTaskClick = useCallback((task: Task) => {
    Logger.info("Opening task:", task);
    setActiveTask(task);
  }, []);

  // Handle cancel
  const handleCancel = useCallback(() => {
    setActiveTask(null);
  }, []);

  return (
    <div className="flex flex-col grow h-full items-stretch">
      <div className="flex flex-row items-center p-2 border-0 border-b border-solid border-(--divider-color)">
        <div className="text-lg font-semibold flex flex-row items-center">
          <div className="ml-2 mr-1 h-4.5 w-5">
            <Icon icon="tasktrack" />
          </div>
          TaskTrack ({packageJson.version})
        </div>
      </div>
      <div className="flex flex-row grow overflow-y-hidden relative">
        <VerticalTabContentContainer>
          <TaskProvider {...filers} database={plugin.taskDatabase}>
            <TaskList
              onTaskClick={handleTaskClick}
              onTaskSave={async (baseTask, taskUpdate) => {
                const { newTask, newMarkdown } = await saveTask(
                  plugin,
                  baseTask,
                  taskUpdate,
                );
                const offsetDelta = newTask.endOffset - baseTask.endOffset;

                // Only continue if we have an active task.
                if (!activeTask) {
                  return;
                }

                // Check if we need to update anything in the active task details.
                if (baseTask.path === activeTask?.path) {
                  Logger.info("Parallel file modification:");
                  const newActiveTask = { ...activeTask };
                  if (baseTask.endOffset <= activeTask.startOffset) {
                    Logger.info("- earlier task");
                    newActiveTask.startOffset += offsetDelta;
                    newActiveTask.endOffset += offsetDelta;
                    newActiveTask.endLine +=
                      countLines(newMarkdown.substring(0, newTask.endOffset)) -
                      newTask.endLine;
                  } else if (baseTask.startOffset >= activeTask.endOffset) {
                    Logger.info("- later task");
                    // No action, doesn't move task forward
                  } else {
                    Logger.info("- conjoined task");
                    // Invariant violation, tasks overlap
                    throw new Error(
                      "Unexpected task overlap when editing multiple tasks",
                    );
                  }

                  // Update file hash.
                  newActiveTask.fileHash = newTask.fileHash;
                  Logger.info("Updating.");
                  setActiveTask(newActiveTask);
                }
              }}
              search={search}
              activeTask={activeTask}
              onChangeFilters={setFilters}
            />
          </TaskProvider>
          {activeTask && (
            <TaskEditorSidebar
              task={activeTask}
              onSave={async (baseTask, taskDetails) => {
                const { newTask: updatedTask } = await saveTask(
                  plugin,
                  baseTask,
                  taskDetails,
                );
                setActiveTask(updatedTask);
              }}
              onCancel={handleCancel}
            />
          )}
        </VerticalTabContentContainer>
      </div>
    </div>
  );
}
