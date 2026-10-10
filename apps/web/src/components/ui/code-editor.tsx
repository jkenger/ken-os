"use client";

import { useEffect, useRef, useState } from "react";
import { indentWithTab } from "@codemirror/commands";
import { javascript } from "@codemirror/lang-javascript";
import { EditorState } from "@codemirror/state";
import { EditorView, basicSetup } from "codemirror";
import { keymap } from "@codemirror/view";
import { cn } from "@/lib/utils";

const kenTheme = EditorView.theme({
  "&": { fontSize: "var(--text-sm)", backgroundColor: "var(--background)", color: "var(--foreground)" },
  ".cm-content": { fontFamily: "var(--font-mono)", padding: "10px 0" },
  ".cm-gutters": { backgroundColor: "var(--muted)", color: "var(--muted-foreground)", border: "none" },
  ".cm-activeLine": { backgroundColor: "color-mix(in oklch, var(--muted), transparent 40%)" },
  ".cm-activeLineGutter": { backgroundColor: "var(--secondary)", color: "var(--foreground)" },
  "&.cm-focused": { outline: "none" },
});

const readOnlyTheme = EditorView.theme({
  ".cm-activeLine, .cm-activeLineGutter": { backgroundColor: "transparent" },
  ".cm-cursor": { display: "none" },
});

/**
 * CodeMirror 6 themed with the shadcn tokens, used both for writing and for showing code so the two look the same.
 * The text is plain until the editor mounts, so code is readable without JavaScript and the layout doesn't jump.
 * Tab indents; Escape then Tab moves focus on, which is CodeMirror's keyboard-trap escape.
 */
export function CodeEditor({ value, onChange, readOnly = false, label, minHeight, className }: {
  value: string;
  onChange?: (value: string) => void;
  readOnly?: boolean;
  label: string;
  minHeight?: number;
  className?: string;
}) {
  const host = useRef<HTMLDivElement>(null);
  const view = useRef<EditorView | null>(null);
  const change = useRef(onChange);
  const [ready, setReady] = useState(false);
  change.current = onChange;

  useEffect(() => {
    if (!host.current) return;
    const editor = new EditorView({
      parent: host.current,
      state: EditorState.create({
        doc: value,
        extensions: [
          basicSetup, javascript(), kenTheme,
          ...(readOnly ? [readOnlyTheme] : [keymap.of([indentWithTab])]),
          EditorView.contentAttributes.of({ "aria-label": label }),
          EditorState.readOnly.of(readOnly), EditorView.editable.of(!readOnly),
          EditorView.updateListener.of((update) => { if (update.docChanged) change.current?.(update.state.doc.toString()); }),
        ],
      }),
    });
    view.current = editor;
    setReady(true);
    return () => { editor.destroy(); view.current = null; };
    // Rebuilt only when the editor's kind changes; text updates go through the effect below.
  }, [readOnly, label]);

  // Outside changes, such as "Reset to starter" or a draft restored from storage, replace the text.
  useEffect(() => {
    const editor = view.current;
    if (editor && editor.state.doc.toString() !== value) {
      editor.dispatch({ changes: { from: 0, to: editor.state.doc.length, insert: value } });
    }
  }, [value]);

  return (
    <div className={cn("overflow-hidden rounded-lg border border-border", className)} style={{ minHeight }}>
      {!ready && <pre className="overflow-x-auto bg-background px-4 py-2.5 font-mono text-sm" aria-label={label}><code>{value.replace(/\n$/, "")}</code></pre>}
      <div ref={host} className={cn("[&_.cm-editor]:h-full", !ready && "hidden")} style={{ minHeight }} />
    </div>
  );
}
