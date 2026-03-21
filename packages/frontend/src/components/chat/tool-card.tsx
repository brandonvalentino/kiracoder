import { useState } from "react";
import { type ToolExecution, getArgsPreview } from "@/lib/pi-events";

function DiffView({ oldText, newText }: { oldText: string; newText: string }) {
  const oldLines = oldText.split("\n");
  const newLines = newText.split("\n");

  return (
    /* tool-diff */
    <div className="max-h-[300px] overflow-x-auto overflow-y-auto border-b font-mono text-[11px] leading-[1.5]" style={{ borderColor: "var(--border)" }}>
      {oldLines.map((line, i) => (
        /* diff-removed */
        <div
          className="whitespace-pre-wrap break-all px-3 py-px"
          key={`rem-${i}`}
          style={{
            background: "rgba(248, 113, 113, 0.08)",
            color: "var(--error)",
          }}
        >
          - {line}
        </div>
      ))}
      {newLines.map((line, i) => (
        /* diff-added */
        <div
          className="whitespace-pre-wrap break-all px-3 py-px"
          key={`add-${i}`}
          style={{
            background: "rgba(52, 211, 153, 0.08)",
            color: "var(--success)",
          }}
        >
          + {line}
        </div>
      ))}
    </div>
  );
}

export function ToolCard({ execution }: { execution: ToolExecution }) {
  const { toolCallId, toolName, args, status, output } = execution;

  const isActive = status === "streaming" || status === "pending";
  const [expanded, setExpanded] = useState(false);

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

  // tool-status variant classes
  const statusStyle: React.CSSProperties =
    status === "pending"
      ? {
          background: "var(--bg-glass-strong)",
          color: "var(--text-dim)",
          border: "1px solid var(--border)",
        }
      : status === "streaming"
        ? {
            background: "var(--tool-accent)",
            color: "white",
          }
        : status === "complete"
          ? {
              background: "rgba(52, 211, 153, 0.1)",
              color: "var(--success)",
              border: "1px solid rgba(52, 211, 153, 0.2)",
            }
          : {
              // error
              background: "rgba(248, 113, 113, 0.1)",
              color: "var(--error)",
              border: "1px solid rgba(248, 113, 113, 0.2)",
            };

  const statusPrefix =
    status === "pending"
      ? "○ "
      : status === "streaming"
        ? "● "
        : status === "complete"
          ? "✓ "
          : "! ";

  return (
    /* tool-card */
    <div
      className="my-0.5 w-full shrink-0 self-start overflow-hidden rounded-2xl border text-[16px] transition-colors"
      data-tool-call-id={toolCallId}
      style={{
        background: "var(--tool-bg)",
        border: "1px solid var(--border)",
        backdropFilter: "blur(12px)",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLDivElement).style.borderColor = "var(--border-hover)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLDivElement).style.borderColor = "var(--border)";
      }}
    >
      {/* tool-card-header */}
      <div
        className="group flex cursor-pointer select-none items-center justify-between px-3 py-2 transition-colors hover:bg-[var(--bg-glass-hover)]"
        onClick={() => setExpanded((e) => !e)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === "Enter" && setExpanded((v) => !v)}
      >
        {/* tool-header-left */}
        <div className="flex min-w-0 items-center gap-2">
          {/* tool-card-chevron */}
          <span
            className="shrink-0 text-[8px] opacity-30 transition-transform duration-200"
            style={{ transform: expanded ? "rotate(90deg)" : "rotate(0deg)" }}
          >
            <svg fill="currentColor" height="8" viewBox="0 0 8 8" width="8">
              <path d="M2 1l4 3-4 3z" />
            </svg>
          </span>
          {/* tool-name */}
          <span
            className="font-mono text-[11px] font-semibold"
            style={{ color: "var(--tool-accent-text)" }}
          >
            {toolName}
          </span>
          {/* tool-args-preview */}
          {preview ? (
            <span
              className="max-w-[360px] overflow-hidden text-ellipsis whitespace-nowrap font-mono text-[11px]"
              style={{ color: "var(--text-dim)" }}
            >
              {preview}
            </span>
          ) : null}
        </div>

        {/* tool-header-right */}
        <div className="flex shrink-0 items-center gap-1.5">
          {/* tool-action-btn: copy */}
          <button
            className="flex h-6 w-6 items-center justify-center rounded-[var(--radius-xs)] border-none bg-transparent p-0 opacity-0 transition-all group-hover:opacity-60 hover:!opacity-100 hover:!bg-[var(--bg-glass-hover)]"
            style={{ color: "var(--text-dim)" }}
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
          {/* tool-status */}
          <div
            className={`flex shrink-0 items-center gap-1 rounded-full px-[7px] py-0.5 text-[10px] font-bold uppercase tracking-[0.04em]${status === "streaming" ? " animate-pulse" : ""}`}
            style={statusStyle}
          >
            <span className="text-[7px]">{statusPrefix}</span>
            {status}
          </div>
        </div>
      </div>

      {/* tool-card-body */}
      {expanded && (
        <div className="border-t" style={{ borderColor: "var(--border)" }}>
          {isEdit ? (
            <DiffView
              oldText={String(args.oldText ?? args.old_text ?? "")}
              newText={String(args.newText ?? args.new_text ?? "")}
            />
          ) : argsJson ? (
            /* tool-args */
            <div
              className="overflow-x-auto border-b px-3 py-2.5 font-mono text-[11px] whitespace-pre-wrap"
              style={{
                background: "rgba(0, 0, 0, 0.15)",
                borderColor: "var(--border)",
                color: "var(--text-secondary)",
              }}
            >
              {argsJson}
            </div>
          ) : null}

          {output ? (
            /* tool-output-wrapper */
            <div className="relative">
              {/* tool-output-header */}
              <div
                className="flex items-center justify-between px-3 py-1 text-[10px] uppercase tracking-[0.05em]"
                style={{ color: "var(--text-dim)" }}
              >
                <span>Output</span>
              </div>
              {/* tool-output */}
              <div
                className="max-h-[260px] overflow-y-auto px-3 py-2.5 font-mono text-[11px] whitespace-pre-wrap"
                style={{
                  background: "rgba(0, 0, 0, 0.1)",
                  color: "var(--text-secondary)",
                }}
              >
                {output}
              </div>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
