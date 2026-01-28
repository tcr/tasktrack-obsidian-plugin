import TaskManager from "./main";
import { h, render } from "preact";
import { App, Modal, Notice } from "obsidian";
import TaskTrack from "./components/TaskTrack";
import { Icon } from "./components/obsidian/Icon";
import { PluginProvider } from "./context/PluginContext";
import Logger from "./lib/Logger";

export class TaskTrackModal extends Modal {
  plugin: TaskManager;

  constructor(app: App, plugin: TaskManager) {
    super(app);
    this.plugin = plugin;
  }

  onOpen() {
    // Add classes that help us emulate the settings API.
    this.contentEl.classList.add("vertical-tabs-container");
    this.modalEl.classList.add("mod-sidebar-layout");
    this.modalEl.classList.add("mod-settings");

    // Create header with open in new window button
    render(
      <PluginProvider plugin={this.plugin}>
        <TaskTrack />
        <div
          className="touchable mr-8 modal-close-button mod-raised clickable-icon"
          onClick={() => this.openInNewWindow()}
        >
          <Icon icon="picture-in-picture" />
        </div>
      </PluginProvider>,
      this.contentEl,
    );
  }

  openInNewWindow() {
    try {
      // Create a new popout.
      const leaf = this.app.workspace.openPopoutLeaf();
      leaf.view.containerEl.empty();

      // Render the task list in this new window.
      render(
        <PluginProvider plugin={this.plugin}>
          <TaskTrack />
        </PluginProvider>,
        leaf.view.containerEl,
      );

      // Hide the header bar.
      /*
      const leafDocument = leaf.view.containerEl.ownerDocument;
      leaf.view.containerEl.ownerDocument.body.classList.add(
        "tasktrack-popout",
      );
      const style = leafDocument.createElement("style");
      style.textContent =
        "body.tasktrack-popout .workspace-tab-header-container { display: none }";
      leafDocument.head.appendChild(style);
      */

      // Clear modal.
      this.close();
    } catch (error) {
      Logger.error("Error opening task list in new window:", error);
      new Notice("Failed to open task list in new window");
    }
  }

  onClose() {
    render(null, this.contentEl);
  }
}
