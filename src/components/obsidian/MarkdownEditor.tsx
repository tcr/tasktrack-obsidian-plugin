import { App } from "obsidian";
import {
  createEmbeddableMarkdownEditor,
  EmbeddableMarkdownEditor,
  MarkdownEditorProps,
} from "@/vendor/markdown-editor";
import { useEffect, useRef } from "preact/hooks";
import { h } from "preact";
import { Annotation } from "@codemirror/state";
import Logger from "@/lib/Logger";
import { Except } from "type-fest";
import { EditorView } from "@codemirror/view";

export const ExternalChange = Annotation.define<boolean>();

export type MarkdownEditorValue = {
  value: string;
  source: string;
};

export type MarkdownEditorInput = {
  app: App;
  value: MarkdownEditorValue;
};

/**
 * Preact component to wrap Obsidian/Task Genius markdown-editor
 */
export default function MarkdownEditor({
  app,
  value,
  onChange,
  cssText,
}: MarkdownEditorInput & Except<Partial<MarkdownEditorProps>, "value">) {
  const ref = useRef<HTMLDivElement>(null);
  const editorRef = useRef<EmbeddableMarkdownEditor>(null);

  useEffect(() => {
    if (!ref.current) return;

    ref.current.empty();
    editorRef.current = createEmbeddableMarkdownEditor(app, ref.current, {
      value: value.value,
      onChange,
      cssText,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [app, onChange, cssText]);

  // Update editor whenever "value" changes.
  // Similar logic to: https://github.com/uiwjs/react-codemirror/blob/master/core/src/useCodeMirror.ts
  useEffect(() => {
    if (!editorRef.current) return;

    const view = editorRef.current.activeCM as EditorView;
    if (
      view &&
      value.source == "react" &&
      value.value !== view.state.doc.toString()
    ) {
      Logger.info("HARD REFRESH");
      view.dispatch({
        changes: {
          from: 0,
          to: view.state.doc.toString().length,
          insert: value.value,
        },
        annotations: [ExternalChange.of(true)],
      });
    }
  }, [value]);

  return <div ref={ref} className="flex flex-col grow" />;
}
