import { z } from "zod";
import { createRouter, publicProcedure } from "../trpc.ts";

export const projectsRouter = createRouter({
  create: publicProcedure
    .input(
      z.object({
        name: z.string().min(1),
      }),
    )
    .mutation(({ ctx, input }) => {
      return ctx.projectService.createProject(input.name);
    }),
  list: publicProcedure.query(({ ctx }) => {
    return ctx.projectService.listProjects();
  }),
});
