import { TRPCError } from "@trpc/server";
import { z } from "zod";
import {
  WorkspaceNotFoundError,
  WorkspaceSessionOpenError,
} from "../features/workspaces/workspace-errors.ts";
import { createRouter, publicProcedure } from "../trpc.ts";

/**
 * Translate typed workspace feature errors into tRPC errors with meaningful
 * codes so the client can react appropriately rather than receiving a
 * generic 500.
 *
 * - WorkspaceNotFoundError     → NOT_FOUND (no DB row)
 * - WorkspaceSessionOpenError  → PRECONDITION_FAILED (row exists, file missing/corrupt)
 * - Everything else            → re-thrown as-is (tRPC catches and 500s)
 */
function mapWorkspaceError(error: unknown): never {
  if (error instanceof WorkspaceNotFoundError) {
    throw new TRPCError({ code: "NOT_FOUND", message: error.message });
  }
  if (error instanceof WorkspaceSessionOpenError) {
    throw new TRPCError({
      cause: error.cause,
      code: "PRECONDITION_FAILED",
      message: error.message,
    });
  }
  throw error;
}

async function wrapWorkspace<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    mapWorkspaceError(error);
  }
}

async function* wrapWorkspaceGen<T>(gen: AsyncIterable<T>): AsyncGenerator<T> {
  try {
    yield* gen;
  } catch (error) {
    mapWorkspaceError(error);
  }
}

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
      return wrapWorkspace(() => ctx.workspaceService.createWorkspace(input));
    }),

  events: publicProcedure
    .input(
      z.object({
        workspaceId: z.string().min(1),
      }),
    )
    .subscription(async function* ({ ctx, input, signal }) {
      yield* wrapWorkspaceGen(
        ctx.workspaceService.subscribeToWorkspaceEvents(input.workspaceId, signal),
      );
    }),

  list: publicProcedure
    .input(
      z.object({
        projectId: z.string().min(1),
      }),
    )
    .query(async ({ ctx, input }) => {
      return ctx.workspaceService.listWorkspaces(input.projectId);
    }),

  messages: publicProcedure
    .input(
      z.object({
        workspaceId: z.string().min(1),
      }),
    )
    .query(async ({ ctx, input }) => {
      return wrapWorkspace(() => ctx.workspaceService.getMessages(input.workspaceId));
    }),

  prompt: publicProcedure
    .input(
      z.object({
        message: z.string().min(1),
        workspaceId: z.string().min(1),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return wrapWorkspace(() =>
        ctx.workspaceService.promptWorkspace(input.workspaceId, input.message),
      );
    }),

  resetSession: publicProcedure
    .input(
      z.object({
        workspaceId: z.string().min(1),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return wrapWorkspace(() => ctx.workspaceService.resetWorkspaceSession(input.workspaceId));
    }),

  delete: publicProcedure
    .input(
      z.object({
        workspaceId: z.string().min(1),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const workspace = await ctx.workspaceService.deleteWorkspace(input.workspaceId);
      if (!workspace) throw new TRPCError({ code: "NOT_FOUND", message: "Workspace not found" });
      return workspace;
    }),
});
