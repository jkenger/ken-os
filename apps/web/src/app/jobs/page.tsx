import { JobsPage } from "@/components/jobs/jobs-page";
import { requireSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function Jobs() {
  const session = await requireSession("/jobs");
  return <JobsPage email={session.email} forwardingAddress={process.env.JOBS_INBOUND_ADDRESS} />;
}
