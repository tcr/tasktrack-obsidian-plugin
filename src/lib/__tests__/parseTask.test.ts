import { parseTasks } from "../parseTasks";
import { describe, it, expect } from "vitest";

describe("Task Manager", () => {
  describe("Markdown Todo Parser", () => {
    it("should parse basic todo list items", () => {
      const markdown = `
- [ ] Buy milk
- [x] Finish report
      `;
      const result = parseTasks("", markdown);
      expect(result.length).toBe(2);
      expect(result[0].title).toBe("Buy milk");
      expect(result[0].status).toBe("none");
      expect(result[1].title).toBe("Finish report");
      expect(result[1].status).toBe("closed");
    });

    it("should handle mixed content with non-todo items", () => {
      const markdown = `
- Regular item
- [ ] Todo item
- [x] Completed todo
      `;
      const result = parseTasks("", markdown);
      expect(result.length).toBe(2);
      expect(result[0].title).toContain("Todo");
      expect(result[1].title).toContain("Completed");
    });

    it("should return empty array for empty input", () => {
      const markdown = ``;
      const result = parseTasks("", markdown);
      expect(result.length).toBe(0);
    });

    it("should return empty array for empty todo items", () => {
      const markdown = `
- [x]
- [ ]
      `;
      const result = parseTasks("", markdown);
      expect(result.length).toBe(0);
    });

    it("should parse multiple lists correctly", () => {
      const markdown = `
- [ ] List 1
- [x] Item 1

- [ ] List 2
- [ ] Item 2
      `;
      const result = parseTasks("", markdown);
      expect(result.length).toBe(4);
      expect(result[0].title).toBe("List 1");
      expect(result[1].title).toBe("Item 1");
      expect(result[1].status).toBe("closed");
    });

    it("should preserve formatting in todo text", () => {
      const markdown = `
- [ ] **Bold** and _italic_ text
      `;
      const result = parseTasks("", markdown);
      expect(result.length).toBe(1);
      expect(result[0].title).toContain("**");
      expect(result[0].title).toContain("_");
    });

    it("should support paragraphs", () => {
      const markdown = `
- [ ] Install new lightswitch

  The lightswitch we currently have is busted because it is a
  dimmer switch that is not LED compatible. We now use LED lights.
      `;
      const result = parseTasks("", markdown);
      expect(result.length).toBe(1);
      expect(result[0].title).toBe("Install new lightswitch");
      expect(result[0].description).toBe(
        "The lightswitch we currently have is busted because it is a\ndimmer switch that is not LED compatible. We now use LED lights.",
      );
    });

    it("should not crash like using marked did", () => {
      const markdown = `
- A
	- B
`;
      parseTasks("", markdown);
    });

    it("should correctly set startOffset and endOffset for simple tasks", () => {
      const markdown = `\
- [ ] Buy milk
- [x] Finish report
      `;
      const result = parseTasks("", markdown);

      expect(result.length).toBe(2);

      // First task: "- [ ] Buy milk"
      // startOffset=1 points to the '-' character at the start of the list item
      // endOffset=15 points to the newline after the task
      expect(result[0].startOffset).toBe(0);
      expect(result[0].endOffset).toBe(14);

      // Second task: "- [x] Finish report"
      // startOffset=16 points to the '-' character at the start of this list item
      // endOffset=35 points to the newline after the task
      expect(result[1].startOffset).toBe(15);
      expect(result[1].endOffset).toBe(34);
    });

    it("should correctly set offsets for tasks with description", () => {
      const markdown = `
- [ ] Install new lightswitch

  The lightswitch we currently have is busted because it is a
  dimmer switch that is not LED compatible. We now use LED lights.
      `;
      const result = parseTasks("", markdown);
      expect(result.length).toBe(1);

      // Task with description
      expect(result[0].startOffset).toBe(1);
      expect(result[0].endOffset).toBe(160);
      // Verify the extracted content includes both the task and description
      const extracted = markdown.slice(
        result[0].startOffset,
        result[0].endOffset,
      );
      expect(extracted).toBe(
        "- [ ] Install new lightswitch\n\n  The lightswitch we currently have is busted because it is a\n  dimmer switch that is not LED compatible. We now use LED lights.",
      );
    });

    it("should correctly set offsets for multiple lists", () => {
      const markdown = `
- [ ] List 1
- [x] Item 1

- [ ] List 2
- [ ] Item 2
      `;
      const result = parseTasks("", markdown);
      expect(result.length).toBe(4);

      // First list items
      expect(result[0].startOffset).toBe(1);
      expect(result[0].endOffset).toBe(13);
      expect(markdown.slice(result[0].startOffset, result[0].endOffset)).toBe(
        "- [ ] List 1",
      );

      expect(result[1].startOffset).toBe(14);
      expect(result[1].endOffset).toBe(26);
      expect(markdown.slice(result[1].startOffset, result[1].endOffset)).toBe(
        "- [x] Item 1",
      );

      // Second list items (after blank line)
      expect(result[2].startOffset).toBe(28);
      expect(result[2].endOffset).toBe(40);
      expect(markdown.slice(result[2].startOffset, result[2].endOffset)).toBe(
        "- [ ] List 2",
      );

      expect(result[3].startOffset).toBe(41);
      expect(result[3].endOffset).toBe(53);
      expect(markdown.slice(result[3].startOffset, result[3].endOffset)).toBe(
        "- [ ] Item 2",
      );
    });

    it("should handle offsets with formatting in task text", () => {
      const markdown = `
- [ ] **Bold** and _italic_ text
      `;
      const result = parseTasks("", markdown);
      expect(result.length).toBe(1);

      expect(result[0].startOffset).toBe(1);
      expect(result[0].endOffset).toBe(33);
      expect(markdown.slice(result[0].startOffset, result[0].endOffset)).toBe(
        "- [ ] **Bold** and _italic_ text",
      );
    });

    it("should return accurate offsets for empty tasks", () => {
      const markdown = `
- [x]
- [ ]
      `;
      const result = parseTasks("", markdown);
      expect(result.length).toBe(0);
    });

    it("should handle nested lists correctly with offsets", () => {
      const markdown = `
- [ ] Parent item
  - [ ] Child item
  - [x] Completed child
      `;
      const result = parseTasks("", markdown);
      expect(result.length).toBe(3);

      // Parent item
      expect(result[0].startOffset).toBe(1);
      expect(result[0].endOffset).toBe(61);
      expect(markdown.slice(result[0].startOffset, result[0].endOffset)).toBe(
        "- [ ] Parent item\n  - [ ] Child item\n  - [x] Completed child",
      );

      // Child items
      expect(result[1].startOffset).toBe(21);
      expect(result[1].endOffset).toBe(37);
      expect(markdown.slice(result[1].startOffset, result[1].endOffset)).toBe(
        "- [ ] Child item",
      );

      expect(result[2].startOffset).toBe(40);
      expect(result[2].endOffset).toBe(61);
      expect(markdown.slice(result[2].startOffset, result[2].endOffset)).toBe(
        "- [x] Completed child",
      );
    });

    it("should preserve offsets when tasks have no description", () => {
      const markdown = `
- [ ] Simple task
- [x] Done task
      `;
      const result = parseTasks("", markdown);
      expect(result.length).toBe(2);

      expect(result[0].startOffset).toBe(1);
      expect(result[0].endOffset).toBe(18);
      expect(markdown.slice(result[0].startOffset, result[0].endOffset)).toBe(
        "- [ ] Simple task",
      );

      expect(result[1].startOffset).toBe(19);
      expect(result[1].endOffset).toBe(34);
      expect(markdown.slice(result[1].startOffset, result[1].endOffset)).toBe(
        "- [x] Done task",
      );
    });
  });
});
