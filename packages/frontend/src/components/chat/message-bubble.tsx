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

// User message
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
    <div className={`message user${isHistory ? " history" : ""}`}>
      <div className="message-content">
        {images.length > 0 ? (
          <div className="message-images">
            {images.map((img, i) => {
              const imgBlock = img as { source?: { data?: string; media_type?: string } };
              const src = imgBlock.source?.data
                ? `data:${imgBlock.source.media_type ?? "image/png"};base64,${imgBlock.source.data}`
                : "";
              return src ? (
                <img alt="Attached" className="message-image" key={i} src={src} />
              ) : null;
            })}
          </div>
        ) : null}
        <span dangerouslySetInnerHTML={{ __html: renderUserMarkdown(text) }} />
      </div>
      <button
        aria-label="Copy message"
        className="message-copy-btn"
        onClick={handleCopy}
        type="button"
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
          <rect height="13" rx="2" width="13" x="9" y="9" />
          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
        </svg>
      </button>
    </div>
  );
}

// Assistant message (static — from session history)
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
    <div className={`message assistant${isHistory ? " history" : ""}`}>
      <div className="message-content">
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
      {cost && cost > 0 ? <span className="message-usage">${cost.toFixed(4)}</span> : null}
      <button
        aria-label="Copy message"
        className="message-copy-btn"
        onClick={handleCopy}
        type="button"
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
          <rect height="13" rx="2" width="13" x="9" y="9" />
          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
        </svg>
      </button>
    </div>
  );
}

// Streaming assistant message — live update during prompt.
// Uses Streamdown with isAnimating=true so it handles incomplete
// markdown (unclosed code fences, etc.) correctly during streaming.
export function StreamingAssistantMessage({ text, thinking }: { text: string; thinking: string }) {
  return (
    <div className="message assistant">
      <div className="message-content streaming">
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
