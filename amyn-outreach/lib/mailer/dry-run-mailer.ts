import type { Mailer, OutboundEmail, SendResult } from "./types";

/**
 * Transport de simulation. C'est le SEUL transport existant au lot 1.
 *
 * Il n'ouvre aucune connexion reseau, ne contacte aucun serveur mail et ne
 * peut, par construction, envoyer aucun email. Il se contente de decrire ce
 * qui serait parti.
 */
export class DryRunMailer implements Mailer {
  readonly name = "dry-run";
  readonly canDeliver = false;

  async verify(): Promise<void> {
    // Rien a verifier : aucune connexion, aucun identifiant.
  }

  async send(email: OutboundEmail): Promise<SendResult> {
    console.info(
      [
        "",
        "┌─ [DRY RUN] Email SIMULÉ — rien n'a été envoyé ─────────────",
        `│ À        : ${email.to}`,
        `│ Objet    : ${email.subject}`,
        `│ Corps    : ${email.text.length} caractères`,
        "└────────────────────────────────────────────────────────────",
      ].join("\n"),
    );

    return {
      delivered: false,
      status: "SIMULATED",
      transport: this.name,
      dryRun: true,
      providerMessageId: `dryrun-${Date.now()}`,
    };
  }
}
