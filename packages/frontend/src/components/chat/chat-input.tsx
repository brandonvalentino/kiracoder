import { useEffect, useRef, useState } from "react";

type Props = {
  onSend: (message: string) => void;
  onAbort?: () => void;
  disabled?: boolean;
  isStreaming?: boolean;
  placeholder?: string;
};

export function ChatInput({ onSend, onAbort, disabled, isStreaming, placeholder }: Props) {
  const [draft, setDraft] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 200) + "px";
  }, [draft]);

  // Focus with `/` global shortcut
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement)?.tagName;
      if (e.key === "/" && tag !== "INPUT" && tag !== "TEXTAREA") {
        e.preventDefault();
        textareaRef.current?.focus();
      }
      if (e.key === "Escape" && isStreaming) {
        onAbort?.();
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [isStreaming, onAbort]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const msg = draft.trim();
    if (!msg || disabled || isStreaming) return;
    onSend(msg);
    setDraft("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e as unknown as React.FormEvent);
    }
  }

  return (
    <div className="input-area">
      <form id="chat-form" onSubmit={handleSubmit}>
        <div className="input-bubble">
          <textarea
            disabled={disabled && !isStreaming}
            id="message-input"
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder ?? "Type a message… (Enter to send, Shift+Enter for newline)"}
            ref={textareaRef}
            rows={2}
            value={draft}
          />
        </div>

        <div className="input-actions">
          {isStreaming ? (
            <button id="abort-btn" onClick={onAbort} title="Abort (Esc)" type="button">
              <svg fill="currentColor" height="14" viewBox="0 0 24 24" width="14">
                <rect height="16" rx="2" width="16" x="4" y="4" />
              </svg>
            </button>
          ) : (
            <button
              disabled={!draft.trim() || disabled}
              id="send-btn"
              title="Send message"
              type="submit"
            >
              <span className="send-icon">
                <svg
                  fill="none"
                  height="16"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2.5"
                  viewBox="0 0 24 24"
                  width="16"
                >
                  <line x1="12" x2="12" y1="19" y2="5" />
                  <polyline points="5 12 12 5 19 12" />
                </svg>
              </span>
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
