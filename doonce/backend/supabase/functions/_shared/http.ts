// Runtime-neutral request handling built on the Fetch API (Node 20+ and Deno both provide it).
import Anthropic from "@anthropic-ai/sdk";
import { analyze, AnalyzeError, type AnalyzeDeps } from "./analyze.ts";
import { authenticate, AuthError, type TokenVerifier } from "./auth.ts";

export interface GatewayConfig {
  verifier: TokenVerifier;
  anthropic: Anthropic;
  model?: string;
  /** Max JSON body in bytes; frames are base64 JPEGs, ~300 KB each at 1080p/0.7. */
  maxBodyBytes?: number;
  /** Requests per user per minute for /v1/analyze. */
  analyzePerMinute?: number;
  /** Where account deletion requests go until the data store exists. */
  onAccountDeletion?: (subject: string) => Promise<void>;
  log?: AnalyzeDeps["log"];
}

const JSON_HEADERS = { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" };

export function errorResponse(status: number, code: string, message: string): Response {
  return new Response(JSON.stringify({ error: { code, message } }), { status, headers: JSON_HEADERS });
}

/** A tiny fixed-window limiter; a shared store replaces it when there is more than one instance. */
export class RateLimiter {
  private hits = new Map<string, { count: number; windowStart: number }>();
  constructor(private readonly perMinute: number) {}
  allow(key: string, now = Date.now()): boolean {
    const entry = this.hits.get(key);
    if (!entry || now - entry.windowStart >= 60_000) {
      this.hits.set(key, { count: 1, windowStart: now });
      return true;
    }
    entry.count += 1;
    return entry.count <= this.perMinute;
  }
}

export function makeHandler(config: GatewayConfig): (request: Request) => Promise<Response> {
  const limiter = new RateLimiter(config.analyzePerMinute ?? 10);
  const maxBody = config.maxBodyBytes ?? 12 * 1024 * 1024;

  return async (request: Request): Promise<Response> => {
    const url = new URL(request.url);
    const path = url.pathname.replace(/\/+$/, "");

    if (request.method === "GET" && path.endsWith("/health")) {
      return new Response(JSON.stringify({ ok: true, service: "doonce-gateway" }), { headers: JSON_HEADERS });
    }

    let identity;
    try {
      identity = await authenticate(request.headers, config.verifier);
    } catch (error) {
      if (error instanceof AuthError) return errorResponse(error.status, "unauthorized", error.message);
      return errorResponse(401, "unauthorized", "Could not verify the caller.");
    }

    if (request.method === "POST" && path.endsWith("/v1/analyze")) {
      if (!limiter.allow(identity.subject)) return errorResponse(429, "rate_limited", "Too many analyses; try again in a minute.");
      const length = Number(request.headers.get("content-length") ?? "0");
      if (length > maxBody) return errorResponse(413, "too_large", "The request is too large; send fewer frames.");
      let body: unknown;
      try {
        body = await request.json();
      } catch {
        return errorResponse(400, "invalid_request", "Body must be JSON.");
      }
      try {
        const result = await analyze(body, { client: config.anthropic, model: config.model, log: config.log });
        return new Response(JSON.stringify(result.response), { headers: { ...JSON_HEADERS, "x-doonce-model": result.usage.model } });
      } catch (error) {
        if (error instanceof AnalyzeError) return errorResponse(error.status, error.code, error.message);
        config.log?.("analyze.error", { message: error instanceof Error ? error.message : String(error) });
        return errorResponse(500, "internal", "Something didn't work. Your recording is safe on your phone.");
      }
    }

    if (request.method === "DELETE" && path.endsWith("/v1/account")) {
      await config.onAccountDeletion?.(identity.subject);
      // 202: the request is recorded; media and rows are removed asynchronously once a data store exists.
      return new Response(JSON.stringify({ accepted: true }), { status: 202, headers: JSON_HEADERS });
    }

    return errorResponse(404, "not_found", "No such route.");
  };
}
