import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import SidebarNavigation from "@/components/sidebar-navigation";
import SessionWatchdog from "@/components/session-watchdog";
import "./globals.css";

// ── Typography Setup ──────────────────────────────────────────────────────────
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

// ── Mobile Responsive Viewport (<576px, 576px - 991px, >=992px) ──────────────
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
        className={`${geistSans.variable} ${geistMono.variable} min-h-full font-sans text-sm bg-[#e0e5ec] text-[#2d3440] antialiased selection:bg-almond-silk selection:text-terracotta-clay`}
      >
        {/* Responsive App Shell: Kolom di HP/Tablet (<1024px), Baris di Laptop/Desktop (>=1024px) */}
        <div className="relative flex min-h-screen w-full flex-col bg-[#e0e5ec] lg:flex-row">
          <SidebarNavigation />
          
          {/* Main Area: fluid width otomatis melebar mengikuti status Sidebar (flex-1) */}
          <main className="relative flex-1 min-w-0 w-full overflow-y-auto bg-[#e0e5ec] transition-all duration-300 ease-in-out p-3 sm:p-4 lg:p-5">
            {children}
          </main>

          <SessionWatchdog idleMinutes={30} warningSeconds={60} />
        </div>
      </body>
    </html>
  );
}

