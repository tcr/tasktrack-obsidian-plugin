import { TaskDatabase, TaskDatabaseFilters } from "@/lib/TaskDatabase";
import type Task from "@/Task";
import { useLiveQuery } from "dexie-react-hooks";
import { ComponentChildren, createContext, h } from "preact";
import { useContext, useState } from "preact/hooks";

export type TaskContextData = { tasks: Task[] | null };

export function TaskProvider({
  keywords,
  statuses,
  files,
  children,
  database,
}: TaskDatabaseFilters & {
  children: ComponentChildren;
  database: TaskDatabase;
}) {
  const [tasks, setTasks] = useState<TaskContextData>({ tasks: null });

  // Reactive database updates
  useLiveQuery(async () => {
    setTasks({
      tasks: await database.getAllTasks({
        keywords,
        statuses,
        files,
      }),
    });
  }, [statuses, keywords]);

  return <TaskContext.Provider value={tasks}>{children}</TaskContext.Provider>;
}

export const TaskContext = createContext<TaskContextData>({
  tasks: null,
});

export function useTaskContext() {
  const context = useContext(TaskContext);
  if (context === undefined) {
    throw new Error("useTaskContext must be used within a TaskProvider");
  }
  return context;
}
