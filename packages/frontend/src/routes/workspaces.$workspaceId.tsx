import { createRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { ChatView } from "@/components/chat/chat-view";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import { rootRoute } from "@/routes/__root";
import { useAppStore } from "@/stores/app-store";

export const workspaceRoute = createRoute({
  component: WorkspaceRouteComponent,
  getParentRoute: () => rootRoute,
  path: "/workspaces/$workspaceId",
});

function WorkspaceRouteComponent() {
  const { workspaceId } = workspaceRoute.useParams();

  useEffect(() => {
    // rerender-defer-reads: read store functions at call time via getState()
    // instead of subscribing to them — they're only needed inside this callback,
    // not for rendering, so they must NOT be deps.
    const { selectWorkspace, loadMessages, subscribeToWorkspace } = useAppStore.getState();

    selectWorkspace(workspaceId);
    void loadMessages(workspaceId);

    // subscribeToWorkspace now returns the unsubscribe fn — return it as
    // effect cleanup so the SSE connection closes when the route unmounts.
    return subscribeToWorkspace(workspaceId);
  }, [workspaceId]); // rerender-dependencies: only the primitive workspaceId

  return (
    <ErrorBoundary
      fallback={(error, reset) => (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            height: "100%",
            gap: 12,
            padding: 24,
          }}
        >
          <p style={{ fontSize: 13, color: "var(--error)" }}>Failed to render workspace</p>
          <p
            style={{
              fontSize: 11,
              color: "var(--text-dim)",
              fontFamily: "var(--font-mono)",
              maxWidth: 480,
              wordBreak: "break-word",
              textAlign: "center",
            }}
          >
            {error.message}
          </p>
          <button
            onClick={reset}
            type="button"
            style={{
              fontSize: 12,
              padding: "6px 14px",
              borderRadius: "var(--radius-sm)",
              border: "1px solid var(--border)",
              background: "var(--bg-glass)",
              color: "var(--text-secondary)",
              cursor: "pointer",
            }}
          >
            Retry
          </button>
        </div>
      )}
    >
      <ChatView workspaceId={workspaceId} />
    </ErrorBoundary>
  );
}
