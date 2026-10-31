import { JobsPage } from "@/components/jobs/jobs-page";
import { getProfile } from "@/features/profile/store";
import { suggestPayBand } from "@/features/jobs/pay-band-suggestion";
import { hasSavedPreferences } from "@/features/jobs/preferences-store";
import { deriveRoles } from "@/features/jobs/roles";
import { listPostings } from "@/features/jobs/store";
import { targetCountryFrom } from "@/features/jobs/target-country";
import { requireSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function Jobs() {
  const session = await requireSession("/jobs");
  const [profile, postings, preferencesSaved] = await Promise.all([
    getProfile(session.userId),
    listPostings(session.userId, "new"),
    hasSavedPreferences(session.userId),
  ]);
  const payBandSuggestion = suggestPayBand(targetCountryFrom(profile.details.contact.country), preferencesSaved);
  return (
    <JobsPage
      email={session.email}
      roles={deriveRoles(profile.details)}
      postings={postings}
      payBandSuggestion={payBandSuggestion}
    />
  );
}
