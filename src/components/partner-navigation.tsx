"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { createSupabaseBrowserClient } from "@/utils/supabase/client";
import { useSidebar } from "@/context/sidebar-context";
import LogoutModal from "@/components/logout-modal";

const partnerRoutes = {
  dashboard: "/dashboard-mitra",
  katalog: "/partner/katalog",
  stock: "/partner/stok",
  stockOpname: "/partner/stock-opname",
  penerimaan: "/partner/penerimaan",
  kasir: "/partner/kasir",
  transactions: "/partner/transaksi",
  profile: "/profil-mitra",
} as const;

const navigationItems = [
  { label: "Dashboard", href: partnerRoutes.dashboard },
  { label: "Katalog", href: partnerRoutes.katalog },
  { label: "Stok Toko", href: partnerRoutes.stock },
  { label: "Stock Opname", href: partnerRoutes.stockOpname },
  { label: "Penerimaan Paket", href: partnerRoutes.penerimaan },
  { label: "Kasir", href: partnerRoutes.kasir },
  { label: "Riwayat Transaksi", href: partnerRoutes.transactions },
  { label: "Pengaturan", href: partnerRoutes.profile },
];

function getPartnerNavIcon(label: string) {
  const l = label.toLowerCase();

  if (l.includes("dashboard")) {
    return (
      <svg className="size-5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="9" rx="1" />
        <rect x="14" y="3" width="7" height="5" rx="1" />
        <rect x="14" y="12" width="7" height="9" rx="1" />
        <rect x="3" y="16" width="7" height="5" rx="1" />
      </svg>
    );
  }

  if (l.includes("katalog") || l.includes("produk")) {
    return (
      <svg className="size-5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" />
        <line x1="3" y1="6" x2="21" y2="6" />
        <path d="M16 10a4 4 0 01-8 0" />
      </svg>
    );
  }

  if (l.includes("stok")) {
    return (
      <svg className="size-5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16Z" />
        <path d="m3.3 7 8.7 5 8.7-5" />
        <path d="M12 22V12" />
      </svg>
    );
  }

  if (l.includes("opname")) {
    return (
      <svg className="size-5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
        <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
        <path d="m9 14 2 2 4-4" />
      </svg>
    );
  }

  if (l.includes("penerimaan") || l.includes("paket") || l.includes("transit")) {
    return (
      <svg className="size-5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="1" y="3" width="15" height="13" rx="1" />
        <path d="M16 8h4l3 3v5h-7V8z" />
        <circle cx="5.5" cy="18.5" r="2.5" />
        <circle cx="18.5" cy="18.5" r="2.5" />
      </svg>
    );
  }

  if (l.includes("kasir")) {
    return (
      <svg className="size-5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="4" width="20" height="16" rx="2" />
        <line x1="2" y1="10" x2="22" y2="10" />
        <line x1="7" y1="15" x2="7.01" y2="15" />
        <line x1="12" y1="15" x2="12.01" y2="15" />
        <line x1="17" y1="15" x2="17.01" y2="15" />
      </svg>
    );
  }

  if (l.includes("transaksi") || l.includes("riwayat")) {
    return (
      <svg className="size-5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
        <polyline points="10 9 9 9 8 9" />
      </svg>
    );
  }

  return (
    <svg className="size-5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z" />
    </svg>
  );
}

