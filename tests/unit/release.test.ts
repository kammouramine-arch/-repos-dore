import { describe, expect, it } from 'vitest';
import { releaseCommit } from '@/lib/release';

describe('public release provenance', () => {
  it('reports the hosting commit, not a stale override', () => {
    expect(releaseCommit({ VERCEL_GIT_COMMIT_SHA: 'A'.repeat(40), RELEASE_GIT_SHA: 'b'.repeat(40) })).toBe('a'.repeat(40));
  });
  it('reports unknown instead of inventing provenance', () => expect(releaseCommit({})).toBeNull());
  it('never exposes arbitrary environment content', () => {
    for (const value of ['secret-value', 'https://user:password@example.com', 'abc123']) {
      expect(releaseCommit({ VERCEL_GIT_COMMIT_SHA: value })).toBeNull();
    }
  });
});
