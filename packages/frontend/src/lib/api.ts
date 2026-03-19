import {
  createTRPCProxyClient,
  httpBatchLink,
  httpSubscriptionLink,
  splitLink,
} from "@trpc/client";
import type { AppRouter } from "@kiracode/backend";

export const apiBaseUrl =
  import.meta.env.VITE_KIRACODE_API_URL?.trim() || `${window.location.origin}/trpc`;

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
