# Restricted Sandbox reset

No public/admin HTTP endpoint is provided. This is an operator-only Node script:
`node scripts/reset-disposable-sandbox.mjs`.

Supply DATABASE_URL through a private authenticated environment, never in chat.
Set RESET_SANDBOX_WORKSPACE and RESET_SANDBOX_TRANSACTION to exact reviewed values.
Set RESET_SANDBOX_PROVENANCE and RESET_SANDBOX_APPROVAL to the evidence/approval
references. The default is dry run. Execution additionally requires
RESET_SANDBOX_EXECUTE=YES_ARCHIVE_SANDBOX_ONLY.

The script locks the row, requires provider apple and environment exactly Sandbox,
rechecks transaction identity, refuses any customer or quote (even soft-deleted),
and requires recorded approval/provenance. It archives the old subscription in a
restricted audit record atomically with removing the Sandbox binding and expiring
the test entitlement. It never deletes users/workspaces or transfers ownership.
Use a separately reviewed restoration of the audit snapshot for rollback.
Production/unknown environments are rejected. Credentials must not be exposed.

Positive test provenance must be established by the operator; a random-looking
email or Sandbox status is not evidence. Never invent an evidence reference to
bypass this check. No reset was executed in this pass.

## Current disputed workspace

Read-only audit found signup on 2026-09-05 16:35:19.985 (database timestamp), client
creation about ten minutes later, quote creation then three quote.sent events.
The quote is ENVOYE. Audit metadata does not identify an automated probe. A source
search found no matching fixture. This does not establish legitimate ownership
either, but it does not satisfy the user's conditional disposable-test approval.
The script deliberately refuses this workspace because business records exist.
Resolve through account/support provenance, not automated deletion or transfer.
