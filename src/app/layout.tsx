import type { Metadata } from "next";
import { Hanken_Grotesk, Newsreader } from "next/font/google";
import "./globals.css";

const serif = Newsreader({ subsets: ["latin"], variable: "--font-newsreader", style: ["normal", "italic"] });
const sans = Hanken_Grotesk({ subsets: ["latin"], variable: "--font-hanken" });

export const metadata: Metadata = {
  title: "Case Partner",
  description: "An AI interviewer for consulting case practice. It holds back the data until you ask, shows each exhibit when it's time, and tells you whether you would have advanced.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${serif.variable} ${sans.variable}`}>
      <body className="min-h-dvh">{children}</body>
    </html>
  );
}
