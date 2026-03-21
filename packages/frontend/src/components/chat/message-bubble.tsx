import { Streamdown } from "streamdown";
import { renderUserMarkdown } from "@/lib/markdown";
import { StreamingThinkingBlock, ThinkingBlock } from "./thinking-block";
import { ToolCard } from "./tool-card";
import {
  toolExecutionFromHistory,
  type ToolCallBlock,
  type ToolResultMessage,
} from "@/lib/pi-events";

type ContentBlock =
  | { type: "text"; text: string }
  | { type: "thinking"; thinking: string }
  | ToolCallBlock
  | { type: "image"; source?: { data?: string; media_type?: string } }
  | { type: string; [key: string]: unknown };

type AgentMessage = {
  role: string;
  content?: unknown;
  usage?: {
    cost?: { total?: number };
  };
};

function extractText(content: unknown): string {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return (content as ContentBlock[])
      .filter((b) => b.type === "text")
      .map((b) => (b as { type: "text"; text: string }).text)
      .join("\n");
  }
  return "";
}

function extractBlocks(content: unknown): ContentBlock[] {
  if (Array.isArray(content)) return content as ContentBlock[];
  if (typeof content === "string") return [{ type: "text", text: content }];
  return [];
}

// Copy icon SVG (shared)
function CopyIcon() {
  return (
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
      <rect height="13" rx="2" width="13" x="9" y="9" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}

// ── User message ─────────────────────────────────────────────────────────────
export function UserMessage({
  message,
  isHistory,
}: {
  message: AgentMessage;
  isHistory?: boolean;
}) {
  const text = extractText(message.content);
  const images = Array.isArray(message.content)
    ? (message.content as ContentBlock[]).filter((b) => b.type === "image")
    : [];

  function handleCopy() {
    void navigator.clipboard.writeText(text);
  }

  return (
    /* message user — align right, row-reverse */
    <div
      className={`group flex max-w-[85%] shrink-0 flex-row-reverse items-start gap-1 self-end${isHistory ? "" : " animate-[msgIn_0.25s_var(--ease)]"}`}
    >
      {/* message-content (user bubble) */}
      <div
        className="break-words whitespace-pre-wrap rounded-[var(--radius-lg)] rounded-br-[6px] border px-4 py-2 text-[14px] font-medium leading-[1.75]"
        style={{
          background: "var(--user-bubble)",
          borderColor: "var(--border)",
          color: "var(--user-bubble-text)",
          backdropFilter: "blur(12px)",
        }}
      >
        {images.length > 0 ? (
          <div className="mb-1.5 flex flex-wrap gap-1.5">
            {images.map((img, i) => {
              const imgBlock = img as { source?: { data?: string; media_type?: string } };
              const src = imgBlock.source?.data
                ? `data:${imgBlock.source.media_type ?? "image/png"};base64,${imgBlock.source.data}`
                : "";
              return src ? (
                <img
                  alt="Attached"
                  className="max-h-[200px] max-w-[240px] rounded-[var(--radius-md)] border object-cover"
                  style={{ borderColor: "var(--border)" }}
                  key={i}
                  src={src}
                />
              ) : null;
            })}
          </div>
        ) : null}
        <span dangerouslySetInnerHTML={{ __html: renderUserMarkdown(text) }} />
      </div>
      {/* message-copy-btn */}
      <button
        aria-label="Copy message"
        className="mt-1 shrink-0 cursor-pointer self-start border-none bg-transparent px-1.5 py-1 text-[10px] whitespace-nowrap opacity-0 transition-all group-hover:opacity-100 hover:!text-[var(--text-primary)]"
        style={{ color: "var(--text-dim)", fontFamily: "inherit" }}
        onClick={handleCopy}
        type="button"
      >
        <CopyIcon />
      </button>
    </div>
  );
}

// ── Assistant message (static — from session history) ────────────────────────
export function AssistantMessage({
  message,
  toolResultMap,
  isHistory,
}: {
  message: AgentMessage;
  toolResultMap?: Record<string, ToolResultMessage>;
  isHistory?: boolean;
}) {
  const blocks = extractBlocks(message.content);

  const hasText = blocks.some((b) => b.type === "text");
  const hasThinking = blocks.some((b) => b.type === "thinking");
  const hasToolCalls = blocks.some((b) => b.type === "toolCall");
  const isToolOnly = hasToolCalls && !hasText && !hasThinking;

  const cost = message.usage?.cost?.total;

  // Tool-call-only messages: render cards directly in the flow, no bubble wrapper.
  if (isToolOnly) {
    return (
      <>
        {blocks
          .filter((b) => b.type === "toolCall")
          .map((b) => {
            const call = b as ToolCallBlock;
            const ex = toolExecutionFromHistory(call, toolResultMap?.[call.id]);
            return <ToolCard execution={ex} key={call.id} />;
          })}
      </>
    );
  }

  // Text / mixed messages: render blocks in order inside the message bubble.
  const textBlocks = blocks.filter((b) => b.type === "text") as Array<{
    type: "text";
    text: string;
  }>;

  function handleCopy() {
    void navigator.clipboard.writeText(textBlocks.map((b) => b.text).join("\n"));
  }

  return (
    /* message assistant — align left */
    <div
      className={`group flex max-w-[85%] shrink-0 flex-row items-start gap-1 self-start${isHistory ? "" : " animate-[msgIn_0.25s_var(--ease)]"}`}
    >
      {/* message-content (assistant — no background) */}
      <div
        className="message-content break-words overflow-wrap-anywhere border-none bg-transparent py-1 px-0 text-[14px] leading-[1.75]"
        style={{ color: "var(--text-primary)" }}
      >
        {blocks.map((b, i) => {
          if (b.type === "thinking") {
            return (
              <ThinkingBlock
                key={i}
                thinking={(b as { type: "thinking"; thinking: string }).thinking}
              />
            );
          }
          if (b.type === "text") {
            return (
              <Streamdown
                key={i}
                mode="static"
              >
                {(b as { type: "text"; text: string }).text}
              </Streamdown>
            );
          }
          if (b.type === "toolCall") {
            const call = b as ToolCallBlock;
            const ex = toolExecutionFromHistory(call, toolResultMap?.[call.id]);
            return <ToolCard execution={ex} key={call.id} />;
          }
          return null;
        })}
      </div>
      {/* cost + copy stacked on the side */}
      <div className="flex shrink-0 flex-col items-start gap-0.5 self-start mt-1">
        {cost && cost > 0 ? (
          <span
            className="inline-block font-mono text-[10px] opacity-50"
            style={{ color: "var(--text-dim)" }}
          >
            ${cost.toFixed(4)}
          </span>
        ) : null}
        <button
          aria-label="Copy message"
          className="cursor-pointer self-start border-none bg-transparent px-1.5 py-1 text-[10px] whitespace-nowrap opacity-0 transition-all group-hover:opacity-100 hover:!text-[var(--text-primary)]"
          style={{ color: "var(--text-dim)", fontFamily: "inherit" }}
          onClick={handleCopy}
          type="button"
        >
          <CopyIcon />
        </button>
      </div>
    </div>
  );
}

// ── Streaming assistant message ───────────────────────────────────────────────
// Uses Streamdown with isAnimating=true so it handles incomplete
// markdown (unclosed code fences, etc.) correctly during streaming.
export function StreamingAssistantMessage({ text, thinking }: { text: string; thinking: string }) {
  return (
    /* message assistant (live) */
    <div className="flex max-w-[85%] shrink-0 flex-row items-start gap-1 self-start">
      {/* message-content streaming — cursor appended via CSS */}
      <div
        className="message-content streaming break-words overflow-wrap-anywhere border-none bg-transparent py-1 px-0 text-[14px] leading-[1.75]"
        style={{ color: "var(--text-primary)" }}
      >
        {thinking ? <StreamingThinkingBlock thinking={thinking} /> : null}
        {text ? (
          <Streamdown
            isAnimating
            mode="streaming"
          >
            {text}
          </Streamdown>
        ) : null}
      </div>
    </div>
  );
}

export type { AgentMessage };
