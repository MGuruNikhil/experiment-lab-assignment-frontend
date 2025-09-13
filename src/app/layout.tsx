import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "GoalForge",
    template: "%s — GoalForge",
  },
  description: "Forge your goals into achievements.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="latte">
      <body
  className={`${geistSans.variable} ${geistMono.variable} antialiased bg-ctp-base text-ctp-text`}
      >
  <main className="min-h-dvh p-4 md:p-6 lg:p-8">{children}</main>
      </body>
    </html>
  );
}
