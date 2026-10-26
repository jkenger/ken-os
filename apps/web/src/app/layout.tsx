import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { cn } from "cn";
import { InlineScript } from "@/components/inline-script";
import "./globals.css";

// One face for the whole console (DESIGN.md): Geist for headings and text, Geist Mono for figures.
const geistHeading = Geist({ subsets: ["latin"], variable: "--font-heading" });
const geistSans = Geist({ subsets: ["latin"], variable: "--font-sans" });

const fontMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
});

// Light or dark follows the system setting; Loots has no theme switch. The script runs in <head> before the first paint
// (node_modules/next/dist/docs/01-app/02-guides/preventing-flash-before-hydration.md) and keeps following the setting
// while the page is open. Sonner's toasts read the same setting, so they match without a ThemeProvider.
const systemTheme = `(function(){try{var m=window.matchMedia("(prefers-color-scheme: dark)");var a=function(){document.documentElement.classList.toggle("dark",m.matches)};a();m.addEventListener("change",a)}catch(e){}})()`;

export const metadata: Metadata = {
  title: "Loots",
  description: "A private developer workspace",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={cn("antialiased", fontMono.variable, "font-sans", geistSans.variable, geistHeading.variable)}
    >
      <head>
        <InlineScript html={systemTheme} />
      </head>
      <body>{children}</body>
    </html>
  );
}
