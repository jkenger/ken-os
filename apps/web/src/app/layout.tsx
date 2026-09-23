import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Ken OS",
  description: "A private developer workspace",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
