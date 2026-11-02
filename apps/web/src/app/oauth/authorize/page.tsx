import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ConsentCard, ConsentProblem } from "@/components/connector/consent";
import { checkAuthorization } from "@/features/connector/oauth-store";
import { hostOf, redirectWith, type AuthorizeQuery } from "@/features/connector/rules";
import { appUrl } from "@/lib/config";
import { requireSession } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Connect Claude · Loots" };

const FIELDS = [
  "response_type",
  "client_id",
  "redirect_uri",
  "code_challenge",
  "code_challenge_method",
  "state",
  "scope",
  "resource",
] as const;

/** The consent page Claude sends the owner to. Signed out, it goes through sign-in and comes back here. */
export default async function AuthorizePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const raw = await searchParams;
  const query: AuthorizeQuery = {};
  for (const field of FIELDS) {
    const value = raw[field];
    if (typeof value === "string") query[field] = value;
  }
  await requireSession("/oauth/authorize", query as Record<string, string | undefined>);
  const checked = await checkAuthorization(query, appUrl());
  if ("redirect" in checked) {
    redirect(
      redirectWith(checked.redirect, {
        error: checked.error,
        error_description: checked.description,
        state: checked.state,
        iss: appUrl(),
      }),
    );
  }
  return (
    <main className="flex min-h-svh w-full items-center justify-center bg-muted p-6 md:p-10">
      <div className="w-full max-w-sm">
        {"fatal" in checked ? (
          <ConsentProblem message={checked.fatal} />
        ) : (
          <ConsentCard
            appName={checked.ok.client.name}
            appHost={hostOf(
              checked.ok.client.id.startsWith("https://") ? checked.ok.client.id : checked.ok.redirectUri,
            )}
            redirectHost={hostOf(checked.ok.redirectUri)}
            query={query}
          />
        )}
      </div>
    </main>
  );
}
