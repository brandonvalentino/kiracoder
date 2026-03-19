import { useState } from "react";
import { type ToolExecution, getArgsPreview } from "@/lib/pi-events";

function DiffView({ oldText, newText }: { oldText: string; newText: string }) {
  const oldLines = oldText.split("\n");
  const newLines = newText.split("\n");

  return (
    <div className="tool-diff">
      {oldLines.map((line, i) => (
        <div className="diff-line diff-removed" key={`rem-${i}`}>
          - {line}
        </div>
      ))}
      {newLines.map((line, i) => (
        <div className="diff-line diff-added" key={`add-${i}`}>
          + {line}
        </div>
      ))}
    </div>
  );
}

export function ToolCard({ execution }: { execution: ToolExecution }) {
  const { toolCallId, toolName, args, status, output } = execution;

  const isActive = status === "streaming" || status === "pending";
  const [expanded, setExpanded] = useState(isActive);

  const preview = getArgsPreview(toolName, args);

  const isEdit =
    (toolName === "edit" || toolName === "Edit") &&
    args &&
    (args.oldText || args.old_text) &&
    (args.newText || args.new_text);

  const argsJson = !isEdit && Object.keys(args).length > 0 ? JSON.stringify(args, null, 2) : null;

  function handleCopyOutput() {
    if (!output) return;
    void navigator.clipboard.writeText(output);
  }

  return (
    <div className="tool-card" data-tool-call-id={toolCallId}>
      <div
        className="tool-card-header"
        onClick={() => setExpanded((e) => !e)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === "Enter" && setExpanded((v) => !v)}
      >
        <div className="tool-header-left">
          <span className={`tool-card-chevron${expanded ? " expanded" : ""}`}>
            <svg fill="currentColor" height="8" viewBox="0 0 8 8" width="8">
              <path d="M2 1l4 3-4 3z" />
            </svg>
          </span>
          <span className="tool-name">{toolName}</span>
          {preview ? <span className="tool-args-preview">{preview}</span> : null}
        </div>
        <div className="tool-header-right">
          <button
            className="tool-action-btn"
            onClick={(e) => {
              e.stopPropagation();
              handleCopyOutput();
            }}
            title="Copy output"
            type="button"
          >
            <svg
              fill="none"
              height="13"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              viewBox="0 0 24 24"
              width="13"
            >
              <rect height="14" rx="2" width="14" x="8" y="8" />
              <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
            </svg>
          </button>
          <div className={`tool-status ${status}`}>{status}</div>
        </div>
      </div>

      <div className={`tool-card-body${expanded ? " expanded" : ""}`}>
        {isEdit ? (
          <DiffView
            oldText={String(args.oldText ?? args.old_text ?? "")}
            newText={String(args.newText ?? args.new_text ?? "")}
          />
        ) : argsJson ? (
          <div className="tool-args">{argsJson}</div>
        ) : null}

        {output ? (
          <div className="tool-output-wrapper">
            <div className="tool-output-header">
              <span>Output</span>
            </div>
            <div className="tool-output">{output}</div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
