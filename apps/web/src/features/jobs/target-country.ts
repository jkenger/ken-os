const CODE_PATTERN = /^[a-zA-Z]{2}$/;

/** The owner's own country for the Countries filter, read from Profile instead of a separate Jobs setting. A
 *  Profile country that's already a two-letter code is used as-is; anything else (blank, a typed-out name,
 *  anything unparseable) defaults to PH rather than guessing at a free-text match. */
export function targetCountryFrom(profileCountry: string): string {
  const trimmed = profileCountry.trim();
  return CODE_PATTERN.test(trimmed) ? trimmed.toUpperCase() : "PH";
}
