import { App, TFile } from "obsidian";
import Emittery from "emittery";
import { WorkerManager } from "./WorkerManager";
import Logger from "./Logger";

/**
 * Event types for indexing service
 */
export type IndexingServiceProgressEvent = {
  indexedCount: number;
  totalCount: number;
};

export type IndexingServiceEvent = {
  progress: IndexingServiceProgressEvent;
};

/**
 * Service for incrementally parsing Markdown files in the Obsidian vault.
 * This service manages the parsing process using a queue-based approach,
 * maintaining no more than a specified number of files in flight at a time.
 */
export default class IndexingService extends Emittery<IndexingServiceEvent> {
  private app: App;
  private workerManager: WorkerManager;
  private maxConcurrentFiles: number;
  private isParsing: boolean;
  private fileQueue: TFile[];
  private filesInFlight: Map<string, Promise<void>>;
  private parsingSessionId: number | null = null;
  private filesProcessed: number = 0;
  private errorsEncountered: number = 0;
  private totalFiles: number = 0;

  /**
   * Create a new IndexingService instance.
   *
   * @param app - The Obsidian app instance
   * @param workerManager - The WorkerManager instance for RPC communication
   * @param maxConcurrentFiles - Maximum number of files to process concurrently
   */
  constructor(
    app: App,
    workerManager: WorkerManager,
    maxConcurrentFiles: number = 25,
  ) {
    super();
    this.app = app;
    this.workerManager = workerManager;
    this.maxConcurrentFiles = maxConcurrentFiles;
    this.isParsing = false;
    this.fileQueue = [];
    this.filesInFlight = new Map();
  }

  /**
   * Start the incremental parsing process.
   * This method gets all Markdown files and begins processing them using a queue.
   */
  async startIndexing(): Promise<void> {
    if (this.isParsing) {
      Logger.log("Parsing already in progress");
      return;
    }

    await this.workerManager
      .RPC("health-check", { id: 0, appId: this.app.appId })
      .then((result) => {
        Logger.log("[Worker health check]", result);
      });

    this.isParsing = true;
    this.fileQueue = [];
    this.filesInFlight.clear();
    this.filesProcessed = 0;
    this.errorsEncountered = 0;
    this.totalFiles = 0;

    try {
      Logger.log("Starting incremental Markdown parsing...");

      // Get all Markdown files in the vault
      const allFiles = this.app.vault.getMarkdownFiles();
      this.fileQueue = allFiles;
      this.totalFiles = allFiles.length;

      // Notify listeners that we're starting
      await this.emit("progress", {
        indexedCount: 0,
        totalCount: this.totalFiles,
      });

      if (this.fileQueue.length === 0) {
        Logger.log("No Markdown files found in the vault");
        this.isParsing = false;
        this.completeParsingSession();
        return;
      }

      Logger.log(`Found ${this.fileQueue.length} Markdown files to parse`);

      // Start processing files from the queue
      await this.processQueue();
    } catch (error) {
      Logger.error("Error during incremental parsing:", error);
      this.isParsing = false;
      throw error;
    }
  }

  /**
   * Process files from the queue, maintaining no more than maxConcurrentFiles in flight.
   */
  private async processQueue(): Promise<void> {
    // Process files until queue is empty and no files are in flight
    while (this.fileQueue.length > 0) {
      // Process next batch if we have capacity
      if (
        this.filesInFlight.size < this.maxConcurrentFiles &&
        this.fileQueue.length > 0
      ) {
        const file = this.fileQueue.shift()!;
        await this.processFile(file);
      }

      // Wait for some files to complete before processing more
      if (this.fileQueue.length > 0) {
        await this.waitForAvailableSlot();
      }
    }
    await Promise.all([...this.filesInFlight.values()]);

    Logger.log("All Markdown files have been processed");
    this.completeParsingSession();
    this.isParsing = false;
  }

  /**
   * Process a single file by reading its content and sending to worker.
   *
   * @param file - The Markdown file to process
   */
  private async processFile(file: TFile): Promise<void> {
    // Notify listeners about progress
    await this.emit("progress", {
      indexedCount: this.filesProcessed,
      totalCount: this.totalFiles,
    });

    // Create a promise for this file's processing
    const filePromise = this.sendFileToWorker(file).finally(async () => {
      // Remove from in-flight map when done
      this.filesInFlight.delete(file.path);
      // Notify listeners about progress
      await this.emit("progress", {
        indexedCount: this.filesProcessed,
        totalCount: this.totalFiles,
      });
    });

    // Track this file as in flight
    this.filesInFlight.set(file.path, filePromise);
  }

  /**
   * Wait for at least one slot to become available in the concurrent processing.
   */
  private async waitForAvailableSlot(): Promise<void> {
    // If we have available slots, return immediately
    if (this.filesInFlight.size < this.maxConcurrentFiles) {
      return;
    }

    // Otherwise, wait for any in-flight file to complete
    await Promise.race([...this.filesInFlight.values()]);
  }

  /**
   * Send a single Markdown file to the worker via RPC.
   *
   * @param file - The Markdown file to process
   * @returns Promise that resolves when processing is complete
   */
  public async sendFileToWorker(file: TFile): Promise<void> {
    try {
      const content = await this.app.vault.cachedRead(file);

      try {
        // Send RPC request to worker
        // NOTE: To avoid re-encoding the Markdown file, as an optimization,
        // we send the content as a "supplemental" message which will just get
        // posted to the indexing thread as-is. This may save a millisecond or
        // two!
        await this.workerManager.RPC(
          "parse-markdown",
          {
            id: 0,
            path: file.path,
            content: null,
            timestamp: new Date().toISOString(),
          },
          content,
        );

        // Process the parsed tasks and store them in the database
        // await this.processParsedTasks(file, result.tasks || []);
        this.filesProcessed++;
      } catch (error) {
        Logger.error(`Error processing file ${file.path}:`, error);
        this.errorsEncountered++;
        throw error;
      }
    } catch (error) {
      Logger.error(`Error processing file ${file.path}:`, error);
      throw error;
    }
  }

  /**
   * Complete the current parsing session
   */
  private completeParsingSession(): void {
    if (this.parsingSessionId) {
      try {
        Logger.log(
          `Completed parsing session ${this.parsingSessionId} - Processed: ${this.filesProcessed}, Errors: ${this.errorsEncountered}`,
        );
      } catch (error) {
        Logger.error(
          `Error completing parsing session ${this.parsingSessionId}:`,
          error,
        );
      }
    }
  }

  /**


  /**
   * Check if parsing is currently in progress.
   *
   * @returns True if parsing is in progress, false otherwise
   */
  isCurrentlyParsing(): boolean {
    return this.isParsing;
  }

  /**
   * Get the current processing status.
   *
   * @returns Object with queue size, files in flight, and total files
   */
  getStatus(): {
    queueSize: number;
    filesInFlight: number;
    totalFiles: number;
    filesProcessed: number;
    errorsEncountered: number;
  } {
    return {
      queueSize: this.fileQueue.length,
      filesInFlight: this.filesInFlight.size,
      totalFiles: this.totalFiles,
      filesProcessed: this.filesProcessed,
      errorsEncountered: this.errorsEncountered,
    };
  }
}
