export type TaskPriority = "none" | "low" | "medium" | "high" | "critical";

export function parseTaskPriority(input: string): TaskPriority | null {
  return /^(none|low|medium|high|critical)$/.test(input)
    ? (input as TaskPriority)
    : null;
}

export type TaskStatus =
  | "none"
  | "planned"
  | "in-progress"
  | "review"
  | "abandoned"
  | "closed";

export const OPEN_STATUSES: TaskStatus[] = [
  "none",
  "planned",
  "in-progress",
  "review",
];

export const CLOSED_STATUSES: TaskStatus[] = ["abandoned", "closed"];

export const taskStatusFormat: Record<TaskStatus, string[]> = {
  none: [" "],
  planned: ["?"],
  "in-progress": [">", "/"],
  review: ["="],
  abandoned: ["-"],
  closed: ["x", "X"],
};

export function toTaskStatusMarker(input: TaskStatus): string | null {
  return taskStatusFormat[input][0];
}

export function parseTaskStatusMarker(input: string): TaskStatus | null {
  return (
    Object.entries(taskStatusFormat)
      .map(([key, values]: [TaskStatus, string[]]): TaskStatus | null => {
        return values.find((value) => value === input) ? key : null;
      })
      .find((key) => key != null) ?? null
  );
}

export function parseTaskStatus(input: string): TaskStatus | null {
  return (
    Object.keys(taskStatusFormat)
      .map((key) => key as TaskStatus)
      .find((key) => key === input) ?? null
  );
}

export interface TaskBase {
  id: string;
  path: string;
  startLine: number;
  startColumn: number;
  startOffset: number;
  endOffset: number;
  endLine: number;
  fileHash: Uint8Array;
}

export interface TaskDetails {
  title: string;
  description: string | null;
  marker: string;
  status: TaskStatus;
  priority: TaskPriority;
  project: string;
  section: string;
  assignee: string;
  dueDate: string | null;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
  subtasks: Task[];
  dependencies: string[];
  tags: string[];
}

export function extractTaskDetails(task: Task): TaskDetails {
  return {
    title: task.title,
    description: task.description,
    marker: task.marker,
    status: task.status,
    priority: task.priority,
    project: task.project,
    section: task.section,
    assignee: task.assignee,
    dueDate: task.dueDate,
    createdAt: task.createdAt,
    updatedAt: task.updatedAt,
    completedAt: task.completedAt,
    subtasks: task.subtasks,
    dependencies: task.dependencies,
    tags: task.tags,
  };
}

// Task Schema
export default interface Task extends TaskBase, TaskDetails {}
