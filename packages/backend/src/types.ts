import type { Database } from "@kiracode/db";
import type { createRuntimeManager } from "@kiracode/session-runtime";
import type { createAppContext } from "./context.ts";

export type ReturnTypeCreateDatabase = Database;
export type ReturnTypeCreateRuntimeManager = ReturnType<typeof createRuntimeManager>;
export type AppContext = Awaited<ReturnType<typeof createAppContext>>;
