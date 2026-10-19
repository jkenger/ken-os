import { StudioWorkspace } from "@/components/design-studio/studio-workspace";
import { studioManifest } from "@/features/design-studio/manifest.generated";
import { requireSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function Studio({ searchParams }: { searchParams: Promise<{ c?: string | string[] }> }) {
  const session = await requireSession("/studio");
  const { c } = await searchParams;
  return <StudioWorkspace email={session.email} manifest={studioManifest} selected={typeof c === "string" ? c : ""} />;
}
