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
  events: publicProcedure
    .input(
      z.object({
        workspaceId: z.string().min(1),
      }),
    )
    .subscription(async function* ({ ctx, input, signal }) {
      yield* ctx.workspaceService.subscribeToWorkspaceEvents(input.workspaceId, signal);
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
  messages: publicProcedure
    .input(
      z.object({
        workspaceId: z.string().min(1),
      }),
    )
    .query(async ({ ctx, input }) => {
      return ctx.workspaceService.getMessages(input.workspaceId);
    }),
  prompt: publicProcedure
    .input(
      z.object({
        message: z.string().min(1),
        workspaceId: z.string().min(1),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.workspaceService.promptWorkspace(input.workspaceId, input.message);
    }),
});
