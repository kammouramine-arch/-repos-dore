/** Deliberately exclude messages, stacks, response bodies, queries and causes. */
export function safeErrorCategory(error: unknown): string {
  if (!(error instanceof Error)) return 'unknown_error';
  switch (error.name) {
    case 'AbortError': return 'aborted';
    case 'TimeoutError': return 'timeout';
    case 'PrismaClientKnownRequestError':
    case 'PrismaClientUnknownRequestError':
    case 'PrismaClientInitializationError': return 'database_error';
    case 'APIConnectionError': return 'provider_connection_error';
    case 'APIError': return 'provider_error';
    default: return 'operation_failed';
  }
}
