/* eslint-disable obsidianmd/ui/sentence-case */

// Test file to verify the Emittery event emission functionality
// This tests the refactored TaskDatabase event system

import { describe, it, expect, beforeEach } from "vitest";
import Emittery from "emittery";
import Task from "../../Task";

// Mock TaskDatabase that uses Emittery
class MockTaskDatabase extends Emittery<{
  "task-created": Task;
  "task-updated": Task;
  "task-deleted": string;
  "tasks-updated": Task[];
}> {
  private tasks: Task[] = [];

  async getAllTasks(): Promise<Task[]> {
    return [...this.tasks];
  }

  async addTask(task: Task): Promise<Task> {
    this.tasks.push(task);
    await this.emit("task-created", task);
    return task;
  }

  async updateTask(task: Task): Promise<Task> {
    const index = this.tasks.findIndex((t) => t.id === task.id);
    if (index >= 0) {
      this.tasks[index] = task;
      await this.emit("task-updated", task);
    }
    return task;
  }

  async deleteTask(taskId: string): Promise<boolean> {
    const index = this.tasks.findIndex((t) => t.id === taskId);
    if (index >= 0) {
      this.tasks.splice(index, 1);
      await this.emit("task-deleted", taskId);
      return true;
    }
    return false;
  }

  async clearAllTasks(): Promise<void> {
    const deletedTasks = [...this.tasks];
    this.tasks = [];
    await this.emit("tasks-updated", deletedTasks);
  }
}

