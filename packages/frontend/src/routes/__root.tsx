import { createRootRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/shell/app-shell";

export const rootRoute = createRootRoute({
  component: AppShell,
});
