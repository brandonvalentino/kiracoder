import { z } from "zod";
import { createRouter, publicProcedure } from "../trpc.ts";

export const workspacesRouter = createRouter({
  create: publicProcedure
    .input(
      z.object({
        cwd: z.string().min(1).optional(),
        name: z.string().min(1),
        projectId: z.string().min(1),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.workspaceService.createWorkspace(input.projectId, input.name, input.cwd);
    }),
  list: publicProcedure
    .input(
      z.object({
        projectId: z.string().min(1),
      }),
    )
    .query(({ ctx, input }) => {
      return ctx.workspaceService.listWorkspaces(input.projectId);
    }),
});
