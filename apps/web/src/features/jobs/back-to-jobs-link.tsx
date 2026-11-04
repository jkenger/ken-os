"use client";

import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

/** `router.back()` instead of `<Link href="/jobs">`: a browser back navigation reuses Next's client cache for the
 *  page it's returning to, restoring the New list's loaded items and scroll position; a fresh `<Link>` push
 *  always remounts the page (docs/glossary.md, "Client Cache": "Pages are not cached by default but are reused
 *  during browser back/forward navigation."). */
export function BackToJobsLink() {
  const router = useRouter();
  return (
    <Button
      type="button"
      variant="ghost"
      onClick={() => router.back()}
      className="mb-4 h-auto gap-1 rounded-none p-0 text-sm text-muted-foreground hover:bg-transparent hover:text-foreground"
    >
      <ArrowLeft className="size-3.5" />
      New
    </Button>
  );
}
