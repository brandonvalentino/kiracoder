import { createRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { ChatView } from "@/components/chat/chat-view";
import { rootRoute } from "@/routes/root-route";
import { useAppStore } from "@/stores/app-store";

export const workspaceRoute = createRoute({
  component: WorkspaceRouteComponent,
  getParentRoute: () => rootRoute,
  path: "/workspaces/$workspaceId",
});

function WorkspaceRouteComponent() {
  const { workspaceId } = workspaceRoute.useParams();
  const loadMessages = useAppStore((state) => state.loadMessages);
  const selectWorkspace = useAppStore((state) => state.selectWorkspace);
  const subscribeToWorkspace = useAppStore((state) => state.subscribeToWorkspace);

  useEffect(() => {
    selectWorkspace(workspaceId);
    void loadMessages(workspaceId);
    subscribeToWorkspace(workspaceId);
  }, [loadMessages, selectWorkspace, subscribeToWorkspace, workspaceId]);

  return <ChatView workspaceId={workspaceId} />;
}
