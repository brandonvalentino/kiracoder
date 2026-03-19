import { createRouter } from "../trpc.ts";
import { projectsRouter } from "./projects.ts";
import { systemRouter } from "./system.ts";
import { workspacesRouter } from "./workspaces.ts";

export const appRouter = createRouter({
  projects: projectsRouter,
  system: systemRouter,
  workspaces: workspacesRouter,
});

export type AppRouter = typeof appRouter;
