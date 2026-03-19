import type { createDbClient } from "@kiracode/db";
import type { createRuntimeManager } from "@kiracode/session-runtime";
import type { createAppContext } from "./context.ts";

export type ReturnTypeCreateDbClient = ReturnType<typeof createDbClient>;
export type ReturnTypeCreateRuntimeManager = ReturnType<typeof createRuntimeManager>;
export type AppContext = ReturnType<typeof createAppContext>;
