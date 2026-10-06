import { redirectFromLab } from "@/features/engineering-lab/legacy-redirect";

// Moved to Engineering. See docs/architecture/engineering-redesign.md, section 3.
export default async function LegacyLabPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  return redirectFromLab("/lab/assessment", searchParams);
}
