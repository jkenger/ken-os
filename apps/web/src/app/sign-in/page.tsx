import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { SignInCard } from "@/components/sign-in-card";
import { signInNotice, signInNotices } from "@/lib/auth-errors";
import { signInSetupGap } from "@/lib/config";
import { getSession, safeNext } from "@/lib/session";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Sign in · Loots" };

type Query = { next?: string; error?: string; expired?: string; signed_out?: string };

const one = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const raw = await searchParams;
  const query: Query = {
    next: one(raw.next),
    error: one(raw.error),
    expired: one(raw.expired),
    signed_out: one(raw.signed_out),
  };
  const next = safeNext(query.next);
  if (await getSession()) redirect(next);

  const gap = signInSetupGap();
  if (gap) {
    const hint =
      process.env.NODE_ENV === "development" ? `Set ${gap} in apps/web/.env, then restart the dev server` : null;
    return (
      <Frame>
        <SignInCard href="/api/auth/google" notice={signInNotices.notSetUp} setupHint={hint} disabled />
      </Frame>
    );
  }
  const params = new URLSearchParams({ next });
  return (
    <Frame>
      <SignInCard href={`/api/auth/google?${params}`} notice={signInNotice(query)} />
    </Frame>
  );
}

function Frame({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-svh w-full items-center justify-center bg-muted p-6 md:p-10">
      <div className="w-full max-w-sm">{children}</div>
    </main>
  );
}
