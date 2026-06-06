import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import { Geist, Geist_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { GoogleAnalytics } from "@/components/GoogleAnalytics";
import { GoogleAnalyticsPageView } from "@/components/GoogleAnalyticsPageView";
import { PostHogPageView } from "@/components/PostHogPageView";
import { PostHogProvider } from "@/components/PostHogProvider";
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
  title: "Deep Focus",
  description:
    "ポモドーロ＋軽量タスク管理＋集中音で没入できる集中アプリ",
  applicationName: "Deep Focus",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Deep Focus",
  },
  formatDetection: {
    telephone: false,
    email: false,
  },
  openGraph: {
    title: "Deep Focus",
    description:
      "ポモドーロ＋軽量タスク管理＋集中音で没入できる集中アプリ",
  },
  icons: {
    icon: "/icon.png?v=20260606",
    apple: "/apple-icon.png?v=20260606",
    shortcut: "/favicon.ico",
  },
};

export const viewport: Viewport = {
  themeColor: "#0b0f14",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <GoogleAnalytics />
        <Suspense fallback={null}>
          <GoogleAnalyticsPageView />
        </Suspense>
        <PostHogProvider>
          <Suspense fallback={null}>
            <PostHogPageView />
          </Suspense>
          {children}
        </PostHogProvider>
        <Analytics />
      </body>
    </html>
  );
}
