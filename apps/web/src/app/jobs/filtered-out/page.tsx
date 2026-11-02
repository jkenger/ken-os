import { JobsFilteredOutPage } from "@/components/jobs/filtered-out-page";
import { listPostings } from "@/features/jobs/store";
import { requireSession } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export default async function JobsFilteredOut() {
  const session = await requireSession("/jobs/filtered-out");
  const postings = await listPostings(session.userId, "filtered_out");
  return <JobsFilteredOutPage email={session.email} postings={postings} />;
}
