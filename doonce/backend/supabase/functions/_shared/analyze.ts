// The analysis handler: request → model → validated response. Runtime-agnostic (Node dev server,
// Supabase Edge Function). The model client is injected so tests run without a key.
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { AnalysisRequest, AnalysisResponse, type AnalysisResponse as AnalysisResponseType } from "./contract.ts";
import { SYSTEM_PROMPT, buildUserContent } from "./prompt.ts";
import { validate, type Adjustment } from "./validate.ts";

export const DEFAULT_MODEL = "claude-opus-5";

export interface AnalyzeDeps {
  client: Anthropic;
  model?: string;
  /** Effort for the model: "high" is the default; "max" when correctness matters more than latency. */
  effort?: "low" | "medium" | "high" | "xhigh" | "max";
  log?: (event: string, data?: Record<string, unknown>) => void;
}

export class AnalyzeError extends Error {
  constructor(public code: "invalid_request" | "refused" | "truncated" | "malformed_model_output" | "model_unavailable", message: string, public status: number) {
    super(message);
  }
}

export interface AnalyzeResult {
  response: AnalysisResponseType;
  adjustments: Adjustment[];
  usage: { inputTokens: number; outputTokens: number; model: string };
}

export async function analyze(rawRequest: unknown, deps: AnalyzeDeps): Promise<AnalyzeResult> {
  const parsed = AnalysisRequest.safeParse(rawRequest);
  if (!parsed.success) throw new AnalyzeError("invalid_request", parsed.error.issues.map((i: { path: PropertyKey[]; message: string }) => `${i.path.join(".")}: ${i.message}`).join("; "), 400);
  const request = parsed.data;
  if (request.transcript.segments.length === 0 && request.keyFrames.length === 0) {
    throw new AnalyzeError("invalid_request", "Nothing to analyse: the recording has no transcript and no frames.", 400);
  }

  const started = Date.now();
  let message: Anthropic.Beta.Messages.BetaMessage;
  try {
    // Streaming so a long, frame-heavy request never trips an HTTP timeout; server-side fallbacks so
    // a safety-classifier decline is retried on a fallback model inside the same call.
    const stream = deps.client.beta.messages.stream({
      model: deps.model ?? DEFAULT_MODEL,
      max_tokens: 16000,
      thinking: { type: "adaptive" },
      output_config: { effort: deps.effort ?? "high", format: zodOutputFormat(AnalysisResponse) },
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      system: [{ type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } }],
      messages: [{ role: "user", content: buildUserContent(request) }],
    });
    message = await stream.finalMessage();
  } catch (error: unknown) {
    if (error instanceof Anthropic.APIConnectionError || (error instanceof Anthropic.APIError && (error.status ?? 500) >= 500) || error instanceof Anthropic.RateLimitError) {
      throw new AnalyzeError("model_unavailable", "The analysis service is temporarily unavailable.", 503);
    }
    throw error;
  }

  if (message.stop_reason === "refusal") throw new AnalyzeError("refused", "The demonstration could not be analysed.", 422);
  if (message.stop_reason === "max_tokens") throw new AnalyzeError("truncated", "The analysis was cut short; try a shorter recording.", 502);

  const text = message.content.filter((b): b is Anthropic.Beta.Messages.BetaTextBlock => b.type === "text").map((b) => b.text).join("");
  let candidate: unknown;
  try {
    candidate = JSON.parse(text);
  } catch {
    throw new AnalyzeError("malformed_model_output", "The model did not return a procedure.", 502);
  }
  const shaped = AnalysisResponse.safeParse(candidate);
  if (!shaped.success) throw new AnalyzeError("malformed_model_output", "The model output did not match the contract.", 502);

  const { response, adjustments } = validate(shaped.data, request);
  deps.log?.("analyze.done", {
    recordingID: request.recordingID,
    ms: Date.now() - started,
    model: message.model,
    steps: response.steps.length,
    adjustments: adjustments.length,
    inputTokens: message.usage.input_tokens,
    outputTokens: message.usage.output_tokens,
  });
  return { response, adjustments, usage: { inputTokens: message.usage.input_tokens, outputTokens: message.usage.output_tokens, model: message.model } };
}