export default function PartnerNavigation() {
  const pathname = usePathname();
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);

  const { isSidebarOpen, setIsSidebarOpen, isCollapsed, setIsCollapsed } = useSidebar();

  async function handleLogout() {
    setIsLoggingOut(true);
    setErrorMessage("");

    try {
      const supabase = createSupabaseBrowserClient();
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      router.replace("/login");
      router.refresh();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Logout gagal.");
      setIsLoggingOut(false);
    }
  }

  return (
    <>
      {isSidebarOpen && (
        <div
          role="presentation"
          onClick={() => setIsSidebarOpen(false)}
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
          aria-hidden="true"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex h-screen max-w-[85vw] flex-col border-r border-gray-200 bg-white text-gray-800 shadow-2xl transition-all duration-300 ease-in-out lg:sticky lg:top-0 lg:h-screen lg:shrink-0 lg:translate-x-0 lg:shadow-sm ${isSidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"} ${isCollapsed ? "w-64 lg:w-20" : "w-64 lg:w-64"}`}
      >
        <div className="flex-1 overflow-y-auto overflow-x-hidden flex flex-col min-h-0">
          <div
            className={`flex items-center border-b border-gray-100 flex-shrink-0 transition-all duration-300 py-4 ${isCollapsed ? "px-4 lg:px-2 lg:justify-center" : "px-4 lg:px-5 justify-between"}`}
          >
            <div
              onClick={() => setIsCollapsed(!isCollapsed)}
              aria-label={isCollapsed ? "Perluas Sidebar" : "Lipat Sidebar"}
              title={isCollapsed ? "Perluas Menu" : "Ciutkan Menu"}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") setIsCollapsed(!isCollapsed); }}
              className={`hidden lg:flex items-center gap-3 min-w-0 cursor-pointer select-none transition-opacity duration-200 hover:opacity-75 ${isCollapsed ? "lg:justify-center" : ""}`}
            >
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-orange-50/60 border border-orange-100 p-1.5 shadow-sm">
                <Image
                  src="/logo-sarniya.png"
                  alt="Sarniya Logo"
                  width={36}
                  height={36}
                  className="h-full w-full object-contain"
                  priority
                />
              </div>
              <div
                className={`overflow-hidden whitespace-nowrap transition-all duration-200 ${isCollapsed ? "block lg:hidden" : "block"}`}
              >
                <span className="text-base font-black tracking-tight text-gray-900">
                  SarniyaSync
                </span>
                <p className="text-[10px] font-medium text-gray-500">Portal Mitra</p>
              </div>
            </div>

            <div className={`flex lg:hidden items-center gap-3 min-w-0 ${isCollapsed ? "justify-center" : ""}`}>
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-orange-50/60 border border-orange-100 p-1.5 shadow-sm">
                <Image
                  src="/logo-sarniya.png"
                  alt="Sarniya Logo"
                  width={36}
                  height={36}
                  className="h-full w-full object-contain"
                  priority
                />
              </div>
              <div className="overflow-hidden whitespace-nowrap">
                <span className="text-base font-black tracking-tight text-gray-900">
                  SarniyaSync
                </span>
                <p className="text-[10px] font-medium text-gray-500">Portal Mitra</p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsSidebarOpen(false)}
              aria-label="Tutup Navigasi"
              title="Tutup Menu"
              className="flex lg:hidden size-8 shrink-0 items-center justify-center rounded-lg border border-gray-200 bg-gray-50 text-gray-600 shadow-sm transition-all duration-200 hover:bg-gray-100 active:scale-95"
            >
              <svg
                className="size-4 shrink-0"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          <nav
            aria-label="Navigasi Mitra"
            className={`flex flex-col gap-1.5 py-3 transition-all duration-300 ${isCollapsed ? "px-3 lg:px-2" : "px-3"}`}
          >
            {navigationItems.map((item) => {
              const isActive =
                pathname === item.href ||
                pathname.startsWith(`${item.href}/`) ||
                (item.href === "/dashboard-mitra" && (pathname === "/partner" || pathname.startsWith("/dashboard-mitra"))) ||
                (item.href === "/partner/katalog" && (pathname === "/katalog" || pathname.startsWith("/katalog/"))) ||
                (item.href === "/partner/kasir" && (pathname === "/kasir" || pathname.startsWith("/kasir/"))) ||
                (item.href === "/partner/transaksi" && (pathname === "/riwayat" || pathname.startsWith("/riwayat/") || pathname === "/riwayat-mitra" || pathname.startsWith("/riwayat-mitra/"))) ||
                (item.href === "/profil-mitra" && (pathname === "/profil-mitra" || pathname.startsWith("/profil-mitra/") || pathname === "/partner/profil" || pathname.startsWith("/partner/profil/")));

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={isActive ? "page" : undefined}
                  title={isCollapsed ? item.label : undefined}
                  onClick={() => {
                    if (typeof window !== "undefined" && window.innerWidth < 1024) {
                      setIsSidebarOpen(false);
                    }
                  }}
                  className={`group flex shrink-0 items-center rounded-xl h-10 text-xs overflow-hidden transition-all duration-200 ${isCollapsed
                      ? "w-full justify-start px-3.5 lg:justify-center lg:px-0"
                      : "w-full justify-start px-3.5"
                    } ${isActive
                      ? "bg-terracotta-clay text-white shadow-sm font-semibold"
                      : "text-gray-700 font-medium hover:bg-gray-100 hover:text-gray-900"
                    }`}
                >
                  <span
                    className={`flex size-6 shrink-0 items-center justify-center transition-colors ${isCollapsed ? "mr-3 lg:mr-0" : "mr-3"
                      } ${isActive ? "text-white" : "text-gray-700 group-hover:text-terracotta-clay"}`}
                  >
                    {getPartnerNavIcon(item.label)}
                  </span>

                  <span
                    className={`truncate whitespace-nowrap transition-all duration-200 ${isCollapsed ? "block lg:hidden" : "block"}`}
                  >
                    {item.label}
                  </span>
                </Link>
              );
            })}
          </nav>
        </div>

        <div
          className={`flex-shrink-0 mt-auto border-t border-gray-200 transition-all duration-300 ${isCollapsed ? "px-3 py-4 lg:px-2" : "px-3 py-4"}`}
        >
          <p
            className={`text-[11px] font-medium text-gray-500 mb-2 truncate px-1 ${isCollapsed ? "block lg:hidden" : "block"}`}
          >
            Rantai pasok, lebih terhubung.
          </p>

          {errorMessage && (
            <p
              role="alert"
              className={`mb-2.5 rounded-lg border border-rose-300 bg-rose-50/90 p-2 text-[10px] font-semibold text-rose-800 truncate ${isCollapsed ? "block lg:hidden" : "block"}`}
            >
              {errorMessage}
            </p>
          )}

          <button
            type="button"
            onClick={() => setIsLogoutModalOpen(true)}
            disabled={isLoggingOut}
            title={isCollapsed ? "Keluar Sesi" : undefined}
            className={`group flex shrink-0 items-center rounded-xl h-10 text-xs font-semibold uppercase tracking-wider text-terracotta-clay bg-gray-50 border border-gray-200 shadow-sm transition-all duration-200 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50 overflow-hidden ${isCollapsed
                ? "w-full justify-start px-3.5 lg:justify-center lg:px-0"
                : "w-full justify-start px-3.5"
              }`}
          >
            <span
              className={`flex size-6 shrink-0 items-center justify-center transition-colors ${isCollapsed ? "mr-3 lg:mr-0" : "mr-3"}`}
            >
              <svg
                className="size-4 shrink-0 -scale-x-100"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
                <polyline points="10 17 5 12 10 7" />
                <line x1="15" y1="12" x2="5" y2="12" />
              </svg>
            </span>

            <span className={`truncate ${isCollapsed ? "block lg:hidden" : "block"}`}>
              {isLoggingOut ? "Keluar..." : "Keluar Sesi"}
            </span>
          </button>
        </div>
      </aside>

      <LogoutModal
        isOpen={isLogoutModalOpen}
        onClose={() => setIsLogoutModalOpen(false)}
        onConfirm={() => void handleLogout()}
        isLoggingOut={isLoggingOut}
      />
    </>
  );
}