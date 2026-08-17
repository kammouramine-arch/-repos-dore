"use server";

import { revalidatePath } from "next/cache";
import { runAgent } from "@/lib/agent";

export type AgentFormState = {
  ok: boolean;
  message: string;
  runId?: string;
};

/**
 * Lance l'agent depuis l'interface.
 *
 * L'auto-approbation n'est JAMAIS activee ici : toute action classee
 * APPROVAL_REQUIRED s'arrete et remonte dans « Ce qu'il me faut de vous ».
 */
export async function runAgentAction(
  _prev: AgentFormState,
  formData: FormData,
): Promise<AgentFormState> {
  const instruction = String(formData.get("instruction") ?? "").trim();
  if (instruction.length < 3) {
    return { ok: false, message: "Écrivez une instruction (3 caractères minimum)." };
  }

  try {
    const result = await runAgent(instruction, { autoApprove: false });
    revalidatePath("/agent");
    revalidatePath("/");
    return { ok: result.status !== "FAILED", message: result.summary, runId: result.runId };
  } catch (error) {
    return {
      ok: false,
      message: `L'agent s'est arrêté : ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}
