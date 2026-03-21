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
    /* input-area: absolute bottom bar with frosted glass */
    <div
      className="absolute bottom-0 left-0 right-0 z-10 px-5 pt-2.5 pb-3"
      style={{
        background: "var(--header-bg)",
        backdropFilter: "blur(40px) saturate(1.5)",
        WebkitBackdropFilter: "blur(40px) saturate(1.5)",
        borderTop: "1px solid var(--border)",
      }}
    >
      <form
        className="flex w-full items-end gap-2"
        id="chat-form"
        onSubmit={handleSubmit}
      >
        {/* input-bubble */}
        <div className="relative flex flex-1 items-stretch">
          <textarea
            className="flex-1 resize-none overflow-y-auto py-3 px-[18px] text-[15px] leading-[1.45] outline-none max-h-40 transition-all disabled:opacity-35 disabled:cursor-not-allowed"
            style={{
              background: "var(--bg-glass)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-lg)",
              color: "var(--text-primary)",
              fontFamily: "inherit",
              backdropFilter: "blur(var(--blur))",
            }}
            disabled={disabled && !isStreaming}
            id="message-input"
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = "var(--accent)";
              e.currentTarget.style.background = "var(--bg-glass-hover)";
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = "var(--border)";
              e.currentTarget.style.background = "var(--bg-glass)";
            }}
            placeholder={
              placeholder ??
              "Type a message… (Enter to send, Shift+Enter for newline)"
            }
            ref={textareaRef}
            rows={2}
            value={draft}
          />
        </div>

        {/* input-actions */}
        <div className="flex gap-1 self-end">
          {isStreaming ? (
            /* abort-btn */
            <button
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-none text-white transition-all hover:scale-110 active:scale-[0.88]"
              id="abort-btn"
              onClick={onAbort}
              style={{
                background: "var(--error)",
                boxShadow: "0 4px 16px rgba(248, 113, 113, 0.3)",
              }}
              title="Abort (Esc)"
              type="button"
            >
              <svg fill="currentColor" height="14" viewBox="0 0 24 24" width="14">
                <rect height="16" rx="2" width="16" x="4" y="4" />
              </svg>
            </button>
          ) : (
            /* send-btn */
            <button
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-none transition-all hover:enabled:scale-110 hover:enabled:brightness-115 active:enabled:scale-[0.88] disabled:opacity-35 disabled:cursor-not-allowed"
              disabled={!draft.trim() || disabled}
              id="send-btn"
              style={{ background: "var(--accent)", cursor: "pointer" }}
              title="Send message"
              type="submit"
            >
              {/* send-icon */}
              <span className="flex items-center justify-center text-white">
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
