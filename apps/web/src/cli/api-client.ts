import { createTRPCProxyClient, httpBatchLink } from "@trpc/client";
import type { AppRouter } from "@kiracode/backend";

export function createApiClient(baseUrl: string) {
  return createTRPCProxyClient<AppRouter>({
    links: [
      httpBatchLink({
        url: baseUrl,
      }),
    ],
  });
}
