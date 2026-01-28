/**
 * SearchInput component with metadata pill parsing
 *
 * This component parses input text to identify patterns like "status:open"
 * and renders them as interactive pills while maintaining the original search string.
 */

import { EditorState, Extension, Range } from "@codemirror/state";
import {
  Decoration,
  DecorationSet,
  EditorView,
  keymap,
  placeholder as placeholderView,
  ViewPlugin,
  ViewUpdate,
  WidgetType,
} from "@codemirror/view";
import { render, h, Fragment } from "preact";
import { useCallback, useEffect, useRef, useState } from "preact/hooks";
import { Icon } from "./obsidian/Icon";
import { TaskDatabaseFilters } from "@/lib/TaskDatabase";
import { CLOSED_STATUSES, OPEN_STATUSES, parseTaskStatus } from "@/Task";

class MetadataPillWidget extends WidgetType {
  private key: string;
  private value: string;

  constructor(key: string, value: string, _: EditorView) {
    super();
    this.key = key;
    this.value = value;
  }

  toDOM(view: EditorView): HTMLElement {
    const root = view.dom.ownerDocument.createElement("div");
    let span: HTMLElement;
    const text = `${this.key}:${this.value}`;
    render(
      <span
        className="
        metadata-pill inline-flex items-center
        h-lh
        bg-blue-100 text-blue-800 px-2 rounded-lg text-sm mx-1"
      >
        <span>{text}</span>
        <span
          className="ml-1 text-blue-600 hover:text-blue-800 text-xs touchable cursor-pointer"
          onClick={(e: MouseEvent) => {
            e.stopPropagation();

            const start = view.posAtDOM(span);
            const end = start + text.length;

            view.dispatch(
              view.state.update({
                changes: { from: start, to: end },
                userEvent: "remove.metadata",
              }),
            );
          }}
        >
          ×
        </span>
      </span>,
      root,
    );
    span = root.firstElementChild as HTMLElement;
    span.remove();
    return span;
  }

  eq(other: MetadataPillWidget): boolean {
    return other.key === this.key && other.value === this.value;
  }
}

class PillsPlugin {
  decorations: DecorationSet;

  constructor(view: EditorView) {
    this.decorations = this.generate(view);
  }

  generate(view: EditorView): DecorationSet {
    const doc = view.state.doc;
    const text = doc.toString();

    // Create new decorations for metadata patterns
    const decorations: Range<Decoration>[] = [];
    let match: RegExpExecArray | null;
    let regex = view.hasFocus
      ? /\b(\w+):(\S+)(?=\s)/g
      : /\b(\w+):(\S+)(?=\s|$)/g;
    while ((match = regex.exec(text)) !== null) {
      const start = match.index;
      const end = match.index + match[0].length;
      const key = match[1];
      const value = match[2];

      decorations.push(
        Decoration.replace({
          widget: new MetadataPillWidget(key, value, view),
          key: `metadata-pill-${start}-${end}`,
        }).range(start, end),
      );
    }

    return Decoration.set(decorations);
  }

  update(update: ViewUpdate) {
    if (update.docChanged || update.viewportChanged || update.focusChanged)
      this.decorations = this.generate(update.view);
  }
}

function searchToFilters(newSearchTerm: string): TaskDatabaseFilters {
  const filters: TaskDatabaseFilters = {
    statuses: [],
    keywords: [],
    files: [],
  };

  const tokens = newSearchTerm.match(/\S+/g) || [];
  filters.keywords = tokens.filter((token) => !/\w:/.test(token));

  for (const token of tokens.filter((token) => /\w:/.test(token))) {
    const [key, value] = token.split(":", 2);
    switch (key) {
      case "is":
        switch (value) {
          case "open":
            filters.statuses = [...filters.statuses, ...OPEN_STATUSES];
            break;
          case "closed":
            filters.statuses = [...filters.statuses, ...CLOSED_STATUSES];
            break;
        }
        break;

      case "status": {
        const status = parseTaskStatus(value);
        if (status) {
          filters.statuses = [...filters.statuses, status];
        }
        break;
      }

      case "file":
        if (value) {
          filters.files = [...filters.files, value];
        }
        break;

      default:
        break;
    }
  }

  return filters;
}

