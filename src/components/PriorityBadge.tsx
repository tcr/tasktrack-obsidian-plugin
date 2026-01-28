import { TaskPriority } from "@/Task";
import { h } from "preact";

// Priority indicator component
export function PriorityBadge({ priority }: { priority: TaskPriority }) {
  const priorityColors: Record<TaskPriority, { color: string; label: string }> =
    {
      none: { color: "gray", label: "None" },
      low: { color: "var(--color-blue)", label: "Low" },
      medium: { color: "var(--color-green)", label: "Medium" },
      high: { color: "var(--color-yellow)", label: "High" },
      critical: { color: "var(--color-red)", label: "Critical" },
    };
  return (
    <span
      className="text-xs px-2 py-1 rounded-full text-black"
      style={{ backgroundColor: priorityColors[priority].color }}
    >
      {priorityColors[priority].label}
    </span>
  );
}
