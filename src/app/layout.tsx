import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import SessionWatchdog from "@/components/session-watchdog";
import "./globals.css";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
  display: "swap",
});

const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
  display: "swap",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
  themeColor: "#e0e5ec",
};

export const metadata: Metadata = {
  title: {
    default: "SarniyaSync | Enterprise POS & Supply Chain",
    template: "%s | SarniyaSync",
  },
  description: "Platform terintegrasi pengelolaan stok terpusat, operasional kasir toko mitra, dan pelaporan penjualan.",
  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" className="h-full scroll-smooth">
      <body
        className={`${geistSans.variable} ${geistMono.variable} flex min-h-screen w-full flex-col font-sans text-sm bg-[#e0e5ec] text-[#2d3440] antialiased selection:bg-almond-silk selection:text-terracotta-clay`}
      >
        {children}
        <SessionWatchdog idleMinutes={30} warningSeconds={60} />
      </body>
    </html>
  );
}

