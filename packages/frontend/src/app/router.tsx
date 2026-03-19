import { createRouter } from "@tanstack/react-router";
import { indexRoute } from "@/routes/index";
import { rootRoute } from "@/routes/__root";
import { workspaceRoute } from "@/routes/workspaces.$workspaceId";

const routeTree = rootRoute.addChildren([indexRoute, workspaceRoute]);

export const router = createRouter({
  routeTree,
  defaultPreload: "intent",
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
