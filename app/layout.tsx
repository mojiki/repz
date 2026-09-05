import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "repz",
  description: "筋トレ記録アプリ",
};

export const viewport: Viewport = {
  themeColor: "#0b0f14",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="ja"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <header className="sticky top-0 z-10 border-b border-border bg-background/90 backdrop-blur">
          <div className="mx-auto flex max-w-md items-center justify-between px-4 py-3">
            <Link href="/" className="text-xl font-black tracking-tight">
              <span className="text-primary">r</span>epz
            </Link>
            <nav className="flex items-center gap-4 text-sm text-muted">
              <Link href="/help">使い方</Link>
              <Link href="/settings">設定</Link>
            </nav>
          </div>
        </header>
        <main className="mx-auto w-full max-w-md flex-1 px-4 py-4">{children}</main>
      </body>
    </html>
  );
}
