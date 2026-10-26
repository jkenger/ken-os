"use client";

// A script that runs once, as the browser parses the server's HTML, and is inert on the client. React warns in
// development when a client render produces a <script>, so the client renders it as text/plain; the server's copy is
// already in the page and has already run. suppressHydrationWarning accepts the type mismatch.
// (node_modules/next/dist/docs/01-app/02-guides/preventing-flash-before-hydration.md, "Extracting a reusable component")
export function InlineScript({ html }: { html: string }) {
  return (
    <script
      type={typeof window === "undefined" ? "text/javascript" : "text/plain"}
      suppressHydrationWarning
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
