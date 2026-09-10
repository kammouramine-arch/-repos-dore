/** Public provenance only. Never expose arbitrary environment values. */
export function releaseCommit(environment: Record<string, string | undefined> = process.env): string | null {
  const value = environment.VERCEL_GIT_COMMIT_SHA ?? environment.RELEASE_GIT_SHA;
  return value && /^[a-f0-9]{40}$/i.test(value) ? value.toLowerCase() : null;
}
