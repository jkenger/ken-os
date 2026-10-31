export type AlertSource = "linkedin" | "indeed";

// The addresses LinkedIn and Indeed send job alert emails from. An email whose original sender doesn't match one of
// these is rejected and stored nowhere (docs/product/job-finder.md). Checked against the end of the address so a
// lookalike domain ("linkedin.com.evil.test") never matches.
const KNOWN_ALERT_SENDERS: { source: AlertSource; domain: RegExp }[] = [
  { source: "linkedin", domain: /(^|\.)linkedin\.com$/i },
  { source: "indeed", domain: /(^|\.)indeed\.com$/i },
];

export function knownAlertSource(fromAddress: string): AlertSource | null {
  const domain = fromAddress.split("@")[1];
  if (!domain) return null;
  return KNOWN_ALERT_SENDERS.find((entry) => entry.domain.test(domain))?.source ?? null;
}
