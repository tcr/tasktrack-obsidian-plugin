import { PluginSettingTab, Setting, App } from "obsidian";
import {
  SETTINGS_TITLE,
  SETTINGS_RICH_CONTENT_NAME,
  SETTINGS_RICH_CONTENT_DESC,
} from "./strings";
import TaskManager from "./main";

// Plugin Settings
export interface TaskManagerSettings {
  defaultProject: string;
  showDueDates: boolean;
  showPriority: boolean;
  showAssignee: boolean;
  dropdownEmulation: boolean;
}

export const DEFAULT_SETTINGS: TaskManagerSettings = {
  defaultProject: "",
  showDueDates: true,
  showPriority: true,
  showAssignee: true,
  dropdownEmulation: false,
};

// Settings Tab
export default class TaskTrackSettingsTab extends PluginSettingTab {
  plugin: TaskManager;

  constructor(app: App, plugin: TaskManager) {
    super(app, plugin);
    this.plugin = plugin;
    this.icon = "tasktrack";
  }

  display(): void {
    const { containerEl } = this;

    containerEl.empty();

    new Setting(containerEl).setName(SETTINGS_TITLE).setHeading();

    new Setting(containerEl)
      .setName(SETTINGS_RICH_CONTENT_NAME)
      .setDesc(SETTINGS_RICH_CONTENT_DESC)
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.dropdownEmulation)
          .onChange((value) => {
            this.plugin.settings.dropdownEmulation = value;
          }),
      );
  }
}
