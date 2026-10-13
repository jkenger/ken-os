import type { Metadata } from "next";
import { Geist_Mono, Public_Sans, DM_Sans } from "next/font/google";
import { cn } from "cn";
import "./globals.css";

const dmSansHeading = DM_Sans({ subsets: ["latin"], variable: "--font-heading" });

// Fonts from the shadcn preset (Luma). Ken OS does not switch themes yet, so the scratch app's ThemeProvider is left out.
const publicSans = Public_Sans({ subsets: ["latin"], variable: "--font-sans" });

const fontMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: "Ken OS",
  description: "A private developer workspace",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={cn("antialiased", fontMono.variable, "font-sans", publicSans.variable, dmSansHeading.variable)}
    >
      <body>{children}</body>
    </html>
  );
}
