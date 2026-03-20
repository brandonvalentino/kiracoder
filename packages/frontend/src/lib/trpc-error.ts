import { TRPCClientError } from "@trpc/client";

/**
 * Extract the tRPC error code string from an unknown error thrown by a tRPC
 * client call, or return null if the error is not a tRPC error.
 *
 * Example codes: "NOT_FOUND", "PRECONDITION_FAILED", "INTERNAL_SERVER_ERROR"
 */
export function getTRPCErrorCode(error: unknown): string | null {
  if (error instanceof TRPCClientError) {
    return (error.data as { code?: string } | null | undefined)?.code ?? null;
  }
  return null;
}
