import { h, Fragment } from "preact";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
  ColumnDef,
  SortingState,
  Table,
  Row,
  Cell,
  HeaderGroup,
  Header,
  RowData,
} from "@tanstack/react-table";
import { useCallback, useLayoutEffect, useRef, useState } from "preact/hooks";
import { Resizable } from "react-resizable";
import { Icon } from "./obsidian/Icon";
import type Task from "../Task";
import { TaskContextData } from "./TaskProvider";
import { PriorityBadge } from "./PriorityBadge";
import { StatusBadge } from "./StatusBadge";
import { DropdownItem, Dropdown } from "./Dropdown";
import { TaskDetails, TaskPriority, TaskStatus } from "../Task";

// TODO replace this with tanstack's column size feature
declare module "@tanstack/react-table" {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- need to specify type parameters in this definition https://tanstack.com/table/latest/docs/api/core/column-def#meta
  interface ColumnMeta<TData extends RowData, TValue> {
    columnWidth: number | null;
  }
}

type TaskRowContext = {
  saveTask: (baseTask: Task, taskUpdate: TaskDetails) => void;
} & Task;

// Define custom sort orders
const STATUS_ORDER: Record<TaskStatus, number> = {
  none: 0,
  planned: 1,
  "in-progress": 2,
  review: 3,
  abandoned: 4,
  closed: 5,
} as const;

function StatusDropdown({
  status,
  onChange,
}: {
  status: TaskStatus;
  onChange: (_: TaskStatus) => void;
}) {
  const items: Record<TaskStatus, DropdownItem<TaskStatus>> = {
    none: { label: <StatusBadge status="none" />, value: "none" },
    "in-progress": {
      label: <StatusBadge status="in-progress" />,
      value: "in-progress",
    },
    planned: { label: <StatusBadge status="planned" />, value: "planned" },
    review: {
      label: <StatusBadge status="review" />,
      value: "review",
    },
    abandoned: {
      label: <StatusBadge status="abandoned" />,
      value: "abandoned",
    },
    closed: { label: <StatusBadge status="closed" />, value: "closed" },
  };

  return (
    <Dropdown
      items={Object.values(items) as DropdownItem<TaskStatus>[]}
      selectedItem={status}
      onChange={onChange}
      optionHeight={28}
      showButton={false}
    />
  );
}

const PRIORITY_ORDER: Record<TaskPriority, number> = {
  wish: 0,
  low: 1,
  none: 2,
  medium: 3,
  high: 4,
  critical: 5,
} as const;

function PriorityDropdown({
  priority,
  onChange,
}: {
  priority: TaskPriority;
  onChange: (_: TaskPriority) => void;
}) {
  const items: Record<TaskPriority, DropdownItem<TaskPriority>> = {
    wish: {
      value: "wish",
      label: <PriorityBadge priority="wish" />,
    },
    low: { value: "low", label: <PriorityBadge priority="low" /> },
    none: {
      value: "none",
      label: <PriorityBadge priority="none" />,
    },
    medium: { value: "medium", label: <PriorityBadge priority="medium" /> },
    high: { value: "high", label: <PriorityBadge priority="high" /> },
    critical: {
      value: "critical",
      label: <PriorityBadge priority="critical" />,
    },
  };
  return (
    <Dropdown
      items={Object.values(items) as DropdownItem<TaskPriority>[]}
      selectedItem={priority}
      onChange={onChange}
      optionHeight={28}
      showButton={false}
    />
  );
}

