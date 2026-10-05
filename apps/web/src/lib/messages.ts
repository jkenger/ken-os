/** Server errors repeated across routes. Wording follows docs/product/app-language.md: what failed, then what to do. */
export const messages = {
  invalidOrigin: "Couldn't verify the request. Reload the page",
  signedOut: "Signed out. Sign in again",
  invalidJson: "Couldn't read the request. Reload the page",
} as const;
