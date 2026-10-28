import type { Metadata } from "next";
import { Geist_Mono, Instrument_Sans } from "next/font/google";
import { cn } from "cn";
import { InlineScript } from "@/components/inline-script";
import { themeScript } from "@/lib/theme";
import "./globals.css";

// One face for the whole console (DESIGN.md): Instrument Sans for headings and text, loaded once and named twice so
// shadcn's font-heading and font-sans both reach it; Geist Mono for figures.
const instrumentSans = Instrument_Sans({ subsets: ["latin"], variable: "--font-sans" });

const fontMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
});

// Light, dark or system, picked in the account menu (src/lib/theme.ts). The script runs in <head> before the first
// paint (node_modules/next/dist/docs/01-app/02-guides/preventing-flash-before-hydration.md) and keeps following the
// system setting while the page is open.

export const metadata: Metadata = {
  title: "KEOS",
  description: "A private developer workspace",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={cn(
        "antialiased [--font-heading:var(--font-sans)]",
        fontMono.variable,
        "font-sans",
        instrumentSans.variable,
      )}
    >
      <head>
        <InlineScript html={themeScript} />
      </head>
      <body>{children}</body>
    </html>
  );
}
