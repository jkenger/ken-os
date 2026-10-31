import { NextResponse } from "next/server";
import { Resend } from "resend";
import { db } from "@/lib/db";
import { users } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { handleInboundEmail } from "@/features/jobs/inbound";
import { saveInboundEmail, savePostings } from "@/features/jobs/store";

export const runtime = "nodejs";

// Resend calls this for each forwarded alert email (docs/product/job-finder.md, "Receive"). Resend's inbound
// receiving is in private alpha as of this writing; this route is unexercised against real traffic until that
// access is granted and RESEND_API_KEY / RESEND_WEBHOOK_SECRET are configured.
export async function POST(request: Request) {
  const webhookSecret = process.env.RESEND_WEBHOOK_SECRET;
  const apiKey = process.env.RESEND_API_KEY;
  const ownerEmail = process.env.OWNER_EMAIL;
  if (!webhookSecret || !apiKey || !ownerEmail) {
    console.error("jobs inbound webhook: Resend or owner-account environment variables are not configured");
    return NextResponse.json({ error: "Not configured" }, { status: 503 });
  }

  const rawBody = await request.text();
  const svixId = request.headers.get("svix-id") ?? "";
  const svixTimestamp = request.headers.get("svix-timestamp") ?? "";
  const svixSignature = request.headers.get("svix-signature") ?? "";

  const [owner] = await db().select({ id: users.id }).from(users).where(eq(users.email, ownerEmail)).limit(1);
  if (!owner) {
    console.error("jobs inbound webhook: no user row for the configured owner account");
    return NextResponse.json({ error: "Not configured" }, { status: 503 });
  }

  const resend = new Resend(apiKey);

  const result = await handleInboundEmail({
    svixId,
    svixTimestamp,
    svixSignature,
    rawBody,
    webhookSecret,
    fetchEmail: async (emailId) => {
      const { data, error } = await resend.emails.receiving.get(emailId as string);
      if (error || !data) throw new Error(error?.message ?? "Couldn't fetch the received email");
      return { from: data.from, html: data.html, text: data.text };
    },
    saveInboundEmail: (params) => saveInboundEmail({ userId: owner.id, ...params }),
    savePostings: (postings) => savePostings(owner.id, postings),
  });

  if (!result.stored) return NextResponse.json({ error: result.reason }, { status: 401 });
  return NextResponse.json({ ok: true });
}
