import { initTRPC } from "@trpc/server";
import type { AppContext } from "./types.ts";

const t = initTRPC.context<AppContext>().create();

export const createRouter = t.router;
export const publicProcedure = t.procedure;
