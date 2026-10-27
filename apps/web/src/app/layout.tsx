import type { Metadata } from "next";
import { Geist_Mono, Instrument_Sans } from "next/font/google";
import { cn } from "cn";
import { InlineScript } from "@/components/inline-script";
import "./globals.css";

// One face for the whole console (DESIGN.md): Instrument Sans for headings and text, loaded once and named twice so
// shadcn's font-heading and font-sans both reach it; Geist Mono for figures.
const instrumentSans = Instrument_Sans({ subsets: ["latin"], variable: "--font-sans" });

const fontMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
});

// Light or dark follows the system setting; KEOS has no theme switch. The script runs in <head> before the first paint
// (node_modules/next/dist/docs/01-app/02-guides/preventing-flash-before-hydration.md) and keeps following the setting
// while the page is open. Sonner's toasts read the same setting, so they match without a ThemeProvider.
const systemTheme = `(function(){try{var m=window.matchMedia("(prefers-color-scheme: dark)");var a=function(){document.documentElement.classList.toggle("dark",m.matches)};a();m.addEventListener("change",a)}catch(e){}})()`;

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
        <InlineScript html={systemTheme} />
      </head>
      <body>{children}</body>
    </html>
  );
}
