import type { Metadata } from "next";
import { Geist_Mono, Public_Sans, Source_Serif_4 } from "next/font/google";
import { cn } from "cn";
import "./globals.css";

// Headings: a text serif with optical sizes, the course-catalog voice (DESIGN.md). Body and mono stay from the preset.
const serifHeading = Source_Serif_4({ subsets: ["latin"], axes: ["opsz"], variable: "--font-heading" });

// Fonts from the shadcn preset (Luma). Loots does not switch themes yet, so the scratch app's ThemeProvider is left out.
const publicSans = Public_Sans({ subsets: ["latin"], variable: "--font-sans" });

const fontMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: "Loots",
  description: "A private developer workspace",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={cn("antialiased", fontMono.variable, "font-sans", publicSans.variable, serifHeading.variable)}
    >
      <body>{children}</body>
    </html>
  );
}
