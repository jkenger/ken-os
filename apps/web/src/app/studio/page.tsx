import { StudioWorkspace } from "@/components/design-studio/studio-workspace";
import { listDrafts } from "@/features/design-studio/drafts-store";
import { studioManifest } from "@/features/design-studio/manifest.generated";
import { requireSession } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export default async function Studio({ searchParams }: { searchParams: Promise<{ c?: string | string[] }> }) {
  const session = await requireSession("/studio");
  const [{ c }, drafts] = await Promise.all([searchParams, listDrafts(session.userId)]);
  return (
    <StudioWorkspace
      email={session.email}
      manifest={studioManifest}
      selected={typeof c === "string" ? c : ""}
      initialDrafts={drafts}
    />
  );
}
