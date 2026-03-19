import { createRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { ChatView } from "@/components/chat/chat-view";
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

  return <ChatView workspaceId={workspaceId} />;
}
