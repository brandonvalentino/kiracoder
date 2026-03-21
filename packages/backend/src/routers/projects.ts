import { z } from "zod";
import { createRouter, publicProcedure } from "../trpc.ts";

export const projectsRouter = createRouter({
  create: publicProcedure
    .input(
      z.object({
        name: z.string().min(1),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.projectService.createProject(input.name);
    }),
  delete: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const project = await ctx.projectService.deleteProject(input.id);
      if (!project) throw new Error("Project not found");
      return project;
    }),
  list: publicProcedure.query(async ({ ctx }) => {
    return ctx.projectService.listProjects();
  }),
});
