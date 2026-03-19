import { useEffect, useRef } from "react";
import { useAppStore } from "@/stores/app-store";
import { UserMessage, AssistantMessage, StreamingAssistantMessage } from "./message-bubble";
import { ToolCard } from "./tool-card";
import { ChatInput } from "./chat-input";
import type { AgentMessage } from "@/stores/app-store";

// rerender-memo-with-default-value: stable module-level constants so the
// selectors below never return a new reference when the workspace has no data.
const EMPTY_MESSAGES: AgentMessage[] = [];
const EMPTY_EXECUTIONS: Record<string, import("@/lib/pi-events").ToolExecution> = {};

function Welcome() {
  return (
    <div className="welcome">
      <div className="welcome-icon">
        <div
          style={{
            width: 64,
            height: 64,
            borderRadius: 18,
            background: "var(--bg-glass-strong)",
            border: "1px solid var(--border)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 28,
            opacity: 0.6,
          }}
        >
          K
        </div>
      </div>
      <p>Welcome to KiraCode</p>
      <p className="hint">
        Create a workspace and type a message to start chatting with your Pi-powered session.
      </p>
      <div className="shortcuts-hint">
        <span>/ Focus input</span>
        <span>Esc Abort</span>
      </div>
    </div>
  );
}

export function ChatView({ workspaceId }: { workspaceId: string | null }) {
  // rerender-memo-with-default-value: fall back to the stable constants so
  // the array/object reference never changes when there is no data yet.
  const messages = useAppStore((s) =>
    workspaceId ? (s.messagesByWorkspace[workspaceId] ?? EMPTY_MESSAGES) : EMPTY_MESSAGES,
  );
  const toolExecutions = useAppStore((s) =>
    workspaceId ? (s.toolExecutionsByWorkspace[workspaceId] ?? EMPTY_EXECUTIONS) : EMPTY_EXECUTIONS,
  );

  // rerender-derived-state: subscribe to derived booleans instead of the full
  // streaming objects — this component only re-renders when the boolean flips,
  // not on every token delta.
  const isThisWorkspaceStreaming = useAppStore(
    (s) => s.isStreaming && s.streamingWorkspaceId === workspaceId,
  );
  const streamingText = useAppStore((s) => s.streamingState.text);
  const streamingThinking = useAppStore((s) => s.streamingState.thinking);

  // rerender-defer-reads: read promptWorkspace at call time, not as a dep.
  // It's only used inside the submit handler, not for rendering.

  const messagesRef = useRef<HTMLDivElement>(null);
  // rerender-use-ref-transient-values: isNearBottom doesn't need to trigger
  // re-renders — it's a transient flag used only inside scroll callbacks.
  const isNearBottom = useRef(true);

  // client-passive-event-listeners: use passive scroll listener.
  useEffect(() => {
    const el = messagesRef.current;
    if (!el) return;
    function onScroll() {
      if (!el) return;
      isNearBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 150;
    }
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  // Auto-scroll on new content.  Dependencies are primitives (rerender-dependencies).
  useEffect(() => {
    const el = messagesRef.current;
    if (!el || !isNearBottom.current) return;
    el.scrollTop = el.scrollHeight;
  }, [messages, streamingText, streamingThinking]);

  async function handleSend(message: string) {
    if (!workspaceId) return;
    // rerender-defer-reads: read promptWorkspace at event time.
    const { promptWorkspace } = useAppStore.getState();
    await promptWorkspace(workspaceId, message);
  }

  if (!workspaceId) {
    return (
      <div
        style={{ display: "flex", flexDirection: "column", height: "100%", position: "relative" }}
      >
        <div className="messages" ref={messagesRef} style={{ paddingTop: 24, paddingBottom: 24 }}>
          <Welcome />
        </div>
      </div>
    );
  }

  const activeToolExecutions = Object.values(toolExecutions).filter(
    (t) => t.status === "pending" || t.status === "streaming",
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", position: "relative" }}>
      <div className="messages" ref={messagesRef}>
        {messages.length === 0 && !isThisWorkspaceStreaming ? (
          <Welcome />
        ) : (
          messages.map((message, i) => {
            if (message.role === "user") {
              return <UserMessage isHistory key={i} message={message} />;
            }
            if (message.role === "assistant") {
              return <AssistantMessage isHistory key={i} message={message} />;
            }
            return null;
          })
        )}

        {/* Live tool cards — only shown while streaming */}
        {isThisWorkspaceStreaming && activeToolExecutions.length > 0
          ? activeToolExecutions.map((ex) => <ToolCard execution={ex} key={ex.toolCallId} />)
          : null}

        {/* Streaming message */}
        {isThisWorkspaceStreaming && (streamingText || streamingThinking) ? (
          <StreamingAssistantMessage text={streamingText} thinking={streamingThinking} />
        ) : null}

        {/* Typing indicator — shown while waiting for first token */}
        {isThisWorkspaceStreaming &&
        !streamingText &&
        !streamingThinking &&
        activeToolExecutions.length === 0 ? (
          <div className="typing-indicator">
            <div className="typing-dot" />
            <div className="typing-dot" />
            <div className="typing-dot" />
          </div>
        ) : null}
      </div>

      <ChatInput
        isStreaming={isThisWorkspaceStreaming}
        onSend={(msg) => {
          void handleSend(msg);
        }}
      />
    </div>
  );
}
