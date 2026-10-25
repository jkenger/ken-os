/**
 * Every sign-in outcome the app can show, keyed by the code in the URL. Pages map codes to this
 * text and never show raw text from a URL. See docs/architecture/auth-sign-in.md §2 and §4.
 */

export const signInErrorCodes = ["cancelled", "expired", "wrong_account", "unverified", "google"] as const;
export type SignInErrorCode = (typeof signInErrorCodes)[number];

export interface SignInNotice {
  text: string;
  variant: "default" | "destructive";
  /** `another` swaps Continue with Google for Use another account. */
  action: "continue" | "another";
}

const signInErrors: Record<SignInErrorCode, SignInNotice> = {
  cancelled: { text: "Sign-in cancelled", variant: "default", action: "continue" },
  expired: { text: "Sign-in expired. Try again", variant: "default", action: "continue" },
  wrong_account: { text: "This Google account doesn't have access", variant: "destructive", action: "another" },
  unverified: { text: "This Google account's email isn't verified", variant: "destructive", action: "another" },
  google: { text: "Google sign-in failed. Try again", variant: "destructive", action: "continue" },
};

export const signInNotices = {
  signedOut: { text: "Signed out", variant: "default", action: "continue" },
  expired: { text: "Session ended. Sign in again", variant: "default", action: "continue" },
  notSetUp: { text: "Sign-in isn't set up", variant: "destructive", action: "continue" },
} as const satisfies Record<string, SignInNotice>;

const isOneOf = <T extends string>(codes: readonly T[], value: unknown): value is T =>
  typeof value === "string" && (codes as readonly string[]).includes(value);

/** The alert for the sign-in page's query, or null for the plain page. An unknown error code reads as a Google failure. */
export function signInNotice(query: { error?: string; expired?: string; signed_out?: string }): SignInNotice | null {
  if (query.error !== undefined) return signInErrors[isOneOf(signInErrorCodes, query.error) ? query.error : "google"];
  if (query.expired === "1") return signInNotices.expired;
  if (query.signed_out === "1") return signInNotices.signedOut;
  return null;
}