describe("Task Database Event System", () => {
  let taskDatabase: MockTaskDatabase;

  beforeEach(() => {
    taskDatabase = new MockTaskDatabase();
  });

  describe("Emittery Event Emission", () => {
    it("should emit task-created event", async () => {
      let emittedTask: Task | undefined;
      const unsubscribe = taskDatabase.on("task-created", (task) => {
        emittedTask = task;
      });

      const testTask: Task = {
        id: "test-1",
        title: "Test Task",
        description: "Test description",
        status: "none",
        priority: "medium",
        project: "test",
        section: "test",
        assignee: "",
        dueDate: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        completedAt: null,
        subtasks: [],
        dependencies: [],
        tags: ["test"],
        path: "TODO.md",
        startLine: 0,
        startColumn: 0,
        startOffset: 0,
        endLine: 0,
        endOffset: 100,
        marker: " ",
        fileHash: new Uint8Array(),
      };

      await taskDatabase.addTask(testTask);

      expect(emittedTask).toBeDefined();
      expect(emittedTask?.id).toBe("test-1");
      expect(emittedTask?.title).toBe("Test Task");

      unsubscribe();
    });

    it("should emit task-updated event", async () => {
      let emittedTask: Task | undefined;
      const unsubscribe = taskDatabase.on("task-updated", (task) => {
        emittedTask = task;
      });

      const testTask: Task = {
        id: "test-update",
        title: "Original Title",
        description: "Original description",
        status: "none",
        priority: "medium",
        project: "test",
        section: "test",
        assignee: "",
        dueDate: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        completedAt: null,
        subtasks: [],
        dependencies: [],
        tags: ["test"],
        path: "TODO.md",
        startLine: 0,
        startColumn: 0,
        startOffset: 0,
        endLine: 0,
        endOffset: 100,
        marker: " ",
        fileHash: new Uint8Array(),
      };

      await taskDatabase.addTask(testTask);

      const updatedTask = { ...testTask };
      updatedTask.title = "Updated Title";
      updatedTask.status = "in-progress";

      await taskDatabase.updateTask(updatedTask);

      expect(emittedTask).toBeDefined();
      expect(emittedTask?.title).toBe("Updated Title");
      expect(emittedTask?.status).toBe("in-progress");

      unsubscribe();
    });

    it("should emit task-deleted event", async () => {
      let emittedTaskId: string | undefined;
      const unsubscribe = taskDatabase.on("task-deleted", (taskId) => {
        emittedTaskId = taskId;
      });

      const testTask: Task = {
        id: "test-delete",
        title: "Task to Delete",
        description: "This will be deleted",
        status: "none",
        priority: "medium",
        project: "test",
        section: "test",
        assignee: "",
        dueDate: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        completedAt: null,
        subtasks: [],
        dependencies: [],
        tags: ["test"],
        path: "TODO.md",
        startLine: 0,
        startColumn: 0,
        startOffset: 0,
        endLine: 0,
        endOffset: 100,
        marker: " ",
        fileHash: new Uint8Array(),
      };

      await taskDatabase.addTask(testTask);
      await taskDatabase.deleteTask("test-delete");

      expect(emittedTaskId).toBe("test-delete");

      unsubscribe();
    });

    it("should handle multiple event subscribers", async () => {
      let subscriber1Count = 0;
      let subscriber2Count = 0;

      const unsubscribe1 = taskDatabase.on("task-created", () => {
        subscriber1Count++;
      });

      const unsubscribe2 = taskDatabase.on("task-created", () => {
        subscriber2Count++;
      });

      const testTask: Task = {
        id: "test-multi",
        title: "Multi Subscriber Test",
        description: "Test multiple subscribers",
        status: "none",
        priority: "medium",
        project: "test",
        section: "test",
        assignee: "",
        dueDate: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        completedAt: null,
        subtasks: [],
        dependencies: [],
        tags: ["test"],
        path: "TODO.md",
        startLine: 0,
        startColumn: 0,
        startOffset: 0,
        endLine: 0,
        endOffset: 100,
        marker: " ",
        fileHash: new Uint8Array(),
      };

      await taskDatabase.addTask(testTask);

      expect(subscriber1Count).toBe(1);
      expect(subscriber2Count).toBe(1);

      unsubscribe1();
      unsubscribe2();
    });

    it("should allow unsubscribing from events", async () => {
      let callbackCount = 0;

      const unsubscribe = taskDatabase.on("task-created", () => {
        callbackCount++;
      });

      const testTask1: Task = {
        id: "test-unsubscribe-1",
        title: "Task 1",
        description: "First task",
        status: "none",
        priority: "medium",
        project: "test",
        section: "test",
        assignee: "",
        dueDate: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        completedAt: null,
        subtasks: [],
        dependencies: [],
        tags: ["test"],
        path: "TODO.md",
        startLine: 0,
        startColumn: 0,
        startOffset: 0,
        endLine: 0,
        endOffset: 100,
        marker: " ",
        fileHash: new Uint8Array(),
      };

      await taskDatabase.addTask(testTask1);
      expect(callbackCount).toBe(1);

      unsubscribe();

      const testTask2: Task = {
        id: "test-unsubscribe-2",
        title: "Task 2",
        description: "Second task",
        status: "none",
        priority: "medium",
        project: "test",
        section: "test",
        assignee: "",
        dueDate: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        completedAt: null,
        subtasks: [],
        dependencies: [],
        tags: ["test"],
        path: "TODO.md",
        startLine: 0,
        startColumn: 0,
        startOffset: 0,
        endLine: 0,
        endOffset: 100,
        marker: " ",
        fileHash: new Uint8Array(),
      };

      await taskDatabase.addTask(testTask2);
      expect(callbackCount).toBe(1); // Should still be 1 after unsubscribe
    });
  });

  describe("onAny Event Handler", () => {
    it("should handle onAny event type", async () => {
      let eventCount = 0;
      let eventNames: string[] = [];

      const unsubscribe = taskDatabase.onAny((event) => {
        eventCount++;
        eventNames.push(event);
      });

      const testTask: Task = {
        id: "test-any",
        title: "Any Event Test",
        description: "Test onAny handler",
        status: "none",
        priority: "medium",
        project: "test",
        section: "test",
        assignee: "",
        dueDate: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        completedAt: null,
        subtasks: [],
        dependencies: [],
        tags: ["test"],
        path: "TODO.md",
        startLine: 0,
        startColumn: 0,
        startOffset: 0,
        endLine: 0,
        endOffset: 100,
        marker: " ",
        fileHash: new Uint8Array(),
      };

      await taskDatabase.addTask(testTask);
      expect(eventCount).toBe(1);
      expect(eventNames[0]).toBe("task-created");

      const updatedTask = { ...testTask };
      updatedTask.status = "in-progress";
      await taskDatabase.updateTask(updatedTask);
      expect(eventCount).toBe(2);
      expect(eventNames[1]).toBe("task-updated");

      await taskDatabase.deleteTask(testTask.id);
      expect(eventCount).toBe(3);
      expect(eventNames[2]).toBe("task-deleted");

      unsubscribe();
    });
  });
});