export function SearchInput({
  value,
  onChangeFilters,
  placeholder = "Search tasks...",
}: {
  value: string;
  onChangeFilters: (filters: TaskDatabaseFilters) => void;
  placeholder?: string;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const ref = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView>(null);
  const [focused, setFocused] = useState(false);
  const [xcoord, setXcoord] = useState(0);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const focusEffectHandler = useCallback(
    (state: EditorState, focusing: boolean) => {
      const cursorOffset = state.selection.main.head;
      const localCoords = viewRef.current?.coordsAtPos(cursorOffset);
      const viewCoords = rootRef.current?.getBoundingClientRect();
      if (localCoords && viewCoords) {
        setXcoord(localCoords.left - viewCoords.left);
      }

      setFocused(focusing);

      viewRef.current?.dispatch({});
      return null;
    },
    [],
  );

  const handleUpdate = useCallback(
    (update: ViewUpdate) => {
      if (update.docChanged) {
        // Update filters.
        onChangeFilters(searchToFilters(update.state.doc.toString()));

        // Show suggestions when user starts typing (text after cursor)
        const cursorOffset = update.state.selection.main.head;
        const docText = update.state.doc.toString();
        if (cursorOffset > 0 && docText[cursorOffset - 1].trim() !== "") {
          setShowSuggestions(true);
        }
      }
      if (update.selectionSet) {
        const cursorOffset = update.state.selection.main.head;
        const localCoords = update.view.coordsAtPos(cursorOffset);
        const viewCoords = rootRef.current?.getBoundingClientRect();
        if (localCoords && viewCoords) {
          setXcoord(localCoords.left - viewCoords.left);
        }
      }
    },
    [onChangeFilters],
  );

  useEffect(() => {
    if (!ref.current) return;

    const extensions: Extension[] = [
      placeholderView(placeholder),
      ViewPlugin.fromClass(PillsPlugin, {
        decorations: (v) => v.decorations,
      }),
      keymap.of([
        { key: "Enter", preventDefault: true, run: () => false },
        { key: "ArrowUp", preventDefault: true, run: () => false },
        {
          key: "ArrowDown",
          preventDefault: true,
          run: () => {
            setShowSuggestions(true);
            return false;
          },
        },
        {
          key: "Escape",
          stopPropagation: true,
          preventDefault: true,
          run: () => {
            viewRef.current?.dom.blur();
            return true;
          },
        },
      ]),
      EditorView.theme({
        ".cm-content": {
          fontFamily: "var(--font-sans), Arial, sans-serif",
          caretColor: "var(--text-normal)",
        },
      }),
      EditorView.updateListener.of(handleUpdate),
      EditorView.focusChangeEffect.of(focusEffectHandler),
    ];

    const view = new EditorView({
      parent: ref.current,
      state: EditorState.create({
        doc: value,
        extensions: [...extensions],
      }),
    });
    viewRef.current = view;
    view.focus();
    // Move cursor to the end of the file
    view.dispatch({
      selection: {
        anchor: view.state.doc.length,
        head: view.state.doc.length,
      },
    });

    return () => {
      viewRef.current = null;
      view.destroy();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="relative" ref={rootRef}>
      <div
        className="
        w-full h-10 rounded-lg
        border-solid border-(--background-modifier-border) border-width-(--input-border-width)
        px-3 py-2 shadow-sm focus-within:shadow-outline
        flex flex-row items-center
        "
        style={{
          boxShadow:
            "0 0 0 var(--input-border-width-focus) var(--background-modifier-border-focus)",
        }}
      >
        <Icon icon="search" className="text-(--search-clear-button-color)" />
        <div ref={ref} className="grow ml-1" />
        <div
          className={[
            "text-(--search-clear-button-color) hover:text-(--text-normal) ml-1",
            value.length ? "" : "hidden",
          ].join(" ")}
          onClick={() =>
            viewRef.current?.dispatch({
              changes: {
                from: 0,
                to: viewRef.current?.state.doc.toString().length,
                insert: "",
              },
            })
          }
        >
          <Icon icon="tasktrack-search-clear" />
        </div>
        {focused && showSuggestions && <SearchBarSuggest left={xcoord} />}
      </div>
    </div>
  );
}

function SearchBarSuggest({ left }: { left: number }) {
  const [collapsed, setCollapsed] = useState(true);

  // Data structure for search suggestions
  const suggestions = [
    {
      label: "path:",
      description: "match path of the file",
    },
    {
      label: "file:",
      description: "match file name",
    },
    {
      label: "tag:",
      description: "search for tags",
    },
    {
      label: "is:open, is:closed",
      description: "match completion state",
    },
    {
      label: "status:",
      description: "search by status",
    },
    {
      label: "priority:",
      description: "search by priority",
    },
    {
      label: "note:",
      description: "search by notes content",
    },
  ];

  // Currently active suggestion label
  const currentActiveLabel = "path:";

  return (
    <div
      className="suggestion-container mod-search-suggestion absolute top-11 w-75 shadow-lg!"
      style={{
        left: left - 14,
      }}
    >
      <div className="overflow-y-auto p-(--size-2-3)">
        <div className="suggestion-item mod-complex search-suggest-item mod-group">
          <div className="suggestion-content">
            <div className="suggestion-title list-item-part mod-extended">
              <span>Search options</span>
            </div>
          </div>
          <div className="suggestion-aux">
            <div
              className="list-item-part search-suggest-icon clickable-icon"
              aria-label="Expand options"
              onMouseDown={(e) => {
                setCollapsed(!collapsed);
                e.preventDefault();
              }}
            >
              <Icon
                icon={collapsed ? "circle-chevron-down" : "circle-chevron-up"}
              />
            </div>
          </div>
        </div>
        {!collapsed && (
          <>
            {suggestions.map((suggestion, index) => (
              <div
                key={index}
                className={`suggestion-item mod-complex search-suggest-item ${suggestion.label === currentActiveLabel ? "is-selected" : ""}`}
              >
                <div className="suggestion-content">
                  <div className="suggestion-title">
                    <span>{suggestion.label}</span>
                    <span className="search-suggest-info-text">
                      {suggestion.description}
                    </span>
                  </div>
                </div>
                <div className="suggestion-aux"></div>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}
