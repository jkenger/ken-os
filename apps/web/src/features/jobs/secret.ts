import { timingSafeEqual } from "node:crypto";

/** Constant-time comparison for the jobs scheduler's shared secret (`JOBS_CHECK_SECRET`), the same pattern as
 *  `lib/auth/oauth-relay.ts`'s state signature check: a length mismatch is rejected before `timingSafeEqual` so a
 *  wrong-length guess doesn't throw, and a same-length wrong guess takes the same time as a right one to reject. */
export function secretsMatch(given: string, expected: string): boolean {
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}
