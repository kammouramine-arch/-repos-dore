/**
 * A minimal stand-in for the Supabase query builder, enough to exercise the tool
 * executor end to end without a database. Every call is recorded so tests can assert
 * exactly which table was touched and with what.
 */
export type RecordedCall = {
  table: string;
  op: 'select' | 'insert' | 'update' | 'delete' | 'upsert';
  payload?: unknown;
  filters: { method: string; args: unknown[] }[];
};

export type Responder = (call: RecordedCall) => { data: unknown; error: { message: string } | null };

export function createFakeDb(respond: Responder) {
  const calls: RecordedCall[] = [];

  const from = (table: string) => {
    const call: RecordedCall = { table, op: 'select', filters: [] };
    calls.push(call);

    const resolve = async () => respond(call);

    const builder: Record<string, unknown> = {
      then: (onFulfilled: (value: unknown) => unknown, onRejected?: (reason: unknown) => unknown) =>
        resolve().then(onFulfilled, onRejected),
      single: resolve,
      maybeSingle: resolve,
    };

    const chainable = [
      'select', 'eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'in', 'is', 'not', 'ilike',
      'like', 'or', 'filter', 'order', 'limit', 'range',
    ];
    for (const method of chainable) {
      builder[method] = (...args: unknown[]) => {
        call.filters.push({ method, args });
        return builder;
      };
    }

    for (const method of ['insert', 'update', 'upsert', 'delete'] as const) {
      builder[method] = (payload?: unknown) => {
        call.op = method;
        call.payload = payload;
        return builder;
      };
    }

    return builder;
  };

  return {
    db: {
      from,
      rpc: async (name: string) => respond({ table: `rpc:${name}`, op: 'select', filters: [] }),
    },
    calls,
  };
}

export const okResponse = (data: unknown) => ({ data, error: null });
export const errorResponse = (message: string) => ({ data: null, error: { message } });
