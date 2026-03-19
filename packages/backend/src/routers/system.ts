import { createRouter, publicProcedure } from "../trpc.ts";

export const systemRouter = createRouter({
  health: publicProcedure.query(({ ctx }) => {
    return {
      appRootDir: ctx.appRootDir,
      sessionsDir: ctx.sessionsDir,
      status: "ok",
    };
  }),
});
