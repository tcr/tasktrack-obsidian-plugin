/**
 * Dexie database service for task storage
 * Handles reactive task retrieval and database operations
 */

import Dexie, { Collection, Table } from "dexie";
import Task from "../Task";
import Emittery from "emittery";
import { TaskStatus } from "../Task";
import Logger from "./Logger";

/**
 * Filters supported by getAllTasks()
 */

export type TaskDatabaseFilters = {
  statuses: TaskStatus[];
  keywords: string[];
  files: string[];
};

/**
 * Event types for task database changes
 */
export type TaskDatabaseEventData = {
  "task-created": Task;
  "task-updated": Task;
  "task-deleted": string; // taskId
  "tasks-updated": Task[];
};

/**
 * Database service for managing tasks with Dexie
 * Provides reactive updates when tasks change
 */
export class TaskDatabase extends Emittery<TaskDatabaseEventData> {
  private db: Dexie;
  private isInitialized: boolean = false;

  /**
   * Create a new database service instance
   */
  constructor(appId: string) {
    super();

    this.db = new Dexie("TaskTrackDB:" + appId, {});
    this.db.version(1).stores({
      tasks: "&id,path,status,priority,createdAt,updatedAt,dueDate",
    });

    // Initialize the database
    this.initialize().catch((err) => {
      Logger.error("Error initializing database:", err);
    });
  }

  /**
   * Initialize the database and set up observers
   */
  private async initialize(): Promise<void> {
    try {
      // Wait for database to be ready
      await this.db.open();
      this.isInitialized = true;

      Logger.log(`TaskDatabase ${this.db.name} initialized successfully`);
    } catch (error) {
      Logger.error("Failed to initialize DexieTaskDatabase:", error);
      this.isInitialized = false;
    }
  }

  /**
   * Clear database
   */
  public async clearDatabase(): Promise<void> {
    await this.db.delete();
    await this.db.open();
  }

  /**
   * Get task count from the database
   */
  public async getAllTaskCount(): Promise<number> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      return await this.db.table<Task>("tasks").count();
    } catch (error) {
      Logger.error("Error getting all tasks:", error);
      return 0;
    }
  }

  /**
   * Get all tasks from the database
   */
  public async getAllTasks(
    filters: TaskDatabaseFilters = { statuses: [], keywords: [], files: [] },
  ): Promise<Task[]> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      let query: Table<Task> | Collection<Task> = this.db.table<Task>("tasks");
      if (filters.statuses?.length) {
        query = query.where("status").anyOf(filters.statuses);
      }
      let results = await query.toArray();

      // We perform case-insensitive Regex filtering, client-side,
      // since IndexedDB/Dexie doesn't support substring matches.
      if (filters.keywords?.length) {
        const matchers = filters.keywords.map(
          (kw) => new RegExp(kw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"),
        );
        results = results.filter((row) =>
          matchers.every((regex) => regex.test(row.title)),
        );
      }
      if (filters.files?.length) {
        const matchers = filters.files.map(
          (kw) => new RegExp(kw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"),
        );
        results = results.filter((row) =>
          matchers.every((regex) => regex.test(row.path)),
        );
      }

      return results;
    } catch (error) {
      Logger.error("Error getting all tasks:", error);
      return [];
    }
  }

  /**
   * Add a new task to the database
   */
  public async addTask(task: Task): Promise<Task> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      await this.db.table<Task>("tasks").put(task);

      // Emit event using Emittery's built-in emit method
      await this.emit("task-created", task);

      return task;
    } catch (error) {
      Logger.error("Error adding task:", error);
      throw error;
    }
  }

  /**
   * Add multiple tasks to the database
   */
  public async addTasks(tasks: Task[]): Promise<Task[]> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      await this.db.table<Task>("tasks").bulkPut(tasks);

      // Emit event using Emittery's built-in emit method
      for (const task of tasks) {
        await this.emit("task-created", task);
      }

      return tasks;
    } catch (error) {
      Logger.error("Error adding task:", error);
      throw error;
    }
  }
  /**
   * Add multiple tasks to the database
   */
  public async clearTasksByPath(path: string): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      await this.db.table<Task>("tasks").where("path").equals(path).delete();
    } catch (error) {
      Logger.error("Error adding task:", error);
      throw error;
    }
  }

  /**
   * Update an existing task
   */
  public async updateTask(task: Task): Promise<Task> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      await this.db.table<Task>("tasks").put(task);

      // Emit event using Emittery's built-in emit method
      await this.emit("task-updated", task);

      return task;
    } catch (error) {
      Logger.error("Error updating task:", error);
      throw error;
    }
  }

  /**
   * Delete a task from the database
   */
  public async deleteTask(taskId: string): Promise<boolean> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      const task = await this.db.table<Task>("tasks").get(taskId);
      if (!task) return false;

      await this.db.table<Task>("tasks").delete(taskId);

      // Emit event using Emittery's built-in emit method
      await this.emit("task-deleted", taskId);

      return true;
    } catch (error) {
      Logger.error("Error deleting task:", error);
      return false;
    }
  }

  /**
   * Close the database connection
   */
  public close(): void {
    if (this.db.isOpen()) {
      this.db.close();
    }
  }
}
