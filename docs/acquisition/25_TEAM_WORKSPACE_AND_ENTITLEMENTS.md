# Team workspace and subscription entitlements

Status: **IMPLEMENTED IN SOURCE; production database/TestFlight verification still required.**

## Plan matrix

| Plan | AI quote generations / month | Transcriptions / month | Photo analyses / month | Follow-ups / month | Quote sends | Seats | Team invitations | Automations |
|---|---:|---:|---:|---:|---:|---:|---|---|
| Essentiel | 50 | 50 | 25 | 100 | 100 | 1 | No | No |
| Pro | 300 | 300 | 150 | 1,000 | Unlimited | 3 | Yes | Yes |
| Entreprise | 1,000 | 1,000 | 500 | Unlimited | Unlimited | 10 | Yes | Yes |

The source of truth is `packages/shared/src/plans.ts`. Usage counters are organization-scoped, so team members share the workspace allowance rather than receiving a separate allowance per login. Limits are enforced server-side by the AI/usage services; the mobile and web interfaces only explain the current allowance and provide upgrade paths.

## Workspace behavior

- Owners and administrators can invite members from `/app/parametres/equipe`.
- Owners can assign `ADMIN` or `MEMBER`; administrators can invite/remove `MEMBER` only.
- Owners cannot be demoted or removed by the normal member endpoint. Ownership transfer remains a deliberate future workflow.
- Invitations contain a hashed, seven-day token, are single-use, reserve a seat while pending, and are revoked if email delivery fails.
- A recipient can accept while signed in, or create an account from the invitation link. The invitation email address must match the account email.
- Accepting an invitation after a downgrade is blocked when the active seat limit is already full; existing members are not silently removed.
- Resending an invitation rotates its token and restores the previous token if provider delivery fails.
- Every invite, accept, role change, removal, cancellation and resend is recorded in the audit log.

## Data-access boundaries

Business export (`GET /api/organization/export`) is restricted to owners and administrators. Personal export remains available to the authenticated account. Account deletion revokes access and anonymizes personal fields; an owner must transfer workspace ownership before deleting the final owner account. Business records are retained pending a documented legal retention decision.

## Verification still needed

The repository unit suite and production build compile the workspace routes. A PostgreSQL-backed integration run is still required to exercise token expiry, concurrent seat acceptance, role boundaries, deletion and export against real Prisma tables. A real iPhone/TestFlight pass must verify the native session and invitation deep-link handoff.
