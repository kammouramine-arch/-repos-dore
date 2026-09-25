// Local development server for the gateway (the same handler the Edge Function runs).
//   ANTHROPIC_API_KEY=… DOONCE_AUTH_MODE=dev npm run dev
import { createServer } from "node:http";
import Anthropic from "@anthropic-ai/sdk";
import { makeHandler } from "../../supabase/functions/_shared/http.ts";
import { AppleTokenVerifier, DevTokenVerifier } from "../../supabase/functions/_shared/auth.ts";

const port = Number(process.env.PORT ?? 8787);
const authMode = process.env.DOONCE_AUTH_MODE ?? "apple";
const handler = makeHandler({
  anthropic: new Anthropic(),
  model: process.env.DOONCE_MODEL || undefined,
  verifier: authMode === "dev" ? new DevTokenVerifier() : new AppleTokenVerifier(process.env.DOONCE_APPLE_AUDIENCE ?? "app.doonce.ios"),
  log: (event, data) => console.log(JSON.stringify({ event, ...data })),
});

createServer(async (req, res) => {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(chunk as Buffer);
  const body = Buffer.concat(chunks);
  const request = new Request(`http://localhost:${port}${req.url ?? "/"}`, {
    method: req.method,
    headers: Object.entries(req.headers).filter(([, v]) => typeof v === "string") as [string, string][],
    body: body.length ? body : undefined,
  });
  const response = await handler(request);
  res.writeHead(response.status, Object.fromEntries(response.headers));
  res.end(Buffer.from(await response.arrayBuffer()));
}).listen(port, () => console.log(`doonce-gateway listening on http://localhost:${port} (auth: ${authMode})`));
