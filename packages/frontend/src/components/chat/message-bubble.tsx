import { renderMarkdown, renderUserMarkdown } from "@/lib/markdown";
import { StreamingThinkingBlock, ThinkingBlock } from "./thinking-block";
import { ToolCard } from "./tool-card";
import type { ToolExecution } from "@/lib/pi-events";

type ContentBlock =
  | { type: "text"; text: string }
  | { type: "thinking"; thinking: string }
  | { type: "toolCall"; id: string; name: string; arguments: Record<string, unknown> }
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
  toolExecutions,
  isHistory,
}: {
  message: AgentMessage;
  toolExecutions?: ToolExecution[];
  isHistory?: boolean;
}) {
  const blocks = extractBlocks(message.content);
  const textBlocks = blocks.filter((b) => b.type === "text") as Array<{
    type: "text";
    text: string;
  }>;
  const thinkingBlocks = blocks.filter((b) => b.type === "thinking") as Array<{
    type: "thinking";
    thinking: string;
  }>;

  const html = textBlocks.map((b) => renderMarkdown(b.text)).join("");
  const cost = message.usage?.cost?.total;

  function handleCopy() {
    void navigator.clipboard.writeText(textBlocks.map((b) => b.text).join("\n"));
  }

  return (
    <div className={`message assistant${isHistory ? " history" : ""}`}>
      <div className="message-content">
        {thinkingBlocks.map((b, i) => (
          <ThinkingBlock key={i} thinking={b.thinking} />
        ))}
        <div dangerouslySetInnerHTML={{ __html: html }} />
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
      {toolExecutions && toolExecutions.length > 0
        ? toolExecutions.map((ex) => <ToolCard execution={ex} key={ex.toolCallId} />)
        : null}
    </div>
  );
}

// Streaming assistant message — live update during prompt
export function StreamingAssistantMessage({ text, thinking }: { text: string; thinking: string }) {
  const html = renderMarkdown(text);

  return (
    <div className="message assistant">
      <div className="message-content streaming">
        {thinking ? <StreamingThinkingBlock thinking={thinking} /> : null}
        {text ? <div dangerouslySetInnerHTML={{ __html: html }} /> : null}
      </div>
    </div>
  );
}

export type { AgentMessage };
