import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import { Zap } from "lucide-react";
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
  title: "AIfficiency — AI Cost-Efficiency Rankings",
  description:
    "Compare AI models across benchmarks and OpenRouter pricing to find the most cost-efficient option.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground font-sans">
        <header className="border-b border-neutral-200 dark:border-neutral-800">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex h-14 items-center justify-between">
              <Link
                href="/"
                className="flex items-center gap-2 font-semibold tracking-tight"
              >
                <Zap className="h-5 w-5 text-amber-500" />
                AIfficiency
              </Link>
              <nav className="flex items-center gap-6 text-sm font-medium">
                <Link
                  href="/"
                  className="hover:text-amber-600 dark:hover:text-amber-400"
                >
                  Rankings
                </Link>
                <Link
                  href="/compare"
                  className="hover:text-amber-600 dark:hover:text-amber-400"
                >
                  Compare
                </Link>
                <Link
                  href="/sources"
                  className="hover:text-amber-600 dark:hover:text-amber-400"
                >
                  Sources
                </Link>
              </nav>
            </div>
          </div>
        </header>
        <main className="flex-1">{children}</main>
        <footer className="border-t border-neutral-200 py-6 dark:border-neutral-800">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col items-center gap-2 text-center text-sm text-neutral-500">
              <p>
                A non-commercial project ·{" "}
                <Link href="/sources" className="hover:text-amber-600 dark:hover:text-amber-400">
                  Data sources &amp; licenses
                </Link>
              </p>
              <p className="text-xs">
                OpenRouter (pricing) · SWE-bench Verified (CC BY-NC) · Aider
                Polyglot (Apache-2.0) · LM Arena Elo (via OpenRouter)
              </p>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
