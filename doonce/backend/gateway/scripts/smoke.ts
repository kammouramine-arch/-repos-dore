// Live smoke test against the real model. Needs credentials (ANTHROPIC_API_KEY or `ant auth login`).
//   npm run smoke
// Prints the validated procedure for the sample boiler demonstration and the adjustments applied.
import Anthropic from "@anthropic-ai/sdk";
import { analyze } from "../../supabase/functions/_shared/analyze.ts";
import { boilerRequest } from "../test/fixtures.ts";

const result = await analyze(boilerRequest, { client: new Anthropic(), log: (e, d) => console.error(e, d) });
console.log(JSON.stringify(result.response, null, 2));
console.error("adjustments:", result.adjustments);
