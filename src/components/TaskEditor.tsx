import type Task from "@/Task";
import { h, Fragment, TargetedEvent } from "preact";
import { useCallback, useEffect, useState } from "preact/hooks";
import { Icon } from "./obsidian/Icon";
import MarkdownEditor from "@/components/obsidian/MarkdownEditor";
import { PriorityBadge } from "./PriorityBadge";
import { Dropdown } from "./Dropdown";
import { Resizable } from "react-resizable";
import { ViewUpdate } from "@codemirror/view";
import { EmbeddableMarkdownEditor } from "@/vendor/markdown-editor";
import { extractTaskDetails, TaskDetails } from "@/Task";
import { usePlugin } from "@/context/PluginContext";
import Logger from "@/lib/Logger";

export function TaskEditor({
  task,
  onSave,
  onCancel,
  mode = "edit",
}: {
  task: Task;
  onSave: (baseTask: Task, taskUpdates: TaskDetails) => Promise<void>;
  onCancel: () => void;
  mode?: "edit" | "create";
}) {
  const plugin = usePlugin();

  const [editedTask, setEditedTask] = useState<TaskDetails>(
    extractTaskDetails(task),
  );
  const [edited, setEdited] = useState(false);

  useEffect(() => {
    setEditedTask(extractTaskDetails(task));
  }, [task]);

  const handleInputChange = (
    field: keyof TaskDetails,
    value: string | number | boolean | string[] | null,
  ) => {
    setEdited(true);
    setEditedTask((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const [managedValue, setManagedValue] = useState<{
    value: string;
    source: string;
  }>({ value: task.description ?? "", source: "react" });

  useEffect(() => {
    setManagedValue({ value: task.description || "", source: "react" });
  }, [task]);

  const onEditorChange = useCallback(
    (_update: ViewUpdate, editor: EmbeddableMarkdownEditor) => {
      handleInputChange("description", editor.value || "");
      setManagedValue({ value: editor.value || "", source: "editor" });
    },
    [],
  );

  return (
    <>
      <div
        className="touchable t-8 r-8 modal-close-button mod-raised clickable-icon"
        onClick={onCancel}
      >
        <Icon icon="x" />
      </div>

      <div className="p-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">
            {mode === "create" ? "New Task" : "Edit Task"}
          </h3>
          <div className="flex gap-2">
            <button
              className="px-3 py-1 bg-(--color-green) text-white rounded text-sm"
              disabled={!edited}
              onClick={() => {
                onSave(task, editedTask).catch((err) => {
                  Logger.error("Error in saving task:", err);
                });
              }}
            >
              Save
            </button>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Title</label>
            <input
              type="text"
              value={editedTask.title}
              onChange={(e: TargetedEvent<HTMLInputElement>) =>
                handleInputChange("title", e.currentTarget.value)
              }
              className="w-full px-3 py-2 bg-(--background-primary) border border-(--background-modifier-border) rounded text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Status</label>
            <select
              value={editedTask.status}
              onChange={(e: TargetedEvent<HTMLSelectElement>) =>
                handleInputChange("status", e.currentTarget.value)
              }
              className="w-full px-3 py-2 bg-(--background-primary) border border-(--background-modifier-border) rounded text-sm"
            >
              <option value="todo">None</option>
              <option value="in-progress">In Progress</option>
              <option value="backlog">Blocked</option>
              <option value="review">Ready</option>
              <option value="closed">Closed</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Priority</label>
            <Dropdown
              optionHeight={28}
              items={[
                {
                  value: "none",
                  label: <PriorityBadge priority="none" />,
                },
                { value: "low", label: <PriorityBadge priority="low" /> },
                {
                  value: "medium",
                  label: <PriorityBadge priority="medium" />,
                },
                { value: "high", label: <PriorityBadge priority="high" /> },
                {
                  value: "critical",
                  label: <PriorityBadge priority="critical" />,
                },
              ]}
              selectedItem={editedTask.priority}
              onChange={(value) => handleInputChange("priority", value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Due Date</label>
            <input
              type="date"
              value={editedTask.dueDate || ""}
              onChange={(e: TargetedEvent<HTMLInputElement>) =>
                handleInputChange("dueDate", e.currentTarget.value)
              }
              className="w-full px-3 py-2 bg-(--background-primary) border border-(--background-modifier-border) rounded text-sm"
            />
          </div>

          <div className="hidden">
            <div>
              <label className="block text-sm font-medium mb-1">Project</label>
              <input
                type="text"
                value={editedTask.project}
                onChange={(e: TargetedEvent<HTMLInputElement>) =>
                  handleInputChange("project", e.currentTarget.value)
                }
                className="w-full px-3 py-2 bg(--background-primary)) border border-(--background-modifier-border) rounded text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Section</label>
              <input
                type="text"
                value={editedTask.section}
                onChange={(e: TargetedEvent<HTMLInputElement>) =>
                  handleInputChange("section", e.currentTarget.value)
                }
                className="w-full px-3 py-2 bg-(--background-primary) border border-(--background-modifier-border) rounded text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Assignee</label>
            <input
              type="text"
              value={editedTask.assignee}
              onChange={(e: TargetedEvent<HTMLInputElement>) =>
                handleInputChange("assignee", e.currentTarget.value)
              }
              className="w-full px-3 py-2 bg-(--background-primary) border border-(--background-modifier-border) rounded text-sm"
            />
          </div>

          <label className="block text-sm font-medium">Notes</label>
        </div>
      </div>

      <div className="w-full border-t border-(--background-modifier-border) px-4 pt-3 h-full flex flex-col min-h-50">
        <MarkdownEditor
          app={plugin.app}
          value={managedValue}
          onChange={onEditorChange}
          cssText="font-size: 15px; flex-grow: 1"
        />
      </div>
    </>
  );
}

export function TaskEditorSidebar({
  task,
  onSave,
  onCancel,
}: {
  task: Task;
  onSave: (baseTask: Task, taskUpdates: TaskDetails) => Promise<void>;
  onCancel: () => void;
}) {
  const [width, setWidth] = useState(400);

  return (
    <Resizable
      width={width}
      height={0}
      minConstraints={[250, 0]}
      maxConstraints={[1000, 0]}
      resizeHandles={["w"]}
      onResize={(e: Event, { size }) => {
        e.stopPropagation();
        setWidth(size.width);
      }}
      handle={
        <div className="absolute top-0 bottom-0 left-0 w-1 cursor-col-resize select-none bg-(--divider-color) hover:bg-(--text-normal) active:bg-(--color-blue)" />
      }
    >
      <div
        className="bg-(--background-primary) absolute right-0 top-0 bottom-0 overflow-y-scroll shadow-lg"
        style={{ width: width }}
      >
        <TaskEditor task={task} onSave={onSave} onCancel={onCancel} />
      </div>
    </Resizable>
  );
}
