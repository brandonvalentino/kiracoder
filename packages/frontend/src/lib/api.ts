import {
  createTRPCProxyClient,
  httpBatchLink,
  httpSubscriptionLink,
  splitLink,
} from "@trpc/client";
import type { AppRouter } from "@kiracode/backend";
import { env } from "../env.ts";

export const apiBaseUrl = env.VITE_KIRACODE_API_URL;

export function createApiClient() {
  return createTRPCProxyClient<AppRouter>({
    links: [
      splitLink({
        condition(operation) {
          return operation.type === "subscription";
        },
        false: httpBatchLink({
          url: apiBaseUrl,
        }),
        true: httpSubscriptionLink({
          url: apiBaseUrl,
        }),
      }),
    ],
  });
}
