import { redirectFromLab } from "@/features/engineering-lab/legacy-redirect";

// Moved to Engineering. See docs/architecture/engineering-redesign.md, section 3.
export default async function LegacyLabPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  return redirectFromLab(`/lab/topics/${(await params).id}`, searchParams);
}
