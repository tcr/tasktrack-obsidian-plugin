import { Plugin, TFile, addIcon } from "obsidian";
import { TaskTrackModal } from "./TaskTrackModal";
import TaskTrackSettingsTab, { DEFAULT_SETTINGS } from "./TaskTrackSettingsTab";
import TaskCreateModal from "./TaskCreateModal";
import { WorkerManager } from "./lib/WorkerManager";
import IndexingService, {
  IndexingServiceProgressEvent,
} from "./lib/IndexingService";
import { TaskDatabase } from "./lib/TaskDatabase";
import type { TaskManagerSettings } from "./TaskTrackSettingsTab";

import "./styles.css";
import Logger from "./lib/Logger";
import {
  COMMAND_OPEN_TASKTRACK_MODAL,
  RIBBON_TOOLTIP,
  COMMAND_CREATE_NEW_TASK,
  STATUS_LOADING,
  STATUS_OK,
} from "./strings";

addIcon(
  "tasktrack",
  `
  <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
      class="lucide lucide-circle-check-icon lucide-circle-check lucide-crosshair"
  >
      <circle cx="12" cy="12" r="8" />
      <line x1="23" x2="19" y1="12" y2="12" />
      <line x1="5" x2="1" y1="12" y2="12" />
      <line x1="12" x2="12" y1="5" y2="1" />
      <line x1="12" x2="12" y1="23" y2="19" />
      <path d="m9 12 2 2 4-4" />
  </svg>
  `,
);

addIcon(
  "tasktrack-search-clear",
  `
  <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
      class="lucide lucide-circle-x-icon lucide-circle-x"
  >
    <mask id="circleMask">
    <circle cx="12" cy="12" r="10" fill="white" />
      <path d="m15 9-6 6" stroke="black" />
      <path d="m9 9 6 6" stroke="black" />
    </mask>
    <circle cx="12" cy="12" r="8" fill="currentColor" mask="url(#circleMask)" />
  </svg>
  `,
);

export default class TaskTrackPlugin extends Plugin {
  settings: TaskManagerSettings = DEFAULT_SETTINGS;
  taskCreateModal: TaskCreateModal | null = null;
  markdownParsingService: IndexingService;
  taskDatabase: TaskDatabase;

  /** @override */
  async onload() {
    const worker = new WorkerManager();

    // Initialize Markdown parsing service with database
    this.markdownParsingService = new IndexingService(this.app, worker);

    this.taskDatabase = new TaskDatabase(this.app.appId);

    this.app.workspace.onLayoutReady(() => {
      // Once the Obsidian Vault is ready, kick off the markdown parsing service.
      this.markdownParsingService.startIndexing().catch((err) => {
        Logger.error("Error starting indexer:", err);
      });

      this.registerEvent(
        this.app.vault.on("create", (file) => {
          if (file instanceof TFile) {
            this.markdownParsingService.sendFileToWorker(file).catch((err) => {
              Logger.error("Error sending file to Worker on 'create':", err);
            });
          }
        }),
      );
      this.registerEvent(
        this.app.vault.on("modify", (file) => {
          if (file instanceof TFile) {
            this.markdownParsingService.sendFileToWorker(file).catch((err) => {
              Logger.error("Error sending file to Worker on 'modify':", err);
            });
          }
        }),
      );
      this.registerEvent(
        this.app.vault.on("delete", (file) => {
          if (file instanceof TFile) {
            this.taskDatabase.clearTasksByPath(file.path).catch((err) => {
              Logger.error("Error clearing database entry on 'delete:", err);
            });
          }
        }),
      );
    });

    // Insert the status bar entry.
    const item = this.addStatusBarItem();
    item.classList.add("mod-clickable");
    item.innerText = STATUS_LOADING;
    item.onclick = () => {
      this.showTaskTrackModal();
    };

    // Set up progress tracking for the status bar
    const updateStatusBar = () => {
      if (!this.markdownParsingService) {
        item.innerText = STATUS_LOADING;
        return;
      }

      const status = this.markdownParsingService.getStatus();
      const totalFiles = status.totalFiles;
      const processedFiles = status.filesProcessed;

      if (this.markdownParsingService.isCurrentlyParsing()) {
        item.innerText = `TaskTrack (${processedFiles}/${totalFiles})`;
      } else {
        item.innerText = STATUS_OK;
      }
    };

    // Update status bar initially
    updateStatusBar();

    // Set up progress listener
    const progressListener = (status: IndexingServiceProgressEvent) => {
      item.innerText = `TaskTrack (${status.indexedCount}/${status.totalCount})`;
    };
    this.markdownParsingService.on("progress", progressListener);

    // Aesthetically we don't want to be the last entry in the list, as that is normally
    // the sync plugin. Monitor changes in the parent node's children to make sure this
    // never happens. Details matter!
    const repositionStatusBar = () => {
      if (!item.nextElementSibling) {
        item.parentNode?.insertBefore(item, item.previousElementSibling);
      }
    };
    repositionStatusBar();
    const observer = new MutationObserver(repositionStatusBar);
    observer.observe(item.parentNode!, {
      childList: true,
      subtree: false,
    });

    // Create ribbon icon
    this.addRibbonIcon("tasktrack", RIBBON_TOOLTIP, () => {
      this.showTaskTrackModal();
    });

    await this.taskDatabase.clearDatabase();

    // Add commands
    this.addCommand({
      id: "open-main-modal",
      name: COMMAND_OPEN_TASKTRACK_MODAL,
      icon: "tasktrack",
      callback: () => this.showTaskTrackModal(),
    });

    this.addCommand({
      id: "create-new-task",
      name: COMMAND_CREATE_NEW_TASK,
      callback: () => this.showCreateTaskModal(),
    });

    // Add settings tab
    this.addSettingTab(new TaskTrackSettingsTab(this.app, this));

    /*
    this.registerBasesView(TaskTrackBasesViewId, {
      name: "TaskTrack",
      icon: "tasktrack",
      factory: (controller, containerEl) => {
        return new TaskTrackBasesView(controller, containerEl);
      },
      options: () => [
        {
          // The type of option. 'text' is a text input.
          type: "text",
          // The name displayed in the settings menu.
          displayName: "Property separator",
          // The value saved to the view settings.
          key: "separator",
          // The default value for this option.
          default: " - ",
        },
        // ...
      ],
    });
    */
  }

  /** @override */
  onunload() {
    this.taskCreateModal?.close();
    // Clean up parsing service if it exists
    if (this.markdownParsingService?.isCurrentlyParsing()) {
      Logger.debug("Parsing was in progress, stopping...");
    }
  }

  showTaskTrackModal() {
    const modal = new TaskTrackModal(this.app, this);
    modal.open();
  }

  showCreateTaskModal() {
    this.taskCreateModal = new TaskCreateModal(this.app, this, null);
    this.taskCreateModal.open();
  }
}
