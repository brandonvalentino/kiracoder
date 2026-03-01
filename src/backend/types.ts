/**
 * RPC Types
 * Based on @mariozechner/pi-coding-agent/dist/modes/rpc/rpc-types
 */

// Commands sent to Pi
export type RPCCommand =
  | { type: "prompt"; message: string; images?: ImageContent[]; id?: string }
  | { type: "steer"; message: string; images?: ImageContent[]; id?: string }
  | { type: "follow_up"; message: string; images?: ImageContent[]; id?: string }
  | { type: "abort"; id?: string }
  | { type: "get_state"; id?: string }
  | { type: "set_model"; provider: string; modelId: string; id?: string }
  | { type: "bash"; command: string; id?: string };

export interface ImageContent {
  type: "image";
  data: string; // base64
  mimeType: string;
}

// Responses from Pi
export interface RPCResponse {
  type: "response";
  command: string;
  success: boolean;
  error?: string;
  data?: unknown;
  id?: string;
}

// Events from Pi
export type RPCEvent =
  | { type: "agent_start" }
  | { type: "agent_end"; messages: AgentMessage[] }
  | { type: "turn_start" }
  | { type: "turn_end"; message: AgentMessage; toolResults: ToolResultMessage[] }
  | { type: "message_start"; message: AgentMessage }
  | { type: "message_update"; message: AgentMessage; assistantMessageEvent: AssistantMessageEvent }
  | { type: "message_end"; message: AgentMessage }
  | { type: "tool_execution_start"; toolCallId: string; toolName: string; args: Record<string, unknown> }
  | { type: "tool_execution_update"; toolCallId: string; toolName: string; args: Record<string, unknown>; partialResult: ToolResult }
  | { type: "tool_execution_end"; toolCallId: string; toolName: string; result: ToolResult; isError: boolean }
  | { type: "extension_ui_request"; id: string; method: string; [key: string]: unknown }
  | { type: "extension_error"; extensionPath: string; event: string; error: string };

// Assistant message events (streaming)
export type AssistantMessageEvent =
  | { type: "start"; partial: Partial<AssistantMessage> }
  | { type: "text_start"; contentIndex: number; partial: Partial<AssistantMessage> }
  | { type: "text_delta"; contentIndex: number; delta: string; partial: Partial<AssistantMessage> }
  | { type: "text_end"; contentIndex: number; content: string; partial: Partial<AssistantMessage> }
  | { type: "thinking_start"; contentIndex: number; partial: Partial<AssistantMessage> }
  | { type: "thinking_delta"; contentIndex: number; delta: string; partial: Partial<AssistantMessage> }
  | { type: "thinking_end"; contentIndex: number; thinking: string; partial: Partial<AssistantMessage> }
  | { type: "toolcall_start"; contentIndex: number; partial: Partial<AssistantMessage> }
  | { type: "toolcall_delta"; contentIndex: number; delta: string; partial: Partial<AssistantMessage> }
  | { type: "toolcall_end"; contentIndex: number; toolCall: ToolCall; partial: Partial<AssistantMessage> }
  | { type: "done"; reason: "stop" | "length" | "toolUse"; partial: Partial<AssistantMessage> }
  | { type: "error"; reason: "aborted" | "error"; partial: Partial<AssistantMessage> };

// Message types
export type AgentMessage = UserMessage | AssistantMessage | ToolResultMessage;

export interface UserMessage {
  role: "user";
  content: string | ContentBlock[];
  timestamp: number;
}

export interface AssistantMessage {
  role: "assistant";
  content: ContentBlock[];
  api: string;
  provider: string;
  model: string;
  usage: Usage;
  stopReason: "stop" | "length" | "toolUse" | "error" | "aborted";
  timestamp: number;
}

export interface ToolResultMessage {
  role: "toolResult";
  toolCallId: string;
  toolName: string;
  content: ContentBlock[];
  isError: boolean;
  timestamp: number;
}

export type ContentBlock = TextContent | ThinkingContent | ToolCall;

export interface TextContent {
  type: "text";
  text: string;
}

export interface ThinkingContent {
  type: "thinking";
  thinking: string;
}

export interface ToolCall {
  type: "toolCall";
  id: string;
  name: string;
  arguments: Record<string, unknown>;
}

export interface ToolResult {
  content: ContentBlock[];
  details?: Record<string, unknown>;
}

export interface Usage {
  input: number;
  output: number;
  cacheRead: number;
  cacheWrite: number;
  cost: {
    input: number;
    output: number;
    cacheRead: number;
    cacheWrite: number;
    total: number;
  };
}

// Extension UI response (sent to Pi)
export type ExtensionUIResponse =
  | { type: "extension_ui_response"; id: string; value: string }
  | { type: "extension_ui_response"; id: string; confirmed: boolean }
  | { type: "extension_ui_response"; id: string; cancelled: true };

// WebSocket messages (to frontend)
export type WSMessage =
  | { type: "event"; event: RPCEvent }
  | { type: "state"; isStreaming: boolean; model?: string }
  | { type: "error"; message: string };

// Extension UI request forwarded to frontend
export interface ExtensionUIRequest {
  id: string;
  method: "select" | "confirm" | "input" | "editor" | "notify" | "setStatus" | "setWidget" | "setTitle" | "set_editor_text";
  title?: string;
  message?: string;
  options?: string[];
  placeholder?: string;
  prefill?: string;
  timeout?: number;
  notifyType?: "info" | "warning" | "error";
  statusKey?: string;
  statusText?: string;
  widgetKey?: string;
  widgetLines?: string[];
  text?: string;
}
