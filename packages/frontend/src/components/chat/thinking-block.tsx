import { useState } from "react";

export function ThinkingBlock({ thinking }: { thinking: string }) {
  const [expanded, setExpanded] = useState(false);

  return (
    /* thinking-block */
    <div
      className="mb-2.5 w-full shrink-0 self-start overflow-hidden rounded-2xl border text-[16px] transition-colors"
      style={{
        background: "var(--thinking-bg)",
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
      {/* thinking-toggle */}
      <button
        className="flex w-full items-center gap-2 border-none bg-transparent px-3 py-2 text-left text-[12px] transition-colors hover:bg-[var(--bg-glass-hover)]"
        style={{ color: "var(--text-dim)" }}
        onClick={() => setExpanded((e) => !e)}
        type="button"
      >
        {/* chevron */}
        <span
          className="shrink-0 text-[8px] opacity-30 transition-transform duration-200"
          style={{ transform: expanded ? "rotate(90deg)" : "rotate(0deg)" }}
        >
          <svg fill="currentColor" height="8" viewBox="0 0 8 8" width="8">
            <path d="M2 1l4 3-4 3z" />
          </svg>
        </span>
        {/* thinking-label */}
        <span
          className="flex flex-row items-center gap-1.5 font-mono text-[11px] font-semibold"
          style={{ color: "var(--text-secondary)" }}
        >
          <svg
            fill="none"
            height="12"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            viewBox="0 0 24 24"
            width="12"
          >
            <path d="M12 5a3 3 0 1 0-5.997.125 4 4 0 0 0-2.526 5.77 4 4 0 0 0 .556 6.588A4 4 0 1 0 12 18Z" />
            <path d="M12 5a3 3 0 1 1 5.997.125 4 4 0 0 1 2.526 5.77 4 4 0 0 1-.556 6.588A4 4 0 1 1 12 18Z" />
            <path d="M12 5v13" />
            <path d="M6.5 9h11" />
            <path d="M7 13h10" />
          </svg>
          Thinking
        </span>
      </button>
      {/* thinking-content */}
      {expanded && (
        <div
          className="max-h-[260px] overflow-y-auto border-t px-3 pb-3 pt-0 text-[12px] italic leading-[1.5] whitespace-pre-wrap"
          style={{
            borderColor: "var(--border)",
            color: "var(--text-dim)",
          }}
        >
          {thinking}
        </div>
      )}
    </div>
  );
}

export function StreamingThinkingBlock({ thinking }: { thinking: string }) {
  const [expanded, setExpanded] = useState(true);

  return (
    /* thinking-block streaming-thinking */
    <div
      className="mb-2.5 w-full shrink-0 self-start overflow-hidden rounded-2xl border text-[16px] transition-colors"
      style={{
        background: "var(--thinking-bg)",
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
      {/* thinking-toggle */}
      <button
        className="flex w-full items-center gap-2 border-none bg-transparent px-3 py-2 text-left text-[12px] transition-colors hover:bg-[var(--bg-glass-hover)]"
        style={{ color: "var(--text-dim)" }}
        onClick={() => setExpanded((e) => !e)}
        type="button"
      >
        {/* chevron */}
        <span
          className="shrink-0 text-[8px] opacity-30 transition-transform duration-200"
          style={{ transform: expanded ? "rotate(90deg)" : "rotate(0deg)" }}
        >
          <svg fill="currentColor" height="8" viewBox="0 0 8 8" width="8">
            <path d="M2 1l4 3-4 3z" />
          </svg>
        </span>
        {/* thinking-label */}
        <span
          className="font-mono text-[11px] font-semibold"
          style={{ color: "var(--text-secondary)" }}
        >
          Thinking…
        </span>
      </button>
      {/* thinking-content */}
      {expanded && (
        <div
          className="max-h-[260px] overflow-y-auto border-t px-3 pb-3 pt-0 text-[12px] italic leading-[1.5] whitespace-pre-wrap"
          style={{
            borderColor: "var(--border)",
            color: "var(--text-dim)",
          }}
        >
          {thinking}
        </div>
      )}
    </div>
  );
}
