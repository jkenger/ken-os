import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { cn } from "cn";
import "./globals.css";

// The shadcn default font setup (Nova). Ken OS does not switch themes yet, so the scratch app's ThemeProvider is left out.
const geist = Geist({ subsets: ["latin"], variable: "--font-sans" });

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
    <html lang="en" className={cn("antialiased", fontMono.variable, "font-sans", geist.variable)}>
      <body>{children}</body>
    </html>
  );
}
