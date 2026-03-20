import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

export const env = createEnv({
  server: {
    KIRACODE_PORT: z
      .string()
      .default("3141")
      .transform(Number),
  },
  runtimeEnv: process.env,
  emptyStringAsUndefined: true,
});