import TaskManager from "./main";
import { h, render } from "preact";
import { App, Modal, TFile } from "obsidian";
import {
	createDailyNote,
	getDailyNote,
	getAllDailyNotes,
} from "obsidian-daily-notes-interface";
import moment from "obsidian";

import type Task from "./Task";
import { TaskEditor } from "./components/TaskEditor";
import { PluginProvider, usePlugin } from "./context/PluginContext";
import Logger from "./lib/Logger";
import { TaskDetails } from "./Task";
import { convertTaskToMarkdown } from "./lib/rewriteTask";

interface TaskFormProps {
	onClose: () => void;
}

const TaskForm = ({ onClose }: TaskFormProps) => {
	const plugin = usePlugin();

	const handleSubmit = async (baseTask: Task, taskUpdates: TaskDetails) => {
		try {
			const date = moment.moment();
			const notes = getAllDailyNotes();

			// TODO don't use unknown
			let note: unknown;
			try {
				note = getDailyNote(date, notes) as unknown;
				if (!note) {
					throw new Error("Daily note not found");
				}
			} catch (e) {
				Logger.error(e);
				note = (await createDailyNote(date)) as unknown;
			}
			// TODO solve this workaround for real
			if (note instanceof TFile) {
				await plugin.app.vault.process(note, (content) => {
					return (
						content +
						"\n" +
						convertTaskToMarkdown(baseTask, taskUpdates)
					);
				});
			}
			onClose();
		} catch (error) {
			Logger.error("Error saving task:", error);
		}
	};

	return (
		<div className="flex flex-col gap-4">
			<TaskEditor
				mode="create"
				task={{
					id: "unknown",
					path: "",
					startColumn: 0,
					startOffset: 0,
					startLine: 0,
					endLine: 0,
					endOffset: 0,
					fileHash: new Uint8Array(),
					title: "",
					description: null,
					marker: " ",
					status: "none",
					priority: "none",
					project: "",
					section: "",
					assignee: "",
					dueDate: null,
					createdAt: "",
					updatedAt: "",
					completedAt: null,
					subtasks: [],
					dependencies: [],
					tags: [],
				}}
				onSave={handleSubmit}
				onCancel={() => {
					onClose();
				}}
			/>
		</div>
	);
};

// Task Modal for Create/Edit
export default class TaskCreateModal extends Modal {
	plugin: TaskManager;
	task: Task | null;

	constructor(app: App, plugin: TaskManager) {
		super(app);
		this.plugin = plugin;
	}

	onOpen() {
		render(
			<PluginProvider plugin={this.plugin}>
				<TaskForm onClose={() => this.close()} />
			</PluginProvider>,
			this.contentEl,
		);
	}

	onClose() {
		render(null, this.contentEl);
	}
}
