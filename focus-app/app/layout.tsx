import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
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
    icon: "/icon.png",
    apple: "/apple-icon.png",
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
        {children}
        <Analytics />
      </body>
    </html>
  );
}