// tanstack/react-table column definitions
const columns: ColumnDef<TaskRowContext>[] = [
  {
    accessorKey: "status",
    header: "Status",
    enableSorting: true,
    sortingFn: (rowA, rowB, columnId) => {
      const statusA = rowA.getValue(columnId);
      const statusB = rowB.getValue(columnId);
      return (
        STATUS_ORDER[statusA as keyof typeof STATUS_ORDER] -
        STATUS_ORDER[statusB as keyof typeof STATUS_ORDER]
      );
    },
    cell: ({ row }) => (
      <div className="flex flex-row justify-center">
        <StatusDropdown
          status={row.original.status}
          onChange={(newStatus: TaskStatus) => {
            const { saveTask } = row.original;
            saveTask(row.original, { ...row.original, status: newStatus });
          }}
        />
      </div>
    ),
    meta: {
      columnWidth: 80,
    },
  },
  {
    accessorKey: "priority",
    header: "Priority",
    sortingFn: (rowA, rowB, columnId) => {
      const priorityA = rowA.getValue(columnId);
      const priorityB = rowB.getValue(columnId);
      return (
        PRIORITY_ORDER[priorityA as keyof typeof PRIORITY_ORDER] -
        PRIORITY_ORDER[priorityB as keyof typeof PRIORITY_ORDER]
      );
    },
    cell: ({ row }) => (
      <div className="flex flex-row justify-center">
        <PriorityDropdown
          priority={row.original.priority}
          onChange={(newPriority) => {
            const { saveTask } = row.original;
            saveTask(row.original, { ...row.original, priority: newPriority });
          }}
        />
      </div>
    ),
    enableSorting: true,
    meta: {
      columnWidth: 80,
    },
  },
  {
    accessorKey: "title",
    header: "Title",
    cell: ({ row }) => (
      <div className="text-(--text-normal)) overflow-hidden text-ellipsis px-2">
        {row.original.title}
      </div>
    ),
    enableGlobalFilter: true,
    enableSorting: true,
    meta: {
      columnWidth: null,
    },
  },
  {
    accessorKey: "path", // TODO make this take in lineNum too
    header: "Filename",
    cell: ({ row }) => (
      <div className="flex font-(--font-monospace-default) text-s overflow-x-hidden text-ellipsis px-2">
        <span className="rounded py-0.5">
          <span className="text-(--color-accent)">
            {row.original.path.replace(/.*\//, "")}
          </span>
          <span className="py-0.5 opacity-50 task-list-linenumber pl">
            :{row.original.startLine}
          </span>
        </span>
      </div>
    ),
    enableSorting: true,
    meta: {
      columnWidth: 200,
    },
  },
];

// Table header component
const TableHeader = ({
  headerGroup,
  columnWidths,
  onResize,
}: {
  headerGroup: HeaderGroup<TaskRowContext>;
  columnWidths: Record<number, number>;
  onResize: (index: number, size: { width: number }) => void;
}) => {
  return (
    <div className="flex h-8 bg-(--background-primary-alt)">
      {headerGroup.headers.map(
        (header: Header<TaskRowContext, unknown>, index: number) => {
          const heading = (
            <div
              className={`text-[14px] font-medium text-(--text-normal) relative flex flex-row cursor-pointer ${header.column.getIsSorted() ? "bg-(--background-modifier-hover)" : ""}`}
              style={{ width: columnWidths[index] }}
              onClick={() => {
                if (header.column.getIsSorted() === "asc") {
                  header.column.clearSorting();
                } else {
                  header.column.toggleSorting(
                    header.column.getIsSorted() !== "desc",
                  );
                }
              }}
            >
              <div className="overflow-hidden grow p-2">
                {flexRender(
                  header.column.columnDef.header,
                  header.getContext(),
                )}
              </div>
              {header.column.getIsSorted() && (
                <div className="ml-1">
                  {header.column.getIsSorted() == "asc" ? (
                    <Icon icon="arrow-up" />
                  ) : (
                    <Icon icon="arrow-down" />
                  )}
                </div>
              )}
            </div>
          );

          if (index == headerGroup.headers.length - 1) {
            return heading;
          }

          return (
            <Resizable
              key={header.id}
              width={columnWidths[index] || 150}
              height={0}
              minConstraints={[50, 0]}
              maxConstraints={[1000, 0]}
              resizeHandles={["e"]}
              onResize={(e: Event, { size }) => {
                e.stopPropagation();
                onResize(index, size);
              }}
              handle={
                <div className="h-full w-(--divider-width) hover:w-(--divider-width-hover) active:w-(--divider-width-hover) cursor-col-resize select-none bg-(--divider-color) hover:bg-(--divider-color-hover) active:bg-(--color-blue)" />
              }
            >
              {heading}
            </Resizable>
          );
        },
      )}
    </div>
  );
};

// Table row component
const TableRow = ({
  row,
  active,
  onRowClick,
  columnWidths,
}: {
  row: Row<TaskRowContext>;
  active: boolean;
  onRowClick: (row: Task) => void;
  columnWidths: number[];
}) => {
  return (
    <div
      key={row.id}
      className={[
        row.original.status == "closed" ? "line-through opacity-50" : "",
        "flex hover:bg-(--background-modifier-hover)! border-b h-8 border-(--background-modifier-border) cursor-pointer",
        "task-list-row",
        active ? "task-list-row-active" : "",
      ].join(" ")}
      onClick={() => {
        onRowClick(row.original);
      }}
      tabIndex={row.index}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          onRowClick(row.original);
        }
      }}
    >
      {row
        .getVisibleCells()
        .map((cell: Cell<TaskRowContext, unknown>, index: number) => {
          return (
            <div
              key={cell.id}
              style={
                columnWidths[index]
                  ? { width: columnWidths[index] }
                  : { flexGrow: 1 }
              }
              className={
                "flex justify-center flex-col text-ellipsis whitespace-nowrap text-[14px] relative"
              }
            >
              {flexRender(cell.column.columnDef.cell, cell.getContext())}
            </div>
          );
        })}
    </div>
  );
};

