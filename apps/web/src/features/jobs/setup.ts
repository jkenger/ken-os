// Jobs setup checklist (docs/product/job-finder.md): the forwarding address, the Gmail filter and each
// site's alerts. Only the address has a state the app can know; the rest happen outside Loots.

export type ForwardingAddressStatus = { configured: true; address: string } | { configured: false };

export function forwardingAddressStatus(address: string | undefined): ForwardingAddressStatus {
  const trimmed = address?.trim();
  return trimmed ? { configured: true, address: trimmed } : { configured: false };
}

export type SetupStep = { id: string; title: string; detail: string; href: string };

export const SETUP_STEPS: SetupStep[] = [
  {
    id: "gmail-filter",
    title: "Add the Gmail filter",
    detail: "Create a filter where From has linkedin.com or indeed.com, then forward it to the address above.",
    href: "https://mail.google.com/mail/u/0/#settings/filters",
  },
  {
    id: "linkedin-alerts",
    title: "Set up LinkedIn alerts",
    detail: "Set the alert frequency to the most frequent option LinkedIn offers.",
    href: "https://www.linkedin.com/jobs/alerts/",
  },
  {
    id: "indeed-alerts",
    title: "Set up Indeed alerts",
    detail: "Set the alert frequency to the most frequent option Indeed offers.",
    href: "https://www.indeed.com/alerts",
  },
  {
    id: "onlinejobs-alerts",
    title: "Set up OnlineJobs alerts",
    detail: "Sign in and turn on Job alerts, if OnlineJobs sends them by email.",
    href: "https://v2.onlinejobs.ph/jobseeker/job-alerts",
  },
];
