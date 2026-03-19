import { useState } from "react";

export function ThinkingBlock({ thinking }: { thinking: string }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="thinking-block">
      <button
        className={`thinking-toggle${expanded ? " expanded" : ""}`}
        onClick={() => setExpanded((e) => !e)}
        type="button"
      >
        <span className="chevron">
          <svg fill="currentColor" height="8" viewBox="0 0 8 8" width="8">
            <path d="M2 1l4 3-4 3z" />
          </svg>
        </span>
        <span className="thinking-label">
          <svg
            fill="none"
            height="12"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            style={{ verticalAlign: "-1px" }}
            viewBox="0 0 24 24"
            width="12"
          >
            <path d="M12 5a3 3 0 1 0-5.997.125 4 4 0 0 0-2.526 5.77 4 4 0 0 0 .556 6.588A4 4 0 1 0 12 18Z" />
            <path d="M12 5a3 3 0 1 1 5.997.125 4 4 0 0 1 2.526 5.77 4 4 0 0 1-.556 6.588A4 4 0 1 1 12 18Z" />
            <path d="M12 5v13" />
            <path d="M6.5 9h11" />
            <path d="M7 13h10" />
          </svg>{" "}
          Thinking
        </span>
      </button>
      <div className={`thinking-content${expanded ? " expanded" : ""}`}>{thinking}</div>
    </div>
  );
}

export function StreamingThinkingBlock({ thinking }: { thinking: string }) {
  const [expanded, setExpanded] = useState(true);

  return (
    <div className="thinking-block streaming-thinking">
      <button
        className={`thinking-toggle${expanded ? " expanded" : ""}`}
        onClick={() => setExpanded((e) => !e)}
        type="button"
      >
        <span className="chevron">
          <svg fill="currentColor" height="8" viewBox="0 0 8 8" width="8">
            <path d="M2 1l4 3-4 3z" />
          </svg>
        </span>
        <span className="thinking-label">Thinking…</span>
      </button>
      <div className={`thinking-content${expanded ? " expanded" : ""}`}>{thinking}</div>
    </div>
  );
}