// Table body component
function TableBody({
  table,
  activeTask,
  onRowClick,
  columnWidths,
}: {
  table: Table<TaskRowContext>;
  activeTask: Task | null;
  onRowClick: (row: Task) => void;
  columnWidths: number[];
}) {
  const allItems = table.getRowModel().rows;

  return (
    <div className="overflow-y-auto grow">
      {allItems.length > 0 ? (
        allItems.map((row: Row<TaskRowContext>) => {
          return (
            <TableRow
              key={row.id}
              row={row}
              active={activeTask?.id == row.original.id}
              onRowClick={onRowClick}
              columnWidths={columnWidths}
            />
          );
        })
      ) : (
        <div className="p-4 text-center text-(--text-muted)">
          No items found
        </div>
      )}
    </div>
  );
}

// Column resizing state manager
function useColumnResizing<T>(columns: ColumnDef<T>[]) {
  const initialWidths = columns.map((column) => {
    const meta = column.meta;
    return meta?.columnWidth || 100; // Default width of 100px
  });

  const [columnWidths, setColumnWidths] = useState<number[]>(initialWidths);

  const handleResize = useCallback((index: number, size: { width: number }) => {
    setColumnWidths((prev) => {
      const newWidths = [...prev];
      newWidths[index] = size.width;
      return newWidths;
    });
  }, []);

  return {
    columnWidths,
    handleResize,
  };
}

export default function TaskTable({
  taskContext,
  onRowClick,
  onTaskSave,
  activeTask,
}: {
  taskContext: TaskContextData;
  onRowClick: (row: Task) => void;
  onTaskSave: (baseTask: Task, taskUpdate: Task) => Promise<void>;
  activeTask: Task | null;
  enableSorting?: boolean;
}) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const { columnWidths, handleResize } = useColumnResizing(columns);

  // eslint-disable-next-line react-hooks/incompatible-library -- needs update from Tanstack https://github.com/TanStack/table/issues/5567
  const table = useReactTable({
    data: (taskContext?.tasks || []).map((task) => ({
      ...task,
      saveTask: onTaskSave,
    })),
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onSortingChange: setSorting,
    state: {
      sorting,
    },
    autoResetPageIndex: false,
  });

  const targetRef = useRef<HTMLDivElement | null>(null);
  const [dimensions, setDimensions] = useState<
    | {
        width: number;
        height: number;
      }
    | undefined
  >();

  useLayoutEffect(() => {
    if (targetRef.current) {
      setDimensions({
        width: targetRef.current.offsetWidth,
        height: targetRef.current.offsetHeight,
      });
      const titleWidth = Math.max(
        100,
        targetRef.current.offsetWidth -
          columns
            .map((column) => {
              const meta = column.meta;
              return meta?.columnWidth || 0;
            })
            .reduce((acc, val) => acc + val, 0),
      );
      handleResize(2, { width: titleWidth });
    }
  }, [handleResize]);

  return (
    <div
      ref={targetRef}
      className="overflow-x-auto flex flex-col grow items-stretch rounded-lg m-4 mt-0
      border-solid border border-(--background-modifier-border)"
    >
      {taskContext.tasks == null || !dimensions ? (
        <div className="text-center text-(--text-muted) p-8 task-list-loading grow" />
      ) : taskContext.tasks.length === 0 ? (
        <div className="text-center text-(--text-muted) p-8">
          No tasks found. Create your first task!
        </div>
      ) : (
        <>
          <div className="border-b border-(--background-modifier-border) bg-(--background-primary) shadow-sm w-full mb-0 pb-0">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableHeader
                key={headerGroup.id}
                headerGroup={headerGroup}
                columnWidths={columnWidths.reduce(
                  (acc, width, index) => {
                    acc[index] = width;
                    return acc;
                  },
                  {} as Record<number, number>,
                )}
                onResize={handleResize}
              />
            ))}
          </div>

          <TableBody
            activeTask={activeTask}
            table={table}
            onRowClick={onRowClick}
            columnWidths={columnWidths}
          />
        </>
      )}
    </div>
  );
}
