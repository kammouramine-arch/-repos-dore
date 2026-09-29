// Supabase Edge Function: POST /v1/analyze and DELETE /v1/account behind Sign in with Apple.
// Deployed with verify_jwt = false (supabase/config.toml, --no-verify-jwt): the platform's check only
// accepts Supabase JWTs, and this function verifies the Apple identity token itself. Supabase passes
// the path with the function name in front (/doonce-analyze/v1/analyze); makeHandler strips it.
// Secrets live in the function's environment (supabase secrets set), never in the app.
//   ANTHROPIC_API_KEY        model access (required)
//   DOONCE_APPLE_AUDIENCE    the app's bundle identifier, e.g. app.doonce.ios (required)
//   DOONCE_MODEL             optional override of the default model
//   DOONCE_AUTH_MODE         "apple" (default) or "dev" (accepts any bearer; never in production)
import Anthropic from "@anthropic-ai/sdk";
import { makeHandler } from "../_shared/http.ts";
import { AppleTokenVerifier, DevTokenVerifier } from "../_shared/auth.ts";

declare const Deno: { env: { get(name: string): string | undefined }; serve(handler: (request: Request) => Promise<Response>): void };

const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not set for doonce-analyze");
const audience = Deno.env.get("DOONCE_APPLE_AUDIENCE") ?? "app.doonce.ios";
const authMode = Deno.env.get("DOONCE_AUTH_MODE") ?? "apple";

const handler = makeHandler({
  anthropic: new Anthropic({ apiKey }),
  model: Deno.env.get("DOONCE_MODEL") || undefined,
  verifier: authMode === "dev" ? new DevTokenVerifier() : new AppleTokenVerifier(audience),
  log: (event, data) => console.log(JSON.stringify({ event, ...data })),
});

Deno.serve(handler);
