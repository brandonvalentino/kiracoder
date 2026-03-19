import {
  createTRPCProxyClient,
  httpBatchLink,
  httpSubscriptionLink,
  splitLink,
} from "@trpc/client";
import type { AppRouter } from "@kiracode/backend";

export function createApiClient(baseUrl: string) {
  return createTRPCProxyClient<AppRouter>({
    links: [
      splitLink({
        condition(operation) {
          return operation.type === "subscription";
        },
        false: httpBatchLink({
          url: baseUrl,
        }),
        true: httpSubscriptionLink({
          url: baseUrl,
        }),
      }),
    ],
  });
}
