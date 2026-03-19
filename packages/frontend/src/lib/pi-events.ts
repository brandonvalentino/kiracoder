/**
 * Pi SDK session event types — mirrors the shapes the Pi SDK fires
 * through session.subscribe(event => ...).
 */

export type UsageInfo = {
  input?: number;
  output?: number;
  cacheRead?: number;
  cacheWrite?: number;
  cost?: {
    input?: number;
    output?: number;
    total?: number;
  };
};

export type ToolResult = {
  content?: Array<{ type: string; text?: string }>;
};

export type PiEvent =
  | { type: "agent_start" }
  | { type: "agent_end" }
  | { type: "message_start"; message: { role: string } }
  | {
      type: "message_update";
      assistantMessageEvent:
        | { type: "text_delta"; delta: string }
        | { type: "thinking_delta"; delta: string };
    }
  | { type: "message_end"; message: { usage?: UsageInfo } }
  | {
      type: "tool_execution_start";
      toolCallId: string;
      toolName: string;
      args: Record<string, unknown>;
    }
  | { type: "tool_execution_update"; toolCallId: string; partialResult: ToolResult }
  | {
      type: "tool_execution_end";
      toolCallId: string;
      result: ToolResult;
      isError: boolean;
    }
  | { type: "auto_compaction_start" }
  | { type: "auto_compaction_end"; summary?: string }
  | { type: "session_name"; name: string }
  | { type: "extension_ui_request"; method: string; [key: string]: unknown }
  | { type: string; [key: string]: unknown };

export type ToolExecution = {
  toolCallId: string;
  toolName: string;
  args: Record<string, unknown>;
  status: "pending" | "streaming" | "complete" | "error";
  output: string;
};

/** A tool result message as stored in session.messages by the Pi SDK. */
export type ToolResultMessage = {
  role: "toolResult";
  toolCallId: string;
  toolName: string;
  content: Array<{ type: string; text?: string }>;
  isError: boolean;
};

/** A tool call content block inside an assistant message. */
export type ToolCallBlock = {
  type: "toolCall";
  id: string;
  name: string;
  arguments: Record<string, unknown>;
};

/** Build a ToolExecution from a toolCall block and its optional result. */
export function toolExecutionFromHistory(
  block: ToolCallBlock,
  result: ToolResultMessage | undefined,
): ToolExecution {
  return {
    toolCallId: block.id,
    toolName: block.name,
    args: block.arguments,
    status: result ? (result.isError ? "error" : "complete") : "pending",
    output: result
      ? result.content
          .map((c) => (c.type === "text" ? (c.text ?? "") : JSON.stringify(c)))
          .join("\n")
      : "",
  };
}

export function parsePiEvent(raw: unknown): PiEvent | null {
  if (!raw || typeof raw !== "object") return null;
  const ev = raw as Record<string, unknown>;
  if (typeof ev.type !== "string") return null;
  return ev as PiEvent;
}

export function formatToolResult(result: ToolResult | null | undefined): string {
  if (!result) return "";
  if (result.content && Array.isArray(result.content)) {
    return result.content
      .map((block) => {
        if (block.type === "text") return block.text ?? "";
        return JSON.stringify(block);
      })
      .join("\n");
  }
  return JSON.stringify(result, null, 2);
}

export function getArgsPreview(toolName: string, args: Record<string, unknown>): string {
  if (!args || Object.keys(args).length === 0) return "";
  if (typeof args.path === "string") return args.path;
  if (typeof args.command === "string") return args.command.substring(0, 80);
  if (typeof args.query === "string") return args.query.substring(0, 60);
  if (typeof args.url === "string") return args.url;
  for (const val of Object.values(args)) {
    if (typeof val === "string" && val.length > 0) return val.substring(0, 60);
  }
  return toolName;
}
