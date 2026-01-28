import { TaskStatus } from "@/Task";
import { h } from "preact";

// Status badge component
export function StatusBadge({ status }: { status: TaskStatus }) {
  const statusText: Record<TaskStatus, { label: string; color: string }> = {
    none: { label: "None", color: "gray" },
    "in-progress": { label: "In Progress", color: "var(--color-blue)" },
    abandoned: { label: "Abandoned", color: "var(--color-red)" },
    planned: { label: "Planned", color: "var(--color-yellow)" },
    review: { label: "Review", color: "var(--color-cyan)" },
    closed: { label: "Closed", color: "var(--background-modifier-hover)" },
  };
  return (
    <span
      className="text-xs font-bold"
      style={{ color: statusText[status].color }}
    >
      {statusText[status].label}
    </span>
  );
}
