import { JobsPage } from "@/components/jobs/jobs-page";
import { listPostings } from "@/features/jobs/store";
import { requireSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function Jobs() {
  const session = await requireSession("/jobs");
  const postings = await listPostings(session.userId, "new");
  return <JobsPage email={session.email} forwardingAddress={process.env.JOBS_INBOUND_ADDRESS} postings={postings} />;
}
